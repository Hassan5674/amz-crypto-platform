<?php
// api/auth/login.php
header('Content-Type: application/json; charset=utf-8');
require_once '../../config/database.php';

$input = json_decode(file_get_contents('php://input'), true);
$identifier = trim($input['identifier'] ?? '');
$password = $input['password'] ?? '';

if (empty($identifier) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Identifier and password required.']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1");
    $stmt->execute([$identifier, $identifier]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        echo json_encode(['success' => false, 'message' => 'Invalid credentials.']);
        exit;
    }

    if ($user['status'] === 'PENDING_VERIFICATION' || empty($user['email_verified_at'])) {
        echo json_encode([
            'success' => false,
            'status' => 'pending_verification',
            'requiresEmailVerification' => true,
            'email' => $user['email'],
            'message' => 'Account is pending email verification.'
        ]);
        exit;
    }

    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];

    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'data' => [
            'token' => session_id(),
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'status' => $user['status']
            ]
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Login error: ' . $e->getMessage()]);
}
?>
