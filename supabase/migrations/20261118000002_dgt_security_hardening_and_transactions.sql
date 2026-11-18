-- ============================================================================
-- Danmusa Global Trade (DGT) — Stage 2 Security Hardening & Transactions
-- Target: Supabase PostgreSQL 15+
-- Non-Destructive Forward Migration (Additive & Hardening Only)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Harden Helper Trigger & RBAC Functions (Pinned search_path)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_staff_role(allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_accounts sa
    JOIN public.user_profiles up ON up.id = sa.user_id
    JOIN public.roles r ON r.id = sa.role_id
    WHERE sa.user_id = auth.uid()
      AND sa.is_active = TRUE
      AND up.account_type = 'staff'
      AND r.slug = ANY(allowed_roles)
  );
$$;

REVOKE ALL ON FUNCTION public.has_staff_role(TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_staff_role(TEXT[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_permission(perm_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_accounts sa
    JOIN public.user_profiles up ON up.id = sa.user_id
    JOIN public.roles r ON r.id = sa.role_id
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE sa.user_id = auth.uid()
      AND sa.is_active = TRUE
      AND up.account_type = 'staff'
      AND (r.slug = 'super_admin' OR p.code = perm_code)
  );
$$;

REVOKE ALL ON FUNCTION public.has_permission(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_permission(TEXT) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. Seed Granular RBAC Permissions & Role-Permission Mappings
-- ----------------------------------------------------------------------------
INSERT INTO public.permissions (code, domain, description)
VALUES
  ('products.manage', 'catalogue', 'Create and update products, categories, and media'),
  ('inventory.manage', 'inventory', 'Manage warehouse stock balances and reorder points'),
  ('orders.view_all', 'orders', 'View all customer orders'),
  ('orders.manage', 'orders', 'Process order fulfillment statuses'),
  ('payments.verify', 'finance', 'Verify or reject customer bank transfer proofs'),
  ('exchange_rates.manage', 'finance', 'Update NGN/CNY/USD active exchange rates'),
  ('expenses.manage', 'finance', 'Record and audit trade and shipping expenses'),
  ('sourcing.manage', 'sourcing', 'Investigate wholesale sourcing requests and suppliers'),
  ('quotations.manage', 'sourcing', 'Create and send formal customer quotations'),
  ('procurement.manage', 'procurement', 'Create supplier procurement orders in CNY'),
  ('shipments.manage', 'logistics', 'Advance 10-stage international shipment milestones'),
  ('deliveries.manage', 'logistics', 'Configure Nigerian state fees and complete deliveries'),
  ('customers.support', 'support', 'Assist customers with orders and tracking'),
  ('staff.manage', 'rbac', 'Create and manage staff accounts and role assignments'),
  ('audit_logs.read', 'security', 'Read immutable system audit logs'),
  ('settings.manage', 'system', 'Modify system configuration')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON (
  r.slug = 'super_admin'
  OR (r.slug = 'admin' AND p.code <> 'staff.manage')
  OR (r.slug = 'product_manager' AND p.code IN ('products.manage', 'inventory.manage'))
  OR (r.slug = 'order_manager' AND p.code IN ('orders.view_all', 'orders.manage', 'deliveries.manage'))
  OR (r.slug = 'finance_manager' AND p.code IN ('orders.view_all', 'payments.verify', 'exchange_rates.manage', 'expenses.manage'))
  OR (r.slug = 'sourcing_manager' AND p.code IN ('sourcing.manage', 'quotations.manage', 'procurement.manage'))
  OR (r.slug = 'logistics_manager' AND p.code IN ('orders.view_all', 'inventory.manage', 'shipments.manage', 'deliveries.manage'))
  OR (r.slug = 'customer_support' AND p.code IN ('orders.view_all', 'customers.support'))
)
ON CONFLICT DO NOTHING;

-- Update finance_manager description cleanly (Paystack postponed)
UPDATE public.roles
SET description = 'Bank transfer verification, payment ledger reconciliation, expenses, and exchange rates.'
WHERE slug = 'finance_manager';

-- ----------------------------------------------------------------------------
-- 3. Signup Integrity & Anti-Privilege-Escalation Triggers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_full_name TEXT;
  v_phone TEXT;
BEGIN
  v_full_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1));
  v_phone := NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '');

  -- Hardcode account_type = 'registered_customer'. Never accept staff/admin role from signup metadata.
  INSERT INTO public.user_profiles (id, full_name, email, phone, account_type)
  VALUES (NEW.id, v_full_name, NEW.email, v_phone, 'registered_customer')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_auth_user();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_user_profile_privilege_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (NEW.account_type IS DISTINCT FROM OLD.account_type OR NEW.id IS DISTINCT FROM OLD.id)
     AND auth.role() <> 'service_role'
     AND NOT public.has_staff_role(ARRAY['super_admin']) THEN
    RAISE EXCEPTION 'Forbidden: cannot self-modify account_type or identity columns';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_user_profile_privileges ON public.user_profiles;
CREATE TRIGGER trg_protect_user_profile_privileges
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_profile_privilege_columns();

CREATE OR REPLACE FUNCTION public.protect_super_admin_floor()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_super_admin_role_id UUID;
  v_remaining_count INTEGER;
BEGIN
  SELECT id INTO v_super_admin_role_id FROM public.roles WHERE slug = 'super_admin';

  IF TG_OP = 'DELETE' THEN
    IF OLD.role_id = v_super_admin_role_id AND OLD.is_active = TRUE THEN
      SELECT COUNT(*) INTO v_remaining_count
      FROM public.staff_accounts
      WHERE role_id = v_super_admin_role_id AND is_active = TRUE AND id <> OLD.id;
      IF v_remaining_count = 0 THEN
        RAISE EXCEPTION 'Cannot remove the last active Super Administrator';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.role_id = v_super_admin_role_id AND OLD.is_active = TRUE
       AND (NEW.is_active = FALSE OR NEW.role_id <> v_super_admin_role_id) THEN
      SELECT COUNT(*) INTO v_remaining_count
      FROM public.staff_accounts
      WHERE role_id = v_super_admin_role_id AND is_active = TRUE AND id <> OLD.id;
      IF v_remaining_count = 0 THEN
        RAISE EXCEPTION 'Cannot deactivate or demote the last active Super Administrator';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_super_admin_floor ON public.staff_accounts;
CREATE TRIGGER trg_protect_super_admin_floor
  BEFORE UPDATE OR DELETE ON public.staff_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_super_admin_floor();

-- ----------------------------------------------------------------------------
-- 4. Inventory Concurrency Constraint & Financial/Audit Hardening
-- ----------------------------------------------------------------------------
ALTER TABLE public.inventory_balances
  DROP CONSTRAINT IF EXISTS chk_inventory_no_oversell;
ALTER TABLE public.inventory_balances
  ADD CONSTRAINT chk_inventory_no_oversell CHECK (quantity_reserved <= quantity_on_hand);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS amount_paid_ngn NUMERIC(16, 2) NOT NULL DEFAULT 0 CHECK (amount_paid_ngn >= 0),
  ADD COLUMN IF NOT EXISTS outstanding_balance_ngn NUMERIC(16, 2) NOT NULL DEFAULT 0 CHECK (outstanding_balance_ngn >= 0),
  ADD COLUMN IF NOT EXISTS allow_partial_payment BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS bank_reference_number TEXT,
  ADD COLUMN IF NOT EXISTS sender_bank_name TEXT,
  ADD COLUMN IF NOT EXISTS sender_account_name TEXT,
  ADD COLUMN IF NOT EXISTS transfer_date DATE,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Prevent duplicate bank transfer submissions with the same bank reference for an order
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique_bank_ref
  ON public.payments (order_id, bank_reference_number)
  WHERE bank_reference_number IS NOT NULL AND status NOT IN ('Rejected', 'Failed', 'Cancelled');

CREATE TABLE IF NOT EXISTS public.payment_evidences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.user_profiles(id),
  storage_bucket TEXT NOT NULL DEFAULT 'dgt-payment-evidence',
  storage_object_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_number TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('china_procurement', 'international_freight', 'customs_duty', 'local_delivery', 'warehouse_ops', 'other')),
  description TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  shipment_id UUID REFERENCES public.shipments(id),
  currency_code CHAR(3) NOT NULL REFERENCES public.currencies(code),
  amount NUMERIC(16, 2) NOT NULL CHECK (amount > 0),
  exchange_rate_to_ngn NUMERIC(18, 6) NOT NULL CHECK (exchange_rate_to_ngn > 0),
  converted_amount_ngn NUMERIC(16, 2) NOT NULL CHECK (converted_amount_ngn > 0),
  incurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID REFERENCES public.staff_accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_evidences_payment ON public.payment_evidences (payment_id);
