// Global shared TypeScript interfaces and models for ApexPlatform Phase 1

export type RoleType = 
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'SUPPORT'
  | 'FINANCE'
  | 'INVESTMENT_MANAGER'
  | 'GAME_MANAGER'
  | 'CONTENT_MANAGER'
  | 'USER';

export type UserStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'BANNED' | 'LOCKED' | 'CLOSED';

export interface User {
  id: number;
  uuid: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  password_hash: string;
  avatar: string;
  status: UserStatus;
  email_verified_at: string | null;
  phone_verified_at: string | null;
  two_factor_enabled: boolean;
  two_factor_secret?: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface EmailVerificationToken {
  id: number;
  user_id: number;
  email: string;
  token_hash: string;
  code: string;
  expires_at: string;
  created_at: string;
  used_at: string | null;
}

export interface PasswordResetToken {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: string;
  created_at: string;
  used_at: string | null;
}

export interface TwoFactorSecret {
  user_id: number;
  secret: string;
  recovery_codes_hashes: string[];
  enabled_at: string | null;
}

export interface AccountRestriction {
  id: number;
  user_id: number;
  type: 'SUSPEND' | 'BAN' | 'LOCK';
  reason: string;
  actor_user_id: number | null;
  created_at: string;
  revoked_at: string | null;
}

export interface LoginHistoryEntry {
  id: number;
  user_id: number;
  status: 'SUCCESS' | 'FAILED' | 'CHALLENGED_2FA';
  ip_address: string;
  user_agent: string;
  device_type: string;
  location: string;
  failure_reason?: string;
  created_at: string;
}

export interface UserProfile {
  id: number;
  user_id: number;
  country: string;
  timezone: string;
  language: string;
  date_of_birth: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  profile_metadata: Record<string, unknown>;
}

export interface Role {
  id: number;
  name: RoleType;
  description: string;
  created_at: string;
}

export interface Permission {
  id: number;
  name: string;
  category: string;
  description: string;
}

export interface RolePermission {
  role_id: number;
  permission_id: number;
}

export interface UserRole {
  user_id: number;
  role_id: number;
}

export interface UserSession {
  id: number;
  user_id: number;
  session_token: string;
  ip_address: string;
  user_agent: string;
  device_type: string;
  location: string;
  created_at: string;
  last_activity_at: string;
  expires_at: string;
  is_current?: boolean;
}

export type NotificationType = 'SECURITY' | 'ACCOUNT' | 'SYSTEM' | 'INVESTMENT' | 'SUPPORT';

export interface NotificationItem {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'RESOLVED' | 'CLOSED';

export interface SupportTicket {
  id: number;
  user_id: number;
  subject: string;
  category: 'ACCOUNT' | 'VERIFICATION' | 'TECHNICAL' | 'BILLING' | 'GENERAL';
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
  message_count?: number;
}

export interface SupportMessage {
  id: number;
  ticket_id: number;
  sender_user_id: number;
  sender_role: 'USER' | 'SUPPORT' | 'ADMIN' | 'SUPER_ADMIN';
  message: string;
  attachment_metadata: { name: string; size: number; mime: string } | null;
  created_at: string;
}

export interface AuditLog {
  id: number;
  actor_user_id: number | null;
  actor_name?: string;
  actor_role?: RoleType;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  ip_metadata: string;
  user_agent: string;
  created_at: string;
}

export interface SystemSetting {
  id: number;
  key: string;
  value: string;
  type: 'STRING' | 'BOOLEAN' | 'NUMBER' | 'JSON';
  description: string;
  updated_at: string;
}

export interface ContentPage {
  id: number;
  slug: string;
  title: string;
  content: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  status: 'DRAFT' | 'PUBLISHED' | 'EXPIRED';
  publish_at: string;
  expires_at: string | null;
}

export interface StakingPool {
  id: number;
  asset_symbol: string;
  asset_name: string;
  lockup_days: number;
  min_stake: number;
  max_stake: number;
  estimated_apr_indicator: string; // Informational placeholder
  status: 'ACTIVE' | 'FULL' | 'PAUSED';
  total_staked_indicator: string;
}

export interface GameItem {
  id: number;
  slug: string;
  name: string;
  category: 'PROBABILISTIC' | 'STRATEGY' | 'ARCADE';
  description: string;
  thumbnail: string;
  status: 'AVAILABLE' | 'MAINTENANCE' | 'COMING_SOON';
  rtp_indicator: string;
}

export interface ReferralData {
  referral_code: string;
  referral_link: string;
  total_referred: number;
  active_referred: number;
  referral_tier: string;
  referred_users: Array<{
    id: number;
    username: string;
    joined_at: string;
    status: string;
  }>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  request_id: string;
  timestamp: string;
}

export * from './finance.js';
export * from './investment.js';

