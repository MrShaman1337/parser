# RustShop React SPA Migration

This repository now includes a React SPA in `/frontend` and the PHP backend in `/rustshop` (public + server APIs).

## Build the SPA
```bash
cd frontend
npm install
npm run build
```
Build output is in `frontend/dist`.

## Deploy to Apache2 (Ubuntu 24.04)
1. Set DocumentRoot to the SPA build output:
   - Copy `frontend/dist/*` to `/var/www/rustshop/public`
2. Copy backend PHP endpoints into the same DocumentRoot:
   - `/var/www/rustshop/public/api` (public order API)
   - `/var/www/rustshop/public/admin/api` (admin API)
3. Keep `/var/www/rustshop/server` outside the web root (config + sqlite).

## Apache SPA Rewrite
Use `.htaccess` from `frontend/public/.htaccess` or add to vhost:
```
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

RewriteRule ^api/ - [L]
RewriteRule ^admin/api/ - [L]
RewriteRule ^ index.html [L]
```

## Required Apache Modules
```bash
sudo a2enmod rewrite php8.3
sudo systemctl restart apache2
```

## Backend Permissions
- `/var/www/rustshop/public/assets/uploads` writable by `www-data`
- `/var/www/rustshop/public/data` writable by `www-data`
- `/var/www/rustshop/server/data` writable by `www-data`
- `/var/www/rustshop/server/cache` writable by `www-data`

## Steam Authentication Setup
1. Create `/var/www/rustshop/server/env.php` with your Steam Web API key:
```
<?php
return [
    "steam_api_key" => "YOUR_STEAM_API_KEY"
];
```
2. Create the first admin user:
```
php /var/www/rustshop/server/create_admin.php admin STRONG_PASSWORD superadmin
```
3. User login is Steam-only via `/api/auth/steam-login.php`.

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

## Notes
- SPA routes: `/`, `/catalog`, `/product/:id`, `/cart`, `/checkout`, `/account`, `/support`
- Admin routes: `/admin/login`, `/admin`, `/admin/orders`
- APIs remain at `/api/*` and `/admin/api/*`
