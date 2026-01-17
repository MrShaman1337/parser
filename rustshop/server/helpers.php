<?php
declare(strict_types=1);

function config(): array
{
    static $config;
    if (!$config) {
        $config = require __DIR__ . "/admin.config.php";
    }
    return $config;
}

function env_config(): array
{
    static $env;
    if ($env === null) {
        $path = __DIR__ . "/env.php";
        $env = file_exists($path) ? (require $path) : [];
    }
    return is_array($env) ? $env : [];
}

function start_session(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        $secure = (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off");
        session_set_cookie_params([
            "httponly" => true,
            "samesite" => "Lax",
            "secure" => $secure
        ]);
        session_start();
    }
}

function destroy_session(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        return;
    }
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), "", time() - 42000, $params["path"], $params["domain"], $params["secure"], $params["httponly"]);
    }
    session_destroy();
}

function json_response($data, int $status = 200): void
{
    http_response_code($status);
    header("Content-Type: application/json; charset=utf-8");
    if (is_array($data) && isset($data["error"]) && !array_key_exists("ok", $data)) {
        $data = ["ok" => false] + $data;
    }
    if (is_array($data) && isset($data["error"]) && $status >= 500) {
        error_log("api_error: " . $data["error"]);
    }
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

function require_login(bool $api = true): void
{
    start_session();
    if (empty($_SESSION["admin_id"])) {
        if ($api) {
            json_response(["error" => "Unauthorized"], 401);
        }
        header("Location: /admin/login.html");
        exit;
    }
}

function require_admin_role(array $roles): void
{
    require_login(true);
    $role = $_SESSION["admin_role"] ?? "";
    if (!in_array($role, $roles, true)) {
        json_response(["error" => "Forbidden"], 403);
    }
}

function csrf_token(): string
{
    start_session();
    if (empty($_SESSION["csrf_token"])) {
        $_SESSION["csrf_token"] = bin2hex(random_bytes(32));
    }
    return $_SESSION["csrf_token"];
}

function validate_csrf(?string $token): void
{
    start_session();
    if (!$token || empty($_SESSION["csrf_token"]) || !hash_equals($_SESSION["csrf_token"], $token)) {
        json_response(["error" => "Invalid CSRF token"], 403);
    }
}

function rate_limit(string $key, int $max = 5, int $window = 60): void
{
    $ip = $_SERVER["REMOTE_ADDR"] ?? "unknown";
    $bucket = preg_replace("/[^a-z0-9_-]/i", "_", $key . "_" . $ip);
    $dir = realpath(__DIR__ . "/data/ratelimits") ?: (__DIR__ . "/data/ratelimits");
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    $file = $dir . "/" . $bucket . ".json";
    $now = time();
    $data = [];
    if (file_exists($file)) {
        $raw = file_get_contents($file);
        $data = json_decode($raw, true) ?: [];
    }
    $data = array_filter($data, function ($ts) use ($now, $window) {
        return ($now - $ts) < $window;
    });
    if (count($data) >= $max) {
        json_response(["error" => "Too many requests"], 429);
    }
    $data[] = $now;
    file_put_contents($file, json_encode(array_values($data)));
}

function read_input(): array
{
    $contentType = $_SERVER["CONTENT_TYPE"] ?? "";
    if (strpos($contentType, "application/json") !== false) {
        $raw = file_get_contents("php://input");
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }
    return $_POST ?? [];
}

function data_path(): string
{
    return realpath(__DIR__ . "/../public/data") ?: (__DIR__ . "/../public/data");
}

function ensure_data_dir(): string
{
    $dir = realpath(__DIR__ . "/data") ?: (__DIR__ . "/data");
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    @chmod($dir, 0755);
    return $dir;
}

function ensure_file_permissions(string $path): void
{
    if (file_exists($path)) {
        @chmod($path, 0664);
    }
}

function products_path(): string
{
    return data_path() . "/products.json";
}

function db_path(): string
{
    $dir = ensure_data_dir();
    $path = $dir . "/store.sqlite";
    if (!file_exists($path)) {
        @touch($path);
    }
    ensure_file_permissions($path);
    return $path;
}

function auth_db_path(): string
{
    $dir = ensure_data_dir();
    $path = $dir . "/auth.sqlite";
    if (!file_exists($path)) {
        @touch($path);
    }
    ensure_file_permissions($path);
    return $path;
}

function auth_db(): PDO
{
    static $pdo;
    if (!$pdo) {
        $pdo = new PDO("sqlite:" . auth_db_path());
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->exec("PRAGMA journal_mode = WAL;");
        $pdo->exec("PRAGMA foreign_keys = ON;");
    }
    return $pdo;
}

function init_auth_db(): void
{
    $pdo = auth_db();
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            steam_id TEXT UNIQUE NOT NULL,
            steam_nickname TEXT NOT NULL,
            steam_avatar TEXT,
            steam_profile_url TEXT,
            balance REAL NOT NULL DEFAULT 0,
            created_at TEXT,
            last_login_at TEXT,
            is_banned INTEGER DEFAULT 0
        );
    ");
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at TEXT,
            last_login_at TEXT,
            is_active INTEGER DEFAULT 1
        );
    ");
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS balance_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL,
            description TEXT,
            admin_id INTEGER,
            created_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    ");
    $pdo->exec("CREATE INDEX IF NOT EXISTS users_last_login_idx ON users(last_login_at);");
    $pdo->exec("CREATE INDEX IF NOT EXISTS balance_tx_user_idx ON balance_transactions(user_id);");
    
    // Migration: add balance column if not exists
    $columns = $pdo->query("PRAGMA table_info(users)")->fetchAll(PDO::FETCH_ASSOC);
    $columnNames = array_map(function ($col) {
        return $col["name"] ?? "";
    }, $columns);
    if (!in_array("balance", $columnNames, true)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN balance REAL NOT NULL DEFAULT 0");
    }
}

