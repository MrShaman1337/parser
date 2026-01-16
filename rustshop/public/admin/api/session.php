<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

start_session();
if (empty($_SESSION["admin_id"])) {
    json_response(["error" => "Unauthorized"], 401);
}

json_response([
    "ok" => true,
    "user" => $_SESSION["admin_username"] ?? "admin",
    "role" => $_SESSION["admin_role"] ?? "admin",
    "csrf_token" => csrf_token(),
    "featured_limit" => config()["featured_limit"] ?? 8
]);
