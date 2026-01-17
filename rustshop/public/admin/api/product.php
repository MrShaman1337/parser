<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

require_login(true);
init_db();

$id = sanitize_text($_GET["id"] ?? "");
if (!$id) {
    json_response(["error" => "Missing id"], 400);
}

$product = get_product_by_id($id);
if (!$product) {
    json_response(["error" => "Not found"], 404);
}

json_response(["ok" => true, "product" => $product]);
