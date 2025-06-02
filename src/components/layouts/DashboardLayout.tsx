import React, { useState } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  BookOpen, 
  LayoutDashboard, 
  Receipt, 
  CreditCard, 
  Package, 
  PieChart, 
  BarChart, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ChevronDown 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';

const DashboardLayout: React.FC = () => {
  const { user, signOut } = useAuth();
  const { companyProfile, loading: companyLoading } = useCompany();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const navLinks = [
    { 
      path: '/dashboard', 
      name: 'Dashboard', 
      icon: <LayoutDashboard className="h-5 w-5" /> 
    },
    { 
      path: '/invoices', 
      name: 'Sales Invoices', 
      icon: <Receipt className="h-5 w-5" /> 
    },
    { 
      path: '/expenses', 
      name: 'Expenses', 
      icon: <CreditCard className="h-5 w-5" /> 
    },
    { 
      path: '/products-services', 
      name: 'Products & Services', 
      icon: <Package className="h-5 w-5" /> 
    },
    { 
      path: '/chart-of-accounts', 
      name: 'Chart of Accounts', 
      icon: <PieChart className="h-5 w-5" /> 
    },
  ];

  const reportLinks = [
    { 
      path: '/reports/profit-loss', 
      name: 'Profit & Loss', 
      icon: <BarChart className="h-5 w-5" /> 
    },
    { 
      path: '/reports/gst', 
      name: 'GST Summary', 
      icon: <BarChart className="h-5 w-5" /> 
    },
  ];

  const isActiveLink = (path: string) => {
    return location.pathname === path;
  };

  const isActiveReportLink = () => {
    return reportLinks.some(link => location.pathname === link.path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-gray-900/50 lg:hidden"
          onClick={closeSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 transform bg-white shadow-lg transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:h-screen lg:z-10
        `}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-5 lg:py-6">
            <Link to="/dashboard" className="flex items-center text-primary-600" onClick={closeSidebar}>
              <BookOpen className="h-7 w-7" />
              <span className="ml-2 text-xl font-bold">AccuBooks</span>
            </Link>
            <button
              className="rounded p-1 lg:hidden"
              onClick={closeSidebar}
            >
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>

          {/* Company profile info */}
          <div className="border-b border-gray-200 px-4 pb-4">
            {companyLoading ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner />
              </div>
            ) : companyProfile ? (
              <div>
                <h3 className="font-medium text-gray-900 truncate">
                  {companyProfile.company_name}
                </h3>
                {companyProfile.gstin && (
                  <p className="text-xs text-gray-500 mt-1">
                    GSTIN: {companyProfile.gstin}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                <Link to="/company-settings" onClick={closeSidebar} className="text-primary-600 hover:text-primary-700">
                  Complete your company profile
                </Link>
              </div>
            )}
          </div>

          {/* Navigation links */}
          <nav className="flex-1 px-2 py-4">
            <ul className="space-y-1">
              {navLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className={`
                      flex items-center px-3 py-2 rounded-md text-sm font-medium
                      ${isActiveLink(link.path) 
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-gray-700 hover:bg-gray-100'}
                    `}
                    onClick={closeSidebar}
                  >
                    {link.icon}
                    <span className="ml-3">{link.name}</span>
                  </Link>
                </li>
              ))}

              {/* Reports dropdown */}
              <li>
                <div className="relative">
                  <button
                    type="button"
                    className={`
                      flex items-center w-full px-3 py-2 rounded-md text-sm font-medium
                      ${isActiveReportLink() 
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-gray-700 hover:bg-gray-100'}
                    `}
                    onClick={() => setReportsOpen(!reportsOpen)}
                  >
                    <BarChart className="h-5 w-5" />
                    <span className="ml-3 flex-1 text-left">Reports</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${reportsOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {reportsOpen && (
                    <ul className="pl-10 mt-1 space-y-1">
                      {reportLinks.map((link) => (
                        <li key={link.path}>
                          <Link
                            to={link.path}
                            className={`
                              flex items-center px-3 py-2 rounded-md text-sm font-medium
                              ${isActiveLink(link.path) 
                                ? 'bg-primary-50 text-primary-700' 
                                : 'text-gray-600 hover:bg-gray-100'}
                            `}
                            onClick={closeSidebar}
                          >
                            <span>{link.name}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>

              {/* Settings link */}
              <li>
                <Link
                  to="/company-settings"
                  className={`
                    flex items-center px-3 py-2 rounded-md text-sm font-medium
                    ${isActiveLink('/company-settings') 
                      ? 'bg-primary-50 text-primary-700' 
                      : 'text-gray-700 hover:bg-gray-100'}
                  `}
                  onClick={closeSidebar}
                >
                  <Settings className="h-5 w-5" />
                  <span className="ml-3">Company Settings</span>
                </Link>
              </li>
            </ul>
          </nav>

          {/* User and sign out */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                {user.email}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={signOut}
                leftIcon={<LogOut className="h-4 w-4" />}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white shadow-sm">
          <div className="flex h-16 items-center justify-between px-4 md:px-6">
            <button
              className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open sidebar</span>
            </button>

            <div className="flex items-center">
              <div className="text-sm text-gray-700 hidden md:block">
                {user.email}
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 p-4 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} AccuBooks. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;