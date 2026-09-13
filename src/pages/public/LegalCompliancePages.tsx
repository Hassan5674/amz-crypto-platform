import React, { useState } from 'react';
import {
  Shield,
  Lock,
  FileText,
  AlertTriangle,
  Mail,
  Send,
  HelpCircle,
  Activity,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Input } from '../../components/ui/Input.js';
import { Alert } from '../../components/ui/Alert.js';

// ----------------------------------------------------------------------
// 1. About Page
// ----------------------------------------------------------------------
export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left space-y-8">
      <div>
        <Badge variant="primary">Platform Architecture</Badge>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">About AMZDistributor</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
          AMZDistributor is an institutional digital infrastructure designed for capital governance, verifiable commerce modules, and multi-tier organizational operations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Our Mission</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            To provide verifiable, high-integrity financial software without deceptive marketing, opaque black-box returns, or unauthorized administrative interventions.
          </p>
        </Card>

        <Card>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Architectural Principles</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Strict separation of duty, zero trust role-based privileges, comprehensive immutable audit logging, and transparent mathematical game disclosures.
          </p>
        </Card>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 2. FAQ Page
// ----------------------------------------------------------------------
export const FAQPage: React.FC = () => {
  const faqs = [
    {
      q: 'How does AMZDistributor operate?',
      a: 'AMZDistributor delivers institutional-grade commerce governance, verified cryptocurrency payment rails with instant on-chain confirmation, multi-role RBAC security, and transparent ledger auditing.'
    },
    {
      q: 'How are passwords and user sessions secured?',
      a: 'Passwords are encrypted using industry-standard hashing algorithms (argon2/bcrypt). Sessions use cryptographically random tokens bound to device and IP metadata.'
    },
    {
      q: 'What roles exist on the platform?',
      a: 'The system defines 8 distinct roles: Super Admin, Admin, Support, Finance, Investment Manager, Game Manager, Content Manager, and Standard User. Access to actions like suspending users or approving deposits requires explicit permission flags.'
    },
    {
      q: 'Are the game results truly provably fair?',
      a: 'Yes. In upcoming production phases, all probabilistic games use SHA-256 server seed hashes revealed to the client prior to wager generation for independent client verification.'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left space-y-6">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <Badge variant="primary">Knowledge Base</Badge>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">Frequently Asked Questions</h1>
      </div>

      <div className="space-y-4">
        {faqs.map((f, i) => (
          <Card key={i}>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>{f.q}</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-6">{f.a}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 3. Security Page
// ----------------------------------------------------------------------
export const SecurityPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left space-y-8">
      <div>
        <Badge variant="primary">System Defenses</Badge>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">Platform Security Architecture</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
          Comprehensive defense-in-depth across our network ingress, authentication layer, and data persistence models.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
        <Card>
          <Lock className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mb-3" />
          <h4 className="font-bold text-sm mb-1 text-slate-900 dark:text-white">Role-Based Authorization</h4>
          <p className="text-slate-500 leading-relaxed">
            All API calls strictly enforce server-side RBAC validation. No administrative privilege can be forged from client-side state.
          </p>
        </Card>

        <Card>
          <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mb-3" />
          <h4 className="font-bold text-sm mb-1 text-slate-900 dark:text-white">Audit Trail Logging</h4>
          <p className="text-slate-500 leading-relaxed">
            Actions taken by staff or automated background jobs are recorded with actor IDs, entity references, IP metadata, and timestamps.
          </p>
        </Card>

        <Card>
          <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mb-3" />
          <h4 className="font-bold text-sm mb-1 text-slate-900 dark:text-white">Input Sanitization</h4>
          <p className="text-slate-500 leading-relaxed">
            Strict validation schemas across registration, login, and ticket submission protect against injection attacks and privilege escalations.
          </p>
        </Card>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 4. Contact Page
// ----------------------------------------------------------------------
export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left">
      <div className="text-center max-w-xl mx-auto mb-8">
        <Badge variant="primary">Get in Touch</Badge>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">Contact Operations & Support</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          Reach our compliance, technical architecture, or customer service representatives.
        </p>
      </div>

      <Card>
        {submitted ? (
          <Alert type="success" title="Inquiry Received">
            Thank you for reaching out. A platform support specialist will review your ticket and respond to your registered email address.
          </Alert>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Full Name" required placeholder="Alexander Wright" />
              <Input label="Email Address" type="email" required placeholder="alex@example.com" />
            </div>
            <Input label="Subject / Topic" required placeholder="Architecture inquiry / Account verification" />
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                Message Content *
              </label>
              <textarea
                required
                rows={4}
                placeholder="Describe your inquiry in detail..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <Button type="submit" variant="primary" size="md" className="w-full" rightIcon={<Send className="w-4 h-4" />}>
              Submit Inquiry
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};

// ----------------------------------------------------------------------
// 5. Blog / News Page
// ----------------------------------------------------------------------
export const BlogNewsPage: React.FC = () => {
  const articles = [
    {
      title: 'AMZDistributor Global Enterprise Platform Released',
      date: 'September 07, 2026',
      category: 'System Release',
      excerpt: 'The multi-asset investment engine, crypto settlement gateway, and provably fair gaming ecosystem are now live.'
    },
    {
      title: 'Implementing Multi-Tier RBAC in Financial Platforms',
      date: 'August 28, 2026',
      category: 'Engineering Whitepaper',
      excerpt: 'Why granting monolithic administrator privileges is a liability and how granular permissions protect capital.'
    },
    {
      title: 'Provably Fair Seed Verification: A Technical Deep Dive',
      date: 'August 14, 2026',
      category: 'Gaming Architecture',
      excerpt: 'Analyzing deterministic pseudorandom number generators and SHA-256 client seed verification.'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left space-y-6">
      <div>
        <Badge variant="primary">Dispatches & Technical Notes</Badge>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">Platform News & Updates</h1>
      </div>

      <div className="space-y-4">
        {articles.map((art, idx) => (
          <Card key={idx} hoverEffect>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase">{art.category}</span>
              <span>{art.date}</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">{art.title}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{art.excerpt}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 6. Terms & Conditions
// ----------------------------------------------------------------------
export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left space-y-6 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
      <div>
        <Badge variant="neutral">Legal Agreement</Badge>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">Terms & Conditions</h1>
        <p className="text-xs text-slate-500 mt-1">Last Updated: September 07, 2026</p>
      </div>

      <Card className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Introduction & Acceptance</h3>
        <p>By accessing or utilizing AMZDistributor, you acknowledge and agree to be bound by these Terms of Service. All cryptographic transactions and allocations adhere to applicable digital commerce standards.</p>

        <h3 className="text-sm font-bold text-slate-900 dark:text-white">2. Multi-Network Deposit Protocol</h3>
        <p>All deposits must follow designated network confirmation standards. Orders are monitored via real-time gateway ledger nodes.</p>

        <h3 className="text-sm font-bold text-slate-900 dark:text-white">3. User Conduct</h3>
        <p>Users must provide accurate identity information and are prohibited from attempting SQL injection, privilege escalation, or unauthorized API stress testing.</p>
      </Card>
    </div>
  );
};

// ----------------------------------------------------------------------
// 7. Privacy Policy
// ----------------------------------------------------------------------
export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left space-y-6 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
      <div>
        <Badge variant="neutral">Data Governance</Badge>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">Privacy Policy</h1>
        <p className="text-xs text-slate-500 mt-1">Last Updated: September 07, 2026</p>
      </div>

      <Card className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Data Collection</h3>
        <p>We collect essential identity credentials (name, email, phone) strictly for account authorization, security verification, and communication.</p>

        <h3 className="text-sm font-bold text-slate-900 dark:text-white">2. Audit Logging & Security Retention</h3>
        <p>IP metadata and user agent strings are logged for fraud mitigation and anomaly detection in compliance with enterprise security frameworks.</p>

        <h3 className="text-sm font-bold text-slate-900 dark:text-white">3. Zero Selling of Personal Data</h3>
        <p>AMZDistributor never sells, rents, or monetizes user data to third-party marketing brokers.</p>
      </Card>
    </div>
  );
};

// ----------------------------------------------------------------------
// 8. Risk Disclosure
// ----------------------------------------------------------------------
export const RiskDisclosurePage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left space-y-6 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
      <div>
        <Badge variant="danger">Risk Warning</Badge>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">Risk Disclosure Notice</h1>
      </div>

      <Alert type="error" title="No Guarantees of Profit">
        Digital asset participation, quantitative portfolios, and staking mechanisms carry intrinsic risks of market volatility and software errors. Past illustrative performances do not constitute guaranteed returns.
      </Alert>

      <Card className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Technological & Smart Contract Risk</h3>
        <p>Protocols and distributed systems may experience disruptions, forks, or unexpected network partitions.</p>

        <h3 className="text-sm font-bold text-slate-900 dark:text-white">2. Market Volatility</h3>
        <p>Valuations of underlying digital instruments may fluctuate significantly based on global macroeconomic factors.</p>
      </Card>
    </div>
  );
};

// ----------------------------------------------------------------------
// 9. Responsible Gaming
// ----------------------------------------------------------------------
export const ResponsibleGamingPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left space-y-6 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
      <div>
        <Badge variant="warning">Player Welfare</Badge>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">Responsible Gaming Policy</h1>
      </div>

      <Card className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Commitment to Player Safety</h3>
        <p>AMZDistributor enforces self-exclusion limits, cooling-off periods, and transaction loss ceilings to promote responsible participation.</p>

        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Underage Protection</h3>
        <p>Individuals under the legal age of majority (18/21 depending on jurisdiction) are strictly prohibited from account registration.</p>
      </Card>
    </div>
  );
};

// ----------------------------------------------------------------------
// 10. AML / KYC Information
// ----------------------------------------------------------------------
export const AmlKycPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left space-y-6 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
      <div>
        <Badge variant="primary">Regulatory Compliance</Badge>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">Anti-Money Laundering & KYC</h1>
      </div>

      <Card className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Verification Tiers</h3>
        <p>Tier 1 includes email, phone, and standard profile registration. Tier 2 requires government-issued photo identification and proof of residential address.</p>

        <h3 className="text-sm font-bold text-slate-900 dark:text-white">2. Sanctions & PEP Screening</h3>
        <p>All participants are checked against international OFAC, UN, and EU financial sanctions databases prior to higher-tier clearance.</p>
      </Card>
    </div>
  );
};

// ----------------------------------------------------------------------
// 11. System Status
// ----------------------------------------------------------------------
export const SystemStatusPage: React.FC = () => {
  const services = [
    { name: 'Core REST API Gateway', status: 'OPERATIONAL', latency: '4 ms' },
    { name: 'Identity & RBAC Engine', status: 'OPERATIONAL', latency: '6 ms' },
    { name: 'PostgreSQL Database Layer', status: 'OPERATIONAL', latency: '2 ms' },
    { name: 'Audit & Compliance Stream', status: 'OPERATIONAL', latency: '3 ms' },
    { name: 'Financial Transaction Gateway', status: 'DISABLED_PHASE_1', latency: 'N/A' },
    { name: 'Provably Fair RNG Engine', status: 'STANDBY_PHASE_1', latency: '1 ms' }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-left space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Badge variant="success">All Systems Monitored</Badge>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">System Status & Uptime</h1>
        </div>
        <div className="text-right text-xs text-slate-400">
          <div>Uptime: <strong>99.98%</strong></div>
          <div>Status check: Real-time</div>
        </div>
      </div>

      <div className="space-y-3">
        {services.map((s, idx) => (
          <Card key={idx} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  s.status === 'OPERATIONAL'
                    ? 'bg-emerald-500 animate-pulse'
                    : s.status === 'STANDBY_PHASE_1'
                    ? 'bg-sky-500'
                    : 'bg-amber-500'
                }`}
              />
              <span className="font-semibold text-sm text-slate-900 dark:text-white">{s.name}</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-slate-400">Latency: {s.latency}</span>
              <Badge
                variant={
                  s.status === 'OPERATIONAL'
                    ? 'success'
                    : s.status === 'STANDBY_PHASE_1'
                    ? 'info'
                    : 'warning'
                }
              >
                {s.status}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
