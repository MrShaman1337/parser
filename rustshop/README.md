# RustShop (Apache2 + PHP 8.3)

Premium Rust shop storefront with a PHP admin panel, JSON product storage, and SQLite orders.

## Repository Structure
- `/public` web root (Apache DocumentRoot)
  - `/admin` admin UI + API
  - `/api` public order APIs
  - `/assets` css/js/img/uploads
  - `/data/products.json` single source of truth for products
- `/server` backend helpers + config + SQLite data (must live outside web root)
  - `admin.config.php`
  - `helpers.php`
  - `/data/store.sqlite` (auto-created)

## Установка на Ubuntu 24.04 (полная инструкция, Apache2:8080)

### 1) Установка пакетов
```bash
sudo apt update
sudo apt install -y apache2 php libapache2-mod-php php-sqlite3 php-mbstring php-xml php-curl
```

### 2) Структура каталогов
```bash
sudo mkdir -p /var/www/rustshop/public
sudo mkdir -p /var/www/rustshop/server
```

### 3) Копирование файлов проекта
Из корня репозитория:
```bash
sudo cp -R public/* /var/www/rustshop/public/
sudo cp -R server/* /var/www/rustshop/server/
```

### Безопасное развертывание (ВАЖНО)
Никогда не перезаписывайте `/public/api` и `/public/admin/api` сборкой фронтенда.
```bash
rsync -av --delete dist/ public/ --exclude "api/" --exclude "admin/api/"
```

### 4) VHost Apache2 на порту 8080
Создайте `/etc/apache2/sites-available/rustshop.conf`:
```
Listen 8080
<VirtualHost *:8080>
    ServerName YOUR-IP
    DocumentRoot /var/www/rustshop/public

    <Directory /var/www/rustshop/public>
        Options -Indexes
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/rustshop_error.log
    CustomLog ${APACHE_LOG_DIR}/rustshop_access.log combined
</VirtualHost>
```
Включение модулей и сайта:
```bash
sudo a2enmod rewrite
sudo a2ensite rustshop.conf
sudo a2dissite 000-default.conf
sudo systemctl restart apache2
```

### 5) Права доступа (SQLite и загрузки)
```bash
sudo chown -R www-data:www-data /var/www/rustshop/public
sudo chown -R www-data:www-data /var/www/rustshop/server
sudo chmod -R 755 /var/www/rustshop/public
sudo chmod -R 755 /var/www/rustshop/server
sudo chmod -R 775 /var/www/rustshop/public/assets/uploads
sudo chmod -R 775 /var/www/rustshop/public/data
sudo chmod -R 775 /var/www/rustshop/server/data
sudo chmod -R 775 /var/www/rustshop/server/cache
```
`/var/www/rustshop/server/data` содержит `auth.sqlite` (users/admins) и `store.sqlite` (orders).

### 6) Steam API key и админ
Создайте `/var/www/rustshop/server/env.php`:
```php
<?php
return [
    "steam_api_key" => "YOUR_STEAM_API_KEY"
];
```
Создайте первого администратора:
```bash
php /var/www/rustshop/server/create_admin.php admin STRONG_PASSWORD superadmin
```

### 7) Проверка
- Сайт: `http://YOUR-IP:8080/`
- Админка: `http://YOUR-IP:8080/admin/`
- API auth: `http://YOUR-IP:8080/api/auth/session.php`

### 8) Быстрая диагностика
```bash
php /var/www/rustshop/server/health_check.php
curl -I http://YOUR-IP:8080/api/auth/steam-login.php
curl http://YOUR-IP:8080/admin/api/login.php
```

### Продукты (SQLite)
- Источник данных теперь SQLite: `/var/www/rustshop/server/data/store.sqlite`
- При первом запросе `/api/products.php` база автоматически заполняется из `/var/www/rustshop/public/data/products.json`
- Сидинг идемпотентный: повторные запросы не создают дубликаты

### Telegram для формы поддержки
Добавьте в `/var/www/rustshop/server/env.php`:
```php
<?php
return [
    "steam_api_key" => "YOUR_STEAM_API_KEY",
    "TELEGRAM_BOT_TOKEN" => "YOUR_BOT_TOKEN",
    "TELEGRAM_CHAT_ID" => "YOUR_CHAT_ID"
];
```
Проверка:
```bash
curl -X POST http://YOUR-IP:8080/api/support/send.php \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","orderId":"ORD-1","message":"Hello","lang":"en"}'
```

