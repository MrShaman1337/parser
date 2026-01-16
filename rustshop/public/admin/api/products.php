<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

require_login(true);
init_db();

$includeInactive = isset($_GET["include_inactive"]) && sanitize_bool($_GET["include_inactive"]);
$products = load_products();
if (!$includeInactive) {
    $products = array_values(array_filter($products, function ($item) {
        return ($item["is_active"] ?? true) !== false;
    }));
}

json_response(["products" => $products]);
