import { Router } from 'express';
import { z } from 'zod';
import {
  defaultAuthResolver,
  requireVerifiedRole,
  sanitizeAuditSnapshot,
  STAFF_ROLE_SLUGS,
  validateBody,
  type AuthResolver,
} from '../middleware/security.ts';

const productCreateSchema = z
  .object({
    sku: z.string().min(3).max(60),
    categoryId: z.string().uuid(),
    name: z.string().min(3).max(160),
    slug: z.string().min(3).max(160),
    fulfillmentMode: z.enum(['ready_stock', 'pre_order']),
    baseCurrency: z.enum(['NGN', 'CNY', 'USD']).default('NGN'),
    basePrice: z.number().nonnegative(),
    estimatedWeightKg: z.number().nonnegative().optional(),
    estimatedVolumeCbm: z.number().nonnegative().optional(),
    shippingMethod: z
      .enum(['weight_based', 'volume_based', 'product_based', 'custom_quotation'])
      .default('weight_based'),
    moq: z.number().int().positive().default(1),
    description: z.string().min(5).max(5000),
    isFeatured: z.boolean().optional(),
  })
  .strict();

const categoryCreateSchema = z
  .object({
    parentId: z.string().uuid().optional(),
    slug: z.string().min(2).max(100),
    name: z.string().min(2).max(120),
    description: z.string().max(1000).optional(),
    sortOrder: z.number().int().default(0),
  })
  .strict();

const inventoryAdjustSchema = z
  .object({
    quantityOnHand: z.number().int().nonnegative(),
    reorderPoint: z.number().int().nonnegative().optional(),
  })
  .strict();

const quotationCreateSchema = z
  .object({
    customerId: z.string().uuid(),
    sourcingRequestId: z.string().uuid().optional(),
    productId: z.string().uuid().optional(),
    supplierCostCny: z.number().nonnegative(),
    exchangeRateCnyNgn: z.number().positive(),
    shippingMethod: z.enum([
      'weight_based',
      'volume_based',
      'product_based',
      'custom_quotation',
    ]),
    shippingFeeUsd: z.number().nonnegative(),
    exchangeRateUsdNgn: z.number().positive(),
    serviceMarginNgn: z.number().nonnegative().default(0),
    validUntil: z.string().datetime(),
  })
  .strict();

const bankTransferVerifySchema = z
  .object({
    decision: z.enum(['approve', 'reject']),
    rejectionReason: z.string().min(5).max(500).optional(),
  })
  .strict();

const supplierCreateSchema = z
  .object({
    name: z.string().min(2).max(160),
    cityChina: z.string().min(2).max(100),
    provinceChina: z.string().min(2).max(100),
    specialty: z.string().min(2).max(200),
    contactNotes: z.string().max(1000).optional(),
  })
  .strict();

const procurementCreateSchema = z
  .object({
    orderId: z.string().uuid(),
    supplierId: z.string().uuid(),
    costCny: z.number().positive(),
  })
  .strict();

const shipmentStageSchema = z
  .object({
    nextStage: z.enum([
      'procurement_in_china',
      'received_at_china_warehouse',
      'preparing_for_shipment',
      'shipped_from_china',
      'in_transit',
      'arrived_in_nigeria',
      'customs_clearance',
      'released_from_customs',
      'received_at_nigeria_warehouse',
      'ready_for_local_delivery',
    ]),
    locationNote: z.string().max(300).optional(),
  })
  .strict();

const stateDeliveryUpdateSchema = z
  .object({
    baseDeliveryFeeNgn: z.number().nonnegative(),
    estimatedTransitDays: z.number().int().positive().max(60),
    isActive: z.boolean().optional(),
  })
  .strict();

const completeDeliverySchema = z
  .object({
    warehouseId: z.string().uuid().optional(),
    deliveryNote: z.string().max(500).optional(),
  })
  .strict();

const staffAppointSchema = z
  .object({
    userId: z.string().uuid(),
    roleSlug: z.enum([
      'super_admin',
      'admin',
      'product_manager',
      'order_manager',
      'finance_manager',
      'sourcing_manager',
      'logistics_manager',
      'customer_support',
    ]),
    department: z.string().min(2).max(100),
  })
  .strict();

