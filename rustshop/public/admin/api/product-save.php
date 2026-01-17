<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

require_login(true);
require_admin_role(["admin", "superadmin"]);
rate_limit("product_save", 20, 60);

$data = read_input();
validate_csrf($data["csrf_token"] ?? null);

$data["region"] = sanitize_text($data["region"] ?? "eu") ?: "eu";
$id = sanitize_text($data["id"] ?? "");
$product = $id ? upsert_product($data, $id) : upsert_product($data);

json_response(["ok" => true, "product" => $product]);
