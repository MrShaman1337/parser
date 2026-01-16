<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

require_login(true);
require_admin_role(["admin", "superadmin"]);
rate_limit("product_delete", 10, 60);

$data = read_input();
validate_csrf($data["csrf_token"] ?? null);

$id = sanitize_text($data["id"] ?? "");
if (!$id) {
    json_response(["error" => "Missing id"], 400);
}

$products = load_products();
foreach ($products as $idx => $product) {
    if (($product["id"] ?? "") === $id) {
        $products[$idx]["is_active"] = false;
        save_products($products);
        json_response(["ok" => true]);
    }
}

json_response(["error" => "Not found"], 404);
