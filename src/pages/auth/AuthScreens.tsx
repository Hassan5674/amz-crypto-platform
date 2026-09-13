import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Clock,
  KeyRound,
  RotateCcw,
  Smartphone,
  Copy,
  ExternalLink,
  Inbox
} from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Input } from '../../components/ui/Input.js';
import { Badge } from '../../components/ui/Badge.js';
import { Alert } from '../../components/ui/Alert.js';
import { Modal } from '../../components/ui/Modal.js';
import { useAuth, DispatchedEmailClient } from '../../context/AuthContext.js';
import { AmzLogo } from '../../components/common/AmzLogo.js';

// ----------------------------------------------------------------------
// Developer Simulated Email Drawer / Modal
// ----------------------------------------------------------------------
export const SimulatedInboxViewer: React.FC = () => {
  return null;
};

// ----------------------------------------------------------------------
// Auth Layout Shell (Executive Dark Glass & Ambient Glow Background)
// ----------------------------------------------------------------------
export const AuthShell: React.FC<{
  title: string;
  subtitle: string;
  badgeText?: string;
  activeTab?: 'login' | 'register';
  onNavigate?: (route: string) => void;
  children: React.ReactNode;
}> = ({
  title,
  subtitle,
  badgeText = '256-Bit SSL Encrypted • Institutional Grade',
  activeTab,
  onNavigate = (_route: string) => {},
  children
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden px-4 py-8 sm:py-12 selection:bg-indigo-500 selection:text-white">
      {/* Background radial glowing ambient orbs */}
      <div className="absolute -top-32 -left-32 w-96 sm:w-[520px] h-96 sm:h-[520px] bg-gradient-to-br from-indigo-600/20 via-blue-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 sm:w-[520px] h-96 sm:h-[520px] bg-gradient-to-tl from-purple-600/20 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/40 to-slate-950/80 pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="relative z-10 max-w-5xl w-full mx-auto flex items-center justify-between py-2 mb-4">
        <AmzLogo size="md" invert={true} onClick={() => onNavigate('home')} />

        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="text-xs font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800"
        >
          <span>← Back to Public Lobby</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-md w-full mx-auto my-auto space-y-4">
        {/* Security Badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold backdrop-blur-md">
            <Shield className="w-3.5 h-3.5" />
            <span>{badgeText}</span>
          </div>
        </div>

        {/* Title and Subtitle */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{title}</h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">{subtitle}</p>
        </div>

        {/* Glass Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80">
          {/* Segmented Tab Switcher */}
          {activeTab && (
            <div className="grid grid-cols-2 p-1 bg-slate-950/80 border border-slate-800 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'login'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'register'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Register Account
              </button>
            </div>
          )}

          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 text-[11px] text-slate-500 max-w-md mx-auto">
        Cryptographically signed &bull; Double-entry ledger &bull; Continuous audit
      </footer>
    </div>
  );
};

// ----------------------------------------------------------------------
// 1. Register Screen
// ----------------------------------------------------------------------
export const RegisterScreen: React.FC<{
  onNavigate?: (route: string) => void;
  onSuccess?: () => void;
}> = ({ onNavigate = (_route: string) => {} }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ code?: string; token?: string } | null>(null);

  // Live Password Criteria Verification
  const pwdLen = password.length >= 8;
  const pwdUpper = /[A-Z]/.test(password);
  const pwdLower = /[a-z]/.test(password);
  const pwdNum = /[0-9]/.test(password);
  const pwdSpecial = /[^a-zA-Z0-9]/.test(password);
  const isPwdValid = pwdLen && pwdUpper && pwdLower && pwdNum && pwdSpecial;

  // Password Confirmation Verification
  const hasConfirmInput = confirmPassword.length > 0;
  const passwordsMatch = password.length > 0 && hasConfirmInput && password === confirmPassword;
  const passwordsMismatch = hasConfirmInput && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!agreeTerms) return;

    if (!isPwdValid) {
      setErrorMessage('Please satisfy all password complexity criteria before proceeding.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify that both password fields are identical.');
      return;
    }

    setIsLoading(true);
    const result = await register({
      name,
      username,
      email,
      phone,
      password,
      terms_accepted: agreeTerms
    });
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Registration failed');
    } else {
      setSuccessInfo({ code: result.previewCode, token: result.previewToken });
    }
  };

  return (
    <AuthShell
      title="Create Account"
      subtitle="Enroll in AMZDistributor multi-currency portfolio system"
      activeTab="register"
      onNavigate={onNavigate}
    >
      <SimulatedInboxViewer />

      {successInfo ? (
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-950/80 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-800">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Account Created Successfully!</h3>
          <p className="text-xs text-slate-300">
            A 6-digit confirmation code has been dispatched to <strong>{email}</strong>.
          </p>
          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={() => onNavigate('verify-email')}
          >
            Enter Verification Code
          </Button>
        </div>
      ) : (
        <div>
          {errorMessage && (
            <Alert type="error" title="Registration Error" className="mb-4">
              {errorMessage}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              id="register-name"
              label="Full Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jordan Miller"
              autoComplete="name"
              aria-required="true"
              leftIcon={<User className="w-4 h-4" />}
            />
            <Input
              id="register-username"
              label="Username (3-30 letters/numbers)"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="jordan_apex"
              autoComplete="username"
              aria-required="true"
              helperText="Unique username used for public ledger citations and login."
              leftIcon={<User className="w-4 h-4" />}
            />
            <Input
              id="register-email"
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jordan@example.com"
              autoComplete="email"
              aria-required="true"
              helperText="Institutional notification and cryptographic recovery channel."
              leftIcon={<Mail className="w-4 h-4" />}
            />
            <Input
              id="register-phone"
              label="Phone Number (Optional)"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 019 2831"
              autoComplete="tel"
              helperText="Used for high-priority SMS 2FA authorization if enabled."
              leftIcon={<Phone className="w-4 h-4" />}
            />

            {/* Password */}
            <div>
              <Input
                id="register-password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="new-password"
                aria-required="true"
                aria-describedby="password-policy"
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-200 focus:outline-none focus:text-indigo-400 p-1 rounded"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              {/* Live Password Strength Criteria */}
              <div id="password-policy" className="mt-2 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] space-y-1" role="region" aria-label="Password Requirements">
                <div className="font-semibold text-slate-300 mb-1">Institutional Password Policy:</div>
                <div className="grid grid-cols-2 gap-1 text-slate-400">
                  <span className={pwdLen ? 'text-emerald-400 font-semibold' : ''}>
                    {pwdLen ? '✓' : '•'} At least 8 characters
                  </span>
                  <span className={pwdUpper ? 'text-emerald-400 font-semibold' : ''}>
                    {pwdUpper ? '✓' : '•'} Uppercase letter
                  </span>
                  <span className={pwdLower ? 'text-emerald-400 font-semibold' : ''}>
                    {pwdLower ? '✓' : '•'} Lowercase letter
                  </span>
                  <span className={pwdNum ? 'text-emerald-400 font-semibold' : ''}>
                    {pwdNum ? '✓' : '•'} Number
                  </span>
                  <span className={pwdSpecial ? 'text-emerald-400 font-semibold' : ''}>
                    {pwdSpecial ? '✓' : '•'} Special character
                  </span>
                </div>
              </div>
            </div>

            {/* Confirm Password with Real-time Verification */}
            <div>
              <Input
                id="register-confirm-password"
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                aria-required="true"
                aria-invalid={passwordsMismatch ? 'true' : 'false'}
                aria-describedby="password-match-status"
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-slate-400 hover:text-slate-200 focus:outline-none focus:text-indigo-400 p-1 rounded"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              {/* Real-time Match Indicator */}
              <div id="password-match-status" className="mt-1.5" aria-live="polite">
                {hasConfirmInput && (
                  passwordsMatch ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-950/40 border border-emerald-800/80 px-2.5 py-1.5 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Passwords match securely</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium bg-rose-950/40 border border-rose-800/80 px-2.5 py-1.5 rounded-lg" role="alert">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>Passwords do not match yet</span>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="flex items-start gap-2 pt-1">
              <input
                id="termsCheck"
                type="checkbox"
                required
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="termsCheck" className="text-xs text-slate-400 leading-tight cursor-pointer">
                I agree to the{' '}
                <button type="button" onClick={() => onNavigate('terms')} className="text-indigo-400 hover:underline">
                  Terms of Service
                </button>
                ,{' '}
                <button type="button" onClick={() => onNavigate('privacy')} className="text-indigo-400 hover:underline">
                  Privacy Policy
                </button>
                , and Platform User Agreements.
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full shadow-lg shadow-indigo-600/20"
              isLoading={isLoading}
              disabled={!agreeTerms || passwordsMismatch}
            >
              Complete Registration
            </Button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-400">
            Already registered?{' '}
            <button onClick={() => onNavigate('login')} className="font-semibold text-indigo-400 hover:underline">
              Log In
            </button>
          </div>
        </div>
      )}
    </AuthShell>
  );
};

// ----------------------------------------------------------------------
// 2. Login Screen (with 2FA Authenticator Challenge Integration)
// ----------------------------------------------------------------------
export const LoginScreen: React.FC<{
  onNavigate?: (route: string) => void;
  onSuccess?: () => void;
}> = ({ onNavigate = (_route: string) => {}, onSuccess = () => {} }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 2FA Challenge State
  const [twoFaChallenge, setTwoFaChallenge] = useState<{ active: boolean; tempToken: string }>({
    active: false,
    tempToken: ''
  });
  const [twoFaCode, setTwoFaCode] = useState('');

  // Email Verification Challenge State
  const [emailVerificationChallenge, setEmailVerificationChallenge] = useState<{ active: boolean; email: string }>({
    active: false,
    email: ''
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { login, verify2faLogin, verifyEmail, resendVerification } = useAuth();

  // Primary Login Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    const result = await login(identifier, password);
    setIsLoading(false);

    if (result.status === 'pending_verification' || result.requiresEmailVerification || (result.error && (result.error.toLowerCase().includes('verification') || result.error.toLowerCase().includes('pending') || result.error.toLowerCase().includes('unverified')))) {
      setEmailVerificationChallenge({ active: true, email: result.email || identifier });
      setErrorMessage(result.error || 'Account status is pending verification. Redirecting to verification screen...');
      onNavigate('verify-email');
      return;
    }

    if (result.requires2fa && result.tempToken) {
      setTwoFaChallenge({ active: true, tempToken: result.tempToken });
      return;
    }

    if (!result.success) {
      if (result.lockedRemaining) {
        setErrorMessage(`Account temporarily locked due to failed attempts. Retry in ${result.lockedRemaining} minutes.`);
      } else {
        setErrorMessage(result.error || 'Invalid credentials');
      }
      return;
    }

    onSuccess();
  };

  // Email Verification Submission from Login
  const handleVerifyEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    const res = await verifyEmail(verificationCode);
    setIsLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Invalid verification token or code');
      return;
    }

    setSuccessMessage('Email verified successfully! Logging you in...');
    setTimeout(async () => {
      const loginRes = await login(emailVerificationChallenge.email || identifier, password);
      if (loginRes.success) {
        onSuccess();
      } else {
        setEmailVerificationChallenge({ active: false, email: '' });
        setErrorMessage('Email verified! Please sign in with your credentials now.');
      }
    }, 1000);
  };

  // Resend Code Handler
  const handleResendOtp = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    const res = await resendVerification(emailVerificationChallenge.email || identifier);
    setIsLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to resend confirmation code');
    } else {
      setSuccessMessage('A fresh 6-digit confirmation code has been sent to your email inbox.');
    }
  };

  // 2FA Verification Submission
  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const result = await verify2faLogin(twoFaChallenge.tempToken, twoFaCode);
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Invalid 2FA authenticator or recovery code');
      return;
    }

    onSuccess();
  };

  return (
    <AuthShell
      title="Investor Portal Login"
      subtitle="Sign in to AMZDistributor multi-currency portfolio system"
      activeTab="login"
      onNavigate={onNavigate}
    >
      <SimulatedInboxViewer />

      {errorMessage && (
        <Alert type="error" title="Authentication Alert" className="mb-4">
          <div className="space-y-2">
            <div>
              {errorMessage.includes('<!doctype') || errorMessage.includes('is not valid JSON') || errorMessage.includes('<')
                ? 'Backend authentication service is initializing. Please wait a moment and retry.'
                : errorMessage}
            </div>
            {(errorMessage.toLowerCase().includes('verification') || errorMessage.toLowerCase().includes('pending') || errorMessage.toLowerCase().includes('unverified')) && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
                >
                  Resend OTP Code
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('verify-email')}
                  className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                >
                  Enter Verification Code →
                </button>
              </div>
            )}
          </div>
        </Alert>
      )}

      {successMessage && (
        <Alert type="success" title="Verification Notice" className="mb-4">
          {successMessage}
        </Alert>
      )}

      {emailVerificationChallenge.active ? (
        /* Email Verification Challenge View */
        <form onSubmit={handleVerifyEmailSubmit} className="space-y-4">
          <div className="text-center space-y-1">
            <div className="w-10 h-10 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Email Verification Required</h3>
            <p className="text-xs text-slate-400">
              Please enter the 6-digit confirmation code sent to <strong className="text-emerald-400">{emailVerificationChallenge.email}</strong> to activate your account and complete login.
            </p>
          </div>

          <Input
            label="6-Digit OTP Confirmation Code"
            required
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="e.g. 482910"
            className="text-center font-mono text-lg tracking-widest"
            maxLength={6}
            autoFocus
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full shadow-lg shadow-emerald-600/20 bg-emerald-600 hover:bg-emerald-500"
            isLoading={isLoading}
          >
            Verify OTP & Complete Login
          </Button>

          <div className="flex flex-col gap-2 pt-2 text-xs">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleResendOtp}
                className="text-emerald-400 hover:underline font-medium"
              >
                Resend Confirmation Code
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailVerificationChallenge({ active: false, email: '' });
                  setVerificationCode('');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-slate-400 hover:text-slate-200"
              >
                Back to Login
              </button>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('verify-email')}
              className="w-full mt-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 font-medium text-center transition-colors border border-slate-700"
            >
              Open Dedicated Email Verification Screen →
            </button>
          </div>
        </form>
      ) : twoFaChallenge.active ? (
        /* 2FA Challenge View */
        <form onSubmit={handleVerify2fa} className="space-y-4">
          <div className="text-center space-y-1">
            <div className="w-10 h-10 rounded-full bg-indigo-950/80 border border-indigo-800 text-indigo-400 flex items-center justify-center mx-auto">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Two-Factor Authentication</h3>
            <p className="text-xs text-slate-400">
              Enter the 6-digit code from your authenticator app or an 8-character backup recovery code.
            </p>
          </div>

          <Input
            label="Authenticator / Recovery Code"
            required
            value={twoFaCode}
            onChange={(e) => setTwoFaCode(e.target.value)}
            placeholder="e.g. 123456 or ABC123XYZ"
            className="text-center font-mono text-base tracking-wider"
            autoFocus
          />

          <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
            <span>Demo/Testing Code: <strong className="text-emerald-400 font-mono">123456</strong></span>
            <button
              type="button"
              onClick={() => setTwoFaCode('123456')}
              className="text-indigo-400 hover:text-indigo-300 font-medium underline"
            >
              Fill 123456
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full shadow-lg shadow-indigo-600/20"
            isLoading={isLoading}
          >
            Verify & Sign In
          </Button>

          <button
            type="button"
            onClick={() => {
              setTwoFaChallenge({ active: false, tempToken: '' });
              setTwoFaCode('');
              setErrorMessage(null);
            }}
            className="text-xs text-slate-400 hover:text-slate-200 block mx-auto text-center"
          >
            Cancel & Return to Login
          </button>
        </form>
      ) : (
        /* Standard Login Form */
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email or Username"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="username or email"
            leftIcon={<User className="w-4 h-4" />}
          />

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer">
              <input type="checkbox" className="rounded text-indigo-600 border-slate-700 bg-slate-900" defaultChecked />
              <span>Remember session</span>
            </label>
            <button
              type="button"
              onClick={() => onNavigate('forgot-password')}
              className="text-indigo-400 hover:underline font-medium"
            >
              Forgot Password?
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full shadow-lg shadow-indigo-600/20"
            isLoading={isLoading}
          >
            Sign In to Dashboard
          </Button>
        </form>
      )}

      <div className="mt-6 text-center text-xs text-slate-400">
        Don't have an account?{' '}
        <button onClick={() => onNavigate('register')} className="font-semibold text-indigo-400 hover:underline">
          Register now
        </button>
      </div>
    </AuthShell>
  );
};

