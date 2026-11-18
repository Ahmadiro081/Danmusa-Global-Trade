import { useParams } from 'react-router-dom';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { DataTable, type TableColumn } from '../../components/ui/DataTable';
import { IntegrationNotice } from '../../components/ui/StateViews';
import {
  CURRENCIES,
  INTERNATIONAL_LOGISTICS_STAGES,
  NIGERIAN_STATES,
  PAYMENT_STATUSES,
  RBAC_ROLES,
} from '../../config/app.config';
import { NotFoundPage } from '../public/NotFoundPage';
import { ADMIN_MODULES, ADMIN_PORTAL_NAV } from './adminModules';

export function AdminModulePage() {
  const { moduleSlug } = useParams<{ moduleSlug: string }>();
  const spec = moduleSlug ? ADMIN_MODULES[moduleSlug] : undefined;

  if (!spec) {
    return <NotFoundPage />;
  }

  // Provide real reference structures for non-transactional reference modules
  // (Deliveries 36+FCT, Staff RBAC 10 roles, Settings multi-currency policy),
  // and honest empty tables for transactional database modules awaiting Supabase.
  let referenceRows: Record<string, string | number>[] = [];

  if (spec.slug === 'deliveries') {
    referenceRows = NIGERIAN_STATES.map((state) => ({
      code: state.code,
      name: state.name,
      zone: state.zone,
      corridor: state.isPriorityHub
        ? 'Priority Hub (Katsina / Northern & Major Gateway)'
        : 'Standard Nationwide Delivery',
    }));
  } else if (spec.slug === 'staff') {
    referenceRows = RBAC_ROLES.map((role) => ({
      roleName: role.name,
      scope: role.scope,
      domains: role.keyDomains.join(', '),
    }));
  } else if (spec.slug === 'settings') {
    referenceRows = [
      {
        pair: 'NGN / NGN (Base Customer Currency)',
        rate: `1.00 (${CURRENCIES.NGN.symbol})`,
        policy: 'Primary customer storefront and settlement currency',
      },
      {
        pair: 'CNY / NGN (Supplier Procurement)',
        rate: `Pending Live Rate (${CURRENCIES.CNY.symbol})`,
        policy: 'Frozen on procurement_orders and quotations at creation',
      },
      {
        pair: 'USD / NGN (International Freight)',
        rate: `Pending Live Rate (${CURRENCIES.USD.symbol})`,
        policy: 'Frozen on shipments and quotations; historical records immutable',
      },
    ];
  }

  const columns: TableColumn<Record<string, string | number>>[] = spec.columns.map(
    (col) => ({
      key: col.key,
      header: col.header,
      align: col.align,
      render: (row) => row[col.key] ?? '—',
    }),
  );

  return (
    <PortalLayout
      portalTitle="Admin Operations"
      portalSubtitle="Stage 1 Foundation Preview"
      breadcrumbCurrent={spec.title}
      navItems={ADMIN_PORTAL_NAV}
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold text-[#8E6B0C]">{spec.domain}</p>
        <h1 className="font-display text-2xl font-bold text-[#0B1E3D]">
          {spec.title}
        </h1>
        <p className="max-w-3xl text-sm text-slate-600">{spec.description}</p>
      </div>

      <Card padding="sm">
        <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
          <div>
            <p className="font-semibold text-[#0B1E3D]">Authorized Staff Roles</p>
            <p className="mt-1 text-slate-600">{spec.authorizedRoles.join(' · ')}</p>
          </div>
          <div>
            <p className="font-semibold text-[#0B1E3D]">PostgreSQL Target Tables</p>
            <p className="mt-1 font-mono text-slate-600">
              {spec.databaseTables.join(', ')}
            </p>
          </div>
        </div>
      </Card>

      {spec.slug === 'payments' ? (
        <Card padding="sm">
          <p className="text-xs font-semibold text-[#0B1E3D]">
            Required Payment Lifecycle Statuses (Enforced via PostgreSQL CHECK Constraint)
          </p>
          <p className="mt-1.5 text-xs text-slate-600">
            {PAYMENT_STATUSES.join(' · ')}
          </p>
        </Card>
      ) : null}

      {spec.slug === 'shipments' ? (
        <Card padding="sm">
          <p className="text-xs font-semibold text-[#0B1E3D]">
            10-Stage International Milestone Progression
          </p>
          <p className="mt-1.5 text-xs text-slate-600">
            {INTERNATIONAL_LOGISTICS_STAGES.map(
              (s) => `${s.step}. ${s.label}`,
            ).join(' → ')}
          </p>
        </Card>
      ) : null}

      <IntegrationNotice
        title="Backend Persistence & Authorization Pending"
        description={`Administrative ${spec.title} mutations require verified staff authentication via Supabase Auth, PostgreSQL RLS enforcement, and immutable audit logging.`}
      />

      <DataTable
        columns={columns}
        rows={referenceRows}
        rowKey={(row) => String(Object.values(row)[0])}
        emptyTitle={`No live ${spec.title.toLowerCase()} records connected`}
        emptyDescription={`Once Supabase PostgreSQL migrations are applied and staff authentication is active, ${spec.databaseTables.join(', ')} records will populate here.`}
      />
    </PortalLayout>
  );
}
