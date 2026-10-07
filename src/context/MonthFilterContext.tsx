import React, { createContext, useContext, useState } from 'react';

interface MonthFilterContextType {
  selectedMonth: string;
  monthFilter: string;
  setMonthFilter: (m: string) => void;
  setSelectedMonth: (m: string) => void;
  isDateInSelectedMonth: (dateStr: string) => boolean;
  getMonthLabel: (month: string, lang: 'en' | 'gu') => string;
  availableMonths: string[];
  selectedMonths: string[];
  toggleMonth: (m: string) => void;
}

const MonthFilterContext = createContext<MonthFilterContextType>({
  selectedMonth: 'ALL',
  monthFilter: 'ALL',
  setMonthFilter: () => {},
  setSelectedMonth: () => {},
  isDateInSelectedMonth: () => true,
  getMonthLabel: (m) => m,
  availableMonths: [],
  selectedMonths: [],
  toggleMonth: () => {},
});

export const MonthFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([
    '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
    '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'
  ]);

  const setSelectedMonth = (m: string) => setMonthFilter(m);

  const toggleMonth = (m: string) => {
    setSelectedMonths((prev) =>
      prev.includes(m) ? prev.filter((item) => item !== m) : [...prev, m]
    );
  };

  const isDateInSelectedMonth = (dateStr: string) => {
    if (monthFilter === 'ALL' || monthFilter === 'All') return true;
    if (!dateStr) return true;
    if (selectedMonths.length > 0) {
      return selectedMonths.some((m) => dateStr.includes(m));
    }
    return dateStr.includes(monthFilter);
  };

  const getMonthLabel = (m: string, lang: 'en' | 'gu') => {
    if (m === 'ALL' || m === 'All') return lang === 'gu' ? 'બધા મહિના' : 'All Months';
    return m;
  };

  return (
    <MonthFilterContext.Provider
      value={{
        selectedMonth: monthFilter,
        monthFilter,
        setMonthFilter,
        setSelectedMonth,
        isDateInSelectedMonth,
        getMonthLabel,
        availableMonths,
        selectedMonths,
        toggleMonth,
      }}
    >
      {children}
    </MonthFilterContext.Provider>
  );
};

export const useMonthFilter = () => useContext(MonthFilterContext);
