import React, { useState, useMemo } from 'react';
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
import {
  CalendarMonth as CalendarIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Check as CheckIcon,
  Clear as ClearIcon,
  AllInclusive as AllIcon,
  Done as DoneIcon,
} from '@mui/icons-material';
import { useMonthFilter } from '../context/MonthFilterContext';
import { useThemeContext } from '../context/ThemeContext';

const MONTH_NAMES_EN = [
  'Jan', 'Feb', 'Mar', 'Apr',
  'May', 'Jun', 'Jul', 'Aug',
  'Sep', 'Oct', 'Nov', 'Dec'
];

const MONTH_NAMES_GU = [
  'જાન્યુ', 'ફેબ્રુ', 'માર્ચ', 'એપ્રિલ',
  'મે', 'જૂન', 'જુલાઈ', 'ઓગસ્ટ',
  'સપ્ટે', 'ઓક્ટો', 'નવે', 'ડિસે'
];

const toGujaratiDigits = (numStr: string | number): string => {
  const gujDigits = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
  return String(numStr).replace(/\d/g, (d) => gujDigits[parseInt(d, 10)]);
};

interface MonthMultiSelectDropdownProps {
  label?: string;
  monthRecordCounts?: Record<string, number>;
  onFilterChange?: () => void;
  fullWidth?: boolean;
}

export const MonthMultiSelectDropdown: React.FC<MonthMultiSelectDropdownProps> = ({
  label,
  monthRecordCounts = {},
  onFilterChange,
  fullWidth = true,
}) => {
  const { mode, language } = useThemeContext();
  const isGu = language === 'gu';
  const {
    selectedMonth,
    monthFilter,
    selectedMonths,
    setSelectedMonth,
    setSelectedMonths,
    toggleMonth,
    getMonthLabel,
  } = useMonthFilter();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  // Year state inside picker
  const currentYear = new Date().getFullYear();
  const [viewYear, setViewYear] = useState<number>(() => {
    const validMonth = selectedMonths.find((m) => m && m.includes('-'));
    if (validMonth) {
      const parsedYear = parseInt(validMonth.split('-')[0], 10);
      if (!isNaN(parsedYear)) return parsedYear;
    }
    return currentYear;
  });

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    if (onFilterChange) onFilterChange();
  };

  const isAllActive =
    (monthFilter === 'ALL' || monthFilter === 'All' || !monthFilter) &&
    selectedMonths.length === 0;

  const handleSelectAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedMonth('ALL');
    if (onFilterChange) onFilterChange();
  };

  const handleToggle = (monthIdx: number) => {
    const monthStr = String(monthIdx + 1).padStart(2, '0');
    const monthKey = `${viewYear}-${monthStr}`;
    toggleMonth(monthKey);
    if (onFilterChange) onFilterChange();
  };

  const handleSelectEntireYear = () => {
    const yearMonths = Array.from({ length: 12 }, (_, i) => {
      const mStr = String(i + 1).padStart(2, '0');
      return `${viewYear}-${mStr}`;
    });
    const allSelected = yearMonths.every((m) => selectedMonths.includes(m));
    if (allSelected) {
      const remaining = selectedMonths.filter((m) => !yearMonths.includes(m));
      setSelectedMonths(remaining);
    } else {
      const combined = Array.from(new Set([...selectedMonths, ...yearMonths])).sort();
      setSelectedMonths(combined);
    }
    if (onFilterChange) onFilterChange();
  };

  // Formatted trigger label: always displays proper months on one line with "...."
  const displayLabel = useMemo(() => {
    if (isAllActive) {
      return isGu ? 'બધા મહિના' : 'All Months';
    }
    if (selectedMonths.length === 1) {
      return getMonthLabel(selectedMonths[0], language);
    }
    const sorted = [...selectedMonths].sort();
    if (sorted.length === 2) {
      return `${getMonthLabel(sorted[0], language)}, ${getMonthLabel(sorted[1], language)}....`;
    }
    return `${getMonthLabel(sorted[0], language)}, ${getMonthLabel(sorted[1], language)}....`;
  }, [isAllActive, selectedMonths, getMonthLabel, language, isGu]);

  // Full tooltip text showing all selected months when hovering
  const fullTooltipLabel = useMemo(() => {
    if (isAllActive) {
      return isGu ? 'બધા મહિના' : 'All Months';
    }
    return selectedMonths.map((ym) => getMonthLabel(ym, language)).join(', ');
  }, [isAllActive, selectedMonths, getMonthLabel, language, isGu]);

  return (
    <Box sx={{ width: fullWidth ? '100%' : 'auto' }}>
      {label && (
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: mode === 'dark' ? '#94a3b8' : '#64748b',
            mb: 0.6,
            letterSpacing: '0.01em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{label}</span>
          {!isAllActive && (
            <Box
              component="span"
              onClick={handleSelectAll}
              sx={{
                cursor: 'pointer',
                color: '#2563eb',
                fontSize: '0.7rem',
                fontWeight: 600,
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {isGu ? 'સાફ કરો' : 'Clear'}
            </Box>
          )}
        </Typography>
      )}

      {/* Trigger Box styled like a form input */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          width: fullWidth ? '100%' : 'auto',
          height: 40,
          borderRadius: '8px',
          justifyContent: 'space-between',
          px: 1.5,
          py: 0.75,
          minWidth: 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          bgcolor: mode === 'dark' ? '#0f172a' : '#ffffff',
          color: mode === 'dark' ? '#f8fafc' : '#0f172a',
          border: '1px solid',
          borderColor: open
            ? '#2563eb'
            : !isAllActive
            ? '#3b82f6'
            : mode === 'dark'
            ? '#1e293b'
            : '#cbd5e1',
          borderWidth: !isAllActive || open ? 1.5 : 1,
          boxShadow: open ? '0 0 0 2px rgba(37, 99, 235, 0.15)' : 'none',
          transition: 'all 0.15s ease',
          '&:hover': {
            borderColor: '#2563eb',
            bgcolor: mode === 'dark' ? '#111827' : '#f8fafc',
          },
        }}
      >
        {/* Clickable Area for Popover Open */}
        <Tooltip title={fullTooltipLabel} arrow enterDelay={300}>
          <Box
            onClick={handleOpen}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpen(e as any);
              }
            }}
            tabIndex={0}
            role="button"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              minWidth: 0,
              flex: 1,
              overflow: 'hidden',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <CalendarIcon sx={{ fontSize: 18, color: !isAllActive ? '#2563eb' : '#64748b', flexShrink: 0 }} />
            <Typography
              noWrap
              sx={{
                fontSize: '0.84rem',
                fontWeight: !isAllActive ? 700 : 500,
                color: !isAllActive ? (mode === 'dark' ? '#60a5fa' : '#1d4ed8') : 'inherit',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
                flex: 1,
                textAlign: 'left',
              }}
            >
              {displayLabel}
            </Typography>
            {!isAllActive && selectedMonths.length > 1 && (
              <Box
                sx={{
                  bgcolor: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  px: 0.7,
                  py: 0.1,
                  borderRadius: '6px',
                  lineHeight: 1.2,
                  flexShrink: 0,
                }}
              >
                {selectedMonths.length}
              </Box>
            )}
          </Box>
        </Tooltip>

        {/* Clear and Arrow Actions (distinct siblings, not nested in trigger button) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, ml: 1 }}>
          {!isAllActive && (
            <Tooltip title={isGu ? 'બધા મહિના પસંદ કરો' : 'Reset to All Months'}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectAll();
                }}
                sx={{
                  p: 0.3,
                  color: '#94a3b8',
                  '&:hover': { color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.1)' },
                }}
              >
                <ClearIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          )}
          <Box
            onClick={handleOpen}
            sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', p: 0.2 }}
          >
            <ArrowDownIcon
              sx={{
                fontSize: 18,
                color: '#64748b',
                transition: 'transform 0.2s',
                transform: open ? 'rotate(180deg)' : 'none',
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Popover Dropdown Picker */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          elevation: 8,
          sx: {
            mt: 0.8,
            width: 330,
            maxWidth: 'calc(100vw - 32px)',
            p: 2,
            borderRadius: '14px',
            bgcolor: mode === 'dark' ? '#0f172a' : '#ffffff',
            border: `1px solid ${mode === 'dark' ? '#1e293b' : '#e2e8f0'}`,
            boxShadow: mode === 'dark'
              ? '0 12px 28px rgba(0, 0, 0, 0.6)'
              : '0 12px 28px rgba(15, 23, 42, 0.12)',
          },
        }}
      >
        {/* Top Header: All Months | Clear */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
          <Button
            fullWidth
            size="small"
            onClick={handleSelectAll}
            startIcon={<AllIcon sx={{ fontSize: 16 }} />}
            sx={{
              py: 0.7,
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.82rem',
              textTransform: 'none',
              bgcolor: isAllActive
                ? (mode === 'dark' ? 'rgba(37, 99, 235, 0.25)' : '#eff6ff')
                : (mode === 'dark' ? '#1e293b' : '#f8fafc'),
              color: isAllActive ? '#2563eb' : (mode === 'dark' ? '#cbd5e1' : '#475569'),
              border: '1px solid',
              borderColor: isAllActive ? '#2563eb' : (mode === 'dark' ? '#334155' : '#e2e8f0'),
              '&:hover': {
                bgcolor: mode === 'dark' ? 'rgba(37, 99, 235, 0.3)' : '#e0f2fe',
              },
            }}
          >
            {isGu ? '🌐 બધા મહિના' : '🌐 All Months'}
          </Button>

          {!isAllActive && (
            <Button
              size="small"
              onClick={handleSelectAll}
              sx={{
                px: 1.5,
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.75rem',
                textTransform: 'none',
                color: '#ef4444',
                border: '1px solid',
                borderColor: mode === 'dark' ? '#7f1d1d' : '#fecaca',
                bgcolor: mode === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                whiteSpace: 'nowrap',
              }}
            >
              {isGu ? 'સાફ કરો' : 'Clear'}
            </Button>
          )}
        </Box>

        <Divider sx={{ mb: 1.5, borderColor: mode === 'dark' ? '#1e293b' : '#f1f5f9' }} />

        {/* Year Header Navigator */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, px: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => setViewYear((y) => y - 1)}
            sx={{
              color: '#2563eb',
              bgcolor: mode === 'dark' ? 'rgba(37, 99, 235, 0.15)' : '#eff6ff',
              borderRadius: '8px',
              p: 0.6,
            }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: mode === 'dark' ? '#f8fafc' : '#0f172a' }}>
              {isGu ? toGujaratiDigits(viewYear) : viewYear}
            </Typography>

            <Button
              size="small"
              onClick={handleSelectEntireYear}
              sx={{
                textTransform: 'none',
                fontSize: '0.7rem',
                py: 0.2,
                px: 1,
                borderRadius: '6px',
                fontWeight: 700,
                color: '#2563eb',
                bgcolor: mode === 'dark' ? 'rgba(37, 99, 235, 0.15)' : '#eff6ff',
                '&:hover': { bgcolor: mode === 'dark' ? 'rgba(37, 99, 235, 0.25)' : '#dbeafe' },
              }}
            >
              {isGu ? 'આખું વર્ષ' : 'Whole Year'}
            </Button>
          </Box>

          <IconButton
            size="small"
            onClick={() => setViewYear((y) => y + 1)}
            sx={{
              color: '#2563eb',
              bgcolor: mode === 'dark' ? 'rgba(37, 99, 235, 0.15)' : '#eff6ff',
              borderRadius: '8px',
              p: 0.6,
            }}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* 4x3 Month Buttons Grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
          {MONTH_NAMES_EN.map((mEn, idx) => {
            const monthStr = String(idx + 1).padStart(2, '0');
            const monthKey = `${viewYear}-${monthStr}`;
            const isSelected = selectedMonths.includes(monthKey);
            const mLabel = isGu ? MONTH_NAMES_GU[idx] : mEn;
            const count = monthRecordCounts[monthKey] || 0;

            return (
              <Button
                key={mEn}
                fullWidth
                onClick={() => handleToggle(idx)}
                sx={{
                  py: 0.9,
                  px: 0.4,
                  borderRadius: '10px',
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: '0.8rem',
                  textTransform: 'none',
                  flexDirection: 'column',
                  gap: 0.2,
                  position: 'relative',
                  bgcolor: isSelected
                    ? '#2563eb'
                    : (mode === 'dark' ? '#1e293b' : '#f8fafc'),
                  color: isSelected
                    ? '#ffffff'
                    : (mode === 'dark' ? '#cbd5e1' : '#334155'),
                  border: '1.5px solid',
                  borderColor: isSelected
                    ? '#2563eb'
                    : (mode === 'dark' ? '#334155' : '#e2e8f0'),
                  boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.35)' : 'none',
                  '&:hover': {
                    bgcolor: isSelected
                      ? '#1d4ed8'
                      : (mode === 'dark' ? '#334155' : '#e2e8f0'),
                  },
                  transition: 'all 0.12s ease',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                  {isSelected && <CheckIcon sx={{ fontSize: 13, stroke: '#ffffff', strokeWidth: 0.8 }} />}
                  <span>{mLabel}</span>
                </Box>
                {count > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography
                      sx={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        opacity: isSelected ? 0.95 : 0.75,
                        color: isSelected ? '#ffffff' : '#2563eb',
                        lineHeight: 1,
                      }}
                    >
                      {count} {isGu ? 'બિલ' : 'bills'}
                    </Typography>
                  </Box>
                )}
              </Button>
            );
          })}
        </Box>

        {/* Footer: Done button */}
        <Box sx={{ mt: 1.8, pt: 1.2, borderTop: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {!isAllActive
                ? (isGu
                    ? `${toGujaratiDigits(selectedMonths.length)} મહિના પસંદ કરેલ`
                    : `${selectedMonths.length} month(s) selected`)
                : (isGu ? 'બધા મહિના સક્રિય' : 'All months active')}
            </Typography>

            <Button
              size="small"
              variant="contained"
              onClick={handleClose}
              startIcon={<DoneIcon sx={{ fontSize: 16 }} />}
              sx={{
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.78rem',
                textTransform: 'none',
                px: 2,
                py: 0.45,
                bgcolor: '#2563eb',
                '&:hover': { bgcolor: '#1d4ed8' },
              }}
            >
              {isGu ? 'લાગુ કરો' : 'Apply'}
            </Button>
          </Box>
        </Box>
      </Popover>
    </Box>
  );
};
