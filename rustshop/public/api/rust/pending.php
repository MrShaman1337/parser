<?php
/**
 * GET /api/rust/pending.php?steam_id=76561198XXXXXXXXX&api_key=xxx
 * 
 * Rust Plugin API: Returns pending cart entries for a specific Steam ID.
 * The plugin will poll this endpoint to check for items to deliver.
 * 
 * Now supports multi-server: each server has its own API key.
 * Items are filtered by server_id.
 */
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

init_db();

// Check API key - can be global or server-specific
$env = env_config();
$globalApiKey = $env["RUST_PLUGIN_API_KEY"] ?? "";
$providedKey = $_GET["api_key"] ?? $_SERVER["HTTP_X_API_KEY"] ?? "";

$serverId = null;

// First try server-specific key
if (!empty($providedKey)) {
    $server = get_server_by_api_key($providedKey);
    if ($server) {
        $serverId = $server["id"];
    } elseif ($globalApiKey !== "" && $providedKey !== $globalApiKey) {
        json_response(["error" => "Invalid API key"], 401);
    }
} elseif ($globalApiKey !== "") {
    json_response(["error" => "API key required"], 401);
}

$steamId = sanitize_text($_GET["steam_id"] ?? "");
if (!validate_steam_id($steamId)) {
    json_response(["error" => "Invalid Steam ID format. Must be 17 digits."], 400);
}

// Get entries filtered by server if server-specific key was used
if ($serverId) {
    $entries = get_pending_cart_entries_by_server($steamId, $serverId);
} else {
    $entries = get_pending_cart_entries_by_steam_id($steamId);
}

// Format for plugin
$formatted = array_map(function($entry) {
    return [
        "id" => $entry["id"],
        "steam_id" => $entry["steam_id"],
        "order_id" => $entry["order_id"],
        "product_id" => $entry["product_id"],
        "product_name" => $entry["product_name"],
        "quantity" => intval($entry["quantity"]),
        "rust_command" => $entry["rust_command_template_snapshot"],
        "server_id" => $entry["server_id"] ?? null,
        "created_at" => $entry["created_at"]
    ];
}, $entries);

json_response([
    "ok" => true,
    "steam_id" => $steamId,
    "server_id" => $serverId,
    "entries" => $formatted,
    "count" => count($formatted)
]);
