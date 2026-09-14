<?php
// api/games/play.php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../core/WalletService.php';
require_auth();

$userId = get_current_user_id();
$input = json_decode(file_get_contents('php://input'), true) ?? [];
$gameId = (string)($input['game_id'] ?? $input['gameId'] ?? $input['game_slug'] ?? '1');
$betAmount = floatval($input['bet_amount'] ?? $input['betAmount'] ?? $input['stake'] ?? $input['amount'] ?? 0);
$multiplier = floatval($input['multiplier'] ?? 2.0);
$selection = (string)($input['selection'] ?? $input['choice'] ?? 'PLAY');
$currency = trim($input['currency'] ?? 'USD');
$clientSeed = $input['client_seed'] ?? null;

if ($betAmount <= 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid bet amount. Must be greater than 0.']);
    exit;
}

try {
    $walletService = new WalletService($pdo);
    // Server computes outcome strictly using admin win probability (0-99%) and applies net profit/loss atomically
    $result = $walletService->playServerAuthoritativeRound(
        $userId,
        $betAmount,
        $gameId,
        $selection,
        $multiplier,
        $clientSeed,
        $currency
    );

    echo json_encode([
        'success' => true,
        'message' => $result['is_win'] ? 'Congratulations, you won!' : 'Better luck next time!',
        'data' => $result
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
