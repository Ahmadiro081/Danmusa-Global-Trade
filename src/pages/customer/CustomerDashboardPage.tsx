import { Link } from 'react-router-dom';
import { PortalLayout, type PortalNavItem } from '../../components/layout/PortalLayout';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { IntegrationNotice } from '../../components/ui/StateViews';

export const CUSTOMER_PORTAL_NAV: readonly PortalNavItem[] = [
  { to: '/account', label: 'Dashboard Overview', end: true },
  { to: '/account/orders', label: 'Order History' },
  { to: '/account/tracking', label: 'Order & Shipment Tracking' },
  { to: '/account/sourcing', label: 'Wholesale Sourcing Requests' },
  { to: '/cart', label: 'Shopping Bag' },
] as const;

export function CustomerDashboardPage() {
  return (
    <PortalLayout
      portalTitle="Customer Portal"
      portalSubtitle="Registered Customer Workspace"
      breadcrumbCurrent="Dashboard Overview"
      navItems={CUSTOMER_PORTAL_NAV}
      topAction={
        <Link to="/login">
          <Button variant="outline" size="sm">
            Customer Sign In
          </Button>
        </Link>
      }
    >
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold text-[#0B1E3D]">
          Customer Account Workspace
        </h1>
        <p className="text-sm text-slate-600">
          Manage your ready-stock purchases, pre-order quotations, custom wholesale
          sourcing requests, and China-to-Nigeria delivery tracking.
        </p>
      </div>

      <IntegrationNotice
        title="Authenticated Session Not Active (Stage 1 Interface)"
        description="Customer records are strictly isolated via Supabase Auth and PostgreSQL Row Level Security (customer_id = auth.uid()). Once authenticated, your personal orders, quotations, and sourcing requests will load here."
        requirements={['Supabase Auth', 'Supabase PostgreSQL RLS']}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-slate-500">Ready-Stock & Pre-Orders</p>
          <p className="mt-1 font-display text-lg font-bold text-[#0B1E3D]">
            Order History
          </p>
          <p className="mt-1 text-xs text-slate-600">
            View NGN totals, payment verification statuses, and invoices.
          </p>
          <div className="mt-4">
            <Link to="/account/orders">
              <Button variant="outline" size="sm">
                Open Orders
              </Button>
            </Link>
          </div>
        </Card>

        <Card>
          <p className="text-xs text-slate-500">10-Stage Logistics Pipeline</p>
          <p className="mt-1 font-display text-lg font-bold text-[#0B1E3D]">
            Shipment Tracking
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Follow cargo from China warehouse receipt to Nigerian state delivery.
          </p>
          <div className="mt-4">
            <Link to="/account/tracking">
              <Button variant="outline" size="sm">
                Track Shipment
              </Button>
            </Link>
          </div>
        </Card>

        <Card>
          <p className="text-xs text-slate-500">Custom China Procurement</p>
          <p className="mt-1 font-display text-lg font-bold text-[#0B1E3D]">
            Wholesale Sourcing
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Review Sourcing Manager investigations and accept formal quotations.
          </p>
          <div className="mt-4">
            <Link to="/account/sourcing">
              <Button variant="outline" size="sm">
                View Requests
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </PortalLayout>
  );
}
