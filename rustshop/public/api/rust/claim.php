<?php
/**
 * POST /api/rust/claim.php
 * 
 * Rust Plugin API: Claim all pending entries for a Steam ID.
 * Returns the list of entries and marks them as "delivering".
 * 
 * Request body:
 * {
 *   "steam_id": "76561198XXXXXXXXX"
 * }
 * 
 * Security: This endpoint should be protected by IP whitelist or API key in production.
 */
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    json_response(["error" => "Method not allowed"], 405);
}

// Optional: Check API key for Rust plugin authentication
$env = env_config();
$apiKey = $env["RUST_PLUGIN_API_KEY"] ?? "";
$providedKey = $_GET["api_key"] ?? $_SERVER["HTTP_X_API_KEY"] ?? "";

if ($apiKey !== "" && $providedKey !== $apiKey) {
    json_response(["error" => "Invalid API key"], 401);
}

init_db();

$data = read_input();
$steamId = sanitize_text($data["steam_id"] ?? "");

if (!validate_steam_id($steamId)) {
    json_response(["error" => "Invalid Steam ID format. Must be 17 digits."], 400);
}

$entries = get_pending_cart_entries_by_steam_id($steamId);

if (empty($entries)) {
    json_response([
        "ok" => true,
        "steam_id" => $steamId,
        "entries" => [],
        "count" => 0,
        "message" => "No pending items to claim"
    ]);
}

// Mark all as "delivering"
$claimedEntries = [];
foreach ($entries as $entry) {
    update_cart_entry_status($entry["id"], "delivering");
    $claimedEntries[] = [
        "id" => $entry["id"],
        "steam_id" => $entry["steam_id"],
        "order_id" => $entry["order_id"],
        "product_id" => $entry["product_id"],
        "product_name" => $entry["product_name"],
        "quantity" => intval($entry["quantity"]),
        "rust_command" => $entry["rust_command_template_snapshot"]
    ];
}

json_response([
    "ok" => true,
    "steam_id" => $steamId,
    "entries" => $claimedEntries,
    "count" => count($claimedEntries),
    "message" => "Items claimed and marked as delivering"
]);
