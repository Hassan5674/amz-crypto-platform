<?php
// api/wallet/withdraw.php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../core/WalletService.php';
require_auth();

$userId = get_current_user_id();
$input = json_decode(file_get_contents('php://input'), true);
$amount = floatval($input['amount'] ?? 0);
$currency = trim($input['currency'] ?? 'USDT');
$address = trim($input['destination_address'] ?? $input['address'] ?? '');

if ($amount <= 0 || empty($address)) {
    echo json_encode(['success' => false, 'message' => 'Valid amount and destination address are required.']);
    exit;
}

try {
    $walletService = new WalletService($pdo);
    $result = $walletService->withdraw($userId, $amount, $currency, $address, 'Withdrawal request submitted');

    echo json_encode([
        'success' => true,
        'message' => 'Withdrawal request submitted successfully for admin review.',
        'data' => $result
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
