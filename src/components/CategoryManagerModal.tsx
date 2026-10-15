import {
  Close as CloseIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Category as CategoryIcon,
  Check as CheckIcon,
  LocalOffer as TagIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  Chip,
  IconButton,
  Card,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Alert,
} from '@mui/material';

import { TransactionCategory, Payment } from '../types';
import { apiClient } from '../utils/api';
import { ConfirmationDialog } from './ConfirmationDialog';
import { useNotification } from '../context/NotificationContext';
import { useThemeContext } from '../context/ThemeContext';

interface CategoryManagerModalProps {
  open: boolean;
  onClose: () => void;
  categories: TransactionCategory[];
  payments: Payment[];
  onCategoriesUpdated: (updatedCategories: TransactionCategory[]) => void;
}

const PRESET_COLORS = [
  { label: 'Emerald Green', hex: '#16a34a' },
  { label: 'Forest Green', hex: '#059669' },
  { label: 'Teal Blue', hex: '#0d9488' },
  { label: 'Royal Blue', hex: '#2563eb' },
  { label: 'Indigo', hex: '#4f46e5' },
  { label: 'Purple / Violet', hex: '#9333ea' },
  { label: 'Amber / Gold', hex: '#d97706' },
  { label: 'Orange', hex: '#ea580c' },
  { label: 'Crimson Red', hex: '#dc2626' },
  { label: 'Rose Pink', hex: '#e11d48' },
  { label: 'Slate Gray', hex: '#64748b' },
];

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  open,
  onClose,
  categories,
  payments,
  onCategoriesUpdated,
}) => {
  const { showNotification } = useNotification();
  const { mode, language } = useThemeContext();
  const isGu = language === 'gu';

  // Filters
  const [filterType, setFilterType] = useState<'All' | 'Credit' | 'Debit' | 'Both'>('All');
  const [search, setSearch] = useState('');

  // Form State for Add / Edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TransactionCategory | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    gujaratiName: string;
    type: 'Credit' | 'Debit' | 'Both';
    color: string;
    description: string;
  }>({
    name: '',
    gujaratiName: '',
    type: 'Debit',
    color: '#2563eb',
    description: '',
  });

  // Delete State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<TransactionCategory | null>(null);

  // Compute category usage in existing payments
  const categoryUsageCount = useMemo(() => {
    const counts: Record<string, number> = {};
    payments.forEach((p) => {
      const cat = (p as any).category;
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return counts;
  }, [payments]);

  // Counts by type
  const countsByType = useMemo(() => {
    const total = categories.length;
    const credit = categories.filter((c) => c.type === 'Credit').length;
    const debit = categories.filter((c) => c.type === 'Debit').length;
    const both = categories.filter((c) => c.type === 'Both').length;
    return { total, credit, debit, both };
  }, [categories]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const matchesType = filterType === 'All' || c.type === filterType;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.gujaratiName && c.gujaratiName.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q));
      return matchesType && matchesSearch;
    });
  }, [categories, filterType, search]);

  const handleOpenAddForm = (defaultType?: 'Credit' | 'Debit') => {
    setEditingCategory(null);
    setFormData({
      name: '',
      gujaratiName: '',
      type: defaultType || (filterType === 'Credit' ? 'Credit' : filterType === 'Debit' ? 'Debit' : 'Debit'),
      color: defaultType === 'Credit' ? '#16a34a' : '#ea580c',
      description: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (category: TransactionCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      gujaratiName: category.gujaratiName || '',
      type: category.type,
      color: category.color || '#2563eb',
      description: category.description || '',
    });
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCategory(null);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showNotification(isGu ? 'કૃપા કરીને કેટેગરીનું નામ દાખલ કરો' : 'Please enter category name', 'warning');
      return;
    }

    try {
      const payload: Partial<TransactionCategory> = {
        name: formData.name.trim(),
        gujaratiName: formData.gujaratiName.trim() || formData.name.trim(),
        type: formData.type,
        color: formData.color,
        description: formData.description.trim(),
      };

      if (editingCategory) {
        payload.id = editingCategory.id;
        const saved = await apiClient.saveCategory(payload);
        const updated = categories.map((c) => (c.id === saved.id ? saved : c));
        onCategoriesUpdated(updated);
        showNotification(
          isGu ? `કેટેગરી "${saved.name}" સફળતાપૂર્વક અપડેટ થઈ!` : `Category "${saved.name}" updated successfully!`,
          'success'
        );
      } else {
        const saved = await apiClient.saveCategory(payload);
        const updated = [saved, ...categories];
        onCategoriesUpdated(updated);
        showNotification(
          isGu ? `નવી કેટેગરી "${saved.name}" ઉમેરાઈ ગઈ!` : `Category "${saved.name}" created successfully!`,
          'success'
        );
      }
      handleCloseForm();
    } catch {
      showNotification(isGu ? 'કેટેગરી સેવ કરવામાં ભૂલ આવી' : 'Failed to save category', 'error');
    }
  };

  const handleDeleteClick = (category: TransactionCategory) => {
    setCategoryToDelete(category);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await apiClient.deleteCategory(categoryToDelete.id);
      const updated = categories.filter((c) => c.id !== categoryToDelete.id);
      onCategoriesUpdated(updated);
      showNotification(
        isGu ? `કેટેગરી "${categoryToDelete.name}" દૂર કરવામાં આવી` : `Category "${categoryToDelete.name}" deleted`,
        'success'
      );
    } catch {
      showNotification(isGu ? 'ડિલીટ કરવામાં ભૂલ આવી' : 'Failed to delete category', 'error');
    } finally {
      setDeleteConfirmOpen(false);
      setCategoryToDelete(null);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            bgcolor: mode === 'dark' ? '#0f172a' : '#ffffff',
          },
        }}
      >
        {/* MODAL HEADER */}
        <DialogTitle
          sx={{
            py: 2,
            px: { xs: 2, sm: 3 },
            bgcolor: mode === 'dark' ? '#1e293b' : '#f8fafc',
            borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                bgcolor: mode === 'dark' ? 'rgba(139,92,246,0.2)' : '#ede9fe',
                color: '#8b5cf6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CategoryIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
                {isGu ? '🏷️ લેવડ-દેવડ કેટેગરી મેનેજમેન્ટ (Category CRUD)' : '🏷️ Transaction Category Management (CRUD)'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isGu
                  ? 'ક્રેડિટ (આવક/જમા) અને ડેબિટ (જાવક/ઉધાર) કેટેગરીઝ બનાવો, સુધારો અને ડિલીટ કરો'
                  : 'Create, edit & manage custom categories for Credit (Received) and Debit (Paid Out) payments'}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
          {/* TOP SUMMARY STATS CHIPS */}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2.5 }}>
            <Chip
              icon={<TagIcon sx={{ fontSize: '16px !important' }} />}
              label={`${isGu ? 'કુલ કેટેગરીઝ' : 'Total Categories'}: ${countsByType.total}`}
              sx={{ fontWeight: 700, bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', color: 'text.primary' }}
            />
            <Chip
              label={`🟢 ${isGu ? 'Credit (આવક)' : 'Credit (Income)'}: ${countsByType.credit}`}
              sx={{
                fontWeight: 700,
                bgcolor: mode === 'dark' ? 'rgba(34,197,94,0.15)' : '#dcfce7',
                color: mode === 'dark' ? '#4ade80' : '#15803d',
                border: '1px solid',
                borderColor: mode === 'dark' ? 'rgba(34,197,94,0.3)' : '#bbf7d0',
              }}
            />
            <Chip
              label={`🔴 ${isGu ? 'Debit (જાવક)' : 'Debit (Expense)'}: ${countsByType.debit}`}
              sx={{
                fontWeight: 700,
                bgcolor: mode === 'dark' ? 'rgba(239,68,68,0.15)' : '#fee2e2',
                color: mode === 'dark' ? '#f87171' : '#b91c1c',
                border: '1px solid',
                borderColor: mode === 'dark' ? 'rgba(239,68,68,0.3)' : '#fca5a5',
              }}
            />
            <Chip
              label={`🟣 ${isGu ? 'Both (બંને)' : 'Both Types'}: ${countsByType.both}`}
              sx={{
                fontWeight: 700,
                bgcolor: mode === 'dark' ? 'rgba(147,51,234,0.15)' : '#f3e8ff',
                color: mode === 'dark' ? '#c084fc' : '#7e22ce',
              }}
            />
          </Box>

          {/* INLINE CATEGORY FORM (ADD / EDIT) */}
          {isFormOpen && (
            <Card
              sx={{
                p: { xs: 2, sm: 2.5 },
                mb: 3,
                borderRadius: 2.5,
                border: `2px solid ${editingCategory ? '#3b82f6' : '#16a34a'}`,
                bgcolor: mode === 'dark' ? '#1e293b' : '#f8fafc',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: editingCategory ? 'primary.main' : 'success.main' }}>
                  {editingCategory
                    ? (isGu ? `✏️ કેટેગરી સુધારો: ${editingCategory.name}` : `✏️ Edit Category: ${editingCategory.name}`)
                    : (isGu ? '✨ નવી કેટેગરી ઉમેરો (Add New Category)' : '✨ Add New Category')}
                </Typography>
                <Button size="small" onClick={handleCloseForm} sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {isGu ? 'રદ કરો (Cancel)' : 'Cancel'}
                </Button>
              </Box>

              <Box component="form" onSubmit={handleSaveCategory}>
                {/* 1. TRANSACTION TYPE */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 0.6, textTransform: 'uppercase' }}>
                    {isGu ? 'લેવડ-દેવડ પ્રકાર (Transaction Type) *' : 'Transaction Type *'}
                  </Typography>
                  <ToggleButtonGroup
                    value={formData.type}
                    exclusive
                    onChange={(_, val) => {
                      if (val) setFormData((prev) => ({ ...prev, type: val }));
                    }}
                    fullWidth
                    size="small"
                    sx={{
                      bgcolor: mode === 'dark' ? '#0f172a' : '#ffffff',
                      p: 0.5,
                      borderRadius: '8px',
                      '& .MuiToggleButton-root': {
                        border: 'none',
                        borderRadius: '6px !important',
                        py: 0.8,
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        textTransform: 'none',
                      },
                    }}
                  >
                    <ToggleButton
                      value="Credit"
                      sx={{
                        color: '#15803d',
                        '&.Mui-selected': { bgcolor: '#16a34a !important', color: '#fff !important' },
                      }}
                    >
                      {isGu ? '🟢 Credit (આવક / જમા)' : '🟢 Credit (Received)'}
                    </ToggleButton>
                    <ToggleButton
                      value="Debit"
                      sx={{
                        color: '#b91c1c',
                        '&.Mui-selected': { bgcolor: '#dc2626 !important', color: '#fff !important' },
                      }}
                    >
                      {isGu ? '🔴 Debit (જાવક / ઉધાર)' : '🔴 Debit (Paid Out)'}
                    </ToggleButton>
                    <ToggleButton
                      value="Both"
                      sx={{
                        color: '#7e22ce',
                        '&.Mui-selected': { bgcolor: '#9333ea !important', color: '#fff !important' },
                      }}
                    >
                      {isGu ? '🟣 Both (બંને)' : '🟣 Both (Credit & Debit)'}
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                {/* 2. NAME & GUJARATI NAME */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
                  <TextField
                    size="small"
                    required
                    label={isGu ? 'કેટેગરી નામ (English Name) *' : 'Category Name (English) *'}
                    placeholder="e.g. Electricity & Power Bill"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <TextField
                    size="small"
                    label={isGu ? 'ગુજરાતી નામ (Gujarati Name)' : 'Gujarati Name'}
                    placeholder="દા.ત. લાઈટ બિલ / વીજળી ખર્ચ"
                    value={formData.gujaratiName}
                    onChange={(e) => setFormData({ ...formData, gujaratiName: e.target.value })}
                  />
                </Box>

                {/* 3. COLOR SELECTION & PREVIEW */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 0.8, textTransform: 'uppercase' }}>
                    {isGu ? 'બેજ કલર પસંદ કરો (Badge Color)' : 'Select Badge Color'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    {PRESET_COLORS.map((c) => {
                      const isSelected = formData.color.toLowerCase() === c.hex.toLowerCase();
                      return (
                        <Tooltip key={c.hex} title={c.label}>
                          <Box
                            onClick={() => setFormData((prev) => ({ ...prev, color: c.hex }))}
                            sx={{
                              width: 30,
                              height: 30,
                              borderRadius: '50%',
                              bgcolor: c.hex,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: isSelected ? '3px solid #ffffff' : '2px solid transparent',
                              outline: isSelected ? `2px solid ${c.hex}` : 'none',
                              boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                              transition: 'transform 0.15s ease',
                              '&:hover': { transform: 'scale(1.15)' },
                            }}
                          >
                            {isSelected && <CheckIcon sx={{ color: '#ffffff', fontSize: '16px' }} />}
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Box>
                </Box>

                {/* 4. DESCRIPTION & LIVE PREVIEW */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2, mb: 2, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    label={isGu ? 'વિગત / નોંધ (Description)' : 'Description / Remarks'}
                    placeholder="e.g. Factory electricity GEB tariff"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                  <Box
                    sx={{
                      p: 1.2,
                      borderRadius: 2,
                      border: `1px dashed ${mode === 'dark' ? '#475569' : '#cbd5e1'}`,
                      bgcolor: mode === 'dark' ? '#0f172a' : '#ffffff',
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                      {isGu ? 'લાઇવ પ્રીવ્યૂ' : 'Live Preview'}:
                    </Typography>
                    <Chip
                      label={formData.gujaratiName || formData.name || 'Category'}
                      size="small"
                      sx={{
                        fontWeight: 800,
                        fontSize: '0.74rem',
                        bgcolor: formData.color,
                        color: '#ffffff',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                      }}
                    />
                  </Box>
                </Box>

                {/* ACTION BUTTONS */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, pt: 1 }}>
                  <Button variant="outlined" size="small" onClick={handleCloseForm} sx={{ fontWeight: 700 }}>
                    {isGu ? 'રદ કરો (Cancel)' : 'Cancel'}
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    size="small"
                    startIcon={<CheckIcon />}
                    sx={{
                      fontWeight: 800,
                      px: 2.5,
                      bgcolor: editingCategory ? 'primary.main' : 'success.main',
                      '&:hover': {
                        bgcolor: editingCategory ? 'primary.dark' : 'success.dark',
                      },
                    }}
                  >
                    {editingCategory
                      ? (isGu ? 'અપડેટ કરો (Update)' : 'Update Category')
                      : (isGu ? 'સેવ કરો (Save Category)' : 'Save Category')}
                  </Button>
                </Box>
              </Box>
            </Card>
          )}

          {/* SEARCH, FILTER TABS & ADD BUTTON */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 1.5,
              mb: 2.5,
            }}
          >
            {/* Filter Tabs */}
            <ToggleButtonGroup
              value={filterType}
              exclusive
              onChange={(_, val) => {
                if (val) setFilterType(val);
              }}
              size="small"
              sx={{
                bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9',
                p: 0.4,
                borderRadius: '8px',
                '& .MuiToggleButton-root': {
                  border: 'none',
                  borderRadius: '6px !important',
                  py: 0.6,
                  px: 1.5,
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  textTransform: 'none',
                },
              }}
            >
              <ToggleButton value="All">{isGu ? 'બધા (All)' : 'All'}</ToggleButton>
              <ToggleButton value="Credit" sx={{ color: '#16a34a', '&.Mui-selected': { bgcolor: '#16a34a !important', color: '#fff !important' } }}>
                {isGu ? '🟢 Credit (આવક)' : '🟢 Credit'}
              </ToggleButton>
              <ToggleButton value="Debit" sx={{ color: '#dc2626', '&.Mui-selected': { bgcolor: '#dc2626 !important', color: '#fff !important' } }}>
                {isGu ? '🔴 Debit (જાવક)' : '🔴 Debit'}
              </ToggleButton>
              <ToggleButton value="Both" sx={{ color: '#9333ea', '&.Mui-selected': { bgcolor: '#9333ea !important', color: '#fff !important' } }}>
                {isGu ? '🟣 Both (બંને)' : '🟣 Both'}
              </ToggleButton>
            </ToggleButtonGroup>

            {/* Search & Add Button */}
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder={isGu ? 'કેટેગરી શોધો...' : 'Search categories...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ width: { xs: '100%', sm: 220 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.secondary', fontSize: '18px' }} />
                    </InputAdornment>
                  ),
                }}
              />
              {!isFormOpen && (
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenAddForm()}
                  sx={{
                    py: 0.8,
                    px: 2,
                    fontWeight: 800,
                    borderRadius: '8px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isGu ? '+ નવી કેટેગરી' : '+ Add Category'}
                </Button>
              )}
            </Box>
          </Box>

          {/* CATEGORIES LIST */}
          {filteredCategories.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              {isGu
                ? 'કોઈ કેટેગરી મળી નથી. નવી કેટેગરી ઉમેરવા માટે "+ Add Category" પર ક્લિક કરો.'
                : 'No categories found matching your filter. Click "+ Add Category" to create one.'}
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
              {filteredCategories.map((cat) => {
                const usage = categoryUsageCount[cat.name] || 0;
                const isCredit = cat.type === 'Credit';
                const isDebit = cat.type === 'Debit';

                return (
                  <Card
                    key={cat.id}
                    sx={{
                      p: 1.5,
                      px: 2,
                      borderRadius: 2,
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      justifyContent: 'space-between',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: 1.5,
                      border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                      bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        boxShadow: '0 3px 12px rgba(0,0,0,0.06)',
                        borderColor: cat.color || '#3b82f6',
                      },
                    }}
                  >
                    {/* Left: Color chip & Title */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1 }}>
                      <Box
                        sx={{
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          bgcolor: cat.color || '#3b82f6',
                          flexShrink: 0,
                          boxShadow: `0 0 8px ${cat.color || '#3b82f6'}88`,
                        }}
                      />
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.9rem' }}>
                            {cat.name}
                          </Typography>
                          {cat.gujaratiName && cat.gujaratiName !== cat.name && (
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                              • {cat.gujaratiName}
                            </Typography>
                          )}
                        </Box>
                        {cat.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                            {cat.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Middle: Type chip & usage badge */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={isCredit ? (isGu ? '🟢 Credit (આવક)' : '🟢 Credit') : isDebit ? (isGu ? '🔴 Debit (જાવક)' : '🔴 Debit') : (isGu ? '🟣 Both (બંને)' : '🟣 Both')}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          fontSize: '0.7rem',
                          height: 22,
                          bgcolor: isCredit
                            ? (mode === 'dark' ? 'rgba(34,197,94,0.18)' : '#dcfce7')
                            : isDebit
                            ? (mode === 'dark' ? 'rgba(239,68,68,0.18)' : '#fee2e2')
                            : (mode === 'dark' ? 'rgba(147,51,234,0.18)' : '#f3e8ff'),
                          color: isCredit
                            ? (mode === 'dark' ? '#4ade80' : '#15803d')
                            : isDebit
                            ? (mode === 'dark' ? '#f87171' : '#b91c1c')
                            : (mode === 'dark' ? '#c084fc' : '#7e22ce'),
                        }}
                      />

                      {usage > 0 ? (
                        <Chip
                          label={`${usage} ${isGu ? 'વ્યવહાર' : 'entries'}`}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.68rem',
                            height: 22,
                            bgcolor: mode === 'dark' ? '#0f172a' : '#f1f5f9',
                            color: 'text.secondary',
                          }}
                        />
                      ) : (
                        <Chip
                          label={isGu ? 'નવો / બિનઉપયોગી' : 'Unused'}
                          size="small"
                          sx={{
                            fontWeight: 500,
                            fontSize: '0.66rem',
                            height: 20,
                            bgcolor: 'transparent',
                            color: 'text.secondary',
                            border: `1px dashed ${mode === 'dark' ? '#475569' : '#cbd5e1'}`,
                          }}
                        />
                      )}

                      {/* Right: Actions */}
                      <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                        <Tooltip title={isGu ? 'કેટેગરી સુધારો' : 'Edit Category'}>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEditForm(cat)}
                            sx={{
                              border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                              borderRadius: 1.5,
                              p: '5px',
                              color: mode === 'dark' ? '#60a5fa' : '#2563eb',
                              '&:hover': { bgcolor: mode === 'dark' ? '#334155' : '#eff6ff' },
                            }}
                          >
                            <EditIcon sx={{ fontSize: '15px' }} />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title={isGu ? 'કેટેગરી ડિલીટ કરો' : 'Delete Category'}>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(cat)}
                            sx={{
                              border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                              borderRadius: 1.5,
                              p: '5px',
                              color: mode === 'dark' ? '#f87171' : '#dc2626',
                              '&:hover': { bgcolor: mode === 'dark' ? '#334155' : '#fef2f2' },
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: '15px' }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </Card>
                );
              })}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, px: 3, bgcolor: mode === 'dark' ? '#1e293b' : '#f8fafc', borderTop: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
          <Button onClick={onClose} variant="contained" sx={{ fontWeight: 800, borderRadius: '8px', px: 3 }}>
            {isGu ? 'પૂર્ણ (Done)' : 'Close'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        title={isGu ? 'કેટેગરી ડિલીટ કરવાની ખાતરી' : 'Delete Category Confirmation'}
        message={
          categoryToDelete
            ? isGu
              ? `શું તમે ખરેખર "${categoryToDelete.name}" કેટેગરી ડિલીટ કરવા માંગો છો?${
                  (categoryUsageCount[categoryToDelete.name] || 0) > 0
                    ? ` (આ કેટેગરી ${categoryUsageCount[categoryToDelete.name]} વ્યવહારોમાં ઉપયોગમાં છે)`
                    : ''
                }`
              : `Are you sure you want to delete "${categoryToDelete.name}"?${
                  (categoryUsageCount[categoryToDelete.name] || 0) > 0
                    ? ` (Note: Used in ${categoryUsageCount[categoryToDelete.name]} transaction records)`
                    : ''
                }`
            : ''
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setCategoryToDelete(null);
        }}
      />
    </>
  );
};
