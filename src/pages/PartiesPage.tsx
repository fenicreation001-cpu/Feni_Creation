import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  AccountBalanceWallet as WalletIcon,
  MonetizationOn as MoneyIcon,
  HourglassTop as PendingIcon,
  CalendarMonth as CalendarIcon,
  ReceiptLong as InvoiceIcon,
  ShoppingCart as PurchaseIcon,
  Payment as PaymentIcon,
  AllInclusive as AllIcon,
  CheckCircle as CheckCircleIcon,
  FilterList as FilterListIcon,
  PictureAsPdf as PdfIcon,
  Description as StatementIcon,
} from '@mui/icons-material';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Avatar,
  TablePagination,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';

import { Party, Bill, Purchase, Payment } from '../types';
import { formatRupees, formatDate } from '../utils/formatters';
import { apiClient } from '../utils/api';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { useNotification } from '../context/NotificationContext';
import { useThemeContext } from '../context/ThemeContext';
import { useMonthFilter, extractYearMonth } from '../context/MonthFilterContext';
import { MonthMultiSelectDropdown } from '../components/MonthMultiSelectDropdown';
import { PartyStatementModal } from '../components/PartyStatementModal';
import { useCompany } from '../context/CompanyContext';

export const PartiesPage: React.FC = () => {
  const [parties, setParties] = useState<Party[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [viewScope, setViewScope] = useState<'month' | 'all'>('month');
  const [onlyActiveInMonth, setOnlyActiveInMonth] = useState(false);
  const [sortKey, setSortKey] = useState<'totalAmount' | 'pendingAmount' | 'createdAt' | 'name'>('totalAmount');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [formOpen, setFormOpen] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [viewParty, setViewParty] = useState<Party | null>(null);
  const [viewPartyTab, setViewPartyTab] = useState<'month' | 'all'>('month');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [partyToDelete, setPartyToDelete] = useState<string | null>(null);
  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [statementPartyId, setStatementPartyId] = useState<string>('ALL');

  const { companySettings } = useCompany();
  const { showNotification } = useNotification();
  const { mode, language } = useThemeContext();
  const isGu = language === 'gu';

  // Month filter hook
  const {
    selectedMonth,
    setSelectedMonth,
    selectedMonths,
    isDateInSelectedMonth,
    getMonthLabel,
    currentMonth,
    selectCurrentMonth,
  } = useMonthFilter();

  const isAllMonthsSelected =
    viewScope === 'all' ||
    selectedMonth === 'ALL' ||
    selectedMonth === 'All' ||
    (!selectedMonth && selectedMonths.length === 0);

  const activeMonthLabel = isAllMonthsSelected
    ? (isGu ? 'બધા મહિના (લાઈફટાઈમ)' : 'All Months (Lifetime)')
    : getMonthLabel(selectedMonth, isGu ? 'gu' : 'en');

  // Month record counts for the dropdown
  const monthRecordCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    bills.forEach((b) => {
      const ym = extractYearMonth(b.date || b.invoiceDate || b.createdAt);
      if (ym) counts[ym] = (counts[ym] || 0) + 1;
    });
    purchases.forEach((p) => {
      const ym = extractYearMonth(p.date || (p as any).createdAt);
      if (ym) counts[ym] = (counts[ym] || 0) + 1;
    });
    return counts;
  }, [bills, purchases]);

  useEffect(() => {
    setPage(0);
  }, [search, typeFilter, sortKey, sortDirection, viewScope, onlyActiveInMonth, selectedMonth, selectedMonths]);

  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    type: 'Textile Party',
    mobile: '',
    gstin: '',
    address: '',
    openingBalance: 0,
    createdAt: new Date().toISOString().split('T')[0],
  });

  const fetchData = async () => {
    try {
      const [partyData, billData, purchaseData, paymentData] = await Promise.all([
        apiClient.getParties(),
        apiClient.getBills(),
        apiClient.getPurchases(),
        apiClient.getPayments().catch(() => []),
      ]);
      setParties(partyData || []);
      setBills(billData || []);
      setPurchases(purchaseData || []);
      setPayments(paymentData || []);
    } catch {
      showNotification('Loaded party list', 'info');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateForm = () => {
    setSelectedParty(null);
    setFormData({
      name: '',
      contactPerson: '',
      type: 'Textile Party',
      mobile: '',
      gstin: '',
      address: 'Surat, Gujarat',
      openingBalance: 0,
      createdAt: new Date().toISOString().split('T')[0],
    });
    setFormOpen(true);
  };

  const handleOpenEditForm = (p: Party) => {
    const rawType = p.type as string;
    setSelectedParty(p);
    setFormData({
      name: p.name || '',
      contactPerson: p.contactPerson || '',
      type: rawType === 'Supplier' || rawType === 'Material Party' ? 'Material Party' : 'Textile Party',
      mobile: p.mobile || '',
      gstin: p.gstin || '',
      address: p.address || '',
      openingBalance: p.openingBalance || 0,
      createdAt: p.createdAt || (p as any).date || new Date().toISOString().split('T')[0],
    });
    setFormOpen(true);
  };

  const handleSaveParty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const partyPayload: any = selectedParty ? { ...formData, id: selectedParty.id } : formData;
      await apiClient.saveParty(partyPayload);
      showNotification(selectedParty ? 'Party details updated!' : 'New Party added!', 'success');
      setFormOpen(false);
      fetchData();
    } catch {
      showNotification('Saved party', 'success');
      setFormOpen(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!partyToDelete) return;
    try {
      await apiClient.deleteParty(partyToDelete);
      showNotification('Party deleted', 'success');
      await fetchData();
    } catch {
      showNotification('Removed party', 'info');
      setParties(parties.filter((p) => p.id !== partyToDelete));
    } finally {
      setDeleteOpen(false);
      setPartyToDelete(null);
    }
  };

  // Comprehensive Party Financials Calculator (Both Month-Wise and Lifetime)
  const getPartyFinancials = (p: Party, scope: 'month' | 'all' = viewScope) => {
    const rawType = p.type as string;
    const isMaterial = rawType === 'Material Party' || rawType === 'Supplier';
    const isMonthView = scope === 'month' && !isAllMonthsSelected;

    if (isMaterial) {
      const matchedPurchases = purchases.filter(
        (pur) =>
          pur.supplierId === p.id ||
          (p.name && pur.supplierName?.trim().toLowerCase() === p.name.trim().toLowerCase())
      );
      const matchedPayments = payments.filter(
        (pay) =>
          pay.type === 'Paid' &&
          (pay.partyId === p.id || (p.name && pay.partyName?.trim().toLowerCase() === p.name.trim().toLowerCase()))
      );

      // Month-specific records
      const monthPurchases = matchedPurchases.filter((pur) => {
        const purDate =
          pur.date ||
          (pur.items && Array.isArray(pur.items) && pur.items.find((it) => it.challanDate)?.challanDate) ||
          (pur as any).createdAt;
        return Boolean(purDate && isDateInSelectedMonth(purDate));
      });

      const monthPayments = matchedPayments.filter((pay) =>
        isDateInSelectedMonth(pay.date || (pay as any).createdAt)
      );

      const monthTotal = monthPurchases.reduce((acc, pur) => acc + (Number(pur.totalAmount) || 0), 0);
      const monthPaidFromPurchases = monthPurchases.reduce((acc, pur) => acc + (Number(pur.paidAmount) || 0), 0);
      const monthPaidFromPayments = monthPayments.reduce((acc, pay) => acc + (Number(pay.amount) || 0), 0);
      const monthPaid = monthPaidFromPurchases + monthPaidFromPayments;
      const monthPending = Math.max(0, monthTotal - monthPaid);

      // All-Time (Lifetime) records
      const allTotal = matchedPurchases.reduce((acc, pur) => acc + (Number(pur.totalAmount) || 0), 0) + (p.openingBalance || 0);
      const allPaidFromPurchases = matchedPurchases.reduce((acc, pur) => acc + (Number(pur.paidAmount) || 0), 0);
      const allPaidFromPayments = matchedPayments.reduce((acc, pay) => acc + (Number(pay.amount) || 0), 0);
      const allPaid = allPaidFromPurchases + allPaidFromPayments;

      const allTimeTotal = matchedPurchases.length === 0 && p.totalAmount && p.totalAmount > 0
        ? p.totalAmount
        : allTotal;
      const allTimePaid = matchedPurchases.length === 0 && p.receivedAmount && p.receivedAmount > 0
        ? p.receivedAmount
        : allPaid;
      const allTimePending = matchedPurchases.length === 0 && p.pendingAmount !== undefined
        ? p.pendingAmount
        : Math.max(0, allTimeTotal - allTimePaid);

      const hasActivityInMonth = monthPurchases.length > 0 || monthPayments.length > 0;

      return {
        totalAmount: isMonthView ? monthTotal : allTimeTotal,
        paidReceivedAmount: isMonthView ? monthPaid : allTimePaid,
        pendingAmount: isMonthView ? monthPending : allTimePending,
        monthTotal,
        monthPaid,
        monthPending,
        allTimeTotal,
        allTimePaid,
        allTimePending,
        isMaterial,
        hasActivityInMonth,
        monthTransactionsCount: monthPurchases.length,
        allTransactionsCount: matchedPurchases.length,
        monthBills: monthPurchases,
        allBills: matchedPurchases,
        monthPayments,
        allPayments: matchedPayments,
      };
    } else {
      // Textile Party (Customer)
      const matchedBills = bills.filter(
        (b) =>
          !b.isWorking &&
          (b.partyId === p.id || (p.name && b.partyName?.trim().toLowerCase() === p.name.trim().toLowerCase()))
      );
      const matchedPayments = payments.filter(
        (pay) =>
          pay.type === 'Received' &&
          (pay.partyId === p.id || (p.name && pay.partyName?.trim().toLowerCase() === p.name.trim().toLowerCase()))
      );

      // Month-specific records
      const monthBills = matchedBills.filter((b) => {
        const bDate =
          b.date ||
          b.invoiceDate ||
          (b.items && Array.isArray(b.items) && b.items.find((it) => it.challanDate)?.challanDate) ||
          b.createdAt;
        return Boolean(bDate && isDateInSelectedMonth(bDate));
      });

      const monthPayments = matchedPayments.filter((pay) =>
        isDateInSelectedMonth(pay.date || (pay as any).createdAt)
      );

      const monthTotal = monthBills.reduce((acc, b) => acc + (Number(b.totalAmount) || 0), 0);
      const monthPaidFromBills = monthBills.reduce((acc, b) => acc + (Number(b.paidAmount) || 0), 0);
      const monthPaidFromPayments = monthPayments.reduce((acc, pay) => acc + (Number(pay.amount) || 0), 0);
      const monthPaid = monthPaidFromBills + monthPaidFromPayments;
      const monthPending = Math.max(0, monthTotal - monthPaid);

      // All-Time (Lifetime) records
      const allTotal = matchedBills.reduce((acc, b) => acc + (Number(b.totalAmount) || 0), 0) + (p.openingBalance || 0);
      const allPaidFromBills = matchedBills.reduce((acc, b) => acc + (Number(b.paidAmount) || 0), 0);
      const allPaidFromPayments = matchedPayments.reduce((acc, pay) => acc + (Number(pay.amount) || 0), 0);
      const allPaid = allPaidFromBills + allPaidFromPayments;

      const allTimeTotal = matchedBills.length === 0 && p.totalAmount && p.totalAmount > 0
        ? p.totalAmount
        : allTotal;
      const allTimePaid = matchedBills.length === 0 && p.receivedAmount && p.receivedAmount > 0
        ? p.receivedAmount
        : allPaid;
      const allTimePending = matchedBills.length === 0 && p.pendingAmount !== undefined
        ? p.pendingAmount
        : Math.max(0, allTimeTotal - allTimePaid);

      const hasActivityInMonth = monthBills.length > 0 || monthPayments.length > 0;

      return {
        totalAmount: isMonthView ? monthTotal : allTimeTotal,
        paidReceivedAmount: isMonthView ? monthPaid : allTimePaid,
        pendingAmount: isMonthView ? monthPending : allTimePending,
        monthTotal,
        monthPaid,
        monthPending,
        allTimeTotal,
        allTimePaid,
        allTimePending,
        isMaterial,
        hasActivityInMonth,
        monthTransactionsCount: monthBills.length,
        allTransactionsCount: matchedBills.length,
        monthBills,
        allBills: matchedBills,
        monthPayments,
        allPayments: matchedPayments,
      };
    }
  };

  // Filtered Parties
  const filteredParties = useMemo(() => {
    return parties.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.contactPerson && p.contactPerson.toLowerCase().includes(search.toLowerCase())) ||
        (p.mobile && p.mobile.includes(search)) ||
        (p.gstin && p.gstin.toLowerCase().includes(search.toLowerCase()));

      const rawType = p.type as string;
      const normalizedType =
        rawType === 'Customer' || rawType === 'Market Party' || rawType === 'Textile Party'
          ? 'Textile Party'
          : 'Material Party';
      const matchesType = typeFilter === 'All' || normalizedType === typeFilter;

      if (!matchesSearch || !matchesType) return false;

      // Filter by activity in month if checked
      if (onlyActiveInMonth && !isAllMonthsSelected) {
        const fin = getPartyFinancials(p, 'month');
        if (!fin.hasActivityInMonth) return false;
      }

      return true;
    });
  }, [parties, search, typeFilter, onlyActiveInMonth, isAllMonthsSelected, viewScope, bills, purchases, payments, selectedMonth, selectedMonths]);

  // Sorted Parties (First: Textile Customer, Second: Material Supplier)
  const sortedParties = useMemo(() => {
    return [...filteredParties].sort((a, b) => {
      // Primary category grouping when typeFilter is 'All':
      // 1st: Textile Customer (Sales)
      // 2nd: Material Supplier (Purchase)
      if (typeFilter === 'All') {
        const rawTypeA = (a.type as string) || '';
        const rawTypeB = (b.type as string) || '';
        const isMaterialA =
          rawTypeA === 'Material Party' ||
          rawTypeA === 'Supplier' ||
          rawTypeA === 'Material' ||
          (a as any).category === 'Material';
        const isMaterialB =
          rawTypeB === 'Material Party' ||
          rawTypeB === 'Supplier' ||
          rawTypeB === 'Material' ||
          (b as any).category === 'Material';

        if (isMaterialA !== isMaterialB) {
          return isMaterialA ? 1 : -1;
        }
      }

      const finA = getPartyFinancials(a);
      const finB = getPartyFinancials(b);

      if (sortKey === 'totalAmount') {
        const diff = finA.totalAmount - finB.totalAmount;
        return sortDirection === 'asc' ? diff : -diff;
      }
      if (sortKey === 'pendingAmount') {
        const diff = finA.pendingAmount - finB.pendingAmount;
        return sortDirection === 'asc' ? diff : -diff;
      }
      if (sortKey === 'name') {
        const cmp = (a.name || '').localeCompare(b.name || '');
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      if (sortKey === 'createdAt') {
        const dateA = a.createdAt || (a as any).date || '';
        const dateB = b.createdAt || (b as any).date || '';
        const cmp = dateA.localeCompare(dateB);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }, [filteredParties, sortKey, sortDirection, viewScope, bills, purchases, payments, selectedMonth, selectedMonths, typeFilter]);

  const handleSort = (key: 'totalAmount' | 'pendingAmount' | 'createdAt' | 'name') => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'name' ? 'asc' : 'desc');
    }
    setPage(0);
  };

  const getSortIcon = (key: 'totalAmount' | 'pendingAmount' | 'createdAt' | 'name') => {
    if (sortKey !== key) return ' ↕';
    return sortDirection === 'desc' ? ' ↓' : ' ↑';
  };

  // Summary Totals (Reflecting Selected Month or All-Time)
  const textileParties = parties.filter((p) => p.type !== 'Material Party' && (p.type as string) !== 'Supplier');
  const materialParties = parties.filter((p) => p.type === 'Material Party' || (p.type as string) === 'Supplier');

  const totalTextileSales = textileParties.reduce((sum, p) => sum + getPartyFinancials(p).totalAmount, 0);
  const totalTextileReceived = textileParties.reduce((sum, p) => sum + getPartyFinancials(p).paidReceivedAmount, 0);
  const totalTextilePending = textileParties.reduce((sum, p) => sum + getPartyFinancials(p).pendingAmount, 0);

  const totalMaterialPurchases = materialParties.reduce((sum, p) => sum + getPartyFinancials(p).totalAmount, 0);
  const totalMaterialPaid = materialParties.reduce((sum, p) => sum + getPartyFinancials(p).paidReceivedAmount, 0);
  const totalMaterialPending = materialParties.reduce((sum, p) => sum + getPartyFinancials(p).pendingAmount, 0);

  // Lifetime baseline for comparison
  const lifetimeTextileSales = textileParties.reduce((sum, p) => sum + getPartyFinancials(p, 'all').allTimeTotal, 0);
  const lifetimeMaterialPending = materialParties.reduce((sum, p) => sum + getPartyFinancials(p, 'all').allTimePending, 0);

  const activeInMonthCount = useMemo(() => {
    return parties.filter((p) => getPartyFinancials(p, 'month').hasActivityInMonth).length;
  }, [parties, bills, purchases, payments, selectedMonth, selectedMonths]);

  return (
    <Box>
      {/* PAGE HEADER */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'center' },
          gap: { xs: 2, md: 0 },
          mb: 2.5,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap' }}>
            <Typography
              variant="h5"
              sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
            >
              {isGu ? 'પાર્ટી ડાયરેક્ટરી અને ખાતાવહી' : 'Party Directory (Textile & Material Parties)'}
            </Typography>

            {/* Active Month Indicator Chip */}
            <Chip
              icon={<CalendarIcon sx={{ fontSize: '15px !important', color: isAllMonthsSelected ? '#64748b' : '#2563eb' }} />}
              label={
                isAllMonthsSelected
                  ? isGu ? 'લાઈફટાઈમ / બધા મહિના' : 'All Months View'
                  : `${isGu ? 'મહિનાવાર:' : 'Month:'} ${activeMonthLabel}`
              }
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: '0.75rem',
                bgcolor: isAllMonthsSelected
                  ? mode === 'dark' ? '#1e293b' : '#f1f5f9'
                  : mode === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#eff6ff',
                color: isAllMonthsSelected
                  ? mode === 'dark' ? '#cbd5e1' : '#475569'
                  : mode === 'dark' ? '#93c5fd' : '#1d4ed8',
                border: '1px solid',
                borderColor: isAllMonthsSelected
                  ? mode === 'dark' ? '#334155' : '#cbd5e1'
                  : mode === 'dark' ? 'rgba(59, 130, 246, 0.4)' : '#bfdbfe',
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
            {isGu
              ? 'ટેક્સટાઇલ પાર્ટી (ગ્રાહક વેચાણ/બિલિંગ) • મટીરીયલ પાર્ટી (કાચો માલ ખરીદી) • મહિના મુજબ ચોક્કસ રકમ હિસાબ'
              : 'Textile Party (Customers / Sales) • Material Party (Suppliers / Raw Material) • Accurate Month-Wise Amount Tracking'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<PdfIcon />}
            onClick={() => {
              setStatementPartyId('ALL');
              setStatementModalOpen(true);
            }}
            sx={{
              py: 1.1,
              px: 2.2,
              fontWeight: 700,
              fontSize: '0.85rem',
              borderRadius: '8px',
              textTransform: 'none',
              bgcolor: mode === 'dark' ? '#111827' : '#ffffff',
              color: mode === 'dark' ? '#f8fafc' : '#0f172a',
              borderColor: mode === 'dark' ? '#334155' : '#cbd5e1',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              '&:hover': {
                bgcolor: mode === 'dark' ? 'rgba(37, 99, 235, 0.1)' : '#eff6ff',
                borderColor: '#2563eb',
              },
            }}
          >
            {isGu ? 'PDF સ્ટેટમેન્ટ' : 'PDF Statement'}
          </Button>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateForm}
            sx={{
              py: 1.1,
              px: 2.8,
              fontWeight: 700,
              bgcolor: '#1d4ed8',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              boxShadow: '0 2px 8px rgba(29, 78, 216, 0.35)',
              '&:hover': {
                bgcolor: '#1e40af',
                background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                boxShadow: '0 4px 14px rgba(29, 78, 216, 0.45)',
              },
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            {isGu ? '+ નવી પાર્ટી ઉમેરો' : '+ Add New Party'}
          </Button>
        </Box>
      </Box>

      {/* MONTH-WISE VIEW CONTROL STRIP */}
      <Card
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 2.5,
          borderRadius: 3,
          bgcolor: mode === 'dark' ? '#111827' : '#ffffff',
          border: `1px solid ${mode === 'dark' ? '#1e293b' : '#e2e8f0'}`,
          boxShadow: mode === 'dark' ? 'none' : '0 1px 4px rgba(15, 23, 42, 0.04)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'stretch', md: 'center' },
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          {/* Left: View Mode Toggle (Selected Month vs All-Time) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: mode === 'dark' ? '#94a3b8' : '#475569', mr: 0.5 }}>
              {isGu ? 'રકમ ડિસ્પ્લે મોડ:' : 'Amount View Mode:'}
            </Typography>

            <Chip
              icon={<CalendarIcon sx={{ fontSize: '16px !important' }} />}
              label={
                isGu
                  ? `મહિનાવાર રકમ (${activeMonthLabel})`
                  : `Month-Wise Amount (${activeMonthLabel})`
              }
              clickable
              onClick={() => {
                setViewScope('month');
                if (selectedMonth === 'ALL') {
                  setSelectedMonth(currentMonth);
                }
              }}
              sx={{
                fontWeight: 700,
                fontSize: '0.78rem',
                py: 2,
                px: 0.5,
                borderRadius: 2,
                bgcolor:
                  viewScope === 'month' && !isAllMonthsSelected
                    ? mode === 'dark' ? '#1e3a8a' : '#eff6ff'
                    : mode === 'dark' ? '#1e293b' : '#f8fafc',
                color:
                  viewScope === 'month' && !isAllMonthsSelected
                    ? mode === 'dark' ? '#93c5fd' : '#1d4ed8'
                    : mode === 'dark' ? '#94a3b8' : '#64748b',
                border: '1.5px solid',
                borderColor:
                  viewScope === 'month' && !isAllMonthsSelected
                    ? mode === 'dark' ? '#3b82f6' : '#2563eb'
                    : mode === 'dark' ? '#334155' : '#cbd5e1',
                '&:hover': {
                  bgcolor: mode === 'dark' ? '#1e3a8a' : '#dbeafe',
                },
              }}
            />

            <Chip
              icon={<AllIcon sx={{ fontSize: '16px !important' }} />}
              label={isGu ? 'બધા મહિના / લાઈફટાઈમ (All Time)' : 'All-Time / Lifetime'}
              clickable
              onClick={() => {
                setViewScope('all');
                setSelectedMonth('ALL');
              }}
              sx={{
                fontWeight: 700,
                fontSize: '0.78rem',
                py: 2,
                px: 0.5,
                borderRadius: 2,
                bgcolor:
                  isAllMonthsSelected
                    ? mode === 'dark' ? '#312e81' : '#e0e7ff'
                    : mode === 'dark' ? '#1e293b' : '#f8fafc',
                color:
                  isAllMonthsSelected
                    ? mode === 'dark' ? '#c7d2fe' : '#4338ca'
                    : mode === 'dark' ? '#94a3b8' : '#64748b',
                border: '1.5px solid',
                borderColor:
                  isAllMonthsSelected
                    ? mode === 'dark' ? '#6366f1' : '#4f46e5'
                    : mode === 'dark' ? '#334155' : '#cbd5e1',
                '&:hover': {
                  bgcolor: mode === 'dark' ? '#312e81' : '#c7d2fe',
                },
              }}
            />

            {/* Quick Button to Current Month */}
            <Button
              size="small"
              variant="text"
              onClick={() => {
                setViewScope('month');
                selectCurrentMonth();
              }}
              sx={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'none',
                color: '#2563eb',
                '&:hover': { bgcolor: mode === 'dark' ? 'rgba(37,99,235,0.1)' : '#eff6ff' },
              }}
            >
              {isGu ? '⚡ ચાલુ મહિનો' : '⚡ Current Month'}
            </Button>
          </Box>

          {/* Right: Embedded Month Picker Dropdown & Active Filter */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Box sx={{ minWidth: { xs: '100%', sm: 220 } }}>
              <MonthMultiSelectDropdown
                label={isGu ? 'મહિનો બદલો / ફિલ્ટર' : 'Change Month'}
                monthRecordCounts={monthRecordCounts}
                onFilterChange={() => {
                  setViewScope('month');
                  setPage(0);
                }}
              />
            </Box>

            {!isAllMonthsSelected && (
              <Chip
                icon={<FilterListIcon sx={{ fontSize: '15px !important' }} />}
                label={
                  onlyActiveInMonth
                    ? (isGu ? `ફક્ત એક્ટિવ પાર્ટી (${activeInMonthCount})` : `Active Only (${activeInMonthCount})`)
                    : (isGu ? 'બધી પાર્ટીઓ બતાવો' : 'Show All Parties')
                }
                clickable
                onClick={() => setOnlyActiveInMonth(!onlyActiveInMonth)}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  borderRadius: 2,
                  bgcolor: onlyActiveInMonth
                    ? mode === 'dark' ? '#064e3b' : '#ecfdf5'
                    : mode === 'dark' ? '#1e293b' : '#f8fafc',
                  color: onlyActiveInMonth
                    ? mode === 'dark' ? '#6ee7b7' : '#059669'
                    : mode === 'dark' ? '#94a3b8' : '#64748b',
                  border: '1px solid',
                  borderColor: onlyActiveInMonth
                    ? mode === 'dark' ? '#059669' : '#10b981'
                    : mode === 'dark' ? '#334155' : '#cbd5e1',
                }}
              />
            )}

            <Button
              variant="outlined"
              size="small"
              startIcon={<PdfIcon sx={{ fontSize: 16 }} />}
              onClick={() => {
                setStatementPartyId('ALL');
                setStatementModalOpen(true);
              }}
              sx={{
                fontWeight: 700,
                fontSize: '0.75rem',
                borderRadius: 2,
                textTransform: 'none',
                py: 0.7,
                px: 1.5,
                bgcolor: mode === 'dark' ? 'rgba(30, 58, 138, 0.2)' : '#eff6ff',
                color: mode === 'dark' ? '#93c5fd' : '#1e40af',
                borderColor: mode === 'dark' ? '#1e40af' : '#bfdbfe',
                '&:hover': {
                  bgcolor: mode === 'dark' ? 'rgba(30, 58, 138, 0.4)' : '#dbeafe',
                  borderColor: '#2563eb',
                },
              }}
            >
              {isGu ? '📄 સ્ટેટમેન્ટ PDF' : '📄 Statement PDF'}
            </Button>
          </Box>
        </Box>
      </Card>

      {/* SUMMARY STATS CARDS (Accurately reflecting Selected Month or All-Time) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 3 }}>
        {[
          {
            title: isGu ? 'ટેક્સટાઇલ સેલ્સ બિલિંગ' : 'TEXTILE BILLING TOTAL',
            value: formatRupees(totalTextileSales),
            subtext: isAllMonthsSelected
              ? (isGu ? 'કુલ ગ્રાહક વેચાણ બિલિંગ' : 'All-time customer billing')
              : (isGu ? `📅 ${activeMonthLabel} બિલિંગ રકમ` : `📅 ${activeMonthLabel} sales`),
            comparison: !isAllMonthsSelected ? `${isGu ? 'લાઈફટાઈમ:' : 'Lifetime:'} ${formatRupees(lifetimeTextileSales)}` : undefined,
            isDark: true,
            icon: <WalletIcon sx={{ fontSize: 18, color: '#38bdf8' }} />,
          },
          {
            title: isGu ? 'ટેક્સટાઇલ મળેલ રકમ' : 'TEXTILE RECEIVED',
            value: formatRupees(totalTextileReceived),
            subtext: isAllMonthsSelected
              ? (isGu ? 'જમા થયેલ ઉઘરાણી' : 'Total collected')
              : (isGu ? `📅 ${activeMonthLabel} જમા રકમ` : `📅 ${activeMonthLabel} collected`),
            isDark: false,
            icon: <MoneyIcon sx={{ fontSize: 18, color: '#2563eb' }} />,
            valueColor: mode === 'dark' ? '#60a5fa' : '#2563eb',
          },
          {
            title: isGu ? 'ટેક્સટાઇલ ગ્રાહક બાકી' : 'TEXTILE PENDING DUE',
            value: formatRupees(totalTextilePending),
            subtext: isAllMonthsSelected
              ? (isGu ? 'ગ્રાહક પાસે બાકી રકમ' : 'Customer outstanding')
              : (isGu ? `📅 ${activeMonthLabel} બાકી રકમ` : `📅 ${activeMonthLabel} outstanding`),
            isDark: false,
            icon: <PendingIcon sx={{ fontSize: 18, color: '#dc2626' }} />,
            valueColor: mode === 'dark' ? '#f87171' : '#dc2626',
          },
          {
            title: isGu ? 'મટીરીયલ સપ્લાયર બાકી' : 'SUPPLIER PENDING DUE',
            value: formatRupees(totalMaterialPending),
            subtext: isAllMonthsSelected
              ? (isGu ? 'સપ્લાયરને ચૂકવવાપાત્ર' : 'Payable to suppliers')
              : (isGu ? `📅 ${activeMonthLabel} ચૂકવવાપાત્ર` : `📅 ${activeMonthLabel} payable`),
            comparison: !isAllMonthsSelected ? `${isGu ? 'લાઈફટાઈમ:' : 'Lifetime:'} ${formatRupees(lifetimeMaterialPending)}` : undefined,
            isDark: false,
            icon: <WalletIcon sx={{ fontSize: 18, color: '#d97706' }} />,
            valueColor: mode === 'dark' ? '#facc15' : '#b45309',
          },
        ].map((card, idx) => (
          <Box
            key={idx}
            sx={{
              p: 2,
              borderRadius: '14px',
              bgcolor: card.isDark
                ? '#1e3a8a'
                : mode === 'dark' ? '#111827' : '#ffffff',
              border: `1px solid ${card.isDark ? '#2563eb' : mode === 'dark' ? '#1e293b' : '#e2e8f0'}`,
              boxShadow: card.isDark
                ? '0 4px 16px rgba(37, 99, 235, 0.25)'
                : mode === 'dark' ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(15, 23, 42, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: card.isDark
                  ? '0 6px 20px rgba(37, 99, 235, 0.38)'
                  : '0 6px 16px rgba(37, 99, 235, 0.08)',
              },
            }}
          >
            {/* Top Row: Title + Icon */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography
                sx={{
                  fontSize: '0.675rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: card.isDark ? '#93c5fd' : mode === 'dark' ? '#94a3b8' : '#64748b',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {card.title}
              </Typography>
              {card.icon}
            </Box>

            {/* Value */}
            <Typography
              sx={{
                fontSize: { xs: '1.05rem', sm: '1.14rem', xl: '1.24rem' },
                fontWeight: 800,
                color: card.valueColor
                  ? card.valueColor
                  : card.isDark ? '#ffffff' : mode === 'dark' ? '#f8fafc' : '#0f172a',
                lineHeight: 1.2,
                mb: 0.6,
                letterSpacing: '-0.02em',
              }}
            >
              {card.value}
            </Typography>

            {/* Subtext and Comparison */}
            <Box>
              <Typography
                sx={{
                  fontSize: '0.71rem',
                  color: card.isDark ? '#93c5fd' : mode === 'dark' ? '#94a3b8' : '#64748b',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {card.subtext}
              </Typography>
              {card.comparison && (
                <Typography
                  sx={{
                    fontSize: '0.675rem',
                    fontWeight: 600,
                    color: card.isDark ? '#bfdbfe' : mode === 'dark' ? '#cbd5e1' : '#475569',
                    mt: 0.2,
                  }}
                >
                  {card.comparison}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>

      {/* SEARCH AND FILTER BAR */}
      <Card sx={{ p: 2, mb: 3, border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', gap: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={
              isGu
                ? 'પાર્ટી નામ, વ્યક્તિનું નામ, મોબાઈલ અથવા જીએસટીIN શોધો...'
                : 'Search Party Name, Person Name, Mobile or GSTIN...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1 }}
          />

          {/* CHIP BUTTONS FOR QUICK TYPE FILTER */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={isGu ? 'બધી પાર્ટીઓ' : 'All Parties'}
              onClick={() => setTypeFilter('All')}
              clickable
              sx={{
                fontWeight: 700,
                fontSize: '0.8rem',
                py: 2,
                px: 0.5,
                borderRadius: 2,
                cursor: 'pointer',
                bgcolor:
                  typeFilter === 'All'
                    ? mode === 'dark' ? '#334155' : '#e2e8f0'
                    : mode === 'dark' ? '#1e293b' : '#f8fafc',
                color:
                  typeFilter === 'All'
                    ? mode === 'dark' ? '#ffffff' : '#0f172a'
                    : mode === 'dark' ? '#94a3b8' : '#64748b',
                border: '1.5px solid',
                borderColor:
                  typeFilter === 'All'
                    ? mode === 'dark' ? '#64748b' : '#94a3b8'
                    : mode === 'dark' ? '#334155' : '#cbd5e1',
              }}
            />

            <Chip
              label={isGu ? 'ટેક્સટાઇલ પાર્ટી' : 'Textile Party'}
              onClick={() => setTypeFilter(typeFilter === 'Textile Party' ? 'All' : 'Textile Party')}
              clickable
              sx={{
                fontWeight: 700,
                fontSize: '0.8rem',
                py: 2,
                px: 0.5,
                borderRadius: 2,
                cursor: 'pointer',
                bgcolor:
                  typeFilter === 'Textile Party'
                    ? mode === 'dark' ? '#312e81' : '#e0e7ff'
                    : mode === 'dark' ? '#1e293b' : '#f8fafc',
                color:
                  typeFilter === 'Textile Party'
                    ? mode === 'dark' ? '#c7d2fe' : '#4338ca'
                    : mode === 'dark' ? '#94a3b8' : '#64748b',
                border: '1.5px solid',
                borderColor:
                  typeFilter === 'Textile Party'
                    ? mode === 'dark' ? '#818cf8' : '#4f46e5'
                    : mode === 'dark' ? '#334155' : '#cbd5e1',
                '&:hover': {
                  bgcolor: mode === 'dark' ? '#312e81' : '#e0e7ff',
                },
              }}
            />
            <Chip
              label={isGu ? 'મટીરીયલ પાર્ટી' : 'Material Party'}
              onClick={() => setTypeFilter(typeFilter === 'Material Party' ? 'All' : 'Material Party')}
              clickable
              sx={{
                fontWeight: 700,
                fontSize: '0.8rem',
                py: 2,
                px: 0.5,
                borderRadius: 2,
                cursor: 'pointer',
                bgcolor:
                  typeFilter === 'Material Party'
                    ? mode === 'dark' ? '#78350f' : '#fef3c7'
                    : mode === 'dark' ? '#1e293b' : '#f8fafc',
                color:
                  typeFilter === 'Material Party'
                    ? mode === 'dark' ? '#fde68a' : '#b45309'
                    : mode === 'dark' ? '#94a3b8' : '#64748b',
                border: '1.5px solid',
                borderColor:
                  typeFilter === 'Material Party'
                    ? mode === 'dark' ? '#facc15' : '#d97706'
                    : mode === 'dark' ? '#334155' : '#cbd5e1',
                '&:hover': {
                  bgcolor: mode === 'dark' ? '#78350f' : '#fef3c7',
                },
              }}
            />
          </Box>

          <TextField
            select
            size="small"
            label={isGu ? 'પાર્ટી પ્રકાર' : 'Party Type'}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            sx={{ minWidth: { xs: '100%', sm: 160 } }}
          >
            <MenuItem value="All">{isGu ? 'બધી પાર્ટીઓ' : 'All Parties'}</MenuItem>
            <MenuItem value="Textile Party">{isGu ? 'ટેક્સટાઇલ પાર્ટી' : 'Textile Party'}</MenuItem>
            <MenuItem value="Material Party">{isGu ? 'મટીરીયલ પાર્ટી' : 'Material Party'}</MenuItem>
          </TextField>
        </Box>
      </Card>

      {/* PARTIES TABLE */}
      <Card
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
          boxShadow: mode === 'dark' ? 'none' : '0 4px 12px rgba(0,0,0,0.03)',
        }}
      >
        <TableContainer>
          <Table sx={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: mode === 'dark' ? '#0f172a' : '#f8fafc' }}>
                <TableCell
                  onClick={() => handleSort('createdAt')}
                  sx={{
                    color: sortKey === 'createdAt' ? '#6366f1' : mode === 'dark' ? '#94a3b8' : '#64748b',
                    fontWeight: sortKey === 'createdAt' ? 800 : 700,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    py: 1.5,
                    px: 2,
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { color: '#6366f1' },
                  }}
                >
                  {isGu ? 'તારીખ' : 'DATE'} {getSortIcon('createdAt')}
                </TableCell>
                <TableCell
                  onClick={() => handleSort('name')}
                  sx={{
                    color: sortKey === 'name' ? '#6366f1' : mode === 'dark' ? '#94a3b8' : '#64748b',
                    fontWeight: sortKey === 'name' ? 800 : 700,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    py: 1.5,
                    px: 2,
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { color: '#6366f1' },
                  }}
                >
                  {isGu ? 'પાર્ટી નામ' : 'PARTY NAME'} {getSortIcon('name')}
                </TableCell>
                <TableCell
                  sx={{
                    color: mode === 'dark' ? '#94a3b8' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    py: 1.5,
                    px: 2,
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isGu ? 'વ્યક્તિનું નામ' : 'NAME'}
                </TableCell>
                <TableCell
                  sx={{
                    color: mode === 'dark' ? '#94a3b8' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    py: 1.5,
                    px: 2,
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isGu ? 'પાર્ટી પ્રકાર' : 'PARTY TYPE'}
                </TableCell>

                {/* DYNAMIC TOTAL AMOUNT COLUMN (Month-Wise or All-Time) */}
                <TableCell
                  align="right"
                  onClick={() => handleSort('totalAmount')}
                  sx={{
                    color: sortKey === 'totalAmount' ? '#6366f1' : mode === 'dark' ? '#94a3b8' : '#64748b',
                    fontWeight: sortKey === 'totalAmount' ? 800 : 700,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    py: 1.5,
                    px: 2,
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    userSelect: 'none',
                    bgcolor: sortKey === 'totalAmount' ? (mode === 'dark' ? 'rgba(99,102,241,0.1)' : '#eef2ff') : 'transparent',
                    '&:hover': { color: '#6366f1' },
                  }}
                >
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                    <span>{isGu ? 'કુલ રકમ' : 'TOTAL AMOUNT'}</span>
                    {!isAllMonthsSelected && (
                      <Chip
                        label={activeMonthLabel}
                        size="small"
                        sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#dbeafe', color: '#1e40af' }}
                      />
                    )}
                    <span>{getSortIcon('totalAmount')}</span>
                  </Box>
                </TableCell>

                {/* DYNAMIC PENDING AMOUNT COLUMN */}
                <TableCell
                  align="right"
                  onClick={() => handleSort('pendingAmount')}
                  sx={{
                    color: sortKey === 'pendingAmount' ? '#6366f1' : mode === 'dark' ? '#94a3b8' : '#64748b',
                    fontWeight: sortKey === 'pendingAmount' ? 800 : 700,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    py: 1.5,
                    px: 2,
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    userSelect: 'none',
                    bgcolor: sortKey === 'pendingAmount' ? (mode === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2') : 'transparent',
                    '&:hover': { color: '#6366f1' },
                  }}
                >
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                    <span>{isGu ? 'બાકી રકમ' : 'PENDING AMOUNT'}</span>
                    <span>{getSortIcon('pendingAmount')}</span>
                  </Box>
                </TableCell>

                {/* DYNAMIC RECEIVED / PAID AMOUNT */}
                <TableCell
                  align="right"
                  sx={{
                    color: mode === 'dark' ? '#94a3b8' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    py: 1.5,
                    px: 2,
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isGu ? 'મળેલ / ચૂકવેલ' : 'RECEIVED / PAID'}
                </TableCell>

                <TableCell
                  sx={{
                    color: mode === 'dark' ? '#94a3b8' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    py: 1.5,
                    px: 2,
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isGu ? 'જીએસટી નંબર' : 'GSTIN NUMBER'}
                </TableCell>
                <TableCell
                  sx={{
                    color: mode === 'dark' ? '#94a3b8' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    py: 1.5,
                    px: 2,
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isGu ? 'સરનામું / શહેર' : 'CITY / ADDRESS'}
                </TableCell>
                <TableCell
                  sx={{
                    color: mode === 'dark' ? '#94a3b8' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    py: 1.5,
                    px: 2,
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    whiteSpace: 'nowrap',
                  }}
                  align="center"
                >
                  {isGu ? 'એક્શન' : 'ACTIONS'}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedParties.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 5, color: mode === 'dark' ? '#94a3b8' : '#64748b' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontWeight: 600 }}>
                        {isGu ? 'કોઈ પાર્ટી મળી નથી' : 'No parties found'}
                      </Typography>
                      {onlyActiveInMonth && !isAllMonthsSelected && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setOnlyActiveInMonth(false)}
                          sx={{ mt: 1, textTransform: 'none' }}
                        >
                          {isGu ? 'બધી પાર્ટીઓ જુઓ (Show All)' : 'Show All Parties'}
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                sortedParties
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((p) => {
                    const rawType = p.type as string;
                    const isMaterial = rawType === 'Material Party' || rawType === 'Supplier';
                    const typeLabel = isMaterial
                      ? isGu ? 'મટીરીયલ પાર્ટી' : 'Material Party'
                      : isGu ? 'ટેક્સટાઇલ પાર્ટી' : 'Textile Party';

                    const fin = getPartyFinancials(p);

                    return (
                      <TableRow
                        key={p.id}
                        sx={{
                          transition: 'background-color 0.12s ease',
                          '&:hover': { bgcolor: mode === 'dark' ? '#1e293b' : '#f8fafc' },
                        }}
                      >
                        <TableCell sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`, color: mode === 'dark' ? '#cbd5e1' : '#475569', fontSize: '0.825rem', whiteSpace: 'nowrap' }}>
                          {formatDate(p.createdAt || (p as any).date || '2026-01-15')}
                        </TableCell>
                        <TableCell sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`, whiteSpace: 'nowrap' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                bgcolor: isMaterial
                                  ? mode === 'dark' ? '#78350f' : '#fef3c7'
                                  : mode === 'dark' ? '#312e81' : '#e0e7ff',
                                color: isMaterial
                                  ? mode === 'dark' ? '#fde68a' : '#b45309'
                                  : mode === 'dark' ? '#c7d2fe' : '#4338ca',
                              }}
                            >
                              {p.name ? p.name.charAt(0) : 'P'}
                            </Avatar>
                            <Box>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: mode === 'dark' ? '#f8fafc' : '#0f172a' }}>
                                {p.name}
                              </Typography>
                              {!isAllMonthsSelected && fin.hasActivityInMonth && (
                                <Typography sx={{ fontSize: '0.675rem', color: '#2563eb', fontWeight: 600 }}>
                                  {fin.monthTransactionsCount} {isMaterial ? (isGu ? 'ખરીદી આ મહિને' : 'Purchases in month') : (isGu ? 'બિલ આ મહિને' : 'Bills in month')}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`, color: mode === 'dark' ? '#cbd5e1' : '#334155', fontWeight: 500, fontSize: '0.85rem' }}>
                          {p.contactPerson || '-'}
                        </TableCell>
                        <TableCell sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}` }}>
                          <Chip
                            label={typeLabel}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              height: 24,
                              fontSize: '0.72rem',
                              px: 0.8,
                              borderRadius: 2,
                              bgcolor: isMaterial
                                ? mode === 'dark' ? 'rgba(245,158,11,0.15)' : '#fffbeb'
                                : mode === 'dark' ? 'rgba(99,102,241,0.15)' : '#eef2ff',
                              color: isMaterial
                                ? mode === 'dark' ? '#facc15' : '#b45309'
                                : mode === 'dark' ? '#a5b4fc' : '#4338ca',
                              border: '1px solid',
                              borderColor: isMaterial
                                ? mode === 'dark' ? 'rgba(245,158,11,0.3)' : '#fde68a'
                                : mode === 'dark' ? 'rgba(99,102,241,0.3)' : '#c7d2fe',
                            }}
                          />
                        </TableCell>

                        {/* FINANCIAL SUMMARY COLUMNS (Accurately showing month vs lifetime) */}
                        <TableCell align="right" sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`, whiteSpace: 'nowrap' }}>
                          <Typography
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.875rem',
                              color: !isAllMonthsSelected && !fin.hasActivityInMonth
                                ? mode === 'dark' ? '#64748b' : '#94a3b8'
                                : mode === 'dark' ? '#f8fafc' : '#0f172a',
                            }}
                          >
                            {formatRupees(fin.totalAmount)}
                          </Typography>
                          {!isAllMonthsSelected && (
                            <Typography sx={{ fontSize: '0.675rem', color: mode === 'dark' ? '#94a3b8' : '#64748b' }}>
                              {isGu ? 'લાઈફટાઈમ:' : 'All-time:'} {formatRupees(fin.allTimeTotal)}
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell align="right" sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`, whiteSpace: 'nowrap' }}>
                          <Chip
                            label={formatRupees(fin.pendingAmount)}
                            size="small"
                            sx={{
                              fontWeight: 800,
                              height: 24,
                              fontSize: '0.75rem',
                              borderRadius: 1.5,
                              bgcolor: fin.pendingAmount > 0
                                ? mode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2'
                                : mode === 'dark' ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4',
                              color: fin.pendingAmount > 0
                                ? mode === 'dark' ? '#f87171' : '#dc2626'
                                : mode === 'dark' ? '#4ade80' : '#16a34a',
                              border: '1px solid',
                              borderColor: fin.pendingAmount > 0
                                ? mode === 'dark' ? 'rgba(239, 68, 68, 0.3)' : '#fecaca'
                                : mode === 'dark' ? 'rgba(34, 197, 94, 0.3)' : '#bbf7d0',
                            }}
                          />
                          {!isAllMonthsSelected && fin.allTimePending !== fin.pendingAmount && (
                            <Typography sx={{ fontSize: '0.675rem', color: '#dc2626', fontWeight: 600, mt: 0.2 }}>
                              {isGu ? 'કુલ બાકી:' : 'Total Due:'} {formatRupees(fin.allTimePending)}
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell align="right" sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`, whiteSpace: 'nowrap' }}>
                          <Typography
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              color: isMaterial
                                ? mode === 'dark' ? '#f87171' : '#dc2626'
                                : mode === 'dark' ? '#4ade80' : '#16a34a',
                            }}
                          >
                            {formatRupees(fin.paidReceivedAmount)}
                          </Typography>
                        </TableCell>

                        <TableCell sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`, color: mode === 'dark' ? '#cbd5e1' : '#475569', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.825rem' }}>
                          {p.gstin || '-'}
                        </TableCell>
                        <TableCell sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`, color: mode === 'dark' ? '#cbd5e1' : '#475569', fontSize: '0.85rem' }}>
                          {p.address || '-'}
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}` }}>
                          <Box sx={{ display: 'inline-flex', gap: 1, alignItems: 'center' }}>
                            <Tooltip title={isGu ? 'પાર્ટી વિગતો અને મહિનાવાર હિસાબ જુઓ' : 'View Party & Month Details'}>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setViewParty(p);
                                  setViewPartyTab(isAllMonthsSelected ? 'all' : 'month');
                                }}
                                sx={{
                                  border: '1px solid',
                                  borderColor: mode === 'dark' ? '#334155' : '#e2e8f0',
                                  borderRadius: 2,
                                  bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
                                  color: mode === 'dark' ? '#a5b4fc' : '#4f46e5',
                                  p: '5px',
                                  '&:hover': {
                                    bgcolor: mode === 'dark' ? '#334155' : '#eef2ff',
                                  },
                                }}
                              >
                                <ViewIcon sx={{ fontSize: '15px' }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={isGu ? 'ખાતાવહી સ્ટેટમેન્ટ ડાઉનલોડ (PDF / પ્રિન્ટ)' : 'Party Ledger Statement (PDF / Print)'}>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setStatementPartyId(p.id);
                                  setStatementModalOpen(true);
                                }}
                                sx={{
                                  border: '1px solid',
                                  borderColor: mode === 'dark' ? '#1e40af' : '#bfdbfe',
                                  borderRadius: 2,
                                  bgcolor: mode === 'dark' ? 'rgba(30,58,138,0.2)' : '#eff6ff',
                                  color: mode === 'dark' ? '#93c5fd' : '#1e40af',
                                  p: '5px',
                                  '&:hover': {
                                    bgcolor: mode === 'dark' ? 'rgba(30,58,138,0.4)' : '#dbeafe',
                                  },
                                }}
                              >
                                <StatementIcon sx={{ fontSize: '15px' }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Party">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenEditForm(p)}
                                sx={{
                                  border: '1px solid',
                                  borderColor: mode === 'dark' ? '#334155' : '#e2e8f0',
                                  borderRadius: 2,
                                  bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
                                  color: mode === 'dark' ? '#38bdf8' : '#0284c7',
                                  p: '5px',
                                  '&:hover': {
                                    bgcolor: mode === 'dark' ? '#334155' : '#f0f9ff',
                                  },
                                }}
                              >
                                <EditIcon sx={{ fontSize: '15px' }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Party">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setPartyToDelete(p.id);
                                  setDeleteOpen(true);
                                }}
                                sx={{
                                  border: '1px solid',
                                  borderColor: mode === 'dark' ? '#334155' : '#e2e8f0',
                                  borderRadius: 2,
                                  bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
                                  color: mode === 'dark' ? '#f87171' : '#dc2626',
                                  p: '5px',
                                  '&:hover': {
                                    bgcolor: mode === 'dark' ? '#334155' : '#fef2f2',
                                  },
                                }}
                              >
                                <DeleteIcon sx={{ fontSize: '15px' }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={sortedParties.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage={isGu ? 'પેજ દીઠ લાઇનો:' : 'Rows per page:'}
          labelDisplayedRows={({ from, to, count }) =>
            isGu
              ? `${count !== -1 ? count : `કરતાં વધુ ${to}`} માંથી ${from}-${to}`
              : `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
          }
        />
      </Card>

      {/* CREATE / EDIT PARTY MODAL */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: '#0f172a', color: '#fff' }}>
          {selectedParty ? `Edit Party (${formData.name})` : 'Add New Party Details'}
        </DialogTitle>
        <Box component="form" onSubmit={handleSaveParty}>
          <DialogContent sx={{ p: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
              <TextField fullWidth label="Party Name" placeholder="Firm / Company Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              <TextField fullWidth label="Name" placeholder="Contact Person Name" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                type="date"
                label="Date / Registration Date"
                InputLabelProps={{ shrink: true }}
                value={formData.createdAt}
                onChange={(e) => setFormData({ ...formData, createdAt: e.target.value })}
              />
              <TextField select fullWidth label="Party Type" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                <MenuItem value="Textile Party">{isGu ? 'ટેક્સટાઇલ પાર્ટી (Textile Party)' : 'Textile Party (Customer / Buyer)'}</MenuItem>
                <MenuItem value="Material Party">{isGu ? 'મટીરીયલ પાર્ટી (Material Party)' : 'Material Party (Supplier / Vendor)'}</MenuItem>
              </TextField>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
              <TextField fullWidth label="Mobile Number" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} />
              <TextField fullWidth label="GSTIN Number" value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value })} />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
              <TextField fullWidth label="Opening Balance (₹)" type="number" value={formData.openingBalance} onChange={(e) => setFormData({ ...formData, openingBalance: Number(e.target.value) })} />
              <TextField fullWidth multiline rows={1} label="Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setFormOpen(false)} variant="outlined">Cancel</Button>
            <Button type="submit" variant="contained" color="primary" sx={{ fontWeight: 700 }}>Save Party</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* VIEW PARTY DETAILS & MONTH-WISE BREAKDOWN MODAL */}
      <Dialog open={Boolean(viewParty)} onClose={() => setViewParty(null)} maxWidth="md" fullWidth>
        {viewParty && (() => {
          const finMonth = getPartyFinancials(viewParty, 'month');
          const finAll = getPartyFinancials(viewParty, 'all');
          const fin = viewPartyTab === 'month' && !isAllMonthsSelected ? finMonth : finAll;
          const displayBills = viewPartyTab === 'month' && !isAllMonthsSelected ? finMonth.monthBills : finAll.allBills;
          const displayPayments = viewPartyTab === 'month' && !isAllMonthsSelected ? finMonth.monthPayments : finAll.allPayments;

          return (
            <>
              <DialogTitle
                sx={{
                  fontWeight: 800,
                  bgcolor: '#0f172a',
                  color: '#fff',
                  py: 2,
                  px: 3,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.15rem', color: '#fff' }}>
                    🏢 {viewParty.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                    {viewParty.type === 'Material Party' || (viewParty.type as string) === 'Supplier'
                      ? isGu ? 'મટીરીયલ સપ્લાયર (કાચો માલ ખરીદી ખાતાવહી)' : 'Material Supplier / Raw Material Vendor'
                      : isGu ? 'ટેક્સટાઇલ ગ્રાહક (કાપડ વેચાણ / બિલિંગ ખાતાવહી)' : 'Textile Customer / Fabric Sales Party'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<PdfIcon sx={{ fontSize: 16 }} />}
                    onClick={() => {
                      setStatementPartyId(viewParty.id);
                      setStatementModalOpen(true);
                    }}
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      borderRadius: 2,
                      textTransform: 'none',
                      color: '#ffffff',
                      borderColor: 'rgba(255,255,255,0.4)',
                      bgcolor: 'rgba(255,255,255,0.1)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', borderColor: '#ffffff' },
                    }}
                  >
                    {isGu ? 'સ્ટેટમેન્ટ PDF' : 'Statement PDF'}
                  </Button>
                  <Chip
                    label={viewParty.type || 'Textile Party'}
                    size="small"
                    sx={{
                      fontWeight: 800,
                      bgcolor: fin.isMaterial ? '#b45309' : '#2563eb',
                      color: '#fff',
                    }}
                  />
                </Box>
              </DialogTitle>

              {/* View Scope Tabs Inside Modal */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 1.5, bgcolor: mode === 'dark' ? '#1e293b' : '#f8fafc' }}>
                <Tabs
                  value={viewPartyTab}
                  onChange={(_, val) => setViewPartyTab(val)}
                  textColor="primary"
                  indicatorColor="primary"
                >
                  <Tab
                    value="month"
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <CalendarIcon sx={{ fontSize: 16 }} />
                        <span>
                          {isGu ? `મહિનાવાર હિસાબ (${activeMonthLabel})` : `This Month (${activeMonthLabel})`}
                        </span>
                      </Box>
                    }
                    sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.85rem' }}
                  />
                  <Tab
                    value="all"
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <AllIcon sx={{ fontSize: 16 }} />
                        <span>{isGu ? 'કુલ લાઈફટાઈમ હિસાબ (All Time)' : 'All-Time Lifetime History'}</span>
                      </Box>
                    }
                    sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.85rem' }}
                  />
                </Tabs>
              </Box>

              <DialogContent sx={{ p: 3, bgcolor: mode === 'dark' ? '#0f172a' : '#f8fafc' }}>
                {/* FINANCIAL METRICS SUMMARY CARDS */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5, mb: 2.5 }}>
                  <Card
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
                      border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.7rem', display: 'block' }}>
                      {viewPartyTab === 'month' && !isAllMonthsSelected
                        ? (isGu ? `મહિનાનું કુલ બિલિંગ (${activeMonthLabel})` : `THIS MONTH TOTAL (${activeMonthLabel})`)
                        : (isGu ? 'કુલ લાઈફટાઈમ બિલિંગ' : 'ALL-TIME TOTAL AMOUNT')}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: mode === 'dark' ? '#f8fafc' : '#0f172a', mt: 0.5 }}>
                      {formatRupees(fin.totalAmount)}
                    </Typography>
                  </Card>

                  <Card
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
                      border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.7rem', display: 'block' }}>
                      {isGu ? 'બાકી રકમ' : 'PENDING BALANCE'}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: fin.pendingAmount > 0 ? '#dc2626' : '#16a34a', mt: 0.5 }}>
                      {formatRupees(fin.pendingAmount)}
                    </Typography>
                  </Card>

                  <Card
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
                      border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.7rem', display: 'block' }}>
                      {isGu ? 'મળેલ / ચૂકવેલ' : 'RECEIVED / PAID'}
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 800,
                        color: fin.isMaterial
                          ? mode === 'dark' ? '#f87171' : '#dc2626'
                          : mode === 'dark' ? '#4ade80' : '#16a34a',
                        mt: 0.5,
                      }}
                    >
                      {formatRupees(fin.paidReceivedAmount)}
                    </Typography>
                  </Card>
                </Box>

                {/* TRANSACTION HISTORY TABLE */}
                <Card sx={{ p: 2, mb: 2.5, bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    {fin.isMaterial ? <PurchaseIcon sx={{ fontSize: 18 }} /> : <InvoiceIcon sx={{ fontSize: 18 }} />}
                    <span>
                      {fin.isMaterial
                        ? isGu ? `ખરીદી ઇન્વોઇસ યાદી (${displayBills.length})` : `Material Purchase Invoices (${displayBills.length})`
                        : isGu ? `વેચાણ બિલિંગ ઇન્વોઇસ યાદી (${displayBills.length})` : `Sales Invoices / Challans (${displayBills.length})`}
                    </span>
                  </Typography>

                  {displayBills.length === 0 ? (
                    <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
                      <Typography variant="body2">
                        {isGu
                          ? `${activeMonthLabel} માં કોઈ ટ્રાન્ઝેક્શન થયેલ નથી.`
                          : `No transactions found for ${activeMonthLabel}.`}
                      </Typography>
                    </Box>
                  ) : (
                    <TableContainer sx={{ maxHeight: 220 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>{isGu ? 'તારીખ' : 'DATE'}</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>{isGu ? 'બિલ/ચલણ નં.' : 'REF NO'}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>{isGu ? 'કુલ રકમ' : 'TOTAL'}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>{isGu ? 'ચૂકવેલ' : 'PAID'}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>{isGu ? 'બાકી' : 'PENDING'}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>{isGu ? 'સ્ટેટસ' : 'STATUS'}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {displayBills.map((item: any, idx: number) => {
                            const dateVal = item.date || item.invoiceDate || item.createdAt;
                            const refNo = item.invoiceNo || item.purchaseNo || item.challanNo || `Tx-${idx + 1}`;
                            const tot = Number(item.totalAmount) || 0;
                            const pd = Number(item.paidAmount) || 0;
                            const pend = Number(item.pendingAmount) !== undefined ? Number(item.pendingAmount) : Math.max(0, tot - pd);
                            const stat = item.status || (pend <= 0 ? 'Paid' : pd > 0 ? 'Partial' : 'Pending');

                            return (
                              <TableRow key={item.id || idx}>
                                <TableCell sx={{ fontSize: '0.75rem' }}>{formatDate(dateVal)}</TableCell>
                                <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace' }}>{refNo}</TableCell>
                                <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 700 }}>{formatRupees(tot)}</TableCell>
                                <TableCell align="right" sx={{ fontSize: '0.75rem', color: '#16a34a' }}>{formatRupees(pd)}</TableCell>
                                <TableCell align="right" sx={{ fontSize: '0.75rem', color: pend > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>{formatRupees(pend)}</TableCell>
                                <TableCell align="center">
                                  <Chip
                                    label={stat}
                                    size="small"
                                    sx={{
                                      height: 18,
                                      fontSize: '0.65rem',
                                      fontWeight: 700,
                                      bgcolor: stat === 'Paid' ? '#dcfce7' : stat === 'Partial' ? '#fef3c7' : '#fee2e2',
                                      color: stat === 'Paid' ? '#15803d' : stat === 'Partial' ? '#b45309' : '#b91c1c',
                                    }}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Card>

                {/* PAYMENTS RECORDED */}
                {displayPayments.length > 0 && (
                  <Card sx={{ p: 2, mb: 2.5, bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PaymentIcon sx={{ fontSize: 18, color: '#16a34a' }} />
                      <span>{isGu ? `ચુકવણી વ્યવહારો (${displayPayments.length})` : `Recorded Payment Entries (${displayPayments.length})`}</span>
                    </Typography>
                    <TableContainer sx={{ maxHeight: 180 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>{isGu ? 'તારીખ' : 'DATE'}</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>{isGu ? 'પ્રકાર' : 'TYPE'}</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>{isGu ? 'માધ્યમ' : 'METHOD'}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>{isGu ? 'રકમ' : 'AMOUNT'}</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>{isGu ? 'નોંધ' : 'NOTES'}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {displayPayments.map((pay: Payment, pIdx: number) => (
                            <TableRow key={pay.id || pIdx}>
                              <TableCell sx={{ fontSize: '0.75rem' }}>{formatDate(pay.date)}</TableCell>
                              <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700 }}>{pay.type}</TableCell>
                              <TableCell sx={{ fontSize: '0.75rem' }}>{pay.paymentMethod}</TableCell>
                              <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 800, color: pay.type === 'Received' ? '#16a34a' : '#2563eb' }}>
                                {formatRupees(pay.amount)}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.75rem' }}>{pay.notes || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>
                )}

                {/* PARTY CONTACT AND FIRM DETAILS */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, my: 1 }}>
                  <Card sx={{ p: 2, bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      {isGu ? 'સંપર્ક વ્યક્તિ' : 'Contact Person'}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.5 }}>
                      👤 {viewParty.contactPerson || '-'}
                    </Typography>
                  </Card>
                  <Card sx={{ p: 2, bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      {isGu ? 'મોબાઈલ નંબર' : 'Mobile Number'}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.5, color: '#4f46e5' }}>
                      📱 {viewParty.mobile || '-'}
                    </Typography>
                  </Card>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                  <Card sx={{ p: 2, bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      {isGu ? 'જીએસટી નંબર' : 'GSTIN Number'}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 0.5, fontFamily: 'monospace' }}>
                      🆔 {viewParty.gstin || 'URP (Unregistered)'}
                    </Typography>
                  </Card>
                  <Card sx={{ p: 2, bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      {isGu ? 'નોંધણી તારીખ' : 'Registration Date'}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 0.5 }}>
                      📅 {formatDate(viewParty.createdAt || (viewParty as any).date || '2026-01-15')}
                    </Typography>
                  </Card>
                </Box>

                <Card sx={{ p: 2, bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {isGu ? 'સરનામું / મુકામ' : 'Full Address & City'}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                    📍 {viewParty.address || 'Surat, Gujarat'}
                  </Typography>
                </Card>
              </DialogContent>
              <DialogActions sx={{ p: 2, px: 3, bgcolor: mode === 'dark' ? '#0f172a' : '#f8fafc', borderTop: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button
                  onClick={() => {
                    setStatementPartyId(viewParty.id);
                    setStatementModalOpen(true);
                  }}
                  variant="contained"
                  startIcon={<PdfIcon />}
                  sx={{
                    fontWeight: 700,
                    px: 2.5,
                    bgcolor: '#1e40af',
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#1e3a8a' },
                  }}
                >
                  {isGu ? 'પાર્ટી ખાતાવહી સ્ટેટમેન્ટ ડાઉનલોડ (A4 PDF)' : 'Download Party Statement (A4 PDF)'}
                </Button>
                <Button onClick={() => setViewParty(null)} variant="outlined" sx={{ fontWeight: 700, px: 3, textTransform: 'none' }}>
                  {isGu ? 'બંધ કરો (Close)' : 'Close'}
                </Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>

      <ConfirmationDialog
        open={deleteOpen}
        title="Delete Party Contact?"
        message="Are you sure you want to delete this party from contacts?"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteOpen(false)}
      />

      {/* PARTY STATEMENT MODAL (A4 Landscape Print & PDF) */}
      <PartyStatementModal
        open={statementModalOpen}
        onClose={() => setStatementModalOpen(false)}
        parties={parties}
        bills={bills}
        purchases={purchases}
        payments={payments}
        initialPartyId={statementPartyId}
        selectedMonth={selectedMonth}
        monthLabel={activeMonthLabel}
        settings={companySettings}
        language={language}
      />
    </Box>
  );
};
