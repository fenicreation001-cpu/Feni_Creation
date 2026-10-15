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
  language: 'gu',
  setLanguage: () => {},
  toggleLanguage: () => {},
});

export const CustomThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('app_theme') as 'light' | 'dark') || 'light';
  });
  const [language, setLanguage] = useState<'en' | 'gu'>(() => {
    return (localStorage.getItem('app_language') as 'en' | 'gu') || 'gu';
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
            main: '#1d4ed8',
            light: '#2563eb',
            dark: '#1e40af',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#0f172a',
            light: '#1e293b',
            dark: '#020617',
            contrastText: '#ffffff',
          },
          success: {
            main: '#10b981',
            light: '#34d399',
            dark: '#059669',
          },
          warning: {
            main: '#f59e0b',
            light: '#fbbf24',
            dark: '#d97706',
          },
          error: {
            main: '#ef4444',
            light: '#f87171',
            dark: '#dc2626',
          },
          info: {
            main: '#0284c7',
            light: '#38bdf8',
            dark: '#0369a1',
          },
          background: {
            default: mode === 'dark' ? '#090d16' : '#f8fafc',
            paper: mode === 'dark' ? '#111827' : '#ffffff',
          },
          text: {
            primary: mode === 'dark' ? '#f8fafc' : '#0f172a',
            secondary: mode === 'dark' ? '#94a3b8' : '#64748b',
          },
          divider: mode === 'dark' ? '#1e293b' : '#e2e8f0',
        },
        typography: {
          fontFamily: '"Plus Jakarta Sans", Inter, Mukta, "Hind Vadodara", "Noto Sans Gujarati", sans-serif',
          button: {
            textTransform: 'none',
            fontWeight: 600,
          },
        },
        shape: {
          borderRadius: 10,
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: '8px',
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: 'none',
                },
              },
              containedPrimary: {
                bgcolor: '#1d4ed8',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(29, 78, 216, 0.35)',
                '&:hover': {
                  bgcolor: '#1e40af',
                  boxShadow: '0 4px 12px rgba(29, 78, 216, 0.45)',
                },
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
              elevation1: {
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                border: mode === 'dark' ? '1px solid #1e293b' : '1px solid #e2e8f0',
              },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              root: {
                fontFamily: '"Plus Jakarta Sans", Inter, Mukta, "Hind Vadodara", "Noto Sans Gujarati", sans-serif',
                fontSize: '0.8rem',
                lineHeight: 1.43,
                padding: '9.6px 6.4px',
                color: mode === 'dark' ? '#f8fafc' : 'rgb(51, 65, 85)',
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: '5px',
                fontWeight: 600,
              },
            },
          },
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