function base_url(): string
{
    $https = (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off");
    $scheme = $https ? "https" : "http";
    $host = $_SERVER["HTTP_HOST"] ?? "localhost";
    return $scheme . "://" . $host;
}

function steam_api_key(): string
{
    $env = env_config();
    return trim((string)($env["steam_api_key"] ?? ""));
}

function steam_openid_endpoint(): string
{
    return "https://steamcommunity.com/openid/login";
}

function db(): PDO
{
    static $pdo;
    if (!$pdo) {
        $pdo = new PDO("sqlite:" . db_path());
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->exec("PRAGMA journal_mode = WAL;");
        $pdo->exec("PRAGMA foreign_keys = ON;");
    }
    return $pdo;
}

function init_db(): void
{
    $pdo = db();
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            created_at TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'new',
            customer_email TEXT NOT NULL,
            customer_name TEXT,
            customer_note TEXT,
            items_json TEXT NOT NULL,
            subtotal REAL NOT NULL,
            total REAL NOT NULL,
            currency TEXT NOT NULL DEFAULT 'USD',
            ip TEXT,
            user_agent TEXT
        );
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS site_stats (
            key TEXT PRIMARY KEY,
            value INTEGER NOT NULL
        );
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS featured_drop (
            id INTEGER PRIMARY KEY,
            product_id TEXT,
            title TEXT,
            subtitle TEXT,
            cta_text TEXT,
            old_price REAL,
            price REAL NOT NULL DEFAULT 0,
            is_enabled INTEGER DEFAULT 1,
            updated_at TEXT
        );
    ");

    // Add user_id and steam_id to orders if not exists
    $orderColumns = $pdo->query("PRAGMA table_info(orders)")->fetchAll(PDO::FETCH_ASSOC);
    $orderColumnNames = array_map(function ($col) {
        return $col["name"] ?? "";
    }, $orderColumns);
    if (!in_array("user_id", $orderColumnNames, true)) {
        $pdo->exec("ALTER TABLE orders ADD COLUMN user_id INTEGER");
    }
    if (!in_array("steam_id", $orderColumnNames, true)) {
        $pdo->exec("ALTER TABLE orders ADD COLUMN steam_id TEXT");
    }
    if (!in_array("payment_provider", $orderColumnNames, true)) {
        $pdo->exec("ALTER TABLE orders ADD COLUMN payment_provider TEXT");
    }
    if (!in_array("payment_reference", $orderColumnNames, true)) {
        $pdo->exec("ALTER TABLE orders ADD COLUMN payment_reference TEXT");
    }

    // Create order_items table for detailed purchase history
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS order_items (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            product_name TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            unit_price REAL NOT NULL,
            rust_command_template_snapshot TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id)
        );
    ");
    $pdo->exec("CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);");

    // Create cart_entries table for Rust plugin to read
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS cart_entries (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            steam_id TEXT NOT NULL,
            order_id TEXT,
            product_id TEXT NOT NULL,
            product_name TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            rust_command_template_snapshot TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            attempt_count INTEGER NOT NULL DEFAULT 0,
            last_error TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            delivered_at TEXT,
            FOREIGN KEY (order_id) REFERENCES orders(id)
        );
    ");
    $pdo->exec("CREATE INDEX IF NOT EXISTS cart_entries_steam_status_idx ON cart_entries(steam_id, status);");
    $pdo->exec("CREATE INDEX IF NOT EXISTS cart_entries_status_created_idx ON cart_entries(status, created_at);");
    $pdo->exec("CREATE INDEX IF NOT EXISTS cart_entries_user_idx ON cart_entries(user_id);");

    $pdo->exec("CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);");
    $pdo->exec("CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at);");
    $pdo->exec("CREATE INDEX IF NOT EXISTS orders_email_idx ON orders(customer_email);");
    $pdo->exec("CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id);");

    $pdo->beginTransaction();
    $stmt = $pdo->prepare("INSERT OR IGNORE INTO site_stats (key, value) VALUES (:key, :value)");
    $stmt->execute(["key" => "orders_delivered", "value" => 214]);
    $stmt->execute(["key" => "active_players", "value" => 23]);
    $stmt = $pdo->prepare("INSERT OR IGNORE INTO featured_drop (id, cta_text, is_enabled, updated_at) VALUES (1, 'Add VIP', 0, :updated_at)");
    $stmt->execute(["updated_at" => date("c")]);
    $pdo->commit();
}

function get_site_stat(string $key, int $default = 0): int
{
    $pdo = db();
    $stmt = $pdo->prepare("SELECT value FROM site_stats WHERE key = :key LIMIT 1");
    $stmt->execute(["key" => $key]);
    $value = $stmt->fetchColumn();
    return $value !== false ? intval($value) : $default;
}

function increment_site_stat(string $key, int $amount = 1): void
{
    $pdo = db();
    $pdo->beginTransaction();
    $stmt = $pdo->prepare("UPDATE site_stats SET value = value + :amount WHERE key = :key");
    $stmt->execute(["amount" => $amount, "key" => $key]);
    if ($stmt->rowCount() === 0) {
        $stmt = $pdo->prepare("INSERT INTO site_stats (key, value) VALUES (:key, :value)");
        $stmt->execute(["key" => $key, "value" => max(0, $amount)]);
    }
    $pdo->commit();
    cache_bust("stats");
}

