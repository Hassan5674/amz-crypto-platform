<?php
// api/auth/resend-code.php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../core/PHPMailer.php';

$input = json_decode(file_get_contents('php://input'), true);
$email = trim($input['email'] ?? '');

if (empty($email)) {
    echo json_encode(['success' => false, 'message' => 'Email address is required.']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT id, name, username, status FROM users WHERE email = ? LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'User account not found for this email.']);
        exit;
    }

    $userName = $user['name'] ?: $user['username'];
    $code = sprintf("%06d", mt_rand(100000, 999999));
    $expires = date('Y-m-d H:i:s', strtotime('+15 minutes'));

    $stmtCode = $pdo->prepare("INSERT INTO email_verification_codes (user_id, email, code, expires_at) VALUES (?, ?, ?, ?)");
    $stmtCode->execute([$user['id'], $email, $code, $expires]);

    // Dispatch real email
    $mail = new PHPMailer();
    $smtpHost = getenv('SMTP_HOST') ?: ($_ENV['SMTP_HOST'] ?? 'smtp.hostinger.com');
    $smtpPort = intval(getenv('SMTP_PORT') ?: ($_ENV['SMTP_PORT'] ?? 465));
    $smtpUser = getenv('SMTP_USER') ?: ($_ENV['SMTP_USER'] ?? 'noreply@amzdistributor.com');
    $smtpPass = getenv('SMTP_PASS') ?: ($_ENV['SMTP_PASS'] ?? 'Alihayder888@');

    $mail->Host = $smtpHost;
    $mail->Port = $smtpPort;
    $mail->Username = $smtpUser;
    $mail->Password = $smtpPass;
    $mail->setFrom($smtpUser, 'AMZDistributor Security');
    $mail->addAddress($email, $userName);
    $mail->isHTML(true);
    $mail->Subject = "{$code} is your AMZDistributor Verification Code";

    $mail->Body = "
    <div style='background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; padding: 40px 20px; color: #f8fafc;'>
        <div style='max-width: 540px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);'>
            <div style='background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 24px; text-align: center;'>
                <h1 style='margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;'>AMZDistributor Security</h1>
            </div>
            <div style='padding: 32px 28px;'>
                <p style='font-size: 16px; line-height: 1.6; color: #e2e8f0; margin-top: 0;'>Hello <strong>" . htmlspecialchars($userName) . "</strong>,</p>
                <p style='font-size: 15px; line-height: 1.6; color: #94a3b8;'>Please enter the following one-time security code to verify your account:</p>
                <div style='text-align: center; margin: 28px 0;'>
                    <span style='display: inline-block; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #34d399; background: #0f172a; padding: 16px 28px; border-radius: 8px; border: 1px solid #334155; font-family: monospace;'>
                        {$code}
                    </span>
                </div>
                <p style='font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 0;'>
                    This verification code is valid for <strong>15 minutes</strong>. If you did not request this code, please ignore this email or contact security immediately.
                </p>
            </div>
            <div style='background-color: #0f172a; padding: 16px 28px; text-align: center; border-top: 1px solid #334155;'>
                <p style='font-size: 12px; color: #475569; margin: 0;'>© " . date('Y') . " AMZDistributor. All rights reserved.</p>
            </div>
        </div>
    </div>
    ";
    $mail->AltBody = "Hello {$userName},\n\nYour AMZDistributor verification code is: {$code}\n\nValid for 15 minutes.\n\nAMZDistributor Security";
    $mail->send();

    echo json_encode([
        'success' => true,
        'previewCode' => $code,
        'preview_verification_code' => $code,
        'message' => 'A fresh verification code has been dispatched to your email via SMTP.'
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error resending code: ' . $e->getMessage()]);
}
?>
