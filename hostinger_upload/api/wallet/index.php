<?php
// hostinger_upload/api/wallet/index.php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../core/WalletService.php';
require_auth();

$userId = get_current_user_id();

try {
    $walletService = new WalletService($pdo);
    $wallet = $walletService->getOrCreateWallet($userId, 'USD');

    echo json_encode([
        'success' => true,
        'data' => [
            'balance' => $wallet['available_balance'],
            'available' => $wallet['available_balance'],
            'locked' => $wallet['locked_balance'] ?? '0.00000000',
            'investment' => $wallet['investment_balance'] ?? '0.00000000',
            'staking' => $wallet['staking_balance'] ?? '0.00000000',
            'currency' => $wallet['currency'] ?? 'USD'
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to load wallet data: ' . $e->getMessage()]);
}
?>
