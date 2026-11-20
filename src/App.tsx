import { BrowserRouter, Route, Routes } from 'react-router-dom';
import {
  RequireCustomerAuth,
  RequireStaffAuth,
} from './components/auth/RouteGuards';
import { PublicLayout } from './components/layout/PublicLayout';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { AdminModulePage } from './pages/admin/AdminModulePage';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { CartPage } from './pages/customer/CartPage';
import { CheckoutPage } from './pages/customer/CheckoutPage';
import { CustomerDashboardPage } from './pages/customer/CustomerDashboardPage';
import { CustomerOrdersPage } from './pages/customer/CustomerOrdersPage';
import { CustomerQuotationsPage } from './pages/customer/CustomerQuotationsPage';
import { CustomerSettingsPage } from './pages/customer/CustomerSettingsPage';
import { CustomerSourcingPage } from './pages/customer/CustomerSourcingPage';
import { LoginPage } from './pages/customer/LoginPage';
import { OrderTrackingPage } from './pages/customer/OrderTrackingPage';
import { RegisterPage } from './pages/customer/RegisterPage';
import { AboutPage } from './pages/public/AboutPage';
import { CataloguePage } from './pages/public/CataloguePage';
import { ContactPage } from './pages/public/ContactPage';
import { HomePage } from './pages/public/HomePage';
import { LogisticsPage } from './pages/public/LogisticsPage';
import { NotFoundPage } from './pages/public/NotFoundPage';
import { ProductDetailPage } from './pages/public/ProductDetailPage';
import { WholesaleSourcingPage } from './pages/public/WholesaleSourcingPage';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Storefront & Unified Auth Routes */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/catalogue" element={<CataloguePage />} />
                <Route path="/catalogue/:slug" element={<ProductDetailPage />} />
                <Route path="/sourcing" element={<WholesaleSourcingPage />} />
                <Route path="/logistics" element={<LogisticsPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>

              {/* Protected Customer Portal Routes */}
              <Route element={<RequireCustomerAuth />}>
                <Route path="/account" element={<CustomerDashboardPage />} />
                <Route path="/account/orders" element={<CustomerOrdersPage />} />
                <Route
                  path="/account/quotations"
                  element={<CustomerQuotationsPage />}
                />
                <Route
                  path="/account/tracking"
                  element={<OrderTrackingPage />}
                />
                <Route
                  path="/account/sourcing"
                  element={<CustomerSourcingPage />}
                />
                <Route
                  path="/account/settings"
                  element={<CustomerSettingsPage />}
                />
              </Route>

              {/* Protected Administrative & Staff Operations Routes */}
              <Route element={<RequireStaffAuth />}>
                <Route path="/admin" element={<AdminOverviewPage />} />
                <Route
                  path="/admin/:moduleSlug"
                  element={<AdminModulePage />}
                />
              </Route>
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