CREATE INDEX IF NOT EXISTS idx_expenses_order_shipment ON public.expenses (order_id, shipment_id, incurred_at DESC);

-- Financial snapshot immutability triggers
CREATE OR REPLACE FUNCTION public.protect_order_snapshot_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.payment_status IN ('Paid', 'Partially Paid') AND (
    NEW.currency_code IS DISTINCT FROM OLD.currency_code
    OR NEW.exchange_rate_snapshot IS DISTINCT FROM OLD.exchange_rate_snapshot
    OR NEW.subtotal_ngn IS DISTINCT FROM OLD.subtotal_ngn
    OR NEW.shipping_fee_ngn IS DISTINCT FROM OLD.shipping_fee_ngn
    OR NEW.total_ngn IS DISTINCT FROM OLD.total_ngn
  ) THEN
    RAISE EXCEPTION 'Historical order financial totals and exchange-rate snapshots are immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_order_immutability ON public.orders;
CREATE TRIGGER trg_protect_order_immutability
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_order_snapshot_immutability();

-- Immutable Audit Logs Enforcement
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are strictly append-only and cannot be modified or deleted';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_mutation();

REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM anon, authenticated;

-- Attach updated_at triggers
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'nigerian_states', 'user_profiles', 'staff_accounts', 'customer_addresses',
    'categories', 'products', 'inventory_balances', 'shopping_carts',
    'wholesale_sourcing_requests', 'quotations', 'orders', 'suppliers',
    'procurement_orders', 'shipments', 'payments'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();', t, t);
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Complete RLS Enablement & Policy Hardening Across ALL Public Tables
-- ----------------------------------------------------------------------------
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nigerian_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Reference & RBAC policies
DROP POLICY IF EXISTS "Authenticated read roles" ON public.roles;
CREATE POLICY "Authenticated read roles" ON public.roles
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Authenticated read permissions" ON public.permissions;
CREATE POLICY "Authenticated read permissions" ON public.permissions
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Authenticated read role permissions" ON public.role_permissions;
CREATE POLICY "Authenticated read role permissions" ON public.role_permissions
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Public read currencies" ON public.currencies;
CREATE POLICY "Public read currencies" ON public.currencies
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public read active exchange rates" ON public.exchange_rates;
CREATE POLICY "Public read active exchange rates" ON public.exchange_rates
  FOR SELECT USING (is_active = TRUE OR public.has_staff_role(ARRAY['super_admin', 'admin', 'finance_manager']));

DROP POLICY IF EXISTS "Finance manages exchange rates" ON public.exchange_rates;
CREATE POLICY "Finance manages exchange rates" ON public.exchange_rates
  FOR INSERT WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'finance_manager']));

DROP POLICY IF EXISTS "Public read nigerian states" ON public.nigerian_states;
CREATE POLICY "Public read nigerian states" ON public.nigerian_states
  FOR SELECT USING (is_active = TRUE OR public.has_staff_role(ARRAY['super_admin', 'admin', 'logistics_manager']));

DROP POLICY IF EXISTS "Logistics manages nigerian states" ON public.nigerian_states;
CREATE POLICY "Logistics manages nigerian states" ON public.nigerian_states
  FOR UPDATE USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'logistics_manager']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'logistics_manager']));

DROP POLICY IF EXISTS "Staff read warehouses" ON public.warehouses;
CREATE POLICY "Staff read warehouses" ON public.warehouses
  FOR SELECT USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'product_manager', 'logistics_manager', 'sourcing_manager']));

