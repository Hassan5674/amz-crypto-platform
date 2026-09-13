<?php
// api/games/play.php
header('Content-Type: application/json; charset=utf-8');
require_once '../../config/database.php';
require_auth();

$userId = get_current_user_id();
$input = json_decode(file_get_contents('php://input'), true);
$gameId = intval($input['game_id'] ?? $input['gameId'] ?? 1);
$betAmount = floatval($input['bet_amount'] ?? $input['betAmount'] ?? 0);
$multiplier = floatval($input['multiplier'] ?? 2.0);
$isWin = (bool)($input['is_win'] ?? ($multiplier > 1.0 && mt_rand(0, 1) === 1));

if ($betAmount <= 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid bet amount.']);
    exit;
}

try {
    $pdo->beginTransaction();

    // Lock wallet
    $stmtWallet = $pdo->prepare("SELECT id, available_balance FROM wallets WHERE user_id = ? FOR UPDATE");
    $stmtWallet->execute([$userId]);
    $wallet = $stmtWallet->fetch();

    if (!$wallet || floatval($wallet['available_balance']) < $betAmount) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Insufficient balance for this bet.']);
        exit;
    }

    $balanceBefore = floatval($wallet['available_balance']);
    $newBalance = $balanceBefore - $betAmount;

    // Deduct stake
    $stmtUpd = $pdo->prepare("UPDATE wallets SET available_balance = ? WHERE id = ?");
    $stmtUpd->execute([$newBalance, $wallet['id']]);

    // Ledger for bet stake
    $stmtLedgerBet = $pdo->prepare("INSERT INTO wallet_ledgers (user_id, wallet_id, transaction_type, amount, balance_before, balance_after, reference_type, reference_id, description) VALUES (?, ?, 'GAME_BET', ?, ?, ?, 'GAME', ?, 'Game bet stake')");
    $stmtLedgerBet->execute([$userId, $wallet['id'], -$betAmount, $balanceBefore, $newBalance, $gameId]);

    $payout = 0;
    if ($isWin) {
        $payout = $betAmount * $multiplier;
        $winBalanceBefore = $newBalance;
        $newBalance = $winBalanceBefore + $payout;

        $stmtUpdWin = $pdo->prepare("UPDATE wallets SET available_balance = ? WHERE id = ?");
        $stmtUpdWin->execute([$newBalance, $wallet['id']]);

        $stmtLedgerWin = $pdo->prepare("INSERT INTO wallet_ledgers (user_id, wallet_id, transaction_type, amount, balance_before, balance_after, reference_type, reference_id, description) VALUES (?, ?, 'GAME_WIN', ?, ?, ?, 'GAME', ?, 'Game payout win')");
        $stmtLedgerWin->execute([$userId, $wallet['id'], $payout, $winBalanceBefore, $newBalance, $gameId]);
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => $isWin ? 'Congratulations, you won!' : 'Better luck next time!',
        'data' => [
            'is_win' => $isWin,
            'payout' => $payout,
            'net_profit' => $isWin ? ($payout - $betAmount) : -$betAmount,
            'new_balance' => $newBalance
        ]
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Game processing error: ' . $e->getMessage()]);
}
?>
