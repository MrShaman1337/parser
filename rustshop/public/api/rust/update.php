<?php
/**
 * POST /api/rust/update.php
 * 
 * Rust Plugin API: Update cart entry status after delivery attempt.
 * 
 * Request body:
 * {
 *   "entry_id": "CE-XXXXXXXXXXXX",
 *   "status": "delivered" | "failed" | "delivering",
 *   "error": "optional error message for failed status"
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

$entryId = sanitize_text($data["entry_id"] ?? "");
$status = sanitize_text($data["status"] ?? "");
$error = isset($data["error"]) ? sanitize_text($data["error"]) : null;

if ($entryId === "") {
    json_response(["error" => "entry_id is required"], 400);
}

$validStatuses = ["delivering", "delivered", "failed"];
if (!in_array($status, $validStatuses, true)) {
    json_response(["error" => "Invalid status. Must be one of: delivering, delivered, failed"], 400);
}

$updated = update_cart_entry_status($entryId, $status, $error);

if (!$updated) {
    json_response(["error" => "Failed to update entry. Entry may not exist."], 404);
}

json_response([
    "ok" => true,
    "entry_id" => $entryId,
    "new_status" => $status
]);
