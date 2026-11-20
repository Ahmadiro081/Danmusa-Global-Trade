import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  MapPin,
  PackageCheck,
  Ship,
  Truck,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import {
  INTERNATIONAL_LOGISTICS_STAGES,
  NIGERIAN_STATES,
  SHIPPING_METHODS,
} from '../../config/app.config';
import { fetchPublicStates } from '../../services/catalogueService';
import type { LiveNigerianState } from '../../types/domain';

export function LogisticsPage() {
  const [liveStates, setLiveStates] = useState<LiveNigerianState[]>([]);

  useEffect(() => {
    fetchPublicStates()
      .then((rows) => setLiveStates(rows))
      .catch(() => setLiveStates([]));
  }, []);

  const statesDisplay =
    liveStates.length > 0
      ? liveStates.map((s) => ({
          code: s.code,
          name: s.name,
          zone: s.geopolitical_zone,
          isPriorityHub: s.is_priority_hub,
        }))
      : NIGERIAN_STATES.map((s) => ({
          code: s.code,
          name: s.name,
          zone: s.zone,
          isPriorityHub: Boolean(s.isPriorityHub),
        }));

  return (
    <div className="bg-[#F5F7FA] pb-16">
      {/* Header Band */}
      <section className="border-b border-slate-200 bg-[#10243A] text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#F4A62A]">
            International Shipping &amp; Fulfillment
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-white sm:text-4xl">
            China-to-Nigeria Logistics &amp; Nationwide Delivery
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Every pre-order and wholesale shipment follows a transparent 10-stage operational milestone workflow from supplier procurement in China to local dispatch across Nigeria.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/account/tracking">
              <Button variant="accent" size="md">
                Track Your Shipment
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/sourcing">
              <Button
                variant="outline"
                size="md"
                className="border-white/25 bg-transparent text-white hover:border-white hover:bg-white/10"
              >
                Request Freight Quotation
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Freight Calculation Methods */}
      <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
          <Ship className="h-4 w-4" />
          Freight Methods
        </div>
        <h2 className="mt-1.5 font-display text-2xl font-extrabold text-[#10243A]">
          Structured Freight Calculation Models
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SHIPPING_METHODS.map((method) => (
            <Card key={method.code} padding="md">
              <h3 className="font-display text-base font-bold text-[#10243A]">
                {method.label}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#64748B]">
                {method.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* 10-Stage Milestone Architecture */}
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
          <PackageCheck className="h-4 w-4" />
          Shipment Milestones
        </div>
        <h2 className="mt-1.5 font-display text-2xl font-extrabold text-[#10243A]">
          10-Stage China-to-Nigeria Tracking Pipeline
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm text-[#64748B]">
          Logistics Managers update each milestone as cargo moves through our China consolidation warehouse, international transit, Nigerian customs, and final dispatch.
        </p>

        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {INTERNATIONAL_LOGISTICS_STAGES.map((stage) => (
            <li
              key={stage.code}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-[#2563EB]">
                  STAGE {String(stage.step).padStart(2, '0')}
                </span>
                <StatusBadge
                  tone={
                    stage.region === 'China'
                      ? 'navy'
                      : stage.region === 'International'
                        ? 'info'
                        : 'success'
                  }
                >
                  {stage.region}
                </StatusBadge>
              </div>
              <h3 className="mt-2.5 font-display text-sm font-bold text-[#10243A]">
                {stage.label}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#64748B]">
                {stage.summary}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Nationwide 36 States + FCT Delivery Coverage */}
      <section
        id="delivery-coverage"
        className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-8"
      >
        <Card padding="lg">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
                <Truck className="h-4 w-4" />
                Nationwide Delivery Coverage
              </div>
              <h2 className="mt-1.5 font-display text-2xl font-extrabold text-[#10243A]">
                Delivering Across All 36 Nigerian States &amp; FCT Abuja
              </h2>
              <p className="mt-1.5 text-sm text-[#64748B]">
                Priority hub dispatch across Katsina, Abuja, Kano, Kaduna, Lagos, and Jigawa with coordinated nationwide delivery.
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-[#10243A]">
              {statesDisplay.length} Active Regions
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {statesDisplay.map((state) => (
              <div
                key={state.code}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                  state.isPriorityHub
                    ? 'border-[#2563EB]/30 bg-[#EFF6FF] font-semibold text-[#10243A]'
                    : 'border-slate-200 bg-[#F5F7FA] text-[#202B38]'
                }`}
              >
                <MapPin
                  className={`h-3.5 w-3.5 shrink-0 ${
                    state.isPriorityHub ? 'text-[#2563EB]' : 'text-[#64748B]'
                  }`}
                />
                <span className="truncate">{state.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
