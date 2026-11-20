import type { PortalNavItem } from '../../components/layout/PortalLayout';

export const CUSTOMER_PORTAL_NAV: readonly PortalNavItem[] = [
  { to: '/account', label: 'Account Overview', end: true },
  { to: '/account/orders', label: 'My Orders' },
  { to: '/account/tracking', label: 'Order Tracking' },
  { to: '/account/quotations', label: 'My Quotations' },
  { to: '/account/sourcing', label: 'My Sourcing Requests' },
  { to: '/account/settings', label: 'Account Settings' },
  { to: '/cart', label: 'Shopping Cart' },
] as const;
