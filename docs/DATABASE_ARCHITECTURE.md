# Danmusa Global Trade (DGT) — Relational Database Architecture & Migration Plan

## 1. Architectural Principles

- **Database Engine**: PostgreSQL (hosted on Supabase).
- **Primary Keys**: `uuid` (`gen_random_uuid()`) across all domain tables to avoid enumerable IDs and enable safe distributed inserts.
- **Immutability & Financial Integrity**:
  - Historical orders, quotations, procurement batches, expenses, and payment records store `currency_code`, `exchange_rate_to_ngn`, and `converted_amount_ngn` at transaction time. Updating global exchange rates in `exchange_rates` never alters historical rows.
  - Database trigger `protect_order_snapshot_immutability` prevents modifying currency/totals on orders once verified payments exist.
  - `audit_logs` is strictly append-only (`REVOKE UPDATE, DELETE, TRUNCATE` + `prevent_audit_log_mutation` trigger).
- **Payment Strategy (Stage 2 Decision)**:
  - **Paystack / online gateways are postponed.**
  - Active payment workflow is **Bank Transfer with manual Finance Manager verification**.
  - Payment evidence files are stored in private Supabase Storage (`dgt-payment-evidence`, `public = FALSE`) and referenced in `payment_evidences` by private object path—never exposed publicly.
- **Security & Isolation**:
  - Row Level Security (RLS) is enabled on every operational and reference table in `public`.
  - Customers can only read/write their own profile (with `account_type` locked via trigger), addresses, cart, orders, sourcing requests, payments, and payment evidences.
  - Staff privileges are checked via `public.has_staff_role` and `public.has_permission` (`SECURITY DEFINER` with pinned `SET search_path = public, pg_temp`), verifying `staff_accounts.is_active = TRUE` AND `user_profiles.account_type = 'staff'`.
  - Atomic transactional RPCs (`rpc_*`) execute via `service_role` from the authenticated Express backend only (not granted to `anon`).

---

## 2. Core Entities & Relationships (31 Tables)

### Domain A: Identity, RBAC & Customer Profiles
1. `roles` (`id` PK, `slug` UNIQUE, `name`, `description`, `is_system`) — 10 seeded roles.
2. `permissions` (`id` PK, `code` UNIQUE, `domain`, `description`) — 16 granular permission codes.
3. `role_permissions` (`role_id` FK -> `roles.id`, `permission_id` FK -> `permissions.id`, composite PK)
4. `user_profiles` (`id` PK/FK -> `auth.users(id)`, `full_name`, `email`, `phone`, `account_type`, `default_state_id` FK -> `nigerian_states.id`, `created_at`, `updated_at`)
   - Auto-populated via `on_auth_user_created` trigger with `account_type` hardcoded to `'registered_customer'`.
5. `staff_accounts` (`id` PK, `user_id` UNIQUE FK -> `user_profiles.id`, `role_id` FK -> `roles.id`, `department`, `is_active`, `appointed_by` FK -> `user_profiles.id`)
   - Protected by `protect_super_admin_floor` trigger so the last active `super_admin` cannot be deactivated or deleted.
6. `customer_addresses` (`id` PK, `customer_id` FK -> `user_profiles.id`, `label`, `recipient_name`, `phone`, `state_id` FK -> `nigerian_states.id`, `city`, `street_line`, `landmark`, `is_default`)

### Domain B: Multi-Currency & System Configuration
7. `currencies` (`code` PK [`NGN`, `CNY`, `USD`], `name`, `symbol`, `decimal_places`, `is_base`)
8. `exchange_rates` (`id` PK, `from_currency`, `to_currency`, `rate`, `effective_from`, `set_by`, `is_active`)
9. `system_settings` (`key` PK, `value_json`, `description`, `updated_by`, `updated_at`)

### Domain C: Product Catalogue & Inventory
10. `categories` (`id` PK, `parent_id`, `slug` UNIQUE, `name`, `description`, `sort_order`, `is_active`)
11. `products` (`id` PK, `sku` UNIQUE, `category_id`, `name`, `slug` UNIQUE, `fulfillment_mode`, `base_currency`, `base_price`, `estimated_weight_kg`, `estimated_volume_cbm`, `shipping_method`, `moq`, `description`, `specs_json`, `is_featured`, `is_active`)
12. `product_media` (`id` PK, `product_id`, `cloudinary_public_id`, `url`, `alt_text`, `sort_order`, `is_primary`)
13. `warehouses` (`id` PK, `code` UNIQUE, `name`, `country`, `city`, `state_id`, `is_active`)
14. `inventory_balances` (`id` PK, `product_id`, `warehouse_id`, `quantity_on_hand`, `quantity_reserved`, `reorder_point`, `CHECK (quantity_reserved <= quantity_on_hand)`)

