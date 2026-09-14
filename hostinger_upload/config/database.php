<?php
// config/database.php - Secure MySQL PDO Connection for Hostinger Shared Hosting

$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (empty($authHeader) && function_exists('apache_request_headers')) {
    $headers = apache_request_headers();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
}

if (!empty($authHeader) && preg_match('/Bearer\s+(\S+)/', $authHeader, $matches)) {
    $token = trim($matches[1]);
    if (!empty($token) && session_status() === PHP_SESSION_NONE) {
        if (strlen($token) >= 10 && strlen($token) <= 128) {
            session_id($token);
        }
    }
}

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$db_host = 'localhost';
$db_name = 'u788285039_amzreal';
$db_user = 'u788285039_amzreal';
$db_pass = 'Johrr786a';

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    error_log("Database connection error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Internal database connection error.']);
    exit;
}

function json_response($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

function get_current_user_id() {
    return $_SESSION['user_id'] ?? null;
}

function require_auth() {
    if (!isset($_SESSION['user_id'])) {
        json_response(['success' => false, 'message' => 'Unauthorized. Please log in.'], 401);
    }
}
?>
