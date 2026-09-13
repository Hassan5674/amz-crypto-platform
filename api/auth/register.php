<?php
// api/auth/register.php
header('Content-Type: application/json; charset=utf-8');
require_once '../../config/database.php';

$input = json_decode(file_get_contents('php://input'), true);
$name = trim($input['name'] ?? '');
$username = trim($input['username'] ?? '');
$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';

if (empty($name) || empty($username) || empty($email) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'All registration fields are required.']);
    exit;
}

try {
    // Check existing
    $stmt = $pdo->prepare("SELECT id, status, email_verified_at FROM users WHERE email = ? OR username = ? LIMIT 1");
    $stmt->execute([$email, $username]);
    $existing = $stmt->fetch();

    if ($existing) {
        if ($existing['status'] === 'PENDING_VERIFICATION' || empty($existing['email_verified_at'])) {
            // Generate new code
            $code = sprintf("%06d", mt_rand(1, 999999));
            $expires = date('Y-m-d H:i:s', strtotime('+15 minutes'));
            
            $stmtCode = $pdo->prepare("INSERT INTO email_verification_codes (user_id, email, code, expires_at) VALUES (?, ?, ?, ?)");
            $stmtCode->execute([$existing['id'], $email, $code, $expires]);

            echo json_encode([
                'success' => false,
                'requiresEmailVerification' => true,
                'email' => $email,
                'previewCode' => $code,
                'message' => 'Account already registered but not verified. A new verification code has been generated.'
            ]);
            exit;
        }
        echo json_encode(['success' => false, 'message' => 'Email or username is already registered.']);
        exit;
    }

    $uuid = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000, mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff));
    $hash = password_hash($password, PASSWORD_DEFAULT);

    $pdo->beginTransaction();

    $stmtUser = $pdo->prepare("INSERT INTO users (uuid, name, username, email, password_hash, status) VALUES (?, ?, ?, ?, ?, 'PENDING_VERIFICATION')");
    $stmtUser->execute([$uuid, $name, $username, $email, $hash]);
    $userId = $pdo->lastInsertId();

    // Create default wallet
    $stmtWallet = $pdo->prepare("INSERT INTO wallets (user_id, currency, available_balance) VALUES (?, 'USD', 0.00000000)");
    $stmtWallet->execute([$userId]);

    // Generate verification code
    $code = sprintf("%06d", mt_rand(1, 999999));
    $expires = date('Y-m-d H:i:s', strtotime('+15 minutes'));
    $stmtCode = $pdo->prepare("INSERT INTO email_verification_codes (user_id, email, code, expires_at) VALUES (?, ?, ?, ?)");
    $stmtCode->execute([$userId, $email, $code, $expires]);

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'requiresEmailVerification' => true,
        'email' => $email,
        'previewCode' => $code,
        'message' => 'Registration successful. Please verify your email.'
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Registration error: ' . $e->getMessage()]);
}
?>
