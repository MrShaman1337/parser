<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    json_response(["error" => "Method not allowed"], 405);
}

rate_limit("support_send", 5, 60);

$data = read_input();
$name = sanitize_text($data["name"] ?? "");
$email = sanitize_text($data["email"] ?? "");
$orderId = sanitize_text($data["orderId"] ?? "");
$message = sanitize_text($data["message"] ?? "");
$lang = sanitize_text($data["lang"] ?? "en");

if ($message === "") {
    json_response(["error" => "Message is required"], 400);
}
if ($email !== "" && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(["error" => "Invalid email"], 400);
}

$env = env_config();
$token = trim((string)($env["TELEGRAM_BOT_TOKEN"] ?? ""));
$chatId = trim((string)($env["TELEGRAM_CHAT_ID"] ?? ""));
if ($token === "" || $chatId === "") {
    json_response(["error" => "Telegram is not configured"], 500);
}

$text = "GO RUST Support\n";
$text .= "Lang: " . ($lang === "ru" ? "RU" : "EN") . "\n";
$text .= "Name: " . ($name ?: "-") . "\n";
$text .= "Email: " . ($email ?: "-") . "\n";
$text .= "Order ID: " . ($orderId ?: "-") . "\n";
$text .= "Message:\n" . $message;

$payload = http_build_query([
    "chat_id" => $chatId,
    "text" => $text,
    "disable_web_page_preview" => 1
]);

$context = stream_context_create([
    "http" => [
        "method" => "POST",
        "header" => "Content-Type: application/x-www-form-urlencoded",
        "content" => $payload,
        "timeout" => 6
    ]
]);
$url = "https://api.telegram.org/bot" . urlencode($token) . "/sendMessage";
$result = @file_get_contents($url, false, $context);
if ($result === false) {
    json_response(["error" => "Failed to send message"], 502);
}

json_response(["ok" => true]);
