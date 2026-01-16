<?php
declare(strict_types=1);
require_once __DIR__ . "/../../../server/helpers.php";

require_login(true);
rate_limit("featured_save", 20, 60);

$data = read_input();
validate_csrf($data["csrf_token"] ?? null);

$order = $data["featured"] ?? [];
if (!is_array($order)) {
    json_response(["error" => "Invalid payload"], 400);
}

$limit = config()["featured_limit"] ?? 8;
$order = array_slice(array_values(array_filter($order, "strlen")), 0, $limit);

$products = load_products();
$orderMap = [];
foreach ($order as $idx => $id) {
    $orderMap[$id] = $idx + 1;
}

foreach ($products as $idx => $product) {
    $id = $product["id"] ?? "";
    if (isset($orderMap[$id])) {
        $products[$idx]["is_featured"] = true;
        $products[$idx]["featured_order"] = $orderMap[$id];
    } else {
        $products[$idx]["is_featured"] = false;
        $products[$idx]["featured_order"] = 0;
    }
}

save_products($products);
json_response(["ok" => true]);
