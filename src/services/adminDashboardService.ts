// src/services/adminDashboardService.ts

export interface AdminDashboardStats {
  users: {
    total: number;
    active: number;
  };
  deposits: {
    total_amount: number;
    pending_amount: number;
    pending_count: number;
  };
  withdrawals: {
    total_amount: number;
    pending_amount: number;
    pending_count: number;
  };
  wallets: {
    total_balance: number;
  };
  games: {
    turnover: number;
    payouts: number;
    house_pnl: number;
  };
  investments: {
    active_count: number;
    volume: number;
    expected_returns: number;
  };
  staking: {
    active_count: number;
    volume: number;
    rewards: number;
  };
  admin_credits: {
    count: number;
    volume: number;
  };
  support: {
    unread_tickets: number;
  };
}

let cachedStats: AdminDashboardStats | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds caching

export const AdminDashboardService = {
  async getDashboardStats(forceRefresh = false): Promise<AdminDashboardStats | null> {
    const now = Date.now();
    if (!forceRefresh && cachedStats && (now - cacheTimestamp < CACHE_TTL)) {
      return cachedStats;
    }

    try {
      const token = localStorage.getItem('apex_session_token') || localStorage.getItem('token') || '';
      const res = await fetch('/api/admin/dashboard_stats.php', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        cachedStats = json.data;
        cacheTimestamp = now;
        return cachedStats;
      }
    } catch (err) {
      console.warn('Failed to fetch admin dashboard stats:', err);
    }
    return cachedStats;
  },

  clearCache() {
    cachedStats = null;
    cacheTimestamp = 0;
  }
};
