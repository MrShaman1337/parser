<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

require_login();

$search = isset($_GET["q"]) ? sanitize_text($_GET["q"]) : null;
$limit = isset($_GET["limit"]) ? intval($_GET["limit"]) : 50;
$offset = isset($_GET["offset"]) ? intval($_GET["offset"]) : 0;

$limit = min(max($limit, 1), 200);
$offset = max($offset, 0);

$users = list_users($limit, $offset, $search);
$total = count_users($search);

json_response([
    "ok" => true,
    "users" => $users,
    "total" => $total,
    "limit" => $limit,
    "offset" => $offset
]);
