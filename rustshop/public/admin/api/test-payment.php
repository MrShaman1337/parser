<?php
/**
 * POST /admin/api/test-payment.php
 * 
 * Admin-only endpoint to simulate payment confirmation.
 * Use this to test the cart_entries creation flow without real payment.
 * 
 * Request body:
 * {
 *   "user_id": 123,
 *   "products": [
 *     { "product_id": "vip-package", "quantity": 1 }
 *   ]
 * }
 */
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

require_login(true);
require_admin_role(["admin", "super"]);

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    json_response(["error" => "Method not allowed"], 405);
}

init_db();
ensure_auth_db();

$data = read_input();

$targetUserId = intval($data["user_id"] ?? 0);
if ($targetUserId <= 0) {
    json_response(["error" => "user_id is required"], 400);
}

$user = get_user_by_id($targetUserId);
if (!$user) {
    json_response(["error" => "User not found"], 404);
}

$steamId = $user["steam_id"] ?? "";
if (!validate_steam_id($steamId)) {
    json_response(["error" => "User does not have a valid Steam ID"], 400);
}

$products = $data["products"] ?? [];
if (!is_array($products) || empty($products)) {
    json_response(["error" => "products array is required"], 400);
}

$orderItemsData = [];
$total = 0.0;

foreach ($products as $p) {
    $productId = sanitize_text($p["product_id"] ?? "");
    $quantity = intval($p["quantity"] ?? 1);
    
    if ($productId === "" || $quantity < 1) {
        json_response(["error" => "Invalid product entry"], 400);
    }
    
    $product = get_product_by_id($productId);
    if (!$product) {
        json_response(["error" => "Product not found: $productId"], 404);
    }
    
    $price = floatval($product["price"] ?? 0);
    $total += $price * $quantity;
    
    $orderItemsData[] = [
        "product_id" => $productId,
        "product_name" => $product["name"] ?? $product["title"] ?? "Item",
        "quantity" => $quantity,
        "unit_price" => $price,
        "rust_command_template_snapshot" => $product["rust_command_template"] ?? ""
    ];
}

// Create test order
$orderId = "TEST-" . date("Ymd") . "-" . strtoupper(bin2hex(random_bytes(4)));

$pdo = db();
$stmt = $pdo->prepare("
    INSERT INTO orders (id, created_at, status, customer_email, customer_name, customer_note, items_json, subtotal, total, currency, user_id, steam_id, payment_provider)
    VALUES (:id, :created_at, :status, :email, :name, :note, :items, :subtotal, :total, :currency, :user_id, :steam_id, :provider)
");
$stmt->execute([
    ":id" => $orderId,
    ":created_at" => date("c"),
    ":status" => "paid",
    ":email" => "",
    ":name" => $user["steam_nickname"] ?? "",
    ":note" => "Test order created by admin",
    ":items" => json_encode($orderItemsData),
    ":subtotal" => $total,
    ":total" => $total,
    ":currency" => "RUB",
    ":user_id" => $targetUserId,
    ":steam_id" => $steamId,
    ":provider" => "admin_test"
]);

// Create order_items
create_order_items($orderId, $orderItemsData);

// Create cart_entries for Rust delivery
$cartEntries = create_cart_entries_for_order($orderId, $targetUserId, $steamId, $orderItemsData);

json_response([
    "ok" => true,
    "message" => "Test order created successfully",
    "order_id" => $orderId,
    "total" => $total,
    "total_formatted" => format_balance_rub($total),
    "cart_entries_created" => count($cartEntries),
    "cart_entries" => $cartEntries
]);
