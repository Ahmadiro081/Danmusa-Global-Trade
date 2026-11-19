// Generated from server/vercel.ts by esbuild; do not edit directly.

// server/app.ts
import express from "express";

// server/config/env.ts
import "dotenv/config";
function isValidHttpUrl(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("MY_")) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
function isConfiguredValue(value) {
  const trimmed = value.trim();
  return trimmed.length > 0 && !trimmed.startsWith("MY_");
}
var serverEnv = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3e3),
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  whatsappBusinessToken: process.env.WHATSAPP_BUSINESS_TOKEN ?? "",
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? ""
};
function getIntegrationReadiness() {
  const validSupabaseUrl = isValidHttpUrl(serverEnv.supabaseUrl);
  return {
    supabaseClient: validSupabaseUrl && isConfiguredValue(serverEnv.supabaseAnonKey),
    supabaseAdmin: validSupabaseUrl && isConfiguredValue(serverEnv.supabaseServiceRoleKey),
    cloudinary: isConfiguredValue(serverEnv.cloudinaryCloudName) && isConfiguredValue(serverEnv.cloudinaryApiKey) && isConfiguredValue(serverEnv.cloudinaryApiSecret),
    resend: isConfiguredValue(serverEnv.resendApiKey),
    whatsapp: isConfiguredValue(serverEnv.whatsappBusinessToken) && isConfiguredValue(serverEnv.whatsappPhoneNumberId)
  };
}

// server/services/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";
var cachedAdminClient = null;
function getSupabaseAdmin() {
  if (!getIntegrationReadiness().supabaseAdmin) {
    return null;
  }
  if (!cachedAdminClient) {
    cachedAdminClient = createClient(
      serverEnv.supabaseUrl.trim(),
      serverEnv.supabaseServiceRoleKey.trim(),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }
  return cachedAdminClient;
}

// server/middleware/security.ts
var STAFF_ROLE_SLUGS = [
  "super_admin",
  "admin",
  "product_manager",
  "order_manager",
  "finance_manager",
  "sourcing_manager",
  "logistics_manager",
  "customer_support"
];
var SENSITIVE_KEY_PATTERN = /password|secret|token|api_?key|authorization|cookie|service_role/i;
function sanitizeAuditSnapshot(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const clean = {};
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(k)) {
      clean[k] = "[REDACTED]";
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      clean[k] = sanitizeAuditSnapshot(v);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}
function createSupabaseAuthResolver(getClient) {
  return {
    getAdminClient: getClient,
    async resolveSession(token) {
      const supabaseAdmin = getClient();
      if (!supabaseAdmin) {
        return {
          ok: false,
          status: 503,
          code: "SUPABASE_NOT_CONFIGURED",
          error: "Protected administrative and customer endpoints fail closed until Supabase Auth and PostgreSQL credentials are configured."
        };
      }
      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (userError || !userData.user) {
        return {
          ok: false,
          status: 401,
          code: "INVALID_SESSION",
          error: "Invalid or expired session token"
        };
      }
      const { data: profileRow, error: profileError } = await supabaseAdmin.from("user_profiles").select("id, account_type").eq("id", userData.user.id).maybeSingle();
      if (profileError) {
        const classified = classifySupabaseError(profileError, "Authorization profile check failed");
        return {
          ok: false,
          status: classified.status,
          code: classified.code,
          error: classified.error
        };
      }
      const { data: staffRow, error: staffError } = await supabaseAdmin.from("staff_accounts").select("id, is_active, roles(slug)").eq("user_id", userData.user.id).maybeSingle();
      if (staffError) {
        const classified = classifySupabaseError(staffError, "Authorization check failed");
        return {
          ok: false,
          status: classified.status,
          code: classified.code,
          error: classified.error
        };
      }
      const roleRelation = staffRow?.roles;
      const isVerifiedActiveStaff = Boolean(staffRow?.is_active) && profileRow?.account_type === "staff" && Boolean(roleRelation?.slug) && STAFF_ROLE_SLUGS.includes(roleRelation.slug);
      const resolvedRole = isVerifiedActiveStaff ? roleRelation.slug : "registered_customer";
      return {
        ok: true,
        context: {
          user: { id: userData.user.id, email: userData.user.email },
          role: resolvedRole,
          staffAccountId: isVerifiedActiveStaff ? staffRow?.id ?? null : null
        }
      };
    }
  };
}
var defaultAuthResolver = createSupabaseAuthResolver(() => {
  const readiness = getIntegrationReadiness();
  return readiness.supabaseAdmin ? getSupabaseAdmin() : null;
});
function applySecurityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
}
function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      });
      return;
    }
    req.body = parsed.data;
    next();
  };
}
function requireVerifiedRole(allowedRoles, authResolver = defaultAuthResolver) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      if (!authResolver.getAdminClient()) {
        res.status(503).json({
          error: "Authentication service not yet configured",
          code: "SUPABASE_NOT_CONFIGURED",
          message: "Protected administrative and customer endpoints fail closed until Supabase Auth and PostgreSQL credentials are configured."
        });
        return;
      }
      res.status(401).json({
        error: "Unauthorized",
        code: "MISSING_BEARER_TOKEN"
      });
      return;
    }
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      res.status(401).json({
        error: "Unauthorized",
        code: "EMPTY_BEARER_TOKEN"
      });
      return;
    }
    const result = await authResolver.resolveSession(token);
    if (!result.ok) {
      res.status(result.status).json({
        error: result.error,
        code: result.code
      });
      return;
    }
    if (!allowedRoles.includes(result.context.role)) {
      res.status(403).json({
        error: "Forbidden: insufficient permissions",
        code: "INSUFFICIENT_ROLE"
      });
      return;
    }
    res.locals.authUser = result.context.user;
    res.locals.authRole = result.context.role;
    res.locals.staffAccountId = result.context.staffAccountId;
    next();
  };
}
function requireDatabaseClient(authResolver = defaultAuthResolver) {
  return (_req, res, next) => {
    const client = authResolver.getAdminClient();
    if (!client) {
      res.status(503).json({
        error: "Database service not yet configured",
        code: "SUPABASE_NOT_CONFIGURED"
      });
      return;
    }
    res.locals.supabaseAdmin = client;
    next();
  };
}
function classifySupabaseError(err, fallbackMessage) {
  const code = err?.code ?? "";
  const message = err?.message ?? "";
  if (code === "42P01" || code === "PGRST205" || /schema cache|does not exist/i.test(message)) {
    return {
      status: 503,
      code: "DATABASE_NOT_INITIALIZED",
      error: "Database schema is not initialized yet. Apply the Supabase SQL migrations first."
    };
  }
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|Invalid API key/i.test(
    message
  )) {
    return {
      status: 503,
      code: "DATABASE_UNAVAILABLE",
      error: "Database service is unavailable or unreachable."
    };
  }
  return {
    status: 500,
    code: "DATABASE_QUERY_ERROR",
    error: fallbackMessage
  };
}
function sendDatabaseError(res, err, fallbackMessage) {
  const classified = classifySupabaseError(err, fallbackMessage);
  res.status(classified.status).json({
    error: classified.error,
    code: classified.code
  });
}
function apiErrorHandler(err, _req, res, _next) {
  console.error("[DGT API Error]", err.message);
  res.status(500).json({
    error: "Internal server error",
    code: "INTERNAL_ERROR"
  });
}

// server/routes/admin.ts
import { Router } from "express";
import { z } from "zod";
var productCreateSchema = z.object({
  sku: z.string().min(3).max(60),
  categoryId: z.string().uuid(),
  name: z.string().min(3).max(160),
  slug: z.string().min(3).max(160),
  fulfillmentMode: z.enum(["ready_stock", "pre_order"]),
  baseCurrency: z.enum(["NGN", "CNY", "USD"]).default("NGN"),
  basePrice: z.number().nonnegative(),
  estimatedWeightKg: z.number().nonnegative().optional(),
  estimatedVolumeCbm: z.number().nonnegative().optional(),
  shippingMethod: z.enum(["weight_based", "volume_based", "product_based", "custom_quotation"]).default("weight_based"),
  moq: z.number().int().positive().default(1),
  description: z.string().min(5).max(5e3),
  isFeatured: z.boolean().optional()
}).strict();
var categoryCreateSchema = z.object({
  parentId: z.string().uuid().optional(),
  slug: z.string().min(2).max(100),
  name: z.string().min(2).max(120),
  description: z.string().max(1e3).optional(),
  sortOrder: z.number().int().default(0)
}).strict();
var inventoryAdjustSchema = z.object({
  quantityOnHand: z.number().int().nonnegative(),
  reorderPoint: z.number().int().nonnegative().optional()
}).strict();
var quotationCreateSchema = z.object({
  customerId: z.string().uuid(),
  sourcingRequestId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  supplierCostCny: z.number().nonnegative(),
  exchangeRateCnyNgn: z.number().positive(),
  shippingMethod: z.enum([
    "weight_based",
    "volume_based",
    "product_based",
    "custom_quotation"
  ]),
  shippingFeeUsd: z.number().nonnegative(),
  exchangeRateUsdNgn: z.number().positive(),
  serviceMarginNgn: z.number().nonnegative().default(0),
  validUntil: z.string().datetime()
}).strict();
var bankTransferVerifySchema = z.object({
  decision: z.enum(["approve", "reject"]),
  rejectionReason: z.string().min(5).max(500).optional()
}).strict();
var supplierCreateSchema = z.object({
  name: z.string().min(2).max(160),
  cityChina: z.string().min(2).max(100),
  provinceChina: z.string().min(2).max(100),
  specialty: z.string().min(2).max(200),
  contactNotes: z.string().max(1e3).optional()
}).strict();
var procurementCreateSchema = z.object({
  orderId: z.string().uuid(),
  supplierId: z.string().uuid(),
  costCny: z.number().positive()
}).strict();
var shipmentStageSchema = z.object({
  nextStage: z.enum([
    "procurement_in_china",
    "received_at_china_warehouse",
    "preparing_for_shipment",
    "shipped_from_china",
    "in_transit",
    "arrived_in_nigeria",
    "customs_clearance",
    "released_from_customs",
    "received_at_nigeria_warehouse",
    "ready_for_local_delivery"
  ]),
  locationNote: z.string().max(300).optional()
}).strict();
var stateDeliveryUpdateSchema = z.object({
  baseDeliveryFeeNgn: z.number().nonnegative(),
  estimatedTransitDays: z.number().int().positive().max(60),
  isActive: z.boolean().optional()
}).strict();
var completeDeliverySchema = z.object({
  warehouseId: z.string().uuid().optional(),
  deliveryNote: z.string().max(500).optional()
}).strict();
var staffAppointSchema = z.object({
  userId: z.string().uuid(),
  roleSlug: z.enum([
    "super_admin",
    "admin",
    "product_manager",
    "order_manager",
    "finance_manager",
    "sourcing_manager",
    "logistics_manager",
    "customer_support"
  ]),
  department: z.string().min(2).max(100)
}).strict();
var staffUpdateSchema = z.object({
  roleSlug: z.enum([
    "super_admin",
    "admin",
    "product_manager",
    "order_manager",
    "finance_manager",
    "sourcing_manager",
    "logistics_manager",
    "customer_support"
  ]).optional(),
  department: z.string().min(2).max(100).optional(),
  isActive: z.boolean().optional()
}).strict();
function createAdminRouter(authResolver = defaultAuthResolver) {
  const router = Router();
  router.get(
    "/foundation-status",
    requireVerifiedRole(STAFF_ROLE_SLUGS, authResolver),
    (_req, res) => {
      res.json({
        authorized: true,
        role: res.locals.authRole,
        staffAccountId: res.locals.staffAccountId,
        message: "Verified staff session active."
      });
    }
  );
  const productGuard = requireVerifiedRole(
    ["super_admin", "admin", "product_manager"],
    authResolver
  );
  router.get("/products", productGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient();
    const { data, error } = await supabase.from("products").select("*, categories(name, slug)").order("created_at", { ascending: false });
    if (error) {
      res.status(500).json({ error: "Failed to load products" });
      return;
    }
    res.json({ products: data ?? [] });
  });
  router.post(
    "/products",
    productGuard,
    validateBody(productCreateSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient();
      const body = req.body;
      const { data, error } = await supabase.from("products").insert({
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
        is_featured: body.isFeatured ?? false
      }).select("*").single();
      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      await supabase.from("audit_logs").insert({
        actor_user_id: res.locals.authUser.id,
        actor_role: res.locals.authRole,
        action: "PRODUCT_CREATED",
        entity_table: "products",
        entity_id: data.id,
        after_snapshot: sanitizeAuditSnapshot(data)
      });
      res.status(201).json({ product: data });
    }
  );
  router.get("/categories", productGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient();
    const { data, error } = await supabase.from("categories").select("*").order("sort_order", { ascending: true });
    if (error) {
      res.status(500).json({ error: "Failed to load categories" });
      return;
    }
    res.json({ categories: data ?? [] });
  });
  router.post(
    "/categories",
    productGuard,
    validateBody(categoryCreateSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient();
      const body = req.body;
      const { data, error } = await supabase.from("categories").insert({
        parent_id: body.parentId ?? null,
        slug: body.slug,
        name: body.name,
        description: body.description ?? null,
        sort_order: body.sortOrder
      }).select("*").single();
      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(201).json({ category: data });
    }
  );
  const inventoryGuard = requireVerifiedRole(
    ["super_admin", "admin", "product_manager", "logistics_manager"],
    authResolver
  );
  router.get("/inventory", inventoryGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient();
    const { data, error } = await supabase.from("inventory_balances").select("*, products(sku, name), warehouses(code, name, country)");
    if (error) {
      res.status(500).json({ error: "Failed to load inventory" });
      return;
    }
    res.json({ inventory: data ?? [] });
  });
  router.patch(
    "/inventory/:id",
    inventoryGuard,
    validateBody(inventoryAdjustSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient();
      const body = req.body;
      const { data, error } = await supabase.from("inventory_balances").update({
        quantity_on_hand: body.quantityOnHand,
        ...body.reorderPoint !== void 0 ? { reorder_point: body.reorderPoint } : {}
      }).eq("id", req.params.id).select("*").single();
      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      await supabase.from("audit_logs").insert({
        actor_user_id: res.locals.authUser.id,
        actor_role: res.locals.authRole,
        action: "INVENTORY_ADJUSTED",
        entity_table: "inventory_balances",
        entity_id: data.id,
        after_snapshot: sanitizeAuditSnapshot(body)
      });
      res.json({ inventory: data });
    }
  );
  const orderStaffGuard = requireVerifiedRole(
    ["super_admin", "admin", "order_manager", "customer_support"],
    authResolver
  );
  router.get("/customers", orderStaffGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient();
    const { data, error } = await supabase.from("user_profiles").select("id, full_name, email, phone, account_type, default_state_id, created_at").eq("account_type", "registered_customer").order("created_at", { ascending: false });
    if (error) {
      res.status(500).json({ error: "Failed to load customers" });
      return;
    }
    res.json({ customers: data ?? [] });
  });
  router.get("/orders", orderStaffGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient();
    const { data, error } = await supabase.from("orders").select("*, user_profiles(full_name, email)").order("created_at", { ascending: false });
    if (error) {
      res.status(500).json({ error: "Failed to load orders" });
      return;
    }
    res.json({ orders: data ?? [] });
  });
  const sourcingGuard = requireVerifiedRole(
    ["super_admin", "admin", "sourcing_manager"],
    authResolver
  );
  router.get("/sourcing-requests", sourcingGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient();
    const { data, error } = await supabase.from("wholesale_sourcing_requests").select("*").order("created_at", { ascending: false });
    if (error) {
      res.status(500).json({ error: "Failed to load sourcing requests" });
      return;
    }
    res.json({ requests: data ?? [] });
  });
  router.get(
    "/quotations",
    requireVerifiedRole(
      ["super_admin", "admin", "sourcing_manager", "finance_manager"],
      authResolver
    ),
    async (_req, res) => {
      const supabase = authResolver.getAdminClient();
      const { data, error } = await supabase.from("quotations").select("*").order("created_at", { ascending: false });
      if (error) {
        res.status(500).json({ error: "Failed to load quotations" });
        return;
      }
      res.json({ quotations: data ?? [] });
    }
  );
  router.post(
    "/quotations",
    requireVerifiedRole(
      ["super_admin", "admin", "sourcing_manager", "finance_manager"],
      authResolver
    ),
    validateBody(quotationCreateSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient();
      const body = req.body;
      const supplierNgn = body.supplierCostCny * body.exchangeRateCnyNgn;
      const shippingNgn = body.shippingFeeUsd * body.exchangeRateUsdNgn;
      const totalPayableNgn = Math.round((supplierNgn + shippingNgn + body.serviceMarginNgn) * 100) / 100;
      const quoteNumber = `DGT-QTE-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const { data, error } = await supabase.from("quotations").insert({
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
        status: "sent",
        created_by: res.locals.staffAccountId
      }).select("*").single();
      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      await supabase.from("audit_logs").insert({
        actor_user_id: res.locals.authUser.id,
        actor_role: res.locals.authRole,
        action: "QUOTATION_ISSUED",
        entity_table: "quotations",
        entity_id: data.id,
        after_snapshot: sanitizeAuditSnapshot({
          quote_number: quoteNumber,
          total_payable_ngn: totalPayableNgn
        })
      });
      res.status(201).json({ quotation: data });
    }
  );
  const financeGuard = requireVerifiedRole(
    ["super_admin", "admin", "finance_manager"],
    authResolver
  );
  router.get("/payments/bank-transfers", financeGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient();
    const { data, error } = await supabase.from("payments").select(
      "*, orders(order_number, total_ngn, amount_paid_ngn, outstanding_balance_ngn), payment_evidences(id, mime_type, file_size_bytes, uploaded_at)"
    ).eq("method", "bank_transfer").order("created_at", { ascending: false });
    if (error) {
      res.status(500).json({ error: "Failed to load bank transfer queue" });
      return;
    }
    res.json({ payments: data ?? [] });
  });
  router.get(
    "/payments/:paymentId/evidence-url",
    financeGuard,
    async (req, res) => {
      const supabase = authResolver.getAdminClient();
      const { data: evidence, error } = await supabase.from("payment_evidences").select("storage_bucket, storage_object_path").eq("payment_id", req.params.paymentId).order("uploaded_at", { ascending: false }).limit(1).maybeSingle();
      if (error || !evidence) {
        res.status(404).json({ error: "Payment evidence not found" });
        return;
      }
      const { data: signed, error: signErr } = await supabase.storage.from(evidence.storage_bucket).createSignedUrl(evidence.storage_object_path, 60);
      if (signErr || !signed) {
        res.status(500).json({ error: "Failed to create signed review URL" });
        return;
      }
      res.json({ signedUrl: signed.signedUrl, expiresInSeconds: 60 });
    }
  );
  router.post(
    "/payments/:paymentId/verify",
    financeGuard,
    validateBody(bankTransferVerifySchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient();
      const body = req.body;
      if (body.decision === "reject" && !body.rejectionReason) {
        res.status(400).json({
          error: "rejectionReason is required when rejecting a bank transfer"
        });
        return;
      }
      const { data, error } = await supabase.rpc(
        "rpc_verify_bank_transfer_payment",
        {
          p_staff_user_id: res.locals.authUser.id,
          p_payment_id: req.params.paymentId,
          p_decision: body.decision,
          p_rejection_reason: body.rejectionReason ?? null
        }
      );
      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.json({ verification: data });
    }
  );
  router.get("/suppliers", sourcingGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient();
    const { data, error } = await supabase.from("suppliers").select("*").order("name", { ascending: true });
    if (error) {
      res.status(500).json({ error: "Failed to load suppliers" });
      return;
    }
    res.json({ suppliers: data ?? [] });
  });
  router.post(
    "/suppliers",
    sourcingGuard,
    validateBody(supplierCreateSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient();
      const body = req.body;
      const { data, error } = await supabase.from("suppliers").insert({
        name: body.name,
        city_china: body.cityChina,
        province_china: body.provinceChina,
        specialty: body.specialty,
        contact_notes: body.contactNotes ?? null
      }).select("*").single();
      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(201).json({ supplier: data });
    }
  );
  router.post(
    "/procurement",
    sourcingGuard,
    validateBody(procurementCreateSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient();
      const body = req.body;
      const { data, error } = await supabase.rpc("rpc_create_procurement_order", {
        p_staff_user_id: res.locals.authUser.id,
        p_order_id: body.orderId,
        p_supplier_id: body.supplierId,
        p_cost_cny: body.costCny
      });
      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(201).json({ procurement: data });
    }
  );
  const logisticsGuard = requireVerifiedRole(
    ["super_admin", "admin", "logistics_manager"],
    authResolver
  );
  router.get("/shipments", logisticsGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient();
    const { data, error } = await supabase.from("shipments").select("*, shipment_milestones(*)").order("created_at", { ascending: false });
    if (error) {
      res.status(500).json({ error: "Failed to load shipments" });
      return;
    }
    res.json({ shipments: data ?? [] });
  });
  router.post(
    "/shipments/:id/stage",
    logisticsGuard,
    validateBody(shipmentStageSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient();
      const body = req.body;
      const { data, error } = await supabase.rpc("rpc_update_shipment_stage", {
        p_staff_user_id: res.locals.authUser.id,
        p_shipment_id: req.params.id,
        p_next_stage: body.nextStage,
        p_location_note: body.locationNote ?? null
      });
      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.json({ shipment: data });
    }
  );
  router.patch(
    "/deliveries/states/:id",
    logisticsGuard,
    validateBody(stateDeliveryUpdateSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient();
      const body = req.body;
      const { data, error } = await supabase.from("nigerian_states").update({
        base_delivery_fee_ngn: body.baseDeliveryFeeNgn,
        estimated_transit_days: body.estimatedTransitDays,
        ...body.isActive !== void 0 ? { is_active: body.isActive } : {}
      }).eq("id", req.params.id).select("*").single();
      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.json({ state: data });
    }
  );
  router.post(
    "/deliveries/orders/:orderId/complete",
    requireVerifiedRole(
      ["super_admin", "admin", "logistics_manager", "order_manager"],
      authResolver
    ),
    validateBody(completeDeliverySchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient();
      const body = req.body;
      const { data, error } = await supabase.rpc("rpc_complete_delivery", {
        p_staff_user_id: res.locals.authUser.id,
        p_order_id: req.params.orderId,
        p_warehouse_id: body.warehouseId ?? null,
        p_delivery_note: body.deliveryNote ?? null
      });
      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.json({ delivery: data });
    }
  );
  const superAdminGuard = requireVerifiedRole(["super_admin"], authResolver);
  router.get("/staff", superAdminGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient();
    const { data, error } = await supabase.from("staff_accounts").select("id, user_id, department, is_active, created_at, roles(slug, name), user_profiles(full_name, email)");
    if (error) {
      res.status(500).json({ error: "Failed to load staff accounts" });
      return;
    }
    res.json({ staff: data ?? [] });
  });
  router.post(
    "/staff",
    superAdminGuard,
    validateBody(staffAppointSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient();
      const body = req.body;
      const { data: roleRow } = await supabase.from("roles").select("id").eq("slug", body.roleSlug).maybeSingle();
      if (!roleRow) {
        res.status(400).json({ error: "Invalid roleSlug" });
        return;
      }
      const { error: profileErr } = await supabase.from("user_profiles").update({ account_type: "staff" }).eq("id", body.userId);
      if (profileErr) {
        res.status(400).json({ error: profileErr.message });
        return;
      }
      const { data, error } = await supabase.from("staff_accounts").insert({
        user_id: body.userId,
        role_id: roleRow.id,
        department: body.department,
        is_active: true,
        appointed_by: res.locals.authUser.id
      }).select("*").single();
      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      await supabase.from("audit_logs").insert({
        actor_user_id: res.locals.authUser.id,
        actor_role: "super_admin",
        action: "STAFF_APPOINTED",
        entity_table: "staff_accounts",
        entity_id: data.id,
        after_snapshot: sanitizeAuditSnapshot({
          user_id: body.userId,
          role: body.roleSlug,
          department: body.department
        })
      });
      res.status(201).json({ staff: data });
    }
  );
  router.patch(
    "/staff/:id",
    superAdminGuard,
    validateBody(staffUpdateSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient();
      const body = req.body;
      const updates = {};
      if (body.department !== void 0) updates.department = body.department;
      if (body.isActive !== void 0) updates.is_active = body.isActive;
      if (body.roleSlug !== void 0) {
        const { data: roleRow } = await supabase.from("roles").select("id").eq("slug", body.roleSlug).maybeSingle();
        if (!roleRow) {
          res.status(400).json({ error: "Invalid roleSlug" });
          return;
        }
        updates.role_id = roleRow.id;
      }
      const { data, error } = await supabase.from("staff_accounts").update(updates).eq("id", req.params.id).select("*").single();
      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      await supabase.from("audit_logs").insert({
        actor_user_id: res.locals.authUser.id,
        actor_role: "super_admin",
        action: "STAFF_UPDATED",
        entity_table: "staff_accounts",
        entity_id: data.id,
        after_snapshot: sanitizeAuditSnapshot(body)
      });
      res.json({ staff: data });
    }
  );
  router.get("/reports/summary", financeGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient();
    const { count: orderCount } = await supabase.from("orders").select("id", { count: "exact", head: true });
    const { count: pendingTransfers } = await supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "Awaiting Verification");
    res.json({
      ordersTotalCount: orderCount ?? 0,
      awaitingBankTransferVerificationCount: pendingTransfers ?? 0
    });
  });
  router.get(
    "/audit-logs",
    requireVerifiedRole(["super_admin", "admin"], authResolver),
    async (_req, res) => {
      const supabase = authResolver.getAdminClient();
      const { data, error } = await supabase.from("audit_logs").select("id, actor_user_id, actor_role, action, entity_table, entity_id, after_snapshot, created_at").order("created_at", { ascending: false }).limit(100);
      if (error) {
        res.status(500).json({ error: "Failed to load audit logs" });
        return;
      }
      res.json({ auditLogs: data ?? [] });
    }
  );
  return router;
}

// server/routes/catalogue.ts
import { Router as Router2 } from "express";
function createCatalogueRouter(authResolver = defaultAuthResolver) {
  const router = Router2();
  const dbGuard = requireDatabaseClient(authResolver);
  router.get("/categories", dbGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient();
    const { data, error } = await supabase.from("categories").select("id, parent_id, slug, name, description, sort_order").eq("is_active", true).order("sort_order", { ascending: true });
    if (error) {
      sendDatabaseError(res, error, "Failed to load categories");
      return;
    }
    res.json({ categories: data ?? [] });
  });
  router.get("/products", dbGuard, async (req, res) => {
    const supabase = authResolver.getAdminClient();
    const mode = typeof req.query.mode === "string" ? req.query.mode : void 0;
    const categorySlug = typeof req.query.category === "string" ? req.query.category : void 0;
    const search = typeof req.query.q === "string" ? req.query.q.trim() : void 0;
    let query = supabase.from("products").select(
      "id, sku, name, slug, fulfillment_mode, base_currency, base_price, shipping_method, moq, description, specs_json, is_featured, categories!inner(id, slug, name), product_media(url, alt_text, is_primary, sort_order)"
    ).eq("is_active", true);
    if (mode === "ready_stock" || mode === "pre_order") {
      query = query.eq("fulfillment_mode", mode);
    }
    if (categorySlug && categorySlug !== "all") {
      query = query.eq("categories.slug", categorySlug);
    }
    if (search) {
      const escaped = search.replace(/[%_]/g, "");
      query = query.or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%`);
    }
    const { data, error } = await query.order("is_featured", { ascending: false });
    if (error) {
      sendDatabaseError(res, error, "Failed to load products");
      return;
    }
    res.json({ products: data ?? [] });
  });
  router.get("/products/:slug", dbGuard, async (req, res) => {
    const supabase = authResolver.getAdminClient();
    const { data, error } = await supabase.from("products").select(
      "id, sku, name, slug, fulfillment_mode, base_currency, base_price, estimated_weight_kg, estimated_volume_cbm, shipping_method, moq, description, specs_json, categories(id, slug, name), product_media(url, alt_text, is_primary, sort_order)"
    ).eq("slug", req.params.slug).eq("is_active", true).maybeSingle();
    if (error) {
      sendDatabaseError(res, error, "Failed to load product details");
      return;
    }
    if (!data) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json({ product: data });
  });
  router.get("/states", dbGuard, async (_req, res) => {
    const supabase = authResolver.getAdminClient();
    const { data, error } = await supabase.from("nigerian_states").select(
      "id, code, name, geopolitical_zone, is_fct, is_priority_hub, base_delivery_fee_ngn, estimated_transit_days"
    ).eq("is_active", true).order("name", { ascending: true });
    if (error) {
      sendDatabaseError(res, error, "Failed to load Nigerian states");
      return;
    }
    res.json({ states: data ?? [] });
  });
  return router;
}

