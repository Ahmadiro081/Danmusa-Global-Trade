-- ============================================================================
-- Danmusa Global Trade (DGT) — Initial Foundation Migration (Non-Destructive)
-- Target: Supabase PostgreSQL 15+
-- NOTE: Review and execute via `supabase db push` once Supabase is provisioned.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Helper Trigger Function for updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Reference Data: Currencies & Nigerian States (36 States + FCT)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.currencies (
  code CHAR(3) PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimal_places SMALLINT NOT NULL DEFAULT 2,
  is_base BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.currencies (code, name, symbol, decimal_places, is_base)
VALUES
  ('NGN', 'Nigerian Naira', '₦', 2, TRUE),
  ('CNY', 'Chinese Yuan', '¥', 2, FALSE),
  ('USD', 'US Dollar', '$', 2, FALSE)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.nigerian_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  geopolitical_zone TEXT NOT NULL,
  is_fct BOOLEAN NOT NULL DEFAULT FALSE,
  is_priority_hub BOOLEAN NOT NULL DEFAULT FALSE,
  base_delivery_fee_ngn NUMERIC(14, 2) NOT NULL DEFAULT 0,
  estimated_transit_days SMALLINT NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.nigerian_states (code, name, geopolitical_zone, is_fct, is_priority_hub)
VALUES
  ('NG-AB', 'Abia', 'South East', FALSE, FALSE),
  ('NG-AD', 'Adamawa', 'North East', FALSE, FALSE),
  ('NG-AK', 'Akwa Ibom', 'South South', FALSE, FALSE),
  ('NG-AN', 'Anambra', 'South East', FALSE, FALSE),
  ('NG-BA', 'Bauchi', 'North East', FALSE, FALSE),
  ('NG-BY', 'Bayelsa', 'South South', FALSE, FALSE),
  ('NG-BE', 'Benue', 'North Central', FALSE, FALSE),
  ('NG-BO', 'Borno', 'North East', FALSE, FALSE),
  ('NG-CR', 'Cross River', 'South South', FALSE, FALSE),
  ('NG-DE', 'Delta', 'South South', FALSE, FALSE),
  ('NG-EB', 'Ebonyi', 'South East', FALSE, FALSE),
  ('NG-ED', 'Edo', 'South South', FALSE, FALSE),
  ('NG-EK', 'Ekiti', 'South West', FALSE, FALSE),
  ('NG-EN', 'Enugu', 'South East', FALSE, FALSE),
  ('NG-FC', 'Federal Capital Territory (Abuja)', 'North Central', TRUE, TRUE),
  ('NG-GO', 'Gombe', 'North East', FALSE, FALSE),
  ('NG-IM', 'Imo', 'South East', FALSE, FALSE),
  ('NG-JI', 'Jigawa', 'North West', FALSE, TRUE),
  ('NG-KD', 'Kaduna', 'North West', FALSE, TRUE),
  ('NG-KN', 'Kano', 'North West', FALSE, TRUE),
  ('NG-KT', 'Katsina', 'North West', FALSE, TRUE),
  ('NG-KE', 'Kebbi', 'North West', FALSE, FALSE),
  ('NG-KO', 'Kogi', 'North Central', FALSE, FALSE),
  ('NG-KW', 'Kwara', 'North Central', FALSE, FALSE),
  ('NG-LA', 'Lagos', 'South West', FALSE, TRUE),
  ('NG-NA', 'Nasarawa', 'North Central', FALSE, FALSE),
  ('NG-NI', 'Niger', 'North Central', FALSE, FALSE),
  ('NG-OG', 'Ogun', 'South West', FALSE, FALSE),
  ('NG-ON', 'Ondo', 'South West', FALSE, FALSE),
  ('NG-OS', 'Osun', 'South West', FALSE, FALSE),
  ('NG-OY', 'Oyo', 'South West', FALSE, FALSE),
  ('NG-PL', 'Plateau', 'North Central', FALSE, FALSE),
  ('NG-RI', 'Rivers', 'South South', FALSE, FALSE),
  ('NG-SO', 'Sokoto', 'North West', FALSE, FALSE),
  ('NG-TA', 'Taraba', 'North East', FALSE, FALSE),
  ('NG-YO', 'Yobe', 'North East', FALSE, FALSE),
  ('NG-ZA', 'Zamfara', 'North West', FALSE, FALSE)
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Roles, Permissions, Profiles & Staff Accounts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.roles (slug, name, description, is_system)
VALUES
  ('super_admin', 'Super Administrator', 'Full control over administrative accounts, RBAC policies, and system configuration.', TRUE),
  ('admin', 'Administrator', 'Operational oversight across storefront, orders, sourcing, and staff workflows.', TRUE),
  ('product_manager', 'Product Manager', 'Catalogue, categories, pricing, and product media management.', TRUE),
  ('order_manager', 'Order Manager', 'Order lifecycle processing and fulfillment coordination.', TRUE),
  ('finance_manager', 'Finance Manager', 'Bank transfer verification, Paystack reconciliation, and exchange rates.', TRUE),
  ('sourcing_manager', 'Sourcing Manager', 'Wholesale sourcing investigation, supplier procurement, and quotations.', TRUE),
  ('logistics_manager', 'Logistics Manager', 'China-to-Nigeria international shipments, customs, and Nigerian delivery.', TRUE),
  ('customer_support', 'Customer Support', 'Customer inquiries, order tracking assistance, and dispute escalation.', TRUE),
  ('registered_customer', 'Registered Customer', 'Authenticated customer accessing own orders, quotations, and sourcing requests.', TRUE),
  ('guest_customer', 'Guest Customer', 'Unauthenticated storefront visitor browsing public catalogue.', TRUE)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  domain TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  account_type TEXT NOT NULL DEFAULT 'registered_customer' CHECK (account_type IN ('registered_customer', 'staff')),
  default_state_id UUID REFERENCES public.nigerian_states(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.staff_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id),
  department TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  appointed_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  state_id UUID NOT NULL REFERENCES public.nigerian_states(id),
  city TEXT NOT NULL,
  street_line TEXT NOT NULL,
  landmark TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. Multi-Currency Exchange Rates & System Settings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency CHAR(3) NOT NULL REFERENCES public.currencies(code),
  to_currency CHAR(3) NOT NULL REFERENCES public.currencies(code),
  rate NUMERIC(18, 6) NOT NULL CHECK (rate > 0),
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  set_by UUID REFERENCES public.user_profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by UUID REFERENCES public.user_profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. Catalogue, Warehouses & Inventory
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.categories(id),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  fulfillment_mode TEXT NOT NULL CHECK (fulfillment_mode IN ('ready_stock', 'pre_order')),
  base_currency CHAR(3) NOT NULL DEFAULT 'NGN' REFERENCES public.currencies(code),
  base_price NUMERIC(16, 2) NOT NULL CHECK (base_price >= 0),
  estimated_weight_kg NUMERIC(10, 3),
  estimated_volume_cbm NUMERIC(10, 4),
  shipping_method TEXT NOT NULL DEFAULT 'weight_based'
    CHECK (shipping_method IN ('weight_based', 'volume_based', 'product_based', 'custom_quotation')),
  moq INTEGER NOT NULL DEFAULT 1 CHECK (moq >= 1),
  description TEXT NOT NULL,
  specs_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  cloudinary_public_id TEXT,
  url TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  country TEXT NOT NULL CHECK (country IN ('China', 'Nigeria')),
  city TEXT NOT NULL,
  state_id UUID REFERENCES public.nigerian_states(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  quantity_reserved INTEGER NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
  reorder_point INTEGER NOT NULL DEFAULT 0 CHECK (reorder_point >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, warehouse_id)
);

-- ----------------------------------------------------------------------------
-- 6. Shopping Cart, Wholesale Sourcing, Quotations & Orders
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shopping_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID UNIQUE NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.shopping_carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cart_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.wholesale_sourcing_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.user_profiles(id),
  product_title TEXT NOT NULL,
  category_name TEXT NOT NULL,
  description TEXT NOT NULL,
  target_quantity INTEGER NOT NULL CHECK (target_quantity > 0),
  target_budget_ngn NUMERIC(16, 2),
  reference_image_url TEXT,
  cloudinary_public_id TEXT,
  destination_state_id UUID REFERENCES public.nigerian_states(id),
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'under_review', 'supplier_investigation', 'quoted', 'accepted', 'declined', 'cancelled')),
  assigned_sourcing_manager_id UUID REFERENCES public.staff_accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.user_profiles(id),
  sourcing_request_id UUID REFERENCES public.wholesale_sourcing_requests(id),
  product_id UUID REFERENCES public.products(id),
  supplier_cost_cny NUMERIC(16, 2) NOT NULL CHECK (supplier_cost_cny >= 0),
  exchange_rate_cny_ngn NUMERIC(18, 6) NOT NULL CHECK (exchange_rate_cny_ngn > 0),
  shipping_method TEXT NOT NULL
    CHECK (shipping_method IN ('weight_based', 'volume_based', 'product_based', 'custom_quotation')),
  shipping_fee_usd NUMERIC(16, 2) NOT NULL DEFAULT 0 CHECK (shipping_fee_usd >= 0),
  exchange_rate_usd_ngn NUMERIC(18, 6) NOT NULL CHECK (exchange_rate_usd_ngn > 0),
  service_margin_ngn NUMERIC(16, 2) NOT NULL DEFAULT 0,
  total_payable_ngn NUMERIC(16, 2) NOT NULL CHECK (total_payable_ngn >= 0),
  valid_until TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired')),
  created_by UUID REFERENCES public.staff_accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.user_profiles(id),
  order_type TEXT NOT NULL CHECK (order_type IN ('ready_stock', 'pre_order', 'wholesale_sourcing')),
  quotation_id UUID REFERENCES public.quotations(id),
  shipping_address_snapshot JSONB NOT NULL,
  destination_state_id UUID NOT NULL REFERENCES public.nigerian_states(id),
  currency_code CHAR(3) NOT NULL DEFAULT 'NGN' REFERENCES public.currencies(code),
  exchange_rate_snapshot NUMERIC(18, 6) NOT NULL DEFAULT 1,
  subtotal_ngn NUMERIC(16, 2) NOT NULL CHECK (subtotal_ngn >= 0),
  shipping_fee_ngn NUMERIC(16, 2) NOT NULL DEFAULT 0 CHECK (shipping_fee_ngn >= 0),
  total_ngn NUMERIC(16, 2) NOT NULL CHECK (total_ngn >= 0),
  order_status TEXT NOT NULL DEFAULT 'pending_payment',
  payment_status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (payment_status IN ('Pending', 'Awaiting Verification', 'Partially Paid', 'Paid', 'Failed', 'Rejected', 'Refunded', 'Cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  item_title TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_currency CHAR(3) NOT NULL REFERENCES public.currencies(code),
  unit_price_amount NUMERIC(16, 2) NOT NULL CHECK (unit_price_amount >= 0),
  exchange_rate_to_ngn NUMERIC(18, 6) NOT NULL CHECK (exchange_rate_to_ngn > 0),
  line_total_ngn NUMERIC(16, 2) NOT NULL CHECK (line_total_ngn >= 0)
);

-- ----------------------------------------------------------------------------
-- 7. Suppliers, Procurement, Shipments & Nigerian Delivery
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city_china TEXT NOT NULL,
  province_china TEXT NOT NULL,
  specialty TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'suspended')),
  contact_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.procurement_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procurement_number TEXT UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  cost_cny NUMERIC(16, 2) NOT NULL CHECK (cost_cny >= 0),
  exchange_rate_cny_ngn NUMERIC(18, 6) NOT NULL CHECK (exchange_rate_cny_ngn > 0),
  cost_ngn_snapshot NUMERIC(16, 2) NOT NULL CHECK (cost_ngn_snapshot >= 0),
  status TEXT NOT NULL DEFAULT 'initiated',
  managed_by UUID REFERENCES public.staff_accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.logistics_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  coverage_scope TEXT NOT NULL,
  contact_placeholder TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number TEXT UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  shipping_method TEXT NOT NULL
    CHECK (shipping_method IN ('weight_based', 'volume_based', 'product_based', 'custom_quotation')),
  origin_warehouse_id UUID REFERENCES public.warehouses(id),
  destination_warehouse_id UUID REFERENCES public.warehouses(id),
  logistics_partner_id UUID REFERENCES public.logistics_partners(id),
  current_stage TEXT NOT NULL DEFAULT 'procurement_in_china'
    CHECK (current_stage IN (
      'procurement_in_china',
      'received_at_china_warehouse',
      'preparing_for_shipment',
      'shipped_from_china',
      'in_transit',
      'arrived_in_nigeria',
      'customs_clearance',
      'released_from_customs',
      'received_at_nigeria_warehouse',
      'ready_for_local_delivery'
    )),
  estimated_arrival_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shipment_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  stage_code TEXT NOT NULL,
  stage_label TEXT NOT NULL,
  location_note TEXT,
  recorded_by UUID REFERENCES public.staff_accounts(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 8. Payments, Notifications & Immutable Audit Logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_reference TEXT UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  customer_id UUID NOT NULL REFERENCES public.user_profiles(id),
  method TEXT NOT NULL CHECK (method IN ('paystack', 'bank_transfer')),
  status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Awaiting Verification', 'Partially Paid', 'Paid', 'Failed', 'Rejected', 'Refunded', 'Cancelled')),
  currency_code CHAR(3) NOT NULL DEFAULT 'NGN' REFERENCES public.currencies(code),
  amount NUMERIC(16, 2) NOT NULL CHECK (amount > 0),
  exchange_rate_to_ngn NUMERIC(18, 6) NOT NULL DEFAULT 1,
  converted_amount_ngn NUMERIC(16, 2) NOT NULL CHECK (converted_amount_ngn > 0),
  gateway_reference TEXT,
  bank_transfer_proof_url TEXT,
  verified_by UUID REFERENCES public.staff_accounts(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'whatsapp')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES public.user_profiles(id),
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_table TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_snapshot JSONB,
  after_snapshot JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 9. Critical Performance Indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_category_mode ON public.products (category_id, fulfillment_mode, is_active);
CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON public.orders (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (order_status, payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_order_status ON public.payments (order_id, status);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON public.shipments (tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_order ON public.shipments (order_id);
CREATE INDEX IF NOT EXISTS idx_sourcing_customer_status ON public.wholesale_sourcing_requests (customer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_time ON public.audit_logs (entity_table, entity_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 10. Security Helper Functions & Row Level Security (RLS)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_staff_role(allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_accounts sa
    JOIN public.roles r ON r.id = sa.role_id
    WHERE sa.user_id = auth.uid()
      AND sa.is_active = TRUE
      AND r.slug = ANY(allowed_roles)
  );
$$;

-- Enable RLS across all operational tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesale_sourcing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Public catalogue read policies
CREATE POLICY "Public read active categories" ON public.categories
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Public read active products" ON public.products
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Public read product media" ON public.product_media
  FOR SELECT USING (TRUE);

-- Customer isolation policies
CREATE POLICY "Customers manage own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id OR public.has_staff_role(ARRAY['super_admin', 'admin', 'customer_support']));

CREATE POLICY "Customers manage own addresses" ON public.customer_addresses
  FOR ALL USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers manage own cart" ON public.shopping_carts
  FOR ALL USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers view own orders" ON public.orders
  FOR SELECT USING (
    auth.uid() = customer_id
    OR public.has_staff_role(ARRAY['super_admin', 'admin', 'order_manager', 'finance_manager', 'logistics_manager', 'customer_support'])
  );

CREATE POLICY "Customers view own sourcing requests" ON public.wholesale_sourcing_requests
  FOR SELECT USING (
    auth.uid() = customer_id
    OR public.has_staff_role(ARRAY['super_admin', 'admin', 'sourcing_manager', 'customer_support'])
  );

CREATE POLICY "Customers create own sourcing requests" ON public.wholesale_sourcing_requests
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers view own quotations" ON public.quotations
  FOR SELECT USING (
    auth.uid() = customer_id
    OR public.has_staff_role(ARRAY['super_admin', 'admin', 'sourcing_manager', 'finance_manager'])
  );

CREATE POLICY "Customers view own payments" ON public.payments
  FOR SELECT USING (
    auth.uid() = customer_id
    OR public.has_staff_role(ARRAY['super_admin', 'admin', 'finance_manager'])
  );

CREATE POLICY "Customers view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Strict administrative governance
CREATE POLICY "Super admin manages staff accounts" ON public.staff_accounts
  FOR ALL USING (public.has_staff_role(ARRAY['super_admin']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin']));

CREATE POLICY "Audit logs read by super admin and admin only" ON public.audit_logs
  FOR SELECT USING (public.has_staff_role(ARRAY['super_admin', 'admin']));
