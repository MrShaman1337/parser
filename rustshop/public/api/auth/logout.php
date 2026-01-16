<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    json_response(["error" => "Method not allowed"], 405);
}

rate_limit("steam_logout", 20, 60);
user_logout();
json_response(["ok" => true]);
