import React, { createContext, useContext, useState, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material';

interface ThemeContextType {
  mode: 'light' | 'dark';
  toggleTheme: () => void;
  language: 'en' | 'gu';
  setLanguage: (lang: 'en' | 'gu') => void;
  toggleLanguage: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleTheme: () => {},
  language: 'en',
  setLanguage: () => {},
  toggleLanguage: () => {},
});

export const CustomThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('app_theme') as 'light' | 'dark') || 'light';
  });
  const [language, setLanguage] = useState<'en' | 'gu'>(() => {
    return (localStorage.getItem('app_language') as 'en' | 'gu') || 'en';
  });

  const toggleTheme = () => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('app_theme', next);
      return next;
    });
  };

  const toggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === 'en' ? 'gu' : 'en';
      localStorage.setItem('app_language', next);
      return next;
    });
  };

  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#4338ca',
            light: '#6366f1',
            dark: '#3730a3',
          },
          secondary: {
            main: '#f59e0b',
          },
          background: {
            default: mode === 'dark' ? '#0b0f19' : '#f4f6fa',
            paper: mode === 'dark' ? '#1e293b' : '#ffffff',
          },
          text: {
            primary: mode === 'dark' ? '#f8fafc' : '#0f172a',
            secondary: mode === 'dark' ? '#94a3b8' : '#64748b',
          },
          divider: mode === 'dark' ? '#1e293b' : '#f1f5f9',
        },
        typography: {
          fontFamily: '"Plus Jakarta Sans", "Noto Sans Gujarati", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          button: {
            textTransform: 'none',
            fontWeight: 600,
          },
        },
        shape: {
          borderRadius: 10,
        },
      }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, language, setLanguage, toggleLanguage }}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);
