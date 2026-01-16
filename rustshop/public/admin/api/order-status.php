<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

require_login(true);
require_admin_role(["admin", "superadmin"]);
rate_limit("order_status", 20, 60);
validate_csrf(read_input()["csrf_token"] ?? null);
init_db();

$data = read_input();
$id = sanitize_text($data["id"] ?? "");
$status = sanitize_text($data["status"] ?? "");
$allowed = ["new", "paid", "delivered", "canceled"];

if (!$id || !in_array($status, $allowed, true)) {
    json_response(["error" => "Invalid request"], 400);
}

$pdo = db();
$stmt = $pdo->prepare("UPDATE orders SET status = :status WHERE id = :id");
$stmt->execute([":status" => $status, ":id" => $id]);

json_response(["ok" => true]);
