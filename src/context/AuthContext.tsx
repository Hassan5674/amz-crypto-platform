import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Role, Permission, RoleType } from '../types/index.js';

export interface UserSessionClient {
  id: number;
  ip_address: string;
  user_agent: string;
  device_type: string;
  location: string;
  created_at: string;
  last_activity_at: string;
  is_current: boolean;
}

export interface LoginHistoryClient {
  id: number;
  status: 'SUCCESS' | 'FAILED' | 'CHALLENGED_2FA';
  ip_address: string;
  user_agent: string;
  device_type: string;
  location: string;
  failure_reason?: string;
  created_at: string;
}

export interface DispatchedEmailClient {
  id: string;
  to: string;
  subject: string;
  type: 'VERIFICATION' | 'PASSWORD_RESET' | 'SECURITY_ALERT';
  previewText: string;
  token?: string;
  code?: string;
  link?: string;
  dispatchedAt: string;
}

interface AuthContextType {
  user: User | null;
  roles: Role[];
  permissions: Permission[];
  currentRole: RoleType;
  isAuthenticated: boolean;
  sessionToken: string | null;
  // Auth flows
  login: (identifier: string, pass: string) => Promise<{ success: boolean; status?: string; requires2fa?: boolean; tempToken?: string; requiresEmailVerification?: boolean; email?: string; error?: string; lockedRemaining?: number }>;
  verify2faLogin: (tempToken: string, code: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { name: string; username: string; email: string; phone?: string; password: string; terms_accepted: boolean }) => Promise<{ success: boolean; error?: string; previewCode?: string; previewToken?: string }>;
  verifyEmail: (tokenOrCode: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; previewCode?: string; previewToken?: string; error?: string }>;
  forgotPassword: (identifier: string) => Promise<{ success: boolean; previewToken?: string; message?: string; error?: string }>;
  resetPassword: (token: string, newPass: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  changePassword: (currentPass: string, newPass: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => Promise<void>;
  logoutAllOtherSessions: () => Promise<{ success: boolean; revokedCount?: number; error?: string }>;
  // Session & 2FA management
  fetchSessions: () => Promise<UserSessionClient[]>;
  revokeSession: (sessionId: number) => Promise<boolean>;
  fetchLoginHistory: () => Promise<LoginHistoryClient[]>;
  initiate2faSetup: () => Promise<{ secret: string; otpauth_url: string; recovery_codes: string[] } | null>;
  enable2fa: (code: string) => Promise<{ success: boolean; error?: string }>;
  disable2fa: (password: string, code: string) => Promise<{ success: boolean; error?: string }>;
  regenerateRecoveryCodes: (password: string) => Promise<{ success: boolean; recoveryCodes?: string[]; error?: string }>;
  // Development / Simulation Utilities
  switchRole: (roleName: RoleType) => void;
  getSimulatedEmails: () => Promise<DispatchedEmailClient[]>;
  refreshCurrentUser: () => Promise<void>;
  // RBAC checks
  hasPermission: (permissionName: string) => boolean;
  hasRole: (roleName: RoleType) => boolean;
  getAuthHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Preset mock accounts representing each role for rapid demonstration
const PRESET_USERS: Record<RoleType, { user: User; roleDesc: string; perms: string[]; tokenMock: string }> = {
  SUPER_ADMIN: {
    user: {
      id: 1,
      uuid: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      name: 'Alexander Wright',
      username: 'superadmin',
      email: 'alex.wright@apexplatform.internal',
      phone: '+1 415 555 0199',
      password_hash: '***',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      email_verified_at: '2025-01-15T08:00:00Z',
      phone_verified_at: '2025-01-15T08:05:00Z',
      two_factor_enabled: true,
      created_at: '2025-01-15T08:00:00Z',
      updated_at: '2026-03-01T10:00:00Z',
      last_login_at: '2026-09-07T13:45:00Z'
    },
    roleDesc: 'Full administrative authority across all platform modules, security controls, and roles.',
    tokenMock: 'superadmin',
    perms: [
      'users.view', 'users.edit', 'users.suspend', 'users.ban',
      'deposits.view', 'deposits.manage', 'withdrawals.view', 'withdrawals.manage',
      'investment_plans.view', 'investment_plans.create', 'investment_plans.edit', 'investment_plans.disable',
      'games.view', 'games.manage', 'support.view', 'support.manage',
      'reports.view', 'reports.export', 'settings.view', 'settings.edit',
      'admins.view', 'admins.create', 'admins.edit', 'admins.disable',
      'wallet.view', 'transactions.view', 'transactions.view_admin', 'financial_reports.view',
      'financial_reconciliation.view', 'financial_adjustments.request', 'financial_adjustments.approve'
    ]
  },
  ADMIN: {
    user: {
      id: 2,
      uuid: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
      name: 'Elena Rostova',
      username: 'elena_admin',
      email: 'elena.rostova@apexplatform.internal',
      phone: '+1 415 555 0244',
      password_hash: '***',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      email_verified_at: '2025-02-10T09:30:00Z',
      phone_verified_at: '2025-02-10T09:35:00Z',
      two_factor_enabled: true,
      created_at: '2025-02-10T09:30:00Z',
      updated_at: '2026-03-02T11:00:00Z',
      last_login_at: '2026-09-07T11:20:00Z'
    },
    roleDesc: 'Operations and compliance administrator.',
    tokenMock: 'admin',
    perms: [
      'users.view', 'users.edit', 'users.suspend',
      'deposits.view', 'withdrawals.view',
      'investment_plans.view', 'games.view',
      'support.view', 'support.manage',
      'reports.view', 'settings.view',
      'wallet.view', 'transactions.view', 'transactions.view_admin', 'financial_reports.view',
      'financial_reconciliation.view', 'financial_adjustments.request'
    ]
  },
  SUPPORT: {
    user: {
      id: 6,
      uuid: 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c',
      name: 'Liam Gallagher',
      username: 'liam_support',
      email: 'liam.g@apexplatform.internal',
      phone: '+1 415 555 0411',
      password_hash: '***',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      email_verified_at: '2025-02-01T00:00:00Z',
      phone_verified_at: '2025-02-01T00:00:00Z',
      two_factor_enabled: true,
      created_at: '2025-02-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
      last_login_at: '2026-09-07T12:00:00Z'
    },
    roleDesc: 'Customer support specialist.',
    tokenMock: 'demo-user-6',
    perms: ['users.view', 'support.view', 'support.manage']
  },
  FINANCE: {
    user: {
      id: 3,
      uuid: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
      name: 'David Kim',
      username: 'david_finance',
      email: 'david.kim@apexplatform.internal',
      phone: '+1 415 555 0388',
      password_hash: '***',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      email_verified_at: '2025-02-20T14:15:00Z',
      phone_verified_at: '2025-02-20T14:20:00Z',
      two_factor_enabled: true,
      created_at: '2025-02-20T14:15:00Z',
      updated_at: '2026-02-20T14:15:00Z',
      last_login_at: '2026-09-06T16:00:00Z'
    },
    roleDesc: 'Financial auditor and treasury supervisor.',
    tokenMock: 'demo-user-3',
    perms: [
      'users.view', 'deposits.view', 'deposits.manage',
      'withdrawals.view', 'withdrawals.manage',
      'reports.view', 'reports.export',
      'wallet.view', 'transactions.view', 'transactions.view_admin', 'financial_reports.view',
      'financial_reconciliation.view', 'financial_adjustments.request', 'financial_adjustments.approve'
    ]
  },
  INVESTMENT_MANAGER: {
    user: {
      id: 7,
      uuid: '77a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c',
      name: 'Helena Berg',
      username: 'helena_invest',
      email: 'helena.b@apexplatform.internal',
      phone: '+46 8 123 4567',
      password_hash: '***',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      email_verified_at: '2025-02-01T00:00:00Z',
      phone_verified_at: '2025-02-01T00:00:00Z',
      two_factor_enabled: true,
      created_at: '2025-02-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
      last_login_at: '2026-09-07T08:30:00Z'
    },
    roleDesc: 'Investment plan structuring and limits supervisor.',
    tokenMock: 'demo-user-7',
    perms: [
      'investment_plans.view', 'investment_plans.create',
      'investment_plans.edit', 'investment_plans.disable',
      'reports.view'
    ]
  },
  GAME_MANAGER: {
    user: {
      id: 8,
      uuid: '88a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c',
      name: 'Kenji Sato',
      username: 'kenji_games',
      email: 'kenji.s@apexplatform.internal',
      phone: '+81 3 1234 5678',
      password_hash: '***',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      email_verified_at: '2025-02-01T00:00:00Z',
      phone_verified_at: '2025-02-01T00:00:00Z',
      two_factor_enabled: true,
      created_at: '2025-02-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
      last_login_at: '2026-09-07T09:00:00Z'
    },
    roleDesc: 'Gaming lobby curator and provably fair auditor.',
    tokenMock: 'demo-user-8',
    perms: ['games.view', 'games.manage', 'reports.view']
  },
  CONTENT_MANAGER: {
    user: {
      id: 9,
      uuid: '99a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c',
      name: 'Chloe Bennett',
      username: 'chloe_content',
      email: 'chloe.b@apexplatform.internal',
      phone: '+1 312 555 0899',
      password_hash: '***',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      email_verified_at: '2025-02-01T00:00:00Z',
      phone_verified_at: '2025-02-01T00:00:00Z',
      two_factor_enabled: true,
      created_at: '2025-02-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
      last_login_at: '2026-09-06T15:00:00Z'
    },
    roleDesc: 'CMS pages and public notices editor.',
    tokenMock: 'demo-user-9',
    perms: ['settings.view', 'reports.view']
  },
  USER: {
    user: {
      id: 4,
      uuid: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
      name: 'Sarah Jenkins',
      username: 'sarah_investor',
      email: 'sarah.j@example.com',
      phone: '+1 650 555 9811',
      password_hash: '***',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      email_verified_at: '2025-03-05T10:00:00Z',
      phone_verified_at: '2025-03-05T10:05:00Z',
      two_factor_enabled: false,
      created_at: '2025-03-05T10:00:00Z',
      updated_at: '2026-03-05T10:00:00Z',
      last_login_at: '2026-09-07T14:10:00Z'
    },
    roleDesc: 'Standard investor & participant user account.',
    tokenMock: 'demo-user-4',
    perms: ['wallet.view', 'transactions.view', 'withdrawals.create', 'withdrawals.view']
  }
};

/**
 * Bulletproof JSON fetch helper that gracefully handles non-JSON responses,
 * server initialization delays (502/503), network glitches, and 404s,
 * preventing any "Unexpected token '<', '<!doctype '... is not valid JSON" errors.
 */
async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit,
  retries = 2
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(input, init);
      if (res.status === 401) {
        window.dispatchEvent(
          new CustomEvent('auth:unauthorized', {
            detail: { message: 'Session expired, please sign in again' }
          })
        );
      }
      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      const isServerUnavailable = res.status >= 500 || res.status === 502 || res.status === 503 || res.status === 504;

      if (data === null || isServerUnavailable) {
        if (attempt < retries && (isServerUnavailable || res.status === 0)) {
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        return {
          ok: false,
          status: res.status,
          data: null,
          error: isServerUnavailable
            ? 'Backend service is currently initializing. Please wait a moment and retry.'
            : res.status === 404
            ? 'Service endpoint not found.'
            : `Server returned non-JSON response (${res.status}): ${text.substring(0, 80)}`
        };
      }

      return {
        ok: res.ok,
        status: res.status,
        data,
        error: !res.ok ? (data?.message || (data?.errors && data.errors.join(', ')) || 'Request failed') : undefined
      };
    } catch (err: unknown) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 600));
        continue;
      }
      const msg = err instanceof Error ? err.message : 'Network error';
      return {
        ok: false,
        status: 0,
        data: null,
        error: msg.includes('Failed to fetch') || msg.includes('NetworkError')
          ? 'Cannot connect to backend server. Please verify the service is running and retry.'
          : msg
      };
    }
  }
  return { ok: false, status: 500, data: null, error: 'Maximum retry attempts exceeded.' };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<RoleType>('USER');
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    return localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token') || null;
  });
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  // Apply authorization header to fetch
  const getAuthHeaders = useCallback(() => {
    const activeTok = sessionToken || localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (activeTok) {
      headers['Authorization'] = `Bearer ${activeTok}`;
    }
    return headers;
  }, [sessionToken]);

  // Refresh current user profile if session token exists
  const refreshCurrentUser = useCallback(async () => {
    const activeTok = sessionToken || localStorage.getItem('apex_session_token') || localStorage.getItem('token') || localStorage.getItem('apex_token');
    if (!activeTok) {
      setUser(null);
      setRoles([]);
      setPermissions([]);
      setCurrentRole('USER');
      setSessionToken(null);
      setIsInitializing(false);
      return;
    }

    try {
      const resp = await safeFetchJson<{
        data?: {
          user: User;
          roles: string[];
          permissions: string[];
        };
      }>('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${activeTok}`
        }
      });

      if (resp.ok && resp.data?.data?.user) {
        setUser(resp.data.data.user);
        const firstRole = (resp.data.data.roles?.[0] as RoleType) || 'USER';
        setCurrentRole(firstRole);
        setRoles(resp.data.data.roles?.map((r: string, idx: number) => ({
          id: idx + 1,
          name: r as RoleType,
          description: `Role ${r}`,
          created_at: new Date().toISOString()
        })) || []);
        setPermissions(resp.data.data.permissions?.map((p: string, idx: number) => ({
          id: idx + 1,
          name: p,
          category: p.split('.')[0],
          description: `Permission: ${p}`
        })) || []);
      } else if (resp.status === 401 || resp.status === 403) {
        localStorage.removeItem('apex_session_token');
        localStorage.removeItem('token');
        localStorage.removeItem('apex_token');
        setSessionToken(null);
        setUser(null);
        setRoles([]);
        setPermissions([]);
        setCurrentRole('USER');
      }
    } catch {
      // Network error during refresh
    } finally {
      setIsInitializing(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    refreshCurrentUser();
  }, [refreshCurrentUser]);

  // 1. Real Login
  const login = async (identifier: string, pass: string) => {
    const resp = await safeFetchJson<{
      data?: {
        token?: string;
        user?: any;
        requires_2fa?: boolean;
        temp_token?: string;
      };
      message?: string;
    }>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password: pass })
    });

    if (!resp.ok) {
      if (resp.status === 423) {
        return {
          success: false,
          error: resp.error || 'Account locked due to consecutive security events.',
          lockedRemaining: 15
        };
      }
      if (resp.status === 403) {
        return {
          success: false,
          status: 'pending_verification' as const,
          requiresEmailVerification: true,
          email: identifier,
          error: resp.error || 'Email verification required. Please verify your OTP first.'
        };
      }
      return { success: false, error: resp.error || 'Invalid credentials' };
    }

    const data = resp.data;
    const usr = data?.data?.user;
    if (usr && (usr.status === 'PENDING_VERIFICATION' || usr.status === 'PENDING' || !usr.email_verified_at)) {
      return {
        success: false,
        status: 'pending_verification' as const,
        requiresEmailVerification: true,
        email: usr.email || identifier,
        error: 'Account is pending email verification. Please verify your OTP.'
      };
    }

    if (data?.data?.requires_2fa) {
      return {
        success: false,
        requires2fa: true,
        tempToken: data.data.temp_token
      };
    }

    if (data && (data as any).success === false) {
      return { success: false, error: (data as any).message || 'Invalid credentials' };
    }

    if (data?.data?.token) {
      const token = data.data.token;
      localStorage.setItem('apex_session_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('apex_token', token);
      setSessionToken(token);
      setUser(data.data.user);
      const userRole = (data.data.user.roles?.[0] as RoleType) || 'USER';
      setCurrentRole(userRole);
      return { success: true };
    }

    return { success: false, error: data?.message || 'Authentication failed. Please check credentials.' };
  };

  // 2. Complete 2FA Login
  const verify2faLogin = async (tempToken: string, code: string) => {
    const resp = await safeFetchJson<{
      data?: {
        token?: string;
        user?: any;
      };
      message?: string;
    }>('/api/auth/2fa/verify-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temp_token: tempToken, code })
    });

    if (!resp.ok) {
      return { success: false, error: resp.error || 'Invalid 2FA code' };
    }

    const data = resp.data;
    if (data?.data?.token) {
      const token = data.data.token;
      localStorage.setItem('apex_session_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('apex_token', token);
      setSessionToken(token);
      setUser(data.data.user);
      const userRole = (data.data.user.roles?.[0] as RoleType) || 'USER';
      setCurrentRole(userRole);
      return { success: true };
    }

    return { success: true };
  };

  // 3. Register
  const register = async (regData: { name: string; username: string; email: string; phone?: string; password: string; terms_accepted: boolean }) => {
    const resp = await safeFetchJson<{
      data?: {
        preview_verification_code?: string;
        preview_verification_token?: string;
      };
      message?: string;
      errors?: string[];
    }>('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regData)
    });

    if (!resp.ok) {
      return {
        success: false,
        error: resp.error || 'Registration failed'
      };
    }

    return {
      success: true,
      previewCode: resp.data?.data?.preview_verification_code,
      previewToken: resp.data?.data?.preview_verification_token
    };
  };

  // 4. Verify Email
  const verifyEmail = async (tokenOrCode: string) => {
    const resp = await safeFetchJson<{
      data?: {
        user?: User;
        message?: string;
      };
      message?: string;
    }>('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenOrCode, code: tokenOrCode })
    });

    if (!resp.ok) {
      return { success: false, error: resp.error || 'Invalid verification token or code' };
    }

    if (resp.data?.data?.user) {
      setUser(resp.data.data.user);
    }

    return { success: true, message: resp.data?.data?.message || 'Email verified successfully' };
  };

  // 5. Resend Verification
  const resendVerification = async (email: string) => {
    const resp = await safeFetchJson<{
      data?: {
        preview_verification_code?: string;
        preview_verification_token?: string;
      };
      message?: string;
    }>('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!resp.ok) {
      return { success: false, error: resp.error || 'Failed to resend code' };
    }

    return {
      success: true,
      previewCode: resp.data?.data?.preview_verification_code,
      previewToken: resp.data?.data?.preview_verification_token
    };
  };

  // 6. Forgot Password
  const forgotPassword = async (identifier: string) => {
    const resp = await safeFetchJson<{
      data?: {
        preview_reset_token?: string;
        message?: string;
      };
      message?: string;
    }>('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier })
    });

    if (!resp.ok) {
      return { success: false, error: resp.error || 'Failed to request password reset' };
    }

    return {
      success: true,
      previewToken: resp.data?.data?.preview_reset_token,
      message: resp.data?.data?.message || 'Reset link dispatched'
    };
  };

  // 7. Reset Password
  const resetPassword = async (token: string, newPass: string) => {
    const resp = await safeFetchJson<{
      message?: string;
      errors?: string[];
    }>('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: newPass })
    });

    if (!resp.ok) {
      return {
        success: false,
        error: resp.error || 'Failed to reset password'
      };
    }

    return { success: true, message: resp.data?.message || 'Password reset successfully' };
  };

  // 8. Change Password (Authenticated)
  const changePassword = async (currentPass: string, newPass: string) => {
    const resp = await safeFetchJson<{
      data?: { message?: string };
      message?: string;
      errors?: string[];
    }>('/api/auth/change-password', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ current_password: currentPass, new_password: newPass })
    });

    if (!resp.ok) {
      return {
        success: false,
        error: resp.error || 'Failed to change password'
      };
    }

    return { success: true, message: resp.data?.data?.message || 'Password changed successfully' };
  };

  // 9. Logout
  const logout = async () => {
    try {
      if (sessionToken) {
        await safeFetchJson('/api/auth/logout', {
          method: 'POST',
          headers: getAuthHeaders()
        });
      }
    } catch {
      // Silent error on logout network fail
    } finally {
      localStorage.removeItem('apex_session_token');
      localStorage.removeItem('token');
      localStorage.removeItem('apex_token');
      setSessionToken(null);
      setUser(null);
    }
  };

  // 10. Logout All Other Sessions
  const logoutAllOtherSessions = async () => {
    const resp = await safeFetchJson<{
      data?: { revoked_count: number };
      message?: string;
    }>('/api/auth/logout-all-others', {
      method: 'POST',
      headers: getAuthHeaders()
    });

    if (!resp.ok) {
      return { success: false, error: resp.error || 'Failed to terminate other sessions' };
    }
    return { success: true, revokedCount: resp.data?.data?.revoked_count || 0 };
  };

  // 11. Fetch Sessions
  const fetchSessions = async (): Promise<UserSessionClient[]> => {
    const resp = await safeFetchJson<{ data?: UserSessionClient[] }>('/api/auth/sessions', {
      headers: getAuthHeaders()
    });
    return resp.data?.data || [];
  };

  // 12. Revoke Session
  const revokeSession = async (sessionId: number): Promise<boolean> => {
    const resp = await safeFetchJson(`/api/auth/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return resp.ok;
  };

  // 13. Fetch Login History
  const fetchLoginHistory = async (): Promise<LoginHistoryClient[]> => {
    const resp = await safeFetchJson<{ data?: LoginHistoryClient[] }>('/api/auth/login-history', {
      headers: getAuthHeaders()
    });
    return resp.data?.data || [];
  };

  // 14. 2FA Setup
  const initiate2faSetup = async () => {
    const resp = await safeFetchJson<{ data?: { secret: string; otpauth_url: string; recovery_codes: string[] } }>('/api/auth/2fa/setup', {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return resp.data?.data || null;
  };

  // 15. Enable 2FA
  const enable2fa = async (code: string) => {
    const resp = await safeFetchJson<{ message?: string }>('/api/auth/2fa/enable', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ code })
    });
    if (!resp.ok) {
      return { success: false, error: resp.error || 'Failed to enable 2FA' };
    }
    if (user) {
      setUser({ ...user, two_factor_enabled: true });
    }
    return { success: true };
  };

  // 16. Disable 2FA
  const disable2fa = async (password: string, code: string) => {
    const resp = await safeFetchJson<{ message?: string }>('/api/auth/2fa/disable', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ password, code })
    });
    if (!resp.ok) {
      return { success: false, error: resp.error || 'Failed to disable 2FA' };
    }
    if (user) {
      setUser({ ...user, two_factor_enabled: false });
    }
    return { success: true };
  };

  // 17. Regenerate Recovery Codes
  const regenerateRecoveryCodes = async (password: string) => {
    const resp = await safeFetchJson<{ data?: { recovery_codes: string[] }; message?: string }>('/api/auth/2fa/recovery-codes', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ password })
    });
    if (!resp.ok) {
      return { success: false, error: resp.error || 'Failed to generate codes' };
    }
    return { success: true, recoveryCodes: resp.data?.data?.recovery_codes || [] };
  };

  // 18. Simulated Email Inbox
  const getSimulatedEmails = async (): Promise<DispatchedEmailClient[]> => {
    const resp = await safeFetchJson<{ data?: DispatchedEmailClient[] }>('/api/auth/simulated-emails');
    return resp.data?.data || [];
  };

  // Role Switcher for Developer / Demonstration mode
  const switchRole = (newRole: RoleType) => {
    // Clear custom session to adopt selected preset
    localStorage.removeItem('apex_session_token');
    setSessionToken(null);
    setCurrentRole(newRole);
  };

  const hasPermission = (permissionName: string): boolean => {
    if (currentRole === 'SUPER_ADMIN') return true;
    return permissions.some(p => p.name === permissionName);
  };

  const hasRole = (roleName: RoleType): boolean => {
    if (currentRole === 'SUPER_ADMIN') return true;
    return currentRole === roleName;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        permissions,
        currentRole,
        isAuthenticated: !!user,
        sessionToken,
        login,
        verify2faLogin,
        register,
        verifyEmail,
        resendVerification,
        forgotPassword,
        resetPassword,
        changePassword,
        logout,
        logoutAllOtherSessions,
        fetchSessions,
        revokeSession,
        fetchLoginHistory,
        initiate2faSetup,
        enable2fa,
        disable2fa,
        regenerateRecoveryCodes,
        switchRole,
        getSimulatedEmails,
        refreshCurrentUser,
        hasPermission,
        hasRole,
        getAuthHeaders
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
