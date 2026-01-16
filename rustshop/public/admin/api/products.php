<?php
declare(strict_types=1);
require_once __DIR__ . "/../../../server/helpers.php";

require_login(true);

$products = load_products();
$query = strtolower(sanitize_text($_GET["q"] ?? ""));
$category = sanitize_text($_GET["category"] ?? "");
$featured = $_GET["featured"] ?? "";
$sort = sanitize_text($_GET["sort"] ?? "name");
$includeInactive = filter_var($_GET["include_inactive"] ?? "true", FILTER_VALIDATE_BOOLEAN);

$filtered = array_filter($products, function ($p) use ($query, $category, $featured, $includeInactive) {
    if (!$includeInactive && ($p["is_active"] ?? true) === false) {
        return false;
    }
    if ($query) {
        $name = strtolower($p["name"] ?? $p["title"] ?? "");
        if (strpos($name, $query) === false) {
            return false;
        }
    }
    if ($category && ($p["category"] ?? "") !== $category) {
        return false;
    }
    if ($featured !== "") {
        $isFeatured = ($p["is_featured"] ?? false) ? "1" : "0";
        if ($featured !== $isFeatured) {
            return false;
        }
    }
    return true;
});

usort($filtered, function ($a, $b) use ($sort) {
    if ($sort === "price") return ($a["price"] ?? 0) <=> ($b["price"] ?? 0);
    if ($sort === "price_desc") return ($b["price"] ?? 0) <=> ($a["price"] ?? 0);
    if ($sort === "date") return strcmp($b["created_at"] ?? "", $a["created_at"] ?? "");
    if ($sort === "popularity") return ($b["popularity"] ?? 0) <=> ($a["popularity"] ?? 0);
    return strcmp($a["name"] ?? "", $b["name"] ?? "");
});

json_response(["products" => array_values($filtered)]);
