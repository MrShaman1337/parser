<?php
declare(strict_types=1);
require_once dirname(__DIR__, 2) . "/server/helpers.php";

ensure_products_table();

$pdo = db();
$region = sanitize_text($_GET["region"] ?? "eu") ?: "eu";
$columns = $pdo->query("PRAGMA table_info(products)")->fetchAll(PDO::FETCH_ASSOC);
$columnNames = array_map(function ($col) {
    return $col["name"] ?? "";
}, $columns);
if (!in_array("region", $columnNames, true)) {
    $pdo->exec("ALTER TABLE products ADD COLUMN region TEXT NOT NULL DEFAULT 'eu'");
}
$pdo->exec("UPDATE products SET region = 'eu' WHERE region IS NULL OR region = ''");

$count = (int)$pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
if ($count === 0) {
    $path = products_path();
    if (file_exists($path)) {
        $raw = file_get_contents($path);
        $data = json_decode($raw ?: "", true);
        if (is_array($data)) {
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("
                INSERT OR IGNORE INTO products (
                    id, region, name, title, perks, short_description, full_description, price, compare_at, discount, image,
                    gallery_json, items_json, requirements, delivery, category, tags_json, variants_json, popularity,
                    is_active, is_featured, featured_order, created_at, updated_at
                )
                VALUES (
                    :id, :region, :name, :title, :perks, :short_description, :full_description, :price, :compare_at, :discount, :image,
                    :gallery_json, :items_json, :requirements, :delivery, :category, :tags_json, :variants_json, :popularity,
                    :is_active, :is_featured, :featured_order, :created_at, :updated_at
                )
            ");
            foreach ($data as $item) {
                if (!is_array($item) || empty($item["id"])) {
                    continue;
                }
                $now = date("c");
                $stmt->execute([
                    "id" => sanitize_text($item["id"] ?? ""),
                    "region" => sanitize_text($item["region"] ?? "eu") ?: "eu",
                    "name" => sanitize_text($item["name"] ?? ""),
                    "title" => sanitize_text($item["title"] ?? ""),
                    "perks" => sanitize_text($item["perks"] ?? ""),
                    "short_description" => sanitize_text($item["short_description"] ?? ""),
                    "full_description" => sanitize_text($item["full_description"] ?? ""),
                    "price" => floatval($item["price"] ?? 0),
                    "compare_at" => sanitize_text($item["compareAt"] ?? $item["old_price"] ?? ""),
                    "discount" => intval($item["discount"] ?? 0),
                    "image" => sanitize_text($item["image"] ?? ""),
                    "gallery_json" => json_encode($item["gallery"] ?? []),
                    "items_json" => json_encode($item["items"] ?? []),
                    "requirements" => sanitize_text($item["requirements"] ?? ""),
                    "delivery" => sanitize_text($item["delivery"] ?? ""),
                    "category" => sanitize_text($item["category"] ?? ""),
                    "tags_json" => json_encode($item["tags"] ?? []),
                    "variants_json" => json_encode($item["variants"] ?? []),
                    "popularity" => intval($item["popularity"] ?? 0),
                    "is_active" => !empty($item["is_active"]) ? 1 : 0,
                    "is_featured" => !empty($item["is_featured"]) ? 1 : 0,
                    "featured_order" => intval($item["featured_order"] ?? 0),
                    "created_at" => $item["created_at"] ?? date("Y-m-d"),
                    "updated_at" => $now
                ]);
            }
            $pdo->commit();
        }
    }
}
$category = sanitize_text($_GET["category"] ?? "");
$query = sanitize_text($_GET["q"] ?? "");
$sort = sanitize_text($_GET["sort"] ?? "name");

$where = ["region = :region", "is_active = 1"];
$params = [":region" => $region];
if ($category !== "") {
    $where[] = "category = :category";
    $params[":category"] = $category;
}
if ($query !== "") {
    $where[] = "(LOWER(name) LIKE :q OR LOWER(title) LIKE :q)";
    $params[":q"] = "%" . strtolower($query) . "%";
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
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
$products = array_map(function ($row) {
    $product = product_row_to_array($row);
    $product["region"] = $row["region"] ?? "eu";
    return $product;
}, $rows);

$lastModified = $pdo->query("SELECT MAX(updated_at) FROM products")->fetchColumn();
$lastModifiedTs = $lastModified ? strtotime((string)$lastModified) : time();
$etagSeed = sha1(json_encode([$region, $category, $query, $sort, count($products), $lastModified]));

cached_json_response([
    "ok" => true,
    "products" => $products
], 60, $lastModifiedTs ?: time(), $etagSeed);
