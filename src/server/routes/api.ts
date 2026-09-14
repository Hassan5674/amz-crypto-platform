import { Router, Request, Response } from 'express';
import { dataStore } from '../dataStore.js';
import { createResponse, createErrorResponse } from '../errorHandler.js';
import {
  authMiddleware,
  requirePermission,
  requireSuperAdmin,
  protectSuperAdminTarget,
  AuthenticatedRequest
} from '../middleware/auth.js';
import {
  loginRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
  emailVerifyRateLimiter,
  rateLimiter
} from '../middleware/rateLimit.js';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateBase32Secret,
  verifyTotpCode,
  generateRecoveryCodes,
  verifyRecoveryCode,
  parseUserAgent,
  generateSecureToken
} from '../security.js';
import { emailService } from '../services/emailService.js';
import { securityEventService } from '../services/securityEventService.js';
import { registeredJobs, executeJob } from '../jobs.js';
import { logger } from '../logger.js';
import { User, RoleType } from '../../types/index.js';
import { accountService } from '../finance/accountService.js';
import { balanceService } from '../finance/balanceService.js';
import { adjustmentService } from '../finance/adjustmentService.js';
import financeRouter from './finance.js';
import withdrawalsRouter from './withdrawals.js';
import { investmentRoutes } from './investments.js';
import { stakingRoutes } from './staking.js';
import { referralRoutes } from './referral.js';
import { gameRoutes } from './games.js';
import cryptoRouter from './crypto.js';

const router = Router();

// Mount Phase 3, 5, 6, 7, 8, and 9-15 Game & Platform Endpoints
router.use('/', financeRouter);
router.use('/', withdrawalsRouter);
router.use('/', investmentRoutes);
router.use('/', stakingRoutes);
router.use('/', referralRoutes);
router.use('/', gameRoutes);
router.use('/crypto', cryptoRouter);

// Store temporary in-memory 2FA challenges (expires in 5 minutes)
interface TwoFactorChallenge {
  userId: number;
  expiresAt: number;
}
const twoFactorLoginChallenges = new Map<string, TwoFactorChallenge>();

// Clean helper to sanitize user for frontend consumption
function toSafeUser(user: User, roles: RoleType[], permissions: string[]) {
  return {
    id: user.id,
    uuid: user.uuid,
    name: user.name,
    username: user.username,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    status: user.status,
    email_verified: !!user.email_verified_at,
    email_verified_at: user.email_verified_at,
    phone_verified_at: user.phone_verified_at,
    two_factor_enabled: user.two_factor_enabled,
    roles,
    permissions,
    created_at: user.created_at,
    last_login_at: user.last_login_at
  };
}

// ----------------------------------------------------
// Health & System Status
// ----------------------------------------------------
router.get('/health', (_req: Request, res: Response) => {
  res.json(createResponse({
    status: 'HEALTHY',
    version: '2.0.0-phase2',
    timestamp: new Date().toISOString(),
    database: 'CONNECTED_SCHEMA_READY',
    auth_engine: 'PRODUCTION_SESSION_RBAC_ACTIVE',
    two_factor_engine: 'RFC_6238_TOTP_ACTIVE',
    security_audit_stream: 'OPERATIONAL',
    financial_execution: 'INACTIVE_PHASE_1_GUARD'
  }, 'System status operational'));
});

router.get('/system/status', (_req: Request, res: Response) => {
  res.json(createResponse({
    uptime_seconds: Math.floor(process.uptime()),
    node_version: process.version,
    memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    services: [
      { name: 'Core API Gateway', status: 'OPERATIONAL', latency_ms: 4 },
      { name: 'Identity & Session Engine', status: 'OPERATIONAL', latency_ms: 5 },
      { name: 'Two-Factor Authentication Service', status: 'OPERATIONAL', latency_ms: 3 },
      { name: 'Rate Limiting & Lockout Guard', status: 'OPERATIONAL', latency_ms: 2 },
      { name: 'Audit & Compliance SIEM Stream', status: 'OPERATIONAL', latency_ms: 3 },
      { name: 'Financial Transaction Gateway', status: 'OFFLINE_BY_DESIGN_PHASE_1', latency_ms: 0 }
    ]
  }));
});

// ----------------------------------------------------
// Phase 2: Registration System
// ----------------------------------------------------
router.post('/auth/register', registerRateLimiter, async (req: Request, res: Response) => {
  const { name, username, email, phone, password, terms_accepted } = req.body;

  // 1. Mandatory Fields Validation
  if (!name || !username || !email || !password) {
    return res.status(400).json(
      createErrorResponse('Full name, username, email, and password are required', ['missing_fields'])
    );
  }

  // 2. Terms Acceptance
  if (!terms_accepted) {
    return res.status(400).json(
      createErrorResponse('You must accept the Terms of Service and Privacy Policy to register.', ['terms_required'])
    );
  }

  // 3. Username and Email Format Validation
  const cleanUsername = String(username).trim();
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanUsername)) {
    return res.status(400).json(
      createErrorResponse('Username must be 3-30 characters and contain only letters, numbers, and underscores.', ['invalid_username'])
    );
  }

  const cleanEmail = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json(
      createErrorResponse('Please provide a valid email address.', ['invalid_email'])
    );
  }

  // 4. Password Strength Verification
  const pwdValidation = validatePasswordStrength(password);
  if (!pwdValidation.isValid) {
    return res.status(400).json(
      createErrorResponse('Password does not satisfy institutional security policy', pwdValidation.errors)
    );
  }

  // 5. Uniqueness Check
  const existingUser = dataStore.getUserByEmailOrUsername(cleanEmail) || dataStore.getUserByEmailOrUsername(cleanUsername);
  if (existingUser) {
    return res.status(409).json(
      createErrorResponse('An account with this email address or username already exists.', ['account_exists'])
    );
  }

  // 6. Secure Password Hashing
  const passwordHash = hashPassword(password);

  // 7. Entity Creation
  const newUserId = dataStore.users.length + 1;
  const newUser: User = {
    id: newUserId,
    uuid: `u-${generateSecureToken(8)}`,
    name: String(name).trim(),
    username: cleanUsername,
    email: cleanEmail,
    phone: phone ? String(phone).trim() : '',
    password_hash: passwordHash,
    avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
    status: 'PENDING_VERIFICATION',
    email_verified_at: null,
    phone_verified_at: null,
    two_factor_enabled: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_login_at: null
  };

  const isFirstUser = dataStore.users.length === 0;
  dataStore.users.push(newUser);

  // Attach roles: if first user, grant SUPER_ADMIN + ADMIN + USER so owner has full administrative power
  if (isFirstUser) {
    dataStore.userRoles.push({ user_id: newUser.id, role_id: 1 }); // SUPER_ADMIN
    dataStore.userRoles.push({ user_id: newUser.id, role_id: 2 }); // ADMIN
    dataStore.userRoles.push({ user_id: newUser.id, role_id: 8 }); // USER
  } else {
    dataStore.userRoles.push({ user_id: newUser.id, role_id: 8 }); // USER
  }

  // Initialize empty profile
  dataStore.profiles.push({
    id: dataStore.profiles.length + 1,
    user_id: newUser.id,
    country: 'United States',
    timezone: 'UTC',
    language: 'en',
    date_of_birth: null,
    address_line1: null,
    address_line2: null,
    city: null,
    state_province: null,
    postal_code: null,
    profile_metadata: isFirstUser ? { note: 'Platform Owner / Super Administrator' } : {}
  });

  // 8. Generate Email Verification Token & 6-Digit Code
  const { rawToken, code } = dataStore.createEmailVerificationToken(newUser.id, newUser.email);
  const emailDispatchResult = await emailService.sendVerificationEmail(newUser.email, newUser.username, rawToken, code);

  // 9. Security Event Logging
  securityEventService.record({
    type: 'USER_REGISTERED',
    actor: { id: newUser.id, name: newUser.name, role: isFirstUser ? 'SUPER_ADMIN' : 'USER' },
    target: { type: 'users', id: newUser.id },
    description: `New member account created: ${newUser.username} (${newUser.email}) ${isFirstUser ? '[Owner/SuperAdmin]' : ''}`,
    ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
    userAgent: req.headers['user-agent'] as string,
    severity: 'LOW'
  });

  res.status(201).json(createResponse({
    user: {
      id: newUser.id,
      uuid: newUser.uuid,
      username: newUser.username,
      email: newUser.email,
      status: newUser.status,
      is_owner: isFirstUser
    },
    verification_required: true,
    email_dispatch: emailDispatchResult,
    message: 'Registration successful. A verification email with your 6-digit activation code has been dispatched.'
  }, 'Account created successfully'));
});

