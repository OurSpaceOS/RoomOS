<?php

class ChatController {
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

    /**
     * Send a message (group or DM)
     * POST /chat/send
     * Body: { message: "...", recipient_id?: int }
     * recipient_id = null/omitted → group message
     * recipient_id = userId → DM
     */
    public function send() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $user = $this->getUserGroup($userId);
        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data['message']) || empty(trim($data['message']))) {
            http_response_code(400);
            echo json_encode(['error' => 'Message empty']);
            return;
        }

        $recipientId = isset($data['recipient_id']) ? intval($data['recipient_id']) : null;

        // If DM, verify recipient is in same group
        if ($recipientId) {
            $stmt = $this->pdo->prepare("SELECT group_id FROM users WHERE id = ?");
            $stmt->execute([$recipientId]);
            $recipient = $stmt->fetch();
            if (!$recipient || $recipient['group_id'] !== $user['group_id']) {
                http_response_code(400);
                echo json_encode(['error' => 'Recipient not in your group']);
                return;
            }
        }

        try {
            $stmt = $this->pdo->prepare(
                "INSERT INTO chat_messages (group_id, user_id, recipient_id, message) VALUES (?, ?, ?, ?)"
            );
            $stmt->execute([$user['group_id'], $userId, $recipientId, trim($data['message'])]);
            $msgId = $this->pdo->lastInsertId();

            // Create notification for recipients
            $senderStmt = $this->pdo->prepare("SELECT name FROM users WHERE id = ?");
            $senderStmt->execute([$userId]);
            $sender = $senderStmt->fetch();
            $senderName = $sender['name'] ?? 'Someone';
            $preview = mb_substr(trim($data['message']), 0, 80);

            if ($recipientId) {
                // DM notification to the single recipient
                NotificationController::create(
                    $this->pdo,
                    $recipientId,
                    $userId,
                    'chat_dm',
                    "DM from {$senderName}",
                    $preview
                );
            } else {
                // Group message notification to all OTHER members
                $membersStmt = $this->pdo->prepare(
                    "SELECT id FROM users WHERE group_id = ? AND id != ?"
                );
                $membersStmt->execute([$user['group_id'], $userId]);
                $members = $membersStmt->fetchAll();

                foreach ($members as $member) {
                    NotificationController::create(
                        $this->pdo,
                        $member['id'],
                        $userId,
                        'chat_group',
                        "{$senderName} in group chat",
                        $preview
                    );
                }
            }

            echo json_encode(['message' => 'Sent', 'id' => $msgId]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to send']);
        }
    }

    /**
     * Get group messages (since a given ID, for polling)
     * GET /chat/since?last_id=0
     * Returns only group messages (recipient_id IS NULL)
     */
    public function since() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $user = $this->getUserGroup($userId);
        $lastId = isset($_GET['last_id']) ? intval($_GET['last_id']) : 0;

        $stmt = $this->pdo->prepare("
            SELECT c.id, c.message, c.created_at, c.recipient_id, u.name, u.id as sender_id, u.profile_picture 
            FROM chat_messages c 
            JOIN users u ON c.user_id = u.id 
            WHERE c.group_id = ? AND c.id > ? AND c.recipient_id IS NULL
            ORDER BY c.id ASC
        ");
        $stmt->execute([$user['group_id'], $lastId]);
        $messages = $stmt->fetchAll();

        echo json_encode(['messages' => $messages]);
    }

    /**
     * Get paginated group messages
     * GET /chat/messages?page=1&limit=50
     */
    public function messages() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $user = $this->getUserGroup($userId);
        $page = max(1, intval($_GET['page'] ?? 1));
        $limit = min(100, max(10, intval($_GET['limit'] ?? 50)));
        $offset = ($page - 1) * $limit;

        // Count total
        $countStmt = $this->pdo->prepare(
            "SELECT COUNT(*) as total FROM chat_messages WHERE group_id = ? AND recipient_id IS NULL"
        );
        $countStmt->execute([$user['group_id']]);
        $total = $countStmt->fetch()['total'];

        // Fetch messages (newest first for pagination, reverse in frontend)
        $stmt = $this->pdo->prepare("
            SELECT c.id, c.message, c.created_at, u.name, u.id as sender_id, u.profile_picture
            FROM chat_messages c 
            JOIN users u ON c.user_id = u.id 
            WHERE c.group_id = ? AND c.recipient_id IS NULL
            ORDER BY c.id DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->execute([$user['group_id'], $limit, $offset]);
        $messages = array_reverse($stmt->fetchAll());

        echo json_encode([
            'messages' => $messages,
            'total' => intval($total),
            'page' => $page,
            'pages' => ceil($total / $limit),
        ]);
    }

    /**
     * Get DM thread with a specific user
     * GET /chat/dm?user_id=X&page=1&limit=50
     */
    public function dm() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $user = $this->getUserGroup($userId);
        $otherId = intval($_GET['user_id'] ?? 0);

        if (!$otherId) {
            http_response_code(400);
            echo json_encode(['error' => 'user_id required']);
            return;
        }

        $page = max(1, intval($_GET['page'] ?? 1));
        $limit = min(100, max(10, intval($_GET['limit'] ?? 50)));
        $offset = ($page - 1) * $limit;

        // Count
        $countStmt = $this->pdo->prepare("
            SELECT COUNT(*) as total FROM chat_messages 
            WHERE group_id = ? 
            AND ((user_id = ? AND recipient_id = ?) OR (user_id = ? AND recipient_id = ?))
        ");
        $countStmt->execute([$user['group_id'], $userId, $otherId, $otherId, $userId]);
        $total = $countStmt->fetch()['total'];

        // Messages
        $stmt = $this->pdo->prepare("
            SELECT c.id, c.message, c.created_at, c.recipient_id, u.name, u.id as sender_id, u.profile_picture
            FROM chat_messages c 
            JOIN users u ON c.user_id = u.id 
            WHERE c.group_id = ? 
            AND ((c.user_id = ? AND c.recipient_id = ?) OR (c.user_id = ? AND c.recipient_id = ?))
            ORDER BY c.id DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->execute([$user['group_id'], $userId, $otherId, $otherId, $userId, $limit, $offset]);
        $messages = array_reverse($stmt->fetchAll());

        echo json_encode([
            'messages' => $messages,
            'total' => intval($total),
            'page' => $page,
            'pages' => ceil($total / $limit),
        ]);
    }

    /**
     * Get DM conversation list (unique threads with last message + unread count)
     * GET /chat/conversations
     */
    public function conversations() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $user = $this->getUserGroup($userId);

        // Get all members in the group (potential DM partners)
        $membersStmt = $this->pdo->prepare("
            SELECT id, name, email, profile_picture FROM users WHERE group_id = ? AND id != ?
        ");
        $membersStmt->execute([$user['group_id'], $userId]);
        $members = $membersStmt->fetchAll();

        $conversations = [];

        foreach ($members as $member) {
            $otherId = $member['id'];

            // Last message in DM thread
            $lastMsgStmt = $this->pdo->prepare("
                SELECT c.id, c.message, c.created_at, c.user_id as sender_id
                FROM chat_messages c
                WHERE c.group_id = ?
                AND ((c.user_id = ? AND c.recipient_id = ?) OR (c.user_id = ? AND c.recipient_id = ?))
                ORDER BY c.id DESC
                LIMIT 1
            ");
            $lastMsgStmt->execute([$user['group_id'], $userId, $otherId, $otherId, $userId]);
            $lastMsg = $lastMsgStmt->fetch();

            // Unread DM count (notifications of type chat_dm from this sender)
            $unreadStmt = $this->pdo->prepare("
                SELECT COUNT(*) as unread FROM notifications 
                WHERE user_id = ? AND sender_id = ? AND type = 'chat_dm' AND is_read = 0
            ");
            $unreadStmt->execute([$userId, $otherId]);
            $unread = $unreadStmt->fetch()['unread'];

            $conversations[] = [
                'user' => $member,
                'last_message' => $lastMsg ?: null,
                'unread' => intval($unread),
            ];
        }

        // Unread group message count
        $groupUnreadStmt = $this->pdo->prepare("
            SELECT COUNT(*) as unread FROM notifications 
            WHERE user_id = ? AND type = 'chat_group' AND is_read = 0
        ");
        $groupUnreadStmt->execute([$userId]);
        $groupUnread = $groupUnreadStmt->fetch()['unread'];

        // Last group message
        $lastGroupStmt = $this->pdo->prepare("
            SELECT c.id, c.message, c.created_at, u.name, c.user_id as sender_id
            FROM chat_messages c
            JOIN users u ON c.user_id = u.id
            WHERE c.group_id = ? AND c.recipient_id IS NULL
            ORDER BY c.id DESC LIMIT 1
        ");
        $lastGroupStmt->execute([$user['group_id']]);
        $lastGroupMsg = $lastGroupStmt->fetch();

        echo json_encode([
            'conversations' => $conversations,
            'group_unread' => intval($groupUnread),
            'group_last_message' => $lastGroupMsg ?: null,
        ]);
    }

    /**
     * Mark chat notifications as read for a specific conversation
     * POST /chat/mark-read
     * Body: { type: "group" } or { type: "dm", user_id: X }
     */
    public function markRead() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $type = $data['type'] ?? 'group';

        if ($type === 'dm' && isset($data['user_id'])) {
            $senderId = intval($data['user_id']);
            $stmt = $this->pdo->prepare(
                "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND sender_id = ? AND type = 'chat_dm' AND is_read = 0"
            );
            $stmt->execute([$userId, $senderId]);
        } else {
            $stmt = $this->pdo->prepare(
                "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND type = 'chat_group' AND is_read = 0"
            );
            $stmt->execute([$userId]);
        }

        echo json_encode(['message' => 'Read receipts updated']);
    }

    /**
     * Delete a message (only your own)
     * POST /chat/delete
     * Body: { id: messageId }
     */
    public function deleteMessage() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $msgId = intval($data['id'] ?? 0);

        if (!$msgId) {
            http_response_code(400);
            echo json_encode(['error' => 'Message ID required']);
            return;
        }

        $stmt = $this->pdo->prepare("DELETE FROM chat_messages WHERE id = ? AND user_id = ?");
        $stmt->execute([$msgId, $userId]);

        if ($stmt->rowCount() > 0) {
            echo json_encode(['message' => 'Deleted']);
        } else {
            http_response_code(403);
            echo json_encode(['error' => 'Not found or not your message']);
        }
    }
}
