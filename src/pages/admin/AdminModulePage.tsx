import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { StatusBadge, getToneForStatus } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DataTable, type TableColumn } from '../../components/ui/DataTable';
import { ErrorBanner } from '../../components/ui/StateViews';
import {
  INTERNATIONAL_LOGISTICS_STAGES,
  PAYMENT_STATUSES,
} from '../../config/app.config';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/apiClient';
import { ROLE_LABELS } from '../../utils/authRouting';
import { NotFoundPage } from '../public/NotFoundPage';
import { ADMIN_MODULES, getAdminNavForRole } from './adminModules';

type RowRecord = Record<string, string | number>;

const BADGE_COLUMN_KEYS = new Set([
  'status',
  'paymentStatus',
  'orderStatus',
  'mode',
  'scope',
  'currentStage',
]);

function formatNumber(val: unknown, prefix = ''): string {
  const num = Number(val);
  if (!Number.isFinite(num)) return '—';
  return `${prefix}${num.toLocaleString('en-NG')}`;
}

function formatDate(val: unknown): string {
  if (!val || typeof val !== 'string') return '—';
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? val : d.toISOString().slice(0, 10);
}

async function fetchModuleRows(
  slug: string,
  accessToken: string,
): Promise<RowRecord[]> {
  switch (slug) {
    case 'products': {
      const data = await apiFetch<{ products: Array<Record<string, unknown>> }>(
        '/api/admin/products',
        { accessToken },
      );
      return data.products.map((p) => {
        const cat = p.categories as { name?: string } | null | undefined;
        return {
          sku: String(p.sku ?? '—'),
          name: String(p.name ?? '—'),
          category: String(cat?.name ?? '—'),
          mode: String(p.fulfillment_mode ?? '—'),
          shipping: String(p.shipping_method ?? '—'),
          price: formatNumber(p.base_price, `${String(p.base_currency ?? 'NGN')} `),
        };
      });
    }
    case 'categories': {
      const data = await apiFetch<{ categories: Array<Record<string, unknown>> }>(
        '/api/admin/categories',
        { accessToken },
      );
      return data.categories.map((c) => ({
        slug: String(c.slug ?? '—'),
        name: String(c.name ?? '—'),
        parent: c.parent_id ? String(c.parent_id).slice(0, 8) : 'Root',
        sortOrder: Number(c.sort_order ?? 0),
        status: c.is_active === false ? 'Inactive' : 'Active',
      }));
    }
    case 'inventory': {
      const data = await apiFetch<{ inventory: Array<Record<string, unknown>> }>(
        '/api/admin/inventory',
        { accessToken },
      );
      return data.inventory.map((row) => {
        const prod = row.products as { sku?: string; name?: string } | null | undefined;
        const wh = row.warehouses as { code?: string; name?: string } | null | undefined;
        return {
          sku: String(prod?.sku ?? row.product_id ?? '—'),
          warehouse: wh
            ? `${wh.code ?? ''} · ${wh.name ?? ''}`.trim()
            : String(row.warehouse_id ?? '—'),
          onHand: Number(row.quantity_on_hand ?? 0),
          reserved: Number(row.quantity_reserved ?? 0),
          reorderPoint: Number(row.reorder_point ?? 0),
        };
      });
    }
    case 'customers': {
      const data = await apiFetch<{ customers: Array<Record<string, unknown>> }>(
        '/api/admin/customers',
        { accessToken },
      );
      return data.customers.map((c) => ({
        fullName: String(c.full_name ?? '—'),
        email: String(c.email ?? '—'),
        phone: String(c.phone ?? '—'),
        defaultState: c.default_state_id ? String(c.default_state_id).slice(0, 8) : '—',
        createdAt: formatDate(c.created_at),
      }));
    }
    case 'orders': {
      const data = await apiFetch<{ orders: Array<Record<string, unknown>> }>(
        '/api/admin/orders',
        { accessToken },
      );
      return data.orders.map((o) => {
        const cust = o.user_profiles as { full_name?: string; email?: string } | null | undefined;
        return {
          orderNumber: String(o.order_number ?? '—'),
          customer: String(cust?.full_name || cust?.email || o.customer_id || '—'),
          orderType: String(o.order_type ?? '—'),
          paymentStatus: String(o.payment_status ?? '—'),
          orderStatus: String(o.order_status ?? '—'),
          totalNgn: formatNumber(o.total_ngn, '₦'),
        };
      });
    }
    case 'quotations': {
      const data = await apiFetch<{ quotations: Array<Record<string, unknown>> }>(
        '/api/admin/quotations',
        { accessToken },
      );
      return data.quotations.map((q) => ({
        quoteNumber: String(q.quote_number ?? '—'),
        customer: String(q.customer_id ?? '—').slice(0, 8),
        supplierCny: formatNumber(q.supplier_cost_cny, '¥'),
        shippingUsd: formatNumber(q.shipping_fee_usd, '$'),
        totalNgn: formatNumber(q.total_payable_ngn, '₦'),
        status: String(q.status ?? '—'),
      }));
    }
    case 'sourcing': {
      const data = await apiFetch<{ requests: Array<Record<string, unknown>> }>(
        '/api/admin/sourcing-requests',
        { accessToken },
      );
      return data.requests.map((r) => ({
        requestNumber: String(r.request_number ?? '—'),
        productTitle: String(r.product_title ?? '—'),
        targetQty: Number(r.target_quantity ?? 0),
        destinationState: r.destination_state_id
          ? String(r.destination_state_id).slice(0, 8)
          : '—',
        status: String(r.status ?? '—'),
      }));
    }
    case 'payments': {
      const data = await apiFetch<{ payments: Array<Record<string, unknown>> }>(
        '/api/admin/payments/bank-transfers',
        { accessToken },
      );
      return data.payments.map((p) => {
        const order = p.orders as { order_number?: string } | null | undefined;
        return {
          paymentRef: String(p.payment_reference ?? p.id ?? '—'),
          orderNumber: String(order?.order_number ?? p.order_id ?? '—'),
          method: String(p.method ?? 'bank_transfer'),
          currency: String(p.currency_code ?? 'NGN'),
          amount: formatNumber(p.amount_ngn ?? p.amount, '₦'),
          status: String(p.status ?? '—'),
        };
      });
    }
    case 'procurement': {
      const data = await apiFetch<{
        procurementOrders: Array<Record<string, unknown>>;
      }>('/api/admin/procurement', { accessToken });
      return data.procurementOrders.map((p) => {
        const supplier = p.suppliers as { name?: string } | null | undefined;
        const order = p.orders as { order_number?: string } | null | undefined;
        return {
          procurementNumber: String(p.procurement_number ?? p.id ?? '—'),
          supplier: String(supplier?.name ?? p.supplier_id ?? '—'),
          orderNumber: String(order?.order_number ?? p.order_id ?? '—'),
          costCny: formatNumber(p.cost_cny, '¥'),
          costNgn: formatNumber(p.cost_ngn_snapshot, '₦'),
          status: String(p.status ?? '—'),
        };
      });
    }
    case 'shipments': {
      const data = await apiFetch<{ shipments: Array<Record<string, unknown>> }>(
        '/api/admin/shipments',
        { accessToken },
      );
      return data.shipments.map((s) => ({
        trackingNumber: String(s.tracking_number ?? s.id ?? '—'),
        orderNumber: String(s.order_id ?? '—').slice(0, 8),
        method: String(s.shipping_method ?? '—'),
        currentStage: String(s.current_stage ?? '—'),
        eta: formatDate(s.estimated_arrival_date),
      }));
    }
    case 'deliveries': {
      const data = await apiFetch<{ states: Array<Record<string, unknown>> }>(
        '/api/admin/deliveries/states',
        { accessToken },
      );
      return data.states.map((st) => ({
        code: String(st.code ?? '—'),
        name: String(st.name ?? '—'),
        zone: String(st.geopolitical_zone ?? '—'),
        corridor: st.is_priority_hub
          ? `Priority Hub · ${formatNumber(st.base_delivery_fee_ngn, '₦')} (${st.estimated_transit_days ?? '—'}d)`
          : `${formatNumber(st.base_delivery_fee_ngn, '₦')} (${st.estimated_transit_days ?? '—'}d)`,
      }));
    }
    case 'staff': {
      const data = await apiFetch<{ staff: Array<Record<string, unknown>> }>(
        '/api/admin/staff',
        { accessToken },
      );
      return data.staff.map((st) => {
        const roleRel = st.roles as { name?: string; slug?: string } | null | undefined;
        const prof = st.user_profiles as { full_name?: string; email?: string } | null | undefined;
        return {
          roleName: `${prof?.full_name || prof?.email || st.user_id} (${roleRel?.name || roleRel?.slug || 'Staff'})`,
          scope: st.is_active ? 'Active' : 'Inactive',
          domains: `${String(st.department ?? 'General')} · ${prof?.email ?? '—'}`,
        };
      });
    }
    case 'reports': {
      const data = await apiFetch<{
        ordersTotalCount: number;
        awaitingBankTransferVerificationCount: number;
      }>('/api/admin/reports/summary', { accessToken });
      return [
        {
          reportName: `Total Orders Ledger (${data.ordersTotalCount})`,
          currencyScope: 'NGN / CNY / USD Snapshot',
          sourceTable: 'orders',
        },
        {
          reportName: `Bank Transfers Awaiting Verification (${data.awaitingBankTransferVerificationCount})`,
          currencyScope: 'NGN Settlement',
          sourceTable: 'payments',
        },
      ];
    }
    case 'audit-logs': {
      const data = await apiFetch<{ auditLogs: Array<Record<string, unknown>> }>(
        '/api/admin/audit-logs',
        { accessToken },
      );
      return data.auditLogs.map((a) => ({
        timestamp: formatDate(a.created_at),
        actorRole: String(a.actor_role ?? '—'),
        action: String(a.action ?? '—'),
        entityTable: String(a.entity_table ?? '—'),
        entityId: a.entity_id ? String(a.entity_id).slice(0, 12) : '—',
      }));
    }
    case 'settings': {
      const data = await apiFetch<{
        currencies: Array<Record<string, unknown>>;
        exchangeRates: Array<Record<string, unknown>>;
      }>('/api/admin/settings', { accessToken });
      if (data.exchangeRates.length > 0) {
        return data.exchangeRates.map((r) => ({
          pair: `${String(r.from_currency ?? '—')} / ${String(r.to_currency ?? 'NGN')}`,
          rate: String(r.rate ?? '—'),
          policy: `Effective ${formatDate(r.effective_from)}`,
        }));
      }
      return data.currencies.map((c) => ({
        pair: `${String(c.code ?? '—')} (${String(c.name ?? '')})`,
        rate: String(c.symbol ?? '—'),
        policy: c.is_base ? 'Base settlement currency' : 'Configured trade currency',
      }));
    }
    default:
      return [];
  }
}

