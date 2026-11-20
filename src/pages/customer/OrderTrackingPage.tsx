import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Truck } from 'lucide-react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import {
  EmptyState,
  ErrorBanner,
  LoadingSkeleton,
} from '../../components/ui/StateViews';
import { INTERNATIONAL_LOGISTICS_STAGES } from '../../config/app.config';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/apiClient';
import { CUSTOMER_PORTAL_NAV } from './customerNav';

interface OrderChoice {
  id: string;
  order_number: string;
  order_status: string;
}

interface TrackingResponse {
  order: {
    id: string;
    order_number: string;
    order_status: string;
  };
  shipments: Array<{
    id: string;
    tracking_number?: string;
    current_stage?: string;
    estimated_arrival_date?: string | null;
    shipment_milestones?: Array<{
      stage_code: string;
      recorded_at?: string;
      notes?: string | null;
    }>;
  }>;
}

export function OrderTrackingPage() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState<OrderChoice[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [tracking, setTracking] = useState<TrackingResponse | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setLoadingOrders(false);
      return;
    }

    let active = true;
    setLoadingOrders(true);
    apiFetch<{ orders: OrderChoice[] }>('/api/customer/orders', { accessToken })
      .then((res) => {
        if (!active) return;
        const list = res.orders ?? [];
        setOrders(list);
        if (list.length > 0) {
          setSelectedOrderId(list[0].id);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : 'Unable to load orders for tracking.',
        );
      })
      .finally(() => {
        if (active) setLoadingOrders(false);
      });

    return () => {
      active = false;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !selectedOrderId) {
      setTracking(null);
      return;
    }

    let active = true;
    setLoadingTracking(true);
    setError(null);
    apiFetch<TrackingResponse>(
      `/api/customer/orders/${encodeURIComponent(selectedOrderId)}/tracking`,
      { accessToken },
    )
      .then((res) => {
        if (active) setTracking(res);
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load shipment milestones.',
          );
        }
      })
      .finally(() => {
        if (active) setLoadingTracking(false);
      });

    return () => {
      active = false;
    };
  }, [accessToken, selectedOrderId]);

  const activeShipment = tracking?.shipments?.[0] ?? null;
  const activeStageIndex = activeShipment?.current_stage
    ? INTERNATIONAL_LOGISTICS_STAGES.findIndex(
        (s) => s.code === activeShipment.current_stage,
      )
    : -1;

  return (
    <PortalLayout
      portalTitle="Customer Portal"
      portalSubtitle="10-Stage China-to-Nigeria Tracking"
      breadcrumbCurrent="Order Tracking"
      navItems={CUSTOMER_PORTAL_NAV}
    >
      <div>
        <h1 className="font-display text-2xl font-extrabold text-[#10243A]">
          Order &amp; Shipment Tracking
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Select any of your confirmed orders to view real-time China-to-Nigeria shipment milestones recorded by DGT Logistics Managers.
        </p>
      </div>

      {error && <ErrorBanner title="Tracking lookup error" message={error} />}

      {loadingOrders ? (
        <LoadingSkeleton rows={3} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Truck className="h-5 w-5" />}
          title="No active orders to track yet"
          description="Once you place an order or approve a wholesale quotation, your shipment milestones from China procurement to Nigerian delivery will appear here."
          action={
            <>
              <Link to="/catalogue">
                <Button variant="primary" size="sm">
                  Explore Products
                </Button>
              </Link>
              <Link to="/logistics">
                <Button variant="outline" size="sm">
                  View 10-Stage Process
                </Button>
              </Link>
            </>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Order Selector */}
          <Card padding="sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label
                htmlFor="track-order-select"
                className="text-xs font-semibold uppercase tracking-wider text-[#10243A]"
              >
                Select Order to Track
              </label>
              <select
                id="track-order-select"
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-[#10243A] focus:border-[#2563EB] focus:outline-none sm:max-w-sm"
              >
                {orders.map((ord) => (
                  <option key={ord.id} value={ord.id}>
                    {ord.order_number} ({ord.order_status.replace(/_/g, ' ')})
                  </option>
                ))}
              </select>
            </div>
          </Card>

          {loadingTracking ? (
            <LoadingSkeleton rows={4} />
          ) : (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <p className="font-mono text-xs font-semibold text-[#2563EB]">
                    {tracking?.order.order_number}
                  </p>
                  <h2 className="mt-0.5 font-display text-lg font-bold text-[#10243A]">
                    {activeShipment?.tracking_number
                      ? `Shipment ${activeShipment.tracking_number}`
                      : 'Awaiting Shipment Dispatch Assignment'}
                  </h2>
                </div>
                <StatusBadge tone={activeShipment ? 'info' : 'neutral'}>
                  {activeShipment?.current_stage
                    ? activeShipment.current_stage.replace(/_/g, ' ')
                    : 'Not Yet Dispatched'}
                </StatusBadge>
              </div>

              <ol className="mt-6 space-y-3">
                {INTERNATIONAL_LOGISTICS_STAGES.map((stage, idx) => {
                  const completed = activeStageIndex >= idx;
                  const isCurrent = activeStageIndex === idx;
                  const milestoneRecord =
                    activeShipment?.shipment_milestones?.find(
                      (m) => m.stage_code === stage.code,
                    );

                  return (
                    <li
                      key={stage.code}
                      className={`flex items-start gap-3.5 rounded-xl border p-4 ${
                        isCurrent
                          ? 'border-[#2563EB] bg-[#EFF6FF]/60'
                          : completed
                            ? 'border-[#16865C]/25 bg-[#16865C]/5'
                            : 'border-slate-200 bg-[#F5F7FA]/60'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {completed ? (
                          <CheckCircle2
                            className={`h-5 w-5 ${
                              isCurrent ? 'text-[#2563EB]' : 'text-[#16865C]'
                            }`}
                          />
                        ) : (
                          <Circle className="h-5 w-5 text-slate-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-bold text-[#10243A]">
                            {stage.step}. {stage.label}
                          </p>
                          <span className="font-mono text-[11px] text-[#64748B]">
                            {milestoneRecord?.recorded_at
                              ? milestoneRecord.recorded_at.slice(0, 10)
                              : stage.region}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-[#64748B]">
                          {milestoneRecord?.notes || stage.summary}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Card>
          )}
        </div>
      )}
    </PortalLayout>
  );
}
