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
 