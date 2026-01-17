<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

start_session();
ensure_auth_db();

if (empty($_SESSION["user_id"])) {
    json_response(["error" => "Unauthorized"], 401);
}

$userId = (int)$_SESSION["user_id"];
$limit = isset($_GET["limit"]) ? min(intval($_GET["limit"]), 100) : 50;

$transactions = get_balance_transactions($userId, $limit);

// Format transactions
$formatted = array_map(function ($tx) {
    $amount = floatval($tx["amount"]);
    return [
        "id" => (int)$tx["id"],
        "amount" => $amount,
        "amount_formatted" => ($amount >= 0 ? "+" : "") . format_balance_rub($amount),
        "type" => $tx["type"],
        "description" => $tx["description"],
        "created_at" => $tx["created_at"],
        "is_credit" => $amount > 0
    ];
}, $transactions);

$user = get_user_by_id($userId);
$balance = floatval($user["balance"] ?? 0);

json_response([
    "ok" => true,
    "balance" => $balance,
    "balance_formatted" => format_balance_rub($balance),
    "transactions" => $formatted
]);
