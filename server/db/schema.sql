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
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
  billing_cycle VARCHAR(10) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
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
