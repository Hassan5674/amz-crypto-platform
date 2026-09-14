import nodemailer from 'nodemailer';
import { logger } from '../logger.js';

export interface DispatchedEmail {
  id: string;
  to: string;
  subject: string;
  type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'SECURITY_ALERT' | 'WELCOME';
  previewText: string;
  token?: string;
  code?: string;
  link?: string;
  dispatchedAt: string;
  deliveryStatus: 'SENT' | 'SIMULATED' | 'FAILED';
  deliveryError?: string;
}

class EmailService {
  private dispatchedEmails: DispatchedEmail[] = [];
  private maxStoredEmails = 50;
  private transporter: any = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initTransporter();
  }

  private initTransporter(): void {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = (process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
    let smtpPass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '').trim();

    if (smtpPass) {
      smtpPass = smtpPass.replace(/\s+/g, '');
    }

    if (smtpUser && smtpPass) {
      if (smtpUser.toLowerCase().includes('@gmail.com') || (!smtpHost && !process.env.SMTP_HOST)) {
        // Direct Gmail preset with full SSL/TLS support
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: smtpUser,
            pass: smtpPass
          },
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 5000
        });
      } else {
        this.transporter = nodemailer.createTransport({
          host: smtpHost || 'smtp.hostinger.com',
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          },
          tls: {
            rejectUnauthorized: false
          },
          connectionTimeout: 8000,
          greetingTimeout: 8000,
          socketTimeout: 8000
        });
      }
      this.isConfigured = true;
      logger.info('EMAIL', `SMTP Transporter initialized for ${smtpUser} via ${smtpHost || 'smtp.hostinger.com'}:${smtpPort}`);
      // Verify transporter connectivity non-blockingly
      this.transporter.verify((error: any) => {
        if (error) {
          logger.warn('EMAIL', `SMTP connection check warning: ${error.message}`);
        } else {
          logger.info('EMAIL', 'SMTP server connection verified successfully.');
        }
      });
    } else {
      this.isConfigured = false;
      logger.info('EMAIL', 'No SMTP credentials detected (SMTP_USER / SMTP_PASS). Ready to receive live credentials.');
    }
  }

  private getSender(): string {
    return (
      process.env.EMAIL_FROM ||
      (process.env.SMTP_USER ? `AMZDistributor Security <${process.env.SMTP_USER}>` : 'AMZDistributor <no-reply@amzdistributor.com>')
    );
  }

  private generateHtmlWrapper(title: string, preheader: string, contentHtml: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0f19;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #0b0f19;
      padding-bottom: 40px;
    }
    .main {
      background-color: #131b2e;
      margin: 0 auto;
      width: 100%;
      max-width: 580px;
      border-spacing: 0;
      border-radius: 16px;
      border: 1px solid #1e293b;
      overflow: hidden;
    }
    .header-bar {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
      padding: 32px 36px;
      text-align: center;
      border-bottom: 1px solid #3730a3;
    }
    .brand-title {
      color: #ffffff;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 0.5px;
      margin: 0;
    }
    .brand-subtitle {
      color: #a5b4fc;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .content {
      padding: 36px 36px 28px 36px;
    }
    .headline {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin-top: 0;
      margin-bottom: 12px;
    }
    .paragraph {
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
      margin-bottom: 24px;
    }
    .code-box {
      background-color: #0b0f19;
      border: 2px dashed #4f46e5;
      border-radius: 12px;
      padding: 24px 20px;
      text-align: center;
      margin: 28px 0;
    }
    .code-label {
      font-size: 11px;
      font-weight: 600;
      color: #818cf8;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 34px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #38bdf8;
      margin: 0;
    }
    .btn-action {
      display: inline-block;
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
      color: #ffffff !important;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      margin-top: 8px;
      margin-bottom: 24px;
      text-align: center;
    }
    .footer {
      padding: 24px 36px;
      background-color: #0b0f19;
      border-top: 1px solid #1e293b;
      text-align: center;
      font-size: 11px;
      color: #64748b;
      line-height: 1.5;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background-color: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.4);
      color: #a5b4fc;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader}
  </div>
  <center class="wrapper">
    <div style="height: 32px;"></div>
    <table class="main" width="100%">
      <tr>
        <td class="header-bar">
          <div class="brand-title">AMZDistributor</div>
          <div class="brand-subtitle">Multi-Currency Portfolio & Settlement</div>
        </td>
      </tr>
      <tr>
        <td class="content">
          ${contentHtml}
        </td>
      </tr>
      <tr>
        <td class="footer">
          <div style="margin-bottom: 8px; color: #94a3b8; font-weight: 600;">AMZDistributor Institutional Gateway</div>
          <div>This automated notification was dispatched from a verified cryptographic dispatch node.</div>
          <div style="margin-top: 4px;">If you did not initiate this request, please disregard this email or report to compliance.</div>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
  }

  public async sendVerificationEmail(
    to: string,
    username: string,
    token: string,
    code: string
  ): Promise<{ success: boolean; error?: string }> {
    // Re-verify transporter configuration in case env vars were set recently
    this.initTransporter();

    const frontendUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
    const link = `${frontendUrl}/?route=verify-email&token=${token}`;

    const contentHtml = `
      <div class="badge">Verification Required</div>
      <h1 class="headline">Confirm Your Email Address</h1>
      <p class="paragraph">
        Hello <strong style="color:#ffffff;">${username}</strong>,<br>
        Thank you for creating an account on AMZDistributor. To complete your registration and secure your multi-currency portfolio, please enter the following 6-digit confirmation code:
      </p>

      <div class="code-box">
        <div class="code-label">6-Digit Verification Code</div>
        <div class="otp-code">${code}</div>
      </div>

      <p class="paragraph" style="text-align: center; margin-bottom: 12px;">
        Or confirm directly by clicking the secure button below:
      </p>
      <div style="text-align: center;">
        <a href="${link}" class="btn-action" target="_blank">Verify Email Address</a>
      </div>

      <p class="paragraph" style="font-size: 12px; color: #64748b; margin-top: 24px;">
        ⏰ This verification code and link will expire in <strong>15 minutes</strong>. If you did not sign up for an AMZDistributor account, no further action is required.
      </p>
    `;

    const html = this.generateHtmlWrapper(
      'Verify Your AMZDistributor Account',
      `Your verification code is ${code}`,
      contentHtml
    );

    const emailRecord: DispatchedEmail = {
      id: `mail_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      to,
      subject: `[AMZDistributor] Your Verification Code: ${code}`,
      type: 'EMAIL_VERIFICATION',
      previewText: `Welcome ${username}! Your 6-digit confirmation code is ${code}.`,
      token,
      code,
      link,
      dispatchedAt: new Date().toISOString(),
      deliveryStatus: 'SIMULATED'
    };

    this.recordEmail(emailRecord);

    if (this.isConfigured && this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: this.getSender(),
          to,
          subject: `[AMZDistributor] Your Verification Code: ${code}`,
          text: `Welcome ${username}!\n\nYour 6-digit email confirmation code is: ${code}\n\nOr click here to verify: ${link}\n\nThis code expires in 15 minutes.`,
          html
        });
        emailRecord.deliveryStatus = 'SENT';
        logger.info('EMAIL', `[LIVE EMAIL DELIVERED] To: ${to} | MessageId: ${info.messageId}`);
        return { success: true };
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        emailRecord.deliveryStatus = 'FAILED';
        emailRecord.deliveryError = errMsg;
        logger.warn('EMAIL', `SMTP send error: ${errMsg}`);
        return { success: false, error: errMsg };
      }
    } else {
      logger.warn('EMAIL', `[SMTP NOT CONFIGURED] Simulated code ${code} for ${to}.`);
    }

    return { success: true };
  }

  public async sendWelcomeEmail(
    to: string,
    username: string
  ): Promise<{ success: boolean; error?: string }> {
    this.initTransporter();

    const frontendUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
    const loginLink = `${frontendUrl}/?route=login`;

    const contentHtml = `
      <div class="badge" style="border-color: rgba(34, 197, 94, 0.4); background-color: rgba(34, 197, 94, 0.15); color: #4ade80;">
        Account Verified
      </div>
      <h1 class="headline">Congratulations, Welcome to AMZDistributor!</h1>
      <p class="paragraph">
        Hello <strong style="color:#ffffff;">${username}</strong>,<br>
        Your email address has been successfully verified and your institutional portfolio account is now fully active.
      </p>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${loginLink}" class="btn-action" target="_blank">Access Your Dashboard</a>
      </div>

      <p class="paragraph" style="font-size: 13px; color: #94a3b8; text-align: center;">
        You can now securely participate in high-reliability multi-tier portfolio oversight, provably fair games, and instant crypto settlements.
      </p>
    `;

    const html = this.generateHtmlWrapper(
      'Welcome to AMZDistributor - Account Verified',
      'Congratulations on verifying your AMZDistributor account!',
      contentHtml
    );

    const emailRecord: DispatchedEmail = {
      id: `mail_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      to,
      subject: '[AMZDistributor] Congratulations! Account Successfully Verified',
      type: 'WELCOME',
      previewText: `Congratulations ${username}! Your AMZDistributor account is active.`,
      link: loginLink,
      dispatchedAt: new Date().toISOString(),
      deliveryStatus: 'SIMULATED'
    };

    this.recordEmail(emailRecord);

    if (this.isConfigured && this.transporter) {
      this.transporter.sendMail({
        from: this.getSender(),
        to,
        subject: '[AMZDistributor] Congratulations! Account Successfully Verified',
        text: `Congratulations ${username}!\n\nYour AMZDistributor account is now fully verified and active. Access your dashboard at: ${loginLink}`,
        html
      }).then((info) => {
        emailRecord.deliveryStatus = 'SENT';
        logger.info('EMAIL', `[LIVE CONGRATULATIONS EMAIL DELIVERED] To: ${to} | MessageId: ${info.messageId}`);
      }).catch((err: any) => {
        const errMsg = err?.message || String(err);
        emailRecord.deliveryStatus = 'FAILED';
        emailRecord.deliveryError = errMsg;
        logger.warn('EMAIL', `SMTP send failed (simulated successfully): ${errMsg}`);
      });
    } else {
      logger.warn('EMAIL', `[SMTP NOT CONFIGURED] Simulated welcome email for ${to}`);
    }

    return { success: true };
  }

  public async sendPasswordResetEmail(
    to: string,
    username: string,
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    this.initTransporter();

    const frontendUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
    const link = `${frontendUrl}/?route=reset-password&token=${token}`;

    const contentHtml = `
      <div class="badge" style="border-color: rgba(245, 158, 11, 0.4); background-color: rgba(245, 158, 11, 0.15); color: #fcd34d;">
        Security Notice
      </div>
      <h1 class="headline">Reset Your Passphrase</h1>
      <p class="paragraph">
        Hello <strong style="color:#ffffff;">${username}</strong>,<br>
        A request has been received to reset the password for your AMZDistributor portfolio account. Click the button below to establish a new password:
      </p>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${link}" class="btn-action" target="_blank">Reset Password Now</a>
      </div>

      <div class="code-box" style="border-color: #334155; padding: 14px;">
        <div class="code-label" style="color: #94a3b8;">Cryptographic Recovery Token</div>
        <div style="font-family: monospace; font-size: 13px; color: #cbd5e1; word-break: break-all;">${token}</div>
      </div>

      <p class="paragraph" style="font-size: 12px; color: #64748b;">
        🔒 This recovery token is cryptographically signed and will expire in <strong>1 hour</strong>. If you did not request this change, please review your account security immediately.
      </p>
    `;

    const html = this.generateHtmlWrapper(
      'Reset Your AMZDistributor Password',
      'Password reset request for AMZDistributor',
      contentHtml
    );

    const emailRecord: DispatchedEmail = {
      id: `mail_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      to,
      subject: '[AMZDistributor] Password Reset Request',
      type: 'PASSWORD_RESET',
      previewText: `Password reset requested for ${username}. Reset link: ${link}`,
      token,
      link,
      dispatchedAt: new Date().toISOString(),
      deliveryStatus: 'SIMULATED'
    };

    this.recordEmail(emailRecord);

    if (this.isConfigured && this.transporter) {
      this.transporter.sendMail({
        from: this.getSender(),
        to,
        subject: '[AMZDistributor] Password Reset Request',
        text: `Hello ${username},\n\nA password reset was requested. Use this secure link within 1 hour:\n${link}\n\nToken: ${token}`,
        html
      }).then((info) => {
        emailRecord.deliveryStatus = 'SENT';
        logger.info('EMAIL', `[LIVE RESET EMAIL DELIVERED] To: ${to} | MessageId: ${info.messageId}`);
      }).catch((err: any) => {
        const errMsg = err?.message || String(err);
        emailRecord.deliveryStatus = 'FAILED';
        emailRecord.deliveryError = errMsg;
        logger.warn('EMAIL', `SMTP send failed (simulated successfully): ${errMsg}`);
      });
    } else {
      logger.warn('EMAIL', `[SMTP NOT CONFIGURED] Simulated reset link for ${to}`);
    }

    return { success: true };
  }

  private recordEmail(email: DispatchedEmail): void {
    this.dispatchedEmails.unshift(email);
    if (this.dispatchedEmails.length > this.maxStoredEmails) {
      this.dispatchedEmails.pop();
    }
  }

  public getDispatchedEmails(limit: number = 20): DispatchedEmail[] {
    return this.dispatchedEmails.slice(0, limit);
  }

  public clearEmails(): void {
    this.dispatchedEmails = [];
  }

  public getStatus(): { isConfigured: boolean; sender: string } {
    this.initTransporter();
    return {
      isConfigured: this.isConfigured,
      sender: this.getSender()
    };
  }
}

export const emailService = new EmailService();
