<?php
declare(strict_types=1);
require_once dirname(__DIR__, 3) . "/server/helpers.php";

admin_logout();
json_response(["ok" => true]);
