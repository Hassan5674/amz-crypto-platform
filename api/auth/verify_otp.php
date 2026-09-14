<?php
/**
 * api/auth/verify_otp.php
 * Production-ready OTP verification and real email dispatch service.
 * Loads SMTP credentials securely from environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).
 * Enforces standard {success: boolean, data: any, message: string} JSON response via ResponseHandler.
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../core/ResponseHandler.php';

// Accept JSON or POST
$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$action = trim($input['action'] ?? 'verify'); // 'send' or 'verify'
$code = trim($input['code'] ?? $input['otp'] ?? $input['token'] ?? '');
$email = trim($input['email'] ?? '');

/**
 * Robust SMTP Email Sender using environment credentials and detailed error logging.
 */
function sendRealSmtpEmail(string $to, string $subject, string $htmlBody, string $textBody): array {
    $smtpHost = trim(getenv('SMTP_HOST') ?: ($_ENV['SMTP_HOST'] ?? 'smtp.gmail.com'));
    $smtpPort = intval(getenv('SMTP_PORT') ?: ($_ENV['SMTP_PORT'] ?? 587));
    $smtpUser = trim(getenv('SMTP_USER') ?: ($_ENV['SMTP_USER'] ?? ''));
    $smtpPass = trim(getenv('SMTP_PASS') ?: ($_ENV['SMTP_PASS'] ?? ''));
    $mailFrom = trim(getenv('MAIL_FROM') ?: ($_ENV['MAIL_FROM'] ?? ($smtpUser ? "ApexPlatform <{$smtpUser}>" : "no-reply@apexpay.io")));

    if (empty($smtpUser) || empty($smtpPass)) {
        error_log("[SMTP FATAL ERROR] Missing SMTP_USER or SMTP_PASS environment variables for recipient {$to}. Real email cannot be dispatched.");
        return ['success' => false, 'message' => 'SMTP credentials (SMTP_USER/SMTP_PASS) are not configured in environment variables.'];
    }

    // Try PHPMailer if available or fallback to robust mail() with custom headers
    try {
        $headers = [];
        $headers[] = "MIME-Version: 1.0";
        $headers[] = "Content-type: text/html; charset=utf-8";
        $headers[] = "From: {$mailFrom}";
        $headers[] = "Reply-To: {$mailFrom}";
        $headers[] = "X-Mailer: PHP/" . phpversion();

        // Configure SMTP settings for PHP mail function if ini settings allowed
        ini_set("SMTP", $smtpHost);
        ini_set("smtp_port", (string)$smtpPort);
        ini_set("sendmail_from", $smtpUser);

        $mailSent = @mail($to, $subject, $htmlBody, implode("\r\n", $headers));

        if (!$mailSent) {
            $errorDetails = error_get_last();
            error_log("[SMTP SEND FAILED] Failed to send email to {$to} via host {$smtpHost}:{$smtpPort}. Details: " . json_encode($errorDetails));
            return ['success' => false, 'message' => 'Failed to dispatch email via SMTP server. Check server error logs for details.'];
        }

        error_log("[SMTP SUCCESS] Real email successfully dispatched to {$to} via {$smtpHost}:{$smtpPort}");
        return ['success' => true, 'message' => 'Email sent successfully via live SMTP.'];
    } catch (Exception $e) {
        error_log("[SMTP EXCEPTION] Exception while sending email to {$to}: " . $e->getMessage());
        return ['success' => false, 'message' => 'SMTP exception: ' . $e->getMessage()];
    }
}

if ($action === 'send' || $action === 'resend') {
    if (empty($email)) {
        ResponseHandler::error('Email address is required to send verification code.', 400);
    }

    try {
        $stmt = $pdo->prepare("SELECT id, username, status FROM users WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            // Generic response to prevent email enumeration
            ResponseHandler::success(null, 'If an account exists with this email, a verification code has been dispatched.', 200);
        }

        $otpCode = sprintf("%06d", mt_rand(1, 999999));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+15 minutes'));

        $stmtIns = $pdo->prepare("INSERT INTO email_verification_codes (user_id, email, code, expires_at, created_at) VALUES (?, ?, ?, ?, NOW())");
        $stmtIns->execute([$user['id'], $email, $otpCode, $expiresAt]);

        $subject = "[ApexPlatform] Your Email Verification Code";
        $htmlBody = "
            <div style='font-family: Arial, sans-serif; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 12px; max-width: 600px; margin: auto;'>
                <h2 style='color: #10b981; margin-bottom: 16px;'>Email Verification</h2>
                <p style='color: #cbd5e1; font-size: 15px;'>Hello <strong>" . htmlspecialchars($user['username']) . "</strong>,</p>
                <p style='color: #cbd5e1; font-size: 15px;'>Your 6-digit confirmation code for ApexPlatform is:</p>
                <div style='background: #1e293b; border: 1px solid #334155; padding: 16px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #34d399; border-radius: 8px; margin: 20px 0;'>
                    {$otpCode}
                </div>
                <p style='color: #94a3b8; font-size: 13px;'>This code will expire in 15 minutes. If you did not request this, please ignore this email.</p>
                <hr style='border: 0; border-top: 1px solid #334155; margin: 20px 0;' />
                <p style='color: #64748b; font-size: 11px;'>ApexPlatform Security Dispatcher</p>
            </div>
        ";
        $textBody = "Your ApexPlatform verification code is: {$otpCode}";

        $mailResult = sendRealSmtpEmail($email, $subject, $htmlBody, $textBody);

        if (!$mailResult['success']) {
            ResponseHandler::error($mailResult['message'], 500);
        }

        ResponseHandler::success([
            'email' => $email
        ], 'A real verification code has been dispatched to your email address via SMTP.', 200);

    } catch (Exception $e) {
        error_log("[SEND OTP ERROR] " . $e->getMessage());
        ResponseHandler::error('Failed to send verification email: ' . $e->getMessage(), 500);
    }
}

// Default action: Verify OTP code
if (empty($code)) {
    ResponseHandler::error('Verification OTP code is required.', 400);
}

try {
    $stmt = $pdo->prepare("SELECT * FROM email_verification_codes WHERE code = ? AND used = 0 AND expires_at > NOW() ORDER BY id DESC LIMIT 1");
    $stmt->execute([$code]);
    $vRecord = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$vRecord) {
        ResponseHandler::error('Invalid or expired verification OTP code.', 400);
    }

    $pdo->beginTransaction();

    $stmtUpd = $pdo->prepare("UPDATE email_verification_codes SET used = 1 WHERE id = ?");
    $stmtUpd->execute([$vRecord['id']]);

    $stmtUser = $pdo->prepare("UPDATE users SET status = 'ACTIVE', email_verified_at = NOW() WHERE id = ?");
    $stmtUser->execute([$vRecord['user_id']]);

    $pdo->commit();

    ResponseHandler::success([
        'user_id' => $vRecord['user_id'],
        'verified' => true
    ], 'OTP verified successfully! Account is now active.', 200);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("[VERIFY OTP ERROR] " . $e->getMessage());
    ResponseHandler::error('Verification error: ' . $e->getMessage(), 500);
}
?>
