<?php

class AuthController {
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

    public function register() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data['name']) || !isset($data['email']) || !isset($data['password'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            return;
        }

        $name = trim($data['name']);
        $email = trim($data['email']);
        $password = $data['password'];

        // Check if email exists
        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'Email already exists']);
            return;
        }

        // Hash password
        $hash = password_hash($password, PASSWORD_DEFAULT);

        // Insert user
        try {
            $stmt = $this->pdo->prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)");
            $stmt->execute([$name, $email, $hash]);
            
            $userId = $this->pdo->lastInsertId();

            http_response_code(201);
            echo json_encode(['message' => 'User registered successfully', 'user_id' => $userId]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Registration failed']);
        }
    }

    public function login() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data['email']) || !isset($data['password'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            return;
        }

        $email = $data['email'];
        $password = $data['password'];

        $stmt = $this->pdo->prepare("SELECT id, name, password_hash, role, group_id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid credentials']);
            return;
        }

        // Generate Token
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));

        // Save Session
        $stmt = $this->pdo->prepare("INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)");
        $stmt->execute([$user['id'], $token, $expiresAt]);

        echo json_encode([
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $email,
                'role' => $user['role'],
                'group_id' => $user['group_id']
            ]
        ]);
    }

    public function resetPassword() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $currentPassword = $data['current_password'] ?? null;
        $newPassword = $data['new_password'] ?? null;

        if (!$currentPassword || !$newPassword) {
            http_response_code(400);
            echo json_encode(['error' => 'Current and new passwords are required.']);
            return;
        }

        // Fetch the user's current hashed password
        $stmt = $this->pdo->prepare("SELECT password_hash FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found.']);
            return;
        }

        // Verify the current password
        if (!password_verify($currentPassword, $user['password_hash'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Incorrect current password.']);
            return;
        }

        // Hash the new password
        $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);

        // Update the password in the database
        $stmt = $this->pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
        $stmt->execute([$newPasswordHash, $userId]);

        echo json_encode(['message' => 'Password updated successfully.']);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Profile Picture Methods (File-based storage)
    // ─────────────────────────────────────────────────────────────────────────────

    public function uploadProfilePicture() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $profilePicture = $data['profile_picture'] ?? null;

        // Define uploads directory
        $uploadsDir = __DIR__ . '/../../uploads';
        
        // Create uploads folder if it doesn't exist
        if (!is_dir($uploadsDir)) {
            mkdir($uploadsDir, 0755, true);
        }

        // Allow null/empty to remove profile picture
        if ($profilePicture === null || $profilePicture === '') {
            // Get current profile picture filename
            $stmt = $this->pdo->prepare("SELECT profile_picture FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch();
            
            // Delete old file if exists
            if ($user && $user['profile_picture']) {
                $oldFile = $uploadsDir . '/' . $user['profile_picture'];
                if (file_exists($oldFile)) {
                    unlink($oldFile);
                }
            }
            
            $stmt = $this->pdo->prepare("UPDATE users SET profile_picture = NULL WHERE id = ?");
            $stmt->execute([$userId]);
            echo json_encode(['message' => 'Profile picture removed']);
            return;
        }

        // Validate base64 image format (should start with data:image)
        if (!preg_match('/^data:image\/(jpeg|png|gif|webp);base64,/', $profilePicture, $matches)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid image format. Must be base64 encoded.']);
            return;
        }

        // Check size (max ~500KB after base64 encoding)
        if (strlen($profilePicture) > 700000) {
            http_response_code(400);
            echo json_encode(['error' => 'Image too large. Max 500KB.']);
            return;
        }

        try {
            // Get file extension from mime type
            $extension = $matches[1] === 'jpeg' ? 'jpg' : $matches[1];
            
            // Generate unique filename
            $filename = 'profile_' . $userId . '.' . $extension;
            $filepath = $uploadsDir . '/' . $filename;
            
            // Delete old profile picture if exists (with different extension)
            $stmt = $this->pdo->prepare("SELECT profile_picture FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch();
            if ($user && $user['profile_picture']) {
                $oldFile = $uploadsDir . '/' . $user['profile_picture'];
                if (file_exists($oldFile) && $oldFile !== $filepath) {
                    unlink($oldFile);
                }
            }
            
            // Decode base64 and save file
            $base64Data = preg_replace('/^data:image\/\w+;base64,/', '', $profilePicture);
            $imageData = base64_decode($base64Data);
            
            if ($imageData === false) {
                throw new Exception('Failed to decode image');
            }
            
            file_put_contents($filepath, $imageData);
            
            // Save only the filename in database
            $stmt = $this->pdo->prepare("UPDATE users SET profile_picture = ? WHERE id = ?");
            $stmt->execute([$filename, $userId]);
            
            echo json_encode([
                'message' => 'Profile picture updated successfully',
                'filename' => $filename
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save profile picture: ' . $e->getMessage()]);
        }
    }

    public function getProfilePicture() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        // Get user_id from query parameter, default to current user
        $targetUserId = isset($_GET['user_id']) ? intval($_GET['user_id']) : $userId;

        $stmt = $this->pdo->prepare("SELECT profile_picture FROM users WHERE id = ?");
        $stmt->execute([$targetUserId]);
        $user = $stmt->fetch();

        if (!$user) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
            return;
        }

        // Return the filename - frontend will construct the full URL
        echo json_encode(['profile_picture' => $user['profile_picture']]);
    }
}
