<?php
/**
 * POST /api/rust/heartbeat.php
 * 
 * Rust Plugin API: Server heartbeat - updates player count and online status.
 * Should be called every 30-60 seconds by the plugin.
 */
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

init_db();

$data = read_input();
$providedKey = $data["api_key"] ?? $_GET["api_key"] ?? $_SERVER["HTTP_X_API_KEY"] ?? "";

if (empty($providedKey)) {
    json_response(["error" => "API key required"], 401);
}

// Find server by API key
$server = get_server_by_api_key($providedKey);
if (!$server) {
    json_response(["error" => "Invalid API key"], 401);
}

// Update player count
$currentPlayers = intval($data["current_players"] ?? 0);
$maxPlayers = intval($data["max_players"] ?? $server["max_players"]);
$mapName = sanitize_text($data["map_name"] ?? $server["map_name"]);

$pdo = db();
$stmt = $pdo->prepare("
    UPDATE servers 
    SET current_players = :current_players,
        max_players = :max_players,
        map_name = :map_name,
        last_query_at = :now,
        updated_at = :now
    WHERE id = :id
");
$stmt->execute([
    ":current_players" => $currentPlayers,
    ":max_players" => $maxPlayers,
    ":map_name" => $mapName,
    ":now" => date("c"),
    ":id" => $server["id"]
]);

json_response([
    "ok" => true,
    "server_id" => $server["id"],
    "server_name" => $server["name"]
]);
