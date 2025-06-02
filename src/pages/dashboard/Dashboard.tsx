import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { format } from 'date-fns';

interface DashboardSummary {
  totalSalesThisMonth: number;
  totalExpensesThisMonth: number;
}

const Dashboard: React.FC = () => {
  const { companyProfile } = useCompany();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary>({
    totalSalesThisMonth: 0,
    totalExpensesThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!companyProfile) return;

      setLoading(true);
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

        // Fetch total sales for current month
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select('total_invoice_amount')
          .eq('company_id', companyProfile.id)
          .in('status', ['Sent', 'Paid'])
          .gte('invoice_date', startOfMonth)
          .lte('invoice_date', endOfMonth);

        if (invoiceError) throw invoiceError;

        // Fetch total expenses for current month
        const { data: expenseData, error: expenseError } = await supabase
          .from('expenses')
          .select('total_expense_amount')
          .eq('company_id', companyProfile.id)
          .gte('expense_date', startOfMonth)
          .lte('expense_date', endOfMonth);

        if (expenseError) throw expenseError;

        const totalSales = invoiceData?.reduce((sum, invoice) => sum + (invoice.total_invoice_amount || 0), 0) || 0;
        const totalExpenses = expenseData?.reduce((sum, expense) => sum + (expense.total_expense_amount || 0), 0) || 0;

        setSummary({
          totalSalesThisMonth: totalSales,
          totalExpensesThisMonth: totalExpenses,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [companyProfile]);

  if (!companyProfile) {
    return (
      <div className="card p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">Welcome to AccuBooks!</h2>
        <p className="mb-6">To get started, please set up your company profile.</p>
        <Button onClick={() => navigate('/company-settings')}>
          Set Up Company Profile
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-600">
            Welcome to {companyProfile.company_name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
          <Button 
            onClick={() => navigate('/invoices/new')}
            leftIcon={<PlusCircle className="h-5 w-5" />}
          >
            Create Invoice
          </Button>
          <Button 
            variant="secondary"
            onClick={() => navigate('/expenses/new')}
            leftIcon={<PlusCircle className="h-5 w-5" />}
          >
            Record Expense
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sales This Month</p>
              {loading ? (
                <div className="h-8 flex items-center mt-1">
                  <LoadingSpinner />
                </div>
              ) : (
                <h3 className="text-2xl font-bold mt-1">
                  ₹{summary.totalSalesThisMonth.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </h3>
              )}
            </div>
            <div className="bg-primary-100 p-3 rounded-full">
              <ArrowUpRight className="h-6 w-6 text-primary-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              {format(new Date(), 'MMMM yyyy')}
            </p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses This Month</p>
              {loading ? (
                <div className="h-8 flex items-center mt-1">
                  <LoadingSpinner />
                </div>
              ) : (
                <h3 className="text-2xl font-bold mt-1">
                  ₹{summary.totalExpensesThisMonth.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </h3>
              )}
            </div>
            <div className="bg-error-100 p-3 rounded-full">
              <ArrowDownRight className="h-6 w-6 text-error-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              {format(new Date(), 'MMMM yyyy')}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div
            className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer transition duration-200"
            onClick={() => navigate('/invoices')}
          >
            <div className="flex items-center justify-center mb-3">
              <div className="bg-primary-100 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-primary-600" />
              </div>
            </div>
            <h3 className="text-center font-medium">View Invoices</h3>
          </div>
          
          <div
            className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer transition duration-200"
            onClick={() => navigate('/expenses')}
          >
            <div className="flex items-center justify-center mb-3">
              <div className="bg-error-100 p-3 rounded-full">
                <ArrowDownRight className="h-6 w-6 text-error-600" />
              </div>
            </div>
            <h3 className="text-center font-medium">View Expenses</h3>
          </div>
          
          <div
            className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer transition duration-200"
            onClick={() => navigate('/reports/profit-loss')}
          >
            <div className="flex items-center justify-center mb-3">
              <div className="bg-success-100 p-3 rounded-full">
                <PlusCircle className="h-6 w-6 text-success-600" />
              </div>
            </div>
            <h3 className="text-center font-medium">Profit & Loss</h3>
          </div>
          
          <div
            className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer transition duration-200"
            onClick={() => navigate('/reports/gst')}
          >
            <div className="flex items-center justify-center mb-3">
              <div className="bg-warning-100 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-warning-600" />
              </div>
            </div>
            <h3 className="text-center font-medium">GST Summary</h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;