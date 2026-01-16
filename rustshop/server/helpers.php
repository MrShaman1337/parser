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
    if (empty($_SESSION["admin_logged_in"])) {
        if ($api) {
            json_response(["error" => "Unauthorized"], 401);
        }
        header("Location: /admin/login.html");
        exit;
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

function db(): PDO
{
    $pdo = new PDO("sqlite:" . db_path());
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec("PRAGMA journal_mode = WAL;");
    $pdo->exec("PRAGMA foreign_keys = ON;");
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
