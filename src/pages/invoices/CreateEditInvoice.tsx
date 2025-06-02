import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase, Tables } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import TextArea from '../../components/ui/TextArea';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

type Invoice = Tables['invoices'];
type InvoiceItem = Tables['invoice_items'];
type ProductService = Tables['products_services'];

const schema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_gstin: z.string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format')
    .optional()
    .or(z.string().length(0)),
  invoice_number: z.string().min(1, 'Invoice number is required'),
  invoice_date: z.string().min(1, 'Invoice date is required'),
  due_date: z.string().optional(),
  place_of_supply_type: z.enum(['Intra-State', 'Inter-State']),
  notes: z.string().optional(),
  items: z.array(z.object({
    product_service_id: z.string().optional(),
    item_description: z.string().min(1, 'Item description is required'),
    quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
    rate: z.number().min(0, 'Rate must be 0 or greater'),
    gst_rate_percentage: z.number().min(0, 'GST rate must be 0 or greater').max(28, 'GST rate cannot exceed 28%'),
  })).min(1, 'At least one item is required'),
});

type FormValues = z.infer<typeof schema>;

const CreateEditInvoice: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { companyProfile } = useCompany();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductService[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { 
    register, 
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_name: '',
      customer_gstin: '',
      invoice_number: '',
      invoice_date: format(new Date(), 'yyyy-MM-dd'),
      due_date: '',
      place_of_supply_type: 'Intra-State',
      notes: '',
      items: [{
        product_service_id: '',
        item_description: '',
        quantity: 1,
        rate: 0,
        gst_rate_percentage: 18,
      }],
    },
  });

  useEffect(() => {
    async function loadData() {
      if (!companyProfile) return;

      try {
        // Fetch products/services
        const { data: productsData, error: productsError } = await supabase
          .from('products_services')
          .select('*')
          .eq('company_id', companyProfile.id)
          .order('item_name');

        if (productsError) throw productsError;
        setProducts(productsData || []);

        if (id) {
          // Fetch invoice if editing
          const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .select('*, invoice_items(*)')
            .eq('id', id)
            .eq('company_id', companyProfile.id)
            .single();

          if (invoiceError) throw invoiceError;

          if (invoice) {
            setValue('customer_name', invoice.customer_name);
            setValue('customer_gstin', invoice.customer_gstin || '');
            setValue('invoice_number', invoice.invoice_number);
            setValue('invoice_date', format(new Date(invoice.invoice_date), 'yyyy-MM-dd'));
            setValue('due_date', invoice.due_date ? format(new Date(invoice.due_date), 'yyyy-MM-dd') : '');
            setValue('place_of_supply_type', invoice.place_of_supply_type);
            setValue('notes', invoice.notes || '');
            setValue('items', invoice.invoice_items.map(item => ({
              product_service_id: item.product_service_id || '',
              item_description: item.item_description,
              quantity: item.quantity,
              rate: item.rate,
              gst_rate_percentage: item.gst_rate_percentage,
            })));
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

  const onSubmit = async (data: FormValues) => {
    if (!companyProfile) return;
    
    setIsSubmitting(true);
    try {
      const items = data.items.map(item => {
        const quantity = Number(item.quantity);
        const rate = Number(item.rate);
        const gstRate = Number(item.gst_rate_percentage);
        const itemTotal = quantity * rate;
        const gstAmount = (itemTotal * gstRate) / 100;

        return {
          ...item,
          item_total_amount: itemTotal,
          gst_rate_percentage: gstRate,
          cgst_amount: data.place_of_supply_type === 'Intra-State' ? gstAmount / 2 : 0,
          sgst_amount: data.place_of_supply_type === 'Intra-State' ? gstAmount / 2 : 0,
          igst_amount: data.place_of_supply_type === 'Inter-State' ? gstAmount : 0,
          item_gst_total: gstAmount,
        };
      });

      const subTotal = items.reduce((sum, item) => sum + item.item_total_amount, 0);
      const totalGst = items.reduce((sum, item) => sum + item.item_gst_total, 0);
      const totalAmount = subTotal + totalGst;

      if (id) {
        // Update existing invoice
        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({
            customer_name: data.customer_name,
            customer_gstin: data.customer_gstin || null,
            invoice_number: data.invoice_number,
            invoice_date: data.invoice_date,
            due_date: data.due_date || null,
            place_of_supply_type: data.place_of_supply_type,
            notes: data.notes || null,
            sub_total_amount: subTotal,
            total_gst_amount: totalGst,
            total_invoice_amount: totalAmount,
          })
          .eq('id', id)
          .eq('company_id', companyProfile.id);

        if (invoiceError) throw invoiceError;

        // Delete existing items
        const { error: deleteError } = await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', id);

        if (deleteError) throw deleteError;

        // Insert new items
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(items.map(item => ({
            invoice_id: id,
            ...item,
          })));

        if (itemsError) throw itemsError;

        toast.success('Invoice updated successfully');
      } else {
        // Create new invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert([{
            company_id: companyProfile.id,
            customer_name: data.customer_name,
            customer_gstin: data.customer_gstin || null,
            invoice_number: data.invoice_number,
            invoice_date: data.invoice_date,
            due_date: data.due_date || null,
            place_of_supply_type: data.place_of_supply_type,
            notes: data.notes || null,
            sub_total_amount: subTotal,
            total_gst_amount: totalGst,
            total_invoice_amount: totalAmount,
            status: 'Draft',
          }])
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        // Insert items
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(items.map(item => ({
            invoice_id: invoice.id,
            ...item,
          })));

        if (itemsError) throw itemsError;

        toast.success('Invoice created successfully');
      }

      navigate('/invoices');
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItem = () => {
    const currentItems = watch('items') || [];
    setValue('items', [
      ...currentItems,
      {
        product_service_id: '',
        item_description: '',
        quantity: 1,
        rate: 0,
        gst_rate_percentage: 18,
      },
    ]);
  };

  const removeItem = (index: number) => {
    const currentItems = watch('items') || [];
    setValue('items', currentItems.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, productId: string) => {
    if (!productId) return;

    const product = products.find(p => p.id === productId);
    if (product) {
      const currentItems = watch('items');
      const updatedItems = [...currentItems];
      updatedItems[index] = {
        ...updatedItems[index],
        product_service_id: product.id,
        item_description: product.item_name,
        rate: product.default_sale_price,
        gst_rate_percentage: product.default_gst_rate,
      };
      setValue('items', updatedItems);
    }
  };

  if (!companyProfile) {
    return (
      <div className="card p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">Company Profile Required</h2>
        <p className="mb-6">Please set up your company profile before creating invoices.</p>
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

  return (
    <div>
      <div className="flex items-center mb-6">
        <Button
          variant="secondary"
          onClick={() => navigate('/invoices')}
          leftIcon={<ArrowLeft className="h-5 w-5" />}
        >
          Back to Invoices
        </Button>
      </div>

      <div className="card">
        <h1 className="text-2xl font-bold mb-6">
          {id ? 'Edit Invoice' : 'Create New Invoice'}
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Customer Name"
              id="customer_name"
              placeholder="Enter customer name"
              error={errors.customer_name?.message}
              {...register('customer_name')}
            />

            <Input
              label="Customer GSTIN"
              id="customer_gstin"
              placeholder="22AAAAA0000A1Z5"
              error={errors.customer_gstin?.message}
              helperText="15-character Indian GST Identification Number"
              {...register('customer_gstin')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input
              label="Invoice Number"
              id="invoice_number"
              placeholder="INV-001"
              error={errors.invoice_number?.message}
              {...register('invoice_number')}
            />

            <Input
              label="Invoice Date"
              id="invoice_date"
              type="date"
              error={errors.invoice_date?.message}
              {...register('invoice_date')}
            />

            <Input
              label="Due Date"
              id="due_date"
              type="date"
              error={errors.due_date?.message}
              {...register('due_date')}
            />
          </div>

          <Select
            label="Place of Supply"
            id="place_of_supply_type"
            options={[
              { value: 'Intra-State', label: 'Intra-State (Within State)' },
              { value: 'Inter-State', label: 'Inter-State (Outside State)' },
            ]}
            error={errors.place_of_supply_type?.message}
            {...register('place_of_supply_type')}
          />

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Invoice Items</h3>
              <Button
                type="button"
                onClick={addItem}
                leftIcon={<Plus className="h-5 w-5" />}
              >
                Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {watch('items')?.map((item, index) => (
                <div key={index} className="card bg-gray-50">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-error-600 hover:text-error-700"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <Select
                      label="Select Product/Service"
                      placeholder="Choose or enter manually"
                      options={[
                        { value: '', label: 'Enter Manually' },
                        ...products.map(p => ({
                          value: p.id,
                          label: p.item_name,
                        })),
                      ]}
                      value={item.product_service_id}
                      onChange={(e) => handleProductChange(index, e.target.value)}
                    />

                    <Input
                      label="Description"
                      placeholder="Item description"
                      error={errors.items?.[index]?.item_description?.message}
                      {...register(`items.${index}.item_description`)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Quantity"
                      type="number"
                      step="0.01"
                      min="0.01"
                      error={errors.items?.[index]?.quantity?.message}
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    />

                    <Input
                      label="Rate (₹)"
                      type="number"
                      step="0.01"
                      min="0"
                      error={errors.items?.[index]?.rate?.message}
                      {...register(`items.${index}.rate`, { valueAsNumber: true })}
                    />

                    <Input
                      label="GST Rate (%)"
                      type="number"
                      step="0.1"
                      min="0"
                      max="28"
                      error={errors.items?.[index]?.gst_rate_percentage?.message}
                      {...register(`items.${index}.gst_rate_percentage`, { valueAsNumber: true })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <TextArea
            label="Notes"
            id="notes"
            placeholder="Additional notes or terms..."
            error={errors.notes?.message}
            {...register('notes')}
          />

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/invoices')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
            >
              {id ? 'Update' : 'Create'} Invoice
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEditInvoice;