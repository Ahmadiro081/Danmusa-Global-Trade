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

const CUSTOMER_ALLOWED_ROLES = [
  'registered_customer',
  ...STAFF_ROLE_SLUGS,
] as const;

const profilePatchSchema = z
  .object({
    fullName: z.string().min(2).max(120).optional(),
    phone: z.string().min(7).max(30).optional(),
    defaultStateId: z.string().uuid().optional(),
  })
  .strict();

const addressCreateSchema = z
  .object({
    label: z.string().min(2).max(60),
    recipientName: z.string().min(2).max(120),
    phone: z.string().min(7).max(30),
    stateId: z.string().uuid(),
    city: z.string().min(2).max(100),
    streetLine: z.string().min(5).max(300),
    landmark: z.string().max(150).optional(),
    isDefault: z.boolean().optional(),
  })
  .strict();

const cartItemSchema = z
  .object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(1000),
  })
  .strict();

const checkoutSchema = z
  .object({
    addressId: z.string().uuid(),
    warehouseId: z.string().uuid(),
    items: z
      .array(
        z.object({
          product_id: z.string().uuid(),
          quantity: z.number().int().min(1).max(1000),
        }),
      )
      .min(1)
      .max(50),
    idempotencyKey: z.string().min(8).max(128),
  })
  .strict();

const sourcingCreateSchema = z
  .object({
    productTitle: z.string().min(3).max(160),
    categoryName: z.string().min(2).max(80),
    description: z.string().min(10).max(2000),
    targetQuantity: z.number().int().positive(),
    targetBudgetNgn: z.number().positive().optional(),
    destinationStateId: z.string().uuid().optional(),
    referenceImageUrl: z.string().url().optional(),
    cloudinaryPublicId: z.string().max(200).optional(),
  })
  .strict();

const acceptQuotationSchema = z
  .object({
    addressId: z.string().uuid(),
    allowPartialPayment: z.boolean().optional(),
    idempotencyKey: z.string().min(8).max(128).optional(),
  })
  .strict();

const bankTransferSubmitSchema = z
  .object({
    orderId: z.string().uuid(),
    amountNgn: z.number().positive(),
    bankReference: z.string().min(4).max(120),
    senderBankName: z.string().min(2).max(100),
    senderAccountName: z.string().min(2).max(120),
    transferDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    storageObjectPath: z.string().min(5).max(500),
    mimeType: z.enum([
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ]),
    fileSizeBytes: z.number().int().positive().max(10_485_760),
    idempotencyKey: z.string().min(8).max(128),
  })
  .strict();

