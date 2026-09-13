====================================================================
  AMZDISTRIBUTOR - HOSTINGER PHP + MYSQL PRODUCTION DEPLOYMENT GUIDE
====================================================================

Congratulations! Your entire platform has been successfully converted from Node.js/TypeScript/Express into a pure, lightning-fast PHP 8.x + MySQL application that runs natively on normal Hostinger shared hosting without any Node.js, npm, or terminal required.

---

### STEP 1: Create MySQL Database in Hostinger
1. Log in to your Hostinger hPanel.
2. Go to **Databases** -> **MySQL Databases**.
3. Create a new MySQL Database, MySQL Username, and a strong Password. Take note of:
   - Database Name (e.g. `u788285039_amzdb`)
   - Database Username (e.g. `u788285039_amzuser`)
   - Database Password

---

### STEP 2: Import Database Schema (`database.sql`)
1. In Hostinger hPanel, go to **phpMyAdmin** and click your newly created database.
2. Click on the **Import** tab at the top.
3. Click **Choose File** and select the **`database.sql`** file from this package.
4. Click **Go** at the bottom to create all required tables (users, wallets, transactions, investments, deposits, withdrawals, etc.).

---

### STEP 3: Configure Database & API Credentials
1. In the Hostinger File Manager, navigate to your `public_html/config/` folder.
2. Open **`database.php`** (or rename `config.example.php` to `database.php`) in the file editor.
3. Update your actual Hostinger MySQL credentials:
   ```php
   $db_host = 'localhost';
   $db_name = 'u788285039_your_db_name';
   $db_user = 'u788285039_your_db_user';
   $db_pass = 'YOUR_MYSQL_PASSWORD';
   ```
4. Click **Save**.

---

### STEP 4: Upload Production Files to `public_html`
1. On your computer, open the **`hostinger_upload`** folder.
2. Select **all files and folders inside it**:
   - `index.html`
   - `assets/`
   - `api/`
   - `config/`
   - `sql/`
   - `database.sql`
   - `.htaccess` (Make sure it starts with a dot!)
3. Upload everything directly into your Hostinger **`public_html/`** root folder.
4. Ensure **"Show Hidden Files"** is enabled in Hostinger File Manager so the `.htaccess` file is recognized by Apache.

---

### STEP 5: Test Your Live Website
1. Open your browser and go to:
   **`https://amzdistributors.com`**
2. Test registration, login, deposits, withdrawals, staking, investment plans, and the admin dashboard.

---

### TECHNICAL SUMMARY
- **Runtime:** PHP 8.x + MySQL (No Node.js, No Express, No PM2)
- **Routing:** Powered by Apache `.htaccess` (SPA frontend routing + REST API endpoints)
- **Security:** PDO prepared statements, secure password hashing, session cookies, and idempotent webhook handling.
