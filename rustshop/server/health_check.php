<?php
declare(strict_types=1);

require_once __DIR__ . "/helpers.php";

function table_exists(PDO $pdo, string $table): bool
{
    $stmt = $pdo->prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = :name");
    $stmt->execute([":name" => $table]);
    return (bool)$stmt->fetchColumn();
}

$requiredFiles = [
    __DIR__ . "/helpers.php",
    __DIR__ . "/admin.config.php",
    __DIR__ . "/env.php",
    __DIR__ . "/../public/api/auth/steam-login.php",
    __DIR__ . "/../public/api/auth/steam-callback.php",
    __DIR__ . "/../public/api/auth/session.php",
    __DIR__ . "/../public/api/auth/logout.php",
    __DIR__ . "/../public/api/stats.php",
    __DIR__ . "/../public/api/featured-drop.php",
    __DIR__ . "/../public/api/products.php",
    __DIR__ . "/../public/api/support/send.php",
    __DIR__ . "/../public/api/order-create.php",
    __DIR__ . "/../public/admin/api/login.php",
    __DIR__ . "/../public/admin/api/session.php",
    __DIR__ . "/../public/admin/api/logout.php",
    __DIR__ . "/../public/admin/api/featured-drop.php"
];

$checks = [
    "files" => [],
    "store_db" => [],
    "auth_db" => [],
    "steam" => []
];

$ok = true;
foreach ($requiredFiles as $file) {
    $exists = file_exists($file);
    $checks["files"][basename($file)] = $exists;
    if (!$exists) {
        $ok = false;
    }
}

$dataDir = ensure_data_dir();
$checks["store_db"]["data_dir_writable"] = is_writable($dataDir);
$checks["store_db"]["path"] = db_path();
$checks["store_db"]["file_writable"] = is_writable($checks["store_db"]["path"]);

try {
    init_db();
    $pdo = db();
$tables = ["orders", "site_stats", "featured_drop", "products"];
    foreach ($tables as $table) {
        $checks["store_db"]["tables"][$table] = table_exists($pdo, $table);
        if (!$checks["store_db"]["tables"][$table]) {
            $ok = false;
        }
    }
} catch (Throwable $e) {
    $checks["store_db"]["error"] = $e->getMessage();
    $ok = false;
}

$checks["auth_db"]["path"] = auth_db_path();
$checks["auth_db"]["file_writable"] = is_writable($checks["auth_db"]["path"]);
try {
    ensure_auth_db();
    $pdo = auth_db();
    $tables = ["users", "admins"];
    foreach ($tables as $table) {
        $checks["auth_db"]["tables"][$table] = table_exists($pdo, $table);
        if (!$checks["auth_db"]["tables"][$table]) {
            $ok = false;
        }
    }
} catch (Throwable $e) {
    $checks["auth_db"]["error"] = $e->getMessage();
    $ok = false;
}

$checks["steam"]["api_key_configured"] = steam_api_key() !== "";
if (!$checks["steam"]["api_key_configured"]) {
    $ok = false;
}

json_response([
    "ok" => $ok,
    "checks" => $checks
], $ok ? 200 : 500);
