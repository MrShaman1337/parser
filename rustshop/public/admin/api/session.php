<?php
declare(strict_types=1);
require_once __DIR__ . "/../../../server/helpers.php";

start_session();
if (empty($_SESSION["admin_logged_in"])) {
    json_response(["ok" => false], 401);
}

json_response([
    "ok" => true,
    "user" => $_SESSION["admin_user"] ?? "admin",
    "csrf_token" => csrf_token(),
    "featured_limit" => config()["featured_limit"] ?? 8
]);
