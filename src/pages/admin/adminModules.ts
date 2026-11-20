import type { PortalNavItem } from '../../components/layout/PortalLayout';
import type { RoleSlug } from '../../types/domain';
import { canAccessAdminModule } from '../../utils/authRouting';

export const ADMIN_PORTAL_NAV: readonly (PortalNavItem & { slug: string })[] = [
  { to: '/admin', label: 'Overview', slug: 'overview', end: true },
  { to: '/admin/products', label: 'Products', slug: 'products' },
  { to: '/admin/categories', label: 'Categories', slug: 'categories' },
  { to: '/admin/inventory', label: 'Inventory', slug: 'inventory' },
  { to: '/admin/customers', label: 'Customers', slug: 'customers' },
  { to: '/admin/orders', label: 'Orders', slug: 'orders' },
  { to: '/admin/quotations', label: 'Quotations', slug: 'quotations' },
  { to: '/admin/sourcing', label: 'Sourcing Requests', slug: 'sourcing' },
  { to: '/admin/payments', label: 'Payments', slug: 'payments' },
  { to: '/admin/procurement', label: 'Procurement', slug: 'procurement' },
  { to: '/admin/shipments', label: 'Shipments', slug: 'shipments' },
  { to: '/admin/deliveries', label: 'Deliveries', slug: 'deliveries' },
  { to: '/admin/staff', label: 'Staff & RBAC', slug: 'staff' },
  { to: '/admin/reports', label: 'Reports', slug: 'reports' },
  { to: '/admin/audit-logs', label: 'Audit Logs', slug: 'audit-logs' },
  { to: '/admin/settings', label: 'Settings', slug: 'settings' },
] as const;

export function getAdminNavForRole(
  role: RoleSlug | null | undefined,
  authorizedModules?: readonly string[],
): readonly PortalNavItem[] {
  return ADMIN_PORTAL_NAV.filter((item) =>
    canAccessAdminModule(role, item.slug, authorizedModules),
  );
}

export interface AdminModuleSpec {
  slug: string;
  title: string;
  domain: string;
  description: string;
  authorizedRoles: readonly string[];
  databaseTables: readonly string[];
  columns: readonly { key: string; header: string; align?: 'left' | 'right' }[];
}

