import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase, Tables } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

type Account = Tables['accounts'];

interface AccountSummary {
  account: Account;
  total: number;
}

const ProfitLossReport: React.FC = () => {
  const { companyProfile } = useCompany();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfMonth(new Date()));
  const [totalSales, setTotalSales] = useState(0);
  const [expensesByAccount, setExpensesByAccount] = useState<AccountSummary[]>([]);

  useEffect(() => {
    fetchReportData();
  }, [companyProfile, startDate, endDate]);

  const fetchReportData = async () => {
    if (!companyProfile) return;

    setLoading(true);
    try {
      // Fetch total sales (excluding drafts)
      const { data: salesData, error: salesError } = await supabase
        .from('invoices')
        .select('sub_total_amount')
        .eq('company_id', companyProfile.id)
        .neq('status', 'Draft')
        .gte('invoice_date', format(startDate, 'yyyy-MM-dd'))
        .lte('invoice_date', format(endDate, 'yyyy-MM-dd'));

      if (salesError) throw salesError;

      const totalSales = salesData?.reduce((sum, invoice) => sum + (invoice.sub_total_amount || 0), 0) || 0;
      setTotalSales(totalSales);

      // Fetch expense accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('company_id', companyProfile.id)
        .eq('account_type', 'Expense')
        .order('account_name');

      if (accountsError) throw accountsError;

      // Fetch expenses for each account
      const expenseSummaries = await Promise.all((accounts || []).map(async (account) => {
        const { data: expenses, error: expensesError } = await supabase
          .from('expenses')
          .select('amount_before_gst')
          .eq('company_id', companyProfile.id)
          .eq('expense_account_id', account.id)
          .gte('expense_date', format(startDate, 'yyyy-MM-dd'))
          .lte('expense_date', format(endDate, 'yyyy-MM-dd'));

        if (expensesError) throw expensesError;

        const total = expenses?.reduce((sum, expense) => sum + (expense.amount_before_gst || 0), 0) || 0;

        return {
          account,
          total,
        };
      }));

      setExpensesByAccount(expenseSummaries);
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const totalExpenses = expensesByAccount.reduce((sum, item) => sum + item.total, 0);
  const netProfit = totalSales - totalExpenses;

  const previousMonth = () => {
    setStartDate(startOfMonth(subMonths(startDate, 1)));
    setEndDate(endOfMonth(subMonths(endDate, 1)));
  };

  const nextMonth = () => {
    setStartDate(startOfMonth(addMonths(startDate, 1)));
    setEndDate(endOfMonth(addMonths(endDate, 1)));
  };

  if (!companyProfile) {
    return (
      <div className="card p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">Company Profile Required</h2>
        <p className="mb-6">Please set up your company profile before viewing reports.</p>
        <Button onClick={() => navigate('/company-settings')}>
          Set Up Company Profile
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Profit & Loss Statement</h1>

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {format(startDate, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              onClick={previousMonth}
              leftIcon={<ChevronLeft className="h-5 w-5" />}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              onClick={nextMonth}
              rightIcon={<ChevronRight className="h-5 w-5" />}
            >
              Next
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Income Section */}
            <div>
              <h3 className="text-lg font-semibold text-success-600 mb-3">Income</h3>
              <div className="bg-success-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Sales</span>
                  <span className="font-semibold">
                    ₹{totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Expenses Section */}
            <div>
              <h3 className="text-lg font-semibold text-error-600 mb-3">Expenses</h3>
              <div className="bg-error-50 p-4 rounded-lg space-y-3">
                {expensesByAccount.map((item) => (
                  <div key={item.account.id} className="flex justify-between items-center">
                    <span>{item.account.account_name}</span>
                    <span>₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div className="border-t border-error-200 pt-2 font-medium">
                  <div className="flex justify-between items-center">
                    <span>Total Expenses</span>
                    <span>₹{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Profit/Loss Section */}
            <div className="border-t border-gray-200 pt-4">
              <div className={`p-4 rounded-lg ${netProfit >= 0 ? 'bg-success-50' : 'bg-error-50'}`}>
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Net {netProfit >= 0 ? 'Profit' : 'Loss'}</span>
                  <span className={netProfit >= 0 ? 'text-success-600' : 'text-error-600'}>
                    ₹{Math.abs(netProfit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfitLossReport;