<?php

class GroupController {
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

    public function create() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['name'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Group name required']);
            return;
        }

        try {
            $this->pdo->beginTransaction();

            // Create Group
            $stmt = $this->pdo->prepare("INSERT INTO `groups` (name) VALUES (?)");
            $stmt->execute([$data['name']]);
            $groupId = $this->pdo->lastInsertId();

            // Update User
            $stmt = $this->pdo->prepare("UPDATE users SET group_id = ?, role = 'admin' WHERE id = ?");
            $stmt->execute([$groupId, $userId]);

            $this->pdo->commit();

            echo json_encode(['message' => 'Group created', 'group_id' => $groupId]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create group: ' . $e->getMessage()]);
        }
    }

    public function join() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['group_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Group ID required']);
            return;
        }

        // Verify Group Exists
        $stmt = $this->pdo->prepare("SELECT id, name FROM `groups` WHERE id = ?");
        $stmt->execute([$data['group_id']]);
        $group = $stmt->fetch();
        
        if (!$group) {
            http_response_code(404);
            echo json_encode(['error' => 'Group not found']);
            return;
        }

        // Check if already requested
        $stmt = $this->pdo->prepare("SELECT id, status FROM join_requests WHERE user_id = ? AND group_id = ?");
        $stmt->execute([$userId, $data['group_id']]);
        $existing = $stmt->fetch();

        if ($existing) {
            if ($existing['status'] === 'pending') {
                echo json_encode(['message' => 'Join request already pending', 'status' => 'pending']);
                return;
            } elseif ($existing['status'] === 'approved') {
                echo json_encode(['message' => 'Already approved', 'status' => 'approved']);
                return;
            }
        }

        // Create join request
        $stmt = $this->pdo->prepare("INSERT INTO join_requests (user_id, group_id, status) VALUES (?, ?, 'pending')");
        $stmt->execute([$userId, $data['group_id']]);

        echo json_encode(['message' => 'Join request sent. Waiting for admin approval.', 'status' => 'pending']);
    }

    public function pendingRequests() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        // Get user's group and check if admin
        $stmt = $this->pdo->prepare("SELECT group_id, role FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user['group_id']) {
            http_response_code(400);
            echo json_encode(['error' => 'User not in a group']);
            return;
        }

        if ($user['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Only admins can view join requests']);
            return;
        }

        // Get pending requests for this group
        $stmt = $this->pdo->prepare("
            SELECT jr.id, jr.user_id, jr.created_at, u.name, u.email
            FROM join_requests jr
            JOIN users u ON jr.user_id = u.id
            WHERE jr.group_id = ? AND jr.status = 'pending'
            ORDER BY jr.created_at DESC
        ");
        $stmt->execute([$user['group_id']]);
        $requests = $stmt->fetchAll();

        echo json_encode(['requests' => $requests]);
    }

    public function approveRequest() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['request_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Request ID required']);
            return;
        }

        // Get user's group and check if admin
        $stmt = $this->pdo->prepare("SELECT group_id, role FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if ($user['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Only admins can approve requests']);
            return;
        }

        // Get the request
        $stmt = $this->pdo->prepare("SELECT user_id, group_id FROM join_requests WHERE id = ? AND status = 'pending'");
        $stmt->execute([$data['request_id']]);
        $request = $stmt->fetch();

        if (!$request) {
            http_response_code(404);
            echo json_encode(['error' => 'Request not found or already processed']);
            return;
        }

        // Verify it's for admin's group
        if ($request['group_id'] != $user['group_id']) {
            http_response_code(403);
            echo json_encode(['error' => 'Cannot approve requests for other groups']);
            return;
        }

        try {
            $this->pdo->beginTransaction();

            // Update request status
            $stmt = $this->pdo->prepare("UPDATE join_requests SET status = 'approved' WHERE id = ?");
            $stmt->execute([$data['request_id']]);

            // Add user to group
            $stmt = $this->pdo->prepare("UPDATE users SET group_id = ? WHERE id = ?");
            $stmt->execute([$request['group_id'], $request['user_id']]);

            $this->pdo->commit();

            echo json_encode(['message' => 'Request approved successfully']);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => 'Failed to approve request: ' . $e->getMessage()]);
        }
    }

    public function rejectRequest() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['request_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Request ID required']);
            return;
        }

        // Get user's group and check if admin
        $stmt = $this->pdo->prepare("SELECT group_id, role FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if ($user['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Only admins can reject requests']);
            return;
        }

        // Update request status
        $stmt = $this->pdo->prepare("UPDATE join_requests SET status = 'rejected' WHERE id = ? AND group_id = ?");
        $stmt->execute([$data['request_id'], $user['group_id']]);

        echo json_encode(['message' => 'Request rejected']);
    }

    public function myRequestStatus() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        // Get user's most recent join request
        $stmt = $this->pdo->prepare("
            SELECT jr.id, jr.group_id, jr.status, g.name as group_name
            FROM join_requests jr
            LEFT JOIN `groups` g ON jr.group_id = g.id
            WHERE jr.user_id = ?
            ORDER BY jr.created_at DESC
            LIMIT 1
        ");
        $stmt->execute([$userId]);
        $request = $stmt->fetch();

        if ($request) {
            echo json_encode([
                'has_request' => true,
                'status' => $request['status'],
                'group_id' => $request['group_id'],
                'group_name' => $request['group_name']
            ]);
        } else {
            echo json_encode(['has_request' => false]);
        }
    }

    public function members() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        // Get User's Group
        $stmt = $this->pdo->prepare("SELECT group_id FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user['group_id']) {
            http_response_code(400);
            echo json_encode(['error' => 'User not in a group']);
            return;
        }

        // Get Members
        $stmt = $this->pdo->prepare("
            SELECT u.id, u.name, u.email, u.role 
            FROM users u 
            WHERE u.group_id = ?
        ");
        $stmt->execute([$user['group_id']]);
        $members = $stmt->fetchAll();

        echo json_encode(['members' => $members]);
    }
}
