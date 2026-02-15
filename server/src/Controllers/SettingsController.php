<?php

class SettingsController {
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
        $stmt = $this->pdo->prepare("SELECT group_id, role FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        return $stmt->fetch();
    }

    // ═══════════════════════════════════════════════════════
    // USER SETTINGS
    // ═══════════════════════════════════════════════════════

    /**
     * Get user settings
     * GET /settings/get?key=monthly_budget (specific) or GET /settings/get (all)
     */
    public function get() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $key = $_GET['key'] ?? null;

        if ($key) {
            // Get specific setting
            $stmt = $this->pdo->prepare("SELECT setting_value FROM user_settings WHERE user_id = ? AND setting_key = ?");
            $stmt->execute([$userId, $key]);
            $result = $stmt->fetch();
            
            echo json_encode([
                'key' => $key,
                'value' => $result ? $result['setting_value'] : null
            ]);
        } else {
            // Get all settings
            $stmt = $this->pdo->prepare("SELECT setting_key, setting_value FROM user_settings WHERE user_id = ?");
            $stmt->execute([$userId]);
            $settings = $stmt->fetchAll();
            
            $result = [];
            foreach ($settings as $s) {
                $result[$s['setting_key']] = $s['setting_value'];
            }
            
            echo json_encode(['settings' => $result]);
        }
    }

    /**
     * Set a user setting
     * POST /settings/set { key: 'monthly_budget', value: '10000' }
     */
    public function set() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['key']) || !isset($data['value'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Key and value are required']);
            return;
        }

        $key = $data['key'];
        $value = $data['value'];

        // Upsert the setting
        $stmt = $this->pdo->prepare("
            INSERT INTO user_settings (user_id, setting_key, setting_value) 
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP
        ");
        $stmt->execute([$userId, $key, $value]);

        echo json_encode([
            'message' => 'Setting saved',
            'key' => $key,
            'value' => $value
        ]);
    }

    /**
     * Delete a user setting
     * POST /settings/delete { key: 'monthly_budget' }
     */
    public function delete() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['key'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Key is required']);
            return;
        }

        $stmt = $this->pdo->prepare("DELETE FROM user_settings WHERE user_id = ? AND setting_key = ?");
        $stmt->execute([$userId, $data['key']]);

        echo json_encode(['message' => 'Setting deleted']);
    }

    // ═══════════════════════════════════════════════════════
    // GROUP SETTINGS (for shared settings like dish duty)
    // ═══════════════════════════════════════════════════════

    /**
     * Get a group setting (optionally for a specific date)
     * GET /settings/group-get?key=dish_duty&date=2024-12-17
     */
    public function getGroupSetting() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $user = $this->getUserGroup($userId);
        if (!$user['group_id']) {
            http_response_code(400);
            echo json_encode(['error' => 'No group']);
            return;
        }

        $key = $_GET['key'] ?? null;
        $date = $_GET['date'] ?? date('Y-m-d'); // Default to today

        if (!$key) {
            http_response_code(400);
            echo json_encode(['error' => 'Key is required']);
            return;
        }

        $stmt = $this->pdo->prepare("
            SELECT setting_value, setting_date, updated_at 
            FROM group_settings 
            WHERE group_id = ? AND setting_key = ? AND (setting_date = ? OR setting_date IS NULL)
            ORDER BY setting_date DESC
            LIMIT 1
        ");
        $stmt->execute([$user['group_id'], $key, $date]);
        $result = $stmt->fetch();

        echo json_encode([
            'key' => $key,
            'value' => $result ? $result['setting_value'] : null,
            'date' => $result ? $result['setting_date'] : null,
            'updated_at' => $result ? $result['updated_at'] : null
        ]);
    }

    /**
     * Set a group setting
     * POST /settings/group-set { key: 'dish_duty', value: '{"user_id": 1, "user_name": "John"}', date: '2024-12-17' }
     */
    public function setGroupSetting() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $user = $this->getUserGroup($userId);
        if (!$user['group_id']) {
            http_response_code(400);
            echo json_encode(['error' => 'No group']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['key']) || !isset($data['value'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Key and value are required']);
            return;
        }

        $key = $data['key'];
        $value = is_array($data['value']) ? json_encode($data['value']) : $data['value'];
        $date = $data['date'] ?? date('Y-m-d');

        // Upsert the group setting
        $stmt = $this->pdo->prepare("
            INSERT INTO group_settings (group_id, setting_key, setting_value, setting_date) 
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP
        ");
        $stmt->execute([$user['group_id'], $key, $value, $date]);

        echo json_encode([
            'message' => 'Group setting saved',
            'key' => $key,
            'value' => $value,
            'date' => $date
        ]);
    }
}