// ----------------------------------------------------
// Phase 2: Login System & Session Issuance
// ----------------------------------------------------
router.post('/auth/login', loginRateLimiter, async (req: Request, res: Response) => {
  const { identifier, password } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] as string || 'Unknown Device';
  const { deviceType } = parseUserAgent(userAgent);

  if (!identifier || !password) {
    return res.status(400).json(
      createErrorResponse('Username or email and password are required', ['identifier_missing', 'password_missing'])
    );
  }

  // 1. Check Rate Limiter / Account Lockout
  const lockStatus = rateLimiter.isLoginLocked(identifier);
  if (lockStatus.locked) {
    securityEventService.record({
      type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      description: `Attempted login on locked identifier '${identifier}'`,
      ip,
      userAgent,
      severity: 'HIGH'
    });
    return res.status(423).json(
      createErrorResponse(`Account temporarily locked due to consecutive failed attempts. Please retry in ${lockStatus.remainingMinutes} minutes.`, ['account_locked'], 423)
    );
  }

  // 2. Identify User
  const user = dataStore.getUserByEmailOrUsername(identifier);
  if (!user) {
    rateLimiter.recordFailedLogin(identifier);
    securityEventService.record({
      type: 'LOGIN_FAILED',
      description: `Authentication failed: non-existent identifier '${identifier}'`,
      ip,
      userAgent,
      severity: 'LOW'
    });
    return res.status(401).json(
      createErrorResponse('Invalid credentials provided', ['auth_failed'], 401)
    );
  }

  // 3. Verify Account Status
  if (user.status === 'BANNED') {
    securityEventService.record({
      type: 'LOGIN_FAILED',
      actor: { id: user.id, name: user.name },
      description: `Banned user '${user.username}' attempted authentication`,
      ip,
      userAgent,
      severity: 'MEDIUM'
    });
    return res.status(403).json(
      createErrorResponse('Your account has been permanently banned.', ['account_banned'], 403)
    );
  }

  if (user.status === 'SUSPENDED') {
    securityEventService.record({
      type: 'LOGIN_FAILED',
      actor: { id: user.id, name: user.name },
      description: `Suspended user '${user.username}' attempted authentication`,
      ip,
      userAgent,
      severity: 'MEDIUM'
    });
    return res.status(403).json(
      createErrorResponse('Your account is currently suspended. Please contact institutional compliance support.', ['account_suspended'], 403)
    );
  }

  if (user.status === 'LOCKED') {
    return res.status(423).json(
      createErrorResponse('Your account is locked due to security policy violations. Please reset your password or contact support.', ['account_locked'], 423)
    );
  }

  // 4. Cryptographic Password Verification
  const isPasswordValid = verifyPassword(password, user.password_hash);
  if (!isPasswordValid) {
    const failedStats = rateLimiter.recordFailedLogin(identifier);
    dataStore.addLoginHistory({
      user_id: user.id,
      status: 'FAILED',
      ip_address: ip,
      user_agent: userAgent,
      device_type: deviceType,
      location: 'United States',
      failure_reason: 'Incorrect password'
    });

    if (failedStats.isLocked) {
      user.status = 'LOCKED';
      user.updated_at = new Date().toISOString();
      securityEventService.record({
        type: 'ACCOUNT_LOCKED_AUTO',
        actor: { id: user.id, name: user.name },
        target: { type: 'users', id: user.id },
        description: `Account '${user.username}' automatically locked after 5 consecutive failed login attempts`,
        ip,
        userAgent,
        severity: 'HIGH'
      });
      return res.status(423).json(
        createErrorResponse('Account has been locked due to 5 consecutive failed login attempts. Please reset your password.', ['account_locked'], 423)
      );
    }

    securityEventService.record({
      type: 'LOGIN_FAILED',
      actor: { id: user.id, name: user.name },
      description: `Failed login attempt for user '${user.username}' (attempt ${failedStats.count}/5)`,
      ip,
      userAgent,
      severity: 'LOW'
    });

    return res.status(401).json(
      createErrorResponse(`Invalid credentials provided. ${5 - failedStats.count} attempts remaining before temporary account lock.`, ['auth_failed'], 401)
    );
  }

  // Clear failed attempt counters
  rateLimiter.resetFailedLogins(identifier);

  // Check if user email is verified
  if (!user.email_verified_at || user.status === 'PENDING_VERIFICATION') {
    const { rawToken, code } = dataStore.createEmailVerificationToken(user.id, user.email);
    try {
      await emailService.sendVerificationEmail(user.email, user.username, rawToken, code);
    } catch (err) {
      console.error('Failed to dispatch verification email during login:', err);
    }

    securityEventService.record({
      type: 'LOGIN_UNVERIFIED',
      actor: { id: user.id, name: user.name },
      description: `Unverified user '${user.username}' attempted login; verification code dispatched`,
      ip,
      userAgent,
      severity: 'MEDIUM'
    });

    return res.status(403).json({
      success: false,
      status: 'pending_verification',
      requiresEmailVerification: true,
      email: user.email,
      previewCode: code,
      preview_verification_code: code,
      message: `Your account is not verified yet. We have sent a fresh 6-digit verification code to your email (${user.email}). Please enter it to complete sign-in.`,
      error: `Your account is not verified yet. We have sent a fresh 6-digit verification code to your email (${user.email}). Please enter it to complete sign-in.`,
      data: {
        requiresEmailVerification: true,
        email: user.email,
        previewCode: code,
        preview_verification_code: code
      }
    });
  }

  // 5. Two-Factor Authentication Challenge
  if (user.two_factor_enabled) {
    const tempChallengeToken = `temp_2fa_${user.id}_${generateSecureToken(24)}`;
    twoFactorLoginChallenges.set(tempChallengeToken, {
      userId: user.id,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    dataStore.addLoginHistory({
      user_id: user.id,
      status: 'CHALLENGED_2FA',
      ip_address: ip,
      user_agent: userAgent,
      device_type: deviceType,
      location: 'United States'
    });

    securityEventService.record({
      type: 'LOGIN_2FA_CHALLENGE',
      actor: { id: user.id, name: user.name },
      description: `User '${user.username}' passed credentials; 2FA verification challenge issued`,
      ip,
      userAgent,
      severity: 'LOW'
    });

    return res.json(createResponse({
      requires_2fa: true,
      temp_token: tempChallengeToken,
      message: 'Password verified. Enter your 6-digit authenticator code or backup recovery code to complete login.'
    }));
  }

  // 6. Direct Session Creation (No 2FA Required)
  const session = dataStore.createSession(user.id, ip, userAgent, deviceType, 'United States', 7);

  dataStore.addLoginHistory({
    user_id: user.id,
    status: 'SUCCESS',
    ip_address: ip,
    user_agent: userAgent,
    device_type: deviceType,
    location: 'United States'
  });

  const roles = dataStore.getUserRoles(user.id).map(r => r.name);
  const permissions = dataStore.getUserPermissions(user.id).map(p => p.name);

  securityEventService.record({
    type: 'LOGIN_SUCCESS',
    actor: { id: user.id, name: user.name, role: roles[0] },
    target: { type: 'sessions', id: session.id },
    description: `User '${user.username}' successfully authenticated via password verification`,
    ip,
    userAgent,
    severity: 'LOW'
  });

  res.json(createResponse({
    token: session.session_token,
    user: toSafeUser(user, roles, permissions),
    message: 'Authentication successful'
  }));
});

// ----------------------------------------------------
// Phase 2: 2FA Login Verification
// ----------------------------------------------------
router.post('/auth/2fa/verify-login', loginRateLimiter, (req: Request, res: Response) => {
  const { temp_token, code } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] as string || 'Unknown Device';
  const { deviceType } = parseUserAgent(userAgent);

  if (!temp_token || !code) {
    return res.status(400).json(
      createErrorResponse('Temporary challenge token and 2FA code are required', ['missing_fields'])
    );
  }

  const challenge = twoFactorLoginChallenges.get(temp_token);
  if (!challenge || challenge.expiresAt < Date.now()) {
    return res.status(401).json(
      createErrorResponse('2FA verification session expired. Please log in again.', ['session_expired'], 401)
    );
  }

  const user = dataStore.getUserById(challenge.userId);
  if (!user) {
    return res.status(401).json(createErrorResponse('User not found', ['user_not_found'], 401));
  }

  const twoFactorSecret = dataStore.getTwoFactorSecret(user.id);
  if (!twoFactorSecret) {
    return res.status(400).json(createErrorResponse('Two-factor authentication not configured for account', ['2fa_not_configured']));
  }

  const cleanCode = String(code).trim();
  let verified = false;
  let usedRecoveryCode = false;

  // Try standard TOTP code verification
  if (verifyTotpCode(twoFactorSecret.secret, cleanCode)) {
    verified = true;
  } else {
    // Check backup recovery codes
    const recoveryResult = verifyRecoveryCode(cleanCode, twoFactorSecret.recovery_codes_hashes);
    if (recoveryResult.valid) {
      verified = true;
      usedRecoveryCode = true;
      // Consume the used recovery code
      twoFactorSecret.recovery_codes_hashes.splice(recoveryResult.matchingIndex, 1);
    }
  }

  if (!verified) {
    securityEventService.record({
      type: 'LOGIN_FAILED',
      actor: { id: user.id, name: user.name },
      description: `Invalid 2FA code submitted for user '${user.username}'`,
      ip,
      userAgent,
      severity: 'MEDIUM'
    });
    return res.status(401).json(
      createErrorResponse('Invalid 2FA authenticator or recovery code', ['invalid_2fa_code'], 401)
    );
  }

  // Clear challenge token
  twoFactorLoginChallenges.delete(temp_token);

  // Create session
  const session = dataStore.createSession(user.id, ip, userAgent, deviceType, 'United States', 7);

  dataStore.addLoginHistory({
    user_id: user.id,
    status: 'SUCCESS',
    ip_address: ip,
    user_agent: userAgent,
    device_type: deviceType,
    location: 'United States'
  });

  const roles = dataStore.getUserRoles(user.id).map(r => r.name);
  const permissions = dataStore.getUserPermissions(user.id).map(p => p.name);

  securityEventService.record({
    type: 'LOGIN_SUCCESS',
    actor: { id: user.id, name: user.name, role: roles[0] },
    target: { type: 'sessions', id: session.id },
    description: `User '${user.username}' completed 2FA authentication ${usedRecoveryCode ? '(Backup Recovery Code Used)' : '(TOTP)'}`,
    ip,
    userAgent,
    severity: 'LOW'
  });

  res.json(createResponse({
    token: session.session_token,
    user: toSafeUser(user, roles, permissions),
    used_recovery_code: usedRecoveryCode,
    remaining_recovery_codes: twoFactorSecret.recovery_codes_hashes.length,
    message: 'Two-factor authentication verified successfully'
  }));
});

