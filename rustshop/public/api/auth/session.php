<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

start_session();
if (empty($_SESSION["user_id"])) {
    json_response(["ok" => true, "user" => null]);
}

$user = get_user_by_id((int)$_SESSION["user_id"]);
if (!$user) {
    user_logout();
    json_response(["ok" => true, "user" => null]);
}
if (!empty($user["is_banned"])) {
    user_logout();
    json_response(["error" => "User is banned"], 403);
}

json_response([
    "ok" => true,
    "user" => [
        "id" => (int)$user["id"],
        "steam_id" => $user["steam_id"],
        "nickname" => $user["steam_nickname"],
        "avatar" => $user["steam_avatar"],
        "profile_url" => $user["steam_profile_url"]
    ]
]);
