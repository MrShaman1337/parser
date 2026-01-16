<?php
declare(strict_types=1);
require_once dirname(__DIR__, 2) . "/server/helpers.php";

init_db();

$cache = cache_get("featured_drop", 60);
if ($cache) {
    cached_json_response($cache["data"], 60, $cache["mtime"]);
}

$drop = get_featured_drop();
if (!$drop || empty($drop["is_enabled"])) {
    $payload = ["ok" => true, "featured_drop" => null];
    cache_set("featured_drop", $payload);
    cached_json_response($payload, 60, time());
}

$productId = sanitize_text($drop["product_id"] ?? "");
if (!$productId) {
    $payload = ["ok" => true, "featured_drop" => null];
    cache_set("featured_drop", $payload);
    cached_json_response($payload, 60, time());
}

$products = load_products();
$product = null;
foreach ($products as $item) {
    if (($item["id"] ?? "") === $productId) {
        $product = $item;
        break;
    }
}
if (!$product || (($product["is_active"] ?? true) === false)) {
    $payload = ["ok" => true, "featured_drop" => null];
    cache_set("featured_drop", $payload);
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
cache_set("featured_drop", $payload);
$updatedAt = strtotime($drop["updated_at"] ?? "") ?: time();
cached_json_response($payload, 60, $updatedAt);