export function createCustomerRouter(
  authResolver: AuthResolver = defaultAuthResolver,
): Router {
  const router = Router();
  const guard = requireVerifiedRole(CUSTOMER_ALLOWED_ROLES, authResolver);

  // Profile
  router.get('/profile', guard, async (_req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const userId = res.locals.authUser.id as string;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, phone, account_type, default_state_id, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: 'Failed to load profile' });
      return;
    }
    res.json({ profile: data });
  });

  router.patch(
    '/profile',
    guard,
    validateBody(profilePatchSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient()!;
      const userId = res.locals.authUser.id as string;
      const body = req.body as z.infer<typeof profilePatchSchema>;

      const updates: Record<string, unknown> = {};
      if (body.fullName !== undefined) updates.full_name = body.fullName;
      if (body.phone !== undefined) updates.phone = body.phone;
      if (body.defaultStateId !== undefined)
        updates.default_state_id = body.defaultStateId;

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select('id, full_name, email, phone, account_type, default_state_id')
        .single();

      if (error) {
        res.status(400).json({ error: 'Failed to update profile' });
        return;
      }
      res.json({ profile: data });
    },
  );

  // Addresses (strictly isolated to customer_id = authUser.id)
  router.get('/addresses', guard, async (_req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const userId = res.locals.authUser.id as string;
    const { data, error } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', userId)
      .order('is_default', { ascending: false });

    if (error) {
      res.status(500).json({ error: 'Failed to load addresses' });
      return;
    }
    res.json({ addresses: data ?? [] });
  });

  router.post(
    '/addresses',
    guard,
    validateBody(addressCreateSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient()!;
      const userId = res.locals.authUser.id as string;
      const body = req.body as z.infer<typeof addressCreateSchema>;

      const { data, error } = await supabase
        .from('customer_addresses')
        .insert({
          customer_id: userId,
          label: body.label,
          recipient_name: body.recipientName,
          phone: body.phone,
          state_id: body.stateId,
          city: body.city,
          street_line: body.streetLine,
          landmark: body.landmark ?? null,
          is_default: body.isDefault ?? false,
        })
        .select('*')
        .single();

      if (error) {
        res.status(400).json({ error: 'Failed to save address' });
        return;
      }
      res.status(201).json({ address: data });
    },
  );

  router.delete('/addresses/:id', guard, async (req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const userId = res.locals.authUser.id as string;
    const { error } = await supabase
      .from('customer_addresses')
      .delete()
      .eq('id', req.params.id)
      .eq('customer_id', userId);

    if (error) {
      res.status(400).json({ error: 'Failed to delete address' });
      return;
    }
    res.status(204).send();
  });

  // Persistent Shopping Cart
  router.get('/cart', guard, async (_req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const userId = res.locals.authUser.id as string;

    const { data: cart, error } = await supabase
      .from('shopping_carts')
      .select('id, cart_items(id, product_id, quantity, products(id, sku, name, slug, base_price, base_currency, fulfillment_mode))')
      .eq('customer_id', userId)
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: 'Failed to load shopping cart' });
      return;
    }
    res.json({ cart: cart ?? { id: null, cart_items: [] } });
  });

  router.post(
    '/cart/items',
    guard,
    validateBody(cartItemSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient()!;
      const userId = res.locals.authUser.id as string;
      const body = req.body as z.infer<typeof cartItemSchema>;

      const { data: cartRow, error: cartErr } = await supabase
        .from('shopping_carts')
        .upsert({ customer_id: userId }, { onConflict: 'customer_id' })
        .select('id')
        .single();

      if (cartErr || !cartRow) {
        res.status(500).json({ error: 'Failed to initialize cart' });
        return;
      }

      const { data, error } = await supabase
        .from('cart_items')
        .upsert(
          {
            cart_id: cartRow.id,
            product_id: body.productId,
            quantity: body.quantity,
          },
          { onConflict: 'cart_id,product_id' },
        )
        .select('*')
        .single();

      if (error) {
        res.status(400).json({ error: 'Failed to update cart item' });
        return;
      }
      res.status(201).json({ item: data });
    },
  );

  // Ready-Stock Atomic Checkout (Bank Transfer Only — Paystack postponed)
  router.post(
    '/checkout',
    guard,
    validateBody(checkoutSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient()!;
      const userId = res.locals.authUser.id as string;
      const body = req.body as z.infer<typeof checkoutSchema>;

      const { data, error } = await supabase.rpc('rpc_create_ready_stock_order', {
        p_customer_id: userId,
        p_address_id: body.addressId,
        p_warehouse_id: body.warehouseId,
        p_items: body.items,
        p_idempotency_key: body.idempotencyKey,
      });

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }

      const { data: bankSettings } = await supabase
        .from('system_settings')
        .select('value_json')
        .eq('key', 'bank_transfer_instructions')
        .maybeSingle();

      res.status(201).json({
        order: data,
        paymentMethod: 'bank_transfer',
        bankInstructions: bankSettings?.value_json ?? {
          note: 'Official DGT bank transfer instructions will appear once configured by Super Administrator.',
        },
      });
    },
  );

  // Customer Order History & Detail (strictly customer_id = authUser.id)
  router.get('/orders', guard, async (_req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const userId = res.locals.authUser.id as string;

    const { data, error } = await supabase
      .from('orders')
      .select(
        'id, order_number, order_type, total_ngn, amount_paid_ngn, outstanding_balance_ngn, order_status, payment_status, created_at',
      )
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: 'Failed to load orders' });
      return;
    }
    res.json({ orders: data ?? [] });
  });

  router.get('/orders/:id', guard, async (req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const userId = res.locals.authUser.id as string;

    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), payments(*)')
      .eq('id', req.params.id)
      .eq('customer_id', userId)
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: 'Failed to load order' });
      return;
    }
    if (!data) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json({ order: data });
  });

  // Order Tracking (scoped through customer-owned order)
  router.get('/orders/:id/tracking', guard, async (req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const userId = res.locals.authUser.id as string;

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, order_number, order_status')
      .eq('id', req.params.id)
      .eq('customer_id', userId)
      .maybeSingle();

    if (orderErr) {
      res.status(500).json({ error: 'Failed to query order tracking' });
      return;
    }
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const { data: shipments, error: shipErr } = await supabase
      .from('shipments')
      .select('*, shipment_milestones(*)')
      .eq('order_id', order.id);

    if (shipErr) {
      res.status(500).json({ error: 'Failed to load shipment milestones' });
      return;
    }
    res.json({ order, shipments: shipments ?? [] });
  });

  // Wholesale Sourcing Requests
  router.get('/sourcing-requests', guard, async (_req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const userId = res.locals.authUser.id as string;

    const { data, error } = await supabase
      .from('wholesale_sourcing_requests')
      .select('*')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: 'Failed to load sourcing requests' });
      return;
    }
    res.json({ requests: data ?? [] });
  });

  router.post(
    '/sourcing-requests',
    guard,
    validateBody(sourcingCreateSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient()!;
      const userId = res.locals.authUser.id as string;
      const body = req.body as z.infer<typeof sourcingCreateSchema>;
      const requestNumber = `DGT-SRC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      const { data, error } = await supabase
        .from('wholesale_sourcing_requests')
        .insert({
          request_number: requestNumber,
          customer_id: userId,
          product_title: body.productTitle,
          category_name: body.categoryName,
          description: body.description,
          target_quantity: body.targetQuantity,
          target_budget_ngn: body.targetBudgetNgn ?? null,
          destination_state_id: body.destinationStateId ?? null,
          reference_image_url: body.referenceImageUrl ?? null,
          cloudinary_public_id: body.cloudinaryPublicId ?? null,
          status: 'submitted',
        })
        .select('*')
        .single();

      if (error) {
        res.status(400).json({ error: 'Failed to create sourcing request' });
        return;
      }

      await supabase.from('audit_logs').insert({
        actor_user_id: userId,
        actor_role: res.locals.authRole,
        action: 'SOURCING_REQUEST_CREATED',
        entity_table: 'wholesale_sourcing_requests',
        entity_id: data.id,
        after_snapshot: sanitizeAuditSnapshot({
          request_number: requestNumber,
          target_quantity: body.targetQuantity,
        }),
      });

      res.status(201).json({ request: data });
    },
  );

  // Customer Quotation Review & Acceptance
  router.get('/quotations', guard, async (_req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const userId = res.locals.authUser.id as string;

    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: 'Failed to load quotations' });
      return;
    }
    res.json({ quotations: data ?? [] });
  });

  router.post(
    '/quotations/:id/accept',
    guard,
    validateBody(acceptQuotationSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient()!;
      const userId = res.locals.authUser.id as string;
      const body = req.body as z.infer<typeof acceptQuotationSchema>;

      const { data, error } = await supabase.rpc('rpc_accept_quotation', {
        p_customer_id: userId,
        p_quotation_id: req.params.id,
        p_address_id: body.addressId,
        p_allow_partial_payment: body.allowPartialPayment ?? true,
        p_idempotency_key: body.idempotencyKey ?? null,
      });

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(201).json({ result: data });
    },
  );

  // Bank Transfer Evidence Submission (Private Storage Object Path)
  router.get('/payments', guard, async (_req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const userId = res.locals.authUser.id as string;

    const { data, error } = await supabase
      .from('payments')
      .select('*, payment_evidences(id, mime_type, file_size_bytes, uploaded_at)')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: 'Failed to load payments' });
      return;
    }
    res.json({ payments: data ?? [] });
  });

  router.post(
    '/payments/bank-transfer',
    guard,
    validateBody(bankTransferSubmitSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient()!;
      const userId = res.locals.authUser.id as string;
      const body = req.body as z.infer<typeof bankTransferSubmitSchema>;

      // Enforce private folder scoping: storageObjectPath MUST belong to `${userId}/...`
      if (
        !body.storageObjectPath.startsWith(`${userId}/`) ||
        body.storageObjectPath.includes('..')
      ) {
        res.status(403).json({
          error: 'Forbidden: payment evidence path must reside inside customer private folder',
          code: 'INVALID_EVIDENCE_PATH',
        });
        return;
      }

      const { data, error } = await supabase.rpc(
        'rpc_submit_bank_transfer_evidence',
        {
          p_customer_id: userId,
          p_order_id: body.orderId,
          p_amount_ngn: body.amountNgn,
          p_bank_reference: body.bankReference,
          p_sender_bank_name: body.senderBankName,
          p_sender_account_name: body.senderAccountName,
          p_transfer_date: body.transferDate,
          p_storage_object_path: body.storageObjectPath,
          p_mime_type: body.mimeType,
          p_file_size_bytes: body.fileSizeBytes,
          p_idempotency_key: body.idempotencyKey,
        },
      );

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(201).json({ payment: data });
    },
  );

  router.get('/payments/:paymentId/evidence-url', guard, async (req, res) => {
    const supabase = authResolver.getAdminClient()!;
    const userId = res.locals.authUser.id as string;

    const { data: evidence, error } = await supabase
      .from('payment_evidences')
      .select('storage_bucket, storage_object_path')
      .eq('payment_id', req.params.paymentId)
      .eq('customer_id', userId)
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
      res.status(500).json({ error: 'Failed to generate private evidence URL' });
      return;
    }

    res.json({ signedUrl: signed.signedUrl, expiresInSeconds: 60 });
  });

  return router;
}
