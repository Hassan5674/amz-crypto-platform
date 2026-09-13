<?php
/**
 * Admin Dashboard Financial & Investment Aggregation Endpoint
 * Provides aggregated metrics for active user investment plans, staked pool balances,
 * and admin-added funds specifically for the Admin Dashboard.
 */
require_once __DIR__ . '/../config/database.php';

// Ensure user is authenticated as ADMIN
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
    // 1. Total Active Investment Plans & Volume
    $investmentsQuery = $pdo->query("
        SELECT 
            COUNT(ui.id) AS total_active_investments,
            COALESCE(SUM(ui.principal_amount), 0) AS total_active_investment_volume,
            COALESCE(SUM(ui.expected_return), 0) AS total_expected_returns
        FROM user_investments ui
        WHERE ui.status = 'ACTIVE'
    ");
    $investmentStats = $investmentsQuery->fetch();

    // 2. Total Staked Pools & Staking Volume
    $stakingQuery = $pdo->query("
        SELECT 
            COUNT(us.id) AS total_active_stakes,
            COALESCE(SUM(us.staked_amount), 0) AS total_staked_volume,
            COALESCE(SUM(us.reward_earned), 0) AS total_staking_rewards_earned
        FROM user_stakes us
        WHERE us.status = 'ACTIVE'
    ");
    $stakingStats = $stakingQuery->fetch();

    // 3. Total Admin-Added Funds (Manual Credits / Adjustments)
    $adminFundsQuery = $pdo->query("
        SELECT 
            COUNT(id) AS total_admin_adjustments,
            COALESCE(SUM(amount), 0) AS total_admin_credited_volume
        FROM wallet_ledgers
        WHERE transaction_type IN ('ADMIN_CREDIT', 'ADMIN_ADJUSTMENT', 'BONUS') AND amount > 0
    ");
    $adminFundsStats = $adminFundsQuery->fetch();

    // 4. Recent Active Investments List with User Details
    $recentInvestmentsQuery = $pdo->query("
        SELECT 
            ui.id,
            ui.principal_amount,
            ui.expected_return,
            ui.status,
            ui.created_at,
            ip.name AS plan_name,
            u.username,
            u.email
        FROM user_investments ui
        JOIN investment_plans ip ON ui.plan_id = ip.id
        JOIN users u ON ui.user_id = u.id
        WHERE ui.status = 'ACTIVE'
        ORDER BY ui.created_at DESC
        LIMIT 10
    ");
    $recentInvestments = $recentInvestmentsQuery->fetchAll();

    // 5. Recent Active Stacks List with User Details
    $recentStakesQuery = $pdo->query("
        SELECT 
            us.id,
            us.staked_amount,
            us.reward_earned,
            us.status,
            us.created_at,
            sp.name AS pool_name,
            sp.symbol AS pool_symbol,
            u.username,
            u.email
        FROM user_stakes us
        JOIN staking_pools sp ON us.pool_id = sp.id
        JOIN users u ON us.user_id = u.id
        WHERE us.status = 'ACTIVE'
        ORDER BY us.created_at DESC
        LIMIT 10
    ");
    $recentStakes = $recentStakesQuery->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => [
            'investments' => [
                'stats' => $investmentStats,
                'recent' => $recentInvestments
            ],
            'staking' => [
                'stats' => $stakingStats,
                'recent' => $recentStakes
            ],
            'admin_funds' => $adminFundsStats
        ]
    ]);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database aggregation error: ' . $e->getMessage()
    ]);
}
?>
