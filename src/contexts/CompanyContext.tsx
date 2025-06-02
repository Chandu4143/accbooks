import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, getUserCompanyProfile, Tables } from '../lib/supabase';
import { useAuth } from './AuthContext';

type CompanyProfile = Tables['company_profiles'];

interface CompanyContextType {
  companyProfile: CompanyProfile | null;
  loading: boolean;
  updateCompanyProfile: (data: Partial<CompanyProfile>) => Promise<{ error: Error | null }>;
  createCompanyProfile: (data: Partial<CompanyProfile>) => Promise<{ error: Error | null, data: CompanyProfile | null }>;
  refreshCompanyProfile: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCompanyProfile() {
      if (user) {
        setLoading(true);
        try {
          const profile = await getUserCompanyProfile(user.id);
          setCompanyProfile(profile);
        } catch (error) {
          console.error('Error loading company profile:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setCompanyProfile(null);
        setLoading(false);
      }
    }

    loadCompanyProfile();
  }, [user]);

  const refreshCompanyProfile = async () => {
    if (user) {
      try {
        const profile = await getUserCompanyProfile(user.id);
        setCompanyProfile(profile);
      } catch (error) {
        console.error('Error refreshing company profile:', error);
      }
    }
  };

  const updateCompanyProfile = async (data: Partial<CompanyProfile>) => {
    if (!companyProfile) {
      return { error: new Error('No company profile found') };
    }

    try {
      const { error } = await supabase
        .from('company_profiles')
        .update(data)
        .eq('id', companyProfile.id);

      if (!error) {
        await refreshCompanyProfile();
      }

      return { error };
    } catch (error) {
      console.error('Error updating company profile:', error);
      return { error: error instanceof Error ? error : new Error('Unknown error occurred') };
    }
  };

  const createCompanyProfile = async (data: Partial<CompanyProfile>) => {
    if (!user) {
      return { error: new Error('User not authenticated'), data: null };
    }

    try {
      const newProfile = {
        ...data,
        user_id: user.id,
        fiscal_year_start_month: data.fiscal_year_start_month || 4, // Default to April
      };

      const { data: createdProfile, error } = await supabase
        .from('company_profiles')
        .insert([newProfile])
        .select()
        .single();

      if (!error && createdProfile) {
        // Create default accounts for the new company
        await supabase.rpc('create_default_accounts', {
          company_id: createdProfile.id
        });
        
        setCompanyProfile(createdProfile);
        return { error: null, data: createdProfile };
      }

      return { error, data: null };
    } catch (error) {
      console.error('Error creating company profile:', error);
      return { 
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
        data: null 
      };
    }
  };

  const value = {
    companyProfile,
    loading,
    updateCompanyProfile,
    createCompanyProfile,
    refreshCompanyProfile,
  };

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const context = useContext(CompanyContext);
  
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  
  return context;
}