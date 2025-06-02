import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Plus, Edit, Trash2, X, Search } from 'lucide-react';
import { supabase, Tables } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

type ProductService = Tables['products_services'];

const schema = z.object({
  item_name: z.string().min(1, 'Item name is required'),
  hsn_sac_code: z.string().optional(),
  default_sale_price: z.number().min(0, 'Price must be a positive number'),
  default_gst_rate: z.number().min(0, 'GST rate must be 0 or higher').max(28, 'GST rate cannot exceed 28%'),
});

type FormValues = z.infer<typeof schema>;

const ProductsServices: React.FC = () => {
  const { companyProfile } = useCompany();
  const [products, setProducts] = useState<ProductService[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductService | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors } 
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      item_name: '',
      hsn_sac_code: '',
      default_sale_price: 0,
      default_gst_rate: 18, // Default to 18%
    },
  });

  useEffect(() => {
    fetchProducts();
  }, [companyProfile]);

  useEffect(() => {
    if (editingProduct) {
      reset({
        item_name: editingProduct.item_name,
        hsn_sac_code: editingProduct.hsn_sac_code || '',
        default_sale_price: editingProduct.default_sale_price,
        default_gst_rate: editingProduct.default_gst_rate,
      });
    } else {
      reset({
        item_name: '',
        hsn_sac_code: '',
        default_sale_price: 0,
        default_gst_rate: 18,
      });
    }
  }, [editingProduct, reset]);

  const fetchProducts = async () => {
    if (!companyProfile) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('company_id', companyProfile.id)
        .order('item_name');
        
      if (error) throw error;
      
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products/services:', error);
      toast.error('Failed to load products and services');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (product: ProductService | null = null) => {
    setEditingProduct(product);
    setShowModal(true);
  };

  const closeModal = () => {
    setEditingProduct(null);
    setShowModal(false);
    reset();
  };

  const onSubmit = async (data: FormValues) => {
    if (!companyProfile) return;
    
    setIsSubmitting(true);
    try {
      if (editingProduct) {
        // Update existing product
        const { error } = await supabase
          .from('products_services')
          .update({
            item_name: data.item_name,
            hsn_sac_code: data.hsn_sac_code || null,
            default_sale_price: data.default_sale_price,
            default_gst_rate: data.default_gst_rate,
          })
          .eq('id', editingProduct.id)
          .eq('company_id', companyProfile.id);
          
        if (error) throw error;
        
        toast.success('Product/service updated successfully');
      } else {
        // Create new product
        const { error } = await supabase
          .from('products_services')
          .insert([{
            company_id: companyProfile.id,
            item_name: data.item_name,
            hsn_sac_code: data.hsn_sac_code || null,
            default_sale_price: data.default_sale_price,
            default_gst_rate: data.default_gst_rate,
          }]);
          
        if (error) throw error;
        
        toast.success('Product/service created successfully');
      }
      
      closeModal();
      fetchProducts();
    } catch (error) {
      console.error('Error saving product/service:', error);
      toast.error('Failed to save product/service');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!companyProfile) return;
    
    if (!confirm('Are you sure you want to delete this product/service?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('products_services')
        .delete()
        .eq('id', id)
        .eq('company_id', companyProfile.id);
        
      if (error) {
        if (error.message.includes('violates foreign key constraint')) {
          toast.error('Cannot delete product/service because it is being used by invoices');
          return;
        }
        throw error;
      }
      
      toast.success('Product/service deleted successfully');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product/service:', error);
      toast.error('Failed to delete product/service');
    }
  };

  const filteredProducts = products.filter(product => 
    product.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.hsn_sac_code && product.hsn_sac_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!companyProfile) {
    return (
      <div className="card p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">Company Profile Required</h2>
        <p className="mb-6">Please set up your company profile before managing products and services.</p>
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
          <h1 className="text-2xl font-bold">Products & Services</h1>
          <p className="text-gray-600">
            Manage your products and services catalog
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button 
            onClick={() => openModal()}
            leftIcon={<Plus className="h-5 w-5" />}
          >
            Add Product/Service
          </Button>
        </div>
      </div>

      <div className="card mb-6">
        <div className="relative">
          <Input
            placeholder="Search by name or HSN/SAC code..."
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
                  <th className="table-header-cell">Item Name</th>
                  <th className="table-header-cell">HSN/SAC Code</th>
                  <th className="table-header-cell">Sale Price (₹)</th>
                  <th className="table-header-cell">GST Rate (%)</th>
                  <th className="table-header-cell w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      {searchTerm ? 'No products/services found matching your search.' : 'No products or services found. Click "Add Product/Service" to create one.'}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="table-row">
                      <td className="table-cell font-medium text-gray-900">
                        {product.item_name}
                      </td>
                      <td className="table-cell">
                        {product.hsn_sac_code || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="table-cell">
                        ₹{product.default_sale_price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="table-cell">
                        {product.default_gst_rate}%
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openModal(product)}
                            className="text-gray-600 hover:text-primary-600"
                            title="Edit product/service"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteProduct(product.id)}
                            className="text-gray-600 hover:text-error-600"
                            title="Delete product/service"
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

      {/* Modal for adding/editing products */}
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
                    {editingProduct ? 'Edit Product/Service' : 'Add New Product/Service'}
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
                    label="Item Name"
                    id="item_name"
                    placeholder="e.g., Web Design Service, Office Chair"
                    error={errors.item_name?.message}
                    {...register('item_name')}
                  />
                  
                  <Input
                    label="HSN/SAC Code"
                    id="hsn_sac_code"
                    placeholder="e.g., 998313, 9401"
                    helperText="Harmonized System of Nomenclature code or Service Accounting Code"
                    error={errors.hsn_sac_code?.message}
                    {...register('hsn_sac_code')}
                  />
                  
                  <Input
                    label="Default Sale Price (₹)"
                    id="default_sale_price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    error={errors.default_sale_price?.message}
                    {...register('default_sale_price', { valueAsNumber: true })}
                  />
                  
                  <Input
                    label="Default GST Rate (%)"
                    id="default_gst_rate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="28"
                    placeholder="18"
                    helperText="Common rates: 0, 5, 12, 18, 28"
                    error={errors.default_gst_rate?.message}
                    {...register('default_gst_rate', { valueAsNumber: true })}
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
                      {editingProduct ? 'Update' : 'Add'} Product/Service
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

export default ProductsServices;