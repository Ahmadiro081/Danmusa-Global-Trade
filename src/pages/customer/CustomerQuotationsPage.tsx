import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Button } from '../../components/ui/Button';
import { DataTable, type TableColumn } from '../../components/ui/DataTable';
import { StatusBadge, getToneForStatus } from '../../components/ui/Badge';
import { ErrorBanner } from '../../components/ui/StateViews';
import { formatCurrencyAmount } from '../../config/app.config';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/apiClient';
import { CUSTOMER_PORTAL_NAV } from './customerNav';

interface CustomerQuotation {
  id: string;
  quote_number: string;
  supplier_cost_cny?: number | null;
  shipping_fee_usd?: number | null;
  total_payable_ngn?: number | null;
  status: string;
  expires_at?: string | null;
  created_at?: string | null;
}

export function CustomerQuotationsPage() {
  const { accessToken } = useAuth();
  const [quotations, setQuotations] = useState<CustomerQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQuotations = async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ quotations: CustomerQuotation[] }>(
        '/api/customer/quotations',
        { accessToken },
      );
      setQuotations(data.quotations ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load quotations.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQuotations();
  }, [accessToken]);

  const columns: TableColumn<CustomerQuotation>[] = [
    {
      key: 'quote_number',
      header: 'Quotation Ref',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-[#10243A]">
          {row.quote_number}
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
      key: 'total_payable_ngn',
      header: 'Total Payable (NGN)',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-xs font-bold tabular-nums text-[#10243A]">
          {formatCurrencyAmount(Number(row.total_payable_ngn ?? 0), 'NGN')}
        </span>
      ),
    },
    {
      key: 'expires_at',
      header: 'Valid Until',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-xs text-[#64748B]">
          {row.expires_at ? row.expires_at.slice(0, 10) : '—'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Issued',
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
      portalSubtitle="Formal Quotations & Approvals"
      breadcrumbCurrent="My Quotations"
      navItems={CUSTOMER_PORTAL_NAV}
      topAction={
        <Button
          variant="outline"
          size="sm"
          onClick={loadQuotations}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
    >
      <div>
        <h1 className="font-display text-2xl font-extrabold text-[#10243A]">
          My Quotations
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Review itemized quotations prepared by DGT Sourcing and Finance Managers for your pre-order and wholesale sourcing enquiries.
        </p>
      </div>

      {error && <ErrorBanner title="Unable to load quotations" message={error} />}

      <DataTable
        columns={columns}
        rows={quotations}
        rowKey={(row) => row.id}
        loading={loading}
        searchable
        searchPlaceholder="Search quotation reference or status..."
        emptyTitle="No quotations issued yet"
        emptyDescription="Submit a wholesale or pre-order sourcing request to receive an itemized NGN quotation from our China procurement team."
        emptyAction={
          <Link to="/sourcing">
            <Button variant="primary" size="sm">
              Request Wholesale Sourcing
            </Button>
          </Link>
        }
        renderMobileCard={(row) => (
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <p className="font-mono text-xs font-bold text-[#10243A]">
                {row.quote_number}
              </p>
              <StatusBadge tone={getToneForStatus(row.status)}>
                {row.status.replace(/_/g, ' ')}
              </StatusBadge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#64748B]">
                Expires: {row.expires_at ? row.expires_at.slice(0, 10) : '—'}
              </span>
              <span className="font-mono font-bold tabular-nums text-[#10243A]">
                {formatCurrencyAmount(Number(row.total_payable_ngn ?? 0), 'NGN')}
              </span>
            </div>
          </div>
        )}
      />
    </PortalLayout>
  );
}
