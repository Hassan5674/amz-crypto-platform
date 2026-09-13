<?php
// api/auth/verify-email.php
header('Content-Type: application/json; charset=utf-8');
require_once '../../config/database.php';

$input = json_decode(file_get_contents('php://input'), true);
$code = trim($input['code'] ?? $input['token'] ?? '');

if (empty($code)) {
    echo json_encode(['success' => false, 'message' => 'Verification code is required.']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT * FROM email_verification_codes WHERE code = ? AND used = 0 AND expires_at > NOW() ORDER BY id DESC LIMIT 1");
    $stmt->execute([$code]);
    $vRecord = $stmt->fetch();

    if (!$vRecord) {
        echo json_encode(['success' => false, 'message' => 'Invalid or expired verification code.']);
        exit;
    }

    $pdo->beginTransaction();

    // Mark code used
    $stmtUpdCode = $pdo->prepare("UPDATE email_verification_codes SET used = 1 WHERE id = ?");
    $stmtUpdCode->execute([$vRecord['id']]);

    // Activate user
    $stmtUpdUser = $pdo->prepare("UPDATE users SET status = 'ACTIVE', email_verified_at = NOW() WHERE id = ?");
    $stmtUpdUser->execute([$vRecord['user_id']]);

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Email verified successfully! Congratulations, your account is now active.'
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Verification error: ' . $e->getMessage()]);
}
?>
