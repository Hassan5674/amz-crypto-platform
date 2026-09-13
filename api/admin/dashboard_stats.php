<?php
/**
 * Admin Dashboard Comprehensive Statistics Endpoint
 * Aggregates active investments, staked pool totals, manual user credits,
 * total users, deposits, withdrawals, and game turnover.
 */
require_once __DIR__ . '/../config/database.php';

require_auth();
$userId = get_current_user_id();

$stmt = $pdo->prepare("SELECT role FROM users WHERE id = ? LIMIT 1");
$stmt->execute([$userId]);
$currentUser = $stmt->fetch();

if (!$currentUser || $currentUser['role'] !== 'ADMIN') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access denied. Administrator privileges required.']);
    exit;
}

try {
    // 1. User Stats
    $usersCount = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    $activeUsersCount = $pdo->query("SELECT COUNT(*) FROM users WHERE status = 'ACTIVE'")->fetchColumn();

    // 2. Deposit Stats
    $depositsStats = $pdo->query("
        SELECT 
            COALESCE(SUM(price_amount), 0) AS total_deposits,
            COALESCE(SUM(CASE WHEN status = 'PENDING' THEN price_amount ELSE 0 END), 0) AS pending_deposits_amount,
            COUNT(CASE WHEN status = 'PENDING' THEN 1 END) AS pending_deposits_count
        FROM deposits
    ")->fetch();

    // 3. Withdrawal Stats
    $withdrawalsStats = $pdo->query("
        SELECT 
            COALESCE(SUM(amount), 0) AS total_withdrawals,
            COALESCE(SUM(CASE WHEN status = 'PENDING_APPROVAL' THEN amount ELSE 0 END), 0) AS pending_withdrawals_amount,
            COUNT(CASE WHEN status = 'PENDING_APPROVAL' THEN 1 END) AS pending_withdrawals_count
        FROM withdrawals
    ")->fetch();

    // 4. Total Wallet Balance Across All Users
    $walletTotal = $pdo->query("SELECT COALESCE(SUM(available_balance + locked_balance + staking_balance), 0) FROM wallets")->fetchColumn();

    // 5. Game Turnover & PnL
    $gameStats = $pdo->query("
        SELECT 
            COALESCE(SUM(bet_amount), 0) AS total_turnover,
            COALESCE(SUM(win_amount), 0) AS total_payouts,
            COALESCE(SUM(net_result), 0) AS house_pnl
        FROM game_history
    ")->fetch();

    // 6. Active Investments
    $investmentsStats = $pdo->query("
        SELECT 
            COUNT(id) AS active_investments_count,
            COALESCE(SUM(principal_amount), 0) AS active_investments_volume,
            COALESCE(SUM(expected_return), 0) AS expected_returns
        FROM user_investments
        WHERE status = 'ACTIVE'
    ")->fetch();

    // 7. Active Staking
    $stakingStats = $pdo->query("
        SELECT 
            COUNT(id) AS active_stakes_count,
            COALESCE(SUM(staked_amount), 0) AS staked_volume,
            COALESCE(SUM(reward_earned), 0) AS rewards_earned
        FROM user_stakes
        WHERE status = 'ACTIVE'
    ")->fetch();

    // 8. Admin Credited Funds
    $adminCreditsStats = $pdo->query("
        SELECT 
            COUNT(id) AS manual_credits_count,
            COALESCE(SUM(amount), 0) AS manual_credited_volume
        FROM wallet_ledgers
        WHERE transaction_type IN ('ADMIN_CREDIT', 'ADMIN_ADJUSTMENT', 'BONUS') AND amount > 0
    ")->fetch();

    // 9. Unread Support Messages
    $unreadSupport = $pdo->query("
        SELECT COUNT(DISTINCT sm.ticket_id) 
        FROM support_messages sm 
        JOIN support_tickets st ON sm.ticket_id = st.id 
        WHERE sm.sender_type = 'USER' AND sm.is_read = 0 AND st.status = 'OPEN'
    ")->fetchColumn();

    echo json_encode([
        'success' => true,
        'data' => [
            'users' => [
                'total' => intval($usersCount),
                'active' => intval($activeUsersCount)
            ],
            'deposits' => [
                'total_amount' => floatval($depositsStats['total_deposits']),
                'pending_amount' => floatval($depositsStats['pending_deposits_amount']),
                'pending_count' => intval($depositsStats['pending_deposits_count'])
            ],
            'withdrawals' => [
                'total_amount' => floatval($withdrawalsStats['total_withdrawals']),
                'pending_amount' => floatval($withdrawalsStats['pending_withdrawals_amount']),
                'pending_count' => intval($withdrawalsStats['pending_withdrawals_count'])
            ],
            'wallets' => [
                'total_balance' => floatval($walletTotal)
            ],
            'games' => [
                'turnover' => floatval($gameStats['total_turnover']),
                'payouts' => floatval($gameStats['total_payouts']),
                'house_pnl' => floatval($gameStats['house_pnl'])
            ],
            'investments' => [
                'active_count' => intval($investmentsStats['active_investments_count']),
                'volume' => floatval($investmentsStats['active_investments_volume']),
                'expected_returns' => floatval($investmentsStats['expected_returns'])
            ],
            'staking' => [
                'active_count' => intval($stakingStats['active_stakes_count']),
                'volume' => floatval($stakingStats['staked_volume']),
                'rewards' => floatval($stakingStats['rewards_earned'])
            ],
            'admin_credits' => [
                'count' => intval($adminCreditsStats['manual_credits_count']),
                'volume' => floatval($adminCreditsStats['manual_credited_volume'])
            ],
            'support' => [
                'unread_tickets' => intval($unreadSupport)
            ]
        ]
    ]);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to aggregate dashboard statistics: ' . $e->getMessage()
    ]);
}
?>
