<?php
declare(strict_types=1);
require_once __DIR__ . "/helpers.php";

if (php_sapi_name() !== "cli") {
    echo "CLI only.\n";
    exit(1);
}

[$script, $username, $password, $role] = array_pad($argv, 4, "");
if (!$username || !$password) {
    echo "Usage: php server/create_admin.php <username> <password> [role]\n";
    echo "Roles: superadmin, admin, editor\n";
    exit(1);
}

$role = $role ?: "admin";
$allowed = ["superadmin", "admin", "editor"];
if (!in_array($role, $allowed, true)) {
    echo "Invalid role. Allowed: superadmin, admin, editor\n";
    exit(1);
}

ensure_auth_db();
$existing = get_admin_by_username($username);
if ($existing) {
    echo "Admin already exists.\n";
    exit(1);
}

$pdo = auth_db();
$stmt = $pdo->prepare("
    INSERT INTO admins (username, password_hash, role, created_at, is_active)
    VALUES (:username, :password_hash, :role, :created_at, :is_active)
");
$stmt->execute([
    "username" => $username,
    "password_hash" => password_hash($password, PASSWORD_DEFAULT),
    "role" => $role,
    "created_at" => date("c"),
    "is_active" => 1
]);

echo "Admin created: {$username} ({$role})\n";
