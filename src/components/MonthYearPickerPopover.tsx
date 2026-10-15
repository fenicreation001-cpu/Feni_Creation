import {
  CalendarMonth as CalendarIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  KeyboardArrowDown as ArrowDownIcon,
  AllInclusive as AllIcon,
  Check as CheckIcon,
  Done as DoneIcon,
} from '@mui/icons-material';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Popover,
  Typography,
  IconButton,
  Divider,
  Chip,
  Tooltip,
} from '@mui/material';

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
  const {
    selectedMonth,
    selectedMonths,
    toggleMonth,
    setSelectedMonth,
    setSelectedMonths,
    getMonthLabel,
    getMultiMonthLabel,
    currentMonth,
  } = useMonthFilter();

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  // Parse initial year from selectedMonths or default to current year
  const currentYear = new Date().getFullYear();
  const [viewYear, setViewYear] = useState<number>(() => {
    const validMonth = selectedMonths.find((m) => m && m.includes('-'));
    if (validMonth) {
      const parsedYear = parseInt(validMonth.split('-')[0], 10);
      if (!isNaN(parsedYear)) return parsedYear;
    }
    return currentYear;
  });

  // Sync viewYear when popover opens
  useEffect(() => {
    const validMonth = selectedMonths.find((m) => m && m.includes('-'));
    if (validMonth) {
      const parsedYear = parseInt(validMonth.split('-')[0], 10);
      if (!isNaN(parsedYear)) {
        setViewYear(parsedYear);
      }
    }
  }, [anchorEl, selectedMonths]);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleToggleMonth = (monthIdx: number) => {
    const monthStr = String(monthIdx + 1).padStart(2, '0');
    const monthKey = `${viewYear}-${monthStr}`;
    toggleMonth(monthKey);
  };

  const handleSelectAllMonths = () => {
    setSelectedMonth('ALL');
  };

  const handleSelectAllYearMonths = () => {
    const allMonthsOfYear = Array.from({ length: 12 }, (_, i) => {
      const monthStr = String(i + 1).padStart(2, '0');
      return `${viewYear}-${monthStr}`;
    });
    const allSelectedInYear = allMonthsOfYear.every((m) => selectedMonths.includes(m));
    if (allSelectedInYear) {
      const remaining = selectedMonths.filter((m) => !allMonthsOfYear.includes(m));
      setSelectedMonths(remaining);
    } else {
      const combined = Array.from(new Set([...selectedMonths, ...allMonthsOfYear]));
      setSelectedMonths(combined);
    }
  };

  const handlePrevYear = () => {
    setViewYear((prev) => prev - 1);
  };

  const handleNextYear = () => {
    setViewYear((prev) => prev + 1);
  };

  const open = Boolean(anchorEl);
  const isAllSelected = selectedMonth === 'ALL' || selectedMonth === 'All' || (!selectedMonth && selectedMonths.length === 0);

  // Full tooltip text showing all selected months
  const fullTooltipLabel = isAllSelected
    ? (language === 'gu' ? 'બધા મહિના' : 'All Months')
    : selectedMonths.map((ym) => getMonthLabel(ym, language)).join(', ');

  const multiMonthLabel = getMultiMonthLabel(language);

  return (
    <>
      <Tooltip title={fullTooltipLabel} arrow enterDelay={300}>
        <Button
          onClick={handleOpen}
          startIcon={<CalendarIcon sx={{ fontSize: 18, color: '#3b82f6', flexShrink: 0 }} />}
          endIcon={
            <ArrowDownIcon
              sx={{
                fontSize: 18,
                color: '#64748b',
                transition: 'transform 0.2s',
                transform: open ? 'rotate(180deg)' : 'none',
                flexShrink: 0,
              }}
            />
          }
          sx={{
            borderRadius: '20px',
            fontSize: { xs: '0.75rem', sm: '0.82rem' },
            fontWeight: 600,
            height: 34,
            maxWidth: { xs: 155, sm: 210, md: 250 },
            minWidth: 0,
            px: { xs: 1.2, sm: 1.6 },
            bgcolor: mode === 'light' ? '#ffffff' : '#0f172a',
            color: mode === 'light' ? '#1e293b' : '#f8fafc',
            border: '1px solid',
            borderColor: mode === 'light' ? '#e2e8f0' : '#334155',
            '&:hover': {
              bgcolor: mode === 'light' ? '#f8fafc' : '#1e293b',
              borderColor: '#2563eb',
            },
            textTransform: 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <Box
            component="span"
            sx={{
              display: 'inline-block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: { xs: 75, sm: 120, md: 150 },
              lineHeight: 1.2,
              verticalAlign: 'middle',
              textAlign: 'left',
            }}
          >
            {multiMonthLabel}
          </Box>
          {selectedMonths.length > 1 && (
            <Box
              component="span"
              sx={{
                ml: 0.7,
                px: 0.7,
                py: 0.1,
                borderRadius: '8px',
                bgcolor: '#0284c7',
                color: '#ffffff',
                fontSize: '0.68rem',
                fontWeight: 800,
                flexShrink: 0,
                lineHeight: 1.2,
                display: 'inline-block',
                verticalAlign: 'middle',
              }}
            >
              {selectedMonths.length}
            </Box>
          )}
        </Button>
      </Tooltip>

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
            width: 330,
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
        {/* Top Header: All Months | Clear */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
          <Button
            fullWidth
            size="small"
            onClick={handleSelectAllMonths}
            startIcon={<AllIcon sx={{ fontSize: 16 }} />}
            sx={{
              py: 0.7,
              px: 1,
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.8rem',
              textTransform: 'none',
              bgcolor: isAllSelected
                ? (mode === 'light' ? 'rgba(2, 132, 199, 0.12)' : 'rgba(56, 189, 248, 0.2)')
                : (mode === 'light' ? '#f8fafc' : '#1e293b'),
              color: isAllSelected ? '#0284c7' : 'text.primary',
              border: '1px solid',
              borderColor: isAllSelected ? '#0284c7' : (mode === 'light' ? '#e2e8f0' : '#334155'),
              '&:hover': {
                bgcolor: mode === 'light' ? '#f1f5f9' : '#334155',
              },
            }}
          >
            {language === 'gu' ? '🌐 બધા મહિના' : '🌐 All Months'}
          </Button>

          {selectedMonths.length > 0 && !isAllSelected && (
            <Button
              size="small"
              onClick={handleSelectAllMonths}
              sx={{
                px: 1.5,
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.75rem',
                textTransform: 'none',
                color: 'error.main',
                border: '1px solid',
                borderColor: mode === 'light' ? '#fecaca' : '#7f1d1d',
                bgcolor: mode === 'light' ? '#fef2f2' : 'rgba(239, 68, 68, 0.1)',
                whiteSpace: 'nowrap',
              }}
            >
              {language === 'gu' ? 'સાફ કરો' : 'Clear'}
            </Button>
          )}
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        {/* Year Header Selector: Left Arrow | Year | Right Arrow */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
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

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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

            <Button
              size="small"
              onClick={handleSelectAllYearMonths}
              sx={{
                textTransform: 'none',
                fontSize: '0.72rem',
                py: 0.2,
                px: 1,
                borderRadius: '8px',
                fontWeight: 700,
                color: '#0284c7',
                bgcolor: mode === 'light' ? '#f0f9ff' : 'rgba(2, 132, 199, 0.15)',
                '&:hover': {
                  bgcolor: mode === 'light' ? '#e0f2fe' : 'rgba(2, 132, 199, 0.25)',
                },
              }}
            >
              {language === 'gu' ? 'આખું વર્ષ' : 'Whole Year'}
            </Button>
          </Box>

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

        {/* 3x4 Grid of Month Buttons (Multi-Select Enabled) */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
          {MONTHS_EN.map((mEn, idx) => {
            const monthKey = `${viewYear}-${String(idx + 1).padStart(2, '0')}`;
            const isSelected = selectedMonths.includes(monthKey) || (selectedMonths.length === 0 && selectedMonth === monthKey);
            const label = language === 'gu' ? MONTHS_GU[idx] : mEn;

            return (
              <Button
                key={mEn}
                fullWidth
                onClick={() => handleToggleMonth(idx)}
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
                  border: '1.5px solid',
                  borderColor: isSelected
                    ? '#0284c7'
                    : (mode === 'light' ? '#f1f5f9' : '#334155'),
                  borderStyle: 'solid',
                  position: 'relative',
                  '&:hover': {
                    bgcolor: isSelected
                      ? '#0369a1'
                      : (mode === 'light' ? '#e2e8f0' : '#334155'),
                    color: isSelected ? '#ffffff' : (mode === 'light' ? '#0f172a' : '#ffffff'),
                  },
                  transition: 'all 0.15s ease-in-out',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.4 }}>
                  {isSelected && <CheckIcon sx={{ fontSize: 13, stroke: '#ffffff', strokeWidth: 0.8 }} />}
                  <span>{label}</span>
                </Box>
              </Button>
            );
          })}
        </Box>

        {/* Bottom Multi-Select Status & Apply Footer */}
        <Box sx={{ mt: 1.8, pt: 1.2, borderTop: `1px solid ${mode === 'light' ? '#f1f5f9' : '#1e293b'}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {selectedMonths.length > 0
                ? (language === 'gu'
                    ? `${toGujaratiDigits(selectedMonths.length)} મહિના પસંદ કરેલ`
                    : `${selectedMonths.length} month(s) selected`)
                : (language === 'gu' ? 'બધા મહિના સક્રિય' : 'All months active')}
            </Typography>

            <Button
              size="small"
              variant="contained"
              onClick={handleClose}
              startIcon={<DoneIcon sx={{ fontSize: 16 }} />}
              sx={{
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.78rem',
                textTransform: 'none',
                px: 2,
                py: 0.4,
                bgcolor: '#0284c7',
                '&:hover': { bgcolor: '#0369a1' },
              }}
            >
              {language === 'gu' ? 'લાગુ કરો' : 'Done'}
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
};
