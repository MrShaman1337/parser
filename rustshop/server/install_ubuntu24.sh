#!/usr/bin/env bash
set -euo pipefail

echo "Installing required packages..."
sudo apt update
sudo apt install -y apache2 php libapache2-mod-php php-sqlite3 php-mbstring php-xml php-curl

echo "Creating directories..."
sudo mkdir -p /var/www/rustshop/public
sudo mkdir -p /var/www/rustshop/server

echo "Copying project files (run from repo root)..."
echo "sudo cp -R public/* /var/www/rustshop/public/"
echo "sudo cp -R server/* /var/www/rustshop/server/"

echo "Create vhost /etc/apache2/sites-available/rustshop.conf with DocumentRoot /var/www/rustshop/public"
echo "Enable with: sudo a2ensite rustshop.conf && sudo a2dissite 000-default.conf"
echo "Restart: sudo systemctl restart apache2"
