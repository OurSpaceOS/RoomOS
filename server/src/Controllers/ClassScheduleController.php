<?php

class ClassScheduleController {
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
     * Save schedule for a specific day
     */
    public function saveDay() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['day_index']) || !isset($data['classes'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing day_index or classes data']);
            return;
        }

        $dayIndex = intval($data['day_index']);
        $isOff = !empty($data['is_off']) ? 1 : 0;
        $classes = json_encode($data['classes']);

        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO class_schedules (user_id, day_index, is_off, schedule_json)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    is_off = VALUES(is_off),
                    schedule_json = VALUES(schedule_json)
            ");
            $stmt->execute([$userId, $dayIndex, $isOff, $classes]);

            echo json_encode(['message' => 'Schedule saved for day ' . $dayIndex]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save schedule: ' . $e->getMessage()]);
        }
    }

    /**
     * Get full week schedule for the current user
     */
    public function get() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        try {
            $stmt = $this->pdo->prepare("SELECT day_index, is_off, schedule_json FROM class_schedules WHERE user_id = ?");
            $stmt->execute([$userId]);
            $rows = $stmt->fetchAll();

            $schedule = [];
            // Initialize empty week
            for ($i = 0; $i < 7; $i++) {
                $schedule[$i] = [
                    'day_index' => $i,
                    'is_off' => false,
                    'classes' => []
                ];
            }

            foreach ($rows as $row) {
                $idx = intval($row['day_index']);
                $schedule[$idx] = [
                    'day_index' => $idx,
                    'is_off' => (bool)$row['is_off'],
                    'classes' => json_decode($row['schedule_json'], true)
                ];
            }

            echo json_encode(['schedule' => $schedule]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to fetch schedule']);
        }
    }
}
