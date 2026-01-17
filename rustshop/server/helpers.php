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

function json_response($data, int $status = 200): void
{
    http_response_code($status);
    header("Content-Type: application/json; charset=utf-8");
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

function products_path(): string
{
    return data_path() . "/products.json";
}

function db_path(): string
{
    $dir = realpath(__DIR__ . "/data") ?: (__DIR__ . "/data");
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir . "/store.sqlite";
}

function auth_db_path(): string
{
    $dir = realpath(__DIR__ . "/data") ?: (__DIR__ . "/data");
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir . "/auth.sqlite";
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
    $pdo->exec("CREATE INDEX IF NOT EXISTS users_last_login_idx ON users(last_login_at);");
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

    $pdo->exec("CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);");
    $pdo->exec("CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at);");
    $pdo->exec("CREATE INDEX IF NOT EXISTS orders_email_idx ON orders(customer_email);");

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
        "is_banned" => 0
    ];
}

function fetch_steam_profile(string $steamId): array
{
    $key = steam_api_key();
    if ($key === "") {
        json_response(["error" => "Steam API key not configured"], 500);
    }
    $url = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=" . urlencode($key) . "&steamids=" . urlencode($steamId);
    $context = stream_context_create([
        "http" => [
            "timeout" => 5
        ]
    ]);
    $raw = @file_get_contents($url, false, $context);
    if ($raw === false) {
        json_response(["error" => "Failed to fetch Steam profile"], 502);
    }
    $data = json_decode($raw, true);
    $players = $data["response"]["players"] ?? [];
    if (!$players || !isset($players[0])) {
        json_response(["error" => "Steam profile not found"], 404);
    }
    $player = $players[0];
    return [
        "steam_nickname" => $player["personaname"] ?? "Steam User",
        "steam_avatar" => $player["avatarfull"] ?? ($player["avatar"] ?? ""),
        "steam_profile_url" => $player["profileurl"] ?? ""
    ];
}

function load_products(): array
{
    $path = products_path();
    if (!file_exists($path)) {
        return [];
    }
    $handle = fopen($path, "r");
    if (!$handle) {
        return [];
    }
    flock($handle, LOCK_SH);
    $contents = stream_get_contents($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    $data = json_decode($contents, true);
    return is_array($data) ? $data : [];
}

function save_products(array $products): void
{
    $path = products_path();
    $dir = dirname($path);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    $temp = $path . ".tmp";
    $handle = fopen($temp, "w");
    if (!$handle) {
        json_response(["error" => "Failed to write data"], 500);
    }
    if (!flock($handle, LOCK_EX)) {
        json_response(["error" => "Failed to lock file"], 500);
    }
    fwrite($handle, json_encode($products, JSON_PRETTY_PRINT));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    rename($temp, $path);
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
        "created_at" => $createdAt
    ]);
}
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

function json_response($data, int $status = 200): void
{
    http_response_code($status);
    header("Content-Type: application/json; charset=utf-8");
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

function products_path(): string
{
    return data_path() . "/products.json";
}

function db_path(): string
{
    $dir = realpath(__DIR__ . "/data") ?: (__DIR__ . "/data");
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir . "/store.sqlite";
}

function auth_db_path(): string
{
    $dir = realpath(__DIR__ . "/data") ?: (__DIR__ . "/data");
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir . "/auth.sqlite";
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
    $pdo->exec("CREATE INDEX IF NOT EXISTS users_last_login_idx ON users(last_login_at);");
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

    $pdo->exec("CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);");
    $pdo->exec("CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at);");
    $pdo->exec("CREATE INDEX IF NOT EXISTS orders_email_idx ON orders(customer_email);");

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
        "is_banned" => 0
    ];
}

function fetch_steam_profile(string $steamId): array
{
    $key = steam_api_key();
    if ($key === "") {
        json_response(["error" => "Steam API key not configured"], 500);
    }
    $url = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=" . urlencode($key) . "&steamids=" . urlencode($steamId);
    $context = stream_context_create([
        "http" => [
            "timeout" => 5
        ]
    ]);
    $raw = @file_get_contents($url, false, $context);
    if ($raw === false) {
        json_response(["error" => "Failed to fetch Steam profile"], 502);
    }
    $data = json_decode($raw, true);
    $players = $data["response"]["players"] ?? [];
    if (!$players || !isset($players[0])) {
        json_response(["error" => "Steam profile not found"], 404);
    }
    $player = $players[0];
    return [
        "steam_nickname" => $player["personaname"] ?? "Steam User",
        "steam_avatar" => $player["avatarfull"] ?? ($player["avatar"] ?? ""),
        "steam_profile_url" => $player["profileurl"] ?? ""
    ];
}

function load_products(): array
{
    $path = products_path();
    if (!file_exists($path)) {
        return [];
    }
    $handle = fopen($path, "r");
    if (!$handle) {
        return [];
    }
    flock($handle, LOCK_SH);
    $contents = stream_get_contents($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    $data = json_decode($contents, true);
    return is_array($data) ? $data : [];
}

function save_products(array $products): void
{
    $path = products_path();
    $dir = dirname($path);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    $temp = $path . ".tmp";
    $handle = fopen($temp, "w");
    if (!$handle) {
        json_response(["error" => "Failed to write data"], 500);
    }
    if (!flock($handle, LOCK_EX)) {
        json_response(["error" => "Failed to lock file"], 500);
    }
    fwrite($handle, json_encode($products, JSON_PRETTY_PRINT));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    rename($temp, $path);
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
        "created_at" => $createdAt
    ]);
