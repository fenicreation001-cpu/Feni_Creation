import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Popover,
  Typography,
  IconButton,
  Divider,
} from '@mui/material';
import CalendarIcon from '@mui/icons-material/CalendarMonth';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AllIcon from '@mui/icons-material/AllInclusive';
import { useMonthFilter } from '../context/MonthFilterContext';
import { useThemeContext } from '../context/ThemeContext';

const MONTHS_EN = [
  'Jan', 'Feb', 'Mar', 'Apr',
  'May', 'Jun', 'Jul', 'Aug',
  'Sep', 'Oct', 'Nov', 'Dec'
];

const MONTHS_GU = [
  'જાન્યુ', 'ફેબ્રુ', 'માર્ચ', 'એપ્રિલ',
  'મે', 'જૂન', 'જુલાઈ', 'ઓગસ્ટ',
  'સપ્ટે', 'ઓક્ટો', 'નવે', 'ડિસે'
];

const toGujaratiDigits = (numStr: string | number): string => {
  const gujDigits = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
  return String(numStr).replace(/\d/g, (d) => gujDigits[parseInt(d, 10)]);
};

export const MonthYearPickerPopover: React.FC = () => {
  const { mode, language } = useThemeContext();
  const { selectedMonth, selectedMonths, toggleMonth, setSelectedMonth, getMonthLabel } = useMonthFilter();

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  // Parse initial year from selectedMonths or default to current year
  const currentYear = new Date().getFullYear();
  const [viewYear, setViewYear] = useState<number>(() => {
    const validMonth = selectedMonths.find((m) => m.includes('-'));
    if (validMonth) {
      const parsedYear = parseInt(validMonth.split('-')[0], 10);
      if (!isNaN(parsedYear)) return parsedYear;
    }
    return currentYear;
  });

  // Sync viewYear when popover opens
  useEffect(() => {
    const validMonth = selectedMonths.find((m) => m.includes('-'));
    if (validMonth) {
      const parsedYear = parseInt(validMonth.split('-')[0], 10);
      if (!isNaN(parsedYear)) {
        setViewYear(parsedYear);
      }
    }
  }, [anchorEl]);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelectMonth = (monthIdx: number) => {
    const monthStr = String(monthIdx + 1).padStart(2, '0');
    const monthKey = `${viewYear}-${monthStr}`;
    toggleMonth(monthKey);
  };

  const handleSelectAllMonths = () => {
    setSelectedMonth('ALL');
  };

  const handlePrevYear = () => {
    setViewYear((prev) => prev - 1);
  };

  const handleNextYear = () => {
    setViewYear((prev) => prev + 1);
  };

  const open = Boolean(anchorEl);
  const isAllSelected = selectedMonths.includes('ALL') || selectedMonth === 'ALL' || selectedMonth === 'All';

  return (
    <>
      <Button
        onClick={handleOpen}
        startIcon={<CalendarIcon sx={{ fontSize: 18, color: '#3b82f6' }} />}
        endIcon={<ArrowDownIcon sx={{ fontSize: 18, color: '#64748b', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />}
        sx={{
          borderRadius: '20px',
          fontSize: { xs: '0.75rem', sm: '0.82rem' },
          fontWeight: 600,
          height: 34,
          px: 1.8,
          bgcolor: mode === 'light' ? '#eff6ff' : '#0f172a',
          color: mode === 'light' ? '#1e293b' : '#f8fafc',
          border: '1px solid',
          borderColor: mode === 'light' ? '#dbeafe' : '#334155',
          '&:hover': {
            bgcolor: mode === 'light' ? '#dbeafe' : '#1e293b',
            borderColor: '#bfdbfe',
          },
          textTransform: 'none',
        }}
      >
        {getMonthLabel(selectedMonth, language)}
      </Button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        PaperProps={{
          elevation: 8,
          sx: {
            mt: 1,
            width: 320,
            maxWidth: 'calc(100vw - 32px)',
            p: 2,
            borderRadius: '16px',
            bgcolor: mode === 'light' ? '#ffffff' : '#0f172a',
            border: '1px solid',
            borderColor: mode === 'light' ? '#e2e8f0' : '#1e293b',
            boxShadow: mode === 'light'
              ? '0 10px 30px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1)'
              : '0 10px 30px -5px rgba(0, 0, 0, 0.6)',
            overflow: 'hidden',
            boxSizing: 'border-box',
          },
        }}
      >
        {/* All Months Filter Button */}
        <Button
          fullWidth
          size="small"
          onClick={handleSelectAllMonths}
          startIcon={<AllIcon sx={{ fontSize: 18 }} />}
          sx={{
            mb: 1.5,
            py: 0.8,
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '0.875rem',
            textTransform: 'none',
            bgcolor: isAllSelected
              ? (mode === 'light' ? 'rgba(2, 132, 199, 0.12)' : 'rgba(56, 189, 248, 0.2)')
              : (mode === 'light' ? '#f8fafc' : '#1e293b'),
            color: isAllSelected
              ? '#0284c7'
              : 'text.primary',
            border: '1px solid',
            borderColor: isAllSelected ? 'primary.main' : (mode === 'light' ? '#e2e8f0' : '#334155'),
            '&:hover': {
              bgcolor: mode === 'light' ? '#f1f5f9' : '#334155',
            },
          }}
        >
          {language === 'gu' ? '🌐 બધા મહિના (All Months)' : '🌐 All Months'}
        </Button>

        <Divider sx={{ mb: 1.5 }} />

        {/* Year Header Selector: Left Arrow | Year | Right Arrow */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            px: 1,
            mb: 1.5,
          }}
        >
          <IconButton
            size="small"
            onClick={handlePrevYear}
            sx={{
              color: '#0284c7',
              bgcolor: mode === 'light' ? '#f0f9ff' : 'rgba(2, 132, 199, 0.15)',
              borderRadius: '50%',
              p: 0.6,
              '&:hover': {
                bgcolor: mode === 'light' ? '#e0f2fe' : 'rgba(2, 132, 199, 0.25)',
              },
            }}
          >
            <ChevronLeftIcon fontSize="small" sx={{ color: '#0284c7', fontWeight: 'bold' }} />
          </IconButton>

          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              fontSize: '1.2rem',
              color: mode === 'light' ? '#1e293b' : '#f8fafc',
              letterSpacing: '0.5px',
            }}
          >
            {language === 'gu' ? toGujaratiDigits(viewYear) : viewYear}
          </Typography>

          <IconButton
            size="small"
            onClick={handleNextYear}
            sx={{
              color: '#0284c7',
              bgcolor: mode === 'light' ? '#f0f9ff' : 'rgba(2, 132, 199, 0.15)',
              borderRadius: '50%',
              p: 0.6,
              '&:hover': {
                bgcolor: mode === 'light' ? '#e0f2fe' : 'rgba(2, 132, 199, 0.25)',
              },
            }}
          >
            <ChevronRightIcon fontSize="small" sx={{ color: '#0284c7', fontWeight: 'bold' }} />
          </IconButton>
        </Box>

        {/* 3x4 Grid of Month Buttons */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
          {MONTHS_EN.map((mEn, idx) => {
            const monthKey = `${viewYear}-${String(idx + 1).padStart(2, '0')}`;
            const isSelected = selectedMonths.includes(monthKey);
            const label = language === 'gu' ? MONTHS_GU[idx] : mEn;

            return (
              <Button
                key={mEn}
                fullWidth
                onClick={() => handleSelectMonth(idx)}
                sx={{
                  py: 1.2,
                  px: 0.5,
                  borderRadius: '12px',
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: '0.85rem',
                  textTransform: 'none',
                  bgcolor: isSelected
                    ? '#0284c7'
                    : (mode === 'light' ? '#f8fafc' : '#1e293b'),
                  color: isSelected
                    ? '#ffffff'
                    : (mode === 'light' ? '#334155' : '#cbd5e1'),
                  boxShadow: isSelected ? '0 4px 12px rgba(2, 132, 199, 0.35)' : 'none',
                  border: '1px solid',
                  borderColor: isSelected
                    ? '#0284c7'
                    : (mode === 'light' ? '#f1f5f9' : '#334155'),
                  '&:hover': {
                    bgcolor: isSelected
                      ? '#0369a1'
                      : (mode === 'light' ? '#e2e8f0' : '#334155'),
                    color: isSelected ? '#ffffff' : (mode === 'light' ? '#0f172a' : '#ffffff'),
                  },
                  transition: 'all 0.15s ease-in-out',
                }}
              >
                {label}
              </Button>
            );
          })}
        </Box>
      </Popover>
    </>
  );
};
