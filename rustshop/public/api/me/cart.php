<?php
/**
 * GET /api/me/cart.php
 * 
 * Returns the authenticated user's cart entries (pending delivery items).
 * This shows what items are waiting to be delivered in-game by the Rust plugin.
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

// Optional status filter
$status = isset($_GET["status"]) ? sanitize_text($_GET["status"]) : null;
$validStatuses = ["pending", "delivering", "delivered", "failed", "cancelled", null];
if (!in_array($status, $validStatuses, true)) {
    $status = null;
}

$limit = min(200, max(1, intval($_GET["limit"] ?? 100)));
$entries = get_user_cart_entries($userId, $status, $limit);

// Format for frontend
$formatted = array_map(function($entry) {
    return [
        "id" => $entry["id"],
        "order_id" => $entry["order_id"],
        "product_id" => $entry["product_id"],
        "product_name" => $entry["product_name"],
        "quantity" => intval($entry["quantity"]),
        "status" => $entry["status"],
        "attempt_count" => intval($entry["attempt_count"]),
        "last_error" => $entry["last_error"],
        "created_at" => $entry["created_at"],
        "delivered_at" => $entry["delivered_at"],
        "status_label" => get_cart_entry_status_label($entry["status"])
    ];
}, $entries);

// Count by status
$pending = count(array_filter($formatted, fn($e) => $e["status"] === "pending"));
$delivered = count(array_filter($formatted, fn($e) => $e["status"] === "delivered"));
$failed = count(array_filter($formatted, fn($e) => $e["status"] === "failed"));

json_response([
    "ok" => true,
    "entries" => $formatted,
    "count" => count($formatted),
    "summary" => [
        "pending" => $pending,
        "delivered" => $delivered,
        "failed" => $failed
    ]
]);

function get_cart_entry_status_label(string $status): array
{
    $labels = [
        "pending" => ["en" => "Pending delivery", "ru" => "Ожидает доставки"],
        "delivering" => ["en" => "Delivering...", "ru" => "Доставляется..."],
        "delivered" => ["en" => "Delivered", "ru" => "Доставлено"],
        "failed" => ["en" => "Delivery failed", "ru" => "Ошибка доставки"],
        "cancelled" => ["en" => "Cancelled", "ru" => "Отменено"]
    ];
    return $labels[$status] ?? ["en" => $status, "ru" => $status];
}
