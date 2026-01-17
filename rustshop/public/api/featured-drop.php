<?php
declare(strict_types=1);
require_once dirname(__DIR__, 2) . "/server/helpers.php";

init_db();

$region = sanitize_text($_GET["region"] ?? "eu") ?: "eu";
$pdo = db();
$columns = $pdo->query("PRAGMA table_info(featured_drop)")->fetchAll(PDO::FETCH_ASSOC);
$columnNames = array_map(function ($col) {
    return $col["name"] ?? "";
}, $columns);
if (!in_array("region", $columnNames, true)) {
    $pdo->exec("ALTER TABLE featured_drop ADD COLUMN region TEXT NOT NULL DEFAULT 'eu'");
}
$regionId = $region === "ru" ? 2 : 1;
$stmt = $pdo->prepare("INSERT OR IGNORE INTO featured_drop (id, region, cta_text, is_enabled, updated_at) VALUES (:id, :region, 'Add VIP', 0, :updated_at)");
$stmt->execute(["id" => $regionId, "region" => $region, "updated_at" => date("c")]);

$cache = cache_get("featured_drop_" . $region, 60);
if ($cache) {
    cached_json_response($cache["data"], 60, $cache["mtime"]);
}

$stmt = $pdo->prepare("SELECT * FROM featured_drop WHERE id = :id AND region = :region LIMIT 1");
$stmt->execute(["id" => $regionId, "region" => $region]);
$drop = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
if (!$drop || empty($drop["is_enabled"])) {
    $payload = ["ok" => true, "featured_drop" => null];
    cache_set("featured_drop_" . $region, $payload);
    cached_json_response($payload, 60, time());
}

$productId = sanitize_text($drop["product_id"] ?? "");
if (!$productId) {
    $payload = ["ok" => true, "featured_drop" => null];
    cache_set("featured_drop_" . $region, $payload);
    cached_json_response($payload, 60, time());
}

$stmt = $pdo->prepare("SELECT * FROM products WHERE id = :id AND region = :region LIMIT 1");
$stmt->execute(["id" => $productId, "region" => $region]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
$product = $row ? product_row_to_array($row) : null;
if (!$product || (($product["is_active"] ?? true) === false)) {
    $payload = ["ok" => true, "featured_drop" => null];
    cache_set("featured_drop_" . $region, $payload);
    cached_json_response($payload, 60, time());
}

$title = sanitize_text($drop["title"] ?? "");
$subtitle = sanitize_text($drop["subtitle"] ?? "");
$cta = sanitize_text($drop["cta_text"] ?? "") ?: "Add VIP";
$price = floatval($drop["price"] ?? 0);
$oldPrice = $drop["old_price"] !== null ? floatval($drop["old_price"]) : null;

if ($price <= 0) {
    $price = floatval($product["price"] ?? 0);
}

$payload = [
    "ok" => true,
    "featured_drop" => [
        "product_id" => $productId,
        "title" => $title !== "" ? $title : ($product["name"] ?? $product["title"] ?? "Featured Drop"),
        "subtitle" => $subtitle !== "" ? $subtitle : ($product["perks"] ?? $product["short_description"] ?? ""),
        "cta_text" => $cta,
        "price" => $price,
        "old_price" => $oldPrice,
        "is_enabled" => true,
        "product" => $product
    ]
];
$payload["featured_drop"]["region"] = $region;
cache_set("featured_drop_" . $region, $payload);
$updatedAt = strtotime($drop["updated_at"] ?? "") ?: time();
cached_json_response($payload, 60, $updatedAt);
