<?php
/**
 * GET /api/me/orders.php
 * 
 * Returns the authenticated user's order history with items.
 * This is for the website Purchase History page.
 */
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

init_db();
ensure_auth_db();
start_session();

if (empty($_SESSION["user_id"])) {
    json_response(["error" => "Unauthorized", "error_ru" => "Требуется авторизация"], 401);
}

$userId = (int)$_SESSION["user_id"];

$limit = min(100, max(1, intval($_GET["limit"] ?? 50)));
$orders = get_user_orders($userId, $limit);

// Format orders for frontend
$formatted = array_map(function($order) {
    return [
        "id" => $order["id"],
        "created_at" => $order["created_at"],
        "status" => $order["status"],
        "total" => floatval($order["total"] ?? 0),
        "total_formatted" => format_balance_rub(floatval($order["total"] ?? 0)),
        "currency" => $order["currency"] ?? "RUB",
        "items" => array_map(function($item) {
            return [
                "id" => $item["id"] ?? $item["product_id"] ?? "",
                "product_id" => $item["product_id"] ?? $item["id"] ?? "",
                "name" => $item["product_name"] ?? $item["name"] ?? "Item",
                "quantity" => intval($item["quantity"] ?? $item["qty"] ?? 1),
                "price" => floatval($item["unit_price"] ?? $item["price"] ?? 0),
                "price_formatted" => format_balance_rub(floatval($item["unit_price"] ?? $item["price"] ?? 0))
            ];
        }, $order["items"] ?? [])
    ];
}, $orders);

json_response([
    "ok" => true,
    "orders" => $formatted,
    "count" => count($formatted)
]);
