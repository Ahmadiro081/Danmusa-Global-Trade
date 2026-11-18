import { useState, type FormEvent } from 'react';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FieldWrapper, TextInput } from '../../components/ui/FormField';
import { IntegrationNotice } from '../../components/ui/StateViews';
import { INTERNATIONAL_LOGISTICS_STAGES } from '../../config/app.config';
import { CUSTOMER_PORTAL_NAV } from './CustomerDashboardPage';

export function OrderTrackingPage() {
  const [trackingCode, setTrackingCode] = useState('');
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);

  const handleLookup = (event: FormEvent) => {
    event.preventDefault();
    if (!trackingCode.trim()) {
      setLookupMessage('Enter a DGT order or shipment tracking reference.');
      return;
    }
    setLookupMessage(
      `Lookup for "${trackingCode.trim()}" requires live Supabase shipment milestone queries (Stage 2). Below is the 10-stage milestone structure used for all China-to-Nigeria shipments.`,
    );
  };

  return (
    <PortalLayout
      portalTitle="Customer Portal"
      portalSubtitle="Registered Customer Workspace"
      breadcrumbCurrent="Order & Shipment Tracking"
      navItems={CUSTOMER_PORTAL_NAV}
    >
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-[#0B1E3D]">
          Order & Shipment Tracking
        </h1>
        <p className="text-sm text-slate-600">
          Track international freight from procurement in China through Nigerian customs
          release and final state delivery.
        </p>
      </div>

      <IntegrationNotice
        title="Live Tracking Database Pending"
        description="Real tracking lookups query authenticated shipment_milestones rows in Supabase PostgreSQL. No fabricated shipment progress is simulated."
      />

      <Card>
        <form onSubmit={handleLookup} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <FieldWrapper
              id="tracking-input"
              label="Tracking or Order Reference"
            >
              <TextInput
                id="tracking-input"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="Enter DGT tracking number..."
              />
            </FieldWrapper>
          </div>
          <Button type="submit" variant="primary" size="md">
            Check Tracking Status
          </Button>
        </form>

        {lookupMessage ? (
          <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
            {lookupMessage}
          </p>
        ) : null}
      </Card>

      <Card>
        <h2 className="font-display text-base font-bold text-[#0B1E3D]">
          Standard 10-Stage International Milestone Structure
        </h2>
        <ol className="mt-4 divide-y divide-slate-200">
          {INTERNATIONAL_LOGISTICS_STAGES.map((stage) => (
            <li
              key={stage.code}
              className="py-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-semibold text-[#8E6B0C] tabular-nums">
                  {String(stage.step).padStart(2, '0')}
                </span>
                <span className="text-sm font-medium text-[#0B1E3D]">{stage.label}</span>
              </div>
              <span className="text-xs text-slate-500">{stage.region}</span>
            </li>
          ))}
        </ol>
      </Card>
    </PortalLayout>
  );
}
