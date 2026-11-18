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
  /** Illustrative demonstration rate to NGN until live Finance Manager rate table is connected */
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
  /** Demonstration price in NGN */
  demoPriceNgn: number;
  /** Demonstration reference price in CNY (for supplier/trade context) */
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
  product: DemoProduct;
  quantity: number;
}

export interface IntegrationStatusMap {
  supabaseClient: boolean;
  supabaseAdmin: boolean;
  cloudinary: boolean;
  resend: boolean;
  whatsapp: boolean;
}