// server/routes/customer.ts
import { Router as Router3 } from "express";
import { z as z2 } from "zod";
var CUSTOMER_ALLOWED_ROLES = [
  "registered_customer",
  ...STAFF_ROLE_SLUGS
];
var profilePatchSchema = z2.object({
  fullName: z2.string().min(2).max(120).optional(),
  phone: z2.string().min(7).max(30).optional(),
  defaultStateId: z2.string().uuid().optional()
}).strict();
var addressCreateSchema = z2.object({
  label: z2.string().min(2).max(60),
  recipientName: z2.string().min(2).max(120),
  phone: z2.string().min(7).max(30),
  stateId: z2.string().uuid(),
  city: z2.string().min(2).max(100),
  streetLine: z2.string().min(5).max(300),
  landmark: z2.string().max(150).optional(),
  isDefault: z2.boolean().optional()
}).strict();
var cartItemSchema = z2.object({
  productId: z2.string().uuid(),
  quantity: z2.number().int().min(1).max(1e3)
}).strict();
var checkoutSchema = z2.object({
  addressId: z2.string().uuid(),
  warehouseId: z2.string().uuid(),
  items: z2.array(
    z2.object({
      product_id: z2.string().uuid(),
      quantity: z2.number().int().min(1).max(1e3)
    })
  ).min(1).max(50),
  idempotencyKey: z2.string().min(8).max(128)
}).strict();
var sourcingCreateSchema = z2.object({
  productTitle: z2.string().min(3).max(160),
  categoryName: z2.string().min(2).max(80),
  description: z2.string().min(10).max(2e3),
  targetQuantity: z2.number().int().positive(),
  targetBudgetNgn: z2.number().positive().optional(),
  destinationStateId: z2.string().uuid().optional(),
  referenceImageUrl: z2.string().url().optional(),
  cloudinaryPublicId: z2.string().max(200).optional()
}).strict();
var acceptQuotationSchema = z2.object({
  addressId: z2.string().uuid(),
  allowPartialPayment: z2.boolean().optional(),
  idempotencyKey: z2.string().min(8).max(128).optional()
}).strict();
var bankTransferSubmitSchema = z2.object({
  orderId: z2.string().uuid(),
  amountNgn: z2.number().positive(),
  bankReference: z2.string().min(4).max(120),
  senderBankName: z2.string().min(2).max(100),
  senderAccountName: z2.string().min(2).max(120),
  transferDate: z2.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  storageObjectPath: z2.string().min(5).max(500),
  mimeType: z2.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf"
  ]),
  fileSizeBytes: z2.number().int().positive().max(10485760),
  idempotencyKey: z2.string().min(8).max(128)
}).strict();
function createCustomerRouter(authResolver = defaultAuthResolver) {
  const router = Router3();
  const guard = requireVerifiedRole(CUSTOMER_ALLOWED_ROLES, authResolver);
  router.get("/profile", guard, async (_req, res) => {
    const supabase = authResolver.getAdminClient();
    const userId = res.locals.authUser.id;
    const { data, error } = await supabase.from("user_profiles").select("id, full_name, email, phone, account_type, default_state_id, created_at").eq("id", userId).maybeSingle();
    if (error) {
      res.status(500).json({ error: "Failed to load profile" });
      return;
    }
    res.json({ profile: data });
  });
  router.patch(
    "/profile",
    guard,
    validateBody(profilePatchSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient();
      const userId = res.locals.authUser.id;
      const body = req.body;
      const updates = {};
      if (body.fullName !== void 0) updates.full_name = body.fullName;
      if (body.phone !== void 0) updates.phone = body.phone;
      if (body.defaultStateId !== void 0)
        updates.default_state_id = body.defaultStateId;
      const { data, error } = await supabase.from("user_profiles").update(updates).eq("id", userId).select("id, full_name, email, phone, account_type, default_state_id").single();
      if (error) {
        res.status(400).json({ error: "Failed to update profile" });
        return;
      }
      res.json({ profile: data });
    }
  );
  router.get("/addresses", guard, async (_req, res) => {
    const supabase = authResolver.getAdminClient();
    const userId = res.locals.authUser.id;
    const { data, error } = await supabase.from("customer_addresses").select("*").eq("customer_id", userId).order("is_default", { ascending: false });
    if (error) {
      res.status(500).json({ error: "Failed to load addresses" });
      return;
    }
    res.json({ addresses: data ?? [] });
  });
  router.post(
    "/addresses",
    guard,
    validateBody(addressCreateSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient();
      const userId = res.locals.authUser.id;
      const body = req.body;
      const { data, error } = await supabase.from("customer_addresses").insert({
        customer_id: userId,
        label: body.label,
        recipient_name: body.recipientName,
        phone: body.phone,
        state_id: body.stateId,
        city: body.city,
        street_line: body.streetLine,
        landmark: body.landmark ?? null,
        is_default: body.isDefault ?? false
      }).select("*").single();
      if (error) {
        res.status(400).json({ error: "Failed to save address" });
        return;
      }
      res.status(201).json({ address: data });
    }
  );
  router.delete("/addresses/:id", guard, async (req, res) => {
    const supabase = authResolver.getAdminClient();
    const userId = res.locals.authUser.id;
    const { error } = await supabase.from("customer_addresses").delete().eq("id", req.params.id).eq("customer_id", userId);
    if (error) {
      res.status(400).json({ error: "Failed to delete address" });
      return;
    }
    res.status(204).send();
  });
  router.get("/cart", guard, async (_req, res) => {
    const supabase = authResolver.getAdminClient();
    const userId = res.locals.authUser.id;
    const { data: cart, error } = await supabase.from("shopping_carts").select("id, cart_items(id, product_id, quantity, products(id, sku, name, slug, base_price, base_currency, fulfillment_mode))").eq("customer_id", userId).maybeSingle();
    if (error) {
      res.status(500).json({ error: "Failed to load shopping cart" });
      return;
    }
    res.json({ cart: cart ?? { id: null, cart_items: [] } });
  });
  router.post(
    "/cart/items",
    guard,
    validateBody(cartItemSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient();
      const userId = res.locals.authUser.id;
      const body = req.body;
      const { data: cartRow, error: cartErr } = await supabase.from("shopping_carts").upsert({ customer_id: userId }, { onConflict: "customer_id" }).select("id").single();
      if (cartErr || !cartRow) {
        res.status(500).json({ error: "Failed to initialize cart" });
        return;
      }
      const { data, error } = await supabase.from("cart_items").upsert(
        {
          cart_id: cartRow.id,
          product_id: body.productId,
          quantity: body.quantity
        },
        { onConflict: "cart_id,product_id" }
      ).select("*").single();
      if (error) {
        res.status(400).json({ error: "Failed to update cart item" });
        return;
      }
      res.status(201).json({ item: data });
    }
  );
  router.post(
    "/checkout",
    guard,
    validateBody(checkoutSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient();
      const userId = res.locals.authUser.id;
      const body = req.body;
      const { data, error } = await supabase.rpc("rpc_create_ready_stock_order", {
        p_customer_id: userId,
        p_address_id: body.addressId,
        p_warehouse_id: body.warehouseId,
        p_items: body.items,
        p_idempotency_key: body.idempotencyKey
      });
      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      const { data: bankSettings } = await supabase.from("system_settings").select("value_json").eq("key", "bank_transfer_instructions").maybeSingle();
      res.status(201).json({
        order: data,
        paymentMethod: "bank_transfer",
        bankInstructions: bankSettings?.value_json ?? {
          note: "Official DGT bank transfer instructions will appear once configured by Super Administrator."
        }
      });
    }
  );
  router.get("/orders", guard, async (_req, res) => {
    const supabase = authResolver.getAdminClient();
    const userId = res.locals.authUser.id;
    const { data, error } = await supabase.from("orders").select(
      "id, order_number, order_type, total_ngn, amount_paid_ngn, outstanding_balance_ngn, order_status, payment_status, created_at"
    ).eq("customer_id", userId).order("created_at", { ascending: false });
    if (error) {
      res.status(500).json({ error: "Failed to load orders" });
      return;
    }
    res.json({ orders: data ?? [] });
  });
  router.get("/orders/:id", guard, async (req, res) => {
    const supabase = authResolver.getAdminClient();
    const userId = res.locals.authUser.id;
    const { data, error } = await supabase.from("orders").select("*, order_items(*), payments(*)").eq("id", req.params.id).eq("customer_id", userId).maybeSingle();
    if (error) {
      res.status(500).json({ error: "Failed to load order" });
      return;
    }
    if (!data) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json({ order: data });
  });
  router.get("/orders/:id/tracking", guard, async (req, res) => {
    const supabase = authResolver.getAdminClient();
    const userId = res.locals.authUser.id;
    const { data: order, error: orderErr } = await supabase.from("orders").select("id, order_number, order_status").eq("id", req.params.id).eq("customer_id", userId).maybeSingle();
    if (orderErr) {
      res.status(500).json({ error: "Failed to query order tracking" });
      return;
    }
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const { data: shipments, error: shipErr } = await supabase.from("shipments").select("*, shipment_milestones(*)").eq("order_id", order.id);
    if (shipErr) {
      res.status(500).json({ error: "Failed to load shipment milestones" });
      return;
    }
    res.json({ order, shipments: shipments ?? [] });
  });
  router.get("/sourcing-requests", guard, async (_req, res) => {
    const supabase = authResolver.getAdminClient();
    const userId = res.locals.authUser.id;
    const { data, error } = await supabase.from("wholesale_sourcing_requests").select("*").eq("customer_id", userId).order("created_at", { ascending: false });
    if (error) {
      res.status(500).json({ error: "Failed to load sourcing requests" });
      return;
    }
    res.json({ requests: data ?? [] });
  });
  router.post(
    "/sourcing-requests",
    guard,
    validateBody(sourcingCreateSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient();
      const userId = res.locals.authUser.id;
      const body = req.body;
      const requestNumber = `DGT-SRC-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const { data, error } = await supabase.from("wholesale_sourcing_requests").insert({
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
        status: "submitted"
      }).select("*").single();
      if (error) {
        res.status(400).json({ error: "Failed to create sourcing request" });
        return;
      }
      await supabase.from("audit_logs").insert({
        actor_user_id: userId,
        actor_role: res.locals.authRole,
        action: "SOURCING_REQUEST_CREATED",
        entity_table: "wholesale_sourcing_requests",
        entity_id: data.id,
        after_snapshot: sanitizeAuditSnapshot({
          request_number: requestNumber,
          target_quantity: body.targetQuantity
        })
      });
      res.status(201).json({ request: data });
    }
  );
  router.get("/quotations", guard, async (_req, res) => {
    const supabase = authResolver.getAdminClient();
    const userId = res.locals.authUser.id;
    const { data, error } = await supabase.from("quotations").select("*").eq("customer_id", userId).order("created_at", { ascending: false });
    if (error) {
      res.status(500).json({ error: "Failed to load quotations" });
      return;
    }
    res.json({ quotations: data ?? [] });
  });
  router.post(
    "/quotations/:id/accept",
    guard,
    validateBody(acceptQuotationSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient();
      const userId = res.locals.authUser.id;
      const body = req.body;
      const { data, error } = await supabase.rpc("rpc_accept_quotation", {
        p_customer_id: userId,
        p_quotation_id: req.params.id,
        p_address_id: body.addressId,
        p_allow_partial_payment: body.allowPartialPayment ?? true,
        p_idempotency_key: body.idempotencyKey ?? null
      });
      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(201).json({ result: data });
    }
  );
  router.get("/payments", guard, async (_req, res) => {
    const supabase = authResolver.getAdminClient();
    const userId = res.locals.authUser.id;
    const { data, error } = await supabase.from("payments").select("*, payment_evidences(id, mime_type, file_size_bytes, uploaded_at)").eq("customer_id", userId).order("created_at", { ascending: false });
    if (error) {
      res.status(500).json({ error: "Failed to load payments" });
      return;
    }
    res.json({ payments: data ?? [] });
  });
  router.post(
    "/payments/bank-transfer",
    guard,
    validateBody(bankTransferSubmitSchema),
    async (req, res) => {
      const supabase = authResolver.getAdminClient();
      const userId = res.locals.authUser.id;
      const body = req.body;
      if (!body.storageObjectPath.startsWith(`${userId}/`) || body.storageObjectPath.includes("..")) {
        res.status(403).json({
          error: "Forbidden: payment evidence path must reside inside customer private folder",
          code: "INVALID_EVIDENCE_PATH"
        });
        return;
      }
      const { data, error } = await supabase.rpc(
        "rpc_submit_bank_transfer_evidence",
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
          p_idempotency_key: body.idempotencyKey
        }
      );
      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(201).json({ payment: data });
    }
  );
  router.get("/payments/:paymentId/evidence-url", guard, async (req, res) => {
    const supabase = authResolver.getAdminClient();
    const userId = res.locals.authUser.id;
    const { data: evidence, error } = await supabase.from("payment_evidences").select("storage_bucket, storage_object_path").eq("payment_id", req.params.paymentId).eq("customer_id", userId).order("uploaded_at", { ascending: false }).limit(1).maybeSingle();
    if (error || !evidence) {
      res.status(404).json({ error: "Payment evidence not found" });
      return;
    }
    const { data: signed, error: signErr } = await supabase.storage.from(evidence.storage_bucket).createSignedUrl(evidence.storage_object_path, 60);
    if (signErr || !signed) {
      res.status(500).json({ error: "Failed to generate private evidence URL" });
      return;
    }
    res.json({ signedUrl: signed.signedUrl, expiresInSeconds: 60 });
  });
  return router;
}

// server/routes/health.ts
import { Router as Router4 } from "express";
var healthRouter = Router4();
healthRouter.get("/", (_req, res) => {
  const integrations = getIntegrationReadiness();
  res.json({
    service: "Danmusa Global Trade (DGT) Platform API",
    stage: "stage-2-security-and-backend",
    status: "operational",
    paymentStrategy: "bank_transfer_only",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    integrations
  });
});

// server/routes/platform.ts
import { Router as Router5 } from "express";
var platformRouter = Router5();
platformRouter.get("/config/public", (_req, res) => {
  res.json({
    brandName: "Danmusa Global Trade",
    abbreviation: "DGT",
    tagline: "Your Trusted China-to-Nigeria Trade Partner.",
    primaryCurrency: "NGN",
    supportedCurrencies: ["NGN", "CNY", "USD"],
    paymentStrategy: "bank_transfer_only",
    onlineGatewayStatus: "postponed",
    integrations: getIntegrationReadiness()
  });
});

// server/app.ts
function createDgtApiApp(authResolver = defaultAuthResolver) {
  const app2 = express();
  app2.disable("x-powered-by");
  app2.set("trust proxy", 1);
  app2.use(applySecurityHeaders);
  app2.use(express.json({ limit: "1mb" }));
  app2.use("/api/health", healthRouter);
  app2.use("/api", platformRouter);
  app2.use("/api", createCatalogueRouter(authResolver));
  app2.use("/api/customer", createCustomerRouter(authResolver));
  app2.use("/api/admin", createAdminRouter(authResolver));
  app2.use("/api", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
  });
  app2.use(apiErrorHandler);
  return app2;
}

// server/vercel.ts
var app = createDgtApiApp();
function handler(req, res) {
  app(req, res);
}
export {
  handler as default
};
