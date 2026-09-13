<?php
// api/wallet/deposit.php
header('Content-Type: application/json; charset=utf-8');
require_once '../../config/database.php';
require_auth();

$userId = get_current_user_id();
$input = json_decode(file_get_contents('php://input'), true);
$amount = floatval($input['amount'] ?? 0);
$currency = trim($input['currency'] ?? 'USDT');

if ($amount <= 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid deposit amount.']);
    exit;
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("INSERT INTO deposits (user_id, amount, currency, status) VALUES (?, ?, ?, 'PENDING')");
    $stmt->execute([$userId, $amount, $currency]);
    $depositId = $pdo->lastInsertId();

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Deposit order created successfully.',
        'data' => [
            'deposit_id' => $depositId,
            'amount' => $amount,
            'currency' => $currency,
            'status' => 'PENDING',
            'payment_url' => '#'
        ]
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Deposit creation failed: ' . $e->getMessage()]);
}
?>
