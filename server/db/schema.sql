-- Platform-level tables
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_members INTEGER DEFAULT 500,
  max_users INTEGER DEFAULT 10,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'cancelled')),
  plan_id UUID REFERENCES subscription_plans(id),
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
  billing_cycle VARCHAR(10) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  plan_name VARCHAR(100),
  plan_slug VARCHAR(50),
  plan_description TEXT,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  max_members INTEGER,
  max_users INTEGER,
  plan_features JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_admin_roles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  role_id VARCHAR(50) DEFAULT 'super_admin' REFERENCES platform_admin_roles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES tenant_subscriptions(id) ON DELETE SET NULL,
  tap_charge_id VARCHAR(100),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'captured', 'failed', 'cancelled')),
  billing_cycle VARCHAR(10) DEFAULT 'monthly',
  plan_name VARCHAR(100),
  plan_slug VARCHAR(50),
  customer_email VARCHAR(255),
  invoice_number VARCHAR(50),
  invoice_sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  subject VARCHAR(255) DEFAULT 'Support request',
  created_by_user_id UUID,
  created_by_name VARCHAR(255),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('tenant_user', 'platform_admin', 'bot')),
  sender_id UUID,
  sender_name VARCHAR(255),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant-scoped tables
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  photo_url TEXT,
  role VARCHAR(50) NOT NULL DEFAULT 'staff',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(50) NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  permissions JSONB DEFAULT '[]',
  is_system BOOLEAN DEFAULT false,
  PRIMARY KEY (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) DEFAULT 'Club Manager',
  logo_url_light TEXT,
  logo_url_dark TEXT,
  manager_email VARCHAR(255),
  phone VARCHAR(50),
  location TEXT,
  whatsapp_template TEXT,
  whatsapp_templates JSONB DEFAULT '[]',
  receipt_type VARCHAR(10) DEFAULT 'thermal',
  receipt_logo_thermal TEXT,
  receipt_a4_design TEXT,
  screensaver_enabled BOOLEAN DEFAULT false,
  screensaver_timeout INTEGER DEFAULT 60,
  socials JSONB DEFAULT '{"facebook":"","instagram":"","twitter":""}',
  product_categories JSONB DEFAULT '[]',
  github_token TEXT,
  club_type VARCHAR(50) DEFAULT 'hybrid',
  progression_config JSONB DEFAULT '{"enabled":true,"mode":"belts","label":"Belts","labelAr":"الأحزمة","singularLabel":"Belt","singularLabelAr":"حزام","showStripes":false}',
  member_field_config JSONB DEFAULT '{"beltSize":true,"suitSize":true,"weight":true,"height":true,"bloodType":true,"healthNotes":true,"customFields":[]}',
  module_config JSONB DEFAULT '{"progression":true,"store":true,"belts":true}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_counters (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  member_count INTEGER DEFAULT 1000
);

CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  father_name VARCHAR(100),
  last_name VARCHAR(100),
  cpr VARCHAR(50),
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  dob DATE,
  gender VARCHAR(10),
  age INTEGER,
  height VARCHAR(20),
  weight VARCHAR(20),
  blood_type VARCHAR(10),
  belt_size VARCHAR(20),
  suit_size VARCHAR(20),
  health_notes TEXT,
  subscription_start DATE,
  subscription_end DATE,
  status VARCHAR(20) DEFAULT 'inactive',
  balance DECIMAL(10,2) DEFAULT 0,
  image_url TEXT,
  documents JSONB DEFAULT '[]',
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  duration INTEGER NOT NULL DEFAULT 30,
  price DECIMAL(10,2) NOT NULL,
  package_type VARCHAR(20) DEFAULT 'duration',
  session_count INTEGER
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  member_name VARCHAR(255) NOT NULL,
  plan_name VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  payment_status VARCHAR(20) DEFAULT 'pending',
  payment_method VARCHAR(50),
  package_type VARCHAR(20) DEFAULT 'duration',
  sessions_total INTEGER,
  sessions_remaining INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  member_name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS belts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS member_belts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  belt_id UUID NOT NULL REFERENCES belts(id) ON DELETE CASCADE,
  stripes INTEGER DEFAULT 0,
  awarded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  category VARCHAR(100) DEFAULT 'general',
  image_url TEXT,
  track_inventory BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  buyer_name VARCHAR(255),
  buyer_phone VARCHAR(50),
  date TIMESTAMPTZ DEFAULT NOW(),
  payment_method VARCHAR(50),
  payment_status VARCHAR(20) DEFAULT 'paid',
  status VARCHAR(20) DEFAULT 'completed',
  cancelled_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  receipt_id VARCHAR(100),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  expenses_title VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100),
  description TEXT,
  metadata TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  is_all_day BOOLEAN DEFAULT false,
  color VARCHAR(20),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_members_tenant ON members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_member ON subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_date ON attendance(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_member ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_sales_tenant ON sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant ON activity_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant ON tenant_subscriptions(tenant_id);

-- Schema migrations for existing databases
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS club_type VARCHAR(50) DEFAULT 'hybrid';
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS progression_config JSONB DEFAULT '{"enabled":true,"mode":"belts","label":"Belts","labelAr":"الأحزمة","singularLabel":"Belt","singularLabelAr":"حزام","showStripes":false}';
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS member_field_config JSONB DEFAULT '{"beltSize":true,"suitSize":true,"weight":true,"height":true,"bloodType":true,"healthNotes":true,"customFields":[]}';
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS module_config JSONB DEFAULT '{"progression":true,"store":true,"belts":true}';
ALTER TABLE members ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
ALTER TABLE packages ADD COLUMN IF NOT EXISTS package_type VARCHAR(20) DEFAULT 'duration';
ALTER TABLE packages ADD COLUMN IF NOT EXISTS session_count INTEGER;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS package_type VARCHAR(20) DEFAULT 'duration';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS sessions_total INTEGER;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS sessions_remaining INTEGER;
ALTER TABLE member_belts ADD COLUMN IF NOT EXISTS stripes INTEGER DEFAULT 0;
UPDATE tenant_settings SET club_type = 'hybrid' WHERE club_type = 'yoga_pilates';

ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS plan_name VARCHAR(100);
ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS plan_slug VARCHAR(50);
ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS plan_description TEXT;
ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS price_monthly DECIMAL(10,2);
ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS price_yearly DECIMAL(10,2);
ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS max_members INTEGER;
ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS max_users INTEGER;
ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS plan_features JSONB DEFAULT '[]';

ALTER TABLE tenant_subscriptions ALTER COLUMN plan_id DROP NOT NULL;

UPDATE tenant_subscriptions ts
SET
  plan_name = sp.name,
  plan_slug = sp.slug,
  plan_description = sp.description,
  price_monthly = sp.price_monthly,
  price_yearly = sp.price_yearly,
  max_members = sp.max_members,
  max_users = sp.max_users,
  plan_features = sp.features
FROM subscription_plans sp
WHERE ts.plan_id = sp.id AND ts.plan_name IS NULL;

ALTER TABLE platform_admins ADD COLUMN IF NOT EXISTS role_id VARCHAR(50) DEFAULT 'super_admin';
ALTER TABLE platform_admins ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_expired_notified_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_reminder_3d_sent_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_reminder_1d_sent_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS platform_admin_roles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES tenant_subscriptions(id) ON DELETE SET NULL,
  tap_charge_id VARCHAR(100),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'pending',
  billing_cycle VARCHAR(10) DEFAULT 'monthly',
  plan_name VARCHAR(100),
  plan_slug VARCHAR(50),
  customer_email VARCHAR(255),
  invoice_number VARCHAR(50),
  invoice_sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'open',
  subject VARCHAR(255) DEFAULT 'Support request',
  created_by_user_id UUID,
  created_by_name VARCHAR(255),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL,
  sender_id UUID,
  sender_name VARCHAR(255),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_payments_tenant ON platform_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_tenant ON support_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_conversation ON support_messages(conversation_id);

INSERT INTO platform_admin_roles (id, name, permissions) VALUES
  ('super_admin', 'Super Admin', '["*"]'),
  ('support', 'Support', '["platform.tenants.view","platform.support.view","platform.support.reply","platform.payments.view"]'),
  ('billing', 'Billing', '["platform.tenants.view","platform.payments.view","platform.plans.view"]'),
  ('operations', 'Operations', '["platform.tenants.view","platform.tenants.edit","platform.tenants.impersonate","platform.plans.view","platform.plans.edit","platform.payments.view"]')
ON CONFLICT (id) DO NOTHING;

UPDATE platform_admins SET role_id = 'super_admin' WHERE role_id IS NULL;

-- Class scheduling (Sprint 1)
CREATE TABLE IF NOT EXISTS coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  bio TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  location VARCHAR(255),
  capacity INTEGER NOT NULL DEFAULT 20,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  color VARCHAR(20) DEFAULT '#3b82f6',
  recurrence JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES class_templates(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  location VARCHAR(255),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 20,
  booked_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coaches_tenant ON coaches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_class_templates_tenant ON class_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_tenant_starts ON class_sessions(tenant_id, starts_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_class_sessions_template_start
  ON class_sessions(tenant_id, template_id, starts_at)
  WHERE template_id IS NOT NULL;

-- Member portal & bookings (Sprint 2)
CREATE TABLE IF NOT EXISTS tenant_booking_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  booking_window_days INTEGER DEFAULT 7,
  cancellation_hours INTEGER DEFAULT 2,
  allow_waitlist BOOLEAN DEFAULT true,
  auto_promote_waitlist BOOLEAN DEFAULT true,
  portal_enabled BOOLEAN DEFAULT true,
  public_slug VARCHAR(100),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS member_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  password_hash VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, member_id),
  UNIQUE (tenant_id, phone)
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  member_name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled', 'waitlist', 'no_show', 'attended')),
  booked_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  attended_at TIMESTAMPTZ,
  booked_by VARCHAR(20) DEFAULT 'member' CHECK (booked_by IN ('member', 'staff')),
  UNIQUE (session_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_member_accounts_tenant ON member_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_session ON bookings(session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_member ON bookings(tenant_id, member_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_booking_slug ON tenant_booking_settings(public_slug)
  WHERE public_slug IS NOT NULL;

-- Member payments (Sprint 3)
CREATE TABLE IF NOT EXISTS member_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  tap_charge_id VARCHAR(100),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BHD',
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'captured', 'failed', 'refunded')),
  payment_type VARCHAR(20) DEFAULT 'one_time'
    CHECK (payment_type IN ('one_time', 'recurring', 'manual')),
  package_name VARCHAR(255),
  invoice_number VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS member_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  tap_card_id VARCHAR(100),
  tap_customer_id VARCHAR(100),
  last_four VARCHAR(4),
  brand VARCHAR(20),
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_key VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms')),
  subject VARCHAR(255),
  body TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  UNIQUE (tenant_id, event_key, channel)
);

CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  channel VARCHAR(20) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  body TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed')),
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tenant_booking_settings ADD COLUMN IF NOT EXISTS tap_enabled BOOLEAN DEFAULT true;
ALTER TABLE tenant_booking_settings ADD COLUMN IF NOT EXISTS widget_enabled BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_member_payments_tenant ON member_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_member_payments_member ON member_payments(tenant_id, member_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_pending ON notification_queue(status, scheduled_at);

-- Backfill portal slug from tenant slug
INSERT INTO tenant_booking_settings (tenant_id, public_slug, portal_enabled)
SELECT t.id, t.slug, true FROM tenants t
ON CONFLICT (tenant_id) DO NOTHING;

UPDATE tenant_booking_settings bs
SET public_slug = t.slug
FROM tenants t
WHERE bs.tenant_id = t.id AND (bs.public_slug IS NULL OR bs.public_slug = '');

-- Sprint 4: OTP, package rules, payment grace
ALTER TABLE class_templates ADD COLUMN IF NOT EXISTS allowed_package_ids UUID[] DEFAULT '{}';
ALTER TABLE class_templates ADD COLUMN IF NOT EXISTS deduct_session BOOLEAN DEFAULT false;
ALTER TABLE tenant_booking_settings ADD COLUMN IF NOT EXISTS payment_grace_days INTEGER DEFAULT 3;

CREATE TABLE IF NOT EXISTS portal_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone VARCHAR(50) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_otp_lookup ON portal_otp_codes(tenant_id, phone, expires_at);

INSERT INTO roles (tenant_id, id, name, permissions, is_system)
SELECT t.id, 'coach', 'Coach', '["classes.view","bookings.view","attendance.view","attendance.add"]', true
FROM tenants t
ON CONFLICT DO NOTHING;

-- Phase 2: Multi-branch
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches(tenant_id);
ALTER TABLE members ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE class_templates ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- Phase 2: Family accounts
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  primary_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS family_members (
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  relationship VARCHAR(30) DEFAULT 'member',
  PRIMARY KEY (family_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_families_tenant ON families(tenant_id);

-- Phase 2: Demo leads CRM
CREATE TABLE IF NOT EXISTS demo_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_name VARCHAR(255),
  contact_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  message TEXT,
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','converted','lost')),
  source VARCHAR(50) DEFAULT 'landing',
  notes TEXT,
  converted_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_demo_leads_status ON demo_leads(status, created_at);

-- Phase 2: Refund policy
ALTER TABLE tenant_booking_settings ADD COLUMN IF NOT EXISTS allow_refunds BOOLEAN DEFAULT true;
ALTER TABLE tenant_booking_settings ADD COLUMN IF NOT EXISTS refund_window_hours INTEGER DEFAULT 48;

-- Phase 2: Portal branding
ALTER TABLE tenant_booking_settings ADD COLUMN IF NOT EXISTS portal_primary_color VARCHAR(20) DEFAULT '#3b82f6';
ALTER TABLE tenant_booking_settings ADD COLUMN IF NOT EXISTS portal_welcome_message TEXT;

-- Member app directory listing (browse all clubs in Dojo Member app)
ALTER TABLE tenant_booking_settings ADD COLUMN IF NOT EXISTS app_directory_enabled BOOLEAN DEFAULT true;
UPDATE tenant_booking_settings SET app_directory_enabled = true WHERE app_directory_enabled IS NULL;

ALTER TABLE tenant_booking_settings ADD COLUMN IF NOT EXISTS allow_self_registration BOOLEAN DEFAULT true;
UPDATE tenant_booking_settings SET allow_self_registration = true WHERE allow_self_registration IS NULL;

ALTER TABLE member_payments ADD COLUMN IF NOT EXISTS package_amount DECIMAL(10,3);
ALTER TABLE member_payments ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,3) DEFAULT 0;
UPDATE member_payments SET package_amount = amount WHERE package_amount IS NULL;

-- Phase 2: QR check-in
ALTER TABLE members ADD COLUMN IF NOT EXISTS qr_token VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_qr_token ON members(qr_token) WHERE qr_token IS NOT NULL;

-- Phase 2/3: Camps & events
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type VARCHAR(20) DEFAULT 'note'
  CHECK (event_type IN ('note','camp','tournament','workshop'));
ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);
ALTER TABLE events ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  member_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  status VARCHAR(20) DEFAULT 'registered' CHECK (status IN ('registered','cancelled','attended')),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (event_id, member_id)
);

-- Phase 3: Coach commission
CREATE TABLE IF NOT EXISTS coach_commission_rules (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  commission_type VARCHAR(20) DEFAULT 'percent' CHECK (commission_type IN ('percent','flat')),
  rate DECIMAL(10,2) DEFAULT 10,
  apply_to VARCHAR(20) DEFAULT 'sessions' CHECK (apply_to IN ('sessions','payments')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coach_commission_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  source_type VARCHAR(30) NOT NULL,
  source_id UUID,
  description TEXT,
  period_month DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_commission_coach ON coach_commission_entries(tenant_id, coach_id, period_month);

-- Phase 3: Outbound webhooks
CREATE TABLE IF NOT EXISTS tenant_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  secret VARCHAR(100),
  events JSONB DEFAULT '["booking.created","payment.received","member.created"]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenant_webhooks_tenant ON tenant_webhooks(tenant_id);

-- Mobile push tokens (Expo)
CREATE TABLE IF NOT EXISTS push_device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('member', 'staff')),
  user_id UUID,
  member_id UUID,
  expo_push_token VARCHAR(255) NOT NULL,
  platform VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (expo_push_token)
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_member ON push_device_tokens(tenant_id, member_id) WHERE member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_device_tokens(tenant_id, user_id) WHERE user_id IS NOT NULL;

-- Platform-wide settings (push config, etc.)
CREATE TABLE IF NOT EXISTS platform_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin broadcast notifications (web popups + mobile push)
CREATE TABLE IF NOT EXISTS platform_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  link_url VARCHAR(500),
  targets JSONB NOT NULL DEFAULT '[]',
  web_staff_count INTEGER DEFAULT 0,
  mobile_member_sent INTEGER DEFAULT 0,
  mobile_staff_sent INTEGER DEFAULT 0,
  created_by UUID REFERENCES platform_admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_platform_broadcasts_created ON platform_broadcasts(created_at DESC);

-- Web staff users who have seen/dismissed a broadcast popup
CREATE TABLE IF NOT EXISTS web_notification_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES platform_broadcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (broadcast_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_web_notification_receipts_user ON web_notification_receipts(user_id);

-- Explore home promo banners (platform-managed)
CREATE TABLE IF NOT EXISTS platform_promo_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order INT NOT NULL DEFAULT 0,
  image_url TEXT NOT NULL,
  club_type_id VARCHAR(50),
  link_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_platform_promo_banners_sort ON platform_promo_banners(sort_order ASC);
