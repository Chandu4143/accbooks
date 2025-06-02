import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoadingSpinner from './components/ui/LoadingSpinner';
import AuthLayout from './components/layouts/AuthLayout';
import DashboardLayout from './components/layouts/DashboardLayout';

// Auth Pages
const SignIn = lazy(() => import('./pages/auth/SignIn'));
const SignUp = lazy(() => import('./pages/auth/SignUp'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));

// Dashboard Pages
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const CompanySettings = lazy(() => import('./pages/company/CompanySettings'));
const ChartOfAccounts = lazy(() => import('./pages/accounts/ChartOfAccounts'));
const ProductsServices = lazy(() => import('./pages/products/ProductsServices'));
const Invoices = lazy(() => import('./pages/invoices/Invoices'));
const CreateEditInvoice = lazy(() => import('./pages/invoices/CreateEditInvoice'));
const Expenses = lazy(() => import('./pages/expenses/Expenses'));
const CreateEditExpense = lazy(() => import('./pages/expenses/CreateEditExpense'));
const ProfitLossReport = lazy(() => import('./pages/reports/ProfitLossReport'));
const GSTReport = lazy(() => import('./pages/reports/GSTReport'));

function App() {
  const { user, loading, checkAuth } = useAuth();
  
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/signin" element={!user ? <SignIn /> : <Navigate to="/dashboard" replace />} />
          <Route path="/signup" element={!user ? <SignUp /> : <Navigate to="/dashboard" replace />} />
          <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to="/dashboard" replace />} />
          <Route path="/reset-password" element={!user ? <ResetPassword /> : <Navigate to="/dashboard" replace />} />
        </Route>

        {/* Protected Routes */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/signin" replace />} />
          <Route path="/company-settings" element={user ? <CompanySettings /> : <Navigate to="/signin" replace />} />
          <Route path="/chart-of-accounts" element={user ? <ChartOfAccounts /> : <Navigate to="/signin" replace />} />
          <Route path="/products-services" element={user ? <ProductsServices /> : <Navigate to="/signin" replace />} />
          <Route path="/invoices" element={user ? <Invoices /> : <Navigate to="/signin" replace />} />
          <Route path="/invoices/new" element={user ? <CreateEditInvoice /> : <Navigate to="/signin" replace />} />
          <Route path="/invoices/:id" element={user ? <CreateEditInvoice /> : <Navigate to="/signin" replace />} />
          <Route path="/expenses" element={user ? <Expenses /> : <Navigate to="/signin" replace />} />
          <Route path="/expenses/new" element={user ? <CreateEditExpense /> : <Navigate to="/signin" replace />} />
          <Route path="/expenses/:id" element={user ? <CreateEditExpense /> : <Navigate to="/signin" replace />} />
          <Route path="/reports/profit-loss" element={user ? <ProfitLossReport /> : <Navigate to="/signin" replace />} />
          <Route path="/reports/gst" element={user ? <GSTReport /> : <Navigate to="/signin" replace />} />
        </Route>

        {/* Default Route */}
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/signin"} replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;