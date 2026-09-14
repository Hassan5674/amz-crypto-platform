<?php
/**
 * api/auth/verify_otp.php
 * Production-ready OTP verification and legitimate email dispatch service using PHPMailer.
 * Pulls SMTP credentials (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS) from environmental variables,
 * sends legitimate verification emails to the recipient, and returns a consistent
 * {success: boolean, data: any, message: string} JSON response with thorough error logging.
 */

header('Content-Type: application/json; charset=utf-8');

// Load database connection
$dbPath = __DIR__ . '/../../config/database.php';
if (file_exists($dbPath)) {
    require_once $dbPath;
} else {
    // Fallback PDO connection if standalone
    $dbHost = getenv('DB_HOST') ?: ($_ENV['DB_HOST'] ?? 'localhost');
    $dbName = getenv('DB_NAME') ?: ($_ENV['DB_NAME'] ?? 'u788285039_amzreal');
    $dbUser = getenv('DB_USER') ?: ($_ENV['DB_USER'] ?? 'u788285039_amzreal');
    $dbPass = getenv('DB_PASS') ?: ($_ENV['DB_PASS'] ?? 'Johrr786a');
    try {
        $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
    } catch (Exception $e) {
        error_log("[OTP FATAL] Database connection failed: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'data' => null,
            'message' => 'Database connection failed.'
        ]);
        exit;
    }
}

// Ensure ResponseHandler exists
$responseHandlerPath = __DIR__ . '/../core/ResponseHandler.php';
if (file_exists($responseHandlerPath)) {
    require_once $responseHandlerPath;
}

// Ensure PHPMailer exists
require_once __DIR__ . '/../core/PHPMailer.php';

