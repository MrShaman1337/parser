<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

require_login(true);
init_db();
$pdo = db();
$columns = $pdo->query("PRAGMA table_info(products)")->fetchAll(PDO::FETCH_ASSOC);
$columnNames = array_map(function ($col) {
    return $col["name"] ?? "";
}, $columns);
if (!in_array("region", $columnNames, true)) {
    $pdo->exec("ALTER TABLE products ADD COLUMN region TEXT NOT NULL DEFAULT 'eu'");
}
$pdo->exec("UPDATE products SET region = 'eu' WHERE region IS NULL OR region = ''");

$page = max(1, intval($_GET["page"] ?? 1));
$limit = min(100, max(10, intval($_GET["limit"] ?? 50)));
$offset = ($page - 1) * $limit;

$region = sanitize_text($_GET["region"] ?? "eu") ?: "eu";
$query = sanitize_text($_GET["q"] ?? "");
$category = sanitize_text($_GET["category"] ?? "");
$sort = sanitize_text($_GET["sort"] ?? "name");
$featured = isset($_GET["featured"]) ? sanitize_bool($_GET["featured"]) : null;
$includeInactive = !empty($_GET["include_inactive"]);

$where = ["region = :region"];
$params = [":region" => $region];
if ($query !== "") {
    $where[] = "(LOWER(name) LIKE :q OR LOWER(title) LIKE :q)";
    $params[":q"] = "%" . strtolower($query) . "%";
}
if ($category !== "") {
    $where[] = "category = :category";
    $params[":category"] = $category;
}
if ($featured !== null) {
    $where[] = "is_featured = :featured";
    $params[":featured"] = $featured ? 1 : 0;
}
if (!$includeInactive) {
    $where[] = "is_active = 1";
}

$sql = "SELECT * FROM products WHERE " . implode(" AND ", $where);
if ($sort === "price") {
    $sql .= " ORDER BY price ASC";
} elseif ($sort === "price_desc") {
    $sql .= " ORDER BY price DESC";
} elseif ($sort === "date") {
    $sql .= " ORDER BY created_at DESC";
} elseif ($sort === "popularity") {
    $sql .= " ORDER BY popularity DESC";
} else {
    $sql .= " ORDER BY name ASC";
}
$sql .= " LIMIT :limit OFFSET :offset";
$stmt = $pdo->prepare($sql);
foreach ($params as $key => $value) {
    $stmt->bindValue($key, $value);
}
$stmt->bindValue(":limit", $limit, PDO::PARAM_INT);
$stmt->bindValue(":offset", $offset, PDO::PARAM_INT);
$stmt->execute();
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
$products = array_map(function ($row) {
    $product = product_row_to_array($row);
    $product["region"] = $row["region"] ?? "eu";
    return $product;
}, $rows);

$countSql = "SELECT COUNT(*) FROM products WHERE " . implode(" AND ", $where);
$countStmt = $pdo->prepare($countSql);
$countStmt->execute($params);
$total = (int)$countStmt->fetchColumn();

json_response([
    "ok" => true,
    "products" => $products,
    "page" => $page,
    "limit" => $limit,
    "total" => $total
]);
