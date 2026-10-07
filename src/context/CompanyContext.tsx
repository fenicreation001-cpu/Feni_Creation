import React, { createContext, useContext, useState } from 'react';
import { CompanySettings } from '../types';

interface CompanyContextType {
  companySettings: CompanySettings;
  company: CompanySettings;
  settings: CompanySettings;
  updateCompanySettings: (settings: Partial<CompanySettings>) => void;
  updateSettings: (settings: Partial<CompanySettings>) => void;
}

const defaultCompany: CompanySettings = {
  companyName: 'FENI CREATION',
  logoUrl: '/src/assets/images/peacock_textile_bg_1787302488685.jpg',
  address: 'Plot 102, GIDC Industrial Estate, Surat, Gujarat',
  phone: '+91 98765 43210',
  email: 'fenicreation001@gmail.com',
  gstin: '24BAMPV2618G2ZI',
  bankName: 'State Bank of India',
  accountNo: '123456789012',
  ifscCode: 'SBIN0001234',
  tagline: 'Embroidery Creation',
  termsAndConditions: '1. Payment due within 30 days.\n2. Goods once sold will not be taken back.',
  gujaratiSupport: true,
};

const CompanyContext = createContext<CompanyContextType>({
  companySettings: defaultCompany,
  company: defaultCompany,
  settings: defaultCompany,
  updateCompanySettings: () => {},
  updateSettings: () => {},
});

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companySettings, setCompanySettings] = useState<CompanySettings>(defaultCompany);

  const updateCompanySettings = (newSettings: Partial<CompanySettings>) => {
    setCompanySettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <CompanyContext.Provider
      value={{
        companySettings,
        company: companySettings,
        settings: companySettings,
        updateCompanySettings,
        updateSettings: updateCompanySettings,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => useContext(CompanyContext);
