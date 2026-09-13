-- Initial seed data for ApexPlatform RBAC, System Settings, and Content Foundations

-- Seed Roles
INSERT INTO roles (id, name, description) VALUES
(1, 'SUPER_ADMIN', 'Full administrative authority across all platform modules, security controls, and roles.'),
(2, 'ADMIN', 'Administrative authority over daily operations, users, and content management.'),
(3, 'SUPPORT', 'Access to customer support tickets, user inquiries, and identity assistance.'),
(4, 'FINANCE', 'Access to audit trails, financial reports, deposits, and withdrawal oversight.'),
(5, 'INVESTMENT_MANAGER', 'Management of investment products, duration models, and risk parameters.'),
(6, 'GAME_MANAGER', 'Oversight of arcade and probabilistic games, configurations, and uptime.'),
(7, 'CONTENT_MANAGER', 'Editorial control over CMS pages, announcements, and FAQs.'),
(8, 'USER', 'Standard registered customer account with dashboard and activity access.')
ON CONFLICT (id) DO NOTHING;

-- Seed Granular Permissions
INSERT INTO permissions (id, name, category, description) VALUES
(1, 'users.view', 'users', 'View user profiles and list'),
(2, 'users.edit', 'users', 'Edit user profile information'),
(3, 'users.suspend', 'users', 'Temporarily suspend user accounts'),
(4, 'users.ban', 'users', 'Permanently ban user accounts'),
(5, 'deposits.view', 'finance', 'View deposit records and requests'),
(6, 'deposits.manage', 'finance', 'Review, approve or reject deposits'),
(7, 'withdrawals.view', 'finance', 'View withdrawal requests and history'),
(8, 'withdrawals.manage', 'finance', 'Review, approve or reject withdrawals'),
(9, 'investment_plans.view', 'investments', 'View investment plans catalogue'),
(10, 'investment_plans.create', 'investments', 'Create new investment plan specifications'),
(11, 'investment_plans.edit', 'investments', 'Edit existing plan terms and limits'),
(12, 'investment_plans.disable', 'investments', 'Deactivate or retire investment plans'),
(13, 'games.view', 'games', 'View games catalogue and status'),
(14, 'games.manage', 'games', 'Toggle game status and adjust maintenance states'),
(15, 'support.view', 'support', 'View customer support tickets and history'),
(16, 'support.manage', 'support', 'Respond to, assign, and close support tickets'),
(17, 'reports.view', 'reports', 'View aggregated operational and financial reports'),
(18, 'reports.export', 'reports', 'Export reports in CSV and JSON formats'),
(19, 'settings.view', 'settings', 'View platform system settings'),
(20, 'settings.edit', 'settings', 'Modify system configuration and maintenance mode'),
(21, 'admins.view', 'admins', 'View administrative accounts and assigned roles'),
(22, 'admins.create', 'admins', 'Invite or provision new administrative accounts'),
(23, 'admins.edit', 'admins', 'Edit administrator permissions and role bindings'),
(24, 'admins.disable', 'admins', 'Revoke or disable administrator access')
ON CONFLICT (id) DO NOTHING;

-- Seed SUPER_ADMIN permissions (All 1 through 24)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions
ON CONFLICT DO NOTHING;

-- Seed ADMIN permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE name IN (
  'users.view', 'users.edit', 'users.suspend',
  'deposits.view', 'withdrawals.view',
  'investment_plans.view', 'games.view',
  'support.view', 'support.manage',
  'reports.view', 'settings.view'
)
ON CONFLICT DO NOTHING;

-- Seed SUPPORT permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE name IN (
  'users.view', 'support.view', 'support.manage'
)
ON CONFLICT DO NOTHING;

-- Seed FINANCE permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions WHERE name IN (
  'users.view', 'deposits.view', 'deposits.manage',
  'withdrawals.view', 'withdrawals.manage',
  'reports.view', 'reports.export'
)
ON CONFLICT DO NOTHING;

-- Seed INVESTMENT_MANAGER permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions WHERE name IN (
  'investment_plans.view', 'investment_plans.create', 'investment_plans.edit', 'investment_plans.disable',
  'reports.view'
)
ON CONFLICT DO NOTHING;

-- Seed GAME_MANAGER permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 6, id FROM permissions WHERE name IN (
  'games.view', 'games.manage', 'reports.view'
)
ON CONFLICT DO NOTHING;

-- Seed CONTENT_MANAGER permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 7, id FROM permissions WHERE name IN (
  'settings.view', 'reports.view'
)
ON CONFLICT DO NOTHING;
