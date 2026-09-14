<?php
// hostinger_upload/api/games/settle.php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../core/WalletService.php';
require_auth();

$userId = get_current_user_id();
$input = json_decode(file_get_contents('php://input'), true);

$gameSlug = trim($input['game_slug'] ?? $input['gameSlug'] ?? 'casino');
$payout = floatval($input['payout'] ?? $input['win'] ?? $input['amount'] ?? 0);
$bet = floatval($input['bet'] ?? $input['stake'] ?? 0);
$currency = trim($input['currency'] ?? 'USD');
$clientSeed = $input['client_seed'] ?? null;

if ($payout <= 0) {
    $walletService = new WalletService($pdo);
    $wallet = $walletService->getOrCreateWallet($userId, $currency);
    echo json_encode([
        'success' => true,
        'message' => 'Round settled (loss).',
        'data' => [
            'payout' => 0,
            'new_balance' => floatval($wallet['available_balance']),
            'currency' => $currency
        ]
    ]);
    exit;
}

try {
    $walletService = new WalletService($pdo);
    $result = $walletService->settleWin($userId, $payout, $bet, $gameSlug, $clientSeed, $currency);

    echo json_encode([
        'success' => true,
        'message' => 'Win settled and credited successfully.',
        'data' => [
            'payout' => $payout,
            'balance_before' => $result['balance_before'],
            'balance_after' => $result['balance_after'],
            'new_balance' => $result['balance_after'],
            'currency' => $currency
        ]
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
