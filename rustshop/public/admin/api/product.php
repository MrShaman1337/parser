<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

require_login(true);
init_db();

$id = sanitize_text($_GET["id"] ?? "");
if (!$id) {
    json_response(["error" => "Missing id"], 400);
}

$pdo = db();
$stmt = $pdo->prepare("SELECT * FROM products WHERE id = :id LIMIT 1");
$stmt->execute([":id" => $id]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    json_response(["error" => "Not found"], 404);
}

$product = product_row_to_array($row);
$product["region"] = $row["region"] ?? "eu";
json_response(["ok" => true, "product" => $product]);
