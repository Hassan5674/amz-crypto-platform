# Hostinger Shared Hosting Deployment Guide

Follow these simple steps to deploy your AMZDistributor platform to Hostinger shared hosting using PHP and MySQL without needing Node.js or a VPS.

---

### Step 1: Build Frontend Static Files (on your PC)
Run the production build on your computer:
```bash
npm install
npm run build
```
This generates optimized static files inside the `dist/` folder.

### Step 2: Create MySQL Database on Hostinger
1. Log into your Hostinger hPanel.
2. Go to **MySQL Databases** and create a new database (e.g., `u123456_amzdb`) and database user.
3. Open **phpMyAdmin**, select your database, go to **Import**, upload `/sql/schema.sql`, and click **Go**.

### Step 3: Configure Database Connection
Edit `/config/database.php` (or `/api/config.php`) with your Hostinger database credentials:
```php
$db_host = 'localhost';
$db_name = 'u123456_amzdb';
$db_user = 'u123456_user';
$db_pass = 'YOUR_DB_PASSWORD';
```

### Step 4: Upload to `public_html` via File Manager or FTP
Upload the following into your domain's **`public_html/`** folder:
1. Everything inside the built **`dist/`** folder (`index.html`, `assets/`, etc.).
2. The `.htaccess` file for SPA routing and clean API calls.
3. The **`api/`** folder containing your PHP backend endpoints.
4. The **`config/`** folder containing your database configuration.

### Step 5: Test Your Live Website
Visit your domain `https://yourdomain.com`:
- Register an account and test the OTP verification code.
- Log in and verify secure session persistence.
- Test deposits, withdrawals, investment allocations, staking, and the provably fair games lobby.
