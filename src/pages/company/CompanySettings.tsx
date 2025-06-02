import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Building2, FileCode, Image, Calendar } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import Input from '../../components/ui/Input';
import TextArea from '../../components/ui/TextArea';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const months = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const schema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  company_address: z.string().optional(),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format')
    .optional()
    .or(z.string().length(0)),
  logo_url: z.string().url('Must be a valid URL').optional().or(z.string().length(0)),
  fiscal_year_start_month: z.number().min(1).max(12),
});

type FormValues = z.infer<typeof schema>;

const CompanySettings: React.FC = () => {
  const { companyProfile, loading, updateCompanyProfile, createCompanyProfile } = useCompany();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors, isDirty } 
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      company_name: '',
      company_address: '',
      gstin: '',
      logo_url: '',
      fiscal_year_start_month: 4, // Default to April
    },
  });

  useEffect(() => {
    if (companyProfile) {
      reset({
        company_name: companyProfile.company_name,
        company_address: companyProfile.company_address || '',
        gstin: companyProfile.gstin || '',
        logo_url: companyProfile.logo_url || '',
        fiscal_year_start_month: companyProfile.fiscal_year_start_month,
      });
    }
  }, [companyProfile, reset]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    
    try {
      if (companyProfile) {
        // Update existing profile
        const { error } = await updateCompanyProfile(data);
        
        if (error) {
          toast.error('Failed to update company profile');
          return;
        }
        
        toast.success('Company profile updated successfully');
      } else {
        // Create new profile
        const { error } = await createCompanyProfile(data);
        
        if (error) {
          toast.error('Failed to create company profile');
          return;
        }
        
        toast.success('Company profile created successfully');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
      console.error('Company profile error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Company Settings</h1>
        <p className="text-gray-600">
          Manage your company profile and settings
        </p>
      </div>
      
      <div className="card">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Company Name"
              id="company_name"
              placeholder="Your Company Name"
              leftIcon={<Building2 className="h-5 w-5 text-gray-400" />}
              error={errors.company_name?.message}
              {...register('company_name')}
            />
            
            <Input
              label="GSTIN"
              id="gstin"
              placeholder="22AAAAA0000A1Z5"
              leftIcon={<FileCode className="h-5 w-5 text-gray-400" />}
              error={errors.gstin?.message}
              helperText="15-character Indian GST Identification Number"
              {...register('gstin')}
            />
          </div>
          
          <TextArea
            label="Company Address"
            id="company_address"
            placeholder="Full address including city, state, and PIN code"
            error={errors.company_address?.message}
            {...register('company_address')}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Company Logo URL"
              id="logo_url"
              placeholder="https://example.com/logo.png"
              leftIcon={<Image className="h-5 w-5 text-gray-400" />}
              error={errors.logo_url?.message}
              helperText="Direct link to your company logo image"
              {...register('logo_url')}
            />
            
            <Select
              label="Fiscal Year Start Month"
              id="fiscal_year_start_month"
              options={months}
              leftIcon={<Calendar className="h-5 w-5 text-gray-400" />}
              error={errors.fiscal_year_start_month?.message}
              helperText="Month when your financial year begins"
              {...register('fiscal_year_start_month', { valueAsNumber: true })}
            />
          </div>
          
          {companyProfile?.logo_url && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Current Logo</p>
              <div className="w-32 h-32 flex items-center justify-center border border-gray-300 rounded-lg bg-white p-2">
                <img
                  src={companyProfile.logo_url}
                  alt="Company Logo"
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/120x120?text=Logo+Error';
                  }}
                />
              </div>
            </div>
          )}
          
          <div className="flex justify-end">
            <Button 
              type="submit" 
              isLoading={isSubmitting}
              disabled={!isDirty}
            >
              {companyProfile ? 'Update Profile' : 'Create Profile'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanySettings;