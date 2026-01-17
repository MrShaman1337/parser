<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

require_login(true);
init_db();

$page = max(1, intval($_GET["page"] ?? 1));
$limit = min(100, max(10, intval($_GET["limit"] ?? 50)));
$offset = ($page - 1) * $limit;

$filters = [
    "q" => sanitize_text($_GET["q"] ?? ""),
    "category" => sanitize_text($_GET["category"] ?? ""),
    "sort" => sanitize_text($_GET["sort"] ?? "name")
];
if (isset($_GET["featured"])) {
    $filters["featured"] = sanitize_bool($_GET["featured"]);
}
if (!empty($_GET["include_inactive"])) {
    $filters["active"] = "";
} else {
    $filters["active"] = true;
}

$products = list_products($filters, $limit, $offset);
$total = count_products($filters);

json_response([
    "ok" => true,
    "products" => $products,
    "page" => $page,
    "limit" => $limit,
    "total" => $total
]);
