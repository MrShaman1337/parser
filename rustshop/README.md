# RustShop (Apache2 + PHP 8.3)

Premium Rust shop storefront with a PHP admin panel, JSON product storage, and SQLite orders.

## Repository Structure
- `/public` web root (Apache DocumentRoot)
  - `index.html`, `catalog.html`, `product.html`, `cart.html`, `checkout.html`
  - `/admin` admin UI + API
  - `/api` public order APIs
  - `/assets` css/js/img/uploads
  - `/data/products.json` single source of truth for products
- `/server` backend helpers + config + SQLite data (must live outside web root)
  - `admin.config.php`
  - `helpers.php`
  - `/data/store.sqlite` (auto-created)

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

### 4) Apache vhost (IP-only)
Create `/etc/apache2/sites-available/rustshop.conf`:
```
<VirtualHost *:80>
    ServerName 213.176.118.24
    DocumentRoot /var/www/rustshop/public

    <Directory /var/www/rustshop/public>
        Options -Indexes
        AllowOverride None
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/rustshop_error.log
    CustomLog ${APACHE_LOG_DIR}/rustshop_access.log combined
</VirtualHost>
```
Enable and restart:
```bash
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
```

### 6) Set admin password
Generate a bcrypt hash:
```bash
php -r 'echo password_hash("NEWPASS", PASSWORD_DEFAULT).PHP_EOL;'
```
Edit `/var/www/rustshop/server/admin.config.php` and set `password_hash`.
Login will fail until this is configured.

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
- Change admin password before first login.

## Troubleshooting
**403/404**
- Check vhost path and permissions.
- Confirm `DocumentRoot` points to `/var/www/rustshop/public`.

**PHP not running**
- Ensure `libapache2-mod-php` is installed.
- Restart Apache after package install.

**Products JSON not writable**
- Check ownership: `www-data`.
- Check perms on `/var/www/rustshop/public/data`.

**SQLite locked**
- Ensure `/var/www/rustshop/server/data` is writable.
- Use WAL mode (already configured).

## Optional Helper Scripts
- `/server/install_ubuntu24.sh` prints the commands used above.
- `/server/backup.sh` backs up `products.json` and `store.sqlite`.
 