<?php
// api/wallet/withdraw.php
header('Content-Type: application/json; charset=utf-8');
require_once '../../config/database.php';
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
    $pdo->beginTransaction();

    // Lock wallet and check balance
    $stmtWallet = $pdo->prepare("SELECT id, available_balance FROM wallets WHERE user_id = ? FOR UPDATE");
    $stmtWallet->execute([$userId]);
    $wallet = $stmtWallet->fetch();

    if (!$wallet || floatval($wallet['available_balance']) < $amount) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Insufficient available balance.']);
        exit;
    }

    $newBalance = floatval($wallet['available_balance']) - $amount;

    // Deduct balance
    $stmtUpd = $pdo->prepare("UPDATE wallets SET available_balance = ? WHERE id = ?");
    $stmtUpd->execute([$newBalance, $wallet['id']]);

    // Create withdrawal request
    $stmtWith = $pdo->prepare("INSERT INTO withdrawals (user_id, amount, currency, destination_address, status) VALUES (?, ?, ?, ?, 'PENDING')");
    $stmtWith->execute([$userId, $amount, $currency, $address]);
    $withdrawalId = $pdo->lastInsertId();

    // Ledger entry
    $stmtLedger = $pdo->prepare("INSERT INTO wallet_ledgers (user_id, wallet_id, transaction_type, amount, balance_before, balance_after, reference_type, reference_id, description) VALUES (?, ?, 'WITHDRAWAL', ?, ?, ?, 'WITHDRAWAL', ?, 'Withdrawal request submitted')");
    $stmtLedger->execute([$userId, $wallet['id'], -$amount, $wallet['available_balance'], $newBalance, $withdrawalId]);

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Withdrawal request submitted successfully for admin review.',
        'data' => [
            'withdrawal_id' => $withdrawalId,
            'new_balance' => $newBalance
        ]
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Withdrawal error: ' . $e->getMessage()]);
}
?>
