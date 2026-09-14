<?php
/**
 * hostinger_upload/api/core/PHPMailer.php
 * Standalone, zero-dependency PHPMailer implementation tailored for Hostinger Shared Hosting.
 * Supports:
 * - Direct SMTP over SSL (Port 465)
 * - Direct SMTP over TLS / STARTTLS (Port 587)
 * - Automatic fallback to PHP mail() with envelope sender if outbound socket blocked
 * - Environment variable loader (.env)
 * - Robust error logging
 */

class PHPMailer {
    public string $Host = 'smtp.hostinger.com';
    public int $Port = 465;
    public bool $SMTPAuth = true;
    public string $Username = 'noreply@amzdistributor.com';
    public string $Password = 'Alihayder888@';
    public string $SMTPSecure = 'ssl'; // 'ssl' or 'tls'
    public int $Timeout = 10;

    public string $From = 'noreply@amzdistributor.com';
    public string $FromName = 'AMZDistributor Security';
    public array $to = [];
    public string $Subject = '';
    public string $Body = '';
    public string $AltBody = '';
    public bool $isHTML = true;
    public string $ErrorInfo = '';

    public function __construct() {
        $this->loadEnv();
    }

    /**
     * Parse and load environment variables from .env file if available
     */
    private function loadEnv(): void {
        $paths = [
            __DIR__ . '/../../.env',
            __DIR__ . '/../.env',
            ($_SERVER['DOCUMENT_ROOT'] ?? '') . '/.env'
        ];

        foreach ($paths as $path) {
            if ($path && file_exists($path)) {
                $lines = @file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                if ($lines) {
                    foreach ($lines as $line) {
                        $line = trim($line);
                        if (empty($line) || $line[0] === '#') continue;
                        if (strpos($line, '=') !== false) {
                            [$k, $v] = explode('=', $line, 2);
                            $k = trim($k);
                            $v = trim($v, " \t\n\r\0\x0B\"'");
                            if (!empty($k)) {
                                if (getenv($k) === false) putenv("{$k}={$v}");
                                if (!isset($_ENV[$k])) $_ENV[$k] = $v;
                            }
                        }
                    }
                }
                break;
            }
        }

        $envHost = getenv('SMTP_HOST') ?: ($_ENV['SMTP_HOST'] ?? '');
        $envPort = getenv('SMTP_PORT') ?: ($_ENV['SMTP_PORT'] ?? '');
        $envUser = getenv('SMTP_USER') ?: ($_ENV['SMTP_USER'] ?? '');
        $envPass = getenv('SMTP_PASS') ?: ($_ENV['SMTP_PASS'] ?? '');
        $envFrom = getenv('MAIL_FROM') ?: ($_ENV['MAIL_FROM'] ?? '');

        if (!empty($envHost)) $this->Host = $envHost;
        if (!empty($envPort)) $this->Port = intval($envPort);
        if (!empty($envUser)) $this->Username = $envUser;
        if (!empty($envPass)) $this->Password = $envPass;
        if (!empty($envFrom)) {
            if (preg_match('/^(.*?)\s*<(.+?)>$/', $envFrom, $m)) {
                $this->FromName = trim($m[1], " \t\n\r\0\x0B\"'");
                $this->From = trim($m[2]);
            } else {
                $this->From = $envFrom;
            }
        } elseif (!empty($this->Username)) {
            $this->From = $this->Username;
        }

        $this->SMTPSecure = ($this->Port === 465) ? 'ssl' : 'tls';
    }

    public function isSMTP(): void {
        // Mode indicator
    }

    public function isHTML(bool $isHtml = true): void {
        $this->isHTML = $isHtml;
    }

    public function setFrom(string $address, string $name = ''): void {
        $this->From = $address;
        if (!empty($name)) $this->FromName = $name;
    }

    public function addAddress(string $address, string $name = ''): void {
        $this->to[] = ['address' => $address, 'name' => $name];
    }

    /**
     * Dispatches the email. Tries authenticated SMTP socket first;
     * falls back to PHP mail() with Hostinger envelope sender if socket blocked.
     */
    public function send(): bool {
        if (empty($this->to)) {
            $this->ErrorInfo = 'No recipient address provided.';
            error_log("[PHPMailer ERROR] {$this->ErrorInfo}");
            return false;
        }

        $recipient = $this->to[0]['address'];

        // Attempt 1: Direct authenticated SMTP Socket
        $smtpResult = $this->sendViaSmtpSocket($recipient);
        if ($smtpResult) {
            error_log("[PHPMailer SUCCESS] Email delivered via direct SMTP ({$this->Host}:{$this->Port}) to {$recipient}");
            return true;
        }

        error_log("[PHPMailer NOTICE] Direct SMTP failed ({$this->ErrorInfo}). Attempting fallback to native Hostinger mail()...");

        // Attempt 2: Fallback to PHP native mail()
        $nativeResult = $this->sendViaNativeMail($recipient);
        if ($nativeResult) {
            error_log("[PHPMailer SUCCESS] Email dispatched via Hostinger native mail() to {$recipient}");
            return true;
        }

        error_log("[PHPMailer CRITICAL] All email delivery attempts failed for {$recipient}. Reason: {$this->ErrorInfo}");
        return false;
    }

    private function sendViaSmtpSocket(string $to): bool {
        $hostPrefix = ($this->Port === 465) ? 'ssl://' : '';
        $socketTarget = $hostPrefix . $this->Host . ':' . $this->Port;

        $ctx = stream_context_create([
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            ]
        ]);

