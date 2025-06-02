import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { supabase, Tables } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import TextArea from '../../components/ui/TextArea';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

type Expense = Tables['expenses'];
type Account = Tables['accounts'];

const schema = z.object({
  vendor_name: z.string().optional(),
  vendor_gstin: z.string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format')
    .optional()
    .or(z.string().length(0)),
  expense_date: z.string().min(1, 'Expense date is required'),
  expense_description: z.string().min(1, 'Description is required'),
  expense_account_id: z.string().min(1, 'Please select an expense account'),
  amount_before_gst: z.number().min(0, 'Amount must be 0 or greater'),
  gst_rate_applied_on_purchase: z.number().min(0, 'GST rate must be 0 or greater').max(28, 'GST rate cannot exceed 28%'),
  place_of_supply_type_for_purchase: z.enum(['Intra-State', 'Inter-State', 'Not Applicable']),
});

type FormValues = z.infer<typeof schema>;

const CreateEditExpense: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { companyProfile } = useCompany();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { 
    register, 
    handleSubmit,
    watch,
    setValue,
    formState: { errors } 
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vendor_name: '',
      vendor_gstin: '',
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      expense_description: '',
      expense_account_id: '',
      amount_before_gst: 0,
      gst_rate_applied_on_purchase: 18,
      place_of_supply_type_for_purchase: 'Not Applicable',
    },
  });

  useEffect(() => {
    async function loadData() {
      if (!companyProfile) return;

      try {
        // Fetch expense accounts
        const { data: accountsData, error: accountsError } = await supabase
          .from('accounts')
          .select('*')
          .eq('company_id', companyProfile.id)
          .eq('account_type', 'Expense')
          .order('account_name');

        if (accountsError) throw accountsError;
        setAccounts(accountsData || []);

        if (id) {
          // Fetch expense if editing
          const { data: expense, error: expenseError } = await supabase
            .from('expenses')
            .select('*')
            .eq('id', id)
            .eq('company_id', companyProfile.id)
            .single();

          if (expenseError) throw expenseError;

          if (expense) {
            setValue('vendor_name', expense.vendor_name || '');
            setValue('vendor_gstin', expense.vendor_gstin || '');
            setValue('expense_date', format(new Date(expense.expense_date), 'yyyy-MM-dd'));
            setValue('expense_description', expense.expense_description);
            setValue('expense_account_id', expense.expense_account_id);
            setValue('amount_before_gst', expense.amount_before_gst);
            setValue('gst_rate_applied_on_purchase', expense.gst_rate_applied_on_purchase);
            setValue('place_of_supply_type_for_purchase', expense.place_of_supply_type_for_purchase);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [companyProfile, id, setValue]);

  const calculateGSTAmounts = (amountBeforeGST: number, gstRate: number, supplyType: string) => {
    const gstAmount = (amountBeforeGST * gstRate) / 100;
    
    if (supplyType === 'Not Applicable') {
      return {
        gstPaidAmount: 0,
        cgstInputCredit: 0,
        sgstInputCredit: 0,
        igstInputCredit: 0,
        totalAmount: amountBeforeGST,
      };
    }

    if (supplyType === 'Intra-State') {
      return {
        gstPaidAmount: gstAmount,
        cgstInputCredit: gstAmount / 2,
        sgstInputCredit: gstAmount / 2,
        igstInputCredit: 0,
        totalAmount: amountBeforeGST + gstAmount,
      };
    }

    return {
      gstPaidAmount: gstAmount,
      cgstInputCredit: 0,
      sgstInputCredit: 0,
      igstInputCredit: gstAmount,
      totalAmount: amountBeforeGST + gstAmount,
    };
  };

  const onSubmit = async (data: FormValues) => {
    if (!companyProfile) return;
    
    setIsSubmitting(true);
    try {
      const {
        gstPaidAmount,
        cgstInputCredit,
        sgstInputCredit,
        igstInputCredit,
        totalAmount,
      } = calculateGSTAmounts(
        data.amount_before_gst,
        data.gst_rate_applied_on_purchase,
        data.place_of_supply_type_for_purchase
      );

      const expenseData = {
        company_id: companyProfile.id,
        vendor_name: data.vendor_name || null,
        vendor_gstin: data.vendor_gstin || null,
        expense_date: data.expense_date,
        expense_description: data.expense_description,
        expense_account_id: data.expense_account_id,
        amount_before_gst: data.amount_before_gst,
        gst_rate_applied_on_purchase: data.gst_rate_applied_on_purchase,
        gst_paid_amount: gstPaidAmount,
        total_expense_amount: totalAmount,
        place_of_supply_type_for_purchase: data.place_of_supply_type_for_purchase,
        cgst_input_credit: cgstInputCredit,
        sgst_input_credit: sgstInputCredit,
        igst_input_credit: igstInputCredit,
      };

      if (id) {
        // Update existing expense
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', id)
          .eq('company_id', companyProfile.id);

        if (error) throw error;
        
        toast.success('Expense updated successfully');
      } else {
        // Create new expense
        const { error } = await supabase
          .from('expenses')
          .insert([expenseData]);

        if (error) throw error;
        
        toast.success('Expense recorded successfully');
      }

      navigate('/expenses');
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!companyProfile) {
    return (
      <div className="card p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">Company Profile Required</h2>
        <p className="mb-6">Please set up your company profile before recording expenses.</p>
        <Button onClick={() => navigate('/company-settings')}>
          Set Up Company Profile
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const amountBeforeGST = watch('amount_before_gst') || 0;
  const gstRate = watch('gst_rate_applied_on_purchase') || 0;
  const supplyType = watch('place_of_supply_type_for_purchase');
  
  const {
    gstPaidAmount,
    totalAmount,
    cgstInputCredit,
    sgstInputCredit,
    igstInputCredit,
  } = calculateGSTAmounts(amountBeforeGST, gstRate, supplyType);

  return (
    <div>
      <div className="flex items-center mb-6">
        <Button
          variant="secondary"
          onClick={() => navigate('/expenses')}
          leftIcon={<ArrowLeft className="h-5 w-5" />}
        >
          Back to Expenses
        </Button>
      </div>

      <div className="card">
        <h1 className="text-2xl font-bold mb-6">
          {id ? 'Edit Expense' : 'Record New Expense'}
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Vendor Name"
              id="vendor_name"
              placeholder="Enter vendor name (optional)"
              error={errors.vendor_name?.message}
              {...register('vendor_name')}
            />

            <Input
              label="Vendor GSTIN"
              id="vendor_gstin"
              placeholder="22AAAAA0000A1Z5"
              error={errors.vendor_gstin?.message}
              helperText="15-character Indian GST Identification Number"
              {...register('vendor_gstin')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Expense Date"
              id="expense_date"
              type="date"
              error={errors.expense_date?.message}
              {...register('expense_date')}
            />

            <Select
              label="Expense Account"
              id="expense_account_id"
              options={accounts.map(account => ({
                value: account.id,
                label: account.account_name,
              }))}
              error={errors.expense_account_id?.message}
              {...register('expense_account_id')}
            />
          </div>

          <TextArea
            label="Description"
            id="expense_description"
            placeholder="Enter expense description"
            error={errors.expense_description?.message}
            {...register('expense_description')}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input
              label="Amount Before GST (₹)"
              id="amount_before_gst"
              type="number"
              step="0.01"
              min="0"
              error={errors.amount_before_gst?.message}
              {...register('amount_before_gst', { valueAsNumber: true })}
            />

            <Input
              label="GST Rate (%)"
              id="gst_rate_applied_on_purchase"
              type="number"
              step="0.1"
              min="0"
              max="28"
              error={errors.gst_rate_applied_on_purchase?.message}
              helperText="Common rates: 0, 5, 12, 18, 28"
              {...register('gst_rate_applied_on_purchase', { valueAsNumber: true })}
            />

            <Select
              label="Place of Supply"
              id="place_of_supply_type_for_purchase"
              options={[
                { value: 'Not Applicable', label: 'Not Applicable (No GST)' },
                { value: 'Intra-State', label: 'Intra-State (Within State)' },
                { value: 'Inter-State', label: 'Inter-State (Outside State)' },
              ]}
              error={errors.place_of_supply_type_for_purchase?.message}
              {...register('place_of_supply_type_for_purchase')}
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">GST Paid Amount</p>
                <p className="text-lg font-semibold">₹{gstPaidAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Amount</p>
                <p className="text-lg font-semibold">₹{totalAmount.toFixed(2)}</p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-2">
              <p className="text-sm font-medium text-gray-500 mb-2">GST Input Credit</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">CGST</p>
                  <p className="font-medium">₹{cgstInputCredit.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">SGST</p>
                  <p className="font-medium">₹{sgstInputCredit.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">IGST</p>
                  <p className="font-medium">₹{igstInputCredit.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/expenses')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
            >
              {id ? 'Update' : 'Record'} Expense
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEditExpense;