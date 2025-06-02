import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Plus, Search, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { supabase, Tables } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

type Expense = Tables['expenses'];
type Account = Tables['accounts'];

const Expenses: React.FC = () => {
  const { companyProfile } = useCompany();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<(Expense & { account: Account })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchExpenses();
  }, [companyProfile]);

  const fetchExpenses = async () => {
    if (!companyProfile) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          account:expense_account_id (
            account_name,
            account_type
          )
        `)
        .eq('company_id', companyProfile.id)
        .order('expense_date', { ascending: false });
        
      if (error) throw error;
      
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const filteredExpenses = expenses.filter(expense => 
    expense.expense_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.account.account_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!companyProfile) {
    return (
      <div className="card p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">Company Profile Required</h2>
        <p className="mb-6">Please set up your company profile before managing expenses.</p>
        <Button onClick={() => navigate('/company-settings')}>
          Set Up Company Profile
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-gray-600">
            Manage your expenses and track GST input credit
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button 
            onClick={() => navigate('/expenses/new')}
            leftIcon={<Plus className="h-5 w-5" />}
          >
            Record Expense
          </Button>
        </div>
      </div>

      <div className="card mb-6">
        <div className="relative">
          <Input
            placeholder="Search by description, vendor, or account..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-5 w-5 text-gray-400" />}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Date</th>
                  <th className="table-header-cell">Description</th>
                  <th className="table-header-cell">Vendor</th>
                  <th className="table-header-cell">Account</th>
                  <th className="table-header-cell">Amount (₹)</th>
                  <th className="table-header-cell">GST Input Credit (₹)</th>
                  <th className="table-header-cell w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      {searchTerm ? 'No expenses found matching your search.' : 'No expenses found. Click "Record Expense" to add one.'}
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="table-row">
                      <td className="table-cell">
                        {format(new Date(expense.expense_date), 'dd/MM/yyyy')}
                      </td>
                      <td className="table-cell font-medium text-gray-900">
                        {expense.expense_description}
                      </td>
                      <td className="table-cell">
                        <div>
                          <div className="font-medium text-gray-900">
                            {expense.vendor_name || <span className="text-gray-400">-</span>}
                          </div>
                          {expense.vendor_gstin && (
                            <div className="text-xs text-gray-500">
                              GSTIN: {expense.vendor_gstin}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">
                        {expense.account.account_name}
                      </td>
                      <td className="table-cell">
                        ₹{expense.total_expense_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="table-cell">
                        ₹{(expense.cgst_input_credit + expense.sgst_input_credit + expense.igst_input_credit).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/expenses/${expense.id}`}
                            className="text-gray-600 hover:text-primary-600"
                            title="View/Edit expense"
                          >
                            <FileText className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;