const staffUpdateSchema = z
  .object({
    roleSlug: z
      .enum([
        'super_admin',
        'admin',
        'product_manager',
        'order_manager',
        'finance_manager',
        'sourcing_manager',
        'logistics_manager',
        'customer_support',
      ])
      .optional(),
    department: z.string().min(2).max(100).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export function createAdminRouter(
  authResolver: AuthResolver = defaultAuthResolver,
): Router {
  const router = Router();

  // General Staff Probe
  router.get(
    '/foundation-status',
    requireVerifiedRole(STAFF_ROLE_SLUGS, authResolver),
    (_req, res) => {
      res.json({
        authorized: true,
        role: res.locals.authRole,
        staffAccountId: res.locals.staffAccountId,
        message: 'Verified staff session active.',
      });
    },
  );

  // Products & Categories
  const productGuard = requireVerifiedRole(
    ['super_admin', 'admin', 'product_manager'],
    authResolver,
  );

  router.get('/products', productGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name, slug)')
      .order('created_at', { ascending: false });
    if (error) {
      res.status(500).json({ error: 'Failed to load products' });
      return;
    }
    res.json({ products: data ?? [] });
  });

  router.post(
    '/products',
    productGuard,
    validateBody(productCreateSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient()!;
      const body = req.body as z.infer<typeof productCreateSchema>;

      const { data, error } = await supabase
        .from('products')
        .insert({
          sku: body.sku,
          category_id: body.categoryId,
          name: body.name,
          slug: body.slug,
          fulfillment_mode: body.fulfillmentMode,
          base_currency: body.baseCurrency,
          base_price: body.basePrice,
          estimated_weight_kg: body.estimatedWeightKg ?? null,
          estimated_volume_cbm: body.estimatedVolumeCbm ?? null,
          shipping_method: body.shippingMethod,
          moq: body.moq,
          description: body.description,
          is_featured: body.isFeatured ?? false,
        })
        .select('*')
        .single();

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }

      await supabase.from('audit_logs').insert({
        actor_user_id: res.locals.authUser.id,
        actor_role: res.locals.authRole,
        action: 'PRODUCT_CREATED',
        entity_table: 'products',
        entity_id: data.id,
        after_snapshot: sanitizeAuditSnapshot(data),
      });

      res.status(201).json({ product: data });
    },
  );

  router.get('/categories', productGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      res.status(500).json({ error: 'Failed to load categories' });
      return;
    }
    res.json({ categories: data ?? [] });
  });

  router.post(
    '/categories',
    productGuard,
    validateBody(categoryCreateSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient()!;
      const body = req.body as z.infer<typeof categoryCreateSchema>;

      const { data, error } = await supabase
        .from('categories')
        .insert({
          parent_id: body.parentId ?? null,
          slug: body.slug,
          name: body.name,
          description: body.description ?? null,
          sort_order: body.sortOrder,
        })
        .select('*')
        .single();

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(201).json({ category: data });
    },
  );

  // Inventory Management
  const inventoryGuard = requireVerifiedRole(
    ['super_admin', 'admin', 'product_manager', 'logistics_manager'],
    authResolver,
  );

  router.get('/inventory', inventoryGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const { data, error } = await supabase
      .from('inventory_balances')
      .select('*, products(sku, name), warehouses(code, name, country)');
    if (error) {
      res.status(500).json({ error: 'Failed to load inventory' });
      return;
    }
    res.json({ inventory: data ?? [] });
  });

  router.patch(
    '/inventory/:id',
    inventoryGuard,
    validateBody(inventoryAdjustSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient()!;
      const body = req.body as z.infer<typeof inventoryAdjustSchema>;

      const { data, error } = await supabase
        .from('inventory_balances')
        .update({
          quantity_on_hand: body.quantityOnHand,
          ...(body.reorderPoint !== undefined
            ? { reorder_point: body.reorderPoint }
            : {}),
        })
        .eq('id', req.params.id)
        .select('*')
        .single();

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }

      await supabase.from('audit_logs').insert({
        actor_user_id: res.locals.authUser.id,
        actor_role: res.locals.authRole,
        action: 'INVENTORY_ADJUSTED',
        entity_table: 'inventory_balances',
        entity_id: data.id,
        after_snapshot: sanitizeAuditSnapshot(body),
      });

      res.json({ inventory: data });
    },
  );

  // Customers & Orders
  const orderStaffGuard = requireVerifiedRole(
    ['super_admin', 'admin', 'order_manager', 'customer_support'],
    authResolver,
  );

  router.get('/customers', orderStaffGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, phone, account_type, default_state_id, created_at')
      .eq('account_type', 'registered_customer')
      .order('created_at', { ascending: false });
    if (error) {
      res.status(500).json({ error: 'Failed to load customers' });
      return;
    }
    res.json({ customers: data ?? [] });
  });

  router.get('/orders', orderStaffGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const { data, error } = await supabase
      .from('orders')
      .select('*, user_profiles(full_name, email)')
      .order('created_at', { ascending: false });
    if (error) {
      res.status(500).json({ error: 'Failed to load orders' });
      return;
    }
    res.json({ orders: data ?? [] });
  });

  // Sourcing & Quotations
  const sourcingGuard = requireVerifiedRole(
    ['super_admin', 'admin', 'sourcing_manager'],
    authResolver,
  );

  router.get('/sourcing-requests', sourcingGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const { data, error } = await supabase
      .from('wholesale_sourcing_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      res.status(500).json({ error: 'Failed to load sourcing requests' });
      return;
    }
    res.json({ requests: data ?? [] });
  });

  router.get(
    '/quotations',
    requireVerifiedRole(
      ['super_admin', 'admin', 'sourcing_manager', 'finance_manager'],
      authResolver,
    ),
    async (_req, res) => {
      const supabase = authResolver.getAdminClient()!;
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        res.status(500).json({ error: 'Failed to load quotations' });
        return;
      }
      res.json({ quotations: data ?? [] });
    },
  );

  router.post(
    '/quotations',
    requireVerifiedRole(
      ['super_admin', 'admin', 'sourcing_manager', 'finance_manager'],
      authResolver,
    ),
    validateBody(quotationCreateSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient()!;
      const body = req.body as z.infer<typeof quotationCreateSchema>;

      // Server computes authoritative NGN total from supplier CNY + freight USD + margin
      const supplierNgn = body.supplierCostCny * body.exchangeRateCnyNgn;
      const shippingNgn = body.shippingFeeUsd * body.exchangeRateUsdNgn;
      const totalPayableNgn = Math.round((supplierNgn + shippingNgn + body.serviceMarginNgn) * 100) / 100;
      const quoteNumber = `DGT-QTE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      const { data, error } = await supabase
        .from('quotations')
        .insert({
          quote_number: quoteNumber,
          customer_id: body.customerId,
          sourcing_request_id: body.sourcingRequestId ?? null,
          product_id: body.productId ?? null,
          supplier_cost_cny: body.supplierCostCny,
          exchange_rate_cny_ngn: body.exchangeRateCnyNgn,
          shipping_method: body.shippingMethod,
          shipping_fee_usd: body.shippingFeeUsd,
          exchange_rate_usd_ngn: body.exchangeRateUsdNgn,
          service_margin_ngn: body.serviceMarginNgn,
          total_payable_ngn: totalPayableNgn,
          valid_until: body.validUntil,
          status: 'sent',
          created_by: res.locals.staffAccountId,
        })
        .select('*')
        .single();

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }

      await supabase.from('audit_logs').insert({
        actor_user_id: res.locals.authUser.id,
        actor_role: res.locals.authRole,
        action: 'QUOTATION_ISSUED',
        entity_table: 'quotations',
        entity_id: data.id,
        after_snapshot: sanitizeAuditSnapshot({
          quote_number: quoteNumber,
          total_payable_ngn: totalPayableNgn,
        }),
      });

      res.status(201).json({ quotation: data });
    },
  );

  // Bank Transfer Verification (Finance Manager / Admin / Super Admin)
  const financeGuard = requireVerifiedRole(
    ['super_admin', 'admin', 'finance_manager'],
    authResolver,
  );

  router.get('/payments/bank-transfers', financeGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const { data, error } = await supabase
      .from('payments')
      .select(
        '*, orders(order_number, total_ngn, amount_paid_ngn, outstanding_balance_ngn), payment_evidences(id, mime_type, file_size_bytes, uploaded_at)',
      )
      .eq('method', 'bank_transfer')
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: 'Failed to load bank transfer queue' });
      return;
    }
    res.json({ payments: data ?? [] });
  });

  router.get(
    '/payments/:paymentId/evidence-url',
    financeGuard,
    async (req, res) => {
      const supabase = authResolver.getAdminClient()!;
      const { data: evidence, error } = await supabase
        .from('payment_evidences')
        .select('storage_bucket, storage_object_path')
        .eq('payment_id', req.params.paymentId)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !evidence) {
        res.status(404).json({ error: 'Payment evidence not found' });
        return;
      }

      const { data: signed, error: signErr } = await supabase.storage
        .from(evidence.storage_bucket)
        .createSignedUrl(evidence.storage_object_path, 60);

      if (signErr || !signed) {
        res.status(500).json({ error: 'Failed to create signed review URL' });
        return;
      }

      res.json({ signedUrl: signed.signedUrl, expiresInSeconds: 60 });
    },
  );

  router.post(
    '/payments/:paymentId/verify',
    financeGuard,
    validateBody(bankTransferVerifySchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient()!;
      const body = req.body as z.infer<typeof bankTransferVerifySchema>;

      if (body.decision === 'reject' && !body.rejectionReason) {
        res.status(400).json({
          error: 'rejectionReason is required when rejecting a bank transfer',
        });
        return;
      }

      const { data, error } = await supabase.rpc(
        'rpc_verify_bank_transfer_payment',
        {
          p_staff_user_id: res.locals.authUser.id,
          p_payment_id: req.params.paymentId,
          p_decision: body.decision,
          p_rejection_reason: body.rejectionReason ?? null,
        },
      );

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.json({ verification: data });
    },
  );

  // Suppliers & Procurement
  router.get('/suppliers', sourcingGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });
    if (error) {
      res.status(500).json({ error: 'Failed to load suppliers' });
      return;
    }
    res.json({ suppliers: data ?? [] });
  });

  router.post(
    '/suppliers',
    sourcingGuard,
    validateBody(supplierCreateSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient()!;
      const body = req.body as z.infer<typeof supplierCreateSchema>;

      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          name: body.name,
          city_china: body.cityChina,
          province_china: body.provinceChina,
          specialty: body.specialty,
          contact_notes: body.contactNotes ?? null,
        })
        .select('*')
        .single();

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(201).json({ supplier: data });
    },
  );

  router.post(
    '/procurement',
    sourcingGuard,
    validateBody(procurementCreateSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient()!;
      const body = req.body as z.infer<typeof procurementCreateSchema>;

      const { data, error } = await supabase.rpc('rpc_create_procurement_order', {
        p_staff_user_id: res.locals.authUser.id,
        p_order_id: body.orderId,
        p_supplier_id: body.supplierId,
        p_cost_cny: body.costCny,
      });

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(201).json({ procurement: data });
    },
  );

  // Shipments & Nigerian Delivery Management
  const logisticsGuard = requireVerifiedRole(
    ['super_admin', 'admin', 'logistics_manager'],
    authResolver,
  );

  router.get('/shipments', logisticsGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const { data, error } = await supabase
      .from('shipments')
      .select('*, shipment_milestones(*)')
      .order('created_at', { ascending: false });
    if (error) {
      res.status(500).json({ error: 'Failed to load shipments' });
      return;
    }
    res.json({ shipments: data ?? [] });
  });

  router.post(
    '/shipments/:id/stage',
    logisticsGuard,
    validateBody(shipmentStageSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient()!;
      const body = req.body as z.infer<typeof shipmentStageSchema>;

      const { data, error } = await supabase.rpc('rpc_update_shipment_stage', {
        p_staff_user_id: res.locals.authUser.id,
        p_shipment_id: req.params.id,
        p_next_stage: body.nextStage,
        p_location_note: body.locationNote ?? null,
      });

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.json({ shipment: data });
    },
  );

  router.patch(
    '/deliveries/states/:id',
    logisticsGuard,
    validateBody(stateDeliveryUpdateSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient()!;
      const body = req.body as z.infer<typeof stateDeliveryUpdateSchema>;

      const { data, error } = await supabase
        .from('nigerian_states')
        .update({
          base_delivery_fee_ngn: body.baseDeliveryFeeNgn,
          estimated_transit_days: body.estimatedTransitDays,
          ...(body.isActive !== undefined ? { is_active: body.isActive } : {}),
        })
        .eq('id', req.params.id)
        .select('*')
        .single();

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.json({ state: data });
    },
  );

  router.post(
    '/deliveries/orders/:orderId/complete',
    requireVerifiedRole(
      ['super_admin', 'admin', 'logistics_manager', 'order_manager'],
      authResolver,
    ),
    validateBody(completeDeliverySchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient()!;
      const body = req.body as z.infer<typeof completeDeliverySchema>;

      const { data, error } = await supabase.rpc('rpc_complete_delivery', {
        p_staff_user_id: res.locals.authUser.id,
        p_order_id: req.params.orderId,
        p_warehouse_id: body.warehouseId ?? null,
        p_delivery_note: body.deliveryNote ?? null,
      });

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.json({ delivery: data });
    },
  );

  // Staff Management (Strictly Super Administrator ONLY)
  const superAdminGuard = requireVerifiedRole(['super_admin'], authResolver);

  router.get('/staff', superAdminGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const { data, error } = await supabase
      .from('staff_accounts')
      .select('id, user_id, department, is_active, created_at, roles(slug, name), user_profiles(full_name, email)');
    if (error) {
      res.status(500).json({ error: 'Failed to load staff accounts' });
      return;
    }
    res.json({ staff: data ?? [] });
  });

  router.post(
    '/staff',
    superAdminGuard,
    validateBody(staffAppointSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient()!;
      const body = req.body as z.infer<typeof staffAppointSchema>;

      const { data: roleRow } = await supabase
        .from('roles')
        .select('id')
        .eq('slug', body.roleSlug)
        .maybeSingle();

      if (!roleRow) {
        res.status(400).json({ error: 'Invalid roleSlug' });
        return;
      }

      const { error: profileErr } = await supabase
        .from('user_profiles')
        .update({ account_type: 'staff' })
        .eq('id', body.userId);

      if (profileErr) {
        res.status(400).json({ error: profileErr.message });
        return;
      }

      const { data, error } = await supabase
        .from('staff_accounts')
        .insert({
          user_id: body.userId,
          role_id: roleRow.id,
          department: body.department,
          is_active: true,
          appointed_by: res.locals.authUser.id,
        })
        .select('*')
        .single();

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }

      await supabase.from('audit_logs').insert({
        actor_user_id: res.locals.authUser.id,
        actor_role: 'super_admin',
        action: 'STAFF_APPOINTED',
        entity_table: 'staff_accounts',
        entity_id: data.id,
        after_snapshot: sanitizeAuditSnapshot({
          user_id: body.userId,
          role: body.roleSlug,
          department: body.department,
        }),
      });

      res.status(201).json({ staff: data });
    },
  );

  router.patch(
    '/staff/:id',
    superAdminGuard,
    validateBody(staffUpdateSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient()!;
      const body = req.body as z.infer<typeof staffUpdateSchema>;

      const updates: Record<string, unknown> = {};
      if (body.department !== undefined) updates.department = body.department;
      if (body.isActive !== undefined) updates.is_active = body.isActive;
      if (body.roleSlug !== undefined) {
        const { data: roleRow } = await supabase
          .from('roles')
          .select('id')
          .eq('slug', body.roleSlug)
          .maybeSingle();
        if (!roleRow) {
          res.status(400).json({ error: 'Invalid roleSlug' });
          return;
        }
        updates.role_id = roleRow.id;
      }

      const { data, error } = await supabase
        .from('staff_accounts')
        .update(updates)
        .eq('id', req.params.id)
        .select('*')
        .single();

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }

      await supabase.from('audit_logs').insert({
        actor_user_id: res.locals.authUser.id,
        actor_role: 'super_admin',
        action: 'STAFF_UPDATED',
        entity_table: 'staff_accounts',
        entity_id: data.id,
        after_snapshot: sanitizeAuditSnapshot(body),
      });

      res.json({ staff: data });
    },
  );

  // Reports & Audit Logs
  router.get('/reports/summary', financeGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const { count: orderCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true });
    const { count: pendingTransfers } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Awaiting Verification');

    res.json({
      ordersTotalCount: orderCount ?? 0,
      awaitingBankTransferVerificationCount: pendingTransfers ?? 0,
    });
  });

  router.get(
    '/audit-logs',
    requireVerifiedRole(['super_admin', 'admin'], authResolver),
    async (_req, res) => {
      const supabase = authResolver.getAdminClient()!;
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, actor_user_id, actor_role, action, entity_table, entity_id, after_snapshot, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        res.status(500).json({ error: 'Failed to load audit logs' });
        return;
      }
      res.json({ auditLogs: data ?? [] });
    },
  );

  return router;
}
