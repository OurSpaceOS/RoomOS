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

        $stmt = $this->pdo->prepare("SELECT id, name, password_hash, role, group_id, profile_picture FROM users WHERE email = ?");
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
                'group_id' => $user['group_id'],
                'profile_picture' => $user['profile_picture']
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

    public function uploadProfilePicture() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['image'])) {
            http_response_code(400);
            echo json_encode(['error' => 'No image data provided']);
            return;
        }

        $imageData = $data['image'];
        
        // Validate base64 image format
        if (!preg_match('/^data:image\/(jpeg|jpg|png|webp);base64,/', $imageData)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid image format. Only JPEG, PNG, and WebP are allowed.']);
            return;
        }

        // Extract base64 data
        $base64Data = preg_replace('/^data:image\/\w+;base64,/', '', $imageData);
        $decodedImage = base64_decode($base64Data);

        if ($decodedImage === false) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid base64 encoding']);
            return;
        }

        // Check file size (max 2MB)
        $imageSize = strlen($decodedImage);
        $maxSize = 2 * 1024 * 1024; // 2MB in bytes
        
        if ($imageSize > $maxSize) {
            http_response_code(400);
            echo json_encode(['error' => 'Image size exceeds 2MB limit']);
            return;
        }

        // Update user's profile picture in database
        try {
            $stmt = $this->pdo->prepare("UPDATE users SET profile_picture = ? WHERE id = ?");
            $stmt->execute([$imageData, $userId]);

            echo json_encode([
                'message' => 'Profile picture uploaded successfully',
                'profile_picture' => $imageData
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save profile picture']);
        }
    }

    public function removeProfilePicture() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        try {
            $stmt = $this->pdo->prepare("UPDATE users SET profile_picture = NULL WHERE id = ?");
            $stmt->execute([$userId]);

            echo json_encode(['message' => 'Profile picture removed successfully']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to remove profile picture']);
        }
    }
}
