<?php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Basic Autoloader
spl_autoload_register(function ($class_name) {
    // Convert namespace to file path
    // Example: Database -> server/src/Database/Database.php
    // Example: Controllers\AuthController -> server/src/Controllers/AuthController.php
    
    $base_dir = __DIR__ . '/../src/';
    
    // Remove namespace prefix if you use namespaces, for now we keep it simple or map it
    // Let's assume simple class names for MVP or basic mapping
    
    // Check specific paths
    $paths = [
        $base_dir . 'Database/' . $class_name . '.php',
        $base_dir . 'Controllers/' . $class_name . '.php',
        $base_dir . 'Models/' . $class_name . '.php',
        $base_dir . 'Services/' . $class_name . '.php',
    ];

    foreach ($paths as $file) {
        if (file_exists($file)) {
            require_once $file;
            return;
        }
    }
});

// Polyfill for getallheaders() if not exists
if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        return $headers;
    }
}

// Load Config
$config = require_once __DIR__ . '/../config/db.php';

try {
    // Initialize DB
    $db = new Database($config);
    $pdo = $db->getConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database Init Failed: ' . $e->getMessage()]);
    exit;
}

// Simple Router
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Calculate the script path (e.g., /roomOS/server/public/index.php)
$scriptName = $_SERVER['SCRIPT_NAME'];
$scriptDir = dirname($scriptName);

// If URI starts with scriptDir, strip it
if (strpos($uri, $scriptDir) === 0) {
    $uri = substr($uri, strlen($scriptDir));
}

// Also handle if scriptDir is just / (root)
if ($uri === '' || $uri === '/') {
    // Root request, maybe show status or 404
}

// Ensure URI starts with /
if (empty($uri) || $uri[0] !== '/') {
    $uri = '/' . $uri;
}

// Route Dispatcher
// Format: 'path' => ['Controller', 'method']
$routes = [
    // Auth
    '/auth/register' => ['AuthController', 'register'],
    '/auth/login' => ['AuthController', 'login'],
    '/auth/reset-password' => ['AuthController', 'resetPassword'],
    
    // Group
    '/group/create' => ['GroupController', 'create'],
    '/group/join' => ['GroupController', 'join'],
    '/group/members' => ['GroupController', 'members'],
    '/group/pending-requests' => ['GroupController', 'pendingRequests'],
    '/group/approve-request' => ['GroupController', 'approveRequest'],
    '/group/reject-request' => ['GroupController', 'rejectRequest'],
    '/group/my-request-status' => ['GroupController', 'myRequestStatus'],

    // Roster
    '/roster/week' => ['RosterController', 'getWeek'],
    '/roster/today' => ['RosterController', 'getToday'],
    '/roster/update' => ['RosterController', 'update'],

    // Tasks
    '/tasks/today' => ['TaskController', 'getToday'],
    '/tasks/assign' => ['TaskController', 'assign'],

    // Transactions
    '/transactions/add' => ['TransactionController', 'add'],
    '/transactions/list' => ['TransactionController', 'list'],
    '/transactions/delete' => ['TransactionController', 'delete'],
    '/transactions/recalculate' => ['TransactionController', 'recalculate'],

    // Chat
    '/chat/send' => ['ChatController', 'send'],
    '/chat/since' => ['ChatController', 'since'],
    
    // Schedule
    '/schedule/save' => ['ScheduleController', 'save'],
    '/schedule/get' => ['ScheduleController', 'get'],
    '/schedule/generate-plan' => ['ScheduleController', 'generatePlan'],
    
    // Updates
    '/updates/check' => ['UpdateController', 'getLatestUpdate'],
    
    // Test
    '/test' => ['TestController', 'index'],
];

if (array_key_exists($uri, $routes)) {
    $controllerName = $routes[$uri][0];
    $actionName = $routes[$uri][1];
    
    if (class_exists($controllerName)) {
        $controller = new $controllerName($pdo);
        if (method_exists($controller, $actionName)) {
            try {
                $controller->$actionName();
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['error' => 'Controller Error: ' . $e->getMessage()]);
            }
        } else {
            http_response_code(500);
            echo json_encode(['error' => "Method $actionName not found in $controllerName"]);
        }
    } else {
        http_response_code(500);
        echo json_encode(['error' => "Controller $controllerName not found"]);
    }
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Endpoint not found', 'uri' => $uri]);
}