export function AdminModulePage() {
  const { moduleSlug } = useParams<{ moduleSlug: string }>();
  const { accessToken, role, authorizedAdminModules } = useAuth();
  const spec = moduleSlug ? ADMIN_MODULES[moduleSlug] : undefined;

  const [rows, setRows] = useState<RowRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const navItems = getAdminNavForRole(role, authorizedAdminModules);

  useEffect(() => {
    setStatusFilter('all');
  }, [moduleSlug]);

  useEffect(() => {
    if (!spec || !accessToken) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    fetchModuleRows(spec.slug, accessToken)
      .then((loadedRows) => {
        if (!active) return;
        setRows(loadedRows);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : `Failed to load ${spec.title} records from backend.`,
        );
        setRows([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [spec, accessToken, reloadTick]);

  // Identify a filterable status/mode column if present
  const filterKey = useMemo(() => {
    if (!spec) return null;
    const match = spec.columns.find((c) => BADGE_COLUMN_KEYS.has(c.key));
    return match ? match.key : null;
  }, [spec]);

  const filterValues = useMemo(() => {
    if (!filterKey) return [];
    const set = new Set<string>();
    rows.forEach((r) => {
      const val = String(r[filterKey] ?? '').trim();
      if (val && val !== '—') set.add(val);
    });
    return Array.from(set).sort();
  }, [rows, filterKey]);

  const displayedRows = useMemo(() => {
    if (!filterKey || statusFilter === 'all') return rows;
    return rows.filter((r) => String(r[filterKey] ?? '') === statusFilter);
  }, [rows, filterKey, statusFilter]);

  if (!spec) {
    return <NotFoundPage />;
  }

  const columns: TableColumn<RowRecord>[] = spec.columns.map((col) => ({
    key: col.key,
    header: col.header,
    align: col.align,
    render: (row) => {
      const raw = row[col.key] ?? '—';
      if (BADGE_COLUMN_KEYS.has(col.key) && String(raw) !== '—') {
        return (
          <StatusBadge tone={getToneForStatus(String(raw))}>
            {String(raw).replace(/_/g, ' ')}
          </StatusBadge>
        );
      }
      return (
        <span
          className={
            col.align === 'right'
              ? 'font-mono text-xs font-semibold tabular-nums text-[#10243A]'
              : 'text-sm text-[#202B38]'
          }
        >
          {raw}
        </span>
      );
    },
  }));

  return (
    <PortalLayout
      portalTitle="Admin Console"
      portalSubtitle={role ? ROLE_LABELS[role] : 'Staff Operations'}
      breadcrumbCurrent={spec.title}
      navItems={navItems}
      topAction={
        <Button
          variant="outline"
          size="sm"
          onClick={() => setReloadTick((n) => n + 1)}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
          {spec.domain}
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-display text-2xl font-extrabold text-[#10243A]">
            {spec.title}
          </h1>
          <span className="font-mono text-xs text-[#64748B] tabular-nums">
            {displayedRows.length} {displayedRows.length === 1 ? 'record' : 'records'}
          </span>
        </div>
        <p className="max-w-3xl text-sm text-[#64748B]">{spec.description}</p>
      </div>

      {/* RBAC & Ledger Metadata Card */}
      <Card padding="sm">
        <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
          <div>
            <p className="font-semibold text-[#10243A]">Authorized Staff Roles</p>
            <p className="mt-1 text-[#64748B]">
              {spec.authorizedRoles.join(' · ')}
            </p>
          </div>
          <div>
            <p className="font-semibold text-[#10243A]">PostgreSQL Ledger Tables</p>
            <p className="mt-1 font-mono text-[#64748B]">
              {spec.databaseTables.join(', ')}
            </p>
          </div>
        </div>
      </Card>

      {spec.slug === 'payments' && (
        <Card padding="sm">
          <p className="text-xs font-semibold text-[#10243A]">
            Payment Lifecycle Statuses (PostgreSQL CHECK Constraint)
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PAYMENT_STATUSES.map((st) => (
              <StatusBadge key={st} tone={getToneForStatus(st)}>
                {st}
              </StatusBadge>
            ))}
          </div>
        </Card>
      )}

      {spec.slug === 'shipments' && (
        <Card padding="sm">
          <p className="text-xs font-semibold text-[#10243A]">
            10-Stage International Milestone Progression
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-[#64748B]">
            {INTERNATIONAL_LOGISTICS_STAGES.map(
              (s) => `${s.step}. ${s.label}`,
            ).join(' → ')}
          </p>
        </Card>
      )}

      {error && (
        <ErrorBanner
          title={`Unable to Load ${spec.title}`}
          message={error}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReloadTick((n) => n + 1)}
            >
              Retry
            </Button>
          }
        />
      )}

      <DataTable
        columns={columns}
        rows={displayedRows}
        rowKey={(row) => `${spec.slug}-${Object.values(row).join('-')}`}
        loading={loading}
        searchable
        searchPlaceholder={`Search ${spec.title.toLowerCase()}...`}
        toolbarExtra={
          filterKey && filterValues.length > 0 ? (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label={`Filter ${spec.title} by status`}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-[#10243A] focus:border-[#2563EB] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              {filterValues.map((val) => (
                <option key={val} value={val}>
                  {val.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          ) : undefined
        }
        emptyTitle={`No ${spec.title.toLowerCase()} records found`}
        emptyDescription={`Connected to live PostgreSQL (${spec.databaseTables.join(', ')}). Records will appear here as operational transactions are created.`}
        renderMobileCard={(row) => (
          <div className="space-y-2">
            {spec.columns.map((col) => {
              const val = row[col.key] ?? '—';
              return (
                <div
                  key={col.key}
                  className="flex items-start justify-between gap-3 text-xs"
                >
                  <span className="font-medium text-[#64748B]">{col.header}</span>
                  {BADGE_COLUMN_KEYS.has(col.key) && String(val) !== '—' ? (
                    <StatusBadge tone={getToneForStatus(String(val))}>
                      {String(val).replace(/_/g, ' ')}
                    </StatusBadge>
                  ) : (
                    <span className="text-right font-semibold text-[#10243A]">
                      {val}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      />
    </PortalLayout>
  );
}
