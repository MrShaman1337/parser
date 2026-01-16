<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

require_login(true);
require_admin_role(["admin", "superadmin"]);
rate_limit("featured_drop", 20, 60);
init_db();

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    $drop = get_featured_drop();
    json_response(["ok" => true, "featured_drop" => $drop]);
}

$data = read_input();
validate_csrf($data["csrf_token"] ?? null);

$isEnabled = isset($data["is_enabled"]) ? sanitize_bool($data["is_enabled"]) : true;
$productId = sanitize_text($data["product_id"] ?? "");
$title = sanitize_text($data["title"] ?? "");
$subtitle = sanitize_text($data["subtitle"] ?? "");
$cta = sanitize_text($data["cta_text"] ?? "");
$price = isset($data["price"]) ? floatval($data["price"]) : 0;
$oldPrice = isset($data["old_price"]) && $data["old_price"] !== "" ? floatval($data["old_price"]) : null;

$product = null;
if ($productId) {
    $products = load_products();
    foreach ($products as $item) {
        if (($item["id"] ?? "") === $productId) {
            $product = $item;
            break;
        }
    }
}

if ($isEnabled) {
    if (!$productId || !$product || (($product["is_active"] ?? true) === false)) {
        json_response(["error" => "Invalid product"], 400);
    }
    if ($price <= 0) {
        $price = floatval($product["price"] ?? 0);
    }
    if ($price <= 0) {
        json_response(["error" => "Price is required"], 400);
    }
}

$saved = save_featured_drop([
    "product_id" => $productId ?: null,
    "title" => $title ?: null,
    "subtitle" => $subtitle ?: null,
    "cta_text" => $cta ?: "Add VIP",
    "old_price" => $oldPrice,
    "price" => $price,
    "is_enabled" => $isEnabled ? 1 : 0
]);

json_response(["ok" => true, "featured_drop" => $saved]);
