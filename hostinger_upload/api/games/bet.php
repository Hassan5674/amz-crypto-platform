<?php
// hostinger_upload/api/games/bet.php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../core/WalletService.php';
require_auth();

$userId = get_current_user_id();
$input = json_decode(file_get_contents('php://input'), true);

$gameSlug = trim($input['game_slug'] ?? $input['gameSlug'] ?? $input['game_id'] ?? 'casino');
$stake = floatval($input['stake'] ?? $input['amount'] ?? $input['bet_amount'] ?? 0);
$currency = trim($input['currency'] ?? 'USD');
$clientSeed = $input['client_seed'] ?? null;

if ($stake <= 0) {
    echo json_encode(['success' => false, 'message' => 'Bet amount must be greater than zero.']);
    exit;
}

try {
    $walletService = new WalletService($pdo);
    $result = $walletService->placeBet($userId, $stake, $gameSlug, $clientSeed, $currency);

    echo json_encode([
        'success' => true,
        'message' => 'Bet placed and deducted successfully.',
        'data' => [
            'bet_id' => time(),
            'game_slug' => $gameSlug,
            'stake' => $stake,
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
