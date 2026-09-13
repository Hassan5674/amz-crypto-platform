<?php
// api/auth/me.php
header('Content-Type: application/json; charset=utf-8');
require_once '../../config/database.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT id, uuid, name, username, email, status, created_at FROM users WHERE id = ? LIMIT 1");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();

    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'user' => $user
        ]
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Server error']);
}
?>
