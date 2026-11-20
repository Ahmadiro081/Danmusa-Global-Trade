import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ClipboardList,
  FileText,
  Package,
  Settings,
  ShoppingBag,
  Truck,
  UserCheck,
} from 'lucide-react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { ErrorBanner, LoadingSkeleton } from '../../components/ui/StateViews';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { apiFetch } from '../../services/apiClient';
import { CUSTOMER_PORTAL_NAV } from './customerNav';

interface CustomerCounts {
  orders: number;
  quotations: number;
  sourcingRequests: number;
}

export function CustomerDashboardPage() {
  const { accessToken, profile, user } = useAuth();
  const { totalCount: cartCount } = useCart();

  const [counts, setCounts] = useState<CustomerCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      apiFetch<{ orders: unknown[] }>('/api/customer/orders', { accessToken }),
      apiFetch<{ quotations: unknown[] }>('/api/customer/quotations', { accessToken }),
      apiFetch<{ requests: unknown[] }>('/api/customer/sourcing-requests', { accessToken }),
    ])
      .then(([ordersRes, quotesRes, sourcingRes]) => {
        if (!active) return;
        setCounts({
          orders: ordersRes.orders?.length ?? 0,
          quotations: quotesRes.quotations?.length ?? 0,
          sourcingRequests: sourcingRes.requests?.length ?? 0,
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load account summary from the server.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [accessToken]);

  const customerName =
    profile?.fullName?.trim() || profile?.email || user?.email || 'Valued Customer';

  return (
    <PortalLayout
      portalTitle="Customer Portal"
      portalSubtitle="Registered Trade Account"
      breadcrumbCurrent="Account Overview"
      navItems={CUSTOMER_PORTAL_NAV}
      topAction={
        <Link to="/sourcing">
          <Button variant="primary" size="sm">
            New Sourcing Request
          </Button>
        </Link>
      }
    >
      {/* Welcome & Profile Identity Card */}
      <Card>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#10243A] text-[#F4A62A]">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl font-extrabold text-[#10243A]">
                  Welcome, {customerName}
                </h1>
                <StatusBadge tone="success">Verified Account</StatusBadge>
              </div>
              <p className="mt-1 text-xs text-[#64748B]">
                {profile?.email || user?.email}
                {profile?.phone ? ` · ${profile.phone}` : ''}
              </p>
            </div>
          </div>

          <Link to="/account/settings">
            <Button variant="outline" size="sm">
              <Settings className="h-3.5 w-3.5" />
              Account Settings
            </Button>
          </Link>
        </div>
      </Card>

      {error && <ErrorBanner title="Summary unavailable" message={error} />}

      {/* Live Account Metric Cards */}
      {loading ? (
        <LoadingSkeleton rows={2} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/account/orders" className="block">
            <Card padding="sm" interactive>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-[#64748B]">My Orders</p>
                <Package className="h-4 w-4 text-[#2563EB]" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#10243A]">
                {counts?.orders ?? 0}
              </p>
              <p className="mt-1 text-[11px] font-medium text-[#2563EB]">
                View order history →
              </p>
            </Card>
          </Link>

          <Link to="/account/quotations" className="block">
            <Card padding="sm" interactive>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-[#64748B]">My Quotations</p>
                <FileText className="h-4 w-4 text-[#D97706]" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#10243A]">
                {counts?.quotations ?? 0}
              </p>
              <p className="mt-1 text-[11px] font-medium text-[#2563EB]">
                Review quotes →
              </p>
            </Card>
          </Link>

          <Link to="/account/sourcing" className="block">
            <Card padding="sm" interactive>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-[#64748B]">
                  Sourcing Requests
                </p>
                <ClipboardList className="h-4 w-4 text-[#16865C]" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#10243A]">
                {counts?.sourcingRequests ?? 0}
              </p>
              <p className="mt-1 text-[11px] font-medium text-[#2563EB]">
                Track requests →
              </p>
            </Card>
          </Link>

          <Link to="/cart" className="block">
            <Card padding="sm" interactive>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-[#64748B]">Shopping Cart</p>
                <ShoppingBag className="h-4 w-4 text-[#10243A]" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#10243A]">
                {cartCount}
              </p>
              <p className="mt-1 text-[11px] font-medium text-[#2563EB]">
                Open cart →
              </p>
            </Card>
          </Link>
        </div>
      )}

      {/* Quick Operational Links */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
              <Truck className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <h2 className="font-display text-base font-bold text-[#10243A]">
                China-to-Nigeria Order Tracking
              </h2>
              <p className="text-xs leading-relaxed text-[#64748B]">
                Monitor your shipment milestones across China warehouse intake, international transit, customs clearance, and Nigerian state delivery.
              </p>
              <Link
                to="/account/tracking"
                className="inline-flex items-center gap-1 pt-1 text-xs font-semibold text-[#2563EB] hover:underline"
              >
                Open Order Tracking
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FEF7E7] text-[#B45309]">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <h2 className="font-display text-base font-bold text-[#10243A]">
                Request Wholesale Sourcing from China
              </h2>
              <p className="text-xs leading-relaxed text-[#64748B]">
                Submit specifications for vehicles, bulk smartphones, electronics, home appliances, or fashion lots to receive a formal itemized quotation.
              </p>
              <Link
                to="/sourcing"
                className="inline-flex items-center gap-1 pt-1 text-xs font-semibold text-[#2563EB] hover:underline"
              >
                Submit Sourcing Request
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </PortalLayout>
  );
}