        $socket = @stream_socket_client($socketTarget, $errno, $errstr, $this->Timeout, STREAM_CLIENT_CONNECT, $ctx);
        if (!$socket) {
            $this->ErrorInfo = "SMTP connect to {$socketTarget} failed: {$errstr} ({$errno})";
            return false;
        }

        stream_set_timeout($socket, $this->Timeout);

        $read = function() use ($socket) {
            $data = '';
            while ($str = fgets($socket, 515)) {
                $data .= $str;
                if (substr($str, 3, 1) === ' ') break;
            }
            return $data;
        };

        $cmd = function(string $c) use ($socket, $read) {
            fwrite($socket, $c . "\r\n");
            return $read();
        };

        try {
            $greeting = $read();
            if (substr($greeting, 0, 3) !== '220') {
                $this->ErrorInfo = "Invalid SMTP greeting: {$greeting}";
                @fclose($socket);
                return false;
            }

            $serverDomain = $_SERVER['SERVER_NAME'] ?? 'amzdistributor.com';
            $cmd("EHLO {$serverDomain}");

            if ($this->Port === 587) {
                $tls = $cmd("STARTTLS");
                if (substr($tls, 0, 3) === '220') {
                    @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
                    $cmd("EHLO {$serverDomain}");
                }
            }

            $auth = $cmd("AUTH LOGIN");
            if (substr($auth, 0, 3) !== '334') {
                $this->ErrorInfo = "AUTH LOGIN refused: {$auth}";
                @fclose($socket);
                return false;
            }

            $uResp = $cmd(base64_encode($this->Username));
            if (substr($uResp, 0, 3) !== '334') {
                $this->ErrorInfo = "Username rejected: {$uResp}";
                @fclose($socket);
                return false;
            }

            $pResp = $cmd(base64_encode($this->Password));
            if (substr($pResp, 0, 3) !== '235') {
                $this->ErrorInfo = "Password rejected: {$pResp}";
                @fclose($socket);
                return false;
            }

            $mailFromResp = $cmd("MAIL FROM:<{$this->From}>");
            if (substr($mailFromResp, 0, 3) !== '250') {
                $this->ErrorInfo = "MAIL FROM rejected: {$mailFromResp}";
                @fclose($socket);
                return false;
            }

            $rcptResp = $cmd("RCPT TO:<{$to}>");
            if (substr($rcptResp, 0, 3) !== '250') {
                $this->ErrorInfo = "RCPT TO rejected: {$rcptResp}";
                @fclose($socket);
                return false;
            }

            $dataResp = $cmd("DATA");
            if (substr($dataResp, 0, 3) !== '354') {
                $this->ErrorInfo = "DATA rejected: {$dataResp}";
                @fclose($socket);
                return false;
            }

            $boundary = "==_MIME_Boundary_" . md5(uniqid((string)time(), true));
            $fromHeader = !empty($this->FromName) ? "=\"{$this->FromName}\" <{$this->From}>" : "<{$this->From}>";
            
            $msg = "From: {$fromHeader}\r\n";
            $msg .= "To: <{$to}>\r\n";
            $msg .= "Subject: {$this->Subject}\r\n";
            $msg .= "Date: " . date('r') . "\r\n";
            $msg .= "MIME-Version: 1.0\r\n";
            $msg .= "Content-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n";
            $msg .= "X-Mailer: AMZDistributor Mailer\r\n\r\n";

            if (!empty($this->AltBody)) {
                $msg .= "--{$boundary}\r\n";
                $msg .= "Content-Type: text/plain; charset=utf-8\r\n";
                $msg .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
                $msg .= $this->AltBody . "\r\n\r\n";
            }

            $msg .= "--{$boundary}\r\n";
            $msg .= "Content-Type: text/html; charset=utf-8\r\n";
            $msg .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
            $msg .= $this->Body . "\r\n\r\n";
            $msg .= "--{$boundary}--\r\n";

            $sendResp = $cmd($msg . "\r\n.");
            if (substr($sendResp, 0, 3) !== '250') {
                $this->ErrorInfo = "SMTP end of data rejected: {$sendResp}";
                @fclose($socket);
                return false;
            }

            $cmd("QUIT");
            @fclose($socket);
            return true;

        } catch (\Exception $e) {
            $this->ErrorInfo = "SMTP socket exception: " . $e->getMessage();
            if ($socket) @fclose($socket);
            return false;
        }
    }

    private function sendViaNativeMail(string $to): bool {
        $fromHeader = !empty($this->FromName) ? "=\"{$this->FromName}\" <{$this->From}>" : "<{$this->From}>";
        $headers = [];
        $headers[] = "From: {$fromHeader}";
        $headers[] = "Reply-To: {$this->From}";
        $headers[] = "MIME-Version: 1.0";
        $headers[] = "Content-Type: text/html; charset=utf-8";
        $headers[] = "X-Mailer: PHP/" . phpversion();

        $additionalParams = "-f" . $this->From;

        $sent = @mail($to, $this->Subject, $this->Body, implode("\r\n", $headers), $additionalParams);
        if (!$sent) {
            $lastErr = error_get_last();
            $this->ErrorInfo = "PHP mail() returned false: " . json_encode($lastErr);
            return false;
        }
        return true;
    }
}
?>
