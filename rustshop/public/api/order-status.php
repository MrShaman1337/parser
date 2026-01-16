<?php
declare(strict_types=1);
require_once __DIR__ . "/../../server/helpers.php";

init_db();

$id = sanitize_text($_GET["id"] ?? "");
if (!$id) {
    json_response(["error" => "Missing id"], 400);
}

$pdo = db();
$stmt = $pdo->prepare("SELECT id, created_at, status, total, items_json FROM orders WHERE id = :id");
$stmt->execute([":id" => $id]);
$order = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$order) {
    json_response(["error" => "Not found"], 404);
}

$order["items"] = json_decode($order["items_json"], true) ?: [];
unset($order["items_json"]);

json_response(["ok" => true, "order" => $order]);
