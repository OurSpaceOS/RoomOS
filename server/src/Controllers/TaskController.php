<?php

class TaskController {
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

    public function getToday() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $user = $this->getUserGroup($userId);
        $date = date('Y-m-d');

        $stmt = $this->pdo->prepare("SELECT task_json FROM tasks WHERE group_id = ? AND date = ?");
        $stmt->execute([$user['group_id'], $date]);
        $task = $stmt->fetch();

        if ($task) {
            // Convert {"Brooming":"Sumit"} to [{task_name:"Brooming", assigned_to_name:"Sumit"}]
            $taskObj = json_decode($task['task_json'], true);
            $taskArray = [];
            foreach ($taskObj as $taskName => $assignedTo) {
                $taskArray[] = [
                    'task_name' => $taskName,
                    'assigned_to_name' => $assignedTo
                ];
            }
            echo json_encode(['tasks' => $taskArray]);
        } else {
            echo json_encode(['tasks' => []]);
        }
    }

    public function assign() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $user = $this->getUserGroup($userId);
        $date = date('Y-m-d');

        // Check if already assigned
        $stmt = $this->pdo->prepare("SELECT id FROM tasks WHERE group_id = ? AND date = ?");
        $stmt->execute([$user['group_id'], $date]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'Tasks already assigned for today']);
            return;
        }

        // Get Members
        $stmt = $this->pdo->prepare("SELECT name FROM users WHERE group_id = ?");
        $stmt->execute([$user['group_id']]);
        $members = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (count($members) < 2) {
            http_response_code(400);
            echo json_encode(['error' => 'Need at least 2 members to assign tasks']);
            return;
        }

        // Seeded Shuffle (Simple version: just shuffle for now, PHP's random is good enough for MVP)
        // For true "everyone sees same result" without DB, we'd need a seed.
        // But here we are storing the result in DB, so simple shuffle is fine.
        shuffle($members);

        // Tasks
        $tasks = ['Brooming', 'Water', 'Trash', 'Market'];
        $assignments = [];

        // Distribute tasks
        // If members < tasks, some get multiple? Or some tasks skipped?
        // Requirement: "Four tasks... Random assignment"
        // Let's assign tasks to people round-robin
        foreach ($tasks as $i => $taskName) {
            $assignee = $members[$i % count($members)];
            $assignments[$taskName] = $assignee;
        }

        $json = json_encode($assignments);

        $stmt = $this->pdo->prepare("INSERT INTO tasks (group_id, date, task_json) VALUES (?, ?, ?)");
        $stmt->execute([$user['group_id'], $date, $json]);

        // Notify each member assigned
        foreach ($assignments as $taskName => $assigneeName) {
            $uStmt = $this->pdo->prepare("SELECT id FROM users WHERE name = ? AND group_id = ?");
            $uStmt->execute([$assigneeName, $user['group_id']]);
            $assigneeId = $uStmt->fetchColumn();
            
            if ($assigneeId) {
                NotificationController::create($this->pdo, $assigneeId, $userId, 'task', 'New Task Assigned', 'You have been assigned: ' . $taskName);
            }
        }

        echo json_encode(['message' => 'Tasks assigned', 'tasks' => $assignments]);
    }
}
