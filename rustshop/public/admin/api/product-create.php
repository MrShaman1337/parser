<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

require_login(true);
require_admin_role(["admin", "superadmin"]);
rate_limit("product_create", 20, 60);
ensure_products_table();

$data = read_input();
validate_csrf($data["csrf_token"] ?? null);

$data["region"] = sanitize_text($data["region"] ?? "eu") ?: "eu";
$normalized = normalize_product($data, []);
$baseId = sanitize_text($normalized["id"] ?? slugify($normalized["name"] ?? "item"));
$pdo = db();
$candidate = $baseId ?: "item";
$suffix = 1;
while (true) {
    $stmt = $pdo->prepare("SELECT id FROM products WHERE id = :id LIMIT 1");
    $stmt->execute([":id" => $candidate]);
    if (!$stmt->fetchColumn()) {
        break;
    }
    $suffix += 1;
    $candidate = $baseId . "-" . $suffix;
}
$now = date("c");
$stmt = $pdo->prepare("
    INSERT INTO products (
        id, region, name, title, perks, short_description, full_description, price, compare_at, discount, image,
        gallery_json, items_json, requirements, delivery, category, tags_json, variants_json, popularity,
        is_active, is_featured, featured_order, created_at, updated_at
    ) VALUES (
        :id, :region, :name, :title, :perks, :short_description, :full_description, :price, :compare_at, :discount, :image,
        :gallery_json, :items_json, :requirements, :delivery, :category, :tags_json, :variants_json, :popularity,
        :is_active, :is_featured, :featured_order, :created_at, :updated_at
    )
");
$stmt->execute([
    "id" => $candidate,
    "region" => $data["region"],
    "name" => sanitize_text($normalized["name"] ?? ""),
    "title" => sanitize_text($normalized["title"] ?? ""),
    "perks" => sanitize_text($normalized["perks"] ?? ""),
    "short_description" => sanitize_text($normalized["short_description"] ?? ""),
    "full_description" => sanitize_text($normalized["full_description"] ?? ""),
    "price" => floatval($normalized["price"] ?? 0),
    "compare_at" => sanitize_text($normalized["compareAt"] ?? ""),
    "discount" => intval($normalized["discount"] ?? 0),
    "image" => sanitize_text($normalized["image"] ?? ""),
    "gallery_json" => json_encode($normalized["gallery"] ?? []),
    "items_json" => json_encode($normalized["items"] ?? []),
    "requirements" => sanitize_text($normalized["requirements"] ?? ""),
    "delivery" => sanitize_text($normalized["delivery"] ?? ""),
    "category" => sanitize_text($normalized["category"] ?? ""),
    "tags_json" => json_encode($normalized["tags"] ?? []),
    "variants_json" => json_encode($normalized["variants"] ?? []),
    "popularity" => intval($normalized["popularity"] ?? 0),
    "is_active" => !empty($normalized["is_active"]) ? 1 : 0,
    "is_featured" => !empty($normalized["is_featured"]) ? 1 : 0,
    "featured_order" => intval($normalized["featured_order"] ?? 0),
    "created_at" => $normalized["created_at"] ?? date("Y-m-d"),
    "updated_at" => $now
]);
$stmt = $pdo->prepare("SELECT * FROM products WHERE id = :id LIMIT 1");
$stmt->execute([":id" => $candidate]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
$product = $row ? product_row_to_array($row) : array_merge($normalized, ["id" => $candidate]);
$product["region"] = $data["region"];
json_response(["ok" => true, "product" => $product]);