function get_featured_drop(): ?array
{
    $pdo = db();
    $stmt = $pdo->prepare("SELECT * FROM featured_drop WHERE id = 1 LIMIT 1");
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function save_featured_drop(array $data): array
{
    $pdo = db();
    $now = date("c");
    $stmt = $pdo->prepare("
        INSERT INTO featured_drop (id, product_id, title, subtitle, cta_text, old_price, price, is_enabled, updated_at)
        VALUES (1, :product_id, :title, :subtitle, :cta_text, :old_price, :price, :is_enabled, :updated_at)
        ON CONFLICT(id) DO UPDATE SET
            product_id = excluded.product_id,
            title = excluded.title,
            subtitle = excluded.subtitle,
            cta_text = excluded.cta_text,
            old_price = excluded.old_price,
            price = excluded.price,
            is_enabled = excluded.is_enabled,
            updated_at = excluded.updated_at
    ");
    $stmt->execute([
        "product_id" => $data["product_id"] ?? null,
        "title" => $data["title"] ?? null,
        "subtitle" => $data["subtitle"] ?? null,
        "cta_text" => $data["cta_text"] ?? "Add VIP",
        "old_price" => $data["old_price"] ?? null,
        "price" => $data["price"] ?? 0,
        "is_enabled" => $data["is_enabled"] ?? 0,
        "updated_at" => $now
    ]);
    $saved = get_featured_drop();
    cache_bust("featured_drop");
    return $saved ?: ($data + ["updated_at" => $now]);
}

function cache_dir(): string
{
    $dir = realpath(__DIR__ . "/cache") ?: (__DIR__ . "/cache");
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir;
}

function cache_path(string $key): string
{
    $safe = preg_replace("/[^a-z0-9_-]/i", "_", $key);
    return cache_dir() . "/" . $safe . ".json";
}

function cache_get(string $key, int $ttl): ?array
{
    $path = cache_path($key);
    if (!file_exists($path)) {
        return null;
    }
    $mtime = filemtime($path);
    if ($mtime === false || (time() - $mtime) > $ttl) {
        return null;
    }
    $raw = file_get_contents($path);
    if ($raw === false) {
        return null;
    }
    $data = json_decode($raw, true);
    return is_array($data) ? ["data" => $data, "mtime" => $mtime] : null;
}

function cache_set(string $key, array $data): void
{
    $path = cache_path($key);
    $tmp = $path . ".tmp";
    file_put_contents($tmp, json_encode($data), LOCK_EX);
    rename($tmp, $path);
}

function cache_bust(string $key): void
{
    $path = cache_path($key);
    if (file_exists($path)) {
        @unlink($path);
    }
}

function conditional_not_modified(string $etag, int $lastModified): bool
{
    $ifNoneMatch = trim($_SERVER["HTTP_IF_NONE_MATCH"] ?? "");
    if ($ifNoneMatch && $ifNoneMatch === $etag) {
        http_response_code(304);
        return true;
    }
    $ifModifiedSince = $_SERVER["HTTP_IF_MODIFIED_SINCE"] ?? "";
    if ($ifModifiedSince) {
        $since = strtotime($ifModifiedSince);
        if ($since !== false && $since >= $lastModified) {
            http_response_code(304);
            return true;
        }
    }
    return false;
}

function cached_json_response(array $data, int $maxAge, int $lastModified, ?string $etagSeed = null): void
{
    $etag = "\"" . sha1($etagSeed ?? json_encode($data)) . "\"";
    header("ETag: " . $etag);
    header("Last-Modified: " . gmdate("D, d M Y H:i:s", $lastModified) . " GMT");
    header("Cache-Control: public, max-age=" . $maxAge);
    if (conditional_not_modified($etag, $lastModified)) {
        exit;
    }
    json_response($data);
}

function ensure_auth_db(): void
{
    static $initialized = false;
    if (!$initialized) {
        init_auth_db();
        $initialized = true;
    }
}

function admin_login(array $admin): void
{
    start_session();
    session_regenerate_id(true);
    $_SESSION["admin_id"] = $admin["id"];
    $_SESSION["admin_username"] = $admin["username"];
    $_SESSION["admin_role"] = $admin["role"];
}

function admin_logout(): void
{
    start_session();
    unset($_SESSION["admin_id"], $_SESSION["admin_username"], $_SESSION["admin_role"]);
    destroy_session();
}

function user_login(array $user): void
{
    start_session();
    session_regenerate_id(true);
    $_SESSION["user_id"] = $user["id"];
    $_SESSION["steam_id"] = $user["steam_id"];
}

function user_logout(): void
{
    start_session();
    unset($_SESSION["user_id"], $_SESSION["steam_id"]);
    destroy_session();
}

function get_admin_by_username(string $username): ?array
{
    ensure_auth_db();
    $pdo = auth_db();
    $stmt = $pdo->prepare("SELECT * FROM admins WHERE username = :username LIMIT 1");
    $stmt->execute(["username" => $username]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    return $admin ?: null;
}

function get_user_by_steam_id(string $steamId): ?array
{
    ensure_auth_db();
    $pdo = auth_db();
    $stmt = $pdo->prepare("SELECT * FROM users WHERE steam_id = :steam_id LIMIT 1");
    $stmt->execute(["steam_id" => $steamId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    return $user ?: null;
}

function get_user_by_id(int $id): ?array
{
    ensure_auth_db();
    $pdo = auth_db();
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = :id LIMIT 1");
    $stmt->execute(["id" => $id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    return $user ?: null;
}

function upsert_user(string $steamId, array $profile): array
{
    ensure_auth_db();
    $pdo = auth_db();
    $now = date("c");
    $existing = get_user_by_steam_id($steamId);
    $nickname = sanitize_text($profile["steam_nickname"] ?? "");
    $avatar = sanitize_text($profile["steam_avatar"] ?? "");
    $profileUrl = sanitize_text($profile["steam_profile_url"] ?? "");
    if ($existing) {
        $stmt = $pdo->prepare("
            UPDATE users
            SET steam_nickname = :nickname,
                steam_avatar = :avatar,
                steam_profile_url = :profile_url,
                last_login_at = :last_login_at
            WHERE id = :id
        ");
        $stmt->execute([
            "nickname" => $nickname ?: $existing["steam_nickname"],
            "avatar" => $avatar,
            "profile_url" => $profileUrl,
            "last_login_at" => $now,
            "id" => $existing["id"]
        ]);
        return get_user_by_id((int)$existing["id"]) ?: $existing;
    }
    $stmt = $pdo->prepare("
        INSERT INTO users (steam_id, steam_nickname, steam_avatar, steam_profile_url, created_at, last_login_at)
        VALUES (:steam_id, :nickname, :avatar, :profile_url, :created_at, :last_login_at)
    ");
    $stmt->execute([
        "steam_id" => $steamId,
        "nickname" => $nickname ?: "Steam User",
        "avatar" => $avatar,
        "profile_url" => $profileUrl,
        "created_at" => $now,
        "last_login_at" => $now
    ]);
    init_db();
    increment_site_stat("active_players", 1);
    return get_user_by_id((int)$pdo->lastInsertId()) ?: [
        "steam_id" => $steamId,
        "steam_nickname" => $nickname ?: "Steam User",
        "steam_avatar" => $avatar,
        "steam_profile_url" => $profileUrl,
        "created_at" => $now,
        "last_login_at" => $now,
        "is_banned" => 0,
        "balance" => 0
    ];
}

// ============== BALANCE FUNCTIONS ==============

function list_users(int $limit = 100, int $offset = 0, ?string $search = null): array
{
    ensure_auth_db();
    $pdo = auth_db();
    $where = "";
    $params = [];
    if ($search) {
        $where = "WHERE steam_nickname LIKE :search OR steam_id LIKE :search";
        $params[":search"] = "%" . $search . "%";
    }
    $sql = "SELECT id, steam_id, steam_nickname, steam_avatar, balance, created_at, last_login_at, is_banned 
            FROM users $where ORDER BY last_login_at DESC LIMIT :limit OFFSET :offset";
    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(":limit", $limit, PDO::PARAM_INT);
    $stmt->bindValue(":offset", $offset, PDO::PARAM_INT);
    foreach ($params as $key => $val) {
        $stmt->bindValue($key, $val);
    }
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function count_users(?string $search = null): int
{
    ensure_auth_db();
    $pdo = auth_db();
    $where = "";
    $params = [];
    if ($search) {
        $where = "WHERE steam_nickname LIKE :search OR steam_id LIKE :search";
        $params[":search"] = "%" . $search . "%";
    }
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users $where");
    foreach ($params as $key => $val) {
        $stmt->bindValue($key, $val);
    }
    $stmt->execute();
    return (int)$stmt->fetchColumn();
}

function get_user_balance(int $userId): float
{
    $user = get_user_by_id($userId);
    return $user ? floatval($user["balance"] ?? 0) : 0.0;
}

function add_user_balance(int $userId, float $amount, string $type, string $description = "", ?int $adminId = null): bool
{
    if ($amount == 0) {
        return false;
    }
    ensure_auth_db();
    $pdo = auth_db();
    $pdo->beginTransaction();
    try {
        // Update balance
        $stmt = $pdo->prepare("UPDATE users SET balance = balance + :amount WHERE id = :id");
        $stmt->execute([":amount" => $amount, ":id" => $userId]);
        if ($stmt->rowCount() === 0) {
            $pdo->rollBack();
            return false;
        }
        // Log transaction
        $stmt = $pdo->prepare("
            INSERT INTO balance_transactions (user_id, amount, type, description, admin_id, created_at)
            VALUES (:user_id, :amount, :type, :description, :admin_id, :created_at)
        ");
        $stmt->execute([
            ":user_id" => $userId,
            ":amount" => $amount,
            ":type" => $type,
            ":description" => $description,
            ":admin_id" => $adminId,
            ":created_at" => date("c")
        ]);
        $pdo->commit();
        return true;
    } catch (Exception $e) {
        $pdo->rollBack();
        return false;
    }
}

function deduct_user_balance(int $userId, float $amount, string $description = ""): bool
{
    if ($amount <= 0) {
        return false;
    }
    $balance = get_user_balance($userId);
    if ($balance < $amount) {
        return false;
    }
    return add_user_balance($userId, -$amount, "purchase", $description);
}

function get_balance_transactions(int $userId, int $limit = 50): array
{
    ensure_auth_db();
    $pdo = auth_db();
    $stmt = $pdo->prepare("
        SELECT * FROM balance_transactions 
        WHERE user_id = :user_id 
        ORDER BY created_at DESC 
        LIMIT :limit
    ");
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->bindValue(":limit", $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function format_balance_rub(float $amount): string
{
    return number_format($amount, 2, ",", " ") . " ₽";
}

function format_balance_with_usd(float $amountRub, float $rate = 90.0): string
{
    $rub = format_balance_rub($amountRub);
    $usd = $amountRub / $rate;
    return $rub . " (~$" . number_format($usd, 2) . ")";
}

// ============== END BALANCE FUNCTIONS ==============

// ============== CART ENTRIES (RUST PLUGIN DELIVERY) FUNCTIONS ==============

/**
 * Create cart entries for a paid order. Called after successful payment.
 * These entries will be read by the Rust plugin for in-game delivery.
 */
function create_cart_entries_for_order(string $orderId, int $userId, string $steamId, array $orderItems): array
{
    init_db();
    $pdo = db();
    $now = date("c");
    $entries = [];

    foreach ($orderItems as $item) {
        $entryId = "CE-" . strtoupper(bin2hex(random_bytes(6)));
        $stmt = $pdo->prepare("
            INSERT INTO cart_entries (
                id, user_id, steam_id, order_id, product_id, product_name, quantity,
                rust_command_template_snapshot, status, attempt_count, created_at, updated_at
            ) VALUES (
                :id, :user_id, :steam_id, :order_id, :product_id, :product_name, :quantity,
                :rust_command, :status, 0, :created_at, :updated_at
            )
        ");
        $stmt->execute([
            ":id" => $entryId,
            ":user_id" => $userId,
            ":steam_id" => $steamId,
            ":order_id" => $orderId,
            ":product_id" => $item["product_id"] ?? $item["id"] ?? "",
            ":product_name" => $item["product_name"] ?? $item["name"] ?? "Item",
            ":quantity" => intval($item["qty"] ?? $item["quantity"] ?? 1),
            ":rust_command" => $item["rust_command_template_snapshot"] ?? "",
            ":status" => "pending",
            ":created_at" => $now,
            ":updated_at" => $now
        ]);
        $entries[] = [
            "id" => $entryId,
            "product_id" => $item["product_id"] ?? $item["id"] ?? "",
            "product_name" => $item["product_name"] ?? $item["name"] ?? "Item",
            "quantity" => intval($item["qty"] ?? $item["quantity"] ?? 1),
            "status" => "pending"
        ];
    }

    return $entries;
}

/**
 * Create order_items records for purchase history.
 */
function create_order_items(string $orderId, array $items): void
{
    init_db();
    $pdo = db();
    $now = date("c");

    $stmt = $pdo->prepare("
        INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, rust_command_template_snapshot, created_at)
        VALUES (:id, :order_id, :product_id, :product_name, :quantity, :unit_price, :rust_command, :created_at)
    ");

    foreach ($items as $item) {
        $itemId = "OI-" . strtoupper(bin2hex(random_bytes(6)));
        $stmt->execute([
            ":id" => $itemId,
            ":order_id" => $orderId,
            ":product_id" => $item["product_id"] ?? $item["id"] ?? "",
            ":product_name" => $item["product_name"] ?? $item["name"] ?? "Item",
            ":quantity" => intval($item["qty"] ?? $item["quantity"] ?? 1),
            ":unit_price" => floatval($item["price"] ?? $item["unit_price"] ?? 0),
            ":rust_command" => $item["rust_command_template_snapshot"] ?? "",
            ":created_at" => $now
        ]);
    }
}

/**
 * Get user's cart entries (pending delivery items).
 */
function get_user_cart_entries(int $userId, ?string $status = null, int $limit = 100): array
{
    init_db();
    $pdo = db();

    $sql = "SELECT * FROM cart_entries WHERE user_id = :user_id";
    $params = [":user_id" => $userId];

    if ($status !== null) {
        $sql .= " AND status = :status";
        $params[":status"] = $status;
    }

    $sql .= " ORDER BY created_at DESC LIMIT :limit";

    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $val) {
        $stmt->bindValue($key, $val);
    }
    $stmt->bindValue(":limit", $limit, PDO::PARAM_INT);
    $stmt->execute();

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Get user's order history with items.
 */
function get_user_orders(int $userId, int $limit = 50): array
{
    init_db();
    $pdo = db();

    $stmt = $pdo->prepare("
        SELECT * FROM orders 
        WHERE user_id = :user_id 
        ORDER BY created_at DESC 
        LIMIT :limit
    ");
    $stmt->bindValue(":user_id", $userId, PDO::PARAM_INT);
    $stmt->bindValue(":limit", $limit, PDO::PARAM_INT);
    $stmt->execute();

    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch items for each order
    $stmtItems = $pdo->prepare("SELECT * FROM order_items WHERE order_id = :order_id ORDER BY created_at ASC");

    foreach ($orders as &$order) {
        $stmtItems->execute([":order_id" => $order["id"]]);
        $order["items"] = $stmtItems->fetchAll(PDO::FETCH_ASSOC);
        
        // Parse items_json for backward compatibility
        if (empty($order["items"]) && !empty($order["items_json"])) {
            $order["items"] = json_decode($order["items_json"], true) ?: [];
        }
    }

    return $orders;
}

/**
 * Get pending cart entries for a specific Steam ID (for Rust plugin).
 */
function get_pending_cart_entries_by_steam_id(string $steamId): array
{
    init_db();
    $pdo = db();

    $stmt = $pdo->prepare("
        SELECT * FROM cart_entries 
        WHERE steam_id = :steam_id AND status = 'pending'
        ORDER BY created_at ASC
    ");
    $stmt->execute([":steam_id" => $steamId]);

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Update cart entry status (for Rust plugin).
 */
function update_cart_entry_status(string $entryId, string $status, ?string $error = null): bool
{
    init_db();
    $pdo = db();
    $now = date("c");

    $validStatuses = ["pending", "delivering", "delivered", "failed", "cancelled"];
    if (!in_array($status, $validStatuses, true)) {
        return false;
    }

    $sql = "UPDATE cart_entries SET status = :status, updated_at = :updated_at";
    $params = [
        ":status" => $status,
        ":updated_at" => $now,
        ":id" => $entryId
    ];

    if ($status === "failed" && $error !== null) {
        $sql .= ", attempt_count = attempt_count + 1, last_error = :error";
        $params[":error"] = $error;
    }

    if ($status === "delivered") {
        $sql .= ", delivered_at = :delivered_at";
        $params[":delivered_at"] = $now;
    }

    $sql .= " WHERE id = :id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    return $stmt->rowCount() > 0;
}

/**
 * Resolve placeholders in Rust command template.
 */
function resolve_rust_command_placeholders(string $template, array $context): string
{
    $placeholders = [
        "{steamid}" => $context["steam_id"] ?? "",
        "{qty}" => strval($context["quantity"] ?? 1),
        "{productId}" => $context["product_id"] ?? "",
        "{orderId}" => $context["order_id"] ?? "",
        "{username}" => sanitize_rust_username($context["username"] ?? "Player")
    ];

    return str_replace(array_keys($placeholders), array_values($placeholders), $template);
}

/**
 * Sanitize username for Rust command (allow only safe characters).
 */
function sanitize_rust_username(string $username): string
{
    // Allow only alphanumeric, space, underscore, hyphen
    $clean = preg_replace("/[^a-zA-Z0-9 _-]/", "", $username);
    // Trim to max 32 chars
    return substr(trim($clean), 0, 32) ?: "Player";
}

/**
 * Validate Steam ID format (17-digit numeric string).
 */
function validate_steam_id(string $steamId): bool
{
    return preg_match("/^[0-9]{17}$/", $steamId) === 1;
}

// ============== END CART ENTRIES FUNCTIONS ==============

function fetch_steam_profile(string $steamId): array
{
    $key = steam_api_key();
    if ($key === "") {
        throw new RuntimeException("Steam API key not configured");
    }
    $url = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=" . urlencode($key) . "&steamids=" . urlencode($steamId);
    $context = stream_context_create([
        "http" => [
            "timeout" => 5
        ]
    ]);
    $raw = @file_get_contents($url, false, $context);
    if ($raw === false) {
        throw new RuntimeException("Failed to fetch Steam profile");
    }
    $data = json_decode($raw, true);
    $players = $data["response"]["players"] ?? [];
    if (!$players || !isset($players[0])) {
        throw new RuntimeException("Steam profile not found");
    }
    $player = $players[0];
    return [
        "steam_nickname" => $player["personaname"] ?? "Steam User",
        "steam_avatar" => $player["avatarfull"] ?? ($player["avatar"] ?? ""),
        "steam_profile_url" => $player["profileurl"] ?? ""
    ];
}

function ensure_products_table(): void
{
    $pdo = db();
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            region TEXT NOT NULL DEFAULT 'eu',
            name TEXT,
            title TEXT,
            perks TEXT,
            short_description TEXT,
            full_description TEXT,
            price REAL NOT NULL DEFAULT 0,
            compare_at TEXT,
            discount INTEGER DEFAULT 0,
            image TEXT,
            gallery_json TEXT,
            items_json TEXT,
            requirements TEXT,
            delivery TEXT,
            category TEXT,
            tags_json TEXT,
            variants_json TEXT,
            popularity INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            is_featured INTEGER DEFAULT 0,
            featured_order INTEGER DEFAULT 0,
            product_type TEXT DEFAULT 'item',
            rust_command_template TEXT,
            created_at TEXT,
            updated_at TEXT
        );
    ");
    $columns = $pdo->query("PRAGMA table_info(products)")->fetchAll(PDO::FETCH_ASSOC);
    $columnNames = array_map(function ($col) {
        return $col["name"] ?? "";
    }, $columns);
    if (!in_array("region", $columnNames, true)) {
        $pdo->exec("ALTER TABLE products ADD COLUMN region TEXT NOT NULL DEFAULT 'eu'");
    }
    if (!in_array("product_type", $columnNames, true)) {
        $pdo->exec("ALTER TABLE products ADD COLUMN product_type TEXT DEFAULT 'item'");
    }
    if (!in_array("rust_command_template", $columnNames, true)) {
        $pdo->exec("ALTER TABLE products ADD COLUMN rust_command_template TEXT");
    }
    $pdo->exec("CREATE INDEX IF NOT EXISTS products_category_idx ON products(category);");
    $pdo->exec("CREATE INDEX IF NOT EXISTS products_featured_idx ON products(is_featured);");
    $pdo->exec("CREATE INDEX IF NOT EXISTS products_active_idx ON products(is_active);");
    $pdo->exec("CREATE INDEX IF NOT EXISTS products_region_idx ON products(region);");
}

function seed_products_from_json(): void
{
    $path = products_path();
    if (!file_exists($path)) {
        return;
    }
    $raw = file_get_contents($path);
    $data = json_decode($raw ?: "", true);
    if (!is_array($data) || count($data) === 0) {
        return;
    }
    $pdo = db();
    $pdo->beginTransaction();
    $stmt = $pdo->prepare("
        INSERT OR IGNORE INTO products (
            id, name, title, perks, short_description, full_description, price, compare_at, discount, image,
            gallery_json, items_json, requirements, delivery, category, tags_json, variants_json, popularity,
            is_active, is_featured, featured_order, created_at, updated_at
        )
        VALUES (
            :id, :name, :title, :perks, :short_description, :full_description, :price, :compare_at, :discount, :image,
            :gallery_json, :items_json, :requirements, :delivery, :category, :tags_json, :variants_json, :popularity,
            :is_active, :is_featured, :featured_order, :created_at, :updated_at
        )
    ");
    foreach ($data as $item) {
        if (!is_array($item) || empty($item["id"])) {
            continue;
        }
        $now = date("c");
        $stmt->execute([
            "id" => sanitize_text($item["id"] ?? ""),
            "name" => sanitize_text($item["name"] ?? ""),
            "title" => sanitize_text($item["title"] ?? ""),
            "perks" => sanitize_text($item["perks"] ?? ""),
            "short_description" => sanitize_text($item["short_description"] ?? ""),
            "full_description" => sanitize_text($item["full_description"] ?? ""),
            "price" => floatval($item["price"] ?? 0),
            "compare_at" => sanitize_text($item["compareAt"] ?? $item["old_price"] ?? ""),
            "discount" => intval($item["discount"] ?? 0),
            "image" => sanitize_text($item["image"] ?? ""),
            "gallery_json" => json_encode($item["gallery"] ?? []),
            "items_json" => json_encode($item["items"] ?? []),
            "requirements" => sanitize_text($item["requirements"] ?? ""),
            "delivery" => sanitize_text($item["delivery"] ?? ""),
            "category" => sanitize_text($item["category"] ?? ""),
            "tags_json" => json_encode($item["tags"] ?? []),
            "variants_json" => json_encode($item["variants"] ?? []),
            "popularity" => intval($item["popularity"] ?? 0),
            "is_active" => !empty($item["is_active"]) ? 1 : 0,
            "is_featured" => !empty($item["is_featured"]) ? 1 : 0,
            "featured_order" => intval($item["featured_order"] ?? 0),
            "created_at" => $item["created_at"] ?? date("Y-m-d"),
            "updated_at" => $now
        ]);
    }
    $pdo->commit();
}

function get_product_by_id(string $id): ?array
{
    ensure_products_seeded();
    $pdo = db();
    $stmt = $pdo->prepare("SELECT * FROM products WHERE id = :id LIMIT 1");
    $stmt->execute([":id" => $id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ? product_row_to_array($row) : null;
}

function list_products(array $filters = [], int $limit = 100, int $offset = 0): array
{
    ensure_products_seeded();
    $pdo = db();
    $where = [];
    $params = [];
    if (!empty($filters["q"])) {
        $where[] = "(LOWER(name) LIKE :q OR LOWER(title) LIKE :q)";
        $params[":q"] = "%" . strtolower($filters["q"]) . "%";
    }
    if (!empty($filters["category"])) {
        $where[] = "category = :category";
        $params[":category"] = $filters["category"];
    }
    if (isset($filters["featured"]) && $filters["featured"] !== "") {
        $where[] = "is_featured = :featured";
        $params[":featured"] = $filters["featured"] ? 1 : 0;
    }
    if (isset($filters["active"]) && $filters["active"] !== "") {
        $where[] = "is_active = :active";
        $params[":active"] = $filters["active"] ? 1 : 0;
    }

    $sql = "SELECT * FROM products";
    if ($where) {
        $sql .= " WHERE " . implode(" AND ", $where);
    }
    $sort = $filters["sort"] ?? "name";
    if ($sort === "price") {
        $sql .= " ORDER BY price ASC";
    } elseif ($sort === "price_desc") {
        $sql .= " ORDER BY price DESC";
    } elseif ($sort === "date") {
        $sql .= " ORDER BY created_at DESC";
    } elseif ($sort === "popularity") {
        $sql .= " ORDER BY popularity DESC";
    } else {
        $sql .= " ORDER BY name ASC";
    }
    $sql .= " LIMIT :limit OFFSET :offset";
    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(":limit", $limit, PDO::PARAM_INT);
    $stmt->bindValue(":offset", $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return array_map("product_row_to_array", $rows);
}

function count_products(array $filters = []): int
{
    ensure_products_seeded();
    $pdo = db();
    $where = [];
    $params = [];
    if (!empty($filters["q"])) {
        $where[] = "(LOWER(name) LIKE :q OR LOWER(title) LIKE :q)";
        $params[":q"] = "%" . strtolower($filters["q"]) . "%";
    }
    if (!empty($filters["category"])) {
        $where[] = "category = :category";
        $params[":category"] = $filters["category"];
    }
    if (isset($filters["featured"]) && $filters["featured"] !== "") {
        $where[] = "is_featured = :featured";
        $params[":featured"] = $filters["featured"] ? 1 : 0;
    }
    if (isset($filters["active"]) && $filters["active"] !== "") {
        $where[] = "is_active = :active";
        $params[":active"] = $filters["active"] ? 1 : 0;
    }
    $sql = "SELECT COUNT(*) FROM products";
    if ($where) {
        $sql .= " WHERE " . implode(" AND ", $where);
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return (int)$stmt->fetchColumn();
}

function ensure_unique_product_id(string $baseId): string
{
    $baseId = slugify($baseId);
    $pdo = db();
    $candidate = $baseId;
    $suffix = 1;
    while (true) {
        $stmt = $pdo->prepare("SELECT id FROM products WHERE id = :id LIMIT 1");
        $stmt->execute([":id" => $candidate]);
        if (!$stmt->fetchColumn()) {
            return $candidate;
        }
        $suffix += 1;
        $candidate = $baseId . "-" . $suffix;
    }
}

function upsert_product(array $input, ?string $id = null): array
{
    ensure_products_seeded();
    $pdo = db();
    $existing = $id ? get_product_by_id($id) : null;
    $normalized = normalize_product($input, $existing ?? []);
    $productId = $id ?: ($normalized["id"] ?? "");
    if (!$productId) {
        $productId = ensure_unique_product_id($normalized["name"] ?? "item");
    }
    $now = date("c");
    $stmt = $pdo->prepare("
        INSERT INTO products (
            id, name, title, perks, short_description, full_description, price, compare_at, discount, image,
            gallery_json, items_json, requirements, delivery, category, tags_json, variants_json, popularity,
            is_active, is_featured, featured_order, product_type, rust_command_template, created_at, updated_at
        ) VALUES (
            :id, :name, :title, :perks, :short_description, :full_description, :price, :compare_at, :discount, :image,
            :gallery_json, :items_json, :requirements, :delivery, :category, :tags_json, :variants_json, :popularity,
            :is_active, :is_featured, :featured_order, :product_type, :rust_command_template, :created_at, :updated_at
        )
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            title = excluded.title,
            perks = excluded.perks,
            short_description = excluded.short_description,
            full_description = excluded.full_description,
            price = excluded.price,
            compare_at = excluded.compare_at,
            discount = excluded.discount,
            image = excluded.image,
            gallery_json = excluded.gallery_json,
            items_json = excluded.items_json,
            requirements = excluded.requirements,
            delivery = excluded.delivery,
            category = excluded.category,
            tags_json = excluded.tags_json,
            variants_json = excluded.variants_json,
            popularity = excluded.popularity,
            is_active = excluded.is_active,
            is_featured = excluded.is_featured,
            featured_order = excluded.featured_order,
            product_type = excluded.product_type,
            rust_command_template = excluded.rust_command_template,
            updated_at = excluded.updated_at
    ");
    $stmt->execute([
        "id" => $productId,
        "name" => sanitize_text($normalized["name"] ?? ""),
        "title" => sanitize_text($normalized["title"] ?? ""),
        "perks" => sanitize_text($normalized["perks"] ?? ""),
        "short_description" => sanitize_text($normalized["short_description"] ?? ""),
        "full_description" => sanitize_text($normalized["full_description"] ?? ""),
        "price" => floatval($normalized["price"] ?? 0),
        "compare_at" => sanitize_text($normalized["compareAt"] ?? ""),
        "discount" => intval($normalized["discount"] ?? 0),
        "image" => sanitize_text($normalized["image"] ?? ""),
        "gallery_json" => json_encode($normalized["gallery"] ?? []),
        "items_json" => json_encode($normalized["items"] ?? []),
        "requirements" => sanitize_text($normalized["requirements"] ?? ""),
        "delivery" => sanitize_text($normalized["delivery"] ?? ""),
        "category" => sanitize_text($normalized["category"] ?? ""),
        "tags_json" => json_encode($normalized["tags"] ?? []),
        "variants_json" => json_encode($normalized["variants"] ?? []),
        "popularity" => intval($normalized["popularity"] ?? 0),
        "is_active" => !empty($normalized["is_active"]) ? 1 : 0,
        "is_featured" => !empty($normalized["is_featured"]) ? 1 : 0,
        "featured_order" => intval($normalized["featured_order"] ?? 0),
        "product_type" => sanitize_text($normalized["product_type"] ?? "item"),
        "rust_command_template" => $normalized["rust_command_template"] ?? "",
        "created_at" => $normalized["created_at"] ?? date("Y-m-d"),
        "updated_at" => $now
    ]);
    return get_product_by_id($productId) ?: array_merge($normalized, ["id" => $productId]);
}

function delete_product(string $id, bool $soft = true): bool
{
    ensure_products_seeded();
    $pdo = db();
    if ($soft) {
        $stmt = $pdo->prepare("UPDATE products SET is_active = 0, updated_at = :updated_at WHERE id = :id");
        $stmt->execute([":updated_at" => date("c"), ":id" => $id]);
        return $stmt->rowCount() > 0;
    }
    $stmt = $pdo->prepare("DELETE FROM products WHERE id = :id");
    $stmt->execute([":id" => $id]);
    return $stmt->rowCount() > 0;
}

function update_featured_order(array $ids, int $limit): void
{
    ensure_products_seeded();
    $pdo = db();
    $pdo->beginTransaction();
    $stmt = $pdo->prepare("UPDATE products SET is_featured = 0, featured_order = 0 WHERE is_featured = 1");
    $stmt->execute();
    $stmt = $pdo->prepare("UPDATE products SET is_featured = 1, featured_order = :order, updated_at = :updated_at WHERE id = :id");
    $order = 1;
    foreach ($ids as $id) {
        if ($order > $limit) {
            break;
        }
        $stmt->execute([
            ":order" => $order,
            ":updated_at" => date("c"),
            ":id" => $id
        ]);
        $order += 1;
    }
    $pdo->commit();
}

function ensure_products_seeded(): void
{
    ensure_products_table();
    $pdo = db();
    $count = (int)$pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
    if ($count === 0) {
        seed_products_from_json();
    }
}

function product_row_to_array(array $row): array
{
    $config = config();
    $currency = $config["currency_symbol"] ?? "$";
    $price = floatval($row["price"] ?? 0);
    return [
        "id" => $row["id"],
        "name" => $row["name"] ?: null,
        "title" => $row["title"] ?: null,
        "perks" => $row["perks"] ?: null,
        "short_description" => $row["short_description"] ?: null,
        "full_description" => $row["full_description"] ?: null,
        "product_type" => $row["product_type"] ?? "item",
        "rust_command_template" => $row["rust_command_template"] ?? null,
        "price" => $price,
        "priceFormatted" => $currency . number_format($price, 2),
        "compareAt" => $row["compare_at"] ?: null,
        "discount" => intval($row["discount"] ?? 0),
        "image" => $row["image"] ?: "",
        "gallery" => json_decode($row["gallery_json"] ?? "[]", true) ?: [],
        "items" => json_decode($row["items_json"] ?? "[]", true) ?: [],
        "requirements" => $row["requirements"] ?: null,
        "delivery" => $row["delivery"] ?: null,
        "category" => $row["category"] ?: null,
        "tags" => json_decode($row["tags_json"] ?? "[]", true) ?: [],
        "variants" => json_decode($row["variants_json"] ?? "[]", true) ?: [],
        "popularity" => intval($row["popularity"] ?? 0),
        "is_active" => !empty($row["is_active"]),
        "is_featured" => !empty($row["is_featured"]),
        "featured_order" => intval($row["featured_order"] ?? 0),
        "created_at" => $row["created_at"] ?: null,
        "updated_at" => $row["updated_at"] ?: null
    ];
}

function load_products(): array
{
    ensure_products_seeded();
    $pdo = db();
    $stmt = $pdo->query("SELECT * FROM products");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return array_map("product_row_to_array", $rows);
}

function save_products(array $products): void
{
    ensure_products_seeded();
    $pdo = db();
    $now = date("c");
    $pdo->beginTransaction();
    $stmt = $pdo->prepare("
        INSERT INTO products (
            id, name, title, perks, short_description, full_description, price, compare_at, discount, image,
            gallery_json, items_json, requirements, delivery, category, tags_json, variants_json, popularity,
            is_active, is_featured, featured_order, created_at, updated_at
        ) VALUES (
            :id, :name, :title, :perks, :short_description, :full_description, :price, :compare_at, :discount, :image,
            :gallery_json, :items_json, :requirements, :delivery, :category, :tags_json, :variants_json, :popularity,
            :is_active, :is_featured, :featured_order, :created_at, :updated_at
        )
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            title = excluded.title,
            perks = excluded.perks,
            short_description = excluded.short_description,
            full_description = excluded.full_description,
            price = excluded.price,
            compare_at = excluded.compare_at,
            discount = excluded.discount,
            image = excluded.image,
            gallery_json = excluded.gallery_json,
            items_json = excluded.items_json,
            requirements = excluded.requirements,
            delivery = excluded.delivery,
            category = excluded.category,
            tags_json = excluded.tags_json,
            variants_json = excluded.variants_json,
            popularity = excluded.popularity,
            is_active = excluded.is_active,
            is_featured = excluded.is_featured,
            featured_order = excluded.featured_order,
            updated_at = excluded.updated_at
    ");
    foreach ($products as $product) {
        if (!is_array($product) || empty($product["id"])) {
            continue;
        }
        $normalized = normalize_product($product, $product);
        $stmt->execute([
            "id" => sanitize_text($normalized["id"] ?? $product["id"]),
            "name" => sanitize_text($normalized["name"] ?? ""),
            "title" => sanitize_text($normalized["title"] ?? ""),
            "perks" => sanitize_text($normalized["perks"] ?? ""),
            "short_description" => sanitize_text($normalized["short_description"] ?? ""),
            "full_description" => sanitize_text($normalized["full_description"] ?? ""),
            "price" => floatval($normalized["price"] ?? 0),
            "compare_at" => sanitize_text($normalized["compareAt"] ?? ""),
            "discount" => intval($normalized["discount"] ?? 0),
            "image" => sanitize_text($normalized["image"] ?? ""),
            "gallery_json" => json_encode($normalized["gallery"] ?? []),
            "items_json" => json_encode($normalized["items"] ?? []),
            "requirements" => sanitize_text($normalized["requirements"] ?? ""),
            "delivery" => sanitize_text($normalized["delivery"] ?? ""),
            "category" => sanitize_text($normalized["category"] ?? ""),
            "tags_json" => json_encode($normalized["tags"] ?? []),
            "variants_json" => json_encode($normalized["variants"] ?? []),
            "popularity" => intval($normalized["popularity"] ?? 0),
            "is_active" => !empty($normalized["is_active"]) ? 1 : 0,
            "is_featured" => !empty($normalized["is_featured"]) ? 1 : 0,
            "featured_order" => intval($normalized["featured_order"] ?? 0),
            "created_at" => $normalized["created_at"] ?? date("Y-m-d"),
            "updated_at" => $now
        ]);
    }
    $pdo->commit();
}

function slugify(string $value): string
{
    $value = strtolower(trim($value));
    $value = preg_replace("/[^a-z0-9]+/i", "-", $value);
    return trim($value, "-") ?: "item";
}

function sanitize_text(?string $value): string
{
    return trim(strip_tags($value ?? ""));
}

function sanitize_array($value): array
{
    if (is_array($value)) {
        return array_values(array_filter(array_map("trim", $value), "strlen"));
    }
    if (is_string($value)) {
        $parts = array_map("trim", explode(",", $value));
        return array_values(array_filter($parts, "strlen"));
    }
    return [];
}

function sanitize_bool($value): bool
{
    return filter_var($value, FILTER_VALIDATE_BOOLEAN);
}

function normalize_product(array $input, array $existing = []): array
{
    $config = config();
    $currency = $config["currency_symbol"] ?? "$";
    $name = sanitize_text($input["name"] ?? $existing["name"] ?? "");
    $price = floatval($input["price"] ?? $existing["price"] ?? 0);
    $compareAt = sanitize_text($input["compareAt"] ?? $input["old_price"] ?? $existing["compareAt"] ?? "");
    $discount = $input["discount"] ?? $existing["discount"] ?? 0;
    $short = sanitize_text($input["short_description"] ?? $existing["short_description"] ?? "");
    $full = sanitize_text($input["full_description"] ?? $existing["full_description"] ?? "");
    $image = sanitize_text($input["image"] ?? $existing["image"] ?? "");
    $gallery = sanitize_array($input["gallery"] ?? $existing["gallery"] ?? []);
    $category = sanitize_text($input["category"] ?? $existing["category"] ?? "");
    $tags = sanitize_array($input["tags"] ?? $existing["tags"] ?? []);
    $perks = sanitize_text($input["perks"] ?? $existing["perks"] ?? $short);
    $delivery = sanitize_text($input["delivery"] ?? $existing["delivery"] ?? "Instant in-game delivery");
    $requirements = sanitize_text($input["requirements"] ?? $existing["requirements"] ?? "Steam account linked and Rust profile verified.");
    $variants = sanitize_array($input["variants"] ?? $existing["variants"] ?? []);
    $isActive = isset($input["is_active"]) ? sanitize_bool($input["is_active"]) : ($existing["is_active"] ?? true);
    $isFeatured = isset($input["is_featured"]) ? sanitize_bool($input["is_featured"]) : ($existing["is_featured"] ?? false);
    $featuredOrder = intval($input["featured_order"] ?? $existing["featured_order"] ?? 0);
    $popularity = intval($input["popularity"] ?? $existing["popularity"] ?? 0);
    $createdAt = $existing["created_at"] ?? date("Y-m-d");
    
    // New fields for Rust integration
    $productType = sanitize_text($input["product_type"] ?? $existing["product_type"] ?? "item");
    $validTypes = ["privilege", "kit", "item", "mixed"];
    if (!in_array($productType, $validTypes, true)) {
        $productType = "item";
    }
    $rustCommandTemplate = $input["rust_command_template"] ?? $existing["rust_command_template"] ?? "";

    return array_merge($existing, [
        "name" => $name,
        "perks" => $perks,
        "short_description" => $short,
        "full_description" => $full,
        "price" => $price,
        "priceFormatted" => $currency . number_format($price, 2),
        "compareAt" => $compareAt !== "" ? $compareAt : null,
        "discount" => intval($discount),
        "image" => $image,
        "gallery" => $gallery,
        "items" => $existing["items"] ?? [],
        "requirements" => $requirements,
        "delivery" => $delivery,
        "category" => $category,
        "tags" => $tags,
        "variants" => $variants,
        "popularity" => $popularity,
        "is_active" => $isActive,
        "is_featured" => $isFeatured,
        "featured_order" => $featuredOrder,
        "product_type" => $productType,
        "rust_command_template" => $rustCommandTemplate,
        "created_at" => $createdAt
    ]);
}