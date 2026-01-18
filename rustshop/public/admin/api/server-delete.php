<?php
/**
 * POST /admin/api/server-delete.php - Delete a server
 */
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

require_login(true);
require_admin_role(["admin", "superadmin"]);

$data = read_input();
validate_csrf($data["csrf_token"] ?? null);

$id = sanitize_text($data["id"] ?? "");
if (empty($id)) {
    json_response(["error" => "Server ID required"], 400);
}

$success = delete_server($id);

json_response(["ok" => $success]);
