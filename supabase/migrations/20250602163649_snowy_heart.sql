/*
  # Create initial schema for AccuBooks

  1. New Tables
    - `company_profiles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `company_name` (text)
      - `company_address` (text)
      - `gstin` (text)
      - `logo_url` (text)
      - `fiscal_year_start_month` (integer)
      - `created_at` (timestamp)
    - `accounts`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references company_profiles)
      - `account_name` (text)
      - `account_type` (text)
      - `is_default` (boolean)
      - `created_at` (timestamp)
    - `products_services`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references company_profiles)
      - `item_name` (text)
      - `hsn_sac_code` (text)
      - `default_sale_price` (numeric)
      - `default_gst_rate` (numeric)
      - `created_at` (timestamp)
    - `invoices`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references company_profiles)
      - `customer_name` (text)
      - `customer_gstin` (text)
      - `invoice_number` (text)
      - `invoice_date` (date)
      - `due_date` (date)
      - `sub_total_amount` (numeric)
      - `total_gst_amount` (numeric)
      - `total_invoice_amount` (numeric)
      - `status` (text)
      - `place_of_supply_type` (text)
      - `notes` (text)
      - `created_at` (timestamp)
    - `invoice_items`
      - `id` (uuid, primary key)
      - `invoice_id` (uuid, references invoices)
      - `product_service_id` (uuid, references products_services)
      - `item_description` (text)
      - `quantity` (numeric)
      - `rate` (numeric)
      - `item_total_amount` (numeric)
      - `gst_rate_percentage` (numeric)
      - `cgst_amount` (numeric)
      - `sgst_amount` (numeric)
      - `igst_amount` (numeric)
      - `item_gst_total` (numeric)
      - `created_at` (timestamp)
    - `expenses`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references company_profiles)
      - `vendor_name` (text)
      - `vendor_gstin` (text)
      - `expense_date` (date)
      - `expense_description` (text)
      - `expense_account_id` (uuid, references accounts)
      - `amount_before_gst` (numeric)
      - `gst_rate_applied_on_purchase` (numeric)
      - `gst_paid_amount` (numeric)
      - `total_expense_amount` (numeric)
      - `place_of_supply_type_for_purchase` (text)
      - `cgst_input_credit` (numeric)
      - `sgst_input_credit` (numeric)
      - `igst_input_credit` (numeric)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
  3. Functions
    - Add stored procedure for creating default accounts
*/

-- Create company_profiles table
CREATE TABLE IF NOT EXISTS company_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  company_name text NOT NULL,
  company_address text,
  gstin text,
  logo_url text,
  fiscal_year_start_month integer DEFAULT 4 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES company_profiles(id) NOT NULL,
  account_name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('Income', 'Expense', 'Asset', 'Liability')),
  is_default boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create products_services table
CREATE TABLE IF NOT EXISTS products_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES company_profiles(id) NOT NULL,
  item_name text NOT NULL,
  hsn_sac_code text,
  default_sale_price numeric(15,2) DEFAULT 0 NOT NULL,
  default_gst_rate numeric(5,2) DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES company_profiles(id) NOT NULL,
  customer_name text NOT NULL,
  customer_gstin text,
  invoice_number text NOT NULL,
  invoice_date date DEFAULT CURRENT_DATE NOT NULL,
  due_date date,
  sub_total_amount numeric(15,2) DEFAULT 0 NOT NULL,
  total_gst_amount numeric(15,2) DEFAULT 0 NOT NULL,
  total_invoice_amount numeric(15,2) DEFAULT 0 NOT NULL,
  status text DEFAULT 'Draft' NOT NULL CHECK (status IN ('Draft', 'Sent', 'Paid', 'Overdue')),
  place_of_supply_type text NOT NULL CHECK (place_of_supply_type IN ('Intra-State', 'Inter-State')),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  product_service_id uuid REFERENCES products_services(id),
  item_description text NOT NULL,
  quantity numeric(15,2) DEFAULT 1 NOT NULL,
  rate numeric(15,2) DEFAULT 0 NOT NULL,
  item_total_amount numeric(15,2) DEFAULT 0 NOT NULL,
  gst_rate_percentage numeric(5,2) DEFAULT 0 NOT NULL,
  cgst_amount numeric(15,2) DEFAULT 0 NOT NULL,
  sgst_amount numeric(15,2) DEFAULT 0 NOT NULL,
  igst_amount numeric(15,2) DEFAULT 0 NOT NULL,
  item_gst_total numeric(15,2) DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES company_profiles(id) NOT NULL,
  vendor_name text,
  vendor_gstin text,
  expense_date date DEFAULT CURRENT_DATE NOT NULL,
  expense_description text NOT NULL,
  expense_account_id uuid REFERENCES accounts(id) NOT NULL,
  amount_before_gst numeric(15,2) DEFAULT 0 NOT NULL,
  gst_rate_applied_on_purchase numeric(5,2) DEFAULT 0 NOT NULL,
  gst_paid_amount numeric(15,2) DEFAULT 0 NOT NULL,
  total_expense_amount numeric(15,2) DEFAULT 0 NOT NULL,
  place_of_supply_type_for_purchase text DEFAULT 'Not Applicable' NOT NULL CHECK (place_of_supply_type_for_purchase IN ('Intra-State', 'Inter-State', 'Not Applicable')),
  cgst_input_credit numeric(15,2) DEFAULT 0 NOT NULL,
  sgst_input_credit numeric(15,2) DEFAULT 0 NOT NULL,
  igst_input_credit numeric(15,2) DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Company profiles policies
