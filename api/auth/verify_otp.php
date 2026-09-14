<?php
/**
 * api/auth/verify_otp.php
 * Production-ready OTP verification and real SMTP email dispatch service.
 * Implements a robust native PHP SMTP socket client supporting AUTH LOGIN, TLS/SSL,
 * environment variable configuration (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS),
 * and standard {success: boolean, data: any, message: string} JSON response via ResponseHandler.
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../core/ResponseHandler.php';

// Accept JSON or POST
$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$action = trim($input['action'] ?? 'verify'); // 'send' or 'verify'
$code = trim($input['code'] ?? $input['otp'] ?? $input['token'] ?? '');
$email = trim($input['email'] ?? '');

/**
 * Send real email via direct SMTP socket connection with AUTH LOGIN support.
 */
function sendRealSmtpEmail(string $to, string $subject, string $htmlBody, string $textBody): array {
    $smtpHost = trim(getenv('SMTP_HOST') ?: ($_ENV['SMTP_HOST'] ?? 'smtp.hostinger.com'));
    $smtpPort = intval(getenv('SMTP_PORT') ?: ($_ENV['SMTP_PORT'] ?? 465));
    $smtpUser = trim(getenv('SMTP_USER') ?: ($_ENV['SMTP_USER'] ?? ''));
    $smtpPass = trim(getenv('SMTP_PASS') ?: ($_ENV['SMTP_PASS'] ?? ''));
    $mailFrom = trim(getenv('MAIL_FROM') ?: ($_ENV['MAIL_FROM'] ?? ($smtpUser ? "AMZDistributor Security <{$smtpUser}>" : "no-reply@amzdistributor.com")));

    if (empty($smtpUser) || empty($smtpPass)) {
        error_log("[SMTP FATAL ERROR] Missing SMTP_USER or SMTP_PASS environment variables for recipient {$to}.");
        return ['success' => false, 'message' => 'SMTP credentials (SMTP_USER/SMTP_PASS) are not configured.'];
    }

    $transportPrefix = ($smtpPort === 465) ? 'ssl://' : '';
    $remoteSocket = $transportPrefix . $smtpHost . ':' . $smtpPort;

    $socket = @stream_socket_client($remoteSocket, $errno, $errstr, 15, STREAM_CLIENT_CONNECT, stream_context_create([
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true
        ]
    ]));

    if (!$socket) {
        error_log("[SMTP CONNECTION ERROR] Failed to connect to {$remoteSocket}: {$errstr} ({$errno})");
        return ['success' => false, 'message' => "SMTP connection failed: {$errstr}"];
    }

    $getResponse = function($socket) {
        $data = '';
        while ($str = fgets($socket, 515)) {
            $data .= $str;
            if (substr($str, 3, 1) === ' ') {
                break;
            }
        }
        return $data;
    };

    $sendCmd = function($socket, $cmd) use ($getResponse) {
        fwrite($socket, $cmd . "\r\n");
        return $getResponse($socket);
    };

    try {
        // Read greeting
        $greeting = $getResponse($socket);
        if (substr($greeting, 0, 3) !== '220') {
            error_log("[SMTP ERROR] Invalid greeting: {$greeting}");
            @fclose($socket);
            return ['success' => false, 'message' => 'SMTP server rejected connection greeting.'];
        }

        // EHLO
        $serverName = $_SERVER['SERVER_NAME'] ?? 'localhost';
        $ehloResp = $sendCmd($socket, "EHLO " . $serverName);

        // STARTTLS if port 587
        if ($smtpPort === 587) {
            $tlsResp = $sendCmd($socket, "STARTTLS");
            if (substr($tlsResp, 0, 3) === '220') {
                @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
                $sendCmd($socket, "EHLO " . $serverName);
            }
        }

        // AUTH LOGIN
        $authResp = $sendCmd($socket, "AUTH LOGIN");
        if (substr($authResp, 0, 3) !== '334') {
            error_log("[SMTP AUTH ERROR] AUTH LOGIN rejected: {$authResp}");
            @fclose($socket);
            return ['success' => false, 'message' => 'SMTP authentication initiation failed.'];
        }

        $userResp = $sendCmd($socket, base64_encode($smtpUser));
        if (substr($userResp, 0, 3) !== '334') {
            error_log("[SMTP AUTH ERROR] Username rejected: {$userResp}");
            @fclose($socket);
            return ['success' => false, 'message' => 'SMTP username rejected.'];
        }

        $passResp = $sendCmd($socket, base64_encode($smtpPass));
        if (substr($passResp, 0, 3) !== '235') {
            error_log("[SMTP AUTH ERROR] Password rejected (Code " . substr($passResp, 0, 3) . "): {$passResp}");
            @fclose($socket);
            return ['success' => false, 'message' => 'SMTP authentication failed. Please check your SMTP password.'];
        }

        // MAIL FROM
        // Extract email from $mailFrom if formatted as Name <email>
        preg_match('/<([^>]+)>/', $mailFrom, $matches);
        $fromEmail = $matches[1] ?? $mailFrom;

        $fromResp = $sendCmd($socket, "MAIL FROM:<{$fromEmail}>");
        if (substr($fromResp, 0, 3) !== '250') {
            error_log("[SMTP ERROR] MAIL FROM rejected: {$fromResp}");
            @fclose($socket);
            return ['success' => false, 'message' => 'SMTP MAIL FROM rejected.'];
        }

        // RCPT TO
        $rcptResp = $sendCmd($socket, "RCPT TO:<{$to}>");
        if (substr($rcptResp, 0, 3) !== '250') {
            error_log("[SMTP ERROR] RCPT TO rejected: {$rcptResp}");
            @fclose($socket);
            return ['success' => false, 'message' => 'SMTP recipient rejected.'];
        }

        // DATA
        $dataResp = $sendCmd($socket, "DATA");
        if (substr($dataResp, 0, 3) !== '354') {
            error_log("[SMTP ERROR] DATA command rejected: {$dataResp}");
            @fclose($socket);
            return ['success' => false, 'message' => 'SMTP DATA command rejected.'];
        }

        // Build email message headers & body
        $boundary = "----=_Part_" . md5(uniqid((string)time(), true));
        $emailHeaders = "From: {$mailFrom}\r\n";
        $emailHeaders .= "To: <{$to}>\r\n";
        $emailHeaders .= "Subject: {$subject}\r\n";
        $emailHeaders .= "MIME-Version: 1.0\r\n";
        $emailHeaders .= "Content-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n";
        $emailHeaders .= "X-Mailer: AMZDistributor Mailer\r\n\r\n";

        $emailBody = "--{$boundary}\r\n";
        $emailBody .= "Content-Type: text/plain; charset=utf-8\r\n";
        $emailBody .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
        $emailBody .= $textBody . "\r\n\r\n";

        $emailBody .= "--{$boundary}\r\n";
        $emailBody .= "Content-Type: text/html; charset=utf-8\r\n";
        $emailBody .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
        $emailBody .= $htmlBody . "\r\n\r\n";
        $emailBody .= "--{$boundary}--\r\n";

        $sendResp = $sendCmd($socket, $emailHeaders . $emailBody . "\r\n.");
        if (substr($sendResp, 0, 3) !== '250') {
            error_log("[SMTP ERROR] Email transmission rejected: {$sendResp}");
            @fclose($socket);
            return ['success' => false, 'message' => 'SMTP server rejected email transmission.'];
        }

        // QUIT
        $sendCmd($socket, "QUIT");
        @fclose($socket);

        error_log("[SMTP SUCCESS] Real verification email successfully delivered to {$to} via {$smtpHost}:{$smtpPort}");
        return ['success' => true, 'message' => 'Email sent successfully via live SMTP.'];

    } catch (Exception $e) {
        error_log("[SMTP EXCEPTION] " . $e->getMessage());
        if ($socket) {
            @fclose($socket);
        }
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
            ResponseHandler::success(null, 'If an account exists with this email, a verification code has been dispatched.', 200);
        }

        $otpCode = sprintf("%06d", mt_rand(1, 999999));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+15 minutes'));

        $stmtIns = $pdo->prepare("INSERT INTO email_verification_codes (user_id, email, code, expires_at, created_at) VALUES (?, ?, ?, ?, NOW())");
        $stmtIns->execute([$user['id'], $email, $otpCode, $expiresAt]);

        $subject = "[AMZDistributor] Your Email Verification Code: {$otpCode}";
        $htmlBody = "
            <div style='font-family: Arial, sans-serif; padding: 28px; background: #0f172a; color: #f8fafc; border-radius: 12px; max-width: 600px; margin: auto;'>
                <h2 style='color: #10b981; margin-bottom: 16px;'>Account Verification</h2>
                <p style='color: #cbd5e1; font-size: 15px;'>Hello <strong>" . htmlspecialchars($user['username']) . "</strong>,</p>
                <p style='color: #cbd5e1; font-size: 15px;'>Your 6-digit email confirmation code for AMZDistributor is:</p>
                <div style='background: #1e293b; border: 1px solid #334155; padding: 18px; text-align: center; font-size: 34px; font-weight: bold; letter-spacing: 6px; color: #34d399; border-radius: 8px; margin: 24px 0;'>
                    {$otpCode}
                </div>
                <p style='color: #94a3b8; font-size: 13px;'>This code will expire in 15 minutes. If you did not request this, please ignore this email.</p>
                <hr style='border: 0; border-top: 1px solid #334155; margin: 20px 0;' />
                <p style='color: #64748b; font-size: 11px;'>AMZDistributor Security Dispatcher</p>
            </div>
        ";
        $textBody = "Your AMZDistributor verification code is: {$otpCode}";

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
