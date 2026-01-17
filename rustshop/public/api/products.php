<?php
declare(strict_types=1);
require_once dirname(__DIR__, 2) . "/server/helpers.php";

ensure_products_seeded();

$filters = [
    "active" => true,
    "category" => sanitize_text($_GET["category"] ?? ""),
    "q" => sanitize_text($_GET["q"] ?? ""),
    "sort" => sanitize_text($_GET["sort"] ?? "name")
];
if ($filters["category"] === "") {
    unset($filters["category"]);
}
if ($filters["q"] === "") {
    unset($filters["q"]);
}

$products = list_products($filters, 200, 0);

$pdo = db();
$lastModified = $pdo->query("SELECT MAX(updated_at) FROM products")->fetchColumn();
$lastModifiedTs = $lastModified ? strtotime((string)$lastModified) : time();
$etagSeed = sha1(json_encode([$filters, count($products), $lastModified]));

cached_json_response([
    "ok" => true,
    "products" => $products
], 60, $lastModifiedTs ?: time(), $etagSeed);
