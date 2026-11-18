import { Link } from 'react-router-dom';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Button } from '../../components/ui/Button';
import { DataTable, type TableColumn } from '../../components/ui/DataTable';
import { IntegrationNotice } from '../../components/ui/StateViews';
import { CUSTOMER_PORTAL_NAV } from './CustomerDashboardPage';

interface OrderSummaryRow {
  orderNumber: string;
  orderType: string;
  destinationState: string;
  totalNgn: string;
  paymentStatus: string;
  orderStatus: string;
}

const ORDER_COLUMNS: readonly TableColumn<OrderSummaryRow>[] = [
  { key: 'orderNumber', header: 'Order Number', render: (r) => r.orderNumber },
  { key: 'orderType', header: 'Workflow', render: (r) => r.orderType },
  { key: 'destinationState', header: 'Destination State', render: (r) => r.destinationState },
  { key: 'paymentStatus', header: 'Payment Status', render: (r) => r.paymentStatus },
  { key: 'orderStatus', header: 'Order Status', render: (r) => r.orderStatus },
  { key: 'totalNgn', header: 'Total (NGN)', align: 'right', render: (r) => r.totalNgn },
];

export function CustomerOrdersPage() {
  return (
    <PortalLayout
      portalTitle="Customer Portal"
      portalSubtitle="Registered Customer Workspace"
      breadcrumbCurrent="Order History"
      navItems={CUSTOMER_PORTAL_NAV}
      topAction={
        <Link to="/catalogue">
          <Button variant="primary" size="sm">
            Browse Catalogue
          </Button>
        </Link>
      }
    >
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-[#0B1E3D]">
          Order History
        </h1>
        <p className="text-sm text-slate-600">
          Ready-stock, pre-order, and quotation-backed orders associated with your
          verified account.
        </p>
      </div>

      <IntegrationNotice
        title="Live Order Query Pending Supabase Connection"
        description="Real customer orders are never stored in browser localStorage. Once authenticated against Supabase Auth, this table renders your verified PostgreSQL order records."
      />

      <DataTable
        columns={ORDER_COLUMNS}
        rows={[]}
        rowKey={(r) => r.orderNumber}
        emptyTitle="No authenticated orders loaded"
        emptyDescription="Sign in after Supabase Auth is configured to view your ready-stock and pre-order history."
        emptyAction={
          <Link to="/login">
            <Button variant="outline" size="sm">
              Go to Sign In
            </Button>
          </Link>
        }
      />
    </PortalLayout>
  );
}
