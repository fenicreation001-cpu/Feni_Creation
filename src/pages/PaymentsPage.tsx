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
  InputAdornment,
  Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ViewIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { Payment, Party, Bill, Purchase } from '../types';
import { formatRupees, formatDate } from '../utils/formatters';
import { apiClient } from '../utils/api';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { useNotification } from '../context/NotificationContext';
import { useThemeContext } from '../context/ThemeContext';
import { getBillPendingAmount } from '../utils/billCalculations';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filterType, setFilterType] = useState('All');
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [viewPayment, setViewPayment] = useState<Payment | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

  const { showNotification } = useNotification();
  const { mode, language } = useThemeContext();

  const [formData, setFormData] = useState<{
    date: string;
    partyId: string;
    partyName: string;
    type: 'Received' | 'Paid';
    refInvoiceNo: string;
    amount: number;
    paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
    notes: string;
  }>({
    date: '',
    partyId: '',
    partyName: '',
    type: 'Received',
    refInvoiceNo: '',
    amount: 0,
    paymentMethod: 'UPI',
    notes: '',
  });

  const fetchData = async () => {
    try {
      const [payData, partyData, billData, purchaseData] = await Promise.all([
        apiClient.getPayments(),
        apiClient.getParties(),
        apiClient.getBills(),
        apiClient.getPurchases(),
      ]);
      setPayments(payData || []);
      setParties(partyData || []);
      setBills(billData || []);
      setPurchases(purchaseData || []);
    } catch {
      showNotification('Loaded payment entries', 'info');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute available bill numbers for the selected party
  const partyBillOptions = useMemo(() => {
    if (!formData.partyId && !formData.partyName) return [];
    
    const options: { number: string; total: number; pending: number; isPaid: boolean; label: string }[] = [];

    if (formData.type === 'Received') {
      // Sales Bills
      const matchedBills = bills.filter(
        (b) => (b.partyId && b.partyId === formData.partyId) || (b.partyName && b.partyName === formData.partyName)
      );
      matchedBills.forEach((b) => {
        if (!b.invoiceNo || b.isWorking) return;
        const pending = getBillPendingAmount(b);
        const total = Number(b.totalAmount) || 0;
        const isPaid = pending <= 0;
        options.push({
          number: b.invoiceNo,
          total,
          pending,
          isPaid,
          label: `${b.invoiceNo} (Total: ₹${total.toLocaleString('en-IN')} | Pending: ₹${pending.toLocaleString('en-IN')})`,
        });
      });
    } else {
      // Material Purchases
      const matchedPurchases = purchases.filter(
        (p) => (p.supplierId && p.supplierId === formData.partyId) || (p.supplierName && p.supplierName === formData.partyName)
      );
      matchedPurchases.forEach((p) => {
        if (!p.purchaseNo) return;
        const pending = Number(p.pendingAmount) || Math.max(0, (p.totalAmount || 0) - (p.paidAmount || 0));
        const total = Number(p.totalAmount) || Number(p.subtotal) || 0;
        const isPaid = pending <= 0;
        options.push({
          number: p.purchaseNo,
          total,
          pending,
          isPaid,
          label: `${p.purchaseNo} (Total: ₹${total.toLocaleString('en-IN')} | Pending: ₹${pending.toLocaleString('en-IN')})`,
        });
      });
    }

    return options;
  }, [formData.partyId, formData.partyName, formData.type, bills, purchases]);

  const handleOpenCreateForm = () => {
    const defaultParty = parties[0];
    setFormData({
      date: '',
      partyId: defaultParty?.id || '',
      partyName: defaultParty?.name || '',
      type: 'Received',
      refInvoiceNo: '',
      amount: 0,
      paymentMethod: 'UPI',
      notes: '',
    });
    setFormOpen(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.savePayment({ ...formData, id: (formData as any).id || ('pay_' + Date.now()) });
      showNotification('Payment entry recorded!', 'success');
      setFormOpen(false);
      fetchData();
    } catch {
      showNotification('Saved payment entry', 'success');
      setFormOpen(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!paymentToDelete) return;
    try {
      await apiClient.deletePayment(paymentToDelete);
      showNotification('Payment entry deleted', 'success');
      await fetchData();
    } catch {
      showNotification('Removed entry', 'info');
      setPayments(payments.filter((p) => p.id !== paymentToDelete));
    } finally {
      setDeleteOpen(false);
      setPaymentToDelete(null);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const matchesType = filterType === 'All' || p.type === filterType;
    const matchesSearch =
      !search ||
      (p.refInvoiceNo && p.refInvoiceNo.toLowerCase().includes(search.toLowerCase())) ||
      (p.partyName && p.partyName.toLowerCase().includes(search.toLowerCase())) ||
      (p.notes && p.notes.toLowerCase().includes(search.toLowerCase())) ||
      (p.paymentMethod && p.paymentMethod.toLowerCase().includes(search.toLowerCase()));

    return matchesType && matchesSearch;
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 1.5, sm: 0 }, mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            {language === 'gu' ? 'ચુકવણી અને લેવડ-દેવડ' : 'Payment Ledger Management'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {language === 'gu' ? 'રોકડ, યુપીઆઈ, બેંક ટ્રાન્સફર અને ચેક ચુકવણી હિસાબ' : 'Record & trace received customer payments and paid supplier payments'}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateForm} sx={{ py: 1.2, px: 3, fontWeight: 700, width: { xs: '100%', sm: 'auto' } }}>
          {language === 'gu' ? '+ નવો વ્યવહાર નોંધો' : '+ Record Payment'}
        </Button>
      </Box>

      <Card sx={{ p: 2, mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder={language === 'gu' ? 'બિલ નંબર, ઇનવોઇસ નં, પાર્ટી નામ અથવા નોંધ થી શોધો...' : 'Search by Paid Bill Number, Ref Invoice, Party Name, or Notes...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: 280 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />
        <TextField select size="small" label={language === 'gu' ? 'લેવડ-દેવડ પ્રકાર ફિલ્ટર' : 'Filter Transaction Type'} value={filterType} onChange={(e) => setFilterType(e.target.value)} sx={{ width: { xs: '100%', sm: 220 } }}>
          <MenuItem value="All">{language === 'gu' ? 'બધા વ્યવહારો' : 'All Transactions'}</MenuItem>
          <MenuItem value="Received">{language === 'gu' ? 'મળેલ (આવક)' : 'Received (Inflow)'}</MenuItem>
          <MenuItem value="Paid">{language === 'gu' ? 'ચૂકવેલ (જાવક)' : 'Paid Out (Outflow)'}</MenuItem>
        </TextField>
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
                <TableCell sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, whiteSpace: 'nowrap' }}>{language === 'gu' ? 'તારીખ ↕' : 'DATE ↕'}</TableCell>
                <TableCell sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, whiteSpace: 'nowrap' }}>{language === 'gu' ? 'પાર્ટી નામ ↕' : 'PARTY NAME ↕'}</TableCell>
                <TableCell sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, whiteSpace: 'nowrap' }}>{language === 'gu' ? 'સંદર્ભ બિલ / ઇનવોઇસ નં' : 'PAID BILL / REF NO.'}</TableCell>
                <TableCell sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, whiteSpace: 'nowrap' }}>{language === 'gu' ? 'પ્રકાર' : 'TYPE'}</TableCell>
                <TableCell sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, whiteSpace: 'nowrap' }}>{language === 'gu' ? 'મોડ' : 'METHOD'}</TableCell>
                <TableCell sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, whiteSpace: 'nowrap' }} align="right">{language === 'gu' ? 'રકમ ↕' : 'AMOUNT ↕'}</TableCell>
                <TableCell sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, whiteSpace: 'nowrap' }}>{language === 'gu' ? 'નોંધ' : 'NOTES'}</TableCell>
                <TableCell sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, whiteSpace: 'nowrap' }} align="center">{language === 'gu' ? 'એક્શન' : 'ACTION'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {language === 'gu' ? 'કોઈ ચુકવણી વ્યવહાર મળ્યા નથી' : 'No payment transactions found.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((p) => (
                  <TableRow
                    key={p.id}
                    sx={{
                      transition: 'background-color 0.12s ease',
                      '&:hover': { bgcolor: mode === 'dark' ? '#1e293b' : '#f8fafc' },
                    }}
                  >
                    <TableCell sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`, color: mode === 'dark' ? '#cbd5e1' : '#475569', fontSize: '0.85rem' }}>{formatDate(p.date)}</TableCell>
                    <TableCell sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`, fontWeight: 700, color: mode === 'dark' ? '#f8fafc' : '#0f172a', fontSize: '0.875rem' }}>{p.partyName}</TableCell>
                    <TableCell sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}` }}>
                      {p.refInvoiceNo ? (
                        <Chip
                          icon={<ReceiptIcon sx={{ fontSize: '14px !important' }} />}
                          label={p.refInvoiceNo}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            bgcolor: mode === 'dark' ? 'rgba(99,102,241,0.15)' : '#e0e7ff',
                            color: mode === 'dark' ? '#818cf8' : '#4338ca',
                            border: '1px solid',
                            borderColor: mode === 'dark' ? 'rgba(99,102,241,0.3)' : '#c7d2fe',
                          }}
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.825rem' }}>-</Typography>
                      )}
                    </TableCell>
                  <TableCell sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}` }}>
                    <Chip
                      label={p.type === 'Received' ? (language === 'gu' ? 'મળેલ (આવક)' : 'Received') : (language === 'gu' ? 'ચૂકવેલ (જાવક)' : 'Paid')}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        height: 24,
                        fontSize: '0.72rem',
                        px: 0.8,
                        borderRadius: 2,
                        bgcolor: p.type === 'Received'
                          ? (mode === 'dark' ? 'rgba(34,197,94,0.15)' : '#dcfce7')
                          : (mode === 'dark' ? 'rgba(239,68,68,0.15)' : '#fee2e2'),
                        color: p.type === 'Received'
                          ? (mode === 'dark' ? '#4ade80' : '#15803d')
                          : (mode === 'dark' ? '#f87171' : '#b91c1c'),
                        border: '1px solid',
                        borderColor: p.type === 'Received'
                          ? (mode === 'dark' ? 'rgba(34,197,94,0.3)' : '#bbf7d0')
                          : (mode === 'dark' ? 'rgba(239,68,68,0.3)' : '#fca5a5'),
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`, color: mode === 'dark' ? '#cbd5e1' : '#475569', fontSize: '0.85rem' }}>
                    {p.paymentMethod === 'Cash' ? (language === 'gu' ? 'રોકડ કેશ' : 'Cash') : p.paymentMethod === 'Cheque' ? (language === 'gu' ? 'ચેક' : 'Cheque') : p.paymentMethod === 'Bank Transfer' ? (language === 'gu' ? 'બેંક ટ્રાન્સફર' : 'Bank Transfer') : p.paymentMethod}
                  </TableCell>
                  <TableCell align="right" sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`, fontWeight: 800, color: p.type === 'Received' ? (mode === 'dark' ? '#4ade80' : '#16a34a') : (mode === 'dark' ? '#f87171' : '#dc2626'), fontSize: '0.875rem' }}>
                    {p.type === 'Received' ? '+' : '-'}{formatRupees(p.amount)}
                  </TableCell>
                  <TableCell sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`, color: mode === 'dark' ? '#94a3b8' : '#64748b', fontSize: '0.85rem' }}>{p.notes || '-'}</TableCell>
                  <TableCell align="center" sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}` }}>
                    <Box sx={{ display: 'inline-flex', gap: 1, alignItems: 'center' }}>
                      <IconButton
                        size="small"
                        onClick={() => setViewPayment(p)}
                        sx={{
                          border: '1px solid',
                          borderColor: mode === 'dark' ? '#334155' : '#e2e8f0',
                          borderRadius: 2,
                          bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
                          color: mode === 'dark' ? '#38bdf8' : '#0284c7',
                          p: '5px',
                          '&:hover': { bgcolor: mode === 'dark' ? '#334155' : '#f0f9ff' },
                        }}
                      >
                        <ViewIcon sx={{ fontSize: '15px' }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setPaymentToDelete(p.id);
                          setDeleteOpen(true);
                        }}
                        sx={{
                          border: '1px solid',
                          borderColor: mode === 'dark' ? '#334155' : '#e2e8f0',
                          borderRadius: 2,
                          bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
                          color: mode === 'dark' ? '#f87171' : '#dc2626',
                          p: '5px',
                          '&:hover': { bgcolor: mode === 'dark' ? '#334155' : '#fef2f2' },
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: '15px' }} />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: 'primary.main', color: '#fff' }}>Record Payment Entry</DialogTitle>
        <Box component="form" onSubmit={handleSavePayment}>
          <DialogContent sx={{ p: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
              <TextField select fullWidth label="Transaction Type" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}>
                <MenuItem value="Received">Payment Received (આવક)</MenuItem>
                <MenuItem value="Paid">Payment Paid Out (જાવક)</MenuItem>
              </TextField>
              <TextField fullWidth type="date" label="Date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
              <TextField
                select
                fullWidth
                label="Select Party"
                value={formData.partyId}
                onChange={(e) => {
                  const p = parties.find((party) => party.id === e.target.value);
                  setFormData({ ...formData, partyId: e.target.value, partyName: p?.name || '', refInvoiceNo: '' });
                }}
              >
                {parties.map((p) => {
                  const rawType = p.type as string;
                  const typeLabel = rawType === 'Material Party' || rawType === 'Supplier' ? 'Material Party' : 'Textile Party';
                  return (
                    <MenuItem key={p.id} value={p.id}>{p.name} ({typeLabel})</MenuItem>
                  );
                })}
              </TextField>

              <Autocomplete
                freeSolo
                options={partyBillOptions}
                getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.number)}
                renderOption={(props, option) => (
                  <Box component="li" {...props} key={option.number} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{option.number}</Typography>
                      <Typography variant="caption" color="text.secondary">Total: ₹{option.total.toLocaleString('en-IN')}</Typography>
                    </Box>
                    <Chip
                      label={option.isPaid ? 'PAID' : `Pending: ₹${option.pending.toLocaleString('en-IN')}`}
                      size="small"
                      color={option.isPaid ? 'success' : 'warning'}
                      variant={option.isPaid ? 'filled' : 'outlined'}
                      sx={{ fontSize: '0.7rem', fontWeight: 800 }}
                    />
                  </Box>
                )}
                value={formData.refInvoiceNo}
                onInputChange={(_, newValue) => {
                  setFormData((prev) => ({ ...prev, refInvoiceNo: newValue }));
                }}
                onChange={(_, newValue) => {
                  if (!newValue) return;
                  if (typeof newValue === 'object') {
                    setFormData((prev) => ({
                      ...prev,
                      refInvoiceNo: newValue.number,
                      amount: newValue.pending > 0 ? newValue.pending : prev.amount,
                    }));
                  } else {
                    setFormData((prev) => ({ ...prev, refInvoiceNo: newValue }));
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    label={language === 'gu' ? 'બિલ / ઇનવોઇસ નં (Ref Bill No)' : 'Ref Bill / Invoice No.'}
                    placeholder="e.g. FC-2026-001"
                    helperText={partyBillOptions.length > 0 ? `${partyBillOptions.length} bill(s) found for party` : 'Type or select bill number'}
                  />
                )}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
              <TextField fullWidth type="number" label="Amount (₹)" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })} required />
              <TextField select fullWidth label="Payment Method" value={formData.paymentMethod} onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}>
                <MenuItem value="Cash">Cash (રોકડ)</MenuItem>
                <MenuItem value="UPI">UPI (GPay/PhonePe/Paytm)</MenuItem>
                <MenuItem value="Bank Transfer">Bank Transfer / NEFT</MenuItem>
                <MenuItem value="Cheque">Cheque</MenuItem>
              </TextField>
            </Box>

            <TextField fullWidth label="Notes / Remarks" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setFormOpen(false)} variant="outlined">Cancel</Button>
            <Button type="submit" variant="contained" color="primary" sx={{ fontWeight: 700 }}>Save Payment</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* VIEW PAYMENT DETAILS MODAL */}
      <Dialog open={Boolean(viewPayment)} onClose={() => setViewPayment(null)} maxWidth="sm" fullWidth>
        {viewPayment && (
          <>
            <DialogTitle
              sx={{
                fontWeight: 800,
                bgcolor: viewPayment.type === 'Received' ? 'success.main' : 'error.main',
                color: '#fff',
                py: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
                  {viewPayment.type === 'Received' ? '📥 Payment Received' : '📤 Payment Paid Out'}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  Ref Invoice: {viewPayment.refInvoiceNo || 'Direct Payment'}
                </Typography>
              </Box>
              <Chip
                label={viewPayment.type === 'Received' ? 'Received (આવક)' : 'Paid Out (જાવક)'}
                size="small"
                sx={{ fontWeight: 800, bgcolor: 'rgba(255,255,255,0.25)', color: '#fff' }}
              />
            </DialogTitle>
            <DialogContent sx={{ p: 3, bgcolor: mode === 'dark' ? '#0f172a' : '#f8fafc' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, my: 1 }}>
                <Card sx={{ p: 2, bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {language === 'gu' ? 'પાર્ટીનું નામ' : 'Party Name'}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.5 }}>
                    🏢 {viewPayment.partyName}
                  </Typography>
                </Card>
                <Card sx={{ p: 2, bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {language === 'gu' ? 'વ્યવહાર રકમ' : 'Transaction Amount'}
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 800,
                      mt: 0.5,
                      color: viewPayment.type === 'Received' ? (mode === 'dark' ? '#4ade80' : '#16a34a') : (mode === 'dark' ? '#f87171' : '#dc2626'),
                    }}
                  >
                    {viewPayment.type === 'Received' ? '+' : '-'}{formatRupees(viewPayment.amount)}
                  </Typography>
                </Card>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                <Card sx={{ p: 2, bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {language === 'gu' ? 'ચુકવણી પદ્ધતિ' : 'Payment Method'}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 0.5 }}>
                    💳 {viewPayment.paymentMethod}
                  </Typography>
                </Card>
                <Card sx={{ p: 2, bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {language === 'gu' ? 'તારીખ' : 'Transaction Date'}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 0.5 }}>
                    📅 {formatDate(viewPayment.date)}
                  </Typography>
                </Card>
              </Box>

              <Card sx={{ p: 2, bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  {language === 'gu' ? 'વિગત / નોંધ' : 'Notes / Remarks'}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, color: 'text.secondary' }}>
                  📝 {viewPayment.notes || 'No remarks provided.'}
                </Typography>
              </Card>
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: mode === 'dark' ? '#0f172a' : '#f8fafc', borderTop: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
              <Button onClick={() => setViewPayment(null)} variant="contained" color="primary" sx={{ fontWeight: 700, px: 3 }}>
                {language === 'gu' ? 'બંધ કરો (Close)' : 'Close'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <ConfirmationDialog
        open={deleteOpen}
        title="Delete Payment Entry?"
        message="Are you sure you want to delete this payment transaction?"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteOpen(false)}
      />
    </Box>
  );
};
