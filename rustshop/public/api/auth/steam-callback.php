<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

start_session();
rate_limit("steam_callback", 10, 60);

$redirectBase = "/account";
$redirectWithError = function (string $message): void use ($redirectBase) {
    error_log("steam_callback: " . $message);
    $target = $redirectBase . "?auth_error=" . urlencode($message);
    header("Location: " . $target);
    exit;
};

if (($_GET["openid_mode"] ?? "") === "cancel") {
    header("Location: " . $redirectBase);
    exit;
}

$openidParams = [];
foreach ($_GET as $key => $value) {
    if (strpos($key, "openid_") === 0) {
        $suffix = substr($key, 7);
        $openidParams["openid." . $suffix] = $value;
    }
}

if (empty($openidParams["openid.sig"])) {
    $redirectWithError("Invalid OpenID response");
}

$openidParams["openid.mode"] = "check_authentication";
$payload = http_build_query($openidParams);
$context = stream_context_create([
    "http" => [
        "method" => "POST",
        "header" => "Content-Type: application/x-www-form-urlencoded",
        "content" => $payload,
        "timeout" => 5
    ]
]);
$raw = @file_get_contents(steam_openid_endpoint(), false, $context);
if ($raw === false || strpos($raw, "is_valid:true") === false) {
    $redirectWithError("OpenID validation failed");
}

$claimed = $_GET["openid_claimed_id"] ?? "";
if (!preg_match("#^https?://steamcommunity\\.com/openid/id/(\\d+)$#", $claimed, $matches)) {
    $redirectWithError("Invalid Steam ID");
}
$steamId = $matches[1];

$existing = get_user_by_steam_id($steamId);
if ($existing && !empty($existing["is_banned"])) {
    $redirectWithError("User is banned");
}

try {
    $profile = fetch_steam_profile($steamId);
} catch (Throwable $e) {
    $redirectWithError($e->getMessage());
}

$user = upsert_user($steamId, $profile);
user_login($user);

header("Location: " . $redirectBase);
exit;
