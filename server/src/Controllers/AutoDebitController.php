<?php

class AutoDebitController {
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

    /**
     * Process any due auto-debits for the user.
     * This checks each active debit and creates a transaction if it's due.
     * Called automatically when the user loads the wallet/dashboard.
     */
    public function process() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        // Get user's group_id (needed for transactions)
        $stmt = $this->pdo->prepare("SELECT group_id FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        if (!$user || !$user['group_id']) {
            echo json_encode(['processed' => 0, 'message' => 'No group found']);
            return;
        }

        $groupId = $user['group_id'];
        $today = new DateTime();
        $todayStr = $today->format('Y-m-d');
        $currentDayOfMonth = (int)$today->format('j');    // 1-31
        $currentDayOfWeek = (int)$today->format('w');     // 0=Sun, 6=Sat

        // Get all active auto-debits for this user
        $stmt = $this->pdo->prepare("
            SELECT * FROM auto_debits 
            WHERE user_id = ? AND is_active = 1
        ");
        $stmt->execute([$userId]);
        $debits = $stmt->fetchAll();

        $processed = 0;
        $skipped = 0;

        foreach ($debits as $debit) {
            $isDue = false;
            $lastDeducted = $debit['last_deducted_at'] ? new DateTime($debit['last_deducted_at']) : null;

            switch ($debit['recurrence']) {
                case 'daily':
                    // Due if not deducted today
                    $isDue = !$lastDeducted || $lastDeducted->format('Y-m-d') < $todayStr;
                    break;

                case 'weekly':
                    // Due if today is the deduct day AND not already deducted this week
                    if ($currentDayOfWeek == (int)$debit['deduct_day']) {
                        if (!$lastDeducted) {
                            $isDue = true;
                        } else {
                            // Check if last deduction was before this week's target day
                            $isDue = $lastDeducted->format('Y-m-d') < $todayStr;
                        }
                    }
                    break;

                case 'monthly':
                    // Due if today >= deduct_day AND not already deducted this month
                    $deductDay = (int)$debit['deduct_day'];
                    
                    // Handle months with fewer days (e.g., deduct_day=31 in Feb)
                    $lastDayOfMonth = (int)$today->format('t');
                    $effectiveDay = min($deductDay, $lastDayOfMonth);

                    if ($currentDayOfMonth >= $effectiveDay) {
                        if (!$lastDeducted) {
                            $isDue = true;
                        } else {
                            // Check if last deduction was in a previous month
                            $isDue = $lastDeducted->format('Y-m') < $today->format('Y-m');
                        }
                    }
                    break;
            }

            if ($isDue) {
                try {
                    $this->pdo->beginTransaction();

                    // 1. Create a transaction entry (personal expense - only for this user)
                    $description = "[Auto] " . $debit['name'];
                    $stmt = $this->pdo->prepare("
                        INSERT INTO transactions (group_id, user_id, amount, description, split_between) 
                        VALUES (?, ?, ?, ?, ?)
                    ");
                    // split_between is JSON with just this user - personal expense, no group split
                    $splitData = json_encode([$userId]);
                    $stmt->execute([$groupId, $userId, $debit['amount'], $description, $splitData]);

                    // 2. Update last_deducted_at
                    $stmt = $this->pdo->prepare("
                        UPDATE auto_debits SET last_deducted_at = ? WHERE id = ?
                    ");
                    $stmt->execute([$todayStr, $debit['id']]);

                    $this->pdo->commit();
                    $processed++;
                } catch (Exception $e) {
                    $this->pdo->rollBack();
                    $skipped++;
                }
            }
        }

        echo json_encode([
            'processed' => $processed,
            'skipped' => $skipped,
            'message' => $processed > 0 
                ? "$processed auto-debit(s) processed" 
                : "No auto-debits due today"
        ]);
    }

    public function list() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $stmt = $this->pdo->prepare("
            SELECT * FROM auto_debits 
            WHERE user_id = ? 
            ORDER BY is_active DESC, created_at DESC
        ");
        $stmt->execute([$userId]);
        $debits = $stmt->fetchAll();

        // Calculate monthly total from active debits
        $monthlyTotal = 0;
        foreach ($debits as $d) {
            if ($d['is_active']) {
                $amt = floatval($d['amount']);
                switch ($d['recurrence']) {
                    case 'daily':
                        $monthlyTotal += $amt * 30;
                        break;
                    case 'weekly':
                        $monthlyTotal += $amt * 4;
                        break;
                    case 'monthly':
                    default:
                        $monthlyTotal += $amt;
                        break;
                }
            }
        }

        echo json_encode([
            'debits' => $debits,
            'monthly_total' => round($monthlyTotal, 2),
            'active_count' => count(array_filter($debits, fn($d) => $d['is_active']))
        ]);
    }

    public function create() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['name']) || !isset($data['amount'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Name and amount are required']);
            return;
        }

        $stmt = $this->pdo->prepare("
            INSERT INTO auto_debits (user_id, name, amount, recurrence, deduct_day, category, description) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $userId,
            $data['name'],
            $data['amount'],
            $data['recurrence'] ?? 'monthly',
            $data['deduct_day'] ?? 1,
            $data['category'] ?? 'other',
            $data['description'] ?? null
        ]);

        echo json_encode([
            'message' => 'Auto-debit created successfully',
            'id' => $this->pdo->lastInsertId()
        ]);
    }

    public function update() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Debit ID is required']);
            return;
        }

        // Verify ownership
        $stmt = $this->pdo->prepare("SELECT id FROM auto_debits WHERE id = ? AND user_id = ?");
        $stmt->execute([$data['id'], $userId]);
        if (!$stmt->fetch()) {
            http_response_code(403);
            echo json_encode(['error' => 'Not authorized to modify this debit']);
            return;
        }

        $fields = [];
        $values = [];
        
        $allowedFields = ['name', 'amount', 'recurrence', 'deduct_day', 'category', 'description', 'is_active'];
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = ?";
                $values[] = $data[$field];
            }
        }

        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(['error' => 'No fields to update']);
            return;
        }

        $values[] = $data['id'];
        $stmt = $this->pdo->prepare("UPDATE auto_debits SET " . implode(', ', $fields) . " WHERE id = ?");
        $stmt->execute($values);

        echo json_encode(['message' => 'Auto-debit updated successfully']);
    }

    public function toggle() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Debit ID is required']);
            return;
        }

        $stmt = $this->pdo->prepare("
            UPDATE auto_debits 
            SET is_active = NOT is_active 
            WHERE id = ? AND user_id = ?
        ");
        $stmt->execute([$data['id'], $userId]);

        echo json_encode(['message' => 'Auto-debit toggled successfully']);
    }

    public function delete() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Debit ID is required']);
            return;
        }

        $stmt = $this->pdo->prepare("DELETE FROM auto_debits WHERE id = ? AND user_id = ?");
        $stmt->execute([$data['id'], $userId]);

        echo json_encode(['message' => 'Auto-debit deleted successfully']);
    }
}
