<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

require_login(true);
require_admin_role(["admin", "superadmin"]);
rate_limit("featured_drop", 20, 60);
init_db();

$region = sanitize_text($_GET["region"] ?? ($_POST["region"] ?? "eu")) ?: "eu";
$pdo = db();
$columns = $pdo->query("PRAGMA table_info(featured_drop)")->fetchAll(PDO::FETCH_ASSOC);
$columnNames = array_map(function ($col) {
    return $col["name"] ?? "";
}, $columns);
if (!in_array("region", $columnNames, true)) {
    $pdo->exec("ALTER TABLE featured_drop ADD COLUMN region TEXT NOT NULL DEFAULT 'eu'");
}
$regionId = $region === "ru" ? 2 : 1;
$stmt = $pdo->prepare("INSERT OR IGNORE INTO featured_drop (id, region, cta_text, is_enabled, updated_at) VALUES (:id, :region, 'Add VIP', 0, :updated_at)");
$stmt->execute(["id" => $regionId, "region" => $region, "updated_at" => date("c")]);

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    $stmt = $pdo->prepare("SELECT * FROM featured_drop WHERE id = :id AND region = :region LIMIT 1");
    $stmt->execute(["id" => $regionId, "region" => $region]);
    $drop = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    json_response(["ok" => true, "featured_drop" => $drop]);
}

$data = read_input();
validate_csrf($data["csrf_token"] ?? null);

$isEnabled = isset($data["is_enabled"]) ? sanitize_bool($data["is_enabled"]) : true;
$productId = sanitize_text($data["product_id"] ?? "");
$title = sanitize_text($data["title"] ?? "");
$subtitle = sanitize_text($data["subtitle"] ?? "");
$cta = sanitize_text($data["cta_text"] ?? "");
$price = isset($data["price"]) ? floatval($data["price"]) : 0;
$oldPrice = isset($data["old_price"]) && $data["old_price"] !== "" ? floatval($data["old_price"]) : null;

$product = null;
if ($productId) {
    $stmt = $pdo->prepare("SELECT * FROM products WHERE id = :id AND region = :region LIMIT 1");
    $stmt->execute(["id" => $productId, "region" => $region]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $product = $row ? product_row_to_array($row) : null;
}

if ($isEnabled) {
    if (!$productId || !$product || (($product["is_active"] ?? true) === false)) {
        json_response(["error" => "Invalid product"], 400);
    }
    if ($price <= 0) {
        $price = floatval($product["price"] ?? 0);
    }
    if ($price <= 0) {
        json_response(["error" => "Price is required"], 400);
    }
}

$now = date("c");
$stmt = $pdo->prepare("
    INSERT INTO featured_drop (id, region, product_id, title, subtitle, cta_text, old_price, price, is_enabled, updated_at)
    VALUES (:id, :region, :product_id, :title, :subtitle, :cta_text, :old_price, :price, :is_enabled, :updated_at)
    ON CONFLICT(id) DO UPDATE SET
        product_id = excluded.product_id,
        title = excluded.title,
        subtitle = excluded.subtitle,
        cta_text = excluded.cta_text,
        old_price = excluded.old_price,
        price = excluded.price,
        is_enabled = excluded.is_enabled,
        updated_at = excluded.updated_at
");
$stmt->execute([
    "id" => $regionId,
    "region" => $region,
    "product_id" => $productId ?: null,
    "title" => $title ?: null,
    "subtitle" => $subtitle ?: null,
    "cta_text" => $cta ?: "Add VIP",
    "old_price" => $oldPrice,
    "price" => $price,
    "is_enabled" => $isEnabled ? 1 : 0,
    "updated_at" => $now
]);
$stmt = $pdo->prepare("SELECT * FROM featured_drop WHERE id = :id AND region = :region LIMIT 1");
$stmt->execute(["id" => $regionId, "region" => $region]);
$saved = $stmt->fetch(PDO::FETCH_ASSOC);
cache_bust("featured_drop_" . $region);
json_response(["ok" => true, "featured_drop" => $saved]);
