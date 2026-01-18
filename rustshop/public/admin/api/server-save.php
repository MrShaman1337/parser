<?php
/**
 * POST /admin/api/server-save.php - Create/Update a server
 */
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

require_login(true);
require_admin_role(["admin", "superadmin"]);
rate_limit("server_save", 20, 60);

$data = read_input();
validate_csrf($data["csrf_token"] ?? null);

$id = sanitize_text($data["id"] ?? "");
$server = upsert_server($data, $id ?: null);

json_response(["ok" => true, "server" => $server]);
