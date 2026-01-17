<?php
declare(strict_types=1);
require_once dirname(__DIR__, 2) . "/server/helpers.php";

rate_limit("order_create", 10, 60);
init_db();

$data = read_input();
$email = sanitize_text($data["email"] ?? "");
if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(["error" => "Valid email is required"], 400);
}

$items = $data["items"] ?? [];
if (!is_array($items) || count($items) === 0) {
    json_response(["error" => "Cart is empty"], 400);
}

$map = [];

$sanitizedItems = [];
$subtotal = 0.0;
foreach ($items as $item) {
    $id = sanitize_text($item["id"] ?? "");
    $qty = intval($item["qty"] ?? 0);
    if (!$id || $qty < 1) {
        json_response(["error" => "Invalid cart item"], 400);
    }
    if (!isset($map[$id])) {
        $map[$id] = get_product_by_id($id);
    }
    $product = $map[$id];
    if (!$product) {
        json_response(["error" => "Invalid cart item"], 400);
    }
    if (($product["is_active"] ?? true) === false) {
        json_response(["error" => "Item not available"], 400);
    }
    $price = floatval($product["price"] ?? 0);
    $lineTotal = $price * $qty;
    $subtotal += $lineTotal;
    $sanitizedItems[] = [
        "id" => $id,
        "name" => $product["name"] ?? $product["title"] ?? "Item",
        "qty" => $qty,
        "price" => $price,
        "line_total" => $lineTotal
    ];
}

$total = $subtotal;
$orderId = "ORD-" . date("Ymd") . "-" . strtoupper(bin2hex(random_bytes(2)));

$pdo = db();
$pdo->beginTransaction();
$stmt = $pdo->prepare("
    INSERT INTO orders (id, created_at, status, customer_email, customer_name, customer_note, items_json, subtotal, total, currency, ip, user_agent)
    VALUES (:id, :created_at, :status, :email, :name, :note, :items, :subtotal, :total, :currency, :ip, :ua)
");
$stmt->execute([
    ":id" => $orderId,
    ":created_at" => date("c"),
    ":status" => "new",
    ":email" => $email,
    ":name" => sanitize_text($data["name"] ?? ""),
    ":note" => sanitize_text($data["note"] ?? ""),
    ":items" => json_encode($sanitizedItems),
    ":subtotal" => $subtotal,
    ":total" => $total,
    ":currency" => "USD",
    ":ip" => $_SERVER["REMOTE_ADDR"] ?? "",
    ":ua" => substr($_SERVER["HTTP_USER_AGENT"] ?? "", 0, 255)
]);
$stmt = $pdo->prepare("INSERT OR IGNORE INTO site_stats (key, value) VALUES (:key, :value)");
$stmt->execute(["key" => "orders_delivered", "value" => 214]);
$stmt = $pdo->prepare("UPDATE site_stats SET value = value + 1 WHERE key = :key");
$stmt->execute(["key" => "orders_delivered"]);
$pdo->commit();
cache_bust("stats");

json_response([
    "ok" => true,
    "order_id" => $orderId,
    "status" => "new"
]);