// ----------------------------------------------------
// Phase 2: Email Verification Endpoints
// ----------------------------------------------------
router.post('/auth/verify-email', emailVerifyRateLimiter, async (req: Request, res: Response) => {
  const { token, code } = req.body;
  const lookup = (token || code || '').trim();

  if (!lookup) {
    return res.status(400).json(
      createErrorResponse('Verification token or 6-digit confirmation code is required', ['missing_token'])
    );
  }

  const result = dataStore.verifyEmailTokenOrCode(lookup);
  if (!result.success || !result.userId) {
    return res.status(400).json(
      createErrorResponse(result.message || 'Invalid or expired verification token/code', ['invalid_token'])
    );
  }

  const user = dataStore.getUserById(result.userId)!;
  const roles = dataStore.getUserRoles(user.id).map(r => r.name);
  const permissions = dataStore.getUserPermissions(user.id).map(p => p.name);

  // Send congratulatory welcome email upon successful verification
  await emailService.sendWelcomeEmail(user.email, user.username);

  securityEventService.record({
    type: 'EMAIL_VERIFIED',
    actor: { id: user.id, name: user.name, role: roles[0] },
    target: { type: 'users', id: user.id },
    description: `Email address '${user.email}' verified for user '${user.username}'`,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] as string,
    severity: 'LOW'
  });

  res.json(createResponse({
    user: toSafeUser(user, roles, permissions),
    message: 'Email address verified successfully. Your account is now fully active.'
  }));
});

router.post('/auth/resend-verification', emailVerifyRateLimiter, async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json(createErrorResponse('Email address is required', ['missing_email']));
  }

  const user = dataStore.getUserByEmailOrUsername(email);
  if (!user) {
    // Return friendly generic response to prevent email probing
    return res.json(createResponse(null, 'If an account exists with this email, a new verification code has been dispatched.'));
  }

  if (user.email_verified_at) {
    return res.status(400).json(createErrorResponse('This email address has already been verified.', ['already_verified']));
  }

  const { rawToken, code } = dataStore.createEmailVerificationToken(user.id, user.email);
  await emailService.sendVerificationEmail(user.email, user.username, rawToken, code);

  securityEventService.record({
    type: 'EMAIL_VERIFICATION_REQUESTED',
    actor: { id: user.id, name: user.name },
    target: { type: 'users', id: user.id },
    description: `New email verification code requested for '${user.email}'`,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] as string,
    severity: 'LOW'
  });

  res.json(createResponse({
    preview_verification_code: code,
    preview_verification_token: rawToken,
    message: 'A fresh 6-digit confirmation code has been dispatched to your email address.'
  }));
});

// ----------------------------------------------------
// Phase 2: Password Reset System
// ----------------------------------------------------
router.post('/auth/forgot-password', passwordResetRateLimiter, async (req: Request, res: Response) => {
  const { identifier } = req.body;
  if (!identifier) {
    return res.status(400).json(createErrorResponse('Email address or username is required', ['missing_identifier']));
  }

  const user = dataStore.getUserByEmailOrUsername(identifier);
  let previewToken: string | undefined;

  if (user) {
    const { rawToken } = dataStore.createPasswordResetToken(user.id);
    previewToken = rawToken;
    await emailService.sendPasswordResetEmail(user.email, user.username, rawToken);

    securityEventService.record({
      type: 'PASSWORD_RESET_REQUESTED',
      actor: { id: user.id, name: user.name },
      target: { type: 'users', id: user.id },
      description: `Password reset link requested for user '${user.username}'`,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] as string,
      severity: 'LOW'
    });
  }

  // Always return consistent message to avoid user enumeration
  res.json(createResponse({
    preview_reset_token: previewToken,
    message: 'If an account exists with that identifier, a password reset link has been dispatched to its registered email.'
  }));
});

router.post('/auth/reset-password', passwordResetRateLimiter, (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json(createErrorResponse('Reset token and new password are required', ['missing_fields']));
  }

  const validation = dataStore.verifyPasswordResetToken(token);
  if (!validation.success || !validation.userId) {
    return res.status(400).json(
      createErrorResponse(validation.message || 'Invalid or expired password reset link', ['invalid_token'])
    );
  }

  const user = dataStore.getUserById(validation.userId)!;

  // Validate new password strength
  const pwdValidation = validatePasswordStrength(password);
  if (!pwdValidation.isValid) {
    return res.status(400).json(
      createErrorResponse('Password does not meet institutional strength requirements', pwdValidation.errors)
    );
  }

  // Update password
  user.password_hash = hashPassword(password);
  if (user.status === 'LOCKED') {
    user.status = 'ACTIVE'; // Auto-unlock upon successful verified password reset
  }
  user.updated_at = new Date().toISOString();

  // Mark token as used
  dataStore.markPasswordResetUsed(token);

  // Revoke all existing sessions for security
  dataStore.revokeAllUserSessions(user.id);

  securityEventService.record({
    type: 'PASSWORD_RESET_COMPLETED',
    actor: { id: user.id, name: user.name },
    target: { type: 'users', id: user.id },
    description: `Password successfully reset for user '${user.username}'. All previous sessions revoked.`,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] as string,
    severity: 'MEDIUM'
  });

  res.json(createResponse(null, 'Password has been reset successfully. Please log in with your new password.'));
});

// ----------------------------------------------------
// Phase 2: Password Change (Authenticated)
// ----------------------------------------------------
router.post('/auth/change-password', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { current_password, new_password } = req.body;
  const user = req.user!;

  if (!current_password || !new_password) {
    return res.status(400).json(
      createErrorResponse('Current password and new password are required', ['missing_fields'])
    );
  }

  if (!verifyPassword(current_password, user.password_hash)) {
    securityEventService.record({
      type: 'PASSWORD_CHANGED',
      actor: { id: user.id, name: user.name },
      description: `Failed password change attempt: incorrect current password`,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] as string,
      severity: 'MEDIUM'
    });
    return res.status(401).json(
      createErrorResponse('Current password does not match records', ['invalid_current_password'])
    );
  }

  if (current_password === new_password) {
    return res.status(400).json(
      createErrorResponse('New password must be different from current password', ['same_password'])
    );
  }

  const pwdValidation = validatePasswordStrength(new_password);
  if (!pwdValidation.isValid) {
    return res.status(400).json(
      createErrorResponse('New password does not meet security requirements', pwdValidation.errors)
    );
  }

  user.password_hash = hashPassword(new_password);
  user.updated_at = new Date().toISOString();

  // Revoke all other active sessions except current
  const currentToken = req.session?.session_token || '';
  const revokedCount = dataStore.revokeAllOtherSessions(user.id, currentToken);

  securityEventService.record({
    type: 'PASSWORD_CHANGED',
    actor: { id: user.id, name: user.name, role: req.roles?.[0]?.name },
    target: { type: 'users', id: user.id },
    description: `User '${user.username}' updated password. Revoked ${revokedCount} other active sessions.`,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] as string,
    severity: 'MEDIUM'
  });

  res.json(createResponse({
    revoked_sessions_count: revokedCount,
    message: 'Password changed successfully. All other device sessions have been terminated.'
  }));
});

// ----------------------------------------------------
// Phase 2: Logout & Session Management
// ----------------------------------------------------
router.post('/auth/logout', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.session) {
    dataStore.revokeSession(req.session.session_token);
  }

  securityEventService.record({
    type: 'LOGOUT',
    actor: { id: req.user!.id, name: req.user!.name, role: req.roles?.[0]?.name },
    description: `User '${req.user!.username}' logged out session`,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] as string,
    severity: 'LOW'
  });

  res.json(createResponse(null, 'Logged out successfully'));
});

router.post('/auth/logout-all-others', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const currentToken = req.session?.session_token || '';
  const revokedCount = dataStore.revokeAllOtherSessions(req.user!.id, currentToken);

  securityEventService.record({
    type: 'ALL_OTHER_SESSIONS_REVOKED',
    actor: { id: req.user!.id, name: req.user!.name },
    description: `User '${req.user!.username}' terminated ${revokedCount} other device sessions`,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] as string,
    severity: 'LOW'
  });

  res.json(createResponse({ revoked_count: revokedCount }, `Successfully revoked ${revokedCount} other active sessions`));
});

router.get('/auth/sessions', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const currentToken = req.session?.session_token;
  const sessions = dataStore.getUserSessions(req.user!.id, currentToken);
  res.json(createResponse(sessions));
});

router.delete('/auth/sessions/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const sessionId = parseInt(req.params.id, 10);
  const target = dataStore.sessions.find(s => s.id === sessionId && s.user_id === req.user!.id);

  if (!target) {
    return res.status(404).json(createErrorResponse('Session not found', ['session_not_found']));
  }

  dataStore.revokeSession(target.session_token);

  securityEventService.record({
    type: 'SESSION_REVOKED',
    actor: { id: req.user!.id, name: req.user!.name },
    target: { type: 'sessions', id: sessionId },
    description: `User '${req.user!.username}' revoked session #${sessionId}`,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] as string,
    severity: 'LOW'
  });

  res.json(createResponse(null, 'Session revoked successfully'));
});

router.get('/auth/login-history', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const history = dataStore.getLoginHistory(req.user!.id, 25);
  res.json(createResponse(history));
});

// ----------------------------------------------------
// Phase 2: Two-Factor Authentication Setup & Config
// ----------------------------------------------------
router.post('/auth/2fa/setup', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const secret = generateBase32Secret(20);
  const { rawCodes, hashedCodes } = generateRecoveryCodes(8);

  dataStore.setupTwoFactor(user.id, secret, hashedCodes);

  const otpauthUrl = `otpauth://totp/ApexPlatform:${encodeURIComponent(user.email)}?secret=${secret}&issuer=ApexPlatform`;

  securityEventService.record({
    type: 'TWO_FACTOR_SETUP_INITIATED',
    actor: { id: user.id, name: user.name },
    description: `User '${user.username}' initiated 2FA configuration`,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] as string,
    severity: 'LOW'
  });

  res.json(createResponse({
    secret,
    otpauth_url: otpauthUrl,
    recovery_codes: rawCodes,
    message: 'Scan the QR code or enter the secret in your authenticator app, then verify with a 6-digit code to enable 2FA.'
  }));
});

router.post('/auth/2fa/enable', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { code } = req.body;
  const user = req.user!;

  if (!code) {
    return res.status(400).json(createErrorResponse('6-digit authenticator code required', ['missing_code']));
  }

  const record = dataStore.getTwoFactorSecret(user.id);
  if (!record) {
    return res.status(400).json(createErrorResponse('2FA setup has not been initiated. Call /auth/2fa/setup first.', ['not_initiated']));
  }

  const isValid = verifyTotpCode(record.secret, String(code).trim());
  if (!isValid) {
    return res.status(400).json(createErrorResponse('Invalid confirmation code. Please ensure your device clock is synchronized.', ['invalid_code']));
  }

  dataStore.enableTwoFactor(user.id);

  securityEventService.record({
    type: 'TWO_FACTOR_ENABLED',
    actor: { id: user.id, name: user.name, role: req.roles?.[0]?.name },
    target: { type: 'users', id: user.id },
    description: `Two-Factor Authentication activated for user '${user.username}'`,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] as string,
    severity: 'MEDIUM'
  });

  res.json(createResponse(null, 'Two-Factor Authentication is now enabled on your account.'));
});

router.post('/auth/2fa/disable', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { password, code } = req.body;
  const user = req.user!;

  if (!password || !code) {
    return res.status(400).json(createErrorResponse('Current password and 2FA code are required to disable 2FA', ['missing_fields']));
  }

  if (!verifyPassword(password, user.password_hash)) {
    return res.status(401).json(createErrorResponse('Incorrect account password', ['invalid_password']));
  }

  const record = dataStore.getTwoFactorSecret(user.id);
  if (!record || !verifyTotpCode(record.secret, String(code).trim())) {
    return res.status(400).json(createErrorResponse('Invalid 2FA authenticator code', ['invalid_code']));
  }

  dataStore.disableTwoFactor(user.id);

  securityEventService.record({
    type: 'TWO_FACTOR_DISABLED',
    actor: { id: user.id, name: user.name, role: req.roles?.[0]?.name },
    target: { type: 'users', id: user.id },
    description: `Two-Factor Authentication disabled for user '${user.username}'`,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] as string,
    severity: 'HIGH'
  });

  res.json(createResponse(null, 'Two-Factor Authentication has been disabled.'));
});

router.post('/auth/2fa/recovery-codes', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { password } = req.body;
  const user = req.user!;

  if (!password || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json(createErrorResponse('Password confirmation required to regenerate recovery codes', ['invalid_password']));
  }

  const { rawCodes, hashedCodes } = generateRecoveryCodes(8);
  dataStore.updateRecoveryCodeHashes(user.id, hashedCodes);

  securityEventService.record({
    type: 'TWO_FACTOR_RECOVERY_CODES_REGENERATED',
    actor: { id: user.id, name: user.name },
    description: `Regenerated backup recovery codes for user '${user.username}'`,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] as string,
    severity: 'MEDIUM'
  });

  res.json(createResponse({
    recovery_codes: rawCodes,
    message: 'New recovery codes generated. Store them in a secure offline location.'
  }));
});

// Simulated Email Inbox endpoint for developer testing & verification
router.get('/auth/simulated-emails', (_req: Request, res: Response) => {
  res.json(createResponse(emailService.getDispatchedEmails()));
});

// ----------------------------------------------------
// Current User Profile & Profile Update
// ----------------------------------------------------
router.get('/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const profile = dataStore.profiles.find(p => p.user_id === user.id) || null;
  const roles = req.roles?.map(r => r.name) || [];
  const permissions = req.permissions?.map(p => p.name) || [];

  res.json(createResponse({
    user: toSafeUser(user, roles, permissions),
    profile,
    roles,
    permissions
  }));
});

router.put('/user/profile', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { name, phone, country, timezone, language, address_line1, city, state_province, postal_code } = req.body;

  if (name) {
    user.name = String(name).trim();
  }
  if (phone !== undefined) {
    user.phone = String(phone).trim();
  }
  user.updated_at = new Date().toISOString();

  let profile = dataStore.profiles.find(p => p.user_id === user.id);
  if (!profile) {
    profile = {
      id: dataStore.profiles.length + 1,
      user_id: user.id,
      country: country || 'United States',
      timezone: timezone || 'UTC',
      language: language || 'en',
      date_of_birth: null,
      address_line1: address_line1 || null,
      address_line2: null,
      city: city || null,
      state_province: state_province || null,
      postal_code: postal_code || null,
      profile_metadata: {}
    };
    dataStore.profiles.push(profile);
  } else {
    if (country) profile.country = country;
    if (timezone) profile.timezone = timezone;
    if (language) profile.language = language;
    if (address_line1 !== undefined) profile.address_line1 = address_line1;
    if (city !== undefined) profile.city = city;
    if (state_province !== undefined) profile.state_province = state_province;
    if (postal_code !== undefined) profile.postal_code = postal_code;
  }

  securityEventService.record({
    type: 'USER_REGISTERED', // Profile update
    actor: { id: user.id, name: user.name, role: req.roles?.[0]?.name },
    description: `User '${user.username}' updated profile settings`,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] as string,
    severity: 'LOW'
  });

  const roles = req.roles?.map(r => r.name) || [];
  const permissions = req.permissions?.map(p => p.name) || [];

  res.json(createResponse({
    user: toSafeUser(user, roles, permissions),
    profile,
    message: 'Profile updated successfully'
  }));
});

// ----------------------------------------------------
// Public / Catalog Endpoints
// ----------------------------------------------------
router.get('/investment-plans', (_req: Request, res: Response) => {
  res.json(createResponse(dataStore.investmentPlans));
});

router.get('/games', (_req: Request, res: Response) => {
  res.json(createResponse(dataStore.gameEntities));
});

router.get('/staking/pools', (_req: Request, res: Response) => {
  res.json(createResponse(dataStore.stakingPools));
});

router.get('/cms/announcements', (_req: Request, res: Response) => {
  res.json(createResponse(dataStore.announcements));
});

// ----------------------------------------------------
// User Dashboard Endpoints
// ----------------------------------------------------
router.get('/user/dashboard-summary', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const userInvestments = (dataStore.userInvestments || []).filter(i => i.user_id === userId);
  const unreadCount = (dataStore.notifications || []).filter(n => n.user_id === userId && !n.read_at).length;
  const openTickets = (dataStore.supportTickets || []).filter(t => t.user_id === userId && t.status !== 'CLOSED').length;

  accountService.ensureUserAccounts(userId, 'USD');
  const balances = balanceService.recalculateBalance(userId, 'USD');

  const totalInvested = userInvestments
    .filter(i => i.status === 'ACTIVE')
    .reduce((acc, i) => acc + (parseFloat(i.principal_amount || (i as any).amount || '0') || 0), 0);

  const totalEarnings = userInvestments
    .reduce((acc, i) => acc + (parseFloat((i as any).accumulated_profit || (i as any).current_return || '0') || 0), 0);

  const pendingWithdrawals = (dataStore.withdrawalRequests || [])
    .filter(w => w.user_id === userId && ['PENDING', 'APPROVED', 'PROCESSING'].includes(w.status))
    .reduce((acc, w) => acc + (parseFloat(w.requested_amount || (w as any).amount || '0') || 0), 0);

  const totalDeposits = (dataStore.paymentOrders || [])
    .filter(p => p.user_id === userId && (p.status === 'CONFIRMED' || (p.status as string) === 'FINISHED' || (p.status as string) === 'COMPLETED'))
    .reduce((acc, p) => acc + (parseFloat((p as any).pay_amount || p.price_amount || '0') || 0), 0);

  res.json(createResponse({
    metrics: {
      available_balance: { amount: parseFloat(balances.available), currency: 'USD' },
      invested: { amount: totalInvested, currency: 'USD' },
      total_earnings: { amount: totalEarnings, currency: 'USD' },
      pending_withdrawals: { amount: pendingWithdrawals, currency: 'USD' },
      active_investments_count: userInvestments.filter(i => i.status === 'ACTIVE').length,
      total_deposits: { amount: totalDeposits, currency: 'USD' }
    },
    investments: userInvestments,
    unread_notifications: unreadCount,
    open_tickets_count: openTickets,
    referral_code: dataStore.referrals?.referral_code || `APEX-${req.user!.username.toUpperCase()}`
  }));
});

router.get('/user/investments', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const investments = dataStore.userInvestments.filter(i => i.user_id === userId);
  res.json(createResponse(investments));
});

router.get('/user/notifications', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const list = dataStore.notifications.filter(n => n.user_id === userId);
  res.json(createResponse(list));
});

router.get('/user/referrals', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const userRefCode = `APEX-${user.username.toUpperCase()}`;
  const userReferred = (dataStore.users || []).filter(u => (u as any).referred_by === user.id || (u as any).referral_code === userRefCode);
  const resp = {
    referral_code: userRefCode,
    referral_link: `https://apexplatform.internal/register?ref=${userRefCode}`,
    total_referred: userReferred.length,
    active_referred: userReferred.filter(u => u.status === 'ACTIVE' || (u as any).is_active).length,
    referral_tier: 'Level 1 Ambassador',
    referred_users: userReferred.map(u => ({
      id: u.id,
      username: u.username,
      joined_at: u.created_at,
      status: (u.status === 'ACTIVE' || (u as any).is_active) ? 'Active' : 'Pending Verification'
    }))
  };
  res.json(createResponse(resp));
});

// Support Tickets
router.get('/support/tickets', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const isStaff = req.roles?.some(r => ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'].includes(r.name));

  const tickets = isStaff
    ? dataStore.supportTickets
    : dataStore.supportTickets.filter(t => t.user_id === userId);

  res.json(createResponse(tickets));
});

router.post('/support/tickets', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { subject, category, priority, message } = req.body;
  if (!subject || !message) {
    return res.status(400).json(createErrorResponse('Subject and initial message are required', ['missing_fields']));
  }

  const newTicket = {
    id: dataStore.supportTickets.length + 101,
    user_id: req.user!.id,
    subject,
    category: category || 'GENERAL',
    priority: priority || 'MEDIUM',
    status: 'OPEN' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_name: req.user!.name,
    user_email: req.user!.email,
    message_count: 1
  };

  dataStore.supportTickets.unshift(newTicket);

  dataStore.supportMessages.push({
    id: dataStore.supportMessages.length + 1,
    ticket_id: newTicket.id,
    sender_user_id: req.user!.id,
    sender_role: 'USER',
    message,
    attachment_metadata: null,
    created_at: new Date().toISOString()
  });

  res.status(201).json(createResponse(newTicket, 'Support ticket created successfully'));
});

// GET ticket messages
router.get('/support/tickets/:id/messages', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const ticketId = Number(req.params.id);
  const ticket = dataStore.supportTickets.find(t => t.id === ticketId);
  if (!ticket) {
    return res.status(404).json(createErrorResponse('Support ticket not found'));
  }

  const isStaff = req.roles?.some(r => ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'].includes(r.name));
  if (!isStaff && ticket.user_id !== req.user!.id) {
    return res.status(403).json(createErrorResponse('Unauthorized to access this ticket'));
  }

  const messages = (dataStore.supportMessages || []).filter(m => m.ticket_id === ticketId);
  res.json(createResponse({ ticket, messages }));
});

// POST reply to support ticket
router.post('/support/tickets/:id/messages', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const ticketId = Number(req.params.id);
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json(createErrorResponse('Message cannot be empty'));
  }

  const ticket = dataStore.supportTickets.find(t => t.id === ticketId);
  if (!ticket) {
    return res.status(404).json(createErrorResponse('Support ticket not found'));
  }

  const isStaff = req.roles?.some(r => ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'].includes(r.name));
  if (!isStaff && ticket.user_id !== req.user!.id) {
    return res.status(403).json(createErrorResponse('Unauthorized to post to this ticket'));
  }

  const senderRole: 'ADMIN' | 'USER' = isStaff ? 'ADMIN' : 'USER';
  const newMsg = {
    id: (dataStore.supportMessages || []).length + 1,
    ticket_id: ticketId,
    sender_user_id: req.user!.id,
    sender_role: senderRole,
    sender_name: req.user!.name,
    message: message.trim(),
    attachment_metadata: null,
    created_at: new Date().toISOString()
  };

  dataStore.supportMessages.push(newMsg);

  // Update ticket status
  ticket.updated_at = new Date().toISOString();
  ticket.status = isStaff ? 'IN_PROGRESS' : 'OPEN';

  res.status(201).json(createResponse(newMsg, 'Message sent successfully'));
});

// Update ticket status (e.g. resolve / close)
router.put('/support/tickets/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const ticketId = Number(req.params.id);
  const { status } = req.body;
  const ticket = dataStore.supportTickets.find(t => t.id === ticketId);
  if (!ticket) {
    return res.status(404).json(createErrorResponse('Support ticket not found'));
  }

  const isStaff = req.roles?.some(r => ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'].includes(r.name));
  if (!isStaff && ticket.user_id !== req.user!.id) {
    return res.status(403).json(createErrorResponse('Unauthorized to update this ticket'));
  }

  if (status) {
    ticket.status = status;
    ticket.updated_at = new Date().toISOString();
  }

  res.json(createResponse(ticket, `Ticket status updated to ${ticket.status}`));
});

// ----------------------------------------------------
// Phase 2: Administrative User Management & Super Admin Protection
// ----------------------------------------------------
router.get('/admin/dashboard-stats', authMiddleware, requirePermission('reports.view'), (_req: AuthenticatedRequest, res: Response) => {
  const totalInvested = (dataStore.userInvestments || [])
    .filter(i => i.status === 'ACTIVE')
    .reduce((acc, i) => acc + (parseFloat(i.principal_amount || (i as any).amount || '0') || 0), 0);

  const totalDeposits = (dataStore.paymentOrders || [])
    .filter(p => p.status === 'CONFIRMED' || (p.status as string) === 'FINISHED' || (p.status as string) === 'COMPLETED')
    .reduce((acc, p) => acc + (parseFloat((p as any).pay_amount || p.price_amount || '0') || 0), 0);

  const totalWithdrawals = (dataStore.withdrawalRequests || [])
    .filter(w => ['PROCESSED', 'COMPLETED', 'FINISHED', 'APPROVED'].includes(w.status))
    .reduce((acc, w) => acc + (parseFloat(w.requested_amount || (w as any).amount || '0') || 0), 0);

  res.json(createResponse({
    total_users: (dataStore.users || []).length,
    active_users: (dataStore.users || []).filter(u => u.status === 'ACTIVE').length,
    pending_verifications: (dataStore.users || []).filter(u => u.status === 'PENDING_VERIFICATION').length,
    suspended_users: (dataStore.users || []).filter(u => u.status === 'SUSPENDED').length,
    banned_users: (dataStore.users || []).filter(u => u.status === 'BANNED').length,
    locked_users: (dataStore.users || []).filter(u => u.status === 'LOCKED').length,
    active_sessions_count: (dataStore.sessions || []).length,
    deposits_volume: `$${totalDeposits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    withdrawals_volume: `$${totalWithdrawals.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    total_invested: `$${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    active_investments: (dataStore.userInvestments || []).filter(i => i.status === 'ACTIVE').length,
    games_active: (dataStore.games || []).filter(g => g.status === 'AVAILABLE').length,
    pending_reviews: (dataStore.supportTickets || []).filter(t => t.status === 'OPEN').length
  }));
});

router.get('/admin/users', authMiddleware, requirePermission('users.view'), (req: AuthenticatedRequest, res: Response) => {
  const { search, status, role } = req.query;
  let results = [...dataStore.users];

  if (status && typeof status === 'string') {
    results = results.filter(u => u.status === status);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    results = results.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  }

  if (role && typeof role === 'string') {
    results = results.filter(u => {
      const userRoles = dataStore.getUserRoles(u.id);
      return userRoles.some(r => r.name === role);
    });
  }

  const enriched = results.map(u => {
    const roles = dataStore.getUserRoles(u.id);
    const sessions = dataStore.getUserSessions(u.id);
    let balance = '0.00';
    try {
      balance = balanceService.getAvailableBalance(u.id, 'USD').toString();
    } catch {
      balance = '0.00';
    }
    return {
      ...u,
      balance,
      password_hash: undefined, // Never expose hash in API output
      roles: roles.map(r => r.name),
      active_sessions_count: sessions.length
    };
  });

  res.json(createResponse(enriched));
});

router.get('/admin/users/:id/details', authMiddleware, requirePermission('users.view'), (req: AuthenticatedRequest, res: Response) => {
  const userId = parseInt(req.params.id, 10);
  const user = dataStore.getUserById(userId);
  if (!user) {
    return res.status(404).json(createErrorResponse('User not found', ['user_not_found']));
  }

  const profile = dataStore.profiles.find(p => p.user_id === userId) || null;
  const roles = dataStore.getUserRoles(userId);
  const permissions = dataStore.getUserPermissions(userId);
  const sessions = dataStore.getUserSessions(userId);
  const history = dataStore.getLoginHistory(userId, 15);
  const restrictions = dataStore.getAccountRestrictions(userId);

  res.json(createResponse({
    user: {
      ...user,
      password_hash: undefined
    },
    profile,
    roles: roles.map(r => r.name),
    permissions: permissions.map(p => p.name),
    active_sessions: sessions,
    login_history: history,
    account_restrictions: restrictions
  }));
});

router.post(
  '/admin/users/:id/suspend',
  authMiddleware,
  requirePermission('users.suspend'),
  protectSuperAdminTarget(req => parseInt(req.params.id, 10)),
  (req: AuthenticatedRequest, res: Response) => {
    const userId = parseInt(req.params.id, 10);
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json(createErrorResponse('A formal suspension reason is required for audit logs', ['reason_required']));
    }

    const success = dataStore.suspendUser(userId, req.user!.id, reason);
    if (!success) {
      return res.status(404).json(createErrorResponse('User not found', ['user_not_found']));
    }

    const targetUser = dataStore.getUserById(userId)!;

    securityEventService.record({
      type: 'ACCOUNT_SUSPENDED',
      actor: { id: req.user!.id, name: req.user!.name, role: req.roles?.[0]?.name },
      target: { type: 'users', id: userId },
      description: `User '${targetUser.username}' suspended by admin '${req.user!.username}'. Reason: ${reason}`,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] as string,
      severity: 'HIGH'
    });

    res.json(createResponse(null, `User '${targetUser.username}' has been suspended and all sessions revoked.`));
  }
);

router.post(
  '/admin/users/:id/ban',
  authMiddleware,
  requirePermission('users.ban'),
  protectSuperAdminTarget(req => parseInt(req.params.id, 10)),
  (req: AuthenticatedRequest, res: Response) => {
    const userId = parseInt(req.params.id, 10);
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json(createErrorResponse('A formal reason is required to ban an account', ['reason_required']));
    }

    const success = dataStore.banUser(userId, req.user!.id, reason);
    if (!success) {
      return res.status(404).json(createErrorResponse('User not found', ['user_not_found']));
    }

    const targetUser = dataStore.getUserById(userId)!;

    securityEventService.record({
      type: 'ACCOUNT_BANNED',
      actor: { id: req.user!.id, name: req.user!.name, role: req.roles?.[0]?.name },
      target: { type: 'users', id: userId },
      description: `User '${targetUser.username}' permanently banned by admin '${req.user!.username}'. Reason: ${reason}`,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] as string,
      severity: 'CRITICAL'
    });

    res.json(createResponse(null, `User '${targetUser.username}' has been permanently banned.`));
  }
);

router.post(
  '/admin/users/:id/unban',
  authMiddleware,
  requirePermission('users.suspend'),
  (req: AuthenticatedRequest, res: Response) => {
    const userId = parseInt(req.params.id, 10);
    const { reason } = req.body;

    const success = dataStore.unbanUser(userId, req.user!.id, reason || 'Administrative reinstatement');
    if (!success) {
      return res.status(404).json(createErrorResponse('User not found', ['user_not_found']));
    }

    const targetUser = dataStore.getUserById(userId)!;

    securityEventService.record({
      type: 'ACCOUNT_UNBANNED',
      actor: { id: req.user!.id, name: req.user!.name, role: req.roles?.[0]?.name },
      target: { type: 'users', id: userId },
      description: `User '${targetUser.username}' restrictions revoked; status restored to ACTIVE by admin '${req.user!.username}'`,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] as string,
      severity: 'MEDIUM'
    });

    res.json(createResponse(null, `User '${targetUser.username}' status has been restored to ACTIVE.`));
  }
);

router.post(
  '/admin/users/:id/reset-sessions',
  authMiddleware,
  requirePermission('users.edit'),
  protectSuperAdminTarget(req => parseInt(req.params.id, 10)),
  (req: AuthenticatedRequest, res: Response) => {
    const userId = parseInt(req.params.id, 10);
    const targetUser = dataStore.getUserById(userId);
    if (!targetUser) {
      return res.status(404).json(createErrorResponse('User not found', ['user_not_found']));
    }

    const count = dataStore.revokeAllUserSessions(userId);

    securityEventService.record({
      type: 'ALL_OTHER_SESSIONS_REVOKED',
      actor: { id: req.user!.id, name: req.user!.name, role: req.roles?.[0]?.name },
      target: { type: 'users', id: userId },
      description: `Admin '${req.user!.username}' force-revoked all ${count} sessions for user '${targetUser.username}'`,
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] as string,
      severity: 'MEDIUM'
    });

    res.json(createResponse({ revoked_sessions: count }, `Terminated ${count} active sessions for user '${targetUser.username}'.`));
  }
);

// Admin Balance Adjustment: Add or Remove user funds
router.post(
  '/admin/users/:id/adjust-balance',
  authMiddleware,
  requirePermission('users.edit'),
  (req: AuthenticatedRequest, res: Response) => {
    const userId = parseInt(req.params.id, 10);
    const { amount, type, reason } = req.body;
    const num = parseFloat(amount);

    if (isNaN(num) || num <= 0) {
      return res.status(400).json(createErrorResponse('Amount must be a positive number', ['invalid_amount']));
    }

    const targetUser = dataStore.getUserById(userId);
    if (!targetUser) {
      return res.status(404).json(createErrorResponse('User not found', ['user_not_found']));
    }

    const isAdd = type === 'ADD';
    const direction = isAdd ? 'CREDIT' : 'DEBIT';
    const cleanAmount = num.toFixed(2);

    try {
      accountService.ensureUserAccounts(userId, 'USD');

      const adj = adjustmentService.requestAdjustment({
        user_id: userId,
        currency: 'USD',
        amount: cleanAmount,
        direction,
        target_account_type: 'USER_AVAILABLE',
        reason: reason || `Administrative balance ${isAdd ? 'credit' : 'deduction'}`,
        requested_by_user_id: req.user!.id
      });

      const approved = adjustmentService.approveAdjustment(
        adj.id,
        req.user!.id,
        `Direct balance management by Admin '${req.user!.username}'`
      );

      const newBalance = balanceService.getAvailableBalance(userId, 'USD').toString();

      securityEventService.record({
        type: 'FINANCIAL_ADJUSTMENT_APPROVED',
        actor: { id: req.user!.id, name: req.user!.name, role: req.roles?.[0]?.name },
        target: { type: 'users', id: userId },
        description: `Admin '${req.user!.username}' ${isAdd ? 'added' : 'deducted'} $${cleanAmount} ${isAdd ? 'to' : 'from'} user '${targetUser.username}' (New Balance: $${newBalance})`,
        ip: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] as string,
        severity: 'HIGH'
      });

      res.json(createResponse({
        user_id: userId,
        amount: cleanAmount,
        type: isAdd ? 'ADD' : 'REMOVE',
        new_balance: newBalance,
        adjustment: approved
      }, `Successfully ${isAdd ? 'added' : 'deducted'} $${cleanAmount} ${isAdd ? 'to' : 'from'} ${targetUser.username}. New balance: $${newBalance}`));
    } catch (err: any) {
      res.status(500).json(createErrorResponse(err.message || 'Failed to adjust balance', ['adjustment_failed']));
    }
  }
);

// Admin Balance Adjustment History: Show which admin added/removed money and which user was affected
router.get(
  '/admin/users/balance-history',
  authMiddleware,
  requirePermission('users.view'),
  (_req: AuthenticatedRequest, res: Response) => {
    try {
      const list = adjustmentService.listAdjustments();
      const enriched = list.map(a => {
        const u = dataStore.getUserById(a.user_id);
        const adminUser = a.requested_by_user_id ? dataStore.getUserById(a.requested_by_user_id) : null;
        const approverUser = a.reviewed_by_user_id ? dataStore.getUserById(a.reviewed_by_user_id) : null;
        return {
          id: a.id,
          user_id: a.user_id,
          user_name: u?.name || a.user_name || `User #${a.user_id}`,
          user_username: u?.username || 'user',
          user_email: u?.email || a.user_email || '',
          amount: a.amount,
          currency: a.currency,
          direction: a.direction, // 'CREDIT' = ADD, 'DEBIT' = REMOVE
          type: a.direction === 'CREDIT' ? 'ADD' : 'REMOVE',
          reason: a.reason,
          status: a.status,
          admin_id: a.requested_by_user_id,
          admin_name: adminUser?.name || a.requested_by_name || 'Admin',
          admin_username: adminUser?.username || 'admin',
          approver_name: approverUser?.name || a.reviewed_by_name || null,
          decision_reason: a.decision_reason,
          created_at: a.created_at,
          updated_at: a.updated_at
        };
      }).sort((a, b) => b.id - a.id);

      res.json(createResponse(enriched));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json(createErrorResponse(msg));
    }
  }
);

// Single User Balance Adjustment History
router.get(
  '/admin/users/:id/balance-history',
  authMiddleware,
  requirePermission('users.view'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const list = adjustmentService.listAdjustments().filter(a => a.user_id === userId);
      const u = dataStore.getUserById(userId);

      const enriched = list.map(a => {
        const adminUser = a.requested_by_user_id ? dataStore.getUserById(a.requested_by_user_id) : null;
        const approverUser = a.reviewed_by_user_id ? dataStore.getUserById(a.reviewed_by_user_id) : null;
        return {
          id: a.id,
          user_id: a.user_id,
          user_name: u?.name || a.user_name || `User #${a.user_id}`,
          user_username: u?.username || 'user',
          user_email: u?.email || a.user_email || '',
          amount: a.amount,
          currency: a.currency,
          direction: a.direction,
          type: a.direction === 'CREDIT' ? 'ADD' : 'REMOVE',
          reason: a.reason,
          status: a.status,
          admin_id: a.requested_by_user_id,
          admin_name: adminUser?.name || a.requested_by_name || 'Admin',
          admin_username: adminUser?.username || 'admin',
          approver_name: approverUser?.name || a.reviewed_by_name || null,
          decision_reason: a.decision_reason,
          created_at: a.created_at,
          updated_at: a.updated_at
        };
      }).sort((a, b) => b.id - a.id);

      res.json(createResponse(enriched));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json(createErrorResponse(msg));
    }
  }
);

// Staff enrollment strictly protected by requireSuperAdmin
router.post('/admin/staff', authMiddleware, requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { name, username, email, password, role_id } = req.body;

  if (!name || !username || !email || !password || !role_id) {
    return res.status(400).json(createErrorResponse('Name, username, email, password, and role ID are required', ['missing_fields']));
  }

  const role = dataStore.roles.find(r => r.id === parseInt(role_id, 10));
  if (!role) {
    return res.status(400).json(createErrorResponse('Invalid staff role selected', ['invalid_role']));
  }

  const existing = dataStore.getUserByEmailOrUsername(email) || dataStore.getUserByEmailOrUsername(username);
  if (existing) {
    return res.status(409).json(createErrorResponse('User with this email or username already exists', ['conflict']));
  }

  const newStaff: User = {
    id: dataStore.users.length + 1,
    uuid: `staff-${generateSecureToken(8)}`,
    name: String(name).trim(),
    username: String(username).trim(),
    email: String(email).trim().toLowerCase(),
    phone: '',
    password_hash: hashPassword(password),
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    status: 'ACTIVE',
    email_verified_at: new Date().toISOString(),
    phone_verified_at: null,
    two_factor_enabled: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_login_at: null
  };

  dataStore.users.push(newStaff);
  dataStore.userRoles.push({ user_id: newStaff.id, role_id: role.id });

  securityEventService.record({
    type: 'ADMIN_STAFF_ENROLLED',
    actor: { id: req.user!.id, name: req.user!.name, role: 'SUPER_ADMIN' },
    target: { type: 'users', id: newStaff.id },
    description: `Super Admin enrolled new institutional staff member '${newStaff.username}' with role '${role.name}'`,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] as string,
    severity: 'HIGH'
  });

  res.status(201).json(createResponse({
    id: newStaff.id,
    username: newStaff.username,
    email: newStaff.email,
    role: role.name
  }, `Staff account enrolled with role '${role.name}'`));
});

// Roles & Permissions Matrix
router.get('/admin/roles', authMiddleware, requirePermission('admins.view'), (_req: AuthenticatedRequest, res: Response) => {
  res.json(createResponse({
    roles: dataStore.roles,
    permissions: dataStore.permissions,
    role_permissions: dataStore.rolePermissions
  }));
});

// Update Role Permission Assignment (Super Admin Only)
router.put('/admin/roles/matrix', authMiddleware, requireSuperAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { role_id, permission_id, assigned } = req.body;
  const roleId = parseInt(role_id, 10);
  const permId = parseInt(permission_id, 10);

  const role = dataStore.roles.find(r => r.id === roleId);
  const perm = dataStore.permissions.find(p => p.id === permId);

  if (!role || !perm) {
    return res.status(404).json(createErrorResponse('Role or permission not found'));
  }

  // Super Admin role cannot have its permissions revoked
  if (role.name === 'SUPER_ADMIN' && !assigned) {
    return res.status(403).json(createErrorResponse('Super Admin permissions are immutable and cannot be revoked.', ['immutable_super_admin']));
  }

  if (assigned) {
    const exists = dataStore.rolePermissions.some(rp => rp.role_id === roleId && rp.permission_id === permId);
    if (!exists) {
      dataStore.rolePermissions.push({ role_id: roleId, permission_id: permId });
    }
  } else {
    dataStore.rolePermissions = dataStore.rolePermissions.filter(rp => !(rp.role_id === roleId && rp.permission_id === permId));
  }

  securityEventService.record({
    type: 'ADMIN_ROLE_UPDATED',
    actor: { id: req.user!.id, name: req.user!.name, role: 'SUPER_ADMIN' },
    target: { type: 'roles', id: role.name },
    description: `Super Admin ${assigned ? 'granted' : 'revoked'} permission '${perm.name}' for role '${role.name}'`,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] as string,
    severity: 'HIGH'
  });

  res.json(createResponse({ role: role.name, permission: perm.name, assigned }, 'Permission matrix updated successfully'));
});

// Audit Logs
router.get('/admin/audit-logs', authMiddleware, requirePermission('reports.view'), (_req: AuthenticatedRequest, res: Response) => {
  res.json(createResponse(dataStore.auditLogs));
});

// System Settings
router.get('/admin/settings', authMiddleware, requirePermission('settings.view'), (_req: AuthenticatedRequest, res: Response) => {
  res.json(createResponse(dataStore.systemSettings));
});

router.put('/admin/settings/:key', authMiddleware, requirePermission('settings.edit'), (req: AuthenticatedRequest, res: Response) => {
  const { key } = req.params;
  const { value } = req.body;

  const setting = dataStore.systemSettings.find(s => s.key === key);
  if (!setting) {
    return res.status(404).json(createErrorResponse('Setting key not found'));
  }

  setting.value = String(value);
  setting.updated_at = new Date().toISOString();

  securityEventService.record({
    type: 'SYSTEM_SETTING_UPDATED',
    actor: { id: req.user!.id, name: req.user!.name, role: req.roles?.[0]?.name },
    target: { type: 'system_settings', id: key },
    description: `Updated system setting '${key}' to '${value}'`,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] as string,
    severity: 'MEDIUM'
  });

  res.json(createResponse(setting, `Setting '${key}' updated successfully`));
});

// Background Jobs
router.get('/admin/jobs', authMiddleware, requirePermission('settings.view'), (_req: AuthenticatedRequest, res: Response) => {
  res.json(createResponse(registeredJobs));
});

router.post('/admin/jobs/:id/run', authMiddleware, requirePermission('settings.edit'), (req: AuthenticatedRequest, res: Response) => {
  const result = executeJob(req.params.id);
  if (!result.success) {
    return res.status(400).json(createErrorResponse(result.message));
  }
  res.json(createResponse(null, result.message));
});

export default router;
