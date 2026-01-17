<?php
/**
 * GET /api/rust/pending.php?steam_id=76561198XXXXXXXXX
 * 
 * Rust Plugin API: Returns pending cart entries for a specific Steam ID.
 * The plugin will poll this endpoint to check for items to deliver.
 * 
 * Security: This endpoint should be protected by IP whitelist or API key in production.
 */
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

// Optional: Check API key for Rust plugin authentication
$env = env_config();
$apiKey = $env["RUST_PLUGIN_API_KEY"] ?? "";
$providedKey = $_GET["api_key"] ?? $_SERVER["HTTP_X_API_KEY"] ?? "";

if ($apiKey !== "" && $providedKey !== $apiKey) {
    json_response(["error" => "Invalid API key"], 401);
}

init_db();

$steamId = sanitize_text($_GET["steam_id"] ?? "");
if (!validate_steam_id($steamId)) {
    json_response(["error" => "Invalid Steam ID format. Must be 17 digits."], 400);
}

$entries = get_pending_cart_entries_by_steam_id($steamId);

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
        "created_at" => $entry["created_at"]
    ];
}, $entries);

json_response([
    "ok" => true,
    "steam_id" => $steamId,
    "entries" => $formatted,
    "count" => count($formatted)
]);
