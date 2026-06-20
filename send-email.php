<?php
/**
 * Special Fare B2B - PHP Email Mailer Endpoint
 * Provides a reliable server-side failover for client-side SMTPJS requests,
 * bypassing browser CORS policies, ad-blockers, and Cloudflare WAF checks.
 * Uses native PHP sockets to communicate directly with SMTP server, falling back to mail().
 */

// Allow CORS for local debugging if needed, but restrict in production
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Read raw JSON input
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

if (!$input || !isset($input['to']) || !isset($input['subject']) || !isset($input['body'])) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => "Invalid payload or missing required fields (to, subject, body)"
    ]);
    exit;
}

$to = filter_var($input['to'], FILTER_VALIDATE_EMAIL);
if (!$to) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => "Invalid recipient email address"
    ]);
    exit;
}

$subject = $input['subject'];
$body = $input['body'];

// Default sender details if not provided
$fromEmail = isset($input['fromEmail']) ? filter_var($input['fromEmail'], FILTER_SANITIZE_EMAIL) : 'info@specialfare.in';
$fromName = isset($input['fromName']) ? htmlspecialchars($input['fromName']) : 'Special Fare';

$smtpError = null;
$smtpSuccess = false;

// Attempt to deliver using custom SMTP credentials via PHP sockets if provided
if (isset($input['smtp']) && is_array($input['smtp'])) {
    try {
        $smtp = $input['smtp'];
        $host = $smtp['host'] ?? 'smtp.hostinger.com';
        $port = intval($smtp['port'] ?? 465);
        $username = $smtp['username'] ?? '';
        $password = $smtp['password'] ?? '';
        $secure = strtolower($smtp['secure'] ?? 'ssl');

        if (empty($username) || empty($password)) {
            throw new Exception("SMTP username or password missing in payload.");
        }

        // Determine connection prefix
        $connection_prefix = "";
        if ($secure === 'ssl' || $port === 465) {
            $connection_prefix = "ssl://";
        }

        $socket = @fsockopen($connection_prefix . $host, $port, $errno, $errstr, 15);
        if (!$socket) {
            throw new Exception("Failed to connect to SMTP server: $errstr ($errno)");
        }

        // Helper to read SMTP response
        $read_response = function($socket, $expected) {
            $response = "";
            while ($str = fgets($socket, 515)) {
                $response .= $str;
                if (substr($str, 3, 1) === " ") {
                    break;
                }
            }
            $code = intval(substr($response, 0, 3));
            if ($code !== $expected) {
                throw new Exception("SMTP Protocol Error: Expected $expected, got response: $response");
            }
            return $response;
        };

        $read_response($socket, 220);

        fwrite($socket, "EHLO " . ($_SERVER['SERVER_NAME'] ?? 'localhost') . "\r\n");
        $read_response($socket, 250);

        if ($secure === 'tls' || $port === 587) {
            fwrite($socket, "STARTTLS\r\n");
            $read_response($socket, 220);
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new Exception("Failed to start secure TLS encryption on socket.");
            }
            // Send EHLO again after TLS negotiation
            fwrite($socket, "EHLO " . ($_SERVER['SERVER_NAME'] ?? 'localhost') . "\r\n");
            $read_response($socket, 250);
        }

        fwrite($socket, "AUTH LOGIN\r\n");
        $read_response($socket, 334);

        fwrite($socket, base64_encode($username) . "\r\n");
        $read_response($socket, 334);

        fwrite($socket, base64_encode($password) . "\r\n");
        $read_response($socket, 235);

        fwrite($socket, "MAIL FROM:<" . $username . ">\r\n");
        $read_response($socket, 250);

        fwrite($socket, "RCPT TO:<" . $to . ">\r\n");
        $read_response($socket, 250);

        fwrite($socket, "DATA\r\n");
        $read_response($socket, 354);

        // Format headers and body for SMTP delivery
        $headersStr = "MIME-Version: 1.0\r\n";
        $headersStr .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headersStr .= "From: " . $fromName . " <" . $username . ">\r\n";
        $headersStr .= "To: <" . $to . ">\r\n";
        $headersStr .= "Subject: " . $subject . "\r\n";
        $headersStr .= "Date: " . date('r') . "\r\n";
        $headersStr .= "Message-ID: <" . time() . "-" . uniqid() . "@" . $host . ">\r\n";

        // Prevent double dots escaping issue in SMTP DATA
        $prepared_body = str_replace("\r\n.", "\r\n..", $body);

        fwrite($socket, $headersStr . "\r\n" . $prepared_body . "\r\n.\r\n");
        $read_response($socket, 250);

        fwrite($socket, "QUIT\r\n");
        fclose($socket);

        $smtpSuccess = true;
    } catch (Exception $e) {
        $smtpError = $e->getMessage();
    }
}

if ($smtpSuccess) {
    echo json_encode([
        "success" => true,
        "method" => "smtp",
        "message" => "Email delivered successfully via SMTP socket."
    ]);
    exit;
}

// Fallback to PHP built-in mail() function
$headers = "MIME-Version: 1.0" . "\r\n";
$headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
$headers .= "From: " . $fromName . " <" . $fromEmail . ">" . "\r\n";
$headers .= "Reply-To: " . $fromEmail . "\r\n";
$headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";

if (mail($to, $subject, $body, $headers)) {
    echo json_encode([
        "success" => true,
        "method" => "mail_fallback",
        "message" => "Email delivered successfully via PHP mail() fallback.",
        "smtp_error" => $smtpError
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Both SMTP socket delivery and PHP mail() fallback failed.",
        "smtp_error" => $smtpError
    ]);
}
