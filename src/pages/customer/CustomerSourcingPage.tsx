import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Button } from '../../components/ui/Button';
import { DataTable, type TableColumn } from '../../components/ui/DataTable';
import { StatusBadge, getToneForStatus } from '../../components/ui/Badge';
import { ErrorBanner } from '../../components/ui/StateViews';
import { formatCurrencyAmount } from '../../config/app.config';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/apiClient';
import { CUSTOMER_PORTAL_NAV } from './customerNav';

interface CustomerSourcingRequest {
  id: string;
  request_number: string;
  product_title: string;
  category_name: string;
  target_quantity: number;
  target_budget_ngn?: number | null;
  status: string;
  created_at?: string | null;
}

export function CustomerSourcingPage() {
  const { accessToken } = useAuth();
  const [requests, setRequests] = useState<CustomerSourcingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ requests: CustomerSourcingRequest[] }>(
        '/api/customer/sourcing-requests',
        { accessToken },
      );
      setRequests(data.requests ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load your wholesale sourcing requests.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, [accessToken]);

  const columns: TableColumn<CustomerSourcingRequest>[] = [
    {
      key: 'request_number',
      header: 'Request Ref',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-[#10243A]">
          {row.request_number}
        </span>
      ),
    },
    {
      key: 'product_title',
      header: 'Product Brief',
      render: (row) => (
        <div>
          <p className="text-sm font-semibold text-[#10243A]">
            {row.product_title}
          </p>
          <p className="text-xs text-[#64748B]">{row.category_name}</p>
        </div>
      ),
    },
    {
      key: 'target_quantity',
      header: 'Quantity',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-xs font-semibold tabular-nums text-[#10243A]">
          {row.target_quantity}
        </span>
      ),
    },
    {
      key: 'target_budget_ngn',
      header: 'Target Budget',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-xs tabular-nums text-[#64748B]">
          {row.target_budget_ngn
            ? formatCurrencyAmount(Number(row.target_budget_ngn), 'NGN')
            : 'Open'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <StatusBadge tone={getToneForStatus(row.status)}>
          {row.status.replace(/_/g, ' ')}
        </StatusBadge>
      ),
    },
    {
      key: 'created_at',
      header: 'Submitted',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-xs text-[#64748B]">
          {row.created_at ? row.created_at.slice(0, 10) : '—'}
        </span>
      ),
    },
  ];

  return (
    <PortalLayout
      portalTitle="Customer Portal"
      portalSubtitle="Direct China Procurement"
      breadcrumbCurrent="My Sourcing Requests"
      navItems={CUSTOMER_PORTAL_NAV}
      topAction={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadRequests}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Link to="/sourcing">
            <Button variant="primary" size="sm">
              <Plus className="h-3.5 w-3.5" />
              New Request
            </Button>
          </Link>
        </div>
      }
    >
      <div>
        <h1 className="font-display text-2xl font-extrabold text-[#10243A]">
          My Sourcing Requests
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Track custom product and bulk wholesale sourcing briefs submitted to Danmusa Global Trade.
        </p>
      </div>

      {error && (
        <ErrorBanner title="Unable to load sourcing requests" message={error} />
      )}

      <DataTable
        columns={columns}
        rows={requests}
        rowKey={(row) => row.id}
        loading={loading}
        searchable
        searchPlaceholder="Search product brief or reference..."
        emptyTitle="No sourcing requests submitted yet"
        emptyDescription="Tell us what you need sourced from China — vehicles, smartphones, electronics, home products, or wholesale fashion lots."
        emptyAction={
          <Link to="/sourcing">
            <Button variant="primary" size="sm">
              Submit a Sourcing Request
            </Button>
          </Link>
        }
        renderMobileCard={(row) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-[11px] font-semibold text-[#2563EB]">
                  {row.request_number}
                </p>
                <p className="text-sm font-bold text-[#10243A]">
                  {row.product_title}
                </p>
                <p className="text-xs text-[#64748B]">{row.category_name}</p>
              </div>
              <StatusBadge tone={getToneForStatus(row.status)}>
                {row.status.replace(/_/g, ' ')}
              </StatusBadge>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-[#64748B]">
              <span>Qty: {row.target_quantity}</span>
              <span>{row.created_at ? row.created_at.slice(0, 10) : '—'}</span>
            </div>
          </div>
        )}
      />
    </PortalLayout>
  );
}
