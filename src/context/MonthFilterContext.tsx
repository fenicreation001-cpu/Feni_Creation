import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

export const extractYearMonth = (dateVal?: any): string | null => {
  if (!dateVal) return null;
  let str = String(dateVal).trim();
  if (!str) return null;

  // Normalize typos like 0026-..., 0006-..., 026-... to 2026-...
  if (/^0026|^0006|^026/i.test(str)) {
    str = '2026' + str.replace(/^0026|^0006|^026/, '');
  }

  // YYYY-MM-DD or YYYY/MM/DD or YYYY-MM
  const yyyyMmMatch = str.match(/^(\d{4})[-/](\d{1,2})/);
  if (yyyyMmMatch) {
    const y = yyyyMmMatch[1];
    const m = yyyyMmMatch[2].padStart(2, '0');
    return `${y}-${m}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const ddMmYyyyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (ddMmYyyyMatch) {
    const m = ddMmYyyyMatch[2].padStart(2, '0');
    let y = ddMmYyyyMatch[3];
    if (/^0026|^0006|^026/i.test(y)) {
      y = '2026';
    }
    return `${y}-${m}`;
  }

  // Parse as Date object
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    if (y >= 1900 && y <= 2100) {
      const m = String(d.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    }
  }

  return null;
};

export const getCurrentYearMonth = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

// ONLY sessionStorage keys (never localStorage)
const SESSION_STORAGE_KEY_MONTH_FILTER = 'feni_session_month_filter';
const SESSION_STORAGE_KEY_SELECTED_MONTHS = 'feni_session_selected_months';

const getInitialMonthState = (curMonth: string): { filter: string; months: string[] } => {
  if (typeof window === 'undefined') {
    return { filter: curMonth, months: [curMonth] };
  }
  try {
    const storedFilter = window.sessionStorage.getItem(SESSION_STORAGE_KEY_MONTH_FILTER);
    const storedMonths = window.sessionStorage.getItem(SESSION_STORAGE_KEY_SELECTED_MONTHS);

    if (storedMonths !== null || storedFilter !== null) {
      let parsedMonths: string[] = [];
      if (storedMonths) {
        try {
          const arr = JSON.parse(storedMonths);
          if (Array.isArray(arr)) {
            parsedMonths = arr.filter((m) => typeof m === 'string' && m.trim());
          }
        } catch {
          if (storedMonths.trim() && storedMonths !== 'ALL') {
            parsedMonths = [storedMonths.trim()];
          }
        }
      }

      let filterVal = storedFilter;
      if (!filterVal) {
        if (parsedMonths.length === 0) filterVal = 'ALL';
        else if (parsedMonths.length === 1) filterVal = parsedMonths[0];
        else filterVal = 'MULTI';
      }

      return {
        filter: filterVal,
        months: parsedMonths,
      };
    }
  } catch (err) {
    console.warn('Failed to read month filter from sessionStorage:', err);
  }

  // If no sessionStorage entry exists yet, default to current month as requested
  return {
    filter: curMonth,
    months: [curMonth],
  };
};

const MONTH_NAMES_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const MONTH_NAMES_GU = [
  'જાન્યુ', 'ફેબ્રુ', 'માર્ચ', 'એપ્રિલ', 'મે', 'જૂન',
  'જુલાઈ', 'ઓગસ્ટ', 'સપ્ટે', 'ઓક્ટો', 'નવે', 'ડિસે'
];

const toGujaratiDigits = (numStr: string | number): string => {
  const gujDigits = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
  return String(numStr).replace(/\d/g, (d) => gujDigits[parseInt(d, 10)]);
};

interface MonthFilterContextType {
  selectedMonth: string;
  monthFilter: string;
  setMonthFilter: (m: string) => void;
  setSelectedMonth: (m: string) => void;
  selectedMonths: string[];
  setSelectedMonths: (months: string[]) => void;
  toggleMonth: (m: string) => void;
  isDateInSelectedMonth: (dateStr?: any) => boolean;
  getMonthLabel: (month: string, lang: 'en' | 'gu') => string;
  getMultiMonthLabel: (lang: 'en' | 'gu') => string;
  availableMonths: string[];
  currentMonth: string;
  selectCurrentMonth: () => void;
  isCurrentMonthSelected: boolean;
}

const MonthFilterContext = createContext<MonthFilterContextType>({
  selectedMonth: '2026-10',
  monthFilter: '2026-10',
  setMonthFilter: () => {},
  setSelectedMonth: () => {},
  selectedMonths: ['2026-10'],
  setSelectedMonths: () => {},
  toggleMonth: () => {},
  isDateInSelectedMonth: () => true,
  getMonthLabel: (m) => m,
  getMultiMonthLabel: () => 'All Months',
  availableMonths: [],
  currentMonth: '2026-10',
  selectCurrentMonth: () => {},
  isCurrentMonthSelected: true,
});

export const MonthFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentMonth = useMemo(() => getCurrentYearMonth(), []);

  // Retrieve initial state from sessionStorage or fallback to current month
  const [initialState] = useState(() => getInitialMonthState(currentMonth));
  const [monthFilter, setMonthFilterState] = useState<string>(initialState.filter);
  const [selectedMonths, setSelectedMonthsState] = useState<string[]>(initialState.months);

  const [availableMonths] = useState<string[]>([
    '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
    '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'
  ]);

  // Save changes to sessionStorage ONLY (never localStorage)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY_MONTH_FILTER, monthFilter);
      window.sessionStorage.setItem(SESSION_STORAGE_KEY_SELECTED_MONTHS, JSON.stringify(selectedMonths));
    } catch (err) {
      console.warn('Failed to save month filter to sessionStorage:', err);
    }
  }, [monthFilter, selectedMonths]);

  const selectCurrentMonth = useCallback(() => {
    setMonthFilterState(currentMonth);
    setSelectedMonthsState([currentMonth]);
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY_MONTH_FILTER, currentMonth);
        window.sessionStorage.setItem(SESSION_STORAGE_KEY_SELECTED_MONTHS, JSON.stringify([currentMonth]));
      } catch (err) {
        console.warn('Failed to save to sessionStorage:', err);
      }
    }
  }, [currentMonth]);

  const isCurrentMonthSelected = useMemo(() => {
    return (
      (selectedMonths.length === 1 && selectedMonths[0] === currentMonth) ||
      monthFilter === currentMonth
    );
  }, [selectedMonths, monthFilter, currentMonth]);

  const setSelectedMonth = useCallback((m: string) => {
    const isAll = !m || m === 'ALL' || m === 'All';
    const nextFilter = isAll ? 'ALL' : m;
    const nextMonths = isAll ? [] : [m];

    setMonthFilterState(nextFilter);
    setSelectedMonthsState(nextMonths);

    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY_MONTH_FILTER, nextFilter);
        window.sessionStorage.setItem(SESSION_STORAGE_KEY_SELECTED_MONTHS, JSON.stringify(nextMonths));
      } catch (err) {
        console.warn('Failed to save to sessionStorage:', err);
      }
    }
  }, []);

  const setMonthFilter = setSelectedMonth;

  const setSelectedMonths = useCallback((months: string[]) => {
    const valid = months.filter((m) => m && m !== 'ALL' && m !== 'All');
    let nextFilter: string;
    if (valid.length === 0) {
      nextFilter = 'ALL';
    } else if (valid.length === 1) {
      nextFilter = valid[0];
    } else {
      nextFilter = 'MULTI';
    }

    setSelectedMonthsState(valid);
    setMonthFilterState(nextFilter);

    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY_MONTH_FILTER, nextFilter);
        window.sessionStorage.setItem(SESSION_STORAGE_KEY_SELECTED_MONTHS, JSON.stringify(valid));
      } catch (err) {
        console.warn('Failed to save to sessionStorage:', err);
      }
    }
  }, []);

  const toggleMonth = useCallback((m: string) => {
    if (!m || m === 'ALL' || m === 'All') {
      setSelectedMonth('ALL');
      return;
    }
    setSelectedMonthsState((prev) => {
      // If prev is empty but monthFilter has a single valid month, start from that
      let base = prev;
      if (base.length === 0 && monthFilter && monthFilter !== 'ALL' && monthFilter !== 'All' && monthFilter !== 'MULTI') {
        base = [monthFilter];
      }

      let updated: string[];
      if (base.includes(m)) {
        updated = base.filter((item) => item !== m);
      } else {
        updated = [...base, m].sort();
      }

      let nextFilter: string;
      if (updated.length === 0) {
        nextFilter = 'ALL';
      } else if (updated.length === 1) {
        nextFilter = updated[0];
      } else {
        nextFilter = 'MULTI';
      }

      setMonthFilterState(nextFilter);

      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem(SESSION_STORAGE_KEY_MONTH_FILTER, nextFilter);
          window.sessionStorage.setItem(SESSION_STORAGE_KEY_SELECTED_MONTHS, JSON.stringify(updated));
        } catch (err) {
          console.warn('Failed to save to sessionStorage:', err);
        }
      }

      return updated;
    });
  }, [setSelectedMonth, monthFilter]);

  const isDateInSelectedMonth = useCallback((dateVal?: any): boolean => {
    if ((!monthFilter || monthFilter === 'ALL' || monthFilter === 'All') && selectedMonths.length === 0) {
      return true;
    }
    if (!dateVal) return false;
    const ym = extractYearMonth(dateVal);
    if (!ym) return false;
    if (selectedMonths.length > 0) {
      return selectedMonths.includes(ym);
    }
    if (monthFilter && monthFilter !== 'ALL' && monthFilter !== 'All' && monthFilter !== 'MULTI') {
      return ym === monthFilter;
    }
    return true;
  }, [monthFilter, selectedMonths]);

  const getMonthLabel = useCallback((m: string, lang: 'en' | 'gu'): string => {
    if (!m || m === 'ALL' || m === 'All') {
      return lang === 'gu' ? 'બધા મહિના' : 'All Months';
    }
    if (m === 'MULTI') {
      if (selectedMonths.length === 0) return lang === 'gu' ? 'બધા મહિના' : 'All Months';
      if (selectedMonths.length === 1) return getMonthLabel(selectedMonths[0], lang);
      const sorted = [...selectedMonths].sort();
      if (sorted.length === 2) {
        return `${getMonthLabel(sorted[0], lang)}, ${getMonthLabel(sorted[1], lang)}....`;
      }
      return `${getMonthLabel(sorted[0], lang)}, ${getMonthLabel(sorted[1], lang)}....`;
    }
    const ymMatch = m.match(/^(\d{4})-(\d{2})$/);
    if (ymMatch) {
      const year = ymMatch[1];
      const monthIdx = parseInt(ymMatch[2], 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        if (lang === 'gu') {
          return `${MONTH_NAMES_GU[monthIdx]} ${toGujaratiDigits(year)}`;
        }
        return `${MONTH_NAMES_EN[monthIdx]} ${year}`;
      }
    }
    return m;
  }, [selectedMonths]);

  const getMultiMonthLabel = useCallback((lang: 'en' | 'gu'): string => {
    if (selectedMonths.length === 0 || monthFilter === 'ALL' || monthFilter === 'All') {
      return lang === 'gu' ? 'બધા મહિના' : 'All Months';
    }
    if (selectedMonths.length === 1) {
      return getMonthLabel(selectedMonths[0], lang);
    }
    const sorted = [...selectedMonths].sort();
    if (sorted.length === 2) {
      return `${getMonthLabel(sorted[0], lang)}, ${getMonthLabel(sorted[1], lang)}....`;
    }
    return `${getMonthLabel(sorted[0], lang)}, ${getMonthLabel(sorted[1], lang)}....`;
  }, [selectedMonths, monthFilter, getMonthLabel]);

  return (
    <MonthFilterContext.Provider
      value={{
        selectedMonth: monthFilter,
        monthFilter,
        setMonthFilter,
        setSelectedMonth,
        selectedMonths,
        setSelectedMonths,
        toggleMonth,
        isDateInSelectedMonth,
        getMonthLabel,
        getMultiMonthLabel,
        availableMonths,
        currentMonth,
        selectCurrentMonth,
        isCurrentMonthSelected,
      }}
    >
      {children}
    </MonthFilterContext.Provider>
  );
};

export const useMonthFilter = () => useContext(MonthFilterContext);
