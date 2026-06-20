<?php
/**
 * Special Fare B2B - PHP Email Mailer Endpoint
 * Provides a reliable server-side failover for client-side SMTPJS requests,
 * bypassing browser CORS policies, ad-blockers, and Cloudflare WAF checks.
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

// Setup email headers for HTML content
$headers = "MIME-Version: 1.0" . "\r\n";
$headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
$headers .= "From: " . $fromName . " <" . $fromEmail . ">" . "\r\n";
$headers .= "Reply-To: " . $fromEmail . "\r\n";
$headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";

// Attempt to deliver using PHP built-in mailer
if (mail($to, $subject, $body, $headers)) {
    echo json_encode([
        "success" => true,
        "message" => "Email delivered successfully via PHP mailer"
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "PHP mail() function returned false. Check hosting mail logs or SMTP configuration."
    ]);
}
