<?php
declare(strict_types=1);
require_once __DIR__ . "/../../../server/helpers.php";

require_login(true);
rate_limit("upload", 20, 60);

validate_csrf($_POST["csrf_token"] ?? null);

if (empty($_FILES["file"])) {
    json_response(["error" => "No file uploaded"], 400);
}

$file = $_FILES["file"];
if ($file["error"] !== UPLOAD_ERR_OK) {
    json_response(["error" => "Upload error"], 400);
}

$maxSize = 2 * 1024 * 1024;
if ($file["size"] > $maxSize) {
    json_response(["error" => "File too large"], 400);
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file["tmp_name"]);
$allowed = ["image/jpeg" => "jpg", "image/png" => "png", "image/webp" => "webp"];
if (!isset($allowed[$mime])) {
    json_response(["error" => "Invalid file type"], 400);
}

$uploadsDir = realpath(__DIR__ . "/../../assets/uploads") ?: (__DIR__ . "/../../assets/uploads");
if (!is_dir($uploadsDir)) {
    mkdir($uploadsDir, 0755, true);
}

$baseName = pathinfo($file["name"], PATHINFO_FILENAME);
$baseName = preg_replace("/[^a-z0-9-]+/i", "-", strtolower($baseName));
$filename = $baseName . "-" . uniqid("", true) . "." . $allowed[$mime];
$target = $uploadsDir . "/" . $filename;

if (!move_uploaded_file($file["tmp_name"], $target)) {
    json_response(["error" => "Failed to save file"], 500);
}

$publicPath = "assets/uploads/" . $filename;
json_response(["ok" => true, "path" => $publicPath]);
