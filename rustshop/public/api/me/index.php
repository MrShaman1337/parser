<?php
/**
 * GET /api/me/index.php (or /api/me)
 * 
 * Returns the authenticated user's profile including Steam ID and balance.
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
$user = get_user_by_id($userId);

if (!$user) {
    json_response(["error" => "User not found", "error_ru" => "Пользователь не найден"], 404);
}

$balance = floatval($user["balance"] ?? 0);

json_response([
    "ok" => true,
    "user" => [
        "id" => $user["id"],
        "steam_id" => $user["steam_id"],
        "nickname" => $user["steam_nickname"],
        "avatar" => $user["steam_avatar"] ?? null,
        "profile_url" => $user["steam_profile_url"] ?? null,
        "balance" => $balance,
        "balance_formatted" => format_balance_rub($balance),
        "balance_usd" => round($balance / 90, 2),
        "created_at" => $user["created_at"] ?? null,
        "last_login_at" => $user["last_login_at"] ?? null
    ]
]);
