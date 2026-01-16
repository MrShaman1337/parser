<?php
declare(strict_types=1);
require_once __DIR__ . "/../../../server/helpers.php";

start_session();

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    json_response(["csrf_token" => csrf_token()]);
}

rate_limit("login", 5, 60);
validate_csrf(read_input()["csrf_token"] ?? null);

$data = read_input();
$username = sanitize_text($data["username"] ?? "");
$password = $data["password"] ?? "";

$config = config();
if (empty($config["password_hash"])) {
    json_response(["error" => "Admin password not configured"], 500);
}
if ($username !== $config["username"] || !password_verify($password, $config["password_hash"])) {
    json_response(["error" => "Invalid credentials"], 401);
}

$_SESSION["admin_logged_in"] = true;
$_SESSION["admin_user"] = $username;
json_response(["ok" => true]);
