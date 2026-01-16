<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

start_session();
rate_limit("steam_login", 10, 60);

$realm = base_url();
$returnTo = $realm . "/api/auth/steam-callback.php";
$params = [
    "openid.ns" => "http://specs.openid.net/auth/2.0",
    "openid.mode" => "checkid_setup",
    "openid.return_to" => $returnTo,
    "openid.realm" => $realm,
    "openid.identity" => "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id" => "http://specs.openid.net/auth/2.0/identifier_select"
];

$loginUrl = steam_openid_endpoint() . "?" . http_build_query($params);
header("Location: " . $loginUrl);
exit;
