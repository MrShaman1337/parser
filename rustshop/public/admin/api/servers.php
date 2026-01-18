<?php
/**
 * GET /admin/api/servers.php - Get all servers for admin
 */
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

require_login(true);
init_db();

$servers = get_all_servers(true); // Include inactive

json_response([
    "ok" => true,
    "servers" => $servers
]);