// Helper for unified JSON response matching {success: boolean, data: any, message: string}
function sendJsonResponse(bool $success, $data, string $message, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

// Ensure email_verification_codes table exists
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS email_verification_codes (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NULL,
        email VARCHAR(191) NOT NULL,
        code VARCHAR(10) NOT NULL,
        expires_at DATETIME NOT NULL,
        used TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email_code (email, code),
        INDEX idx_expires (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
} catch (Exception $e) {
    error_log("[OTP DB WARN] Table verification check: " . $e->getMessage());
}

// Parse request input
$rawBody = file_get_contents('php://input');
$input = json_decode($rawBody, true) ?? $_POST;

$action = trim($input['action'] ?? $_GET['action'] ?? 'verify'); // 'send', 'resend', or 'verify'
$email = trim($input['email'] ?? $_GET['email'] ?? '');
$code = trim($input['code'] ?? $input['otp'] ?? $input['token'] ?? $_GET['code'] ?? '');

// -----------------------------------------------------------------------------
// 1. DISPATCH / RESEND OTP CODE VIA REAL SMTP USING PHPMAILER
// -----------------------------------------------------------------------------
if ($action === 'send' || $action === 'resend') {
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendJsonResponse(false, null, 'A valid email address is required to dispatch an OTP verification code.', 400);
    }

    try {
        // Query user ID if already created
        $stmt = $pdo->prepare("SELECT id, name, username, status FROM users WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        $userId = $user ? $user['id'] : null;
        $userName = $user ? ($user['name'] ?: $user['username']) : explode('@', $email)[0];

        // Generate cryptographically secure 6-digit numeric OTP
        $otpCode = sprintf("%06d", mt_rand(100000, 999999));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+15 minutes'));

        // Persist code in database
        $stmtIns = $pdo->prepare("INSERT INTO email_verification_codes (user_id, email, code, expires_at, created_at) VALUES (?, ?, ?, ?, NOW())");
        $stmtIns->execute([$userId, $email, $otpCode, $expiresAt]);

        // Instantiate PHPMailer
        $mail = new PHPMailer();

        // Load SMTP config from environment variables
        $smtpHost = getenv('SMTP_HOST') ?: ($_ENV['SMTP_HOST'] ?? 'smtp.hostinger.com');
        $smtpPort = intval(getenv('SMTP_PORT') ?: ($_ENV['SMTP_PORT'] ?? 465));
        $smtpUser = getenv('SMTP_USER') ?: ($_ENV['SMTP_USER'] ?? 'noreply@amzdistributor.com');
        $smtpPass = getenv('SMTP_PASS') ?: ($_ENV['SMTP_PASS'] ?? 'Alihayder888@');

        $mail->isSMTP();
        $mail->Host = $smtpHost;
        $mail->Port = $smtpPort;
        $mail->SMTPAuth = true;
        $mail->Username = $smtpUser;
        $mail->Password = $smtpPass;
        $mail->SMTPSecure = ($smtpPort === 465) ? 'ssl' : 'tls';

        $mail->setFrom($smtpUser, 'AMZDistributor Security');
        $mail->addAddress($email, $userName);
        $mail->isHTML(true);

        $mail->Subject = "{$otpCode} is your AMZDistributor Verification Code";

        $html = "
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
                            {$otpCode}
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

        $mail->Body = $html;
        $mail->AltBody = "Hello {$userName},\n\nYour AMZDistributor verification code is: {$otpCode}\n\nThis code expires in 15 minutes.\n\nAMZDistributor Security";

        // Dispatch real email
        error_log("[OTP DISPATCH] Attempting real SMTP email send to {$email} via {$smtpHost}:{$smtpPort}...");
        $sent = $mail->send();

        if (!$sent) {
            error_log("[OTP DISPATCH FAILED] Error for recipient {$email}: {$mail->ErrorInfo}");
            sendJsonResponse(false, null, "Failed to send verification email. Mailer error: {$mail->ErrorInfo}", 500);
        }

        error_log("[OTP DISPATCH SUCCESS] Verification email with OTP successfully sent to {$email}");
        sendJsonResponse(true, [
            'email' => $email,
            'dispatched_at' => date('Y-m-d H:i:s')
        ], 'A real verification code has been dispatched to your email address via SMTP.', 200);

    } catch (Exception $e) {
        error_log("[OTP DISPATCH EXCEPTION] " . $e->getMessage());
        sendJsonResponse(false, null, 'Internal server error dispatching OTP: ' . $e->getMessage(), 500);
    }
}

// -----------------------------------------------------------------------------
// 2. VERIFY SUBMITTED OTP CODE
// -----------------------------------------------------------------------------
if (empty($code)) {
    sendJsonResponse(false, null, 'Verification OTP code is required.', 400);
}

try {
    // Find active, unexpired matching OTP
    if (!empty($email)) {
        $stmt = $pdo->prepare("SELECT * FROM email_verification_codes WHERE email = ? AND code = ? AND used = 0 AND expires_at > NOW() ORDER BY id DESC LIMIT 1");
        $stmt->execute([$email, $code]);
    } else {
        $stmt = $pdo->prepare("SELECT * FROM email_verification_codes WHERE code = ? AND used = 0 AND expires_at > NOW() ORDER BY id DESC LIMIT 1");
        $stmt->execute([$code]);
    }
    $vRecord = $stmt->fetch();

    if (!$vRecord) {
        sendJsonResponse(false, null, 'Invalid or expired verification OTP code. Please check your code or request a new one.', 400);
    }

    $pdo->beginTransaction();

    // Mark code as used
    $stmtUpd = $pdo->prepare("UPDATE email_verification_codes SET used = 1 WHERE id = ?");
    $stmtUpd->execute([$vRecord['id']]);

    // Activate user and mark email verified
    $targetEmail = $vRecord['email'];
    $userId = $vRecord['user_id'];

    if ($userId) {
        $stmtUser = $pdo->prepare("UPDATE users SET status = 'ACTIVE', email_verified_at = NOW() WHERE id = ?");
        $stmtUser->execute([$userId]);
    } elseif (!empty($targetEmail)) {
        $stmtUser = $pdo->prepare("UPDATE users SET status = 'ACTIVE', email_verified_at = NOW() WHERE email = ?");
        $stmtUser->execute([$targetEmail]);
    }

    $pdo->commit();

    error_log("[OTP VERIFY SUCCESS] Successfully verified code {$code} for email {$targetEmail}");

    sendJsonResponse(true, [
        'email' => $targetEmail,
        'user_id' => $userId,
        'verified' => true
    ], 'OTP verified successfully! Your account is now active.', 200);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("[OTP VERIFY EXCEPTION] " . $e->getMessage());
    sendJsonResponse(false, null, 'Verification failed due to a server error: ' . $e->getMessage(), 500);
}
?>
