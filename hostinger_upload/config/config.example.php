<?php
/**
 * config.example.php - Configuration Template for AMZDistributor (Hostinger PHP + MySQL)
 * 
 * Instructions:
 * 1. Copy this file and rename/save it as `database.php` or `config.php` inside the `config/` folder.
 * 2. Replace the placeholder values below with your actual Hostinger MySQL database and payment provider credentials.
 */

// --- MySQL Database Configuration ---
define('DB_HOST', 'localhost');
define('DB_NAME', 'u788285039_amzdb');       // Your Hostinger MySQL Database Name
define('DB_USER', 'u788285039_amzuser');     // Your Hostinger MySQL Database Username
define('DB_PASS', 'YourStrongPassword123');  // Your Hostinger MySQL Database Password

// --- Payment Gateway Configuration (NOWPayments / Crypto / Stripe) ---
define('NOWPAYMENTS_API_KEY', 'YOUR_NOWPAYMENTS_API_KEY_HERE');
define('NOWPAYMENTS_IPN_SECRET', 'YOUR_NOWPAYMENTS_IPN_SECRET_HERE');

// --- Application Environment ---
define('APP_ENV', 'production'); // 'production' hides detailed errors, 'development' shows debug info
