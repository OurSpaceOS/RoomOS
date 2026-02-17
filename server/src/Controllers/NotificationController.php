<?php

class NotificationController {
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

    public function list() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $stmt = $this->pdo->prepare("
            SELECT n.*, u.name as sender_name, u.profile_picture as sender_avatar
            FROM notifications n
            LEFT JOIN users u ON n.sender_id = u.id
            WHERE n.user_id = ?
            ORDER BY n.created_at DESC
            LIMIT 50
        ");
        $stmt->execute([$userId]);
        $notifications = $stmt->fetchAll();

        echo json_encode(['notifications' => $notifications]);
    }

    public function markAsRead() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $id = $data['id'] ?? null;

        if ($id) {
            $stmt = $this->pdo->prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?");
            $stmt->execute([$id, $userId]);
        } else {
            $stmt = $this->pdo->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?");
            $stmt->execute([$userId]);
        }

        echo json_encode(['message' => 'Updated successfully']);
    }

    public function delete() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $id = $data['id'] ?? null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID required']);
            return;
        }

        $stmt = $this->pdo->prepare("DELETE FROM notifications WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $userId]);

        echo json_encode(['message' => 'Deleted successfully']);
    }

    public function clearAll() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $stmt = $this->pdo->prepare("DELETE FROM notifications WHERE user_id = ?");
        $stmt->execute([$userId]);

        echo json_encode(['message' => 'Cleared all notifications']);
    }

    // Static helper to create notifications from other controllers
    public static function create($pdo, $userId, $senderId, $type, $title, $message) {
        $stmt = $pdo->prepare("
            INSERT INTO notifications (user_id, sender_id, type, title, message)
            VALUES (?, ?, ?, ?, ?)
        ");
        return $stmt->execute([$userId, $senderId, $type, $title, $message]);
    }
}
