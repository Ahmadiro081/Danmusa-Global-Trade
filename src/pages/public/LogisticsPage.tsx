import { useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { TextInput } from '../../components/ui/FormField';
import {
  INTERNATIONAL_LOGISTICS_STAGES,
  NIGERIAN_STATES,
  SHIPPING_METHODS,
} from '../../config/app.config';

export function LogisticsPage() {
  const [stateSearch, setStateSearch] = useState('');

  const filteredStates = useMemo(() => {
    const q = stateSearch.trim().toLowerCase();
    if (!q) return NIGERIAN_STATES;
    return NIGERIAN_STATES.filter(
      (state) =>
        state.name.toLowerCase().includes(q) ||
        state.zone.toLowerCase().includes(q) ||
        state.code.toLowerCase().includes(q),
    );
  }, [stateSearch]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold text-[#8E6B0C]">
          International Freight & Nationwide Distribution
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-[#0B1E3D]">
          China-to-Nigeria Shipping & Delivery
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Structured 10-stage international logistics tracking with nationwide delivery
          coverage across all 36 Nigerian states and the FCT, prioritizing Katsina State
          and Northern Nigeria corridors.
        </p>
      </div>

      {/* 4 Shipping Calculation Methods */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[#0B1E3D]">
          Supported Shipping Calculation Methods
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SHIPPING_METHODS.map((method) => (
            <Card key={method.code} padding="sm">
              <p className="font-mono text-[11px] text-[#8E6B0C]">{method.code}</p>
              <h3 className="mt-1 font-display text-sm font-semibold text-[#0B1E3D]">
                {method.label}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                {method.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* 10-Stage International Logistics Pipeline */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[#0B1E3D]">
          10-Stage International Logistics Workflow
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {INTERNATIONAL_LOGISTICS_STAGES.map((stage) => (
            <Card key={stage.code} padding="sm">
              <div className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#0B1E3D] font-mono text-xs font-bold text-[#C59B27] tabular-nums">
                  {String(stage.step).padStart(2, '0')}
                </span>
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{stage.region}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{stage.code}</span>
                  </div>
                  <h3 className="mt-0.5 font-display text-sm font-semibold text-[#0B1E3D]">
                    {stage.label}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {stage.summary}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Nigerian 36 States + FCT Coverage Directory */}
      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-[#0B1E3D]">
              Nigerian State Delivery Coverage (36 States + FCT)
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Delivery tariffs, logistics partners, and transit windows are configured by
              administrators in the Operations Portal.
            </p>
          </div>
          <div className="w-full sm:w-72">
            <TextInput
              type="search"
              value={stateSearch}
              onChange={(e) => setStateSearch(e.target.value)}
              placeholder="Search state or geopolitical zone..."
              aria-label="Search Nigerian states"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredStates.map((state) => (
            <div
              key={state.code}
              className="rounded-md border border-slate-200 bg-white px-4 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-sm font-semibold text-[#0B1E3D]">
                  {state.name}
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  {state.code}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {state.zone}
                {state.isPriorityHub ? ' · Priority Logistics Corridor' : ''}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
