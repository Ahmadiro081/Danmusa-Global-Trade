import type {
  CurrencyCode,
  CurrencyConfig,
  InternationalLogisticsStage,
  NigerianState,
  PaymentStatus,
  RoleDefinition,
  ShippingMethod,
} from '../types/domain';

export const DGT_BRAND = {
  name: 'Danmusa Global Trade',
  shortName: 'DGT',
  tagline: 'Your Trusted China-to-Nigeria Trade Partner.',
  commissionCredit: 'Neourex Tech',
  placeholders: {
    nigeriaOfficeAddress: '[Nigeria Head Office Address — Pending Official Entry]',
    katsinaHubAddress: '[Katsina State Operations Hub — Pending Official Entry]',
    chinaWarehouseAddress: '[China Consolidation Warehouse — Pending Official Entry]',
    businessPhone: '[Official Business Telephone — Pending Official Entry]',
    supportEmail: '[Official Support Email — Pending Official Entry]',
    whatsappNumber: '[Official WhatsApp Business Number — Pending Official Entry]',
  },
} as const;

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  NGN: {
    code: 'NGN',
    name: 'Nigerian Naira',
    symbol: '₦',
    referenceRateToNgn: 1,
  },
  CNY: {
    code: 'CNY',
    name: 'Chinese Yuan',
    symbol: '¥',
    referenceRateToNgn: 230, // Illustrative Stage 1 display rate only
  },
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    referenceRateToNgn: 1650, // Illustrative Stage 1 display rate only
  },
};

export function formatCurrencyAmount(
  amountNgn: number,
  currency: CurrencyCode = 'NGN',
): string {
  const cfg = CURRENCIES[currency];
  const converted =
    currency === 'NGN' ? amountNgn : amountNgn / cfg.referenceRateToNgn;
  return `${cfg.symbol}${new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: currency === 'NGN' ? 0 : 2,
    maximumFractionDigits: currency === 'NGN' ? 0 : 2,
  }).format(converted)}`;
}

export const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  'Pending',
  'Awaiting Verification',
  'Partially Paid',
  'Paid',
  'Failed',
  'Rejected',
  'Refunded',
  'Cancelled',
] as const;

export const SHIPPING_METHODS: ReadonlyArray<{
  code: ShippingMethod;
  label: string;
  description: string;
}> = [
  {
    code: 'weight_based',
    label: 'Weight-Based Freight',
    description: 'Calculated per kilogram for air cargo and dense electronics.',
  },
  {
    code: 'volume_based',
    label: 'Volume-Based (CBM)',
    description: 'Calculated per cubic meter for sea freight and bulky cargo.',
  },
  {
    code: 'product_based',
    label: 'Product-Based Flat Rate',
    description: 'Fixed per-unit logistics tariff for standardized categories.',
  },
  {
    code: 'custom_quotation',
    label: 'Custom Quotation',
    description: 'Tailored freight quote for vehicles, machinery, or bulk wholesale.',
  },
];

export const INTERNATIONAL_LOGISTICS_STAGES: readonly InternationalLogisticsStage[] = [
  {
    step: 1,
    code: 'procurement_in_china',
    label: 'Procurement in China',
    region: 'China',
    summary: 'Verified supplier purchase order placed and confirmed in China.',
  },
  {
    step: 2,
    code: 'received_at_china_warehouse',
    label: 'Received at China Warehouse',
    region: 'China',
    summary: 'Goods inspected, photographed, and logged at DGT China consolidation hub.',
  },
  {
    step: 3,
    code: 'preparing_for_shipment',
    label: 'Preparing for Shipment',
    region: 'China',
    summary: 'Export packaging, manifest documentation, and container/airway loading.',
  },
  {
    step: 4,
    code: 'shipped_from_china',
    label: 'Shipped from China',
    region: 'China',
    summary: 'Cargo departed Chinese port or international airport.',
  },
  {
    step: 5,
    code: 'in_transit',
    label: 'In Transit',
    region: 'International',
    summary: 'International sea or air freight en route to Nigeria.',
  },
  {
    step: 6,
    code: 'arrived_in_nigeria',
    label: 'Arrived in Nigeria',
    region: 'Nigeria',
    summary: 'Shipment landed at Nigerian port or air cargo terminal.',
  },
  {
    step: 7,
    code: 'customs_clearance',
    label: 'Customs Clearance',
    region: 'Nigeria',
    summary: 'Nigerian customs inspection, duty assessment, and clearance processing.',
  },
  {
    step: 8,
    code: 'released_from_customs',
    label: 'Released from Customs',
    region: 'Nigeria',
    summary: 'Formal customs release completed and cleared for inland transit.',
  },
  {
    step: 9,
    code: 'received_at_nigeria_warehouse',
    label: 'Received at Nigeria Warehouse',
    region: 'Nigeria',
    summary: 'Sorted and verified at DGT Nigerian distribution facility.',
  },
  {
    step: 10,
    code: 'ready_for_local_delivery',
    label: 'Ready for Local Delivery',
    region: 'Nigeria',
    summary: 'Dispatched or ready for pickup across Katsina, Northern Nigeria, and all 36 states + FCT.',
  },
] as const;