export const ADMIN_MODULES: Record<string, AdminModuleSpec> = {
  products: {
    slug: 'products',
    title: 'Products',
    domain: 'Catalogue Management',
    description:
      'Manage ready-stock fixed-price products, pre-order quotation products, Cloudinary media, and shipping calculation classifications.',
    authorizedRoles: ['Super Administrator', 'Administrator', 'Product Manager'],
    databaseTables: ['products', 'product_media'],
    columns: [
      { key: 'sku', header: 'SKU' },
      { key: 'name', header: 'Product Name' },
      { key: 'category', header: 'Category' },
      { key: 'mode', header: 'Fulfillment Mode' },
      { key: 'shipping', header: 'Shipping Method' },
      { key: 'price', header: 'Base Price', align: 'right' },
    ],
  },
  categories: {
    slug: 'categories',
    title: 'Categories',
    domain: 'Catalogue Taxonomy',
    description:
      'Organize Cars & Trucks, Motorcycles, Smartphones, Electronics, Computers, Kitchen Appliances, Clothing, and Footwear.',
    authorizedRoles: ['Super Administrator', 'Administrator', 'Product Manager'],
    databaseTables: ['categories'],
    columns: [
      { key: 'slug', header: 'Slug' },
      { key: 'name', header: 'Category Name' },
      { key: 'parent', header: 'Parent Category' },
      { key: 'sortOrder', header: 'Sort Order', align: 'right' },
      { key: 'status', header: 'Visibility' },
    ],
  },
  inventory: {
    slug: 'inventory',
    title: 'Inventory',
    domain: 'Warehouse Stock Control',
    description:
      'Track on-hand, reserved, and reorder quantities across China consolidation hubs and Nigerian distribution warehouses.',
    authorizedRoles: [
      'Super Administrator',
      'Administrator',
      'Product Manager',
      'Logistics Manager',
    ],
    databaseTables: ['inventory_balances', 'warehouses'],
    columns: [
      { key: 'sku', header: 'SKU' },
      { key: 'warehouse', header: 'Warehouse' },
      { key: 'onHand', header: 'On Hand', align: 'right' },
      { key: 'reserved', header: 'Reserved', align: 'right' },
      { key: 'reorderPoint', header: 'Reorder Point', align: 'right' },
    ],
  },
  customers: {
    slug: 'customers',
    title: 'Customers',
    domain: 'Customer Management',
    description:
      'View verified registered customers, Nigerian delivery states, and support history under strict RLS privacy controls.',
    authorizedRoles: [
      'Super Administrator',
      'Administrator',
      'Order Manager',
      'Customer Support',
    ],
    databaseTables: ['user_profiles', 'customer_addresses'],
    columns: [
      { key: 'fullName', header: 'Customer Name' },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Phone' },
      { key: 'defaultState', header: 'Primary State' },
      { key: 'createdAt', header: 'Registered Date', align: 'right' },
    ],
  },
  orders: {
    slug: 'orders',
    title: 'Orders',
    domain: 'Order Management',
    description:
      'Coordinate ready-stock, pre-order, and wholesale sourcing orders with immutable NGN/CNY/USD financial snapshots.',
    authorizedRoles: [
      'Super Administrator',
      'Administrator',
      'Order Manager',
      'Customer Support',
    ],
    databaseTables: ['orders', 'order_items'],
    columns: [
      { key: 'orderNumber', header: 'Order Number' },
      { key: 'customer', header: 'Customer' },
      { key: 'orderType', header: 'Workflow' },
      { key: 'paymentStatus', header: 'Payment Status' },
      { key: 'orderStatus', header: 'Order Status' },
      { key: 'totalNgn', header: 'Total (NGN)', align: 'right' },
    ],
  },
  quotations: {
    slug: 'quotations',
    title: 'Quotations',
    domain: 'Quotation Management',
    description:
      'Prepare binding customer quotations combining supplier CNY cost, USD/NGN shipping tariffs, exchange rate snapshots, and expiry dates.',
    authorizedRoles: [
      'Super Administrator',
      'Administrator',
      'Sourcing Manager',
      'Finance Manager',
    ],
    databaseTables: ['quotations'],
    columns: [
      { key: 'quoteNumber', header: 'Quote Ref' },
      { key: 'customer', header: 'Customer' },
      { key: 'supplierCny', header: 'Supplier Cost (CNY)', align: 'right' },
      { key: 'shippingUsd', header: 'Freight (USD)', align: 'right' },
      { key: 'totalNgn', header: 'Total Payable (NGN)', align: 'right' },
      { key: 'status', header: 'Status' },
    ],
  },
  sourcing: {
    slug: 'sourcing',
    title: 'Sourcing Requests',
    domain: 'Wholesale Sourcing',
    description:
      'Review customer-submitted product briefs and Cloudinary photographs, assign Sourcing Managers, and link supplier investigations.',
    authorizedRoles: ['Super Administrator', 'Administrator', 'Sourcing Manager'],
    databaseTables: ['wholesale_sourcing_requests'],
    columns: [
      { key: 'requestNumber', header: 'Request Ref' },
      { key: 'productTitle', header: 'Product Brief' },
      { key: 'targetQty', header: 'Target Qty', align: 'right' },
      { key: 'destinationState', header: 'Destination State' },
      { key: 'status', header: 'Investigation Status' },
    ],
  },
  payments: {
    slug: 'payments',
    title: 'Payments',
    domain: 'Payment & Verification Management',
    description:
      'Manually verify customer bank transfer proofs and reconcile payment ledgers across all 8 lifecycle statuses (online gateway deferred).',
    authorizedRoles: ['Super Administrator', 'Administrator', 'Finance Manager'],
    databaseTables: ['payments'],
    columns: [
      { key: 'paymentRef', header: 'Payment Ref' },
      { key: 'orderNumber', header: 'Order Number' },
      { key: 'method', header: 'Method' },
      { key: 'currency', header: 'Currency' },
      { key: 'amount', header: 'Converted NGN', align: 'right' },
      { key: 'status', header: 'Verification Status' },
    ],
  },
  procurement: {
    slug: 'procurement',
    title: 'Procurement',
    domain: 'Supplier & China Purchasing',
    description:
      'Manage verified Chinese suppliers and CNY procurement batches linked to accepted pre-orders and wholesale requests.',
    authorizedRoles: [
      'Super Administrator',
      'Administrator',
      'Sourcing Manager',
      'Finance Manager',
    ],
    databaseTables: ['suppliers', 'procurement_orders'],
    columns: [
      { key: 'procurementNumber', header: 'Procurement Ref' },
      { key: 'supplier', header: 'China Supplier' },
      { key: 'orderNumber', header: 'Linked Order' },
      { key: 'costCny', header: 'Cost (CNY)', align: 'right' },
      { key: 'costNgn', header: 'Snapshot (NGN)', align: 'right' },
      { key: 'status', header: 'Status' },
    ],
  },
  shipments: {
    slug: 'shipments',
    title: 'Shipments',
    domain: 'International Shipping (China to Nigeria)',
    description:
      'Record 10-stage international shipment milestones from China warehouse intake through Nigerian customs clearance.',
    authorizedRoles: ['Super Administrator', 'Administrator', 'Logistics Manager'],
    databaseTables: ['shipments', 'shipment_milestones'],
    columns: [
      { key: 'trackingNumber', header: 'Tracking Ref' },
      { key: 'orderNumber', header: 'Order' },
      { key: 'method', header: 'Calculation Method' },
      { key: 'currentStage', header: 'Current Stage' },
      { key: 'eta', header: 'Estimated Arrival', align: 'right' },
    ],
  },
  deliveries: {
    slug: 'deliveries',
    title: 'Deliveries',
    domain: 'Nigerian Delivery Management',
    description:
      'Configure delivery charges, transit windows, and logistics partners across Katsina State, Northern Nigeria, and all 36 states + FCT.',
    authorizedRoles: ['Super Administrator', 'Administrator', 'Logistics Manager'],
    databaseTables: ['nigerian_states', 'logistics_partners'],
    columns: [
      { key: 'code', header: 'State Code' },
      { key: 'name', header: 'State / FCT' },
      { key: 'zone', header: 'Geopolitical Zone' },
      { key: 'corridor', header: 'Operational Priority' },
    ],
  },
  staff: {
    slug: 'staff',
    title: 'Staff & RBAC',
    domain: 'Staff Management & Access Control',
    description:
      'Super Administrator governance over staff accounts, role assignments, and backend-enforced PostgreSQL permission policies.',
    authorizedRoles: ['Super Administrator'],
    databaseTables: ['staff_accounts', 'roles', 'permissions', 'role_permissions'],
    columns: [
      { key: 'roleName', header: 'Role' },
      { key: 'scope', header: 'Scope' },
      { key: 'domains', header: 'Authorized Domains' },
    ],
  },
  reports: {
    slug: 'reports',
    title: 'Reports',
    domain: 'Reporting & Analytics',
    description:
      'Multi-currency trade volume, procurement margin, and Nigerian state delivery analytics derived from verified PostgreSQL ledgers.',
    authorizedRoles: ['Super Administrator', 'Administrator', 'Finance Manager'],
    databaseTables: ['orders', 'payments', 'procurement_orders'],
    columns: [
      { key: 'reportName', header: 'Report Stream' },
      { key: 'currencyScope', header: 'Currency Basis' },
      { key: 'sourceTable', header: 'Ledger Source' },
    ],
  },
  'audit-logs': {
    slug: 'audit-logs',
    title: 'Audit Logs',
    domain: 'Immutable Security Audit Trail',
    description:
      'Append-only ledger recording actor role, action, target entity, and before/after JSON snapshots for sensitive staff operations.',
    authorizedRoles: ['Super Administrator', 'Administrator'],
    databaseTables: ['audit_logs'],
    columns: [
      { key: 'timestamp', header: 'Timestamp' },
      { key: 'actorRole', header: 'Actor Role' },
      { key: 'action', header: 'Action' },
      { key: 'entityTable', header: 'Target Table' },
      { key: 'entityId', header: 'Entity ID' },
    ],
  },
  settings: {
    slug: 'settings',
    title: 'Settings',
    domain: 'System Configuration & Multi-Currency Rates',
    description:
      'Manage NGN/CNY/USD exchange rates, shipping calculation rules, and external integration status.',
    authorizedRoles: ['Super Administrator', 'Finance Manager'],
    databaseTables: ['currencies', 'exchange_rates', 'system_settings'],
    columns: [
      { key: 'pair', header: 'Currency Pair' },
      { key: 'rate', header: 'Rate to NGN', align: 'right' },
      { key: 'policy', header: 'Historical Snapshot Policy' },
    ],
  },
};
