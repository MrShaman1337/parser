<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

require_login(true);
require_admin_role(["admin", "superadmin"]);
rate_limit("featured_save", 20, 60);

$data = read_input();
validate_csrf($data["csrf_token"] ?? null);

$region = sanitize_text($data["region"] ?? "eu") ?: "eu";
$order = $data["featured"] ?? [];
if (!is_array($order)) {
    json_response(["error" => "Invalid payload"], 400);
}

$limit = config()["featured_limit"] ?? 8;
$order = array_slice(array_values(array_filter($order, "strlen")), 0, $limit);

$pdo = db();
$pdo->beginTransaction();
$stmt = $pdo->prepare("UPDATE products SET is_featured = 0, featured_order = 0 WHERE region = :region");
$stmt->execute([":region" => $region]);
$stmt = $pdo->prepare("UPDATE products SET is_featured = 1, featured_order = :order WHERE id = :id AND region = :region");
$orderIndex = 1;
foreach ($order as $id) {
    if ($orderIndex > $limit) {
        break;
    }
    $stmt->execute([":order" => $orderIndex, ":id" => $id, ":region" => $region]);
    $orderIndex += 1;
}
$pdo->commit();
json_response(["ok" => true]);
