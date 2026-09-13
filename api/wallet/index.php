<?php
// api/wallet/index.php
header('Content-Type: application/json; charset=utf-8');
require_once '../../config/database.php';
require_auth();

$userId = get_current_user_id();

try {
    $stmt = $pdo->prepare("SELECT * FROM wallets WHERE user_id = ? LIMIT 1");
    $stmt->execute([$userId]);
    $wallet = $stmt->fetch();

    if (!$wallet) {
        $stmtIns = $pdo->prepare("INSERT INTO wallets (user_id, currency, available_balance) VALUES (?, 'USD', 0.00000000)");
        $stmtIns->execute([$userId]);
        $wallet = [
            'currency' => 'USD',
            'available_balance' => '0.00000000',
            'locked_balance' => '0.00000000',
            'investment_balance' => '0.00000000',
            'staking_balance' => '0.00000000'
        ];
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'balance' => $wallet['available_balance'],
            'available' => $wallet['available_balance'],
            'locked' => $wallet['locked_balance'],
            'investment' => $wallet['investment_balance'],
            'staking' => $wallet['staking_balance'],
            'currency' => $wallet['currency']
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to load wallet data.']);
}
?>
