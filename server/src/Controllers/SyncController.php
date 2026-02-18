<?php

class SyncController {
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

    public function checkStatus() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $user = $this->getUserGroup($userId);
        if (!$user) {
            http_response_code(403);
            echo json_encode(['error' => 'No group found']);
            return;
        }
        $groupId = $user['group_id'];

        $response = [];

        // 1. Transactions Checksum (count + last created)
        // Since deletes happen, count is important.
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) as count, MAX(created_at) as last_created 
            FROM transactions 
            WHERE group_id = ?
        ");
        $stmt->execute([$groupId]);
        $transStatus = $stmt->fetch(PDO::FETCH_ASSOC);
        $response['transactions'] = [
            'count' => (int)$transStatus['count'],
            'last_created' => $transStatus['last_created']
        ];

        // 2. Budget Checksum
        // Monthly budget from users table + Income last update
        $stmt = $this->pdo->prepare("SELECT monthly_budget FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $budget = $stmt->fetchColumn();

        $stmt = $this->pdo->prepare("SELECT MAX(created_at) as last_income FROM user_income WHERE user_id = ?");
        $stmt->execute([$userId]);
        $lastIncome = $stmt->fetchColumn();

        $response['budget'] = [
            'monthly_budget' => (float)$budget,
            'last_income' => $lastIncome
        ];

        // 3. Maid Settings Checksum
        // maid_config and maid_att are in group_settings
        $stmt = $this->pdo->prepare("
            SELECT MAX(updated_at) as last_update 
            FROM group_settings 
            WHERE group_id = ? AND (setting_key = 'maid_config' OR setting_key = 'maid_att')
        ");
        $stmt->execute([$groupId]);
        $maidUpdate = $stmt->fetchColumn();
        $response['maid_settings'] = $maidUpdate;

        // 3b. Dock/User Settings Checksum
        // Check for changes in user_settings (like dock_config)
        $stmt = $this->pdo->prepare("SELECT MAX(updated_at) FROM user_settings WHERE user_id = ?");
        $stmt->execute([$userId]);
        $response['settings'] = $stmt->fetchColumn();

        // 4. Notifications Checksum
        // Count of unread notifications + last created notification
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) as unread_count, MAX(created_at) as last_notif 
            FROM notifications 
            WHERE user_id = ?
        ");
        $stmt->execute([$userId]);
        $notifStatus = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Also check unread count specifically
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0");
        $stmt->execute([$userId]);
        $unreadCount = $stmt->fetchColumn();

        $response['notifications'] = [
            'total_count' => (int)$notifStatus['unread_count'],
            'unread_count' => (int)$unreadCount,
            'last_created' => $notifStatus['last_notif']
        ];

        // 5. Schedule/Roster Checksum
        // Last updated schedule for the user
        $stmt = $this->pdo->prepare("SELECT MAX(updated_at) FROM class_schedules WHERE user_id = ?");
        $stmt->execute([$userId]);
        $response['schedule'] = $stmt->fetchColumn();

        // 6. Chat Checksum
        // Max created_at of messages in the group
        $stmt = $this->pdo->prepare("SELECT MAX(created_at) FROM chat_messages WHERE group_id = ?");
        $stmt->execute([$groupId]);
        $response['chat'] = $stmt->fetchColumn();

        // 7. Auto Debits Checksum
        // Max updated_at of auto_debits for the user (or group? usually user specific but displayed in wallet)
        // Wallet shows user's auto debits.
        $stmt = $this->pdo->prepare("SELECT MAX(updated_at) FROM auto_debits WHERE user_id = ?");
        $stmt->execute([$userId]);
        $response['auto_debits'] = $stmt->fetchColumn();

        // 8. Roster Checksum
        $stmt = $this->pdo->prepare("SELECT MAX(updated_at) FROM roster WHERE group_id = ?");
        $stmt->execute([$groupId]);
        $response['roster'] = $stmt->fetchColumn();

        // 9. Group Members Checksum
        // Check for new members or profile updates
        // We can check count and max created_at
        $stmt = $this->pdo->prepare("SELECT COUNT(*) as count, MAX(created_at) as last_join FROM users WHERE group_id = ?");
        $stmt->execute([$groupId]);
        $memberStatus = $stmt->fetch(PDO::FETCH_ASSOC);
        $response['members'] = [
            'count' => (int)$memberStatus['count'],
            'last_join' => $memberStatus['last_join']
        ];

        echo json_encode(['status' => $response]);
    }
}
