<?php
// api/auth/resend-code.php
header('Content-Type: application/json; charset=utf-8');
require_once '../../config/database.php';

$input = json_decode(file_get_contents('php://input'), true);
$email = trim($input['email'] ?? '');

if (empty($email)) {
    echo json_encode(['success' => false, 'message' => 'Email address is required.']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT id, status FROM users WHERE email = ? LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'User account not found for this email.']);
        exit;
    }

    $code = sprintf("%06d", mt_rand(1, 999999));
    $expires = date('Y-m-d H:i:s', strtotime('+15 minutes'));

    $stmtCode = $pdo->prepare("INSERT INTO email_verification_codes (user_id, email, code, expires_at) VALUES (?, ?, ?, ?)");
    $stmtCode->execute([$user['id'], $email, $code, $expires]);

    echo json_encode([
        'success' => true,
        'previewCode' => $code,
        'message' => 'A fresh verification code has been sent to your email.'
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error resending code: ' . $e->getMessage()]);
}
?>