### Domain D: Cart, Orders & Quotations
15. `shopping_carts` (`id` PK, `customer_id` UNIQUE FK -> `user_profiles.id`, `updated_at`)
16. `cart_items` (`id` PK, `cart_id`, `product_id`, `quantity`)
17. `wholesale_sourcing_requests` (`id` PK, `request_number` UNIQUE, `customer_id`, `product_title`, `category_name`, `description`, `target_quantity`, `target_budget_ngn`, `reference_image_url`, `cloudinary_public_id`, `destination_state_id`, `status`, `assigned_sourcing_manager_id`)
18. `quotations` (`id` PK, `quote_number` UNIQUE, `customer_id`, `sourcing_request_id`, `product_id`, `supplier_cost_cny`, `exchange_rate_cny_ngn`, `shipping_method`, `shipping_fee_usd`, `exchange_rate_usd_ngn`, `service_margin_ngn`, `total_payable_ngn`, `valid_until`, `status`, `created_by`)
19. `orders` (`id` PK, `order_number` UNIQUE, `idempotency_key` UNIQUE, `customer_id`, `order_type`, `quotation_id`, `shipping_address_snapshot`, `destination_state_id`, `currency_code`, `exchange_rate_snapshot`, `subtotal_ngn`, `shipping_fee_ngn`, `total_ngn`, `amount_paid_ngn`, `outstanding_balance_ngn`, `allow_partial_payment`, `order_status`, `payment_status`)
20. `order_items` (`id` PK, `order_id`, `product_id`, `item_title`, `sku`, `quantity`, `unit_price_currency`, `unit_price_amount`, `exchange_rate_to_ngn`, `line_total_ngn`)

### Domain E: Procurement, Logistics & Nigerian Delivery
21. `suppliers` (`id` PK, `name`, `city_china`, `province_china`, `specialty`, `verification_status`, `contact_notes`)
22. `procurement_orders` (`id` PK, `procurement_number` UNIQUE, `order_id`, `supplier_id`, `cost_cny`, `exchange_rate_cny_ngn`, `cost_ngn_snapshot`, `status`, `managed_by`)
23. `nigerian_states` (`id` PK, `code` UNIQUE, `name` UNIQUE, `geopolitical_zone`, `is_fct`, `is_priority_hub`, `base_delivery_fee_ngn`, `estimated_transit_days`, `is_active`)
24. `logistics_partners` (`id` PK, `name`, `coverage_scope`, `contact_placeholder`, `is_active`)
25. `shipments` (`id` PK, `tracking_number` UNIQUE, `order_id`, `shipping_method`, `origin_warehouse_id`, `destination_warehouse_id`, `logistics_partner_id`, `current_stage`, `estimated_arrival_date`)
26. `shipment_milestones` (`id` PK, `shipment_id`, `stage_code`, `stage_label`, `location_note`, `recorded_by`, `recorded_at`)

### Domain F: Bank Transfer Payments, Expenses, Notifications & Audit Logging
27. `payments` (`id` PK, `payment_reference` UNIQUE, `idempotency_key` UNIQUE, `order_id`, `customer_id`, `method` [`bank_transfer`, `paystack` reserved], `status` [8 statuses], `currency_code`, `amount`, `exchange_rate_to_ngn`, `converted_amount_ngn`, `bank_reference_number`, `sender_bank_name`, `sender_account_name`, `transfer_date`, `rejection_reason`, `verified_by`, `verified_at`)
28. `payment_evidences` (`id` PK, `payment_id` FK -> `payments.id`, `order_id` FK -> `orders.id`, `customer_id` FK -> `user_profiles.id`, `storage_bucket`, `storage_object_path`, `mime_type`, `file_size_bytes`, `uploaded_at`)
29. `expenses` (`id` PK, `expense_number` UNIQUE, `category`, `description`, `order_id`, `shipment_id`, `currency_code`, `amount`, `exchange_rate_to_ngn`, `converted_amount_ngn`, `incurred_at`, `recorded_by`)
30. `notifications` (`id` PK, `user_id`, `channel`, `title`, `body`, `is_read`, `created_at`)
31. `audit_logs` (`id` PK, `actor_user_id`, `actor_role`, `action`, `entity_table`, `entity_id`, `before_snapshot`, `after_snapshot`, `ip_address`, `created_at`)

---

## 3. Transactional Database Functions (Stage 2)

All 8 critical workflows run inside atomic PostgreSQL `SECURITY DEFINER` RPCs (`SET search_path = public, pg_temp`), granted exclusively to `service_role`:

1. `rpc_reserve_ready_stock_inventory(p_items, p_warehouse_id)` — Deterministic `FOR UPDATE` row locking + `chk_inventory_no_oversell` constraint.
2. `rpc_create_ready_stock_order(...)` — Authoritative server-calculated totals, idempotency key deduplication, stock reservation, and initial `Pending` bank-transfer record.
3. `rpc_submit_bank_transfer_evidence(...)` — Private receipt object registration, duplicate bank-reference prevention, partial-payment policy enforcement, transitions to `Awaiting Verification`.
4. `rpc_verify_bank_transfer_payment(...)` — Finance Manager / Admin / Super Admin approval or rejection; blocks duplicate verification; computes cumulative `amount_paid_ngn` and `outstanding_balance_ngn`.
5. `rpc_accept_quotation(...)` — Locks quotation, enforces `status = 'sent'` and `valid_until > NOW()`, snapshots NGN/CNY/USD values onto the new order.
6. `rpc_create_procurement_order(...)` — Captures active CNY-to-NGN rate snapshot onto supplier procurement order.
7. `rpc_update_shipment_stage(...)` — Advances 10-stage China-to-Nigeria milestone and appends `shipment_milestones`.
8. `rpc_complete_delivery(...)` — Requires `payment_status = 'Paid'`, deducts reserved inventory on hand, marks `order_status = 'completed'`.

---

## 4. Migration Sequence (Non-Destructive)

1. `20261118000001_dgt_initial_foundation.sql` — Base schema, reference seeds, initial RLS.
2. `20261118000002_dgt_security_hardening_and_transactions.sql` — Security audit fixes, complete RLS, `payment_evidences`, `expenses`, private storage bucket, immutability triggers, and all 8 transactional RPCs.