export const NIGERIAN_STATES: readonly NigerianState[] = [
  { code: 'NG-KT', name: 'Katsina', zone: 'North West', isPriorityHub: true },
  { code: 'NG-FC', name: 'Federal Capital Territory (Abuja)', zone: 'North Central', isFct: true, isPriorityHub: true },
  { code: 'NG-KN', name: 'Kano', zone: 'North West', isPriorityHub: true },
  { code: 'NG-KD', name: 'Kaduna', zone: 'North West', isPriorityHub: true },
  { code: 'NG-LA', name: 'Lagos', zone: 'South West', isPriorityHub: true },
  { code: 'NG-AB', name: 'Abia', zone: 'South East' },
  { code: 'NG-AD', name: 'Adamawa', zone: 'North East' },
  { code: 'NG-AK', name: 'Akwa Ibom', zone: 'South South' },
  { code: 'NG-AN', name: 'Anambra', zone: 'South East' },
  { code: 'NG-BA', name: 'Bauchi', zone: 'North East' },
  { code: 'NG-BY', name: 'Bayelsa', zone: 'South South' },
  { code: 'NG-BE', name: 'Benue', zone: 'North Central' },
  { code: 'NG-BO', name: 'Borno', zone: 'North East' },
  { code: 'NG-CR', name: 'Cross River', zone: 'South South' },
  { code: 'NG-DE', name: 'Delta', zone: 'South South' },
  { code: 'NG-EB', name: 'Ebonyi', zone: 'South East' },
  { code: 'NG-ED', name: 'Edo', zone: 'South South' },
  { code: 'NG-EK', name: 'Ekiti', zone: 'South West' },
  { code: 'NG-EN', name: 'Enugu', zone: 'South East' },
  { code: 'NG-GO', name: 'Gombe', zone: 'North East' },
  { code: 'NG-IM', name: 'Imo', zone: 'South East' },
  { code: 'NG-JI', name: 'Jigawa', zone: 'North West', isPriorityHub: true },
  { code: 'NG-KE', name: 'Kebbi', zone: 'North West' },
  { code: 'NG-KO', name: 'Kogi', zone: 'North Central' },
  { code: 'NG-KW', name: 'Kwara', zone: 'North Central' },
  { code: 'NG-NA', name: 'Nasarawa', zone: 'North Central' },
  { code: 'NG-NI', name: 'Niger', zone: 'North Central' },
  { code: 'NG-OG', name: 'Ogun', zone: 'South West' },
  { code: 'NG-ON', name: 'Ondo', zone: 'South West' },
  { code: 'NG-OS', name: 'Osun', zone: 'South West' },
  { code: 'NG-OY', name: 'Oyo', zone: 'South West' },
  { code: 'NG-PL', name: 'Plateau', zone: 'North Central' },
  { code: 'NG-RI', name: 'Rivers', zone: 'South South' },
  { code: 'NG-SO', name: 'Sokoto', zone: 'North West' },
  { code: 'NG-TA', name: 'Taraba', zone: 'North East' },
  { code: 'NG-YO', name: 'Yobe', zone: 'North East' },
  { code: 'NG-ZA', name: 'Zamfara', zone: 'North West' },
] as const;

export const RBAC_ROLES: readonly RoleDefinition[] = [
  {
    slug: 'super_admin',
    name: 'Super Administrator',
    scope: 'administrative',
    description: 'Complete authority over staff accounts, role assignments, permissions, and system configuration.',
    keyDomains: ['Staff & RBAC', 'System Configuration', 'Audit Logs', 'All Operational Modules'],
  },
  {
    slug: 'admin',
    name: 'Administrator',
    scope: 'administrative',
    description: 'Cross-functional platform supervision excluding super-admin security overrides.',
    keyDomains: ['Overview', 'Orders', 'Customers', 'Reports', 'Audit Logs'],
  },
  {
    slug: 'product_manager',
    name: 'Product Manager',
    scope: 'operational',
    description: 'Maintains product catalogue, categories, ready-stock/pre-order flags, and warehouse stock levels.',
    keyDomains: ['Products', 'Categories', 'Inventory'],
  },
  {
    slug: 'order_manager',
    name: 'Order Manager',
    scope: 'operational',
    description: 'Processes customer ready-stock and quotation-backed orders through fulfillment.',
    keyDomains: ['Orders', 'Customers'],
  },
  {
    slug: 'finance_manager',
    name: 'Finance Manager',
    scope: 'operational',
    description: 'Verifies customer bank transfers, reconciles payment statuses, and manages NGN/CNY/USD exchange rates.',
    keyDomains: ['Payments', 'Multi-Currency Rates', 'Reports'],
  },
  {
    slug: 'sourcing_manager',
    name: 'Sourcing Manager',
    scope: 'operational',
    description: 'Reviews custom wholesale sourcing requests, investigates Chinese suppliers, and issues quotations.',
    keyDomains: ['Sourcing Requests', 'Quotations', 'Procurement', 'Suppliers'],
  },
  {
    slug: 'logistics_manager',
    name: 'Logistics Manager',
    scope: 'operational',
    description: 'Updates 10-stage China-to-Nigeria shipment milestones and coordinates state delivery dispatch.',
    keyDomains: ['Shipments', 'Deliveries', 'Warehouses'],
  },
  {
    slug: 'customer_support',
    name: 'Customer Support',
    scope: 'operational',
    description: 'Assists customers with order tracking, quotation follow-ups, and ticket resolution.',
    keyDomains: ['Customers', 'Orders', 'Order Tracking'],
  },
  {
    slug: 'registered_customer',
    name: 'Registered Customer',
    scope: 'customer',
    description: 'Authenticated buyer with isolated access to personal orders, quotations, and sourcing requests.',
    keyDomains: ['Customer Dashboard', 'Checkout', 'Order History', 'Wholesale Sourcing'],
  },
  {
    slug: 'guest_customer',
    name: 'Guest Customer',
    scope: 'customer',
    description: 'Public visitor browsing catalogue, viewing logistics coverage, and preparing a temporary bag.',
    keyDomains: ['Public Storefront', 'Product Search', 'Shopping Bag'],
  },
] as const;
