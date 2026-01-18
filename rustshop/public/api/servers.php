<?php
/**
 * GET /api/servers.php - Get list of active servers
 * Query params: region (eu/ru)
 */
declare(strict_types=1);
require_once dirname(__DIR__, 2) . "/server/helpers.php";

init_db();

$region = sanitize_text($_GET["region"] ?? "eu") ?: "eu";
$servers = get_servers($region, false);

// Format for frontend (hide sensitive data)
$formatted = array_map(function($server) {
    $percent = $server["max_players"] > 0 
        ? round(($server["current_players"] / $server["max_players"]) * 100) 
        : 0;
    
    return [
        "id" => $server["id"],
        "name" => $server["name"],
        "description" => $server["description"],
        "ip" => $server["ip_address"] . ":" . $server["port"],
        "current_players" => intval($server["current_players"]),
        "max_players" => intval($server["max_players"]),
        "fill_percent" => $percent,
        "map" => $server["map_name"],
        "region" => $server["region"],
        "is_online" => !empty($server["last_query_at"]) && 
            (strtotime($server["last_query_at"]) > time() - 120) // Online if updated within 2 min
    ];
}, $servers);

json_response([
    "ok" => true,
    "servers" => $formatted,
    "count" => count($formatted)
]);
