<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

require_login();

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    json_response(["error" => "Method not allowed"], 405);
}

$input = read_input();
$csrfToken = $input["csrf_token"] ?? null;
validate_csrf($csrfToken);

$userId = isset($input["user_id"]) ? intval($input["user_id"]) : 0;
$amount = isset($input["amount"]) ? floatval($input["amount"]) : 0;
$description = sanitize_text($input["description"] ?? "");

if ($userId <= 0) {
    json_response(["error" => "Invalid user ID"], 400);
}

if ($amount == 0) {
    json_response(["error" => "Amount cannot be zero"], 400);
}

$user = get_user_by_id($userId);
if (!$user) {
    json_response(["error" => "User not found"], 404);
}

$adminId = $_SESSION["admin_id"] ?? null;
$type = $amount > 0 ? "admin_credit" : "admin_debit";
$desc = $description ?: ($amount > 0 ? "Начисление от администратора" : "Списание администратором");

$success = add_user_balance($userId, $amount, $type, $desc, $adminId);

if (!$success) {
    json_response(["error" => "Failed to update balance"], 500);
}

$updatedUser = get_user_by_id($userId);

json_response([
    "ok" => true,
    "user" => [
        "id" => $updatedUser["id"],
        "steam_nickname" => $updatedUser["steam_nickname"],
        "balance" => floatval($updatedUser["balance"])
    ],
    "message" => $amount > 0 
        ? "Баланс пополнен на " . format_balance_rub($amount)
        : "Списано " . format_balance_rub(abs($amount))
]);
