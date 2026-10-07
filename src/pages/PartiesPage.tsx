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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ViewIcon from '@mui/icons-material/Visibility';
import WalletIcon from '@mui/icons-material/AccountBalanceWallet';
import MoneyIcon from '@mui/icons-material/MonetizationOn';
import PendingIcon from '@mui/icons-material/HourglassTop';
import { Party, Bill, Purchase } from '../types';
import { formatRupees, formatDate } from '../utils/formatters';
import { apiClient } from '../utils/api';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { useNotification } from '../context/NotificationContext';
import { useThemeContext } from '../context/ThemeContext';

export const PartiesPage: React.FC = () => {
  const [parties, setParties] = useState<Party[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('Textile Party');
  const [sortKey, setSortKey] = useState<'totalAmount' | 'pendingAmount' | 'createdAt' | 'name'>('totalAmount');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setPage(0);
  }, [search, typeFilter, sortKey, sortDirection]);

  const [formOpen, setFormOpen] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [viewParty, setViewParty] = useState<Party | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [partyToDelete, setPartyToDelete] = useState<string | null>(null);

  const { showNotification } = useNotification();
  const { mode, language } = useThemeContext();

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
      const [partyData, billData, purchaseData] = await Promise.all([
        apiClient.getParties(),
        apiClient.getBills(),
        apiClient.getPurchases(),
      ]);
      setParties(partyData || []);
      setBills(billData || []);
      setPurchases(purchaseData || []);
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
      type: (rawType === 'Supplier' || rawType === 'Material Party' ? 'Material Party' : 'Textile Party'),
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

  // Party Financial Calculations Helper
  const getPartyFinancials = (p: Party) => {
    const rawType = p.type as string;
    const isMaterial = rawType === 'Material Party' || rawType === 'Supplier';

    if (isMaterial) {
      const matchedPurchases = purchases.filter(
        (pur) => pur.supplierId === p.id || (p.name && pur.supplierName?.trim().toLowerCase() === p.name.trim().toLowerCase())
      );
      const computedTotal = matchedPurchases.reduce((acc, pur) => acc + (pur.totalAmount || 0), 0) + (p.openingBalance || 0);
      const computedPaid = matchedPurchases.reduce((acc, pur) => acc + (Number(pur.paidAmount) || 0), 0);
      
      const totalAmount = (p.totalAmount !== undefined && p.totalAmount !== null && p.totalAmount > 0)
        ? p.totalAmount
        : computedTotal;

      const paidReceivedAmount = (p.receivedAmount !== undefined && p.receivedAmount !== null && p.receivedAmount > 0)
        ? p.receivedAmount
        : computedPaid;

      const pendingAmount = (p.pendingAmount !== undefined && p.pendingAmount !== null)
        ? p.pendingAmount
        : Math.max(0, totalAmount - paidReceivedAmount);

      return { totalAmount, paidReceivedAmount, pendingAmount, isMaterial };
    } else {
      const matchedBills = bills.filter(
        (b) => b.partyId === p.id || (p.name && b.partyName?.trim().toLowerCase() === p.name.trim().toLowerCase())
      );
      const computedTotal = matchedBills.reduce((acc, b) => acc + (b.totalAmount || 0), 0) + (p.openingBalance || 0);
      const computedPaid = matchedBills.reduce((acc, b) => acc + (Number(b.paidAmount) || 0), 0);

      const totalAmount = (p.totalAmount !== undefined && p.totalAmount !== null && p.totalAmount > 0)
        ? p.totalAmount
        : computedTotal;

      const paidReceivedAmount = (p.receivedAmount !== undefined && p.receivedAmount !== null && p.receivedAmount > 0)
        ? p.receivedAmount
        : computedPaid;

      const pendingAmount = (p.pendingAmount !== undefined && p.pendingAmount !== null)
        ? p.pendingAmount
        : Math.max(0, totalAmount - paidReceivedAmount);

      return { totalAmount, paidReceivedAmount, pendingAmount, isMaterial };
    }
  };

  const filteredParties = parties.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.contactPerson && p.contactPerson.toLowerCase().includes(search.toLowerCase())) ||
      (p.mobile && p.mobile.includes(search)) ||
      (p.gstin && p.gstin.toLowerCase().includes(search.toLowerCase()));
    const rawType = p.type as string;
    const normalizedType = (rawType === 'Customer' || rawType === 'Market Party' || rawType === 'Textile Party')
      ? 'Textile Party'
      : 'Material Party';
    const matchesType = typeFilter === 'All' || normalizedType === typeFilter;
    return matchesSearch && matchesType;
  });

  const sortedParties = useMemo(() => {
    return [...filteredParties].sort((a, b) => {
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
  }, [filteredParties, sortKey, sortDirection, bills, purchases]);

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

  // Summary Totals
  const textileParties = parties.filter((p) => p.type !== 'Material Party' && (p.type as string) !== 'Supplier');
  const totalTextileSales = textileParties.reduce((sum, p) => sum + getPartyFinancials(p).totalAmount, 0);
  const totalTextileReceived = textileParties.reduce((sum, p) => sum + getPartyFinancials(p).paidReceivedAmount, 0);
  const totalTextilePending = textileParties.reduce((sum, p) => sum + getPartyFinancials(p).pendingAmount, 0);

  const materialParties = parties.filter((p) => p.type === 'Material Party' || (p.type as string) === 'Supplier');
  const totalMaterialPurchases = materialParties.reduce((sum, p) => sum + getPartyFinancials(p).totalAmount, 0);
  const totalMaterialPaid = materialParties.reduce((sum, p) => sum + getPartyFinancials(p).paidReceivedAmount, 0);
  const totalMaterialPending = materialParties.reduce((sum, p) => sum + getPartyFinancials(p).pendingAmount, 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 1.5, sm: 0 }, mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            {language === 'gu' ? 'પાર્ટી ડાયરેક્ટરી' : 'Party Directory (Textile & Material Parties)'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {language === 'gu'
              ? 'ટેક્સટાઇલ પાર્ટી (ગ્રાહક વેચાણ/બિલિંગ)  •  મટીરીયલ પાર્ટી (કાચો માલ ખરીદી)'
              : 'Textile Party (Customers / Sales)  •  Material Party (Suppliers / Raw Material)'}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateForm} sx={{ py: 1.2, px: 3, fontWeight: 700, bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, width: { xs: '100%', sm: 'auto' } }}>
          {language === 'gu' ? '+ નવી પાર્ટી ઉમેરો' : '+ Add New Party'}
        </Button>
      </Box>

      {/* SUMMARY STATS CARDS */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
        <Card sx={{ p: 2, borderRadius: 2.5, bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: mode === 'dark' ? '#312e81' : '#e0e7ff', color: mode === 'dark' ? '#a5b4fc' : '#4f46e5', width: 42, height: 42 }}>
              <WalletIcon />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                {language === 'gu' ? 'ટેક્સટાઇલ પાર્ટી સેલ્સ કુલ' : 'Textile Billing Total'}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: mode === 'dark' ? '#f8fafc' : '#0f172a', fontSize: '1.1rem' }}>
                {formatRupees(totalTextileSales)}
              </Typography>
            </Box>
          </Box>
        </Card>

        <Card sx={{ p: 2, borderRadius: 2.5, bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: mode === 'dark' ? '#064e3b' : '#dcfce7', color: mode === 'dark' ? '#4ade80' : '#16a34a', width: 42, height: 42 }}>
              <MoneyIcon />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                {language === 'gu' ? 'ટેક્સટાઇલ મળેલ રકમ' : 'Textile Received'}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#16a34a', fontSize: '1.1rem' }}>
                {formatRupees(totalTextileReceived)}
              </Typography>
            </Box>
          </Box>
        </Card>

        <Card sx={{ p: 2, borderRadius: 2.5, bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: mode === 'dark' ? '#7f1d1d' : '#fee2e2', color: mode === 'dark' ? '#f87171' : '#dc2626', width: 42, height: 42 }}>
              <PendingIcon />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                {language === 'gu' ? 'ટેક્સટાઇલ ગ્રાહક બાકી' : 'Textile Pending Due'}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#dc2626', fontSize: '1.1rem' }}>
                {formatRupees(totalTextilePending)}
              </Typography>
            </Box>
          </Box>
        </Card>

        <Card sx={{ p: 2, borderRadius: 2.5, bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: mode === 'dark' ? '#78350f' : '#fef3c7', color: mode === 'dark' ? '#facc15' : '#d97706', width: 42, height: 42 }}>
              <WalletIcon />
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                {language === 'gu' ? 'મટીરીયલ ખરીદી બાકી' : 'Material Supplier Pending'}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: mode === 'dark' ? '#facc15' : '#b45309', fontSize: '1.1rem' }}>
                {formatRupees(totalMaterialPending)}
              </Typography>
            </Box>
          </Box>
        </Card>
      </Box>

      {/* SEARCH AND FILTER BAR */}
      <Card sx={{ p: 2, mb: 3, border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', gap: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={
              language === 'gu'
                ? 'પાર્ટી નામ, વ્યક્તિનું નામ, મોબાઈલ અથવા જીએસટીIN શોધો...'
                : 'Search Party Name, Person Name, Mobile or GSTIN...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1 }}
          />

          {/* CHIP BUTTONS FOR QUICK FILTER */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={language === 'gu' ? 'ટેક્સટાઇલ પાર્ટી' : 'Textile Party'}
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
                    ? mode === 'dark'
                      ? '#312e81'
                      : '#e0e7ff'
                    : mode === 'dark'
                    ? '#1e293b'
                    : '#f8fafc',
                color:
                  typeFilter === 'Textile Party'
                    ? mode === 'dark'
                      ? '#c7d2fe'
                      : '#4338ca'
                    : mode === 'dark'
                    ? '#94a3b8'
                    : '#64748b',
                border: '1.5px solid',
                borderColor:
                  typeFilter === 'Textile Party'
                    ? mode === 'dark'
                      ? '#818cf8'
                      : '#4f46e5'
                    : mode === 'dark'
                    ? '#334155'
                    : '#cbd5e1',
                '&:hover': {
                  bgcolor: mode === 'dark' ? '#312e81' : '#e0e7ff',
                },
              }}
            />
            <Chip
              label={language === 'gu' ? 'મટીરીયલ પાર્ટી' : 'Material Party'}
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
                    ? mode === 'dark'
                      ? '#78350f'
                      : '#fef3c7'
                    : mode === 'dark'
                    ? '#1e293b'
                    : '#f8fafc',
                color:
                  typeFilter === 'Material Party'
                    ? mode === 'dark'
                      ? '#fde68a'
                      : '#b45309'
                    : mode === 'dark'
                    ? '#94a3b8'
                    : '#64748b',
                border: '1.5px solid',
                borderColor:
                  typeFilter === 'Material Party'
                    ? mode === 'dark'
                      ? '#facc15'
                      : '#d97706'
                    : mode === 'dark'
                    ? '#334155'
                    : '#cbd5e1',
                '&:hover': {
                  bgcolor: mode === 'dark' ? '#78350f' : '#fef3c7',
                },
              }}
            />
          </Box>

          <TextField
            select
            size="small"
            label={language === 'gu' ? 'પાર્ટી પ્રકાર' : 'Party Type'}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            sx={{ minWidth: { xs: '100%', sm: 160 } }}
          >
            <MenuItem value="All">{language === 'gu' ? 'બધી પાર્ટીઓ' : 'All Parties'}</MenuItem>
            <MenuItem value="Textile Party">{language === 'gu' ? 'ટેક્સટાઇલ પાર્ટી' : 'Textile Party'}</MenuItem>
            <MenuItem value="Material Party">{language === 'gu' ? 'મટીરીયલ પાર્ટી' : 'Material Party'}</MenuItem>
          </TextField>
        </Box>
      </Card>

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
                    color: sortKey === 'createdAt' ? '#6366f1' : (mode === 'dark' ? '#94a3b8' : '#64748b'),
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
                  {language === 'gu' ? 'તારીખ' : 'DATE'} {getSortIcon('createdAt')}
                </TableCell>
                <TableCell
                  onClick={() => handleSort('name')}
                  sx={{
                    color: sortKey === 'name' ? '#6366f1' : (mode === 'dark' ? '#94a3b8' : '#64748b'),
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
                  {language === 'gu' ? 'પાર્ટી નામ' : 'PARTY NAME'} {getSortIcon('name')}
                </TableCell>
                <TableCell sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, whiteSpace: 'nowrap' }}>
                  {language === 'gu' ? 'વ્યક્તિનું નામ' : 'NAME'}
                </TableCell>
                <TableCell sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, whiteSpace: 'nowrap' }}>
                  {language === 'gu' ? 'પાર્ટી પ્રકાર' : 'PARTY TYPE'}
                </TableCell>
                <TableCell
                  align="right"
                  onClick={() => handleSort('totalAmount')}
                  sx={{
                    color: sortKey === 'totalAmount' ? '#6366f1' : (mode === 'dark' ? '#94a3b8' : '#64748b'),
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
                  {language === 'gu' ? 'કુલ રકમ' : 'TOTAL AMOUNT'} {getSortIcon('totalAmount')}
                </TableCell>
                <TableCell
                  align="right"
                  onClick={() => handleSort('pendingAmount')}
                  sx={{
                    color: sortKey === 'pendingAmount' ? '#6366f1' : (mode === 'dark' ? '#94a3b8' : '#64748b'),
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
                  {language === 'gu' ? 'બાકી રકમ' : 'PENDING AMOUNT'} {getSortIcon('pendingAmount')}
                </TableCell>
                <TableCell align="right" sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, whiteSpace: 'nowrap' }}>
                  {language === 'gu' ? 'મળેલ / ચૂકવેલ' : 'RECEIVED / PAID'}
                </TableCell>
                <TableCell sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, whiteSpace: 'nowrap' }}>
                  {language === 'gu' ? 'જીએસટી નંબર' : 'GSTIN NUMBER'}
                </TableCell>
                <TableCell sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, whiteSpace: 'nowrap' }}>
                  {language === 'gu' ? 'સરનામું / શહેર' : 'CITY / ADDRESS'}
                </TableCell>
                <TableCell sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, whiteSpace: 'nowrap' }} align="center">
                  {language === 'gu' ? 'એક્શન' : 'ACTIONS'}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedParties.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4, color: mode === 'dark' ? '#94a3b8' : '#64748b' }}>
                    {language === 'gu' ? 'કોઈ પાર્ટી મળી નથી (No Parties Found)' : 'No parties found'}
                  </TableCell>
                </TableRow>
              ) : (
                sortedParties
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((p) => {
                    const rawType = p.type as string;
                    const isMaterial = rawType === 'Material Party' || rawType === 'Supplier';
                    const typeLabel = isMaterial
                      ? language === 'gu' ? 'મટીરીયલ પાર્ટી' : 'Material Party'
                      : language === 'gu' ? 'ટેક્સટાઇલ પાર્ટી' : 'Textile Party';

                    const { totalAmount, paidReceivedAmount, pendingAmount } = getPartyFinancials(p);

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
                                width: 30,
                                height: 30,
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                bgcolor: isMaterial
                                  ? (mode === 'dark' ? '#78350f' : '#fef3c7')
                                  : (mode === 'dark' ? '#312e81' : '#e0e7ff'),
                                color: isMaterial
                                  ? (mode === 'dark' ? '#fde68a' : '#b45309')
                                  : (mode === 'dark' ? '#c7d2fe' : '#4338ca'),
                              }}
                            >
                              {p.name ? p.name.charAt(0) : 'P'}
                            </Avatar>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: mode === 'dark' ? '#f8fafc' : '#0f172a' }}>
                              {p.name}
                            </Typography>
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
                                ? (mode === 'dark' ? 'rgba(245,158,11,0.15)' : '#fffbeb')
                                : (mode === 'dark' ? 'rgba(99,102,241,0.15)' : '#eef2ff'),
                              color: isMaterial
                                ? (mode === 'dark' ? '#facc15' : '#b45309')
                                : (mode === 'dark' ? '#a5b4fc' : '#4338ca'),
                              border: '1px solid',
                              borderColor: isMaterial
                                ? (mode === 'dark' ? 'rgba(245,158,11,0.3)' : '#fde68a')
                                : (mode === 'dark' ? 'rgba(99,102,241,0.3)' : '#c7d2fe'),
                            }}
                          />
                        </TableCell>

                        {/* FINANCIAL SUMMARY COLUMNS */}
                        <TableCell align="right" sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`, whiteSpace: 'nowrap' }}>
                          <Typography sx={{ fontWeight: 800, fontSize: '0.875rem', color: mode === 'dark' ? '#f8fafc' : '#0f172a' }}>
                            {formatRupees(totalAmount)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`, whiteSpace: 'nowrap' }}>
                          <Chip
                            label={formatRupees(pendingAmount)}
                            size="small"
                            sx={{
                              fontWeight: 800,
                              height: 24,
                              fontSize: '0.75rem',
                              borderRadius: 1.5,
                              bgcolor: pendingAmount > 0
                                ? (mode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2')
                                : (mode === 'dark' ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4'),
                              color: pendingAmount > 0
                                ? (mode === 'dark' ? '#f87171' : '#dc2626')
                                : (mode === 'dark' ? '#4ade80' : '#16a34a'),
                              border: '1px solid',
                              borderColor: pendingAmount > 0
                                ? (mode === 'dark' ? 'rgba(239, 68, 68, 0.3)' : '#fecaca')
                                : (mode === 'dark' ? 'rgba(34, 197, 94, 0.3)' : '#bbf7d0'),
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`, whiteSpace: 'nowrap' }}>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: isMaterial ? (mode === 'dark' ? '#f87171' : '#dc2626') : (mode === 'dark' ? '#4ade80' : '#16a34a') }}>
                            {formatRupees(paidReceivedAmount)}
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
                            <Tooltip title={language === 'gu' ? 'પાર્ટી વિગતો જુઓ' : 'View Party Details'}>
                              <IconButton
                                size="small"
                                onClick={() => setViewParty(p)}
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
          labelRowsPerPage={language === 'gu' ? 'પેજ દીઠ લાઇનો:' : 'Rows per page:'}
          labelDisplayedRows={({ from, to, count }) =>
            language === 'gu'
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
                <MenuItem value="Textile Party">{language === 'gu' ? 'ટેક્સટાઇલ પાર્ટી (Textile Party)' : 'Textile Party (Customer / Buyer)'}</MenuItem>
                <MenuItem value="Material Party">{language === 'gu' ? 'મટીરીયલ પાર્ટી (Material Party)' : 'Material Party (Supplier / Vendor)'}</MenuItem>
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

      {/* VIEW PARTY DETAILS MODAL */}
      <Dialog open={Boolean(viewParty)} onClose={() => setViewParty(null)} maxWidth="sm" fullWidth>
        {viewParty && (() => {
          const fin = getPartyFinancials(viewParty);
          return (
            <>
              <DialogTitle sx={{ fontWeight: 800, bgcolor: '#4f46e5', color: '#fff', py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
                    🏢 {viewParty.name}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    {viewParty.type === 'Material Party' || (viewParty.type as string) === 'Supplier' ? 'Material Supplier / Raw Material' : 'Textile Customer Party'}
                  </Typography>
                </Box>
                <Chip
                  label={viewParty.type || 'Textile Party'}
                  size="small"
                  sx={{ fontWeight: 800, bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }}
                />
              </DialogTitle>
              <DialogContent sx={{ p: 3, bgcolor: mode === 'dark' ? '#0f172a' : '#f8fafc' }}>
                {/* FINANCIAL METRICS SUMMARY CARDS IN VIEW DIALOG */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5, my: 1.5 }}>
                  <Card sx={{ p: 1.5, textAlign: 'center', bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.68rem', display: 'block' }}>
                      {language === 'gu' ? 'કુલ રકમ' : 'TOTAL AMOUNT'}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: mode === 'dark' ? '#f8fafc' : '#0f172a', mt: 0.2 }}>
                      {formatRupees(fin.totalAmount)}
                    </Typography>
                  </Card>

                  <Card sx={{ p: 1.5, textAlign: 'center', bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.68rem', display: 'block' }}>
                      {language === 'gu' ? 'બાકી રકમ' : 'PENDING'}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: fin.pendingAmount > 0 ? '#dc2626' : '#16a34a', mt: 0.2 }}>
                      {formatRupees(fin.pendingAmount)}
                    </Typography>
                  </Card>

                  <Card sx={{ p: 1.5, textAlign: 'center', bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.68rem', display: 'block' }}>
                      {language === 'gu' ? 'મળેલ / ચૂકવેલ' : 'RECEIVED / PAID'}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: fin.isMaterial ? (mode === 'dark' ? '#f87171' : '#dc2626') : (mode === 'dark' ? '#4ade80' : '#16a34a'), mt: 0.2 }}>
                      {formatRupees(fin.paidReceivedAmount)}
                    </Typography>
                  </Card>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, my: 1 }}>
                  <Card sx={{ p: 2, bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      {language === 'gu' ? 'સંપર્ક વ્યક્તિ' : 'Contact Person'}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.5 }}>
                      👤 {viewParty.contactPerson || '-'}
                    </Typography>
                  </Card>
                  <Card sx={{ p: 2, bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      {language === 'gu' ? 'મોબાઈલ નંબર' : 'Mobile Number'}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.5, color: '#4f46e5' }}>
                      📱 {viewParty.mobile || '-'}
                    </Typography>
                  </Card>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                  <Card sx={{ p: 2, bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      {language === 'gu' ? 'જીએસટી નંબર' : 'GSTIN Number'}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 0.5, fontFamily: 'monospace' }}>
                      🆔 {viewParty.gstin || 'URP (Unregistered)'}
                    </Typography>
                  </Card>
                  <Card sx={{ p: 2, bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      {language === 'gu' ? 'નોંધણી તારીખ' : 'Registration Date'}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 0.5 }}>
                      📅 {formatDate(viewParty.createdAt || (viewParty as any).date || '2026-01-15')}
                    </Typography>
                  </Card>
                </Box>

                <Card sx={{ p: 2, bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {language === 'gu' ? 'સરનામું / મુકામ' : 'Full Address & City'}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                    📍 {viewParty.address || 'Surat, Gujarat'}
                  </Typography>
                </Card>
              </DialogContent>
              <DialogActions sx={{ p: 2, bgcolor: mode === 'dark' ? '#0f172a' : '#f8fafc', borderTop: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                <Button onClick={() => setViewParty(null)} variant="contained" sx={{ fontWeight: 700, px: 3, bgcolor: '#4f46e5' }}>
                  {language === 'gu' ? 'બંધ કરો (Close)' : 'Close'}
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
    </Box>
  );
};
