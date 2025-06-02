import { createClient } from '@supabase/supabase-js';

// Environment variables will be injected by Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Please connect to Supabase and add credentials to .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Tables = {
  company_profiles: {
    id: string;
    user_id: string;
    company_name: string;
    company_address: string | null;
    gstin: string | null;
    logo_url: string | null;
    fiscal_year_start_month: number;
    created_at: string;
  };
  accounts: {
    id: string;
    company_id: string;
    account_name: string;
    account_type: 'Income' | 'Expense' | 'Asset' | 'Liability';
    is_default: boolean;
    created_at: string;
  };
  products_services: {
    id: string;
    company_id: string;
    item_name: string;
    hsn_sac_code: string | null;
    default_sale_price: number;
    default_gst_rate: number;
    created_at: string;
  };
  invoices: {
    id: string;
    company_id: string;
    customer_name: string;
    customer_gstin: string | null;
    invoice_number: string;
    invoice_date: string;
    due_date: string | null;
    sub_total_amount: number;
    total_gst_amount: number;
    total_invoice_amount: number;
    status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
    place_of_supply_type: 'Intra-State' | 'Inter-State';
    notes: string | null;
    created_at: string;
  };
  invoice_items: {
    id: string;
    invoice_id: string;
    product_service_id: string | null;
    item_description: string;
    quantity: number;
    rate: number;
    item_total_amount: number;
    gst_rate_percentage: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    item_gst_total: number;
    created_at: string;
  };
  expenses: {
    id: string;
    company_id: string;
    vendor_name: string | null;
    vendor_gstin: string | null;
    expense_date: string;
    expense_description: string;
    expense_account_id: string;
    amount_before_gst: number;
    gst_rate_applied_on_purchase: number;
    gst_paid_amount: number;
    total_expense_amount: number;
    place_of_supply_type_for_purchase: 'Intra-State' | 'Inter-State' | 'Not Applicable';
    cgst_input_credit: number;
    sgst_input_credit: number;
    igst_input_credit: number;
    created_at: string;
  };
};

// Helper function to check if user has a company profile
export async function getUserCompanyProfile(userId: string) {
  const { data, error } = await supabase
    .from('company_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
    
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching company profile:', error);
    return null;
  }
  
  return data;
}

// Create default accounts for a new company
export async function createDefaultAccounts(companyId: string) {
  const defaultAccounts = [
    { account_name: 'Sales', account_type: 'Income', is_default: true },
    { account_name: 'Purchases/Direct Expenses', account_type: 'Expense', is_default: true },
    { account_name: 'Bank Account', account_type: 'Asset', is_default: true },
    { account_name: 'Cash in Hand', account_type: 'Asset', is_default: true },
    { account_name: 'GST Payable', account_type: 'Liability', is_default: true },
    { account_name: 'GST Input Credit', account_type: 'Asset', is_default: true },
  ];
  
  const { error } = await supabase
    .from('accounts')
    .insert(defaultAccounts.map(account => ({
      ...account,
      company_id: companyId
    })));
    
  if (error) {
    console.error('Error creating default accounts:', error);
    return false;
  }
  
  return true;
}