<?php
declare(strict_types=1);
require_once dirname(__DIR__, 2) . "/server/helpers.php";

rate_limit("order_create", 10, 60);
init_db();
ensure_auth_db();
start_session();

// User must be logged in to purchase
if (empty($_SESSION["user_id"])) {
    json_response(["error" => "Войдите через Steam для покупки", "error_en" => "Please sign in via Steam to purchase"], 401);
}

$userId = (int)$_SESSION["user_id"];
$user = get_user_by_id($userId);
if (!$user) {
    json_response(["error" => "Пользователь не найден", "error_en" => "User not found"], 401);
}

$data = read_input();

$items = $data["items"] ?? [];
if (!is_array($items) || count($items) === 0) {
    json_response(["error" => "Корзина пуста", "error_en" => "Cart is empty"], 400);
}

$map = [];
$sanitizedItems = [];
$subtotal = 0.0;

foreach ($items as $item) {
    $id = sanitize_text($item["id"] ?? "");
    $qty = intval($item["qty"] ?? 0);
    if (!$id || $qty < 1) {
        json_response(["error" => "Некорректный товар", "error_en" => "Invalid cart item"], 400);
    }
    if (!isset($map[$id])) {
        $map[$id] = get_product_by_id($id);
    }
    $product = $map[$id];
    if (!$product) {
        json_response(["error" => "Товар не найден", "error_en" => "Product not found"], 400);
    }
    if (($product["is_active"] ?? true) === false) {
        json_response(["error" => "Товар недоступен", "error_en" => "Item not available"], 400);
    }
    // Price is stored in RUB
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

// Check user balance
$balance = floatval($user["balance"] ?? 0);
if ($balance < $total) {
    $needed = $total - $balance;
    json_response([
        "error" => "Недостаточно средств. Пополните баланс на " . format_balance_rub($needed),
        "error_en" => "Insufficient balance. Please top up " . format_balance_rub($needed),
        "balance" => $balance,
        "total" => $total,
        "shortage" => $needed
    ], 400);
}

// Deduct balance
$deducted = deduct_user_balance($userId, $total, "Покупка: " . count($sanitizedItems) . " товар(ов)");
if (!$deducted) {
    json_response(["error" => "Ошибка списания баланса", "error_en" => "Failed to deduct balance"], 500);
}

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
    ":status" => "paid",
    ":email" => sanitize_text($data["email"] ?? $user["steam_profile_url"] ?? ""),
    ":name" => sanitize_text($data["name"] ?? $user["steam_nickname"] ?? ""),
    ":note" => sanitize_text($data["note"] ?? ""),
    ":items" => json_encode($sanitizedItems),
    ":subtotal" => $subtotal,
    ":total" => $total,
    ":currency" => "RUB",
    ":ip" => $_SERVER["REMOTE_ADDR"] ?? "",
    ":ua" => substr($_SERVER["HTTP_USER_AGENT"] ?? "", 0, 255)
]);
$stmt = $pdo->prepare("INSERT OR IGNORE INTO site_stats (key, value) VALUES (:key, :value)");
$stmt->execute(["key" => "orders_delivered", "value" => 214]);
$stmt = $pdo->prepare("UPDATE site_stats SET value = value + 1 WHERE key = :key");
$stmt->execute(["key" => "orders_delivered"]);
$pdo->commit();
cache_bust("stats");

// Get updated balance
$updatedUser = get_user_by_id($userId);
$newBalance = floatval($updatedUser["balance"] ?? 0);

json_response([
    "ok" => true,
    "order_id" => $orderId,
    "status" => "paid",
    "total" => $total,
    "total_formatted" => format_balance_rub($total),
    "new_balance" => $newBalance,
    "new_balance_formatted" => format_balance_rub($newBalance)
]);
