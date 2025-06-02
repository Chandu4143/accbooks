import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Plus, Search, FileText, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import { supabase, Tables } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

type Invoice = Tables['invoices'];

const Invoices: React.FC = () => {
  const { companyProfile } = useCompany();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, [companyProfile]);

  const fetchInvoices = async () => {
    if (!companyProfile) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('company_id', companyProfile.id)
        .order('invoice_date', { ascending: false });
        
      if (error) throw error;
      
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'badge-success';
      case 'Sent':
        return 'badge-primary';
      case 'Overdue':
        return 'badge-error';
      default:
        return 'badge-gray';
    }
  };

  const filteredInvoices = invoices.filter(invoice => 
    invoice.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!companyProfile) {
    return (
      <div className="card p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">Company Profile Required</h2>
        <p className="mb-6">Please set up your company profile before managing invoices.</p>
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
          <h1 className="text-2xl font-bold">Sales Invoices</h1>
          <p className="text-gray-600">
            Manage your sales invoices
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button 
            onClick={() => navigate('/invoices/new')}
            leftIcon={<Plus className="h-5 w-5" />}
          >
            Create Invoice
          </Button>
        </div>
      </div>

      <div className="card mb-6">
        <div className="relative">
          <Input
            placeholder="Search by customer name or invoice number..."
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
                  <th className="table-header-cell">Invoice Number</th>
                  <th className="table-header-cell">Date</th>
                  <th className="table-header-cell">Customer</th>
                  <th className="table-header-cell">Amount (₹)</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      {searchTerm ? 'No invoices found matching your search.' : 'No invoices found. Click "Create Invoice" to create one.'}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="table-row">
                      <td className="table-cell font-medium text-gray-900">
                        {invoice.invoice_number}
                      </td>
                      <td className="table-cell">
                        {format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}
                      </td>
                      <td className="table-cell">
                        <div>
                          <div className="font-medium text-gray-900">
                            {invoice.customer_name}
                          </div>
                          {invoice.customer_gstin && (
                            <div className="text-xs text-gray-500">
                              GSTIN: {invoice.customer_gstin}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">
                        ₹{invoice.total_invoice_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/invoices/${invoice.id}`}
                            className="text-gray-600 hover:text-primary-600"
                            title="View/Edit invoice"
                          >
                            <FileText className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => {/* TODO: Download PDF */}}
                            className="text-gray-600 hover:text-primary-600"
                            title="Download PDF"
                          >
                            <ArrowUpRight className="h-4 w-4" />
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
    </div>
  );
};

export default Invoices;