import { Link } from 'react-router-dom';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Button } from '../../components/ui/Button';
import { DataTable, type TableColumn } from '../../components/ui/DataTable';
import { IntegrationNotice } from '../../components/ui/StateViews';
import { CUSTOMER_PORTAL_NAV } from './CustomerDashboardPage';

interface SourcingRequestRow {
  requestNumber: string;
  productTitle: string;
  targetQuantity: number;
  status: string;
  quotedTotalNgn: string;
}

const SOURCING_COLUMNS: readonly TableColumn<SourcingRequestRow>[] = [
  { key: 'requestNumber', header: 'Request Ref', render: (r) => r.requestNumber },
  { key: 'productTitle', header: 'Requested Product', render: (r) => r.productTitle },
  {
    key: 'targetQuantity',
    header: 'Target Qty',
    align: 'right',
    render: (r) => r.targetQuantity,
  },
  { key: 'status', header: 'Sourcing Status', render: (r) => r.status },
  {
    key: 'quotedTotalNgn',
    header: 'Quoted Total (NGN)',
    align: 'right',
    render: (r) => r.quotedTotalNgn,
  },
];

export function CustomerSourcingPage() {
  return (
    <PortalLayout
      portalTitle="Customer Portal"
      portalSubtitle="Registered Customer Workspace"
      breadcrumbCurrent="Wholesale Sourcing Requests"
      navItems={CUSTOMER_PORTAL_NAV}
      topAction={
        <Link to="/sourcing">
          <Button variant="accent" size="sm">
            New Sourcing Request
          </Button>
        </Link>
      }
    >
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-[#0B1E3D]">
          Wholesale Sourcing Requests & Quotations
        </h1>
        <p className="text-sm text-slate-600">
          Track supplier investigations from China and review formal NGN quotations
          prepared by the DGT Sourcing Team.
        </p>
      </div>

      <IntegrationNotice
        title="Sourcing & Quotation Persistence Pending"
        description="Authenticated customer sourcing requests and quotation acceptance workflows require Supabase PostgreSQL and Cloudinary media storage."
      />

      <DataTable
        columns={SOURCING_COLUMNS}
        rows={[]}
        rowKey={(r) => r.requestNumber}
        emptyTitle="No sourcing requests loaded"
        emptyDescription="Submit a custom sourcing brief or sign in once Supabase Auth is enabled to manage active quotations."
        emptyAction={
          <Link to="/sourcing">
            <Button variant="primary" size="sm">
              Open Sourcing Form
            </Button>
          </Link>
        }
      />
    </PortalLayout>
  );
}