## Ubuntu 24.04 Installation (Step-by-Step)

### 1) Install packages
```bash
sudo apt update
sudo apt install -y apache2 php libapache2-mod-php php-sqlite3 php-mbstring php-xml php-curl
```

### 2) Create folders
```bash
sudo mkdir -p /var/www/rustshop/public
sudo mkdir -p /var/www/rustshop/server
```

### 3) Copy project files
From this repo root:
```bash
sudo cp -R public/* /var/www/rustshop/public/
sudo cp -R server/* /var/www/rustshop/server/
```

### Deployment Safety (IMPORTANT)
Never overwrite `/public/api` or `/public/admin/api` with a React build. Use rsync excludes:
```bash
rsync -av --delete dist/ public/ --exclude "api/" --exclude "admin/api/"
```

### 4) Apache vhost (IP-only)
Create `/etc/apache2/sites-available/rustshop.conf`:
```
<VirtualHost *:80>
    ServerName 213.176.118.24
    DocumentRoot /var/www/rustshop/public

    <Directory /var/www/rustshop/public>
        Options -Indexes
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/rustshop_error.log
    CustomLog ${APACHE_LOG_DIR}/rustshop_access.log combined
</VirtualHost>
```
Enable and restart:
```bash
sudo a2enmod rewrite
sudo a2ensite rustshop.conf
sudo a2dissite 000-default.conf
sudo systemctl restart apache2
```

### 5) Permissions
```bash
sudo chown -R www-data:www-data /var/www/rustshop/public
sudo chown -R www-data:www-data /var/www/rustshop/server
sudo chmod -R 755 /var/www/rustshop/public
sudo chmod -R 755 /var/www/rustshop/server
sudo chmod -R 775 /var/www/rustshop/public/assets/uploads
sudo chmod -R 775 /var/www/rustshop/public/data
sudo chmod -R 775 /var/www/rustshop/server/data
sudo chmod -R 775 /var/www/rustshop/server/cache
```
`/var/www/rustshop/server/data` contains `auth.sqlite` (users/admins) and `store.sqlite` (orders).

### 6) Configure Steam + create admin
Create `/var/www/rustshop/server/env.php` and set your Steam Web API key:
```php
<?php
return [
    "steam_api_key" => "YOUR_STEAM_API_KEY"
];
```
Create the first admin user:
```bash
php /var/www/rustshop/server/create_admin.php admin STRONG_PASSWORD superadmin
```
Admin login uses the `admins` table in `/var/www/rustshop/server/data/auth.sqlite`.

### 7) Restart Apache
```bash
sudo systemctl restart apache2
```

### 8) Verify
- Site: `http://YOUR-IP/index.html`
- Admin: `http://YOUR-IP/admin/login.html`

## Security Checklist
- Confirm `DocumentRoot` is `/var/www/rustshop/public` (never the repo root).
- `/server` must NOT be web-accessible.
- Disable directory listing (`Options -Indexes`).
- Use HTTPS for production.
- Create a superadmin via `server/create_admin.php` and use a strong password.

---

## Rust Plugin Integration (Cart on Server)

This shop uses a **database-driven delivery system**. When a user purchases items:
1. The website writes entries to the `cart_entries` table
2. The Rust plugin polls the database and delivers items when player clicks "Claim"
3. No webhooks required — plugin reads directly from DB

### Database Schema

**cart_entries** (what the plugin reads):
- `id` - unique entry ID (e.g., "CE-A1B2C3D4E5F6")
- `steam_id` - player's Steam ID (17 digits)
- `order_id` - reference to the order
- `product_id` - product identifier
- `product_name` - product name for display
- `quantity` - number of items
- `rust_command_template_snapshot` - command to execute (snapshot at purchase time)
- `status` - "pending" | "delivering" | "delivered" | "failed" | "cancelled"
- `attempt_count` - number of delivery attempts
- `last_error` - error message if failed
- `created_at`, `updated_at`, `delivered_at`

### Rust Command Template Placeholders

