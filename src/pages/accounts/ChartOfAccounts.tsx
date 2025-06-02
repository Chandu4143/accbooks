import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { supabase, Tables } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

type Account = Tables['accounts'];

const schema = z.object({
  account_name: z.string().min(1, 'Account name is required'),
  account_type: z.enum(['Income', 'Expense', 'Asset', 'Liability'], {
    errorMap: () => ({ message: 'Please select an account type' }),
  }),
});

type FormValues = z.infer<typeof schema>;

const ChartOfAccounts: React.FC = () => {
  const { companyProfile } = useCompany();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors } 
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      account_name: '',
      account_type: 'Income',
    },
  });

  useEffect(() => {
    fetchAccounts();
  }, [companyProfile]);

  useEffect(() => {
    if (editingAccount) {
      reset({
        account_name: editingAccount.account_name,
        account_type: editingAccount.account_type,
      });
    } else {
      reset({
        account_name: '',
        account_type: 'Income',
      });
    }
  }, [editingAccount, reset]);

  const fetchAccounts = async () => {
    if (!companyProfile) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('company_id', companyProfile.id)
        .order('account_type')
        .order('account_name');
        
      if (error) throw error;
      
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (account: Account | null = null) => {
    setEditingAccount(account);
    setShowModal(true);
  };

  const closeModal = () => {
    setEditingAccount(null);
    setShowModal(false);
    reset();
  };

  const onSubmit = async (data: FormValues) => {
    if (!companyProfile) return;
    
    setIsSubmitting(true);
    try {
      if (editingAccount) {
        // Update existing account
        const { error } = await supabase
          .from('accounts')
          .update({
            account_name: data.account_name,
            account_type: data.account_type,
          })
          .eq('id', editingAccount.id)
          .eq('company_id', companyProfile.id);
          
        if (error) throw error;
        
        toast.success('Account updated successfully');
      } else {
        // Create new account
        const { error } = await supabase
          .from('accounts')
          .insert([{
            company_id: companyProfile.id,
            account_name: data.account_name,
            account_type: data.account_type,
            is_default: false,
          }]);
          
        if (error) throw error;
        
        toast.success('Account created successfully');
      }
      
      closeModal();
      fetchAccounts();
    } catch (error) {
      console.error('Error saving account:', error);
      toast.error('Failed to save account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteAccount = async (id: string) => {
    if (!companyProfile) return;
    
    if (!confirm('Are you sure you want to delete this account?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id)
        .eq('company_id', companyProfile.id)
        .eq('is_default', false);
        
      if (error) {
        if (error.message.includes('violates foreign key constraint')) {
          toast.error('Cannot delete account because it is being used by transactions');
          return;
        }
        throw error;
      }
      
      toast.success('Account deleted successfully');
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    }
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'Income':
        return 'bg-success-100 text-success-800';
      case 'Expense':
        return 'bg-error-100 text-error-800';
      case 'Asset':
        return 'bg-primary-100 text-primary-800';
      case 'Liability':
        return 'bg-warning-100 text-warning-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!companyProfile) {
    return (
      <div className="card p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">Company Profile Required</h2>
        <p className="mb-6">Please set up your company profile before accessing the Chart of Accounts.</p>
        <Button onClick={() => window.location.href = '/company-settings'}>
          Set Up Company Profile
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Chart of Accounts</h1>
          <p className="text-gray-600">
            Manage your financial accounts
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button 
            onClick={() => openModal()}
            leftIcon={<Plus className="h-5 w-5" />}
          >
            Add Account
          </Button>
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
                  <th className="table-header-cell">Account Name</th>
                  <th className="table-header-cell">Account Type</th>
                  <th className="table-header-cell">System Default</th>
                  <th className="table-header-cell w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      No accounts found. Click "Add Account" to create one.
                    </td>
                  </tr>
                ) : (
                  accounts.map((account) => (
                    <tr key={account.id} className="table-row">
                      <td className="table-cell font-medium text-gray-900">
                        {account.account_name}
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${getAccountTypeColor(account.account_type)}`}>
                          {account.account_type}
                        </span>
                      </td>
                      <td className="table-cell">
                        {account.is_default ? (
                          <span className="badge badge-gray">Default</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openModal(account)}
                            className="text-gray-600 hover:text-primary-600"
                            disabled={account.is_default}
                            title={account.is_default ? "Default accounts cannot be edited" : "Edit account"}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteAccount(account.id)}
                            className="text-gray-600 hover:text-error-600"
                            disabled={account.is_default}
                            title={account.is_default ? "Default accounts cannot be deleted" : "Delete account"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* Modal for adding/editing accounts */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={closeModal}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingAccount ? 'Edit Account' : 'Add New Account'}
                  </h3>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500"
                    onClick={closeModal}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <Input
                    label="Account Name"
                    id="account_name"
                    placeholder="e.g., Rent Expense, Sales Revenue"
                    error={errors.account_name?.message}
                    {...register('account_name')}
                  />
                  
                  <Select
                    label="Account Type"
                    id="account_type"
                    options={[
                      { value: 'Income', label: 'Income' },
                      { value: 'Expense', label: 'Expense' },
                      { value: 'Asset', label: 'Asset' },
                      { value: 'Liability', label: 'Liability' },
                    ]}
                    error={errors.account_type?.message}
                    {...register('account_type')}
                  />
                  
                  <div className="flex justify-end space-x-3 mt-5">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={closeModal}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      isLoading={isSubmitting}
                    >
                      {editingAccount ? 'Update' : 'Add'} Account
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartOfAccounts;