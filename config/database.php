<?php
// config/database.php - Secure MySQL PDO Connection for Hostinger Shared Hosting

// Handle Authorization Bearer token for session ID restoration
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (empty($authHeader) && function_exists('apache_request_headers')) {
    $headers = apache_request_headers();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
}

if (!empty($authHeader) && preg_match('/Bearer\s+(\S+)/', $authHeader, $matches)) {
    $token = trim($matches[1]);
    if (!empty($token) && session_status() === PHP_SESSION_NONE) {
        // Only set session id if valid looking string
        if (strlen($token) >= 10 && strlen($token) <= 128) {
            session_id($token);
        }
    }
}

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../api/core/ResponseHandler.php';

$db_host = getenv('DB_HOST') ?: 'localhost';
$db_name = getenv('DB_NAME') ?: 'amz_production_db';
$db_user = getenv('DB_USER') ?: 'root';
$db_pass = getenv('DB_PASS') ?: '';

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    error_log("Database connection error: " . $e->getMessage());
    ResponseHandler::error('Internal database connection error.', 500);
}

function json_response($data, $status = 200) {
    if (isset($data['success'])) {
        ResponseHandler::success($data['data'] ?? $data, $data['message'] ?? 'Success', $status);
    } else {
        ResponseHandler::success($data, 'Success', $status);
    }
}

function get_current_user_id() {
    if (isset($_SESSION['user_id'])) {
        return $_SESSION['user_id'];
    }
    // Fallback if user ID passed or token is user id
    return null;
}

function require_auth() {
    if (!isset($_SESSION['user_id'])) {
        ResponseHandler::error('Unauthorized. Please log in.', 401);
    }
}
?>
