<?php

class BudgetController {
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

    public function getBudgetStats() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        // 1. Get Monthly Budget
        $stmt = $this->pdo->prepare("SELECT monthly_budget FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $budget = $stmt->fetchColumn() ?: 0;

        // 2. Get Total Income for current month
        $stmt = $this->pdo->prepare("
            SELECT SUM(amount) as total_income 
            FROM user_income 
            WHERE user_id = ? 
            AND MONTH(created_at) = MONTH(CURRENT_DATE()) 
            AND YEAR(created_at) = YEAR(CURRENT_DATE())
        ");
        $stmt->execute([$userId]);
        $totalIncome = $stmt->fetchColumn() ?: 0;

        // 3. Get All Income Entries
        $stmt = $this->pdo->prepare("
            SELECT * FROM user_income 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        ");
        $stmt->execute([$userId]);
        $incomeEntries = $stmt->fetchAll();

        echo json_encode([
            'monthly_budget' => floatval($budget),
            'total_income' => floatval($totalIncome),
            'income_entries' => $incomeEntries
        ]);
    }

    public function addIncome() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['amount']) || !isset($data['source'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing fields']);
            return;
        }

        $stmt = $this->pdo->prepare("
            INSERT INTO user_income (user_id, amount, source, description) 
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([
            $userId, 
            $data['amount'], 
            $data['source'], 
            $data['description'] ?? null
        ]);

        echo json_encode(['message' => 'Income added successfully']);
    }

    public function updateBudget() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['monthly_budget'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing monthly_budget']);
            return;
        }

        $stmt = $this->pdo->prepare("UPDATE users SET monthly_budget = ? WHERE id = ?");
        $stmt->execute([$data['monthly_budget'], $userId]);

        echo json_encode(['message' => 'Budget updated successfully']);
    }
}
