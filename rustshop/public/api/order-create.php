<?php
declare(strict_types=1);
require_once __DIR__ . "/../../server/helpers.php";

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

$products = load_products();
$map = [];
foreach ($products as $product) {
    $map[$product["id"]] = $product;
}

$sanitizedItems = [];
$subtotal = 0.0;
foreach ($items as $item) {
    $id = sanitize_text($item["id"] ?? "");
    $qty = intval($item["qty"] ?? 0);
    if (!$id || $qty < 1 || !isset($map[$id])) {
        json_response(["error" => "Invalid cart item"], 400);
    }
    $product = $map[$id];
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

json_response([
    "ok" => true,
    "order_id" => $orderId,
    "status" => "new"
]);
