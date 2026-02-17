<?php

class TransactionController {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    private function getUserIdFromToken() {
        $headers = getallheaders();
        if (!isset($headers['Authorization'])) return null;
        
        $token = str_replace('Bearer ', '', $headers['Authorization']);
        
        $stmt = $this->pdo->prepare("SELECT user_id FROM sessions WHERE token = ? AND expires_at > NOW()");
        $stmt->execute([$token]);
        $session = $stmt->fetch();
        
        return $session ? $session['user_id'] : null;
    }

    private function getUserGroup($userId) {
        $stmt = $this->pdo->prepare("SELECT group_id FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        return $stmt->fetch();
    }

    private function isUserAdmin($userId) {
        $stmt = $this->pdo->prepare("SELECT role FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        return $user && $user['role'] === 'admin';
    }

    /**
     * Calculate optimal settlements to minimize transactions
     * Uses greedy algorithm to match creditors with debtors
     * 
     * @param array $allBalances Array of user balances with user_id, balance, and user_name
     * @return array Array of settlements with from_user, to_user, and amount
     */
    /**
     * Calculate bidirectional pairwise balances from transaction history
     * Shows NET relationships: netted debts between each pair of users
     * 
     * @param int $groupId The group ID
     * @return array Array of net pairwise debts
     */
    private function calculateBidirectionalPairwise($groupId) {
        // Get ALL transactions for the group
        $stmt = $this->pdo->prepare("SELECT * FROM transactions WHERE group_id = ? ORDER BY created_at ASC");
        $stmt->execute([$groupId]);
        $transactions = $stmt->fetchAll();
        
        // Track pairwise debts: pairwiseDebts[from_user][to_user] = amount
        $pairwiseDebts = [];
        
        // Process each transaction
        foreach ($transactions as $transaction) {
            $amount = floatval($transaction['amount']);
            $payerId = $transaction['user_id'];
            
            // Get split_between data
            $splitBetween = $transaction['split_between'] 
                ? json_decode($transaction['split_between'], true) 
                : null;
            
            if ($splitBetween === null) {
                continue; // Skip if no split data
            }
            
            $memberCount = count($splitBetween);
            if ($memberCount == 0) continue;
            
            // Check if payer is included in split
            $payerIncluded = in_array($payerId, $splitBetween);
            
            if (!$payerIncluded) {
                // Payer paid for others (not themselves)
                // Each person in splitBetween owes payer their share
                $share = $amount / $memberCount;
                
                foreach ($splitBetween as $debtorId) {
                    if (!isset($pairwiseDebts[$debtorId])) {
                        $pairwiseDebts[$debtorId] = [];
                    }
                    if (!isset($pairwiseDebts[$debtorId][$payerId])) {
                        $pairwiseDebts[$debtorId][$payerId] = 0;
                    }
                    $pairwiseDebts[$debtorId][$payerId] += $share;
                }
                
            } else {
                // Payer is included in split (normal scenario)
                $share = $amount / $memberCount;
                
                foreach ($splitBetween as $memberId) {
                    if ($memberId != $payerId) {
                        // This member owes the payer their share
                        if (!isset($pairwiseDebts[$memberId])) {
                            $pairwiseDebts[$memberId] = [];
                        }
                        if (!isset($pairwiseDebts[$memberId][$payerId])) {
                            $pairwiseDebts[$memberId][$payerId] = 0;
                        }
                        $pairwiseDebts[$memberId][$payerId] += $share;
                    }
                }
            }
        }
        
        // NET OUT bidirectional debts
        // If A owes B ₹500 and B owes A ₹200, result is A owes B ₹300
        $nettedDebts = [];
        $processed = [];
        
        foreach ($pairwiseDebts as $fromUser => $toUsers) {
            foreach ($toUsers as $toUser => $amountOwed) {
                // Create a unique key for this pair
                $pairKey = min($fromUser, $toUser) . '_' . max($fromUser, $toUser);
                
                if (isset($processed[$pairKey])) {
                    continue; // Already processed this pair
                }
                
                // Get reverse debt (if exists)
                $reverseOwed = isset($pairwiseDebts[$toUser][$fromUser]) 
                    ? $pairwiseDebts[$toUser][$fromUser] 
                    : 0;
                
                // Calculate net
                $netAmount = $amountOwed - $reverseOwed;
                
                if (abs($netAmount) > 0.01) {  // Only include meaningful amounts
                    if ($netAmount > 0) {
                        // fromUser owes toUser (net)
                        $nettedDebts[] = [
                            'from_user_id' => $fromUser,
                            'to_user_id' => $toUser,
                            'amount' => $netAmount
                        ];
                    } else {
                        // toUser owes fromUser (net)
                        $nettedDebts[] = [
                            'from_user_id' => $toUser,
                            'to_user_id' => $fromUser,
                            'amount' => abs($netAmount)
                        ];
                    }
                }
                
                $processed[$pairKey] = true;
            }
        }
        
        // Add user names
        $result = [];
        foreach ($nettedDebts as $debt) {
            $stmt = $this->pdo->prepare("SELECT name FROM users WHERE id = ?");
            $stmt->execute([$debt['from_user_id']]);
            $fromName = $stmt->fetchColumn();
            
            $stmt->execute([$debt['to_user_id']]);
            $toName = $stmt->fetchColumn();
            
            $result[] = [
                'from_user_id' => $debt['from_user_id'],
                'from_user_name' => $fromName,
                'to_user_id' => $debt['to_user_id'],
                'to_user_name' => $toName,
                'amount' => $debt['amount']
            ];
        }
        
        return $result;
    }

    public function add() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $user = $this->getUserGroup($userId);
        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data['amount']) || !isset($data['description'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing fields']);
            return;
        }

        $amount = floatval($data['amount']);
        if ($amount <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid amount']);
            return;
        }

        // Handle paid_by parameter for admin users
        $paidBy = $userId; // Default to current user
        if (isset($data['paid_by']) && $data['paid_by'] != $userId) {
            // Check if current user is admin
            if (!$this->isUserAdmin($userId)) {
                http_response_code(403);
                echo json_encode(['error' => 'Only admins can add expenses on behalf of others']);
                return;
            }
            
            // Validate that paid_by user exists and is in the same group
            $paidBy = intval($data['paid_by']);
            $stmt = $this->pdo->prepare("SELECT group_id FROM users WHERE id = ?");
            $stmt->execute([$paidBy]);
            $paidByUser = $stmt->fetch();
            
            if (!$paidByUser || $paidByUser['group_id'] != $user['group_id']) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid paid_by user or not in same group']);
                return;
            }
        }

        try {
            $this->pdo->beginTransaction();

            // Get split_between data for storage
            $splitBetweenData = isset($data['split_between']) && is_array($data['split_between']) 
                ? json_encode($data['split_between']) 
                : null;

            // 1. Record Transaction with split_between info (use paidBy instead of userId)
            $stmt = $this->pdo->prepare("INSERT INTO transactions (group_id, user_id, amount, description, split_between) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$user['group_id'], $paidBy, $amount, $data['description'], $splitBetweenData]);

            // 2. Update Balances with selective split
            // Get members to split between (default to all if not specified)
            $splitBetween = isset($data['split_between']) && is_array($data['split_between']) 
                ? $data['split_between'] 
                : null;

            if ($splitBetween === null) {
                // Get all members if not specified
                $stmt = $this->pdo->prepare("SELECT id FROM users WHERE group_id = ?");
                $stmt->execute([$user['group_id']]);
                $splitBetween = $stmt->fetchAll(PDO::FETCH_COLUMN);
            }

            $memberCount = count($splitBetween);

            if ($memberCount > 0) {
                // Check if payer is included in the split
                $payerIncluded = in_array($paidBy, $splitBetween);
                
                if (!$payerIncluded) {
                    // Payer paid for others (not splitting with themselves)
                    // Payer gets +full amount, others split the debt
                    
                    // Ensure payer's balance row exists
                    $stmt = $this->pdo->prepare("SELECT id FROM balances WHERE group_id = ? AND user_id = ?");
                    $stmt->execute([$user['group_id'], $paidBy]);
                    if (!$stmt->fetch()) {
                        $stmt = $this->pdo->prepare("INSERT INTO balances (group_id, user_id, balance) VALUES (?, ?, 0)");
                        $stmt->execute([$user['group_id'], $paidBy]);
                    }
                    
                    // Payer gets the full amount (they are owed)
                    $stmt = $this->pdo->prepare("UPDATE balances SET balance = balance + ? WHERE group_id = ? AND user_id = ?");
                    $stmt->execute([$amount, $user['group_id'], $paidBy]);
                    
                    // Each selected person owes their share
                    $share = $amount / $memberCount;
                    foreach ($splitBetween as $debtorId) {
                        // Ensure balance row exists
                        $stmt = $this->pdo->prepare("SELECT id FROM balances WHERE group_id = ? AND user_id = ?");
                        $stmt->execute([$user['group_id'], $debtorId]);
                        if (!$stmt->fetch()) {
                            $stmt = $this->pdo->prepare("INSERT INTO balances (group_id, user_id, balance) VALUES (?, ?, 0)");
                            $stmt->execute([$user['group_id'], $debtorId]);
                        }
                        
                        // Debtor owes their share
                        $stmt = $this->pdo->prepare("UPDATE balances SET balance = balance - ? WHERE group_id = ? AND user_id = ?");
                        $stmt->execute([$share, $user['group_id'], $debtorId]);
                    }
                    
                } else {
                    // Payer is included in split (normal split scenario)
                    $share = $amount / $memberCount;

                    foreach ($splitBetween as $mid) {
                        // Ensure balance row exists
                        $stmt = $this->pdo->prepare("SELECT id FROM balances WHERE group_id = ? AND user_id = ?");
                        $stmt->execute([$user['group_id'], $mid]);
                        if (!$stmt->fetch()) {
                            $stmt = $this->pdo->prepare("INSERT INTO balances (group_id, user_id, balance) VALUES (?, ?, 0)");
                            $stmt->execute([$user['group_id'], $mid]);
                        }

                        if ($mid == $paidBy) {
                            // Payer: + (Amount - Share)
                            $change = $amount - $share;
                        } else {
                            // Others: - Share
                            $change = -$share;
                        }

                        $stmt = $this->pdo->prepare("UPDATE balances SET balance = balance + ? WHERE group_id = ? AND user_id = ?");
                        $stmt->execute([$change, $user['group_id'], $mid]);
                    }
                }
            }

            $this->pdo->commit();

            // Notify members who owe money
            $payerName = $this->getUserName($paidBy);
            foreach ($splitBetween as $mid) {
                if ($mid != $paidBy) {
                    $share = $amount / $memberCount;
                    NotificationController::create($this->pdo, $mid, $paidBy, 'financial', 'New Expense', $payerName . ' added "' . $data['description'] . '". Your share: ₹' . number_format($share, 2));
                }
            }

            echo json_encode(['message' => 'Transaction added']);

        } catch (Exception $e) {
            $this->pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => 'Failed to add transaction: ' . $e->getMessage()]);
        }
    }

    public function list() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $user = $this->getUserGroup($userId);

        // Get all transactions
        $stmt = $this->pdo->prepare("
            SELECT t.*, u.name as user_name 
            FROM transactions t 
            JOIN users u ON t.user_id = u.id 
            WHERE t.group_id = ? 
            ORDER BY t.created_at DESC
        ");
        $stmt->execute([$user['group_id']]);
        $transactions = $stmt->fetchAll();

        // Get my balance
        $stmt = $this->pdo->prepare("SELECT balance FROM balances WHERE user_id = ?");
        $stmt->execute([$userId]);
        $myBal = $stmt->fetchColumn();

        // Calculate bidirectional pairwise balances from transaction history
        $allSettlements = $this->calculateBidirectionalPairwise($user['group_id']);
        
        // Filter settlements relevant to current user
        $mySettlements = [];
        foreach ($allSettlements as $settlement) {
            if ($settlement['from_user_id'] == $userId) {
                // I owe someone
                $mySettlements[] = [
                    'other_user_id' => $settlement['to_user_id'],
                    'other_user_name' => $settlement['to_user_name'],
                    'balance' => -$settlement['amount']  // Negative because I owe
                ];
            } else if ($settlement['to_user_id'] == $userId) {
                // Someone owes me
                $mySettlements[] = [
                    'other_user_id' => $settlement['from_user_id'],
                    'other_user_name' => $settlement['from_user_name'],
                    'balance' => $settlement['amount']  // Positive because they owe me
                ];
            }
        }

        echo json_encode([
            'transactions' => $transactions,
            'balances' => $mySettlements,
            'my_balance' => $myBal ?: 0
        ]);
    }
    
    public function delete() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['transaction_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing transaction_id']);
            return;
        }

        $transactionId = intval($data['transaction_id']);

        try {
            $this->pdo->beginTransaction();

            // Get transaction details to verify ownership and get amount
            $stmt = $this->pdo->prepare("SELECT * FROM transactions WHERE id = ?");
            $stmt->execute([$transactionId]);
            $transaction = $stmt->fetch();

            if (!$transaction) {
                $this->pdo->rollBack();
                http_response_code(404);
                echo json_encode(['error' => 'Transaction not found']);
                return;
            }

            // Verify user owns this transaction
            if ($transaction['user_id'] != $userId) {
                $this->pdo->rollBack();
                http_response_code(403);
                echo json_encode(['error' => 'You can only delete your own transactions']);
                return;
            }

            $amount = floatval($transaction['amount']);
            $groupId = $transaction['group_id'];

            // Get split_between data to properly reverse the balance changes
            $splitBetween = $transaction['split_between'] 
                ? json_decode($transaction['split_between'], true) 
                : null;
            
            // If split_between is not available (old transactions), fall back to all members
            if ($splitBetween === null) {
                $stmt = $this->pdo->prepare("SELECT id FROM users WHERE group_id = ?");
                $stmt->execute([$groupId]);
                $splitBetween = $stmt->fetchAll(PDO::FETCH_COLUMN);
            }
            
            $memberCount = count($splitBetween);
            
            if ($memberCount > 0) {
                // Check if payer was included in the split
                $payerIncluded = in_array($userId, $splitBetween);
                
                if (!$payerIncluded) {
                    // This was a payment for others (payer not splitting with themselves)
                    // Reverse: payer loses the credit, debtors gain back (debt removed)
                    
                    // Reverse payer's credit: -amount
                    $stmt = $this->pdo->prepare("UPDATE balances SET balance = balance - ? WHERE group_id = ? AND user_id = ?");
                    $stmt->execute([$amount, $groupId, $userId]);
                    
                    // Each debtor's debt is removed: +share
                    $share = $amount / $memberCount;
                    foreach ($splitBetween as $debtorId) {
                        $stmt = $this->pdo->prepare("UPDATE balances SET balance = balance + ? WHERE group_id = ? AND user_id = ?");
                        $stmt->execute([$share, $groupId, $debtorId]);
                    }
                    
                } else {
                    // Payer was included in split (normal split reversal)
                    $share = $amount / $memberCount;
                    
                    foreach ($splitBetween as $mid) {
                        if ($mid == $userId) {
                            // Reverse payer's credit: - (Amount - Share)
                            $change = -($amount - $share);
                        } else {
                            // Reverse others' debt: + Share
                            $change = $share;
                        }
                        
                        $stmt = $this->pdo->prepare("UPDATE balances SET balance = balance + ? WHERE group_id = ? AND user_id = ?");
                        $stmt->execute([$change, $groupId, $mid]);
                    }
                }
            }

            // Delete the transaction
            $stmt = $this->pdo->prepare("DELETE FROM transactions WHERE id = ?");
            $stmt->execute([$transactionId]);

            $this->pdo->commit();
            echo json_encode(['message' => 'Transaction deleted successfully']);

        } catch (Exception $e) {
            $this->pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete transaction: ' . $e->getMessage()]);
        }
    }
    
    
    public function recalculate() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $user = $this->getUserGroup($userId);
        
        try {
            $this->pdo->beginTransaction();
            
            // 1. Reset all balances for this group to zero
            $stmt = $this->pdo->prepare("UPDATE balances SET balance = 0 WHERE group_id = ?");
            $stmt->execute([$user['group_id']]);
            
            // 2. Get all transactions for this group in chronological order
            $stmt = $this->pdo->prepare("
                SELECT * FROM transactions 
                WHERE group_id = ? 
                ORDER BY created_at ASC
            ");
            $stmt->execute([$user['group_id']]);
            $transactions = $stmt->fetchAll();
            
            // 3. Replay each transaction to rebuild balances
            foreach ($transactions as $transaction) {
                $amount = floatval($transaction['amount']);
                $payerId = $transaction['user_id'];
                
                // Get split_between data
                $splitBetween = $transaction['split_between'] 
                    ? json_decode($transaction['split_between'], true) 
                    : null;
                
                if ($splitBetween === null) {
                    // Get all members if not specified
                    $stmt = $this->pdo->prepare("SELECT id FROM users WHERE group_id = ?");
                    $stmt->execute([$user['group_id']]);
                    $splitBetween = $stmt->fetchAll(PDO::FETCH_COLUMN);
                }
                
                $memberCount = count($splitBetween);
                
                if ($memberCount > 0) {
                    // Check if payer was included in split
                    $payerIncluded = in_array($payerId, $splitBetween);
                    
                    if (!$payerIncluded) {
                        // Payer paid for others (not splitting with themselves)
                        
                        // Ensure payer's balance row exists
                        $stmt = $this->pdo->prepare("SELECT id FROM balances WHERE group_id = ? AND user_id = ?");
                        $stmt->execute([$user['group_id'], $payerId]);
                        if (!$stmt->fetch()) {
                            $stmt = $this->pdo->prepare("INSERT INTO balances (group_id, user_id, balance) VALUES (?, ?, 0)");
                            $stmt->execute([$user['group_id'], $payerId]);
                        }
                        
                        // Payer gets +amount
                        $stmt = $this->pdo->prepare("UPDATE balances SET balance = balance + ? WHERE group_id = ? AND user_id = ?");
                        $stmt->execute([$amount, $user['group_id'], $payerId]);
                        
                        // Each selected person owes their share
                        $share = $amount / $memberCount;
                        foreach ($splitBetween as $debtorId) {
                            // Ensure balance row exists
                            $stmt = $this->pdo->prepare("SELECT id FROM balances WHERE group_id = ? AND user_id = ?");
                            $stmt->execute([$user['group_id'], $debtorId]);
                            if (!$stmt->fetch()) {
                                $stmt = $this->pdo->prepare("INSERT INTO balances (group_id, user_id, balance) VALUES (?, ?, 0)");
                                $stmt->execute([$user['group_id'], $debtorId]);
                            }
                            
                            // Debtor owes share
                            $stmt = $this->pdo->prepare("UPDATE balances SET balance = balance - ? WHERE group_id = ? AND user_id = ?");
                            $stmt->execute([$share, $user['group_id'], $debtorId]);
                        }
                        
                    } else {
                        // Payer included in split (normal split)
                        $share = $amount / $memberCount;
                        
                        foreach ($splitBetween as $mid) {
                            // Ensure balance row exists
                            $stmt = $this->pdo->prepare("SELECT id FROM balances WHERE group_id = ? AND user_id = ?");
                            $stmt->execute([$user['group_id'], $mid]);
                            if (!$stmt->fetch()) {
                                $stmt = $this->pdo->prepare("INSERT INTO balances (group_id, user_id, balance) VALUES (?, ?, 0)");
                                $stmt->execute([$user['group_id'], $mid]);
                            }
                            
                            if ($mid == $payerId) {
                                // Payer: + (Amount - Share)
                                $change = $amount - $share;
                            } else {
                                // Others: - Share
                                $change = -$share;
                            }
                            
                            $stmt = $this->pdo->prepare("UPDATE balances SET balance = balance + ? WHERE group_id = ? AND user_id = ?");
                            $stmt->execute([$change, $user['group_id'], $mid]);
                        }
                    }
                }
            }
            
            $this->pdo->commit();
            echo json_encode([
                'message' => 'Balances recalculated successfully',
                'transactions_processed' => count($transactions)
            ]);
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => 'Failed to recalculate balances: ' . $e->getMessage()]);
        }
    }
    
    private function getUserName($id) {
         $stmt = $this->pdo->prepare("SELECT name FROM users WHERE id = ?");
         $stmt->execute([$id]);
         return $stmt->fetchColumn();
    }
}