When editing products in admin, use these placeholders in the "Rust Console Command" field:
- `{steamid}` — Player's Steam ID
- `{qty}` — Quantity purchased
- `{productId}` — Product ID
- `{orderId}` — Order ID
- `{username}` — Player's display name (sanitized)

**Examples:**
```
inventory.giveto {steamid} rifle.ak {qty}
grant user {steamid} vip.package
kit.give {steamid} starter
```

### Plugin API Endpoints

**GET /api/rust/pending.php?steam_id=76561198XXXXXXXXX&api_key=XXX**
Returns pending items for a Steam ID:
```json
{
  "ok": true,
  "steam_id": "76561198XXXXXXXXX",
  "entries": [
    {
      "id": "CE-A1B2C3D4E5F6",
      "steam_id": "76561198XXXXXXXXX",
      "order_id": "ORD-20260117-ABCD",
      "product_id": "vip-package",
      "product_name": "VIP Package",
      "quantity": 1,
      "rust_command": "grant user {steamid} vip.package",
      "created_at": "2026-01-17T12:00:00+00:00"
    }
  ],
  "count": 1
}
```

**POST /api/rust/claim.php**
Claim all pending items (marks as "delivering"):
```json
{
  "steam_id": "76561198XXXXXXXXX"
}
```

**POST /api/rust/update.php**
Update entry status after delivery:
```json
{
  "entry_id": "CE-A1B2C3D4E5F6",
  "status": "delivered"
}
```
or for failures:
```json
{
  "entry_id": "CE-A1B2C3D4E5F6",
  "status": "failed",
  "error": "Player not connected"
}
```

### Plugin API Key (Optional)

Add to `/var/www/rustshop/server/env.php`:
```php
<?php
return [
    "steam_api_key" => "YOUR_STEAM_API_KEY",
    "TELEGRAM_BOT_TOKEN" => "YOUR_BOT_TOKEN",
    "TELEGRAM_CHAT_ID" => "YOUR_CHAT_ID",
    "RUST_PLUGIN_API_KEY" => "YOUR_SECRET_PLUGIN_API_KEY"
];
```

### Direct Database Access (Alternative)

If your plugin can connect directly to SQLite, you can:

**Read pending entries:**
```sql
SELECT * FROM cart_entries 
WHERE status = 'pending' AND steam_id = ? 
ORDER BY created_at ASC;
```

**Mark as delivering:**
```sql
UPDATE cart_entries 
SET status = 'delivering', updated_at = datetime('now') 
WHERE id = ?;
```

**Mark as delivered:**
```sql
UPDATE cart_entries 
SET status = 'delivered', delivered_at = datetime('now'), updated_at = datetime('now') 
WHERE id = ?;
```

**Mark as failed:**
```sql
UPDATE cart_entries 
SET status = 'failed', attempt_count = attempt_count + 1, last_error = ?, updated_at = datetime('now') 
WHERE id = ?;
```

### Testing with Admin API

Use the admin test endpoint to simulate purchases without payment:
```bash
curl -X POST "http://YOUR-IP:8080/admin/api/test-payment.php" \
  -H "Content-Type: application/json" \
  -H "Cookie: PHPSESSID=your_admin_session" \
  -d '{
    "user_id": 1,
    "products": [
      {"product_id": "vip-package", "quantity": 1}
    ]
  }'
```

---

## Performance & Caching Setup
Apache (via `.htaccess`) configures:
- Long-lived cache for hashed assets (JS/CSS/fonts/images).
- Short cache for HTML and `/data/products.json`.
- No-cache for `/api/*`, `/api/auth/*`, `/admin/api/*`.
- gzip/brotli compression when modules are enabled.
Note: uploaded images are cached long-term; prefer uploading optimized WebP when possible.

Verify cache headers:
```
curl -I http://YOUR-IP:8080/assets/index-*.js
curl -I http://YOUR-IP:8080/data/products.json
curl -I http://YOUR-IP:8080/api/stats.php
```
Verify compression:
```
curl -H "Accept-Encoding: gzip" -I http://YOUR-IP:8080/assets/index-*.js
```
Verify ETag/304:
```
curl -I http://YOUR-IP:8080/api/stats.php
curl -H "If-None-Match: <ETAG>" -I http://YOUR-IP:8080/api/stats.php
```
 