<?php
declare(strict_types=1);
require_once __DIR__ . "/../../../server/helpers.php";

require_login(true);
init_db();

$query = strtolower(sanitize_text($_GET["q"] ?? ""));
$status = sanitize_text($_GET["status"] ?? "");
$sort = sanitize_text($_GET["sort"] ?? "date");

$pdo = db();
$sql = "SELECT id, created_at, status, customer_email, total, currency FROM orders";
$params = [];
$where = [];

if ($status) {
    $where[] = "status = :status";
    $params[":status"] = $status;
}
if ($query) {
    $where[] = "(LOWER(id) LIKE :q OR LOWER(customer_email) LIKE :q)";
    $params[":q"] = "%" . $query . "%";
}
if ($where) {
    $sql .= " WHERE " . implode(" AND ", $where);
}
if ($sort === "date_asc") {
    $sql .= " ORDER BY created_at ASC";
} else {
    $sql .= " ORDER BY created_at DESC";
}

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

json_response(["orders" => $orders]);
