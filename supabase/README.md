# Danmusa Global Trade (DGT) — Safe Supabase Provisioning & Migration Guide

This directory contains the non-destructive PostgreSQL migrations for Danmusa Global Trade (DGT).
**Do not run destructive migrations (`supabase db reset`) against live or production databases.**

## Migration Files (Apply in Order)

1. `migrations/20261118000001_dgt_initial_foundation.sql`
   - Base schema (currencies, 36 Nigerian states + FCT, 10 RBAC roles, user profiles, staff accounts, catalogue, inventory, carts, sourcing, quotations, orders, procurement, shipments, payments, notifications, audit logs) and initial RLS policies.
2. `migrations/20261118000002_dgt_security_hardening_and_transactions.sql`
   - Security audit fixes (`SET search_path` on all functions, `on_auth_user_created` signup trigger hardcoding `registered_customer`, `protect_user_profile_privilege_columns`, `protect_super_admin_floor`, `prevent_audit_log_mutation`, `chk_inventory_no_oversell`).
   - Complete RLS policies across all 31 tables.
   - `payment_evidences` and `expenses` tables + private Supabase Storage bucket (`dgt-payment-evidence`, `public = FALSE`).
   - All 8 atomic transactional PostgreSQL RPCs (`rpc_reserve_ready_stock_inventory`, `rpc_create_ready_stock_order`, `rpc_submit_bank_transfer_evidence`, `rpc_verify_bank_transfer_payment`, `rpc_accept_quotation`, `rpc_create_procurement_order`, `rpc_update_shipment_stage`, `rpc_complete_delivery`).

## Safe Provisioning Steps

1. Create a new Supabase project in your Supabase Dashboard (select a region close to Nigeria/Europe, e.g., `eu-west-1` or `eu-west-2`).
2. Configure environment variables securely in your hosting/runtime Secrets manager (never commit `.env` or paste `SUPABASE_SERVICE_ROLE_KEY` into frontend code):
   - `VITE_SUPABASE_URL` (Project URL)
   - `VITE_SUPABASE_ANON_KEY` (Publishable anon key)
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_SERVICE_ROLE_KEY` (Server-only secret key)
3. Link and push the forward migrations using the Supabase CLI:
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push --dry-run
   supabase db push
   ```
4. Configure initial reference data after pushing migrations:
   - Insert active `CNY -> NGN` and `USD -> NGN` rows into `public.exchange_rates`.
   - Insert initial China & Nigeria warehouses into `public.warehouses`.
   - Insert official DGT bank transfer account instructions into `public.system_settings` under key `'bank_transfer_instructions'`.
5. Appoint the first **Super Administrator** strictly via SQL Editor or a one-time server bootstrap script (never via public registration):
   - Register the initial user via Supabase Auth, then run in Supabase SQL Editor:
     ```sql
     UPDATE public.user_profiles SET account_type = 'staff' WHERE email = '<admin-email>';
     INSERT INTO public.staff_accounts (user_id, role_id, department, is_active)
     SELECT up.id, r.id, 'Executive Administration', TRUE
     FROM public.user_profiles up, public.roles r
     WHERE up.email = '<admin-email>' AND r.slug = 'super_admin';
     ```
