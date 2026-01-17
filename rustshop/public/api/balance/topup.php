<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

// This endpoint returns available top-up options
// Actual payment processing would integrate with payment gateway

start_session();
ensure_auth_db();

if (empty($_SESSION["user_id"])) {
    json_response(["error" => "Unauthorized"], 401);
}

$userId = (int)$_SESSION["user_id"];
$user = get_user_by_id($userId);

if (!$user) {
    json_response(["error" => "User not found"], 404);
}

// Available top-up amounts in RUB
$options = [
    ["amount" => 100, "label" => "100 ₽", "usd" => "~$1.11"],
    ["amount" => 250, "label" => "250 ₽", "usd" => "~$2.78"],
    ["amount" => 500, "label" => "500 ₽", "usd" => "~$5.56"],
    ["amount" => 1000, "label" => "1 000 ₽", "usd" => "~$11.11"],
    ["amount" => 2500, "label" => "2 500 ₽", "usd" => "~$27.78"],
    ["amount" => 5000, "label" => "5 000 ₽", "usd" => "~$55.56"],
    ["amount" => 10000, "label" => "10 000 ₽", "usd" => "~$111.11"],
];

$balance = floatval($user["balance"] ?? 0);

json_response([
    "ok" => true,
    "balance" => $balance,
    "balance_formatted" => format_balance_rub($balance),
    "balance_formatted_usd" => format_balance_with_usd($balance),
    "options" => $options,
    "currency" => "RUB",
    "rate" => 90.0,
    "payment_methods" => [
        ["id" => "card", "name" => "Банковская карта", "name_en" => "Credit/Debit Card"],
        ["id" => "sbp", "name" => "СБП", "name_en" => "SBP (Fast Payments)"],
    ]
]);
