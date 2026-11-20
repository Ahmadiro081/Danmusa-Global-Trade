export type RoleSlug =
  | 'super_admin'
  | 'admin'
  | 'product_manager'
  | 'order_manager'
  | 'finance_manager'
  | 'sourcing_manager'
  | 'logistics_manager'
  | 'customer_support'
  | 'registered_customer'
  | 'guest_customer';

export interface RoleDefinition {
  slug: RoleSlug;
  name: string;
  scope: 'administrative' | 'operational' | 'customer';
  description: string;
  keyDomains: string[];
}

export type CurrencyCode = 'NGN' | 'CNY' | 'USD';

export interface CurrencyConfig {
  code: CurrencyCode;
  name: string;
  symbol: string;
  /** Reference display conversion rate to NGN */
  referenceRateToNgn: number;
}

export type FulfillmentMode = 'ready_stock' | 'pre_order';

export type ShippingMethod =
  | 'weight_based'
  | 'volume_based'
  | 'product_based'
  | 'custom_quotation';

export type PaymentStatus =
  | 'Pending'
  | 'Awaiting Verification'
  | 'Partially Paid'
  | 'Paid'
  | 'Failed'
  | 'Rejected'
  | 'Refunded'
  | 'Cancelled';

export type InternationalLogisticsStageCode =
  | 'procurement_in_china'
  | 'received_at_china_warehouse'
  | 'preparing_for_shipment'
  | 'shipped_from_china'
  | 'in_transit'
  | 'arrived_in_nigeria'
  | 'customs_clearance'
  | 'released_from_customs'
  | 'received_at_nigeria_warehouse'
  | 'ready_for_local_delivery';

export interface InternationalLogisticsStage {
  step: number;
  code: InternationalLogisticsStageCode;
  label: string;
  region: 'China' | 'International' | 'Nigeria';
  summary: string;
}

export interface NigerianState {
  code: string;
  name: string;
  zone:
    | 'North West'
    | 'North East'
    | 'North Central'
    | 'South West'
    | 'South East'
    | 'South South';
  isFct?: boolean;
  isPriorityHub?: boolean;
}

export interface LiveNigerianState {
  id: string;
  code: string;
  name: string;
  geopolitical_zone: string;
  is_fct: boolean;
  is_priority_hub: boolean;
  base_delivery_fee_ngn: number | null;
  estimated_transit_days: number | null;
}

export interface StorefrontCategory {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
}

export interface StorefrontProductMedia {
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface StorefrontProduct {
  id: string;
  sku: string;
  slug: string;
  name: string;
  categoryId: string | null;
  categorySlug: string;
  categoryName: string;
  fulfillmentMode: FulfillmentMode;
  baseCurrency: CurrencyCode;
  basePrice: number;
  priceNgn: number;
  shippingMethod: ShippingMethod;
  moq: number;
  description: string;
  specsJson: Record<string, unknown>;
  estimatedWeightKg: number | null;
  estimatedVolumeCbm: number | null;
  isFeatured: boolean;
  media: StorefrontProductMedia[];
  primaryImageUrl: string | null;
  primaryImageAlt: string;
  brand: string | null;
  subcategory: string | null;
  availabilityLabel: string;
}

export interface PublicPlatformConfig {
  platform: string;
  tagline: string;
  supportedCurrencies: CurrencyCode[];
  paymentMethods: string[];
  integrations: {
    supabaseConfigured: boolean;
    cloudinaryConfigured: boolean;
    resendConfigured: boolean;
    whatsappConfigured: boolean;
  };
}

export interface ProductCategory {
  slug: string;
  name: string;
  summary: string;
  productCountLabel: string;
}

export interface DemoProduct {
  id: string;
  sku: string;
  slug: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  fulfillmentMode: FulfillmentMode;
  demoPriceNgn: number;
  demoReferenceCny: number;
  moq: number;
  shippingMethod: ShippingMethod;
  estimatedLeadTime: string;
  imageUrl: string | null;
  imageAlt: string;
  shortDescription: string;
  specifications: Array<{ label: string; value: string }>;
  isFeatured: boolean;
  isDemoRecord: true;
}

export interface CartItem {
  product: StorefrontProduct;
  quantity: number;
}

export interface IntegrationStatusMap {
  supabaseClient: boolean;
  supabaseAdmin: boolean;
  cloudinary: boolean;
  resend: boolean;
  whatsapp: boolean;
}
