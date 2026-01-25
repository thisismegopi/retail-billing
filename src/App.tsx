import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';

import AuthLayout from '@/layouts/AuthLayout';
import { AuthProvider } from '@/contexts/AuthContext';
import BillingPage from '@/pages/billing/BillingPage';
import { CartProvider } from '@/contexts/CartContext';
import CollectionsPage from '@/pages/collections/CollectionsPage';
import CustomerListPage from './pages/customers/CustomerListPage';
import CategoryListPage from './pages/categories/CategoryListPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import LoginPage from './pages/auth/LoginPage';
import MainLayout from './layouts/MainLayout';
import ProductListPage from './pages/products/ProductListPage';
import ReportsDashboard from './pages/reports/ReportsDashboard';
import SalesReportPage from './pages/reports/SalesReportPage';
import ShopSettingsPage from './pages/settings/ShopSettingsPage';
import InvoicePage from './pages/invoice/InvoicePage';
import { Toaster } from '@/components/ui/toaster';
import { useAuth } from '@/hooks/useAuth';

const ProtectedRoute = () => {
    const { user, loading } = useAuth();
    if (loading) return <div className='flex h-screen items-center justify-center'>Loading...</div>;
    if (!user) return <Navigate to='/auth/login' replace />;
    return <Outlet />;
};

function App() {
    return (
        <AuthProvider>
            <CartProvider>
                <BrowserRouter>
                    <Routes>
                        {/* Public Routes */}
                        <Route path='/auth' element={<AuthLayout />}>
                            <Route path='login' element={<LoginPage />} />
                        </Route>

                        {/* Protected Routes */}
                        <Route element={<ProtectedRoute />}>
                            <Route path='/' element={<MainLayout />}>
                                <Route index element={<DashboardPage />} />
                                <Route path='billing' element={<BillingPage />} />
                                <Route path='products' element={<ProductListPage />} />
                                <Route path='categories' element={<CategoryListPage />} />
                                <Route path='customers' element={<CustomerListPage />} />
                                <Route path='collections' element={<CollectionsPage />} />
                                <Route path='reports' element={<ReportsDashboard />} />
                                <Route path='reports/sales' element={<SalesReportPage />} />
                                <Route path='settings' element={<ShopSettingsPage />} />
                            </Route>
                            {/* Invoice route - outside main layout for printing */}
                            <Route path='invoice/:billId' element={<InvoicePage />} />
                        </Route>

                        {/* Fallback */}
                        <Route path='*' element={<Navigate to='/' replace />} />
                    </Routes>
                </BrowserRouter>
                <Toaster />
            </CartProvider>
        </AuthProvider>
    );
}

export default App;
