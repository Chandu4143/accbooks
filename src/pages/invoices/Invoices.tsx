import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Plus, Search, FileText, ArrowUpRight, Send, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase, Tables } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

type Invoice = Tables['invoices'] & {
  invoice_items: Tables['invoice_items'][];
};

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
        .select(`
          *,
          invoice_items (*)
        `)
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

  const updateInvoiceStatus = async (invoiceId: string, status: 'Sent' | 'Paid') => {
    if (!companyProfile) return;
    
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status })
        .eq('id', invoiceId)
        .eq('company_id', companyProfile.id);
        
      if (error) throw error;
      
      toast.success(`Invoice marked as ${status}`);
      fetchInvoices();
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('Failed to update invoice status');
    }
  };

  const downloadPDF = async (invoice: Invoice) => {
    try {
      const doc = new jsPDF();
      
      // Add company details
      doc.setFontSize(20);
      doc.text(companyProfile.company_name, 20, 20);
      
      if (companyProfile.company_address) {
        doc.setFontSize(10);
        doc.text(companyProfile.company_address, 20, 30);
      }
      
      if (companyProfile.gstin) {
        doc.setFontSize(10);
        doc.text(`GSTIN: ${companyProfile.gstin}`, 20, 40);
      }

      // Add invoice details
      doc.setFontSize(16);
      doc.text('TAX INVOICE', 150, 20);
      
      doc.setFontSize(10);
      doc.text(`Invoice Number: ${invoice.invoice_number}`, 150, 30);
      doc.text(`Date: ${format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}`, 150, 35);
      
      if (invoice.due_date) {
        doc.text(`Due Date: ${format(new Date(invoice.due_date), 'dd/MM/yyyy')}`, 150, 40);
      }

      // Add customer details
      doc.setFontSize(12);
      doc.text('Bill To:', 20, 60);
      doc.setFontSize(10);
      doc.text(invoice.customer_name, 20, 65);
      if (invoice.customer_gstin) {
        doc.text(`GSTIN: ${invoice.customer_gstin}`, 20, 70);
      }

      // Add items table
      const tableBody = invoice.invoice_items.map(item => [
        item.item_description,
        item.quantity.toString(),
        `₹${item.rate.toFixed(2)}`,
        `${item.gst_rate_percentage}%`,
        `₹${item.item_total_amount.toFixed(2)}`,
        `₹${item.item_gst_total.toFixed(2)}`,
        `₹${(item.item_total_amount + item.item_gst_total).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: 80,
        head: [['Description', 'Qty', 'Rate', 'GST', 'Amount', 'GST Amt', 'Total']],
        body: tableBody,
      });

      // Add totals
      const finalY = (doc as any).lastAutoTable.finalY || 150;
      
      doc.text(`Sub Total: ₹${invoice.sub_total_amount.toFixed(2)}`, 140, finalY + 10);
      doc.text(`GST Total: ₹${invoice.total_gst_amount.toFixed(2)}`, 140, finalY + 15);
      doc.text(`Grand Total: ₹${invoice.total_invoice_amount.toFixed(2)}`, 140, finalY + 20);

      // Add notes if any
      if (invoice.notes) {
        doc.text('Notes:', 20, finalY + 30);
        doc.setFontSize(10);
        doc.text(invoice.notes, 20, finalY + 35);
      }

      // Save the PDF
      doc.save(`Invoice-${invoice.invoice_number}.pdf`);
      
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
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
                  <th className="table-header-cell w-40">Actions</th>
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
                          
                          {invoice.status === 'Draft' && (
                            <button
                              onClick={() => updateInvoiceStatus(invoice.id, 'Sent')}
                              className="text-gray-600 hover:text-primary-600"
                              title="Mark as Sent"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          )}
                          
                          {invoice.status === 'Sent' && (
                            <button
                              onClick={() => updateInvoiceStatus(invoice.id, 'Paid')}
                              className="text-gray-600 hover:text-success-600"
                              title="Mark as Paid"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => downloadPDF(invoice)}
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