// ----------------------------------------------------------------------
// 3. Email Verification Screen
// ----------------------------------------------------------------------
export const EmailVerificationScreen: React.FC<{
  onNavigate?: (route: string) => void;
  onSuccess?: () => void;
}> = ({ onNavigate = (_route: string) => {}, onSuccess = () => {} }) => {
  const { verifyEmail, resendVerification } = useAuth();
  const [code, setCode] = useState('');
  const [emailForResend, setEmailForResend] = useState('');
  const [verified, setVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const result = await verifyEmail(code);
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Invalid or expired confirmation code');
      return;
    }

    setVerified(true);
    setTimeout(() => {
      onSuccess();
    }, 1200);
  };

  const handleResend = async () => {
    if (!emailForResend) {
      setErrorMessage('Please enter your email address to resend code');
      return;
    }
    setResendStatus(null);
    setErrorMessage(null);
    const result = await resendVerification(emailForResend);
    if (result.success) {
      setResendStatus(`Fresh confirmation code sent to ${emailForResend}. Please check your inbox.`);
      if (result.previewCode) {
        setCode(result.previewCode);
      }
    } else {
      setErrorMessage(result.error || 'Failed to resend confirmation code');
    }
  };

  return (
    <AuthShell
      title="Verify Your Email Address"
      subtitle="Enter the 6-digit confirmation code dispatched to your email"
      badgeText="Identity Verification"
      onNavigate={onNavigate}
    >
      <SimulatedInboxViewer />
      <div className="space-y-4">
        <div className="w-12 h-12 rounded-full bg-indigo-950/80 border border-indigo-800 text-indigo-400 flex items-center justify-center mx-auto">
          <Mail className="w-6 h-6" />
        </div>

        {errorMessage && (
          <Alert type="error" title="Verification Failed">
            {errorMessage}
          </Alert>
        )}

        {resendStatus && (
          <Alert type="success" title="Code Dispatched">
            {resendStatus}
          </Alert>
        )}

        {verified ? (
          <Alert type="success" title="Email Confirmed">
            Your email address has been verified. Redirecting to your dashboard...
          </Alert>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <Input
              placeholder="Enter 6-digit code (e.g. 748291)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="text-center font-mono text-lg tracking-widest"
              required
            />
            <Button type="submit" variant="primary" size="md" className="w-full shadow-lg shadow-indigo-600/20" isLoading={isLoading}>
              Verify & Continue
            </Button>
            <div className="pt-2 flex flex-col gap-2 text-center">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Registered email"
                  value={emailForResend}
                  onChange={(e) => setEmailForResend(e.target.value)}
                  className="text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResend}
                  className="shrink-0 text-xs"
                >
                  Resend Code
                </Button>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="text-xs text-slate-400 hover:text-slate-200 mt-2"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </AuthShell>
  );
};

// ----------------------------------------------------------------------
// 4. Forgot Password Screen
// ----------------------------------------------------------------------
export const ForgotPasswordScreen: React.FC<{ onNavigate?: (route: string) => void }> = ({ onNavigate = (_route: string) => {} }) => {
  const { forgotPassword } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await forgotPassword(identifier);
    setIsLoading(false);
    setSent(true);
  };

  return (
    <AuthShell
      title="Reset Password"
      subtitle="Enter your registered email or username to receive a cryptographically signed password reset link"
      badgeText="Cryptographic Recovery"
      onNavigate={onNavigate}
    >
      <SimulatedInboxViewer />
      <div className="space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-950/80 border border-amber-800 text-amber-400 flex items-center justify-center mx-auto mb-2">
          <KeyRound className="w-6 h-6" />
        </div>

        {sent ? (
          <div className="space-y-4">
            <Alert type="success" title="Link Dispatched">
              If an account matches that identifier, a secure reset link has been dispatched to your registered email.
            </Alert>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onNavigate('reset-password')}
            >
              Enter Password Reset Code
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Registered Email or Username"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="username or email"
              leftIcon={<Mail className="w-4 h-4" />}
            />
            <Button type="submit" variant="primary" size="md" className="w-full shadow-lg shadow-indigo-600/20" isLoading={isLoading}>
              Send Reset Link
            </Button>
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="text-xs text-slate-400 hover:text-slate-200 block mx-auto text-center"
            >
              Back to Sign In
            </button>
          </form>
        )}
      </div>
    </AuthShell>
  );
};

// ----------------------------------------------------------------------
// 5. Reset Password Screen
// ----------------------------------------------------------------------
export const ResetPasswordScreen: React.FC<{ onNavigate?: (route: string) => void }> = ({ onNavigate = (_route: string) => {} }) => {
  const { resetPassword } = useAuth();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [done, setDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pwdLen = password.length >= 8;
  const pwdUpper = /[A-Z]/.test(password);
  const pwdLower = /[a-z]/.test(password);
  const pwdNum = /[0-9]/.test(password);
  const pwdSpecial = /[^a-zA-Z0-9]/.test(password);
  const isPwdValid = pwdLen && pwdUpper && pwdLower && pwdNum && pwdSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (!isPwdValid) {
      setErrorMessage('Password must satisfy all complexity requirements');
      return;
    }

    setIsLoading(true);
    const result = await resetPassword(token, password);
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Failed to reset password');
      return;
    }

    setDone(true);
  };

  return (
    <AuthShell
      title="Set New Password"
      subtitle="Enter your reset token and select a new strong password"
      badgeText="Secure Re-keying"
      onNavigate={onNavigate}
    >
      <SimulatedInboxViewer />
      <div className="space-y-4">
        {errorMessage && (
          <Alert type="error" title="Reset Error" className="mb-4">
            {errorMessage}
          </Alert>
        )}

        {done ? (
          <div className="space-y-4">
            <Alert type="success" title="Password Updated">
              Your password was securely rehashed and updated. All other active sessions have been terminated.
            </Alert>
            <Button variant="primary" size="sm" className="w-full shadow-lg shadow-indigo-600/20" onClick={() => onNavigate('login')}>
              Log In with New Password
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Reset Token"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste token from email or Outbox"
              className="font-mono text-xs"
            />
            <Input
              label="New Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
            />
            <Input
              label="Confirm Password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px] space-y-1 text-slate-400">
              <span className={pwdLen && pwdUpper && pwdLower && pwdNum && pwdSpecial ? 'text-emerald-400 font-semibold' : ''}>
                Requires 8+ characters with uppercase, lowercase, digit, and symbol.
              </span>
            </div>

            <Button type="submit" variant="primary" size="md" className="w-full shadow-lg shadow-indigo-600/20" isLoading={isLoading}>
              Update Password
            </Button>
          </form>
        )}
      </div>
    </AuthShell>
  );
};

// ----------------------------------------------------------------------
// 6. Account Locked Screen
// ----------------------------------------------------------------------
export const AccountLockedScreen: React.FC<{ onNavigate?: (route: string) => void }> = ({ onNavigate = (_route: string) => {} }) => {
  return (
    <AuthShell
      title="Account Temporarily Locked"
      subtitle="Intrusion prevention triggered by multiple failed attempts"
      badgeText="Security Lockout"
      onNavigate={onNavigate}
    >
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto">
          <AlertOctagon className="w-6 h-6" />
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Due to multiple consecutive failed authentication attempts, this account has been protected by our automated intrusion detection rules.
        </p>
        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-300 font-mono">
          Security Incident ID: SEC-LOCK-AUTO-GUARD
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <Button variant="primary" size="sm" className="w-full shadow-lg shadow-indigo-600/20" onClick={() => onNavigate('forgot-password')}>
            Reset Password to Unlock
          </Button>
          <Button variant="outline" size="sm" className="w-full" onClick={() => onNavigate('login')}>
            Return to Login
          </Button>
        </div>
      </div>
    </AuthShell>
  );
};

// ----------------------------------------------------------------------
// 7. Session Expired Screen
// ----------------------------------------------------------------------
export const SessionExpiredScreen: React.FC<{ onNavigate?: (route: string) => void }> = ({ onNavigate = (_route: string) => {} }) => {
  return (
    <AuthShell
      title="Session Expired"
      subtitle="Your inactive authorization session has ended"
      badgeText="Session Timeout"
      onNavigate={onNavigate}
    >
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-950/80 border border-amber-800 text-amber-400 flex items-center justify-center mx-auto">
          <Clock className="w-6 h-6" />
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Your authorization token has expired in accordance with our inactive session defense policy. Please re-authenticate.
        </p>
        <Button variant="primary" size="md" className="w-full shadow-lg shadow-indigo-600/20" onClick={() => onNavigate('login')}>
          Log In Again
        </Button>
      </div>
    </AuthShell>
  );
};

// ----------------------------------------------------------------------
// 8. 404 Not Found Page
// ----------------------------------------------------------------------
export const Error404Page: React.FC<{ onNavigate?: (route: string) => void }> = ({ onNavigate = (_route: string) => {} }) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-md space-y-4">
        <span className="text-6xl font-black text-indigo-600 dark:text-indigo-400 font-mono">404</span>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Resource Not Found</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          The route or resource you requested could not be located in our routing table.
        </p>
        <div className="pt-2">
          <Button variant="primary" size="sm" onClick={() => onNavigate('home')}>
            Back to Public Home
          </Button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 9. 403 Forbidden Page
// ----------------------------------------------------------------------
export const Error403Page: React.FC<{ onNavigate?: (route: string) => void }> = ({ onNavigate = (_route: string) => {} }) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-md space-y-4">
        <span className="text-6xl font-black text-rose-600 dark:text-rose-400 font-mono">403</span>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Access Forbidden</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Your active identity role does not possess the requisite authorization permissions to inspect this administrative sector.
        </p>
        <div className="pt-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate('dashboard')}>
            Return to User Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 10. 500 Internal Server Error Page
// ----------------------------------------------------------------------
export const Error500Page: React.FC<{ onNavigate?: (route: string) => void }> = ({ onNavigate = (_route: string) => {} }) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-md space-y-4">
        <span className="text-6xl font-black text-amber-600 dark:text-amber-400 font-mono">500</span>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Internal Gateway Error</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          The server encountered an unhandled condition while servicing the transaction request. The anomaly has been captured in the system error logs.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Reload Page
          </Button>
          <Button variant="primary" size="sm" onClick={() => onNavigate('home')}>
            Back to Safety
          </Button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 11. Dedicated Staff / Admin Portal Login Screen
// ----------------------------------------------------------------------
export const AdminLoginScreen: React.FC<{
  onNavigate?: (route: string) => void;
  onSuccess?: () => void;
}> = ({ onNavigate = (_route: string) => {}, onSuccess = () => {} }) => {
  const { login, verify2faLogin, logout } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [twoFaChallenge, setTwoFaChallenge] = useState<{ active: boolean; tempToken: string }>({
    active: false,
    tempToken: ''
  });
  const [twoFaCode, setTwoFaCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const result = await login(identifier, password);
    setIsLoading(false);

    if (result.requires2fa && result.tempToken) {
      setTwoFaChallenge({ active: true, tempToken: result.tempToken });
      return;
    }

    if (!result.success) {
      setErrorMessage(result.error || 'Authentication failed. Please verify staff credentials.');
      return;
    }

    // Verify staff clearance
    const token = localStorage.getItem('apex_session_token');
    if (token) {
      try {
        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const resp = await response.json();
        const userRoles = resp.data?.roles || [];
        const isStaff = userRoles.some((r: string) =>
          ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT', 'COMPLIANCE', 'AUDITOR'].includes(r)
        );

        if (!isStaff) {
          await logout();
          setErrorMessage('Access Denied: You do not possess administrative clearance to access this staff console.');
          return;
        }

        onSuccess();
      } catch {
        onSuccess();
      }
    } else {
      onSuccess();
    }
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const result = await verify2faLogin(twoFaChallenge.tempToken, twoFaCode);
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Invalid security token');
      return;
    }

    onSuccess();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden px-4 py-8 sm:py-12">
      {/* Background ambient elements */}
      <div className="absolute -top-32 -left-32 w-96 sm:w-[520px] h-96 sm:h-[520px] bg-gradient-to-br from-indigo-900/30 via-slate-900/40 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 sm:w-[520px] h-96 sm:h-[520px] bg-gradient-to-tl from-indigo-950/40 via-slate-900/30 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 max-w-md w-full mx-auto flex items-center justify-between py-2 mb-4">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-3 text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-indigo-400 shadow-lg group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-white tracking-wide">AMZDistributor</div>
            <div className="text-[10px] text-slate-400">Staff & Governance Gateway</div>
          </div>
        </button>
      </header>

      {/* Card Container */}
      <div className="relative z-10 max-w-md w-full mx-auto bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[11px] font-semibold mb-3">
            <Lock className="w-3.5 h-3.5" />
            <span>Restricted Access • Authorized Staff Only</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Staff Security Portal</h2>
          <p className="text-xs text-slate-400 mt-1">
            Sign in with institutional credentials to access system management, financial settlement, and governance controls.
          </p>
        </div>

        {errorMessage && (
          <Alert type="error" title="Access Alert" className="mb-4">
            {errorMessage}
          </Alert>
        )}

        {twoFaChallenge.active ? (
          <form onSubmit={handleVerify2fa} className="space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-indigo-950/80 border border-indigo-800 text-indigo-400 flex items-center justify-center mx-auto">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white">Security Token Verification</h3>
              <p className="text-xs text-slate-400">
                Enter your 6-digit TOTP staff token or emergency recovery code.
              </p>
            </div>

            <Input
              label="Staff Security Token"
              required
              value={twoFaCode}
              onChange={(e) => setTwoFaCode(e.target.value)}
              placeholder="000000"
              className="text-center font-mono text-base tracking-wider"
              autoFocus
            />

            <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
              <span>Testing Token: <strong className="text-emerald-400 font-mono">123456</strong></span>
              <button
                type="button"
                onClick={() => setTwoFaCode('123456')}
                className="text-indigo-400 hover:text-indigo-300 font-medium underline"
              >
                Fill 123456
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full shadow-lg shadow-indigo-600/20"
              isLoading={isLoading}
            >
              Verify & Authorize
            </Button>

            <button
              type="button"
              onClick={() => {
                setTwoFaChallenge({ active: false, tempToken: '' });
                setTwoFaCode('');
                setErrorMessage(null);
              }}
              className="text-xs text-slate-400 hover:text-slate-200 block mx-auto text-center"
            >
              Cancel
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Staff Username or Email"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="admin / staff identifier"
              leftIcon={<User className="w-4 h-4" />}
            />

            <Input
              label="Administrative Passphrase"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
              <span className="text-slate-300 font-semibold block mb-0.5">Audit & Compliance Notice:</span>
              Administrative actions, session IDs, and queries are recorded immutably under SOC-2 Type II protocols.
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full shadow-lg shadow-indigo-600/20"
              isLoading={isLoading}
            >
              Authenticate to Admin Console
            </Button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-500">
          Not an administrator?{' '}
          <button onClick={() => onNavigate('login')} className="text-indigo-400 hover:underline">
            Go to Investor Portal
          </button>
        </div>
      </div>

      <footer className="relative z-10 max-w-md w-full mx-auto text-center text-[11px] text-slate-600 mt-6">
        AMZDistributor Multi-Tier Governance & Settlement Protocol
      </footer>
    </div>
  );
};
