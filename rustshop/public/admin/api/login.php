<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

start_session();

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    json_response(["csrf_token" => csrf_token()]);
}

ensure_auth_db();
rate_limit("admin_login", 5, 60);
validate_csrf(read_input()["csrf_token"] ?? null);

$data = read_input();
$username = sanitize_text($data["username"] ?? "");
$password = $data["password"] ?? "";

$admin = get_admin_by_username($username);
if (!$admin || empty($admin["is_active"])) {
    json_response(["error" => "Invalid credentials"], 401);
}
if (!password_verify($password, $admin["password_hash"])) {
    json_response(["error" => "Invalid credentials"], 401);
}

$pdo = auth_db();
$stmt = $pdo->prepare("UPDATE admins SET last_login_at = :last_login_at WHERE id = :id");
$stmt->execute(["last_login_at" => date("c"), "id" => $admin["id"]]);

admin_login($admin);
json_response(["ok" => true, "role" => $admin["role"], "username" => $admin["username"]]);
