<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

require_login(true);
require_admin_role(["admin", "superadmin"]);
rate_limit("product_delete", 10, 60);
ensure_products_table();

$data = read_input();
validate_csrf($data["csrf_token"] ?? null);

$id = sanitize_text($data["id"] ?? "");
if (!$id) {
    json_response(["error" => "Missing id"], 400);
}

$region = sanitize_text($data["region"] ?? "eu") ?: "eu";
$pdo = db();
$stmt = $pdo->prepare("UPDATE products SET is_active = 0, updated_at = :updated_at WHERE id = :id AND region = :region");
$stmt->execute([":updated_at" => date("c"), ":id" => $id, ":region" => $region]);
if ($stmt->rowCount() === 0) {
    json_response(["error" => "Not found"], 404);
}
json_response(["ok" => true]);
