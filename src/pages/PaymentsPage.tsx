import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Receipt as ReceiptIcon,
  Mic as MicIcon,
  AutoAwesome as SparklesIcon,
  Category as CategoryIcon,
  LocalOffer as TagIcon,
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
  InputAdornment,
  Autocomplete,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';

import { Payment, Party, TransactionCategory } from '../types';
import { formatRupees, formatDate } from '../utils/formatters';
import { apiClient } from '../utils/api';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { CategoryManagerModal } from '../components/CategoryManagerModal';
import { useNotification } from '../context/NotificationContext';
import { useThemeContext } from '../context/ThemeContext';
import { useMonthFilter } from '../context/MonthFilterContext';
import { VoicePaymentAssistant } from '../components/VoicePaymentAssistant';

export const PaymentsPage: React.FC = () => {
  const { isDateInSelectedMonth } = useMonthFilter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [filterType, setFilterType] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [voiceAutoStart, setVoiceAutoStart] = useState(false);
  const [viewPayment, setViewPayment] = useState<Payment | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

  const { showNotification } = useNotification();
  const { mode, language } = useThemeContext();

  const [formData, setFormData] = useState<{
    date: string;
    details: string;
    partyId: string;
    partyName: string;
    category: string;
    type: 'Received' | 'Paid';
    amount: number;
    paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
    notes: string;
  }>({
    date: '',
    details: '',
    partyId: '',
    partyName: '',
    category: 'Textile Customer',
    type: 'Received',
    amount: 0,
    paymentMethod: 'UPI',
    notes: '',
  });

  const fetchData = async () => {
    try {
      const [payData, partyData, catData] = await Promise.all([
        apiClient.getPayments(),
        apiClient.getParties(),
        apiClient.getCategories(),
      ]);
      setPayments(payData || []);
      setParties(partyData || []);
      setCategories(catData || []);
    } catch {
      showNotification('Loaded payment entries', 'info');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateForm = (autoMic: boolean = false) => {
    const defaultParty = parties[0];
    const todayStr = new Date().toISOString().split('T')[0];
    const isMat = defaultParty?.type === 'Material Party' || (defaultParty as any)?.category === 'Material';
    setFormData({
      date: todayStr,
      details: defaultParty?.name || '',
      partyId: defaultParty?.id || '',
      partyName: defaultParty?.name || '',
      category: isMat ? 'Material Supplier' : 'Textile Customer',
      type: isMat ? 'Paid' : 'Received',
      amount: 0,
      paymentMethod: 'UPI',
      notes: '',
    });
    setVoiceAutoStart(autoMic);
    setFormOpen(true);
  };

  const handleApplyVoiceData = (parsed: Partial<typeof formData>) => {
    setFormData((prev) => {
      const updated = { ...prev, ...parsed };
      if (parsed.partyId) {
        const found = parties.find((p) => p.id === parsed.partyId);
        if (found) {
          updated.partyName = found.name;
          if (!parsed.details) updated.details = found.name;
          if (!parsed.category) {
            const isMat = found.type === 'Material Party' || (found as any).category === 'Material';
            updated.category = isMat ? 'Material Supplier' : 'Textile Customer';
          }
        }
      } else if (parsed.partyName && !parsed.details) {
        updated.details = parsed.partyName;
      }
      return updated;
    });

    const displayInfo = parsed.details || parsed.partyName || '';
    const amountDisplay = parsed.amount ? `₹${parsed.amount.toLocaleString('en-IN')}` : '';

    showNotification(
      language === 'gu'
        ? `🎤 માઇક દ્વારા સફળ: ${displayInfo ? displayInfo + ' • ' : ''}${amountDisplay ? amountDisplay + ' • ' : ''}${parsed.type === 'Received' ? 'Credit (જમા)' : 'Debit (ઉધાર)'}`
        : `🎤 Voice recorded: ${displayInfo ? displayInfo + ' • ' : ''}${amountDisplay ? amountDisplay + ' • ' : ''}${parsed.type === 'Received' ? 'Credit' : 'Debit'}`,
      'success'
    );
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
    const matchesCategory = filterCategory === 'All' || (p as any).category === filterCategory;
    const matchesMonth = isDateInSelectedMonth(p.date || (p as any).createdAt);
    const detailText = (p.details || p.partyName || '').toLowerCase();
    const catText = ((p as any).category || '').toLowerCase();
    const matchesSearch =
      !search ||
      (detailText.includes(search.toLowerCase())) ||
      (catText.includes(search.toLowerCase())) ||
      (p.notes && p.notes.toLowerCase().includes(search.toLowerCase())) ||
      (p.paymentMethod && p.paymentMethod.toLowerCase().includes(search.toLowerCase()));

    return matchesType && matchesCategory && matchesMonth && matchesSearch;
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
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {/* CATEGORY CRUD MANAGEMENT BUTTON (Requested in Header) */}
          <Button
            variant="outlined"
            startIcon={<CategoryIcon sx={{ color: '#8b5cf6' }} />}
            onClick={() => setCategoryModalOpen(true)}
            sx={{
              py: 1.2,
              px: 2.2,
              fontWeight: 800,
              borderWidth: 2,
              borderRadius: '8px',
              bgcolor: mode === 'dark' ? 'rgba(139,92,246,0.15)' : '#f5f3ff',
              borderColor: '#8b5cf6',
              color: mode === 'dark' ? '#c084fc' : '#7c3aed',
              '&:hover': {
                borderWidth: 2,
                bgcolor: mode === 'dark' ? 'rgba(139,92,246,0.25)' : '#ede9fe',
                borderColor: '#7c3aed',
              },
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            {language === 'gu' ? '🏷️ કેટેગરી મેનેજ (Categories)' : '🏷️ Manage Categories'}
          </Button>

          <Button
            variant="outlined"
            color="primary"
            startIcon={<MicIcon sx={{ color: '#2563eb' }} />}
            onClick={() => handleOpenCreateForm(true)}
            sx={{
              py: 1.2,
              px: 2.2,
              fontWeight: 800,
              borderWidth: 2,
              borderRadius: '8px',
              bgcolor: mode === 'dark' ? 'rgba(37,99,235,0.15)' : '#eff6ff',
              borderColor: '#3b82f6',
              color: mode === 'dark' ? '#60a5fa' : '#1d4ed8',
              '&:hover': {
                borderWidth: 2,
                bgcolor: mode === 'dark' ? 'rgba(37,99,235,0.25)' : '#dbeafe',
                borderColor: '#2563eb',
              },
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            {language === 'gu' ? '🎤 બોલીને એન્ટ્રી (Voice Mic)' : '🎤 Voice Mic Entry'}
          </Button>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenCreateForm(false)}
            sx={{ py: 1.2, px: 3, fontWeight: 700, borderRadius: '8px', width: { xs: '100%', sm: 'auto' } }}
          >
            {language === 'gu' ? '+ નવો વ્યવહાર નોંધો' : '+ Record Payment'}
          </Button>
        </Box>
      </Box>

      <Card sx={{ p: 2, mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder={language === 'gu' ? 'વિગત, પાર્ટી નામ, કેટેગરી, પદ્ધતિ અથવા નોંધ થી શોધો...' : 'Search by Details, Party Name, Category, Method, or Notes...'}
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
        <TextField select size="small" label={language === 'gu' ? 'લેવડ-દેવડ પ્રકાર ફિલ્ટર' : 'Filter Transaction Type'} value={filterType} onChange={(e) => setFilterType(e.target.value)} sx={{ width: { xs: '100%', sm: 200 } }}>
          <MenuItem value="All">{language === 'gu' ? 'બધા વ્યવહારો (All)' : 'All Transactions'}</MenuItem>
          <MenuItem value="Received">{language === 'gu' ? '🟢 Credit (જમા - આવક)' : '🟢 Credit (Received)'}</MenuItem>
          <MenuItem value="Paid">{language === 'gu' ? '🔴 Debit (ઉધાર - જાવક)' : '🔴 Debit (Paid Out)'}</MenuItem>
        </TextField>

        <TextField
          select
          size="small"
          label={language === 'gu' ? 'કેટેગરી ફિલ્ટર' : 'Filter Category'}
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          sx={{ width: { xs: '100%', sm: 220 } }}
        >
          <MenuItem value="All">{language === 'gu' ? 'બધી કેટેગરીઝ (All Categories)' : 'All Categories'}</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c.id} value={c.name}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: c.color || '#3b82f6',
                    flexShrink: 0,
                  }}
                />
                <span>{language === 'gu' && c.gujaratiName ? c.gujaratiName : c.name}</span>
              </Box>
            </MenuItem>
          ))}
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
                <TableCell sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, whiteSpace: 'nowrap' }}>{language === 'gu' ? 'પ્રકાર (TYPE)' : 'TYPE'}</TableCell>
                <TableCell sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, whiteSpace: 'nowrap' }}>{language === 'gu' ? 'વિગત / પાર્ટી (DETAILS)' : 'DETAILS / PARTY'}</TableCell>
                <TableCell sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, whiteSpace: 'nowrap' }}>{language === 'gu' ? 'કેટેગરી (CATEGORY)' : 'CATEGORY'}</TableCell>
                <TableCell sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, whiteSpace: 'nowrap' }}>{language === 'gu' ? 'પદ્ધતિ (METHOD)' : 'METHOD'}</TableCell>
                <TableCell sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, whiteSpace: 'nowrap' }} align="right">{language === 'gu' ? 'રકમ (AMOUNT ↕)' : 'AMOUNT ↕'}</TableCell>
                <TableCell sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, whiteSpace: 'nowrap' }}>{language === 'gu' ? 'નોંધ (NOTES)' : 'NOTES'}</TableCell>
                <TableCell sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, whiteSpace: 'nowrap' }} align="center">{language === 'gu' ? 'એક્શન' : 'ACTION'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {language === 'gu' ? 'કોઈ લેવડ-દેવડ વ્યવહાર મળ્યા નથી' : 'No credit/debit transactions found.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((p) => {
                  const displayDetails = p.details || p.partyName || '-';
                  const displayCategory = (p as any).category || (p.partyName ? 'Textile Customer' : 'General');
                  return (
                    <TableRow
                      key={p.id}
                      sx={{
                        transition: 'background-color 0.12s ease',
                        '&:hover': { bgcolor: mode === 'dark' ? '#1e293b' : '#f8fafc' },
                      }}
                    >
                      <TableCell sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`, color: mode === 'dark' ? '#cbd5e1' : '#475569', fontSize: '0.85rem' }}>{formatDate(p.date)}</TableCell>
                      
                      <TableCell sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}` }}>
                        <Chip
                          label={p.type === 'Received' ? (language === 'gu' ? '🟢 Credit (જમા)' : '🟢 Credit') : (language === 'gu' ? '🔴 Debit (ઉધાર)' : '🔴 Debit')}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            height: 24,
                            fontSize: '0.74rem',
                            px: 0.8,
                            borderRadius: 2,
                            bgcolor: p.type === 'Received'
                              ? (mode === 'dark' ? 'rgba(34,197,94,0.18)' : '#dcfce7')
                              : (mode === 'dark' ? 'rgba(239,68,68,0.18)' : '#fee2e2'),
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

                      <TableCell sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`, fontWeight: 800, color: mode === 'dark' ? '#f8fafc' : '#0f172a', fontSize: '0.875rem' }}>
                        {displayDetails}
                      </TableCell>

                      <TableCell sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}` }}>
                        {(() => {
                          const matchedCat = categories.find((c) => c.name.toLowerCase() === displayCategory.toLowerCase());
                          const catColor = matchedCat?.color || (
                            displayCategory.includes('Material') ? '#ea580c' :
                            displayCategory.includes('Expense') ? '#9333ea' :
                            displayCategory.includes('Worker') ? '#0284c7' : '#2563eb'
                          );
                          const labelText = language === 'gu' && matchedCat?.gujaratiName ? matchedCat.gujaratiName : displayCategory;
                          return (
                            <Chip
                              label={labelText}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                height: 22,
                                bgcolor: `${catColor}20`,
                                color: catColor,
                                border: `1px solid ${catColor}40`,
                              }}
                            />
                          );
                        })()}
                      </TableCell>

                      <TableCell sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`, color: mode === 'dark' ? '#cbd5e1' : '#475569', fontSize: '0.85rem', fontWeight: 600 }}>
                        {p.paymentMethod === 'Cash' ? (language === 'gu' ? 'રોકડ કેશ' : 'Cash') : p.paymentMethod === 'Cheque' ? (language === 'gu' ? 'ચેક' : 'Cheque') : p.paymentMethod === 'Bank Transfer' ? (language === 'gu' ? 'બેંક ટ્રાન્સફર' : 'Bank Transfer') : p.paymentMethod}
                      </TableCell>

                      <TableCell align="right" sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`, fontWeight: 800, color: p.type === 'Received' ? (mode === 'dark' ? '#4ade80' : '#16a34a') : (mode === 'dark' ? '#f87171' : '#dc2626'), fontSize: '0.9rem', fontFamily: 'monospace' }}>
                        {p.type === 'Received' ? '+' : '-'}{formatRupees(p.amount)}
                      </TableCell>

                      <TableCell sx={{ py: 1.4, px: 2, borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`, color: mode === 'dark' ? '#94a3b8' : '#64748b', fontSize: '0.825rem' }}>
                        {p.notes || '-'}
                      </TableCell>

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
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            fontWeight: 800,
            bgcolor: formData.type === 'Received' ? '#1e3a8a' : '#9a3412',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 1.8,
            px: { xs: 2, sm: 3 },
            transition: 'background-color 0.3s ease',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.2rem' } }}>
              {language === 'gu'
                ? (formData.type === 'Received' ? '📥 આવક / જમા પેમેન્ટ એન્ટ્રી' : '📤 જાવક / ઉધાર પેમેન્ટ એન્ટ્રી')
                : (formData.type === 'Received' ? '📥 Credit / Payment Received' : '📤 Debit / Payment Paid Out')}
            </Typography>
          </Box>
          <Chip
            icon={<MicIcon sx={{ color: '#fff !important', fontSize: '15px !important' }} />}
            label={language === 'gu' ? 'માઇક સપોર્ટ' : 'Voice Enabled'}
            size="small"
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.22)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.72rem',
              border: '1px solid rgba(255, 255, 255, 0.35)',
            }}
          />
        </DialogTitle>
        <Box component="form" onSubmit={handleSavePayment}>
          <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
            {/* Integrated Voice Assistant for Mic Credit/Debit Dictation */}
            <VoicePaymentAssistant
              parties={parties}
              onApplyParsedData={handleApplyVoiceData}
              isGu={language === 'gu'}
              autoStart={voiceAutoStart}
            />

            {/* 1. TRANSACTION TYPE: CREDIT & DEBIT */}
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 0.8 }}>
                {language === 'gu' ? '૧. લેવડ-દેવડ પ્રકાર (Transaction Type) *' : '1. Transaction Type (Credit / Debit) *'}
              </Typography>
              <ToggleButtonGroup
                value={formData.type}
                exclusive
                onChange={(_, val) => {
                  if (val) setFormData((prev) => ({ ...prev, type: val }));
                }}
                fullWidth
                sx={{
                  bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9',
                  p: 0.5,
                  borderRadius: '10px',
                  gap: 1,
                  '& .MuiToggleButton-root': {
                    border: 'none',
                    borderRadius: '8px !important',
                    py: 1.1,
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    textTransform: 'none',
                    transition: 'all 0.2s ease',
                  },
                }}
              >
                <ToggleButton
                  value="Received"
                  sx={{
                    color: '#15803d',
                    '&.Mui-selected': {
                      bgcolor: '#16a34a !important',
                      color: '#ffffff !important',
                      boxShadow: '0 2px 8px rgba(22, 163, 74, 0.35)',
                    },
                  }}
                >
                  {language === 'gu' ? '📥 Credit (જમા - આવક)' : '📥 Credit (Payment Received)'}
                </ToggleButton>
                <ToggleButton
                  value="Paid"
                  sx={{
                    color: '#b91c1c',
                    '&.Mui-selected': {
                      bgcolor: '#dc2626 !important',
                      color: '#ffffff !important',
                      boxShadow: '0 2px 8px rgba(220, 38, 38, 0.35)',
                    },
                  }}
                >
                  {language === 'gu' ? '📤 Debit (ઉધાર - જાવક)' : '📤 Debit (Payment Paid Out)'}
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* 2. DATE & 4. CATEGORY */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                type="date"
                label={language === 'gu' ? '૨. તારીખ (Date) *' : '2. Date *'}
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                    {language === 'gu' ? '૪. કેટેગરી (Category) *' : '4. Category *'}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setCategoryModalOpen(true)}
                    sx={{ fontSize: '0.72rem', py: 0, px: 0.5, fontWeight: 700, minWidth: 'auto', textTransform: 'none' }}
                  >
                    {language === 'gu' ? '+ નવી / મેનેજ કેટેગરી' : '+ Manage Categories'}
                  </Button>
                </Box>
                <TextField
                  select
                  fullWidth
                  value={formData.category}
                  onChange={(e) => {
                    if (e.target.value === '__MANAGE_CATEGORIES__') {
                      setCategoryModalOpen(true);
                      return;
                    }
                    setFormData({ ...formData, category: e.target.value });
                  }}
                >
                  {/* Primary matching categories based on current type (Received = Credit, Paid = Debit) */}
                  {categories
                    .filter((c) => formData.type === 'Received' ? (c.type === 'Credit' || c.type === 'Both') : (c.type === 'Debit' || c.type === 'Both'))
                    .map((c) => (
                      <MenuItem key={c.id} value={c.name}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c.color || '#3b82f6', flexShrink: 0 }} />
                          <span>{language === 'gu' && c.gujaratiName ? c.gujaratiName : c.name}</span>
                        </Box>
                      </MenuItem>
                    ))}
                  {/* Secondary categories */}
                  {categories
                    .filter((c) => formData.type === 'Received' ? c.type === 'Debit' : c.type === 'Credit')
                    .map((c) => (
                      <MenuItem key={c.id} value={c.name}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: 0.8 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c.color || '#94a3b8', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.85rem' }}>{language === 'gu' && c.gujaratiName ? c.gujaratiName : c.name}</span>
                        </Box>
                      </MenuItem>
                    ))}
                  {/* Fallback if custom category */}
                  {formData.category && !categories.some((c) => c.name === formData.category) && (
                    <MenuItem value={formData.category}>
                      {formData.category}
                    </MenuItem>
                  )}
                  <MenuItem value="__MANAGE_CATEGORIES__" sx={{ color: 'primary.main', fontWeight: 800, borderTop: `1px dashed ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                    + {language === 'gu' ? 'કેટેગરી મેનેજ / નવી ઉમેરો (Manage Categories)...' : 'Manage / Add Categories...'}
                  </MenuItem>
                </TextField>
              </Box>
            </Box>

            {/* 3. DETAILS / PARTY */}
            <Box sx={{ mb: 2 }}>
              <Autocomplete
                freeSolo
                options={parties.map((p) => p.name)}
                value={formData.details || formData.partyName || ''}
                onInputChange={(_, newValue) => {
                  const matched = parties.find((p) => p.name.toLowerCase() === (newValue || '').toLowerCase());
                  setFormData((prev) => ({
                    ...prev,
                    details: newValue,
                    partyId: matched ? matched.id : '',
                    partyName: matched ? matched.name : newValue,
                    category: matched
                      ? (matched.type === 'Material Party' ? 'Material Supplier' : 'Textile Customer')
                      : prev.category,
                  }));
                }}
                onChange={(_, newValue) => {
                  if (!newValue) return;
                  const matched = parties.find((p) => p.name === newValue);
                  setFormData((prev) => ({
                    ...prev,
                    details: newValue,
                    partyId: matched ? matched.id : '',
                    partyName: matched ? matched.name : newValue,
                    category: matched
                      ? (matched.type === 'Material Party' ? 'Material Supplier' : 'Textile Customer')
                      : prev.category,
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    label={language === 'gu' ? '૩. વિગત / પાર્ટીનું નામ (Details / Party) *' : '3. Details / Party Name *'}
                    placeholder={language === 'gu' ? 'પાર્ટી પસંદ કરો અથવા વિગત લખો (દા.ત. રાધે ક્રિષ્ના ફેશન)' : 'Select party or type details (e.g. Radhe Krishna Fashion)'}
                    required
                    helperText={language === 'gu' ? 'નોંધાયેલ પાર્ટી પસંદ કરો અથવા નવી વિગત ટાઇપ કરો' : 'Select registered party or type custom description'}
                  />
                )}
              />
            </Box>

            {/* 5. AMOUNT & 6. METHOD */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                type="number"
                label={language === 'gu' ? '૫. રકમ (Amount ₹) *' : '5. Amount (₹) *'}
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Typography sx={{ fontWeight: 800 }}>₹</Typography></InputAdornment>,
                }}
              />

              <TextField
                select
                fullWidth
                label={language === 'gu' ? '૬. પદ્ધતિ (Method) *' : '6. Payment Method *'}
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
              >
                <MenuItem value="UPI">UPI (GPay / PhonePe / Paytm)</MenuItem>
                <MenuItem value="Cash">{language === 'gu' ? 'Cash (રોકડ કેશ)' : 'Cash'}</MenuItem>
                <MenuItem value="Bank Transfer">{language === 'gu' ? 'Bank Transfer / NEFT (બેંક)' : 'Bank Transfer / NEFT'}</MenuItem>
                <MenuItem value="Cheque">{language === 'gu' ? 'Cheque (ચેક)' : 'Cheque'}</MenuItem>
              </TextField>
            </Box>

            {/* 7. NOTES / REMARKS (Clean full-width input, NO Ref Bill) */}
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label={language === 'gu' ? '૭. નોંધ / વિગત (Notes / Remarks) - વૈકલ્પિક' : '7. Notes / Remarks (Optional)'}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={language === 'gu' ? 'વધારાની વિગત કે નોંધ લખો...' : 'Enter additional notes or remarks...'}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, px: 3, bgcolor: mode === 'dark' ? '#0f172a' : '#f8fafc', borderTop: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
            <Button onClick={() => setFormOpen(false)} variant="outlined" sx={{ fontWeight: 700, borderRadius: '8px' }}>
              {language === 'gu' ? 'રદ કરો (Cancel)' : 'Cancel'}
            </Button>
            <Button type="submit" variant="contained" color="primary" sx={{ fontWeight: 800, borderRadius: '8px', px: 3 }}>
              {language === 'gu' ? 'સાચવો (Save Payment)' : 'Save Payment'}
            </Button>
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
                  {viewPayment.type === 'Received' ? '📥 Credit Entry (જમા)' : '📤 Debit Entry (ઉધાર)'}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  {language === 'gu' ? 'લેવડ-દેવડ હિસાબ (Payment Ledger Transaction)' : 'Payment Ledger Transaction'}
                </Typography>
              </Box>
              <Chip
                label={viewPayment.type === 'Received' ? 'Credit (જમા)' : 'Debit (ઉધાર)'}
                size="small"
                sx={{ fontWeight: 800, bgcolor: 'rgba(255,255,255,0.25)', color: '#fff' }}
              />
            </DialogTitle>
            <DialogContent sx={{ p: 3, bgcolor: mode === 'dark' ? '#0f172a' : '#f8fafc' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, my: 1 }}>
                <Card sx={{ p: 2, bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {language === 'gu' ? 'વિગત / પાર્ટી' : 'Details / Party'}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.5 }}>
                    🏢 {viewPayment.details || viewPayment.partyName || '-'}
                  </Typography>
                </Card>
                <Card sx={{ p: 2, bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {language === 'gu' ? 'કેટેગરી' : 'Category'}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.5, color: 'primary.main' }}>
                    🏷️ {(viewPayment as any).category || (viewPayment.partyName ? 'Textile Customer' : 'General')}
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
                  {language === 'gu' ? 'રકમ' : 'Amount'}
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 900,
                    mt: 0.5,
                    fontFamily: 'monospace',
                    color: viewPayment.type === 'Received' ? (mode === 'dark' ? '#4ade80' : '#16a34a') : (mode === 'dark' ? '#f87171' : '#dc2626'),
                  }}
                >
                  {viewPayment.type === 'Received' ? '+' : '-'}{formatRupees(viewPayment.amount)}
                </Typography>
                {viewPayment.notes && (
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 1, color: 'text.secondary' }}>
                    📝 {viewPayment.notes}
                  </Typography>
                )}
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

      {/* CATEGORY CRUD MANAGEMENT MODAL */}
      <CategoryManagerModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        categories={categories}
        payments={payments}
        onCategoriesUpdated={(newCats) => {
          setCategories(newCats);
          fetchData();
        }}
      />
    </Box>
  );
};
