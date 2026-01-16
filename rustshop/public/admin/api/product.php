<?php
declare(strict_types=1);
require_once __DIR__ . "/../../../server/helpers.php";

require_login(true);

$id = sanitize_text($_GET["id"] ?? "");
if (!$id) {
    json_response(["error" => "Missing id"], 400);
}

$products = load_products();
foreach ($products as $product) {
    if (($product["id"] ?? "") === $id) {
        json_response(["product" => $product]);
    }
}

json_response(["error" => "Not found"], 404);
