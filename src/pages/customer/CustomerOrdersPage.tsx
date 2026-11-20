import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, RefreshCw } from 'lucide-react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Button } from '../../components/ui/Button';
import { DataTable, type TableColumn } from '../../components/ui/DataTable';
import { StatusBadge, getToneForStatus } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ErrorBanner, LoadingSkeleton } from '../../components/ui/StateViews';
import { formatCurrencyAmount } from '../../config/app.config';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/apiClient';
import { CUSTOMER_PORTAL_NAV } from './customerNav';

interface CustomerOrderSummary {
  id: string;
  order_number: string;
  order_type: string;
  total_ngn: number;
  amount_paid_ngn: number;
  outstanding_balance_ngn: number;
  order_status: string;
  payment_status: string;
  created_at: string;
}

interface CustomerOrderDetail extends CustomerOrderSummary {
  order_items?: Array<{
    id: string;
    product_name?: string;
    quantity?: number;
    unit_price_ngn?: number;
    line_total_ngn?: number;
  }>;
  payments?: Array<{
    id: string;
    payment_reference?: string;
    amount_ngn?: number;
    status?: string;
    created_at?: string;
  }>;
}

export function CustomerOrdersPage() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<CustomerOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadOrders = async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ orders: CustomerOrderSummary[] }>(
        '/api/customer/orders',
        { accessToken },
      );
      setOrders(data.orders ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load your order history.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, [accessToken]);

  const openOrderDetail = async (orderId: string) => {
    if (!accessToken) return;
    setSelectedOrderId(orderId);
    setOrderDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await apiFetch<{ order: CustomerOrderDetail }>(
        `/api/customer/orders/${encodeURIComponent(orderId)}`,
        { accessToken },
      );
      setOrderDetail(res.order);
    } catch (err) {
      setDetailError(
        err instanceof Error ? err.message : 'Failed to load order details.',
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const columns: TableColumn<CustomerOrderSummary>[] = [
    {
      key: 'order_number',
      header: 'Order Number',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-[#10243A]">
          {row.order_number}
        </span>
      ),
    },
    {
      key: 'order_type',
      header: 'Type',
      render: (row) => (
        <span className="text-xs capitalize text-[#64748B]">
          {row.order_type.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'payment_status',
      header: 'Payment Status',
      render: (row) => (
        <StatusBadge tone={getToneForStatus(row.payment_status)}>
          {row.payment_status}
        </StatusBadge>
      ),
    },
    {
      key: 'order_status',
      header: 'Order Status',
      render: (row) => (
        <StatusBadge tone={getToneForStatus(row.order_status)}>
          {row.order_status.replace(/_/g, ' ')}
        </StatusBadge>
      ),
    },
    {
      key: 'total_ngn',
      header: 'Total (NGN)',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-xs font-semibold tabular-nums text-[#10243A]">
          {formatCurrencyAmount(Number(row.total_ngn ?? 0), 'NGN')}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Date',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-xs text-[#64748B]">
          {row.created_at ? row.created_at.slice(0, 10) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Details',
      align: 'right',
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => void openOrderDetail(row.id)}
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </Button>
      ),
    },
  ];

  return (
    <PortalLayout
      portalTitle="Customer Portal"
      portalSubtitle="Order History & Details"
      breadcrumbCurrent="My Orders"
      navItems={CUSTOMER_PORTAL_NAV}
      topAction={
        <Button
          variant="outline"
          size="sm"
          onClick={loadOrders}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
    >
      <div>
        <h1 className="font-display text-2xl font-extrabold text-[#10243A]">
          My Orders
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          View all ready-stock, pre-order, and quotation-backed orders linked to your verified customer account.
        </p>
      </div>

      {error && <ErrorBanner title="Unable to load orders" message={error} />}

      <DataTable
        columns={columns}
        rows={orders}
        rowKey={(row) => row.id}
        loading={loading}
        searchable
        searchPlaceholder="Search by order number or status..."
        emptyTitle="No orders recorded yet"
        emptyDescription="Orders placed through ready-stock checkout or accepted wholesale quotations will appear here."
        emptyAction={
          <Link to="/catalogue">
            <Button variant="primary" size="sm">
              Browse Products
            </Button>
          </Link>
        }
        renderMobileCard={(row) => (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold text-[#10243A]">
                  {row.order_number}
                </p>
                <p className="text-[11px] text-[#64748B]">
                  {row.created_at ? row.created_at.slice(0, 10) : '—'} ·{' '}
                  {row.order_type.replace(/_/g, ' ')}
                </p>
              </div>
              <p className="font-mono text-sm font-bold tabular-nums text-[#10243A]">
                {formatCurrencyAmount(Number(row.total_ngn ?? 0), 'NGN')}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                <StatusBadge tone={getToneForStatus(row.payment_status)}>
                  {row.payment_status}
                </StatusBadge>
                <StatusBadge tone={getToneForStatus(row.order_status)}>
                  {row.order_status.replace(/_/g, ' ')}
                </StatusBadge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void openOrderDetail(row.id)}
              >
                <Eye className="h-3.5 w-3.5" />
                Details
              </Button>
            </div>
          </div>
        )}
      />

      {/* Order Details Modal */}
      <Modal
        open={Boolean(selectedOrderId)}
        onClose={() => setSelectedOrderId(null)}
        title={
          orderDetail
            ? `Order ${orderDetail.order_number}`
            : 'Order Details'
        }
        subtitle="Verified order summary, line items, and bank transfer ledger"
        maxWidthClass="max-w-2xl"
        footer={
          <>
            <Link to="/account/tracking">
              <Button variant="outline" size="sm">
                Track Shipment
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setSelectedOrderId(null)}
            >
              Close
            </Button>
          </>
        }
      >
        {detailLoading ? (
          <LoadingSkeleton rows={3} />
        ) : detailError ? (
          <ErrorBanner title="Could not load order details" message={detailError} />
        ) : orderDetail ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-[#F5F7FA] p-4 text-xs sm:grid-cols-3">
              <div>
                <p className="text-[#64748B]">Order Total</p>
                <p className="mt-0.5 font-mono text-sm font-bold text-[#10243A]">
                  {formatCurrencyAmount(Number(orderDetail.total_ngn ?? 0), 'NGN')}
                </p>
              </div>
              <div>
                <p className="text-[#64748B]">Amount Paid</p>
                <p className="mt-0.5 font-mono text-sm font-bold text-[#16865C]">
                  {formatCurrencyAmount(
                    Number(orderDetail.amount_paid_ngn ?? 0),
                    'NGN',
                  )}
                </p>
              </div>
              <div>
                <p className="text-[#64748B]">Outstanding Balance</p>
                <p className="mt-0.5 font-mono text-sm font-bold text-[#B45309]">
                  {formatCurrencyAmount(
                    Number(orderDetail.outstanding_balance_ngn ?? 0),
                    'NGN',
                  )}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#10243A]">
                Order Line Items
              </h3>
              {orderDetail.order_items && orderDetail.order_items.length > 0 ? (
                <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {orderDetail.order_items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-[#10243A]">
                          {item.product_name || 'Catalogue Item'}
                        </p>
                        <p className="text-[#64748B] tabular-nums">
                          Qty: {item.quantity ?? 1}
                        </p>
                      </div>
                      <p className="font-mono font-semibold tabular-nums text-[#10243A]">
                        {formatCurrencyAmount(
                          Number(item.line_total_ngn ?? item.unit_price_ngn ?? 0),
                          'NGN',
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-[#64748B]">
                  No itemized lines attached to this order.
                </p>
              )}
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#10243A]">
                Payment Records
              </h3>
              {orderDetail.payments && orderDetail.payments.length > 0 ? (
                <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {orderDetail.payments.map((pay) => (
                    <li
                      key={pay.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-xs"
                    >
                      <div>
                        <p className="font-mono font-semibold text-[#10243A]">
                          {pay.payment_reference || pay.id.slice(0, 10)}
                        </p>
                        <p className="text-[#64748B]">
                          {pay.created_at ? pay.created_at.slice(0, 10) : '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge tone={getToneForStatus(pay.status)}>
                          {pay.status || 'Pending'}
                        </StatusBadge>
                        <span className="font-mono font-semibold tabular-nums text-[#10243A]">
                          {formatCurrencyAmount(Number(pay.amount_ngn ?? 0), 'NGN')}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-[#64748B]">
                  No bank transfer evidence submitted for this order yet.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </PortalLayout>
  );
}
