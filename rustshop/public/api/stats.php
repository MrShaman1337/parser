<?php
declare(strict_types=1);
require_once dirname(__DIR__, 2) . "/server/helpers.php";

init_db();

$cache = cache_get("stats", 20);
if ($cache) {
    cached_json_response($cache["data"], 20, $cache["mtime"]);
}

$data = [
    "orders_delivered" => get_site_stat("orders_delivered", 214),
    "active_players" => get_site_stat("active_players", 23)
];
cache_set("stats", $data);
cached_json_response($data, 20, time());
