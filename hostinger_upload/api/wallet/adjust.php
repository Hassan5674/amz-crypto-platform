<?php
// hostinger_upload/api/wallet/adjust.php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../core/WalletService.php';
require_auth();

$adminId = get_current_user_id();
$input = json_decode(file_get_contents('php://input'), true);

$targetUserId = intval($input['user_id'] ?? $input['userId'] ?? $adminId);
$amount = floatval($input['amount'] ?? 0);
$type = trim($input['transaction_type'] ?? $input['type'] ?? 'MANUAL_ADJUSTMENT');
$description = trim($input['description'] ?? 'Admin manual balance adjustment');
$currency = trim($input['currency'] ?? 'USD');

if ($amount == 0) {
    echo json_encode(['success' => false, 'message' => 'Adjustment amount cannot be zero.']);
    exit;
}

try {
    $walletService = new WalletService($pdo);
    $result = $walletService->adjustBalance(
        $targetUserId,
        $amount,
        $type,
        $description,
        'ADMIN',
        (string)$adminId,
        $currency
    );

    echo json_encode([
        'success' => true,
        'message' => 'Balance adjusted successfully.',
        'data' => $result
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
