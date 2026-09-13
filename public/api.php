<?php
// api.php - MySQL Backend for Hostinger Shared Hosting
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

header('Content-Type: application/json');

// Database configuration (Update these with your Hostinger MySQL database details)
$host = 'localhost';
$db   = getenv('DB_NAME') ?: 'u788285039_amzdb';
$user = getenv('DB_USER') ?: 'u788285039_amzuser';
$pass = getenv('DB_PASS') ?: 'YourMySQLPassword';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
     $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
     echo json_encode(['success' => false, 'message' => 'Database connection failed. Please update MySQL credentials in api.php: ' . $e->getMessage()]);
     exit;
}

// Auto-create tables if not exist
$pdo->exec("CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    role VARCHAR(32) DEFAULT 'user',
    status VARCHAR(32) DEFAULT 'active',
    kyc_status VARCHAR(32) DEFAULT 'verified',
    balance DECIMAL(15,2) DEFAULT 1000.00,
    is_verified TINYINT(1) DEFAULT 1,
    verification_code VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");

$requestUri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

$path = str_replace('/api/', '', parse_url($requestUri, PHP_URL_PATH));
$segments = explode('/', trim($path, '/'));

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

if (isset($segments[0]) && $segments[0] === 'auth' && isset($segments[1]) && $segments[1] === 'register') {
    $name = $input['name'] ?? '';
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
    
    if (!$name || !$email || !$password) {
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Email already registered']);
        exit;
    }

    $userId = 'user_' . time() . '_' . mt_rand(1000, 9999);
    $token = 'token_' . $userId . '_' . time();
    $code = (string)mt_rand(100000, 999999);

    $stmt = $pdo->prepare("INSERT INTO users (id, name, email, password, role, status, kyc_status, balance, is_verified, verification_code) VALUES (?, ?, ?, ?, 'user', 'active', 'verified', 1000.00, 1, ?)");
    $stmt->execute([$userId, $name, $email, $password, $code]);

    echo json_encode([
        'success' => true,
        'message' => 'Registered successfully',
        'data' => [
            'user' => ['id' => $userId, 'name' => $name, 'email' => $email, 'role' => 'user', 'is_verified' => true],
            'token' => $token
        ]
    ]);
    exit;
}

if (isset($segments[0]) && $segments[0] === 'auth' && isset($segments[1]) && $segments[1] === 'login') {
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';

    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || $user['password'] !== $password) {
        echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
        exit;
    }

    $token = 'token_' . $user['id'] . '_' . time();
    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'data' => [
            'user' => ['id' => $user['id'], 'name' => $user['name'], 'email' => $user['email'], 'role' => $user['role'], 'is_verified' => (bool)$user['is_verified']],
            'token' => $token
        ]
    ]);
    exit;
}

if (isset($segments[0]) && $segments[0] === 'admin' && isset($segments[1]) && $segments[1] === 'users') {
    // Admin Adjust User Balance: /api/admin/users/{id}/adjust-balance
    if (isset($segments[2]) && isset($segments[3]) && $segments[3] === 'adjust-balance') {
        $userId = $segments[2];
        $amount = floatval($input['amount'] ?? 0);
        $type = strtoupper($input['type'] ?? 'ADD');
        
        if ($amount <= 0) {
            echo json_encode(['success' => false, 'message' => 'Invalid adjustment amount']);
            exit;
        }

        if ($type === 'REMOVE') {
            $stmt = $pdo->prepare("UPDATE users SET balance = GREATEST(0.00, balance - ?) WHERE id = ?");
        } else {
            $stmt = $pdo->prepare("UPDATE users SET balance = balance + ? WHERE id = ?");
        }
        $stmt->execute([$amount, $userId]);

        $stmt = $pdo->prepare("SELECT balance, name, email FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $userRow = $stmt->fetch();
        $newBal = $userRow ? floatval($userRow['balance']) : 0.00;

        echo json_encode([
            'success' => true,
            'message' => 'Balance successfully adjusted',
            'data' => [
                'user_id' => $userId,
                'new_balance' => number_format($newBal, 2, '.', '')
            ]
        ]);
        exit;
    }

    // Admin List Users: /api/admin/users
    $stmt = $pdo->query("SELECT id, name, email, role, status, balance, created_at FROM users ORDER BY created_at DESC");
    $usersList = $stmt->fetchAll();
    $formatted = array_map(function($u) {
        return [
            'id' => $u['id'],
            'name' => $u['name'],
            'username' => explode('@', $u['email'])[0],
            'email' => $u['email'],
            'roles' => [strtoupper($u['role'] ?: 'USER')],
            'status' => strtoupper($u['status'] ?: 'ACTIVE'),
            'balance' => number_format(floatval($u['balance']), 2, '.', ''),
            'created_at' => $u['created_at']
        ];
    }, $usersList);

    echo json_encode(['success' => true, 'data' => $formatted]);
    exit;
}

if (isset($segments[0]) && $segments[0] === 'wallet') {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $userBal = 0.00;
    if ($authHeader && preg_match('/token_(user_[^ _]+)/', $authHeader, $matches)) {
        $uid = $matches[1];
        $stmt = $pdo->prepare("SELECT balance FROM users WHERE id = ?");
        $stmt->execute([$uid]);
        $row = $stmt->fetch();
        if ($row) $userBal = floatval($row['balance']);
    }
    echo json_encode([
        'success' => true,
        'data' => [
            'wallet' => [
                'balances' => ['available' => $userBal],
                'currency' => 'USD'
            ]
        ]
    ]);
    exit;
}

echo json_encode(['success' => true, 'message' => 'Hostinger MySQL PHP API active']);