CREATE POLICY "Users can view their own company profiles"
  ON company_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company profiles"
  ON company_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company profiles"
  ON company_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Accounts policies
CREATE POLICY "Users can view accounts for their companies"
  ON accounts
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_profiles
    WHERE company_profiles.id = accounts.company_id
    AND company_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert accounts for their companies"
  ON accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM company_profiles
    WHERE company_profiles.id = accounts.company_id
    AND company_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can update accounts for their companies"
  ON accounts
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_profiles
    WHERE company_profiles.id = accounts.company_id
    AND company_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete non-default accounts for their companies"
  ON accounts
  FOR DELETE
  TO authenticated
  USING (
    is_default = false AND
    EXISTS (
      SELECT 1 FROM company_profiles
      WHERE company_profiles.id = accounts.company_id
      AND company_profiles.user_id = auth.uid()
    )
  );

-- Products/services policies
CREATE POLICY "Users can view products for their companies"
  ON products_services
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_profiles
    WHERE company_profiles.id = products_services.company_id
    AND company_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert products for their companies"
  ON products_services
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM company_profiles
    WHERE company_profiles.id = products_services.company_id
    AND company_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can update products for their companies"
  ON products_services
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_profiles
    WHERE company_profiles.id = products_services.company_id
    AND company_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete products for their companies"
  ON products_services
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_profiles
    WHERE company_profiles.id = products_services.company_id
    AND company_profiles.user_id = auth.uid()
  ));

-- Invoices policies
CREATE POLICY "Users can view invoices for their companies"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_profiles
    WHERE company_profiles.id = invoices.company_id
    AND company_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert invoices for their companies"
  ON invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM company_profiles
    WHERE company_profiles.id = invoices.company_id
    AND company_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can update invoices for their companies"
  ON invoices
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_profiles
    WHERE company_profiles.id = invoices.company_id
    AND company_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete invoices for their companies"
  ON invoices
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_profiles
    WHERE company_profiles.id = invoices.company_id
    AND company_profiles.user_id = auth.uid()
  ));

-- Invoice items policies
CREATE POLICY "Users can view invoice items for their companies"
  ON invoice_items
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM invoices
    JOIN company_profiles ON invoices.company_id = company_profiles.id
    WHERE invoice_items.invoice_id = invoices.id
    AND company_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert invoice items for their companies"
  ON invoice_items
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM invoices
    JOIN company_profiles ON invoices.company_id = company_profiles.id
    WHERE invoice_items.invoice_id = invoices.id
    AND company_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can update invoice items for their companies"
  ON invoice_items
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM invoices
    JOIN company_profiles ON invoices.company_id = company_profiles.id
    WHERE invoice_items.invoice_id = invoices.id
    AND company_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete invoice items for their companies"
  ON invoice_items
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM invoices
    JOIN company_profiles ON invoices.company_id = company_profiles.id
    WHERE invoice_items.invoice_id = invoices.id
    AND company_profiles.user_id = auth.uid()
  ));

-- Expenses policies
CREATE POLICY "Users can view expenses for their companies"
  ON expenses
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_profiles
    WHERE company_profiles.id = expenses.company_id
    AND company_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert expenses for their companies"
  ON expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM company_profiles
    WHERE company_profiles.id = expenses.company_id
    AND company_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can update expenses for their companies"
  ON expenses
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_profiles
    WHERE company_profiles.id = expenses.company_id
    AND company_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete expenses for their companies"
  ON expenses
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_profiles
    WHERE company_profiles.id = expenses.company_id
    AND company_profiles.user_id = auth.uid()
  ));

-- Create stored procedure for creating default accounts
CREATE OR REPLACE FUNCTION create_default_accounts(company_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO accounts (company_id, account_name, account_type, is_default)
  VALUES
    (company_id, 'Sales', 'Income', true),
    (company_id, 'Purchases/Direct Expenses', 'Expense', true),
    (company_id, 'Bank Account', 'Asset', true),
    (company_id, 'Cash in Hand', 'Asset', true),
    (company_id, 'GST Payable', 'Liability', true),
    (company_id, 'GST Input Credit', 'Asset', true);
END;
$$ LANGUAGE plpgsql;