DROP POLICY IF EXISTS "Staff read logistics partners" ON public.logistics_partners;
CREATE POLICY "Staff read logistics partners" ON public.logistics_partners
  FOR SELECT USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'logistics_manager']));

DROP POLICY IF EXISTS "Super admin manages system settings" ON public.system_settings;
CREATE POLICY "Super admin manages system settings" ON public.system_settings
  FOR ALL USING (public.has_staff_role(ARRAY['super_admin']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin']));

-- User Profiles update policy (trigger prevents changing account_type)
DROP POLICY IF EXISTS "Users update own profile" ON public.user_profiles;
CREATE POLICY "Users update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Cart Items isolated to cart owner
DROP POLICY IF EXISTS "Customers manage own cart items" ON public.cart_items;
CREATE POLICY "Customers manage own cart items" ON public.cart_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.shopping_carts sc
      WHERE sc.id = cart_id AND sc.customer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shopping_carts sc
      WHERE sc.id = cart_id AND sc.customer_id = auth.uid()
    )
  );

-- Catalogue & Inventory management policies
DROP POLICY IF EXISTS "Product managers manage categories" ON public.categories;
CREATE POLICY "Product managers manage categories" ON public.categories
  FOR ALL USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'product_manager']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'product_manager']));

DROP POLICY IF EXISTS "Product managers manage products" ON public.products;
CREATE POLICY "Product managers manage products" ON public.products
  FOR ALL USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'product_manager']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'product_manager']));

DROP POLICY IF EXISTS "Product managers manage product media" ON public.product_media;
CREATE POLICY "Product managers manage product media" ON public.product_media
  FOR ALL USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'product_manager']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'product_manager']));

DROP POLICY IF EXISTS "Staff manage inventory balances" ON public.inventory_balances;
CREATE POLICY "Staff manage inventory balances" ON public.inventory_balances
  FOR ALL USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'product_manager', 'logistics_manager']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'product_manager', 'logistics_manager']));

-- Order Items isolated to order owner or authorized staff
DROP POLICY IF EXISTS "Customers and staff read order items" ON public.order_items;
CREATE POLICY "Customers and staff read order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.customer_id = auth.uid()
    )
    OR public.has_staff_role(ARRAY['super_admin', 'admin', 'order_manager', 'finance_manager', 'logistics_manager', 'customer_support'])
  );

-- Shipments & Milestones isolated to order owner or logistics/support staff
DROP POLICY IF EXISTS "Customers and staff view shipments" ON public.shipments;
CREATE POLICY "Customers and staff view shipments" ON public.shipments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.customer_id = auth.uid()
    )
    OR public.has_staff_role(ARRAY['super_admin', 'admin', 'logistics_manager', 'order_manager', 'customer_support'])
  );

DROP POLICY IF EXISTS "Logistics manages shipments" ON public.shipments;
CREATE POLICY "Logistics manages shipments" ON public.shipments
  FOR ALL USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'logistics_manager']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'logistics_manager']));

DROP POLICY IF EXISTS "Customers and staff view shipment milestones" ON public.shipment_milestones;
CREATE POLICY "Customers and staff view shipment milestones" ON public.shipment_milestones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      JOIN public.orders o ON o.id = s.order_id
      WHERE s.id = shipment_id AND o.customer_id = auth.uid()
    )
    OR public.has_staff_role(ARRAY['super_admin', 'admin', 'logistics_manager', 'order_manager', 'customer_support'])
  );

-- Suppliers & Procurement strictly internal to authorized staff
DROP POLICY IF EXISTS "Sourcing and admin manage suppliers" ON public.suppliers;
CREATE POLICY "Sourcing and admin manage suppliers" ON public.suppliers
  FOR ALL USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'sourcing_manager']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'sourcing_manager']));

DROP POLICY IF EXISTS "Sourcing and finance view procurement" ON public.procurement_orders;
CREATE POLICY "Sourcing and finance view procurement" ON public.procurement_orders
  FOR SELECT USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'sourcing_manager', 'finance_manager']));

-- Payment Evidences strictly isolated to owner and finance staff (NEVER public)
DROP POLICY IF EXISTS "Customers view own payment evidences" ON public.payment_evidences;
CREATE POLICY "Customers view own payment evidences" ON public.payment_evidences
  FOR SELECT USING (
    auth.uid() = customer_id
    OR public.has_staff_role(ARRAY['super_admin', 'admin', 'finance_manager'])
  );

-- Expenses strictly Finance Manager / Admin / Super Admin
DROP POLICY IF EXISTS "Finance manages expenses" ON public.expenses;
CREATE POLICY "Finance manages expenses" ON public.expenses
  FOR ALL USING (public.has_staff_role(ARRAY['super_admin', 'admin', 'finance_manager']))
  WITH CHECK (public.has_staff_role(ARRAY['super_admin', 'admin', 'finance_manager']));

-- Notifications update own read flag
DROP POLICY IF EXISTS "Customers mark own notifications read" ON public.notifications;
CREATE POLICY "Customers mark own notifications read" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 6. Private Storage Bucket for Payment Evidence (Supabase Storage)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'dgt-payment-evidence',
      'dgt-payment-evidence',
      FALSE,
      10485760,
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    )
    ON CONFLICT (id) DO UPDATE SET public = FALSE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    DROP POLICY IF EXISTS "Customers upload own payment evidence" ON storage.objects;
    CREATE POLICY "Customers upload own payment evidence" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'dgt-payment-evidence'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    DROP POLICY IF EXISTS "Owners and finance view payment evidence" ON storage.objects;
    CREATE POLICY "Owners and finance view payment evidence" ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'dgt-payment-evidence'
        AND (
          (storage.foldername(name))[1] = auth.uid()::text
          OR public.has_staff_role(ARRAY['super_admin', 'admin', 'finance_manager'])
        )
      );
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. Atomic PostgreSQL Transaction Functions (All 8 Core Workflows)
-- ----------------------------------------------------------------------------

-- 7.1 Ready-stock inventory reservation helper
CREATE OR REPLACE FUNCTION public.rpc_reserve_ready_stock_inventory(
  p_items JSONB,
  p_warehouse_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item RECORD;
  v_balance RECORD;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order items array must be non-empty';
  END IF;

  -- Lock in deterministic product_id order to prevent deadlocks
  FOR v_item IN
    SELECT
      (elem->>'product_id')::UUID AS product_id,
      SUM((elem->>'quantity')::INTEGER)::INTEGER AS quantity
    FROM jsonb_array_elements(p_items) AS elem
    GROUP BY (elem->>'product_id')::UUID
    ORDER BY (elem->>'product_id')::UUID
  LOOP
    IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity for product %', v_item.product_id;
    END IF;

    SELECT * INTO v_balance
    FROM public.inventory_balances
    WHERE product_id = v_item.product_id
      AND warehouse_id = p_warehouse_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Inventory record not found for product % in warehouse %', v_item.product_id, p_warehouse_id;
    END IF;

    IF (v_balance.quantity_on_hand - v_balance.quantity_reserved) < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient ready-stock for product % (available: %, requested: %)',
        v_item.product_id,
        (v_balance.quantity_on_hand - v_balance.quantity_reserved),
        v_item.quantity;
    END IF;

    UPDATE public.inventory_balances
    SET quantity_reserved = quantity_reserved + v_item.quantity
    WHERE id = v_balance.id;
  END LOOP;
END;
$$;

-- 7.2 Ready-stock order creation + reservation + bank transfer payment initialization
CREATE OR REPLACE FUNCTION public.rpc_create_ready_stock_order(
  p_customer_id UUID,
  p_address_id UUID,
  p_warehouse_id UUID,
  p_items JSONB,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing_order RECORD;
  v_address RECORD;
  v_state RECORD;
  v_item RECORD;
  v_product RECORD;
  v_subtotal_ngn NUMERIC(16, 2) := 0;
  v_shipping_ngn NUMERIC(16, 2) := 0;
  v_total_ngn NUMERIC(16, 2) := 0;
  v_order_id UUID;
  v_order_number TEXT;
  v_payment_ref TEXT;
  v_payment_id UUID;
  v_rate_to_ngn NUMERIC(18, 6);
  v_unit_ngn NUMERIC(16, 2);
BEGIN
  IF p_idempotency_key IS NULL OR LENGTH(TRIM(p_idempotency_key)) < 8 THEN
    RAISE EXCEPTION 'Valid idempotency_key is required';
  END IF;

  -- Idempotency guard
  SELECT id, order_number, total_ngn INTO v_existing_order
  FROM public.orders
  WHERE idempotency_key = p_idempotency_key AND customer_id = p_customer_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'idempotent_replay', TRUE,
      'order_id', v_existing_order.id,
      'order_number', v_existing_order.order_number,
      'total_ngn', v_existing_order.total_ngn
    );
  END IF;

  -- Verify customer owns address
  SELECT * INTO v_address
  FROM public.customer_addresses
  WHERE id = p_address_id AND customer_id = p_customer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery address not found for customer';
  END IF;

  SELECT * INTO v_state
  FROM public.nigerian_states
  WHERE id = v_address.state_id AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Destination Nigerian state is inactive or invalid';
  END IF;

  -- Atomic stock lock & reservation
  PERFORM public.rpc_reserve_ready_stock_inventory(p_items, p_warehouse_id);

  -- Compute authoritative totals strictly from database products (never trust browser prices)
  FOR v_item IN
    SELECT
      (elem->>'product_id')::UUID AS product_id,
      SUM((elem->>'quantity')::INTEGER)::INTEGER AS quantity
    FROM jsonb_array_elements(p_items) AS elem
    GROUP BY (elem->>'product_id')::UUID
  LOOP
    SELECT * INTO v_product
    FROM public.products
    WHERE id = v_item.product_id AND is_active = TRUE AND fulfillment_mode = 'ready_stock';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ready-stock product % not available', v_item.product_id;
    END IF;

    IF v_product.base_currency = 'NGN' THEN
      v_rate_to_ngn := 1;
    ELSE
      SELECT rate INTO v_rate_to_ngn
      FROM public.exchange_rates
      WHERE from_currency = v_product.base_currency AND to_currency = 'NGN' AND is_active = TRUE
      ORDER BY effective_from DESC LIMIT 1;

      IF v_rate_to_ngn IS NULL THEN
        RAISE EXCEPTION 'No active NGN exchange rate configured for %', v_product.base_currency;
      END IF;
    END IF;

    v_unit_ngn := ROUND(v_product.base_price * v_rate_to_ngn, 2);
    v_subtotal_ngn := v_subtotal_ngn + (v_unit_ngn * v_item.quantity);
  END LOOP;

  v_shipping_ngn := v_state.base_delivery_fee_ngn;
  v_total_ngn := v_subtotal_ngn + v_shipping_ngn;
  v_order_number := 'DGT-ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));
  v_payment_ref := 'DGT-PAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8));

  INSERT INTO public.orders (
    order_number, customer_id, order_type, shipping_address_snapshot,
    destination_state_id, currency_code, exchange_rate_snapshot,
    subtotal_ngn, shipping_fee_ngn, total_ngn,
    amount_paid_ngn, outstanding_balance_ngn, allow_partial_payment,
    order_status, payment_status, idempotency_key
  )
  VALUES (
    v_order_number, p_customer_id, 'ready_stock',
    jsonb_build_object(
      'label', v_address.label,
      'recipient_name', v_address.recipient_name,
      'phone', v_address.phone,
      'state_name', v_state.name,
      'city', v_address.city,
      'street_line', v_address.street_line,
      'landmark', v_address.landmark
    ),
    v_state.id, 'NGN', 1,
    v_subtotal_ngn, v_shipping_ngn, v_total_ngn,
    0, v_total_ngn, FALSE,
    'pending_payment', 'Pending', p_idempotency_key
  )
  RETURNING id INTO v_order_id;

  -- Insert order_items snapshots
  FOR v_item IN
    SELECT
      (elem->>'product_id')::UUID AS product_id,
      SUM((elem->>'quantity')::INTEGER)::INTEGER AS quantity
    FROM jsonb_array_elements(p_items) AS elem
    GROUP BY (elem->>'product_id')::UUID
  LOOP
    SELECT * INTO v_product FROM public.products WHERE id = v_item.product_id;
    IF v_product.base_currency = 'NGN' THEN
      v_rate_to_ngn := 1;
    ELSE
      SELECT rate INTO v_rate_to_ngn
      FROM public.exchange_rates
      WHERE from_currency = v_product.base_currency AND to_currency = 'NGN' AND is_active = TRUE
      ORDER BY effective_from DESC LIMIT 1;
    END IF;

    INSERT INTO public.order_items (
      order_id, product_id, item_title, sku, quantity,
      unit_price_currency, unit_price_amount, exchange_rate_to_ngn, line_total_ngn
    )
    VALUES (
      v_order_id, v_product.id, v_product.name, v_product.sku, v_item.quantity,
      v_product.base_currency, v_product.base_price, v_rate_to_ngn,
      ROUND(v_product.base_price * v_rate_to_ngn, 2) * v_item.quantity
    );
  END LOOP;

  -- Initialize pending bank transfer payment instruction record
  INSERT INTO public.payments (
    payment_reference, order_id, customer_id, method, status,
    currency_code, amount, exchange_rate_to_ngn, converted_amount_ngn,
    idempotency_key
  )
  VALUES (
    v_payment_ref, v_order_id, p_customer_id, 'bank_transfer', 'Pending',
    'NGN', v_total_ngn, 1, v_total_ngn,
    'init-' || p_idempotency_key
  )
  RETURNING id INTO v_payment_id;

  INSERT INTO public.audit_logs (actor_user_id, actor_role, action, entity_table, entity_id, after_snapshot)
  VALUES (
    p_customer_id, 'registered_customer', 'ORDER_CREATED', 'orders', v_order_id::TEXT,
    jsonb_build_object('order_number', v_order_number, 'total_ngn', v_total_ngn, 'payment_reference', v_payment_ref)
  );

  RETURN jsonb_build_object(
    'idempotent_replay', FALSE,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'payment_id', v_payment_id,
    'payment_reference', v_payment_ref,
    'total_ngn', v_total_ngn,
    'outstanding_balance_ngn', v_total_ngn
  );
END;
$$;

-- 7.3 Bank transfer submission with private evidence record
CREATE OR REPLACE FUNCTION public.rpc_submit_bank_transfer_evidence(
  p_customer_id UUID,
  p_order_id UUID,
  p_amount_ngn NUMERIC,
  p_bank_reference TEXT,
  p_sender_bank_name TEXT,
  p_sender_account_name TEXT,
  p_transfer_date DATE,
  p_storage_object_path TEXT,
  p_mime_type TEXT,
  p_file_size_bytes INTEGER,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing_payment RECORD;
  v_order RECORD;
  v_payment_id UUID;
  v_payment_ref TEXT;
BEGIN
  IF p_idempotency_key IS NULL OR LENGTH(TRIM(p_idempotency_key)) < 8 THEN
    RAISE EXCEPTION 'Valid idempotency_key is required';
  END IF;

  SELECT id, payment_reference, status INTO v_existing_payment
  FROM public.payments
  WHERE idempotency_key = p_idempotency_key AND customer_id = p_customer_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'idempotent_replay', TRUE,
      'payment_id', v_existing_payment.id,
      'payment_reference', v_existing_payment.payment_reference,
      'status', v_existing_payment.status
    );
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id AND customer_id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found for authenticated customer';
  END IF;

  IF v_order.payment_status IN ('Paid', 'Cancelled', 'Refunded') THEN
    RAISE EXCEPTION 'Order % cannot accept new payment evidence in status %', v_order.order_number, v_order.payment_status;
  END IF;

  IF p_amount_ngn IS NULL OR p_amount_ngn <= 0 OR p_amount_ngn > v_order.outstanding_balance_ngn THEN
    RAISE EXCEPTION 'Submitted transfer amount (%) exceeds outstanding balance (%)', p_amount_ngn, v_order.outstanding_balance_ngn;
  END IF;

  IF p_amount_ngn < v_order.outstanding_balance_ngn AND v_order.allow_partial_payment = FALSE THEN
    RAISE EXCEPTION 'Partial payment is not enabled for this order; full outstanding balance (%) required', v_order.outstanding_balance_ngn;
  END IF;

  -- Reuse initial Pending payment if unsubmitted, otherwise create new installment payment
  SELECT id, payment_reference INTO v_payment_id, v_payment_ref
  FROM public.payments
  WHERE order_id = p_order_id AND status = 'Pending' AND bank_reference_number IS NULL
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF v_payment_id IS NOT NULL THEN
    UPDATE public.payments
    SET
      status = 'Awaiting Verification',
      amount = p_amount_ngn,
      converted_amount_ngn = p_amount_ngn,
      bank_reference_number = TRIM(p_bank_reference),
      sender_bank_name = TRIM(p_sender_bank_name),
      sender_account_name = TRIM(p_sender_account_name),
      transfer_date = p_transfer_date,
      idempotency_key = p_idempotency_key
    WHERE id = v_payment_id;
  ELSE
    v_payment_ref := 'DGT-PAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8));
    INSERT INTO public.payments (
      payment_reference, order_id, customer_id, method, status,
      currency_code, amount, exchange_rate_to_ngn, converted_amount_ngn,
      bank_reference_number, sender_bank_name, sender_account_name, transfer_date,
      idempotency_key
    )
    VALUES (
      v_payment_ref, p_order_id, p_customer_id, 'bank_transfer', 'Awaiting Verification',
      'NGN', p_amount_ngn, 1, p_amount_ngn,
      TRIM(p_bank_reference), TRIM(p_sender_bank_name), TRIM(p_sender_account_name), p_transfer_date,
      p_idempotency_key
    )
    RETURNING id INTO v_payment_id;
  END IF;

  INSERT INTO public.payment_evidences (
    payment_id, order_id, customer_id, storage_object_path, mime_type, file_size_bytes
  )
  VALUES (
    v_payment_id, p_order_id, p_customer_id, p_storage_object_path, p_mime_type, p_file_size_bytes
  );

  UPDATE public.orders
  SET payment_status = 'Awaiting Verification'
  WHERE id = p_order_id AND payment_status IN ('Pending', 'Rejected', 'Failed');

  INSERT INTO public.audit_logs (actor_user_id, actor_role, action, entity_table, entity_id, after_snapshot)
  VALUES (
    p_customer_id, 'registered_customer', 'BANK_TRANSFER_EVIDENCE_SUBMITTED', 'payments', v_payment_id::TEXT,
    jsonb_build_object('order_id', p_order_id, 'amount_ngn', p_amount_ngn, 'bank_reference', TRIM(p_bank_reference))
  );

  RETURN jsonb_build_object(
    'idempotent_replay', FALSE,
    'payment_id', v_payment_id,
    'payment_reference', v_payment_ref,
    'status', 'Awaiting Verification'
  );
END;
$$;

-- 7.4 Finance Manager / Admin bank transfer verification (prevents duplicate verification)
CREATE OR REPLACE FUNCTION public.rpc_verify_bank_transfer_payment(
  p_staff_user_id UUID,
  p_payment_id UUID,
  p_decision TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_staff RECORD;
  v_payment RECORD;
  v_order RECORD;
  v_verified_total NUMERIC(16, 2);
  v_new_payment_status TEXT;
  v_new_order_payment_status TEXT;
  v_new_order_status TEXT;
BEGIN
  IF p_decision NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Invalid verification decision: %', p_decision;
  END IF;

  IF p_decision = 'reject' AND (p_rejection_reason IS NULL OR LENGTH(TRIM(p_rejection_reason)) < 5) THEN
    RAISE EXCEPTION 'Rejection reason is required when rejecting a bank transfer';
  END IF;

  SELECT sa.id AS staff_id, r.slug AS role_slug INTO v_staff
  FROM public.staff_accounts sa
  JOIN public.user_profiles up ON up.id = sa.user_id
  JOIN public.roles r ON r.id = sa.role_id
  WHERE sa.user_id = p_staff_user_id
    AND sa.is_active = TRUE
    AND up.account_type = 'staff'
    AND r.slug IN ('super_admin', 'admin', 'finance_manager');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Forbidden: active finance_manager, admin, or super_admin staff account required';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment record not found';
  END IF;

  IF v_payment.status <> 'Awaiting Verification' THEN
    RAISE EXCEPTION 'Duplicate or invalid verification blocked: payment % is in status %',
      v_payment.payment_reference, v_payment.status;
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = v_payment.order_id
  FOR UPDATE;

  IF p_decision = 'reject' THEN
    UPDATE public.payments
    SET
      status = 'Rejected',
      rejection_reason = TRIM(p_rejection_reason),
      verified_by = v_staff.staff_id,
      verified_at = NOW()
    WHERE id = p_payment_id;

    -- Recompute order payment status based on any earlier verified payments
    SELECT COALESCE(SUM(converted_amount_ngn), 0) INTO v_verified_total
    FROM public.payments
    WHERE order_id = v_order.id AND status IN ('Paid', 'Partially Paid');

    v_new_order_payment_status := CASE
      WHEN v_verified_total > 0 AND v_verified_total < v_order.total_ngn THEN 'Partially Paid'
      ELSE 'Rejected'
    END;

    UPDATE public.orders
    SET payment_status = v_new_order_payment_status
    WHERE id = v_order.id;

    INSERT INTO public.audit_logs (actor_user_id, actor_role, action, entity_table, entity_id, after_snapshot)
    VALUES (
      p_staff_user_id, v_staff.role_slug, 'PAYMENT_REJECTED', 'payments', p_payment_id::TEXT,
      jsonb_build_object('order_id', v_order.id, 'reason', TRIM(p_rejection_reason))
    );

    RETURN jsonb_build_object(
      'payment_id', p_payment_id,
      'payment_status', 'Rejected',
      'order_payment_status', v_new_order_payment_status
    );
  END IF;

  -- Approve transfer
  SELECT COALESCE(SUM(converted_amount_ngn), 0) + v_payment.converted_amount_ngn INTO v_verified_total
  FROM public.payments
  WHERE order_id = v_order.id AND status IN ('Paid', 'Partially Paid') AND id <> p_payment_id;

  IF v_verified_total > v_order.total_ngn THEN
    RAISE EXCEPTION 'Verified payments (%) would exceed order total (%)', v_verified_total, v_order.total_ngn;
  END IF;

  v_new_payment_status := CASE
    WHEN v_verified_total >= v_order.total_ngn THEN 'Paid'
    ELSE 'Partially Paid'
  END;

  UPDATE public.payments
  SET
    status = v_new_payment_status,
    verified_by = v_staff.staff_id,
    verified_at = NOW()
  WHERE id = p_payment_id;

  v_new_order_payment_status := CASE
    WHEN v_verified_total >= v_order.total_ngn THEN 'Paid'
    ELSE 'Partially Paid'
  END;

  v_new_order_status := CASE
    WHEN v_verified_total >= v_order.total_ngn AND v_order.order_status = 'pending_payment' THEN 'processing'
    ELSE v_order.order_status
  END;

  UPDATE public.orders
  SET
    amount_paid_ngn = v_verified_total,
    outstanding_balance_ngn = GREATEST(v_order.total_ngn - v_verified_total, 0),
    payment_status = v_new_order_payment_status,
    order_status = v_new_order_status
  WHERE id = v_order.id;

  INSERT INTO public.audit_logs (actor_user_id, actor_role, action, entity_table, entity_id, after_snapshot)
  VALUES (
    p_staff_user_id, v_staff.role_slug, 'PAYMENT_VERIFIED', 'payments', p_payment_id::TEXT,
    jsonb_build_object(
      'order_id', v_order.id,
      'verified_amount_ngn', v_payment.converted_amount_ngn,
      'cumulative_paid_ngn', v_verified_total,
      'order_payment_status', v_new_order_payment_status
    )
  );

  RETURN jsonb_build_object(
    'payment_id', p_payment_id,
    'payment_status', v_new_payment_status,
    'order_payment_status', v_new_order_payment_status,
    'amount_paid_ngn', v_verified_total,
    'outstanding_balance_ngn', GREATEST(v_order.total_ngn - v_verified_total, 0)
  );
END;
$$;

-- 7.5 Quotation acceptance -> Order creation with frozen currency snapshots
CREATE OR REPLACE FUNCTION public.rpc_accept_quotation(
  p_customer_id UUID,
  p_quotation_id UUID,
  p_address_id UUID,
  p_allow_partial_payment BOOLEAN DEFAULT TRUE,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_quote RECORD;
  v_address RECORD;
  v_state RECORD;
  v_existing_order RECORD;
  v_order_id UUID;
  v_order_number TEXT;
  v_order_type TEXT;
  v_payment_ref TEXT;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id, order_number, total_ngn INTO v_existing_order
    FROM public.orders WHERE idempotency_key = p_idempotency_key AND customer_id = p_customer_id;
    IF FOUND THEN
      RETURN jsonb_build_object('idempotent_replay', TRUE, 'order_id', v_existing_order.id, 'order_number', v_existing_order.order_number);
    END IF;
  END IF;

  SELECT * INTO v_quote
  FROM public.quotations
  WHERE id = p_quotation_id AND customer_id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation not found for customer';
  END IF;

  IF v_quote.status <> 'sent' THEN
    RAISE EXCEPTION 'Quotation % cannot be accepted from status %', v_quote.quote_number, v_quote.status;
  END IF;

  IF v_quote.valid_until <= NOW() THEN
    UPDATE public.quotations SET status = 'expired' WHERE id = v_quote.id;
    RAISE EXCEPTION 'Quotation % has expired', v_quote.quote_number;
  END IF;

  SELECT * INTO v_address FROM public.customer_addresses WHERE id = p_address_id AND customer_id = p_customer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery address not found for customer';
  END IF;

  SELECT * INTO v_state FROM public.nigerian_states WHERE id = v_address.state_id AND is_active = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Destination state is invalid';
  END IF;

  v_order_type := CASE WHEN v_quote.sourcing_request_id IS NOT NULL THEN 'wholesale_sourcing' ELSE 'pre_order' END;
  v_order_number := 'DGT-ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));
  v_payment_ref := 'DGT-PAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8));

  UPDATE public.quotations SET status = 'accepted' WHERE id = v_quote.id;

  IF v_quote.sourcing_request_id IS NOT NULL THEN
    UPDATE public.wholesale_sourcing_requests SET status = 'accepted' WHERE id = v_quote.sourcing_request_id;
  END IF;

  INSERT INTO public.orders (
    order_number, customer_id, order_type, quotation_id, shipping_address_snapshot,
    destination_state_id, currency_code, exchange_rate_snapshot,
    subtotal_ngn, shipping_fee_ngn, total_ngn,
    amount_paid_ngn, outstanding_balance_ngn, allow_partial_payment,
    order_status, payment_status, idempotency_key
  )
  VALUES (
    v_order_number, p_customer_id, v_order_type, v_quote.id,
    jsonb_build_object(
      'label', v_address.label,
      'recipient_name', v_address.recipient_name,
      'phone', v_address.phone,
      'state_name', v_state.name,
      'city', v_address.city,
      'street_line', v_address.street_line
    ),
    v_state.id, 'NGN', 1,
    v_quote.total_payable_ngn, 0, v_quote.total_payable_ngn,
    0, v_quote.total_payable_ngn, p_allow_partial_payment,
    'pending_payment', 'Pending', p_idempotency_key
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.payments (
    payment_reference, order_id, customer_id, method, status,
    currency_code, amount, exchange_rate_to_ngn, converted_amount_ngn
  )
  VALUES (
    v_payment_ref, v_order_id, p_customer_id, 'bank_transfer', 'Pending',
    'NGN', v_quote.total_payable_ngn, 1, v_quote.total_payable_ngn
  );

  INSERT INTO public.audit_logs (actor_user_id, actor_role, action, entity_table, entity_id, after_snapshot)
  VALUES (
    p_customer_id, 'registered_customer', 'QUOTATION_ACCEPTED', 'quotations', v_quote.id::TEXT,
    jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number, 'total_ngn', v_quote.total_payable_ngn)
  );

  RETURN jsonb_build_object(
    'idempotent_replay', FALSE,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'payment_reference', v_payment_ref,
    'total_ngn', v_quote.total_payable_ngn
  );
END;
$$;

-- 7.6 Procurement order creation (CNY snapshot)
CREATE OR REPLACE FUNCTION public.rpc_create_procurement_order(
  p_staff_user_id UUID,
  p_order_id UUID,
  p_supplier_id UUID,
  p_cost_cny NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_staff RECORD;
  v_rate NUMERIC(18, 6);
  v_cost_ngn NUMERIC(16, 2);
  v_proc_number TEXT;
  v_proc_id UUID;
BEGIN
  SELECT sa.id AS staff_id, r.slug AS role_slug INTO v_staff
  FROM public.staff_accounts sa
  JOIN public.user_profiles up ON up.id = sa.user_id
  JOIN public.roles r ON r.id = sa.role_id
  WHERE sa.user_id = p_staff_user_id AND sa.is_active = TRUE AND up.account_type = 'staff'
    AND r.slug IN ('super_admin', 'admin', 'sourcing_manager');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Forbidden: active sourcing_manager, admin, or super_admin required';
  END IF;

  SELECT rate INTO v_rate
  FROM public.exchange_rates
  WHERE from_currency = 'CNY' AND to_currency = 'NGN' AND is_active = TRUE
  ORDER BY effective_from DESC LIMIT 1;

  IF v_rate IS NULL THEN
    RAISE EXCEPTION 'Active CNY to NGN exchange rate must be configured before creating procurement';
  END IF;

  v_cost_ngn := ROUND(p_cost_cny * v_rate, 2);
  v_proc_number := 'DGT-PRC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));

  INSERT INTO public.procurement_orders (
    procurement_number, order_id, supplier_id, cost_cny,
    exchange_rate_cny_ngn, cost_ngn_snapshot, status, managed_by
  )
  VALUES (
    v_proc_number, p_order_id, p_supplier_id, p_cost_cny,
    v_rate, v_cost_ngn, 'initiated', v_staff.staff_id
  )
  RETURNING id INTO v_proc_id;

  INSERT INTO public.audit_logs (actor_user_id, actor_role, action, entity_table, entity_id, after_snapshot)
  VALUES (
    p_staff_user_id, v_staff.role_slug, 'PROCUREMENT_CREATED', 'procurement_orders', v_proc_id::TEXT,
    jsonb_build_object('procurement_number', v_proc_number, 'cost_cny', p_cost_cny, 'rate', v_rate, 'cost_ngn_snapshot', v_cost_ngn)
  );

  RETURN jsonb_build_object('procurement_id', v_proc_id, 'procurement_number', v_proc_number, 'cost_ngn_snapshot', v_cost_ngn);
END;
$$;

-- 7.7 Shipment 10-stage milestone update
CREATE OR REPLACE FUNCTION public.rpc_update_shipment_stage(
  p_staff_user_id UUID,
  p_shipment_id UUID,
  p_next_stage TEXT,
  p_location_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_staff RECORD;
  v_shipment RECORD;
  v_stage_label TEXT;
BEGIN
  SELECT sa.id AS staff_id, r.slug AS role_slug INTO v_staff
  FROM public.staff_accounts sa
  JOIN public.user_profiles up ON up.id = sa.user_id
  JOIN public.roles r ON r.id = sa.role_id
  WHERE sa.user_id = p_staff_user_id AND sa.is_active = TRUE AND up.account_type = 'staff'
    AND r.slug IN ('super_admin', 'admin', 'logistics_manager');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Forbidden: active logistics_manager, admin, or super_admin required';
  END IF;

  SELECT * INTO v_shipment FROM public.shipments WHERE id = p_shipment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shipment not found';
  END IF;

  v_stage_label := INITCAP(REPLACE(p_next_stage, '_', ' '));

  UPDATE public.shipments SET current_stage = p_next_stage WHERE id = p_shipment_id;

  INSERT INTO public.shipment_milestones (shipment_id, stage_code, stage_label, location_note, recorded_by)
  VALUES (p_shipment_id, p_next_stage, v_stage_label, p_location_note, v_staff.staff_id);

  INSERT INTO public.audit_logs (actor_user_id, actor_role, action, entity_table, entity_id, after_snapshot)
  VALUES (
    p_staff_user_id, v_staff.role_slug, 'SHIPMENT_STAGE_UPDATED', 'shipments', p_shipment_id::TEXT,
    jsonb_build_object('previous_stage', v_shipment.current_stage, 'next_stage', p_next_stage)
  );

  RETURN jsonb_build_object('shipment_id', p_shipment_id, 'current_stage', p_next_stage);
END;
$$;

-- 7.8 Delivery completion & final inventory deduction
CREATE OR REPLACE FUNCTION public.rpc_complete_delivery(
  p_staff_user_id UUID,
  p_order_id UUID,
  p_warehouse_id UUID DEFAULT NULL,
  p_delivery_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_staff RECORD;
  v_order RECORD;
  v_item RECORD;
BEGIN
  SELECT sa.id AS staff_id, r.slug AS role_slug INTO v_staff
  FROM public.staff_accounts sa
  JOIN public.user_profiles up ON up.id = sa.user_id
  JOIN public.roles r ON r.id = sa.role_id
  WHERE sa.user_id = p_staff_user_id AND sa.is_active = TRUE AND up.account_type = 'staff'
    AND r.slug IN ('super_admin', 'admin', 'logistics_manager', 'order_manager');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Forbidden: active logistics_manager, order_manager, admin, or super_admin required';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.payment_status <> 'Paid' THEN
    RAISE EXCEPTION 'Cannot complete delivery for order % until payment_status is Paid (current: %)',
      v_order.order_number, v_order.payment_status;
  END IF;

  IF v_order.order_status = 'completed' THEN
    RETURN jsonb_build_object('already_completed', TRUE, 'order_id', p_order_id);
  END IF;

  -- Deduct reserved stock on ready-stock fulfillment
  IF v_order.order_type = 'ready_stock' AND p_warehouse_id IS NOT NULL THEN
    FOR v_item IN
      SELECT product_id, quantity FROM public.order_items WHERE order_id = p_order_id AND product_id IS NOT NULL
    LOOP
      UPDATE public.inventory_balances
      SET
        quantity_on_hand = quantity_on_hand - v_item.quantity,
        quantity_reserved = quantity_reserved - v_item.quantity
      WHERE product_id = v_item.product_id
        AND warehouse_id = p_warehouse_id
        AND quantity_reserved >= v_item.quantity
        AND quantity_on_hand >= v_item.quantity;
    END LOOP;
  END IF;

  UPDATE public.orders SET order_status = 'completed' WHERE id = p_order_id;

  INSERT INTO public.audit_logs (actor_user_id, actor_role, action, entity_table, entity_id, after_snapshot)
  VALUES (
    p_staff_user_id, v_staff.role_slug, 'DELIVERY_COMPLETED', 'orders', p_order_id::TEXT,
    jsonb_build_object('order_number', v_order.order_number, 'delivery_note', p_delivery_note)
  );

  RETURN jsonb_build_object('order_id', p_order_id, 'order_status', 'completed');
END;
$$;

-- Restrict RPC execute grants strictly to authenticated/service_role (never anon)
REVOKE ALL ON FUNCTION public.rpc_reserve_ready_stock_inventory(JSONB, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_create_ready_stock_order(UUID, UUID, UUID, JSONB, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_submit_bank_transfer_evidence(UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_verify_bank_transfer_payment(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_accept_quotation(UUID, UUID, UUID, BOOLEAN, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_create_procurement_order(UUID, UUID, UUID, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_update_shipment_stage(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_complete_delivery(UUID, UUID, UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rpc_reserve_ready_stock_inventory(JSONB, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_create_ready_stock_order(UUID, UUID, UUID, JSONB, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_submit_bank_transfer_evidence(UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_verify_bank_transfer_payment(UUID, UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_accept_quotation(UUID, UUID, UUID, BOOLEAN, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_create_procurement_order(UUID, UUID, UUID, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_update_shipment_stage(UUID, UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_complete_delivery(UUID, UUID, UUID, TEXT) TO service_role;
