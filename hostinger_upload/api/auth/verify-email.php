<?php
// api/auth/verify-email.php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../config/database.php';

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$code = trim($input['code'] ?? $input['otp'] ?? $input['token'] ?? $_GET['code'] ?? '');
$email = trim($input['email'] ?? $_GET['email'] ?? '');

if (empty($code)) {
    echo json_encode(['success' => false, 'message' => 'Verification code is required.']);
    exit;
}

try {
    if (!empty($email)) {
        $stmt = $pdo->prepare("SELECT * FROM email_verification_codes WHERE email = ? AND code = ? AND used = 0 AND expires_at > NOW() ORDER BY id DESC LIMIT 1");
        $stmt->execute([$email, $code]);
    } else {
        $stmt = $pdo->prepare("SELECT * FROM email_verification_codes WHERE code = ? AND used = 0 AND expires_at > NOW() ORDER BY id DESC LIMIT 1");
        $stmt->execute([$code]);
    }
    $vRecord = $stmt->fetch();

    if (!$vRecord) {
        echo json_encode(['success' => false, 'message' => 'Invalid or expired verification code. Please request a new one.']);
        exit;
    }

    $pdo->beginTransaction();

    // Mark code used
    $stmtUpdCode = $pdo->prepare("UPDATE email_verification_codes SET used = 1 WHERE id = ?");
    $stmtUpdCode->execute([$vRecord['id']]);

    // Activate user
    $userId = $vRecord['user_id'];
    $targetEmail = $vRecord['email'];

    if ($userId) {
        $stmtUpdUser = $pdo->prepare("UPDATE users SET status = 'ACTIVE', email_verified_at = NOW() WHERE id = ?");
        $stmtUpdUser->execute([$userId]);
        $stmtUser = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmtUser->execute([$userId]);
        $user = $stmtUser->fetch();
    } else {
        $stmtUpdUser = $pdo->prepare("UPDATE users SET status = 'ACTIVE', email_verified_at = NOW() WHERE email = ?");
        $stmtUpdUser->execute([$targetEmail]);
        $stmtUser = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmtUser->execute([$targetEmail]);
        $user = $stmtUser->fetch();
    }

    $token = null;
    if ($user) {
        $token = 'token_' . $user['id'] . '_' . time() . '_' . bin2hex(random_bytes(8));
        try {
            $pdo->prepare("INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))")->execute([$user['id'], $token]);
        } catch (\Exception $e) {}
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Email verified successfully! Congratulations, your account is now active.',
        'data' => [
            'token' => $token,
            'user' => $user ? [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'status' => 'ACTIVE'
            ] : null
        ]
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Verification error: ' . $e->getMessage()]);
}
?>
