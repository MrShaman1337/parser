<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

require_login(true);
require_admin_role(["admin", "superadmin"]);
rate_limit("product_save", 20, 60);

$data = read_input();
validate_csrf($data["csrf_token"] ?? null);

$products = load_products();
$id = sanitize_text($data["id"] ?? "");
$existingIndex = null;

foreach ($products as $idx => $product) {
    if (($product["id"] ?? "") === $id) {
        $existingIndex = $idx;
        break;
    }
}

if ($existingIndex === null) {
    $name = sanitize_text($data["name"] ?? "New Product");
    $slug = slugify($name);
    $newId = $slug;
    $suffix = 1;
    $ids = array_column($products, "id");
    while (in_array($newId, $ids, true)) {
        $suffix += 1;
        $newId = $slug . "-" . $suffix;
    }
    $product = [
        "id" => $newId,
        "created_at" => date("Y-m-d")
    ];
    $product = normalize_product($data, $product);
    $products[] = $product;
    save_products($products);
    json_response(["ok" => true, "product" => $product]);
}

$existing = $products[$existingIndex];
$product = normalize_product($data, $existing);
$product["id"] = $existing["id"];
$products[$existingIndex] = $product;
save_products($products);

json_response(["ok" => true, "product" => $product]);
