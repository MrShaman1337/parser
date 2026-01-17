<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

require_login(true);
require_admin_role(["admin", "superadmin"]);
rate_limit("product_update", 20, 60);
ensure_products_table();

$data = read_input();
validate_csrf($data["csrf_token"] ?? null);

$id = sanitize_text($data["id"] ?? "");
if (!$id) {
    json_response(["error" => "Missing id"], 400);
}

$data["region"] = sanitize_text($data["region"] ?? "eu") ?: "eu";
$pdo = db();
$stmt = $pdo->prepare("SELECT * FROM products WHERE id = :id LIMIT 1");
$stmt->execute([":id" => $id]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    json_response(["error" => "Not found"], 404);
}
$normalized = normalize_product($data, $row);
$now = date("c");
$stmt = $pdo->prepare("
    UPDATE products SET
        region = :region,
        name = :name,
        title = :title,
        perks = :perks,
        short_description = :short_description,
        full_description = :full_description,
        price = :price,
        compare_at = :compare_at,
        discount = :discount,
        image = :image,
        gallery_json = :gallery_json,
        items_json = :items_json,
        requirements = :requirements,
        delivery = :delivery,
        category = :category,
        tags_json = :tags_json,
        variants_json = :variants_json,
        popularity = :popularity,
        is_active = :is_active,
        is_featured = :is_featured,
        featured_order = :featured_order,
        updated_at = :updated_at
    WHERE id = :id
");
$stmt->execute([
    "id" => $id,
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
    "updated_at" => $now
]);
$stmt = $pdo->prepare("SELECT * FROM products WHERE id = :id LIMIT 1");
$stmt->execute([":id" => $id]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
$product = $row ? product_row_to_array($row) : array_merge($normalized, ["id" => $id]);
$product["region"] = $data["region"];
json_response(["ok" => true, "product" => $product]);
