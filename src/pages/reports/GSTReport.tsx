import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

interface GSTSummary {
  sales: {
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
  };
  purchases: {
    taxableValue: number;
    cgstInput: number;
    sgstInput: number;
    igstInput: number;
  };
}

const GSTReport: React.FC = () => {
  const { companyProfile } = useCompany();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfMonth(new Date()));
  const [summary, setSummary] = useState<GSTSummary>({
    sales: { taxableValue: 0, cgst: 0, sgst: 0, igst: 0 },
    purchases: { taxableValue: 0, cgstInput: 0, sgstInput: 0, igstInput: 0 },
  });

  useEffect(() => {
    fetchGSTData();
  }, [companyProfile, startDate, endDate]);

  const fetchGSTData = async () => {
    if (!companyProfile) return;

    setLoading(true);
    try {
      // Fetch sales GST data (excluding drafts)
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          sub_total_amount,
          invoice_items (
            cgst_amount,
            sgst_amount,
            igst_amount
          )
        `)
        .eq('company_id', companyProfile.id)
        .neq('status', 'Draft')
        .gte('invoice_date', format(startDate, 'yyyy-MM-dd'))
        .lte('invoice_date', format(endDate, 'yyyy-MM-dd'));

      if (invoicesError) throw invoicesError;

      const salesSummary = (invoices || []).reduce((acc, invoice) => {
        acc.taxableValue += invoice.sub_total_amount || 0;
        invoice.invoice_items?.forEach(item => {
          acc.cgst += item.cgst_amount || 0;
          acc.sgst += item.sgst_amount || 0;
          acc.igst += item.igst_amount || 0;
        });
        return acc;
      }, { taxableValue: 0, cgst: 0, sgst: 0, igst: 0 });

      // Fetch purchases GST data
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          amount_before_gst,
          cgst_input_credit,
          sgst_input_credit,
          igst_input_credit
        `)
        .eq('company_id', companyProfile.id)
        .gte('expense_date', format(startDate, 'yyyy-MM-dd'))
        .lte('expense_date', format(endDate, 'yyyy-MM-dd'));

      if (expensesError) throw expensesError;

      const purchasesSummary = (expenses || []).reduce((acc, expense) => {
        acc.taxableValue += expense.amount_before_gst || 0;
        acc.cgstInput += expense.cgst_input_credit || 0;
        acc.sgstInput += expense.sgst_input_credit || 0;
        acc.igstInput += expense.igst_input_credit || 0;
        return acc;
      }, { taxableValue: 0, cgstInput: 0, sgstInput: 0, igstInput: 0 });

      setSummary({
        sales: salesSummary,
        purchases: purchasesSummary,
      });
    } catch (error) {
      console.error('Error fetching GST data:', error);
      toast.error('Failed to load GST data');
    } finally {
      setLoading(false);
    }
  };

  const previousMonth = () => {
    setStartDate(startOfMonth(subMonths(startDate, 1)));
    setEndDate(endOfMonth(subMonths(endDate, 1)));
  };

  const nextMonth = () => {
    setStartDate(startOfMonth(addMonths(startDate, 1)));
    setEndDate(endOfMonth(addMonths(endDate, 1)));
  };

  const netGSTPayable = {
    cgst: summary.sales.cgst - summary.purchases.cgstInput,
    sgst: summary.sales.sgst - summary.purchases.sgstInput,
    igst: summary.sales.igst - summary.purchases.igstInput,
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
      <h1 className="text-2xl font-bold mb-6">GST Summary Report</h1>

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
            {/* GST on Sales Section */}
            <div>
              <h3 className="text-lg font-semibold text-primary-600 mb-3">
                GST on Sales (Output Tax)
              </h3>
              <div className="bg-primary-50 p-4 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Taxable Value</p>
                    <p className="font-semibold">
                      ₹{summary.sales.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total GST</p>
                    <p className="font-semibold">
                      ₹{(summary.sales.cgst + summary.sales.sgst + summary.sales.igst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <div className="border-t border-primary-100 pt-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">CGST</p>
                      <p className="font-medium">
                        ₹{summary.sales.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">SGST</p>
                      <p className="font-medium">
                        ₹{summary.sales.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">IGST</p>
                      <p className="font-medium">
                        ₹{summary.sales.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* GST on Purchases Section */}
            <div>
              <h3 className="text-lg font-semibold text-success-600 mb-3">
                GST on Purchases (Input Tax Credit)
              </h3>
              <div className="bg-success-50 p-4 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Taxable Value</p>
                    <p className="font-semibold">
                      ₹{summary.purchases.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Input Credit</p>
                    <p className="font-semibold">
                      ₹{(summary.purchases.cgstInput + summary.purchases.sgstInput + summary.purchases.igstInput).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <div className="border-t border-success-100 pt-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">CGST Input</p>
                      <p className="font-medium">
                        ₹{summary.purchases.cgstInput.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">SGST Input</p>
                      <p className="font-medium">
                        ₹{summary.purchases.sgstInput.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">IGST Input</p>
                      <p className="font-medium">
                        ₹{summary.purchases.igstInput.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Net GST Payable Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Net GST Payable
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Net CGST</p>
                    <p className={`font-semibold ${netGSTPayable.cgst >= 0 ? 'text-error-600' : 'text-success-600'}`}>
                      ₹{Math.abs(netGSTPayable.cgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      {netGSTPayable.cgst >= 0 ? ' (Payable)' : ' (Credit)'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Net SGST</p>
                    <p className={`font-semibold ${netGSTPayable.sgst >= 0 ? 'text-error-600' : 'text-success-600'}`}>
                      ₹{Math.abs(netGSTPayable.sgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      {netGSTPayable.sgst >= 0 ? ' (Payable)' : ' (Credit)'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Net IGST</p>
                    <p className={`font-semibold ${netGSTPayable.igst >= 0 ? 'text-error-600' : 'text-success-600'}`}>
                      ₹{Math.abs(netGSTPayable.igst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      {netGSTPayable.igst >= 0 ? ' (Payable)' : ' (Credit)'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GSTReport;