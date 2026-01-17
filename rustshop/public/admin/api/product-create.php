<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

require_login(true);
require_admin_role(["admin", "superadmin"]);
rate_limit("product_create", 20, 60);

$data = read_input();
validate_csrf($data["csrf_token"] ?? null);

$product = upsert_product($data);
json_response(["ok" => true, "product" => $product]);
