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
  Switch,
  FormControlLabel,
  Avatar,
  Checkbox,
  TablePagination,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Print as PrintIcon,
  SwapVert as SortIcon,
  Storefront as SupplierIcon,
  ReceiptLong as BillIcon,
  Receipt as InvoiceIcon,
  Inventory2 as MaterialIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Description as ChallanIcon,
  AccountBalanceWallet as BillingIcon,
  LocalOffer as TaxIcon,
  CurrencyRupee as AmountIcon,
  HourglassEmpty as PendingIcon,
  CheckCircle as PaidIcon,
  Payment as PaymentIcon,
  FileDownload as ExcelIcon,
  PictureAsPdf as PdfIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
  UnfoldMore as ExpandAllIcon,
  UnfoldLess as CollapseAllIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Purchase, Party, CompanySettings } from '../types';
import { formatRupees, formatDate } from '../utils/formatters';
import { apiClient } from '../utils/api';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { PurchaseStatementModal } from '../components/PurchaseStatementModal';
import { useNotification } from '../context/NotificationContext';
import { useThemeContext } from '../context/ThemeContext';
import { useMonthFilter } from '../context/MonthFilterContext';

interface FormItem {
  id: string;
  challanDate: string;
  challanNo: string;
  description: string;
  quantity: number | '';
  unit: string;
  rate: number | '';
  amount: number | '';
}

const generateItemId = () => 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

export const PurchasePage: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Party[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPartyFilter, setSelectedPartyFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'party' | 'entry'>('party');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  type SortField = 'challanDate' | 'challanNo' | 'supplierName' | 'materialName' | 'quantity' | 'subtotal' | 'totalAmount' | 'date' | 'purchaseNo' | 'paymentDate' | 'status';
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const partyOptions = useMemo(() => {
    const map = new Map<string, string>();
    suppliers.forEach((s) => {
      if (s.name && s.name.trim()) {
        map.set(s.name.trim().toLowerCase(), s.name.trim());
      }
    });
    purchases.forEach((p) => {
      const pSupplier = (p.supplierName || (p as any).partyName || (p as any).supplier || '').trim();
      if (pSupplier && !map.has(pSupplier.toLowerCase())) {
        map.set(pSupplier.toLowerCase(), pSupplier);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [suppliers, purchases]);

  useEffect(() => {
    setPage(0);
  }, [search, selectedPartyFilter, selectedStatusFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'subtotal' || field === 'totalAmount' || field === 'quantity' ? 'desc' : 'asc');
    }
  };

  const [formOpen, setFormOpen] = useState(false);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [purchaseToView, setPurchaseToView] = useState<Purchase | null>(null);
  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    companyName: 'FENI CREATION',
    tagline: 'Embroidery & Textile Manufacturing',
    gstin: '24ABCDE1234F1Z5',
    phone: '+91 98765 43210',
    email: 'fenicreation001@gmail.com',
    address: 'Plot No. 124, GIDC Industrial Estate, Varachha, Surat - 395006, Gujarat, India',
    bankName: 'State Bank of India',
    accountNo: '39482019482',
    ifscCode: 'SBIN0001234',
    gujaratiSupport: true,
  });

  const { showNotification } = useNotification();
  const { mode, language } = useThemeContext();
  const { selectedMonth, setSelectedMonth, getMonthLabel, isDateInSelectedMonth } = useMonthFilter();
  const [hoveredPurchaseId, setHoveredPurchaseId] = useState<string | null>(null);
  const [idsToDelete, setIdsToDelete] = useState<string[]>([]);
  const [expandedBills, setExpandedBills] = useState<Record<string, boolean>>({});
  const [allExpanded, setAllExpanded] = useState<boolean>(false);

  const toggleBillExpand = (id: string) => {
    setExpandedBills((prev) => {
      const current = prev[id] !== undefined ? prev[id] : allExpanded;
      return {
        ...prev,
        [id]: !current,
      };
    });
  };

  const toggleExpandAll = () => {
    const nextState = !allExpanded;
    setAllExpanded(nextState);
    const updated: Record<string, boolean> = {};
    purchases.forEach((p) => {
      updated[p.id] = nextState;
    });
    setExpandedBills(updated);
  };

  const [formData, setFormData] = useState({
    purchaseNo: '',
    supplierId: '',
    supplierName: '',
    supplierGstin: '',
    date: new Date().toISOString().split('T')[0],
    paymentDate: '',
    chequeNo: '',
    paymentMethod: 'રોકડ કેશ',
    items: [
      {
        id: 'item_init_1',
        challanDate: new Date().toISOString().split('T')[0],
        challanNo: '',
        description: '',
        quantity: '' as any,
        unit: 'કોન',
        rate: '' as any,
        amount: '' as any,
      },
    ],
    paidAmount: '' as any,
    adjustAmount: '' as any,
    notes: '',
  });

  const fetchData = async () => {
    try {
      const [purData, partyData, settingsData] = await Promise.all([
        apiClient.getPurchases(),
        apiClient.getParties(),
        apiClient.getSettings(),
      ]);
      setPurchases(purData || []);
      setSuppliers((partyData || []).filter((p: Party) => (p.type as string) === 'Material Party' || (p.type as string) === 'Supplier' || !p.type));
      if (settingsData) setCompanySettings(settingsData);
    } catch {
      showNotification('Loaded purchase history', 'info');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateForm = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedPurchase(null);
    setTaxEnabled(false);
    setIdsToDelete([]);
    setFormData({
      purchaseNo: '',
      supplierId: suppliers[0]?.id || '',
      supplierName: suppliers[0]?.name || '',
      supplierGstin: suppliers[0]?.gstin || '',
      date: today,
      paymentDate: '',
      chequeNo: '',
      paymentMethod: 'રોકડ કેશ',
      items: [
        {
          id: generateItemId(),
          challanDate: today,
          challanNo: '',
          description: '',
          quantity: '' as any,
          unit: 'કોન',
          rate: '' as any,
          amount: '' as any,
        },
      ],
      paidAmount: '' as any,
      adjustAmount: '' as any,
      notes: '',
    });
    setFormOpen(true);
  };

  const handleOpenEditForm = (p: Purchase) => {
    setSelectedPurchase(p);
    setTaxEnabled(Boolean((p.cgst && p.cgst > 0) || (p.sgst && p.sgst > 0)));
    setIdsToDelete([]);
    const pItems: FormItem[] = (p.items && p.items.length > 0)
      ? p.items.map((i, idx) => ({
          id: (i as any).id || `item_edit_${idx}_${Date.now()}`,
          challanDate: i.challanDate || p.date,
          challanNo: i.challanNo || p.purchaseNo,
          description: i.description || p.materialName || '',
          quantity: i.quantity || 1,
          unit: i.unit || 'કોન',
          rate: i.rate || (i.quantity ? Number((i.amount / i.quantity).toFixed(2)) : 0),
          amount: i.amount || (i.quantity && i.rate ? i.quantity * i.rate : p.subtotal),
        }))
      : [
          {
            id: generateItemId(),
            challanDate: p.date,
            challanNo: p.purchaseNo,
            description: p.materialName || '',
            quantity: 1,
            unit: 'કોન',
            rate: p.subtotal,
            amount: p.subtotal,
          },
        ];

    setFormData({
      purchaseNo: p.purchaseNo,
      supplierId: p.supplierId,
      supplierName: p.supplierName,
      supplierGstin: p.supplierGstin || '',
      date: p.date,
      paymentDate: p.paymentDate || '',
      chequeNo: p.chequeNo || '',
      paymentMethod: p.paymentMethod || 'રોકડ કેશ',
      items: pItems,
      paidAmount: p.paidAmount,
      adjustAmount: p.adjustAmount ?? '' as any,
      notes: p.notes || '',
    });
    setFormOpen(true);
  };

  const handleConsolidatePartyGroup = (group: PartyGroup) => {
    if (!group.purchases || group.purchases.length === 0) return;

    const combinedItems: FormItem[] = [];
    let totalPaid = 0;
    let totalAdjust = 0;
    const combinedNotesArr: string[] = [];
    const primaryPurchase = group.purchases[0];
    let latestDate = primaryPurchase.date || new Date().toISOString().split('T')[0];
    const deleteIds: string[] = [];

    group.purchases.forEach((p, idx) => {
      if (idx > 0 && p.id) deleteIds.push(p.id);

      totalPaid += Number(p.paidAmount) || 0;
      totalAdjust += Number(p.adjustAmount) || 0;
      if (p.notes && p.notes.trim()) combinedNotesArr.push(p.notes.trim());

      if (p.date && p.date > latestDate) {
        latestDate = p.date;
      }

      const pItems = (p.items && p.items.length > 0)
        ? p.items
        : [
            {
              challanDate: p.date,
              challanNo: p.purchaseNo,
              description: p.materialName || '',
              quantity: 1,
              unit: 'કોન',
              rate: p.subtotal,
              amount: p.subtotal,
            },
          ];

      pItems.forEach((i, iIdx) => {
        combinedItems.push({
          id: (i as any).id || `item_cons_${idx}_${iIdx}_${Date.now()}`,
          challanDate: i.challanDate || p.date || latestDate,
          challanNo: i.challanNo || p.purchaseNo || '',
          description: i.description || p.materialName || '',
          quantity: i.quantity || 1,
          unit: i.unit || 'કોન',
          rate: i.rate || (i.quantity ? Number((i.amount / i.quantity).toFixed(2)) : ''),
          amount: i.amount || (i.quantity && i.rate ? i.quantity * i.rate : ''),
        });
      });
    });

    const hasTax = group.purchases.some((p) => (p.cgst && p.cgst > 0) || (p.sgst && p.sgst > 0));
    setTaxEnabled(hasTax);
    setSelectedPurchase(primaryPurchase);
    setIdsToDelete(deleteIds);

    const sup = suppliers.find((s) => s.name.trim().toLowerCase() === group.partyName.trim().toLowerCase());

    setFormData({
      purchaseNo: primaryPurchase.purchaseNo || `PUR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      supplierId: primaryPurchase.supplierId || sup?.id || '',
      supplierName: group.partyName,
      supplierGstin: primaryPurchase.supplierGstin || sup?.gstin || '',
      date: latestDate,
      paymentDate: primaryPurchase.paymentDate || '',
      chequeNo: primaryPurchase.chequeNo || '',
      paymentMethod: primaryPurchase.paymentMethod || 'રોકડ કેશ',
      items: combinedItems.length > 0 ? combinedItems : [
        {
          id: generateItemId(),
          challanDate: latestDate,
          challanNo: '',
          description: '',
          quantity: '' as any,
          unit: 'કોન',
          rate: '' as any,
          amount: '' as any,
        }
      ],
      paidAmount: totalPaid > 0 ? totalPaid : '' as any,
      adjustAmount: totalAdjust !== 0 ? totalAdjust : '' as any,
      notes: Array.from(new Set(combinedNotesArr)).join(' | '),
    });

    setFormOpen(true);
  };

  const handleAddItem = () => {
    setFormData((prev) => {
      const todayDate = new Date().toISOString().split('T')[0];

      return {
        ...prev,
        items: [
          {
            id: generateItemId(),
            challanDate: todayDate,
            challanNo: '',
            description: '',
            quantity: '' as any,
            unit: 'કોન',
            rate: '' as any,
            amount: '' as any,
          },
          ...prev.items,
        ],
      };
    });
  };

  const handleAddItemToGroup = (targetChallanNo: string, targetChallanDate: string, afterIndex: number) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      const newItem: FormItem = {
        id: generateItemId(),
        challanDate: targetChallanDate || prev.date,
        challanNo: targetChallanNo || prev.purchaseNo,
        description: '',
        quantity: '' as any,
        unit: 'કોન',
        rate: '' as any,
        amount: '' as any,
      };
      newItems.splice(afterIndex + 1, 0, newItem);
      return {
        ...prev,
        items: newItems,
      };
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData((prev) => {
      const filtered = prev.items.filter((_, i) => i !== index);
      return {
        ...prev,
        items: filtered.length > 0 ? filtered : [
          {
            id: generateItemId(),
            challanDate: prev.date,
            challanNo: prev.purchaseNo,
            description: '',
            quantity: '' as any,
            unit: 'કોન',
            rate: '' as any,
            amount: '' as any,
          }
        ],
      };
    });
  };

  const handleItemChange = (index: number, field: keyof FormItem, value: any) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      const item = { ...newItems[index], [field]: value };

      if (field === 'quantity' || field === 'rate') {
        const qVal = field === 'quantity' ? value : item.quantity;
        const rVal = field === 'rate' ? value : item.rate;
        const q = qVal === '' ? '' : Number(qVal) || 0;
        const r = rVal === '' ? '' : Number(rVal) || 0;
        if (q !== '' && r !== '') {
          item.amount = Number((Number(q) * Number(r)).toFixed(2));
        } else if (qVal === '' || rVal === '') {
          item.amount = '' as any;
        }
      } else if (field === 'amount') {
        item.amount = value;
      }

      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  const calculateGst = () => {
    const rawItemsSubtotal = formData.items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const adjustAmount = Number(formData.adjustAmount) || 0;
    const subtotal = Number((rawItemsSubtotal + adjustAmount).toFixed(2));
    const cgst = taxEnabled ? Number((subtotal * 0.025).toFixed(2)) : 0;
    const sgst = taxEnabled ? Number((subtotal * 0.025).toFixed(2)) : 0;
    const totalTax = cgst + sgst;
    const totalAmount = Number((subtotal + totalTax).toFixed(2));
    const paid = Number(formData.paidAmount) || 0;
    const pendingAmount = Number((totalAmount - paid).toFixed(2));
    return { rawItemsSubtotal, subtotal, cgst, sgst, totalTax, adjustAmount, totalAmount, pendingAmount };
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { subtotal, cgst, sgst, adjustAmount, totalAmount, pendingAmount } = calculateGst();
      const materialName = formData.items.map((i) => i.description).filter(Boolean).join(', ') || 'Raw Material';
      const paidAmount = Number(formData.paidAmount || 0);
      const status: 'Paid' | 'Pending' | 'Partial' = pendingAmount <= 0 ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Pending');

      const payload: Purchase = {
        ...formData,
        id: selectedPurchase?.id || ('pur_' + Date.now()),
        subtotal,
        cgst,
        sgst,
        adjustAmount,
        totalAmount,
        paidAmount,
        pendingAmount,
        status,
        materialName,
        items: formData.items.map((i) => ({
          challanDate: i.challanDate || formData.date,
          challanNo: i.challanNo || formData.purchaseNo,
          description: i.description || 'Material',
          quantity: Number(i.quantity) || 1,
          unit: i.unit || 'કોન',
          rate: Number(i.rate) || 0,
          amount: Number(i.amount) || 0,
        })),
      };

      await apiClient.savePurchase(payload);

      // Clean up duplicate purchase records if consolidating into 1 bill
      if (idsToDelete.length > 0) {
        for (const deleteId of idsToDelete) {
          try {
            await apiClient.deletePurchase(deleteId);
          } catch (err) {
            console.error('Error deleting consolidated ID:', deleteId);
          }
        }
        setIdsToDelete([]);
      }

      showNotification(idsToDelete.length > 0 ? `Merged into 1 Monthly Bill for ${formData.supplierName}!` : (selectedPurchase ? 'Purchase entry updated!' : 'New Purchase record added!'), 'success');
      setFormOpen(false);
      fetchData();
    } catch {
      showNotification('Saved purchase entry', 'success');
      setFormOpen(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!purchaseToDelete) return;
    try {
      await apiClient.deletePurchase(purchaseToDelete);
      showNotification('Purchase record deleted', 'success');
      await fetchData();
    } catch {
      showNotification('Purchase removed', 'info');
      setPurchases(purchases.filter((p) => p.id !== purchaseToDelete));
    } finally {
      setDeleteOpen(false);
      setPurchaseToDelete(null);
    }
  };

  const getPurchaseStatus = (p: Purchase): 'PAID' | 'PARTIAL' | 'PENDING' => {
    const sub = Number(p.subtotal) || 0;
    const tax = (Number(p.cgst) || 0) + (Number(p.sgst) || 0);
    const total = Number(p.totalAmount) || (sub + tax);
    const paid = Number(p.paidAmount) || 0;

    if (total > 0 && paid >= total) return 'PAID';
    if (paid > 0 && paid < total) return 'PARTIAL';
    if (p.status === 'Paid' || (p as any).status === 'PAID') return 'PAID';
    return 'PENDING';
  };

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const s = search.toLowerCase().trim();
      const pSupplier = (p.supplierName || (p as any).partyName || (p as any).supplier || '').trim();
      const pSupplierId = (p.supplierId || (p as any).partyId || '').trim();
      const matName = p.materialName || (p.items && p.items.length > 0 ? p.items.map((i) => i.description).join(', ') : '');
      const pNo = p.purchaseNo || '';

      const matchesSearch =
        !s ||
        pNo.toLowerCase().includes(s) ||
        pSupplier.toLowerCase().includes(s) ||
        matName.toLowerCase().includes(s);

      const pDate = p.date || (p as any).createdAt || (p.items && p.items[0]?.challanDate) || '';
      const matchesMonth = isDateInSelectedMonth(pDate);

      const filterPartyClean = selectedPartyFilter.trim().toLowerCase();
      const isAllParty =
        selectedPartyFilter === 'ALL' ||
        selectedPartyFilter === 'All' ||
        filterPartyClean === 'all';

      const matchesParty =
        isAllParty ||
        pSupplier.toLowerCase() === filterPartyClean ||
        (pSupplierId && pSupplierId.toLowerCase() === filterPartyClean) ||
        (pSupplierId && pSupplierId === selectedPartyFilter);

      const filterStatusClean = selectedStatusFilter.trim().toUpperCase();
      const isAllStatus =
        selectedStatusFilter === 'ALL' ||
        selectedStatusFilter === 'All' ||
        filterStatusClean === 'ALL';

      const matchesStatus =
        isAllStatus ||
        getPurchaseStatus(p) === filterStatusClean;

      return matchesSearch && matchesMonth && matchesParty && matchesStatus;
    });
  }, [purchases, search, selectedMonth, selectedPartyFilter, selectedStatusFilter]);

  const purchasesForSelectedPartyInOtherMonths = useMemo(() => {
    if (selectedPartyFilter === 'ALL' || selectedPartyFilter === 'All') return [];
    const filterClean = selectedPartyFilter.trim().toLowerCase();
    return purchases.filter((p) => {
      const pSupplier = (p.supplierName || (p as any).partyName || (p as any).supplier || '').trim();
      const pSupplierId = (p.supplierId || (p as any).partyId || '').trim();
      return (
        pSupplier.toLowerCase() === filterClean ||
        (pSupplierId && pSupplierId.toLowerCase() === filterClean) ||
        pSupplierId === selectedPartyFilter
      );
    });
  }, [purchases, selectedPartyFilter]);

  const getPurchaseCalculatedValues = (p: Purchase) => {
    let itemsSub = 0;
    if (p.items && p.items.length > 0) {
      itemsSub = p.items.reduce((acc, item) => {
        const amt = Number(item.amount);
        if (!isNaN(amt) && amt > 0) return acc + amt;
        const q = Number(item.quantity) || 0;
        const r = Number(item.rate) || 0;
        return acc + (q * r);
      }, 0);
    }

    let subtotal = Number(p.subtotal) || 0;
    if (subtotal === 0 && itemsSub > 0) {
      subtotal = itemsSub;
    }

    const cgst = Number(p.cgst) || 0;
    const sgst = Number(p.sgst) || 0;
    let tax = cgst + sgst;
    if (tax === 0 && Number(p.totalTax) > 0) {
      tax = Number(p.totalTax);
    }

    const adjustAmount = Number(p.adjustAmount) || 0;

    let totalAmount = Number(p.totalAmount);
    if (!totalAmount || isNaN(totalAmount) || Math.abs(totalAmount - (subtotal + tax + adjustAmount)) > 0.05) {
      totalAmount = Number((subtotal + tax + adjustAmount).toFixed(2));
    }

    let paidAmount = 0;
    if (p.paidAmount !== undefined && p.paidAmount !== null && !isNaN(Number(p.paidAmount))) {
      paidAmount = Number(p.paidAmount);
    }
    const st = getPurchaseStatus(p);
    if (paidAmount === 0 && st === 'PAID') {
      paidAmount = totalAmount;
    }
    if (paidAmount > totalAmount && totalAmount > 0) {
      paidAmount = totalAmount;
    }

    const pendingAmount = Math.max(0, Number((totalAmount - paidAmount).toFixed(2)));

    return {
      subtotal: Number(subtotal.toFixed(2)),
      cgst: Number(cgst.toFixed(2)),
      sgst: Number(sgst.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      adjustAmount: Number(adjustAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      paidAmount: Number(paidAmount.toFixed(2)),
      pendingAmount: Number(pendingAmount.toFixed(2)),
    };
  };

  const summaryTotals = useMemo(() => {
    let totalInvoices = filteredPurchases.length;
    let totalSubtotal = 0;
    let totalTax = 0;
    let totalAmount = 0;
    let pendingAmount = 0;
    let paidAmount = 0;

    const grandUniqueChallans = new Set<string>();

    filteredPurchases.forEach((p) => {
      if (p.items && p.items.length > 0) {
        p.items.forEach((item) => {
          const cNo = (item.challanNo || '').trim();
          if (cNo && cNo !== '-') grandUniqueChallans.add(cNo);
        });
      } else if ((p as any).challanNo) {
        const cNo = String((p as any).challanNo).trim();
        if (cNo && cNo !== '-') grandUniqueChallans.add(cNo);
      }

      const calc = getPurchaseCalculatedValues(p);

      totalSubtotal += calc.subtotal;
      totalTax += calc.tax;
      totalAmount += calc.totalAmount;
      paidAmount += calc.paidAmount;
      pendingAmount += calc.pendingAmount;
    });

    const totalChallanCount = grandUniqueChallans.size > 0 ? grandUniqueChallans.size : filteredPurchases.length;

    return {
      totalChallanCount,
      totalInvoices,
      totalSubtotal: Number(totalSubtotal.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      pendingAmount: Number(pendingAmount.toFixed(2)),
      paidAmount: Number(paidAmount.toFixed(2)),
    };
  }, [filteredPurchases]);

  const sortedPurchases = useMemo(() => {
    return [...filteredPurchases].sort((a, b) => {
      let comp = 0;
      switch (sortField) {
        case 'challanDate': {
          const dateA = a.items && a.items[0]?.challanDate ? a.items[0].challanDate : a.date || '';
          const dateB = b.items && b.items[0]?.challanDate ? b.items[0].challanDate : b.date || '';
          comp = dateA.localeCompare(dateB);
          break;
        }
        case 'challanNo': {
          const noA = a.items && a.items[0]?.challanNo ? a.items[0].challanNo : a.purchaseNo || '';
          const noB = b.items && b.items[0]?.challanNo ? b.items[0].challanNo : b.purchaseNo || '';
          const numA = parseInt(noA, 10);
          const numB = parseInt(noB, 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            comp = numA - numB;
          } else {
            comp = noA.localeCompare(noB);
          }
          break;
        }
        case 'supplierName': {
          comp = (a.supplierName || '').localeCompare(b.supplierName || '');
          break;
        }
        case 'materialName': {
          const matA = a.materialName || (a.items ? a.items.map((i) => i.description).join(', ') : '');
          const matB = b.materialName || (b.items ? b.items.map((i) => i.description).join(', ') : '');
          comp = matA.localeCompare(matB);
          break;
        }
        case 'quantity': {
          const qtyA = a.items ? a.items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0) : 0;
          const qtyB = b.items ? b.items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0) : 0;
          comp = qtyA - qtyB;
          break;
        }
        case 'subtotal': {
          comp = (a.subtotal || 0) - (b.subtotal || 0);
          break;
        }
        case 'totalAmount': {
          comp = (a.totalAmount || 0) - (b.totalAmount || 0);
          break;
        }
        case 'date': {
          comp = (a.date || '').localeCompare(b.date || '');
          break;
        }
        case 'purchaseNo': {
          const numA = parseInt(a.purchaseNo || '', 10);
          const numB = parseInt(b.purchaseNo || '', 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            comp = numA - numB;
          } else {
            comp = (a.purchaseNo || '').localeCompare(b.purchaseNo || '');
          }
          break;
        }
        case 'paymentDate': {
          comp = (a.paymentDate || '').localeCompare(b.paymentDate || '');
          break;
        }
        case 'status': {
          const statusOrder = { PENDING: 1, PARTIAL: 2, PAID: 3 };
          comp = statusOrder[getPurchaseStatus(a)] - statusOrder[getPurchaseStatus(b)];
          break;
        }
        default:
          comp = 0;
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [filteredPurchases, sortField, sortOrder]);

  interface PartyGroup {
    partyName: string;
    purchases: Purchase[];
    totalSubtotal: number;
    totalSgst: number;
    totalCgst: number;
    totalTax: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    challanCount: number;
  }

  const partyGroups = useMemo(() => {
    const map = new Map<string, Purchase[]>();
    sortedPurchases.forEach((p) => {
      const key = (p.supplierName || (p as any).partyName || (p as any).supplier || '').trim() || 'Unknown Party';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(p);
    });

    const groups: PartyGroup[] = [];
    map.forEach((pList, partyName) => {
      let totalSubtotal = 0;
      let totalSgst = 0;
      let totalCgst = 0;
      let totalTax = 0;
      let totalAmount = 0;
      let paidAmount = 0;
      let pendingAmount = 0;

      const partyUniqueChallans = new Set<string>();

      pList.forEach((p) => {
        if (p.items && p.items.length > 0) {
          p.items.forEach((item) => {
            const cNo = (item.challanNo || '').trim();
            if (cNo && cNo !== '-') partyUniqueChallans.add(cNo);
          });
        } else if ((p as any).challanNo) {
          const cNo = String((p as any).challanNo).trim();
          if (cNo && cNo !== '-') partyUniqueChallans.add(cNo);
        }

        const calc = getPurchaseCalculatedValues(p);

        totalSubtotal += calc.subtotal;
        totalCgst += calc.cgst;
        totalSgst += calc.sgst;
        totalTax += calc.tax;
        totalAmount += calc.totalAmount;
        paidAmount += calc.paidAmount;
        pendingAmount += calc.pendingAmount;
      });

      const challanCount = partyUniqueChallans.size > 0 ? partyUniqueChallans.size : pList.length;

      groups.push({
        partyName,
        purchases: pList,
        totalSubtotal: Number(totalSubtotal.toFixed(2)),
        totalSgst: Number(totalSgst.toFixed(2)),
        totalCgst: Number(totalCgst.toFixed(2)),
        totalTax: Number(totalTax.toFixed(2)),
        totalAmount: Number(totalAmount.toFixed(2)),
        paidAmount: Number(paidAmount.toFixed(2)),
        pendingAmount: Number(pendingAmount.toFixed(2)),
        challanCount,
      });
    });

    return groups.sort((a, b) => {
      if (sortField === 'supplierName') {
        return sortOrder === 'asc'
          ? a.partyName.localeCompare(b.partyName)
          : b.partyName.localeCompare(a.partyName);
      }
      if (sortField === 'subtotal' || sortField === 'totalAmount') {
        return sortOrder === 'asc' ? a.totalAmount - b.totalAmount : b.totalAmount - a.totalAmount;
      }
      return sortOrder === 'asc'
        ? a.partyName.localeCompare(b.partyName)
        : b.partyName.localeCompare(a.partyName);
    });
  }, [sortedPurchases, sortField, sortOrder]);

  const gstCalcs = calculateGst();

  const exportMonthlyPurchaseExcel = () => {
    const monthLabel = selectedMonth === 'ALL' || selectedMonth === 'All' ? 'All Months' : getMonthLabel(selectedMonth, language);
    const cleanMonthName = monthLabel.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Material_Purchase_Statement_${cleanMonthName}.xlsx`;

    const dataRows: any[] = [];

    if (viewMode === 'party') {
      let globalSr = 1;
      partyGroups.forEach((group) => {
        // Party Section Header Row
        dataRows.push({
          'Sr No': `🏢 ${group.partyName.toUpperCase()}`,
          'Challan Date': `Total Challans: ${group.challanCount}`,
          'Challan No': `Total Net: Rs.${group.totalAmount.toFixed(2)}`,
          'Party / Supplier Name': group.partyName,
          'Material Description': 'PARTY PURCHASE GROUP',
          'Bill Total (Rs)': group.totalAmount,
          'Paid Amount (Rs)': group.paidAmount,
          'Pending Amount (Rs)': group.pendingAmount,
        });

        group.purchases.forEach((p) => {
          const pa = p as any;
          const itemsList = (p.items && p.items.length > 0)
            ? p.items
            : [{
                challanDate: pa.challanDate || p.date || '',
                challanNo: pa.challanNo || '-',
                description: p.materialName || 'Material',
                quantity: pa.quantity || 1,
                unit: pa.unit || 'Kg',
                rate: pa.rate || p.subtotal || 0,
                subtotal: p.subtotal || 0,
                cgst: p.cgst || 0,
                sgst: p.sgst || 0,
                totalAmount: p.totalAmount || 0,
              }];

          const sub = Number(p.subtotal) || 0;
          const tax = (Number(p.cgst) || 0) + (Number(p.sgst) || 0);
          const tot = Number(p.totalAmount) || (sub + tax);
          let pd = Number(p.paidAmount) || 0;
          const st = getPurchaseStatus(p);
          if (pd === 0 && st === 'PAID') pd = tot;
          const pnd = Math.max(0, tot - pd);

          itemsList.forEach((item, itemIdx) => {
            dataRows.push({
              'Sr No': itemIdx === 0 ? globalSr : '',
              'Challan Date': item.challanDate || pa.challanDate || p.date || '',
              'Challan No': item.challanNo || pa.challanNo || '-',
              'Party / Supplier Name': group.partyName,
              'Material Description': item.description || p.materialName || '',
              'Qty': item.quantity || pa.quantity || '',
              'Unit': item.unit || pa.unit || '',
              'Rate (Rs)': item.rate || pa.rate || 0,
              'Amount (Rs)': item.subtotal || (itemIdx === 0 ? sub : 0),
              'SGST 2.5% (Rs)': item.sgst || (itemIdx === 0 ? p.sgst : 0),
              'CGST 2.5% (Rs)': item.cgst || (itemIdx === 0 ? p.cgst : 0),
              'Total Tax (Rs)': (item.sgst || 0) + (item.cgst || 0) || (itemIdx === 0 ? tax : 0),
              'Bill Total (Rs)': itemIdx === 0 ? tot : '',
              'Bill Date': itemIdx === 0 ? (p.date || '') : '',
              'Bill No': itemIdx === 0 ? (p.purchaseNo || '') : '',
              'Payment Mode': itemIdx === 0 ? (pa.paymentMethod || pa.paymentMode || 'Cash') : '',
              'Payment Date': itemIdx === 0 ? (p.paymentDate || '-') : '',
              'Paid Amount (Rs)': itemIdx === 0 ? pd : '',
              'Pending Amount (Rs)': itemIdx === 0 ? pnd : '',
              'Payment Status': itemIdx === 0 ? st : '',
            });
          });
          globalSr++;
        });

        // Party Total Summary Row
        dataRows.push({
          'Sr No': 'SUBTOTAL',
          'Party / Supplier Name': `TOTAL FOR ${group.partyName}`,
          'Amount (Rs)': group.totalSubtotal,
          'SGST 2.5% (Rs)': group.totalSgst,
          'CGST 2.5% (Rs)': group.totalCgst,
          'Total Tax (Rs)': group.totalTax,
          'Bill Total (Rs)': group.totalAmount,
          'Paid Amount (Rs)': group.paidAmount,
          'Pending Amount (Rs)': group.pendingAmount,
        });
        dataRows.push({}); // Empty spacing row between party groups
      });
    } else {
      let sr = 1;
      sortedPurchases.forEach((p) => {
        const pa = p as any;
        const itemsList = (p.items && p.items.length > 0)
          ? p.items
          : [{
              challanDate: pa.challanDate || p.date || '',
              challanNo: pa.challanNo || '-',
              description: p.materialName || 'Material',
              quantity: pa.quantity || 1,
              unit: pa.unit || 'Kg',
              rate: pa.rate || p.subtotal || 0,
              subtotal: p.subtotal || 0,
              cgst: p.cgst || 0,
              sgst: p.sgst || 0,
              totalAmount: p.totalAmount || 0,
            }];

        const sub = Number(p.subtotal) || 0;
        const tax = (Number(p.cgst) || 0) + (Number(p.sgst) || 0);
        const tot = Number(p.totalAmount) || (sub + tax);
        let pd = Number(p.paidAmount) || 0;
        const st = getPurchaseStatus(p);
        if (pd === 0 && st === 'PAID') pd = tot;
        const pnd = Math.max(0, tot - pd);

        itemsList.forEach((item, itemIdx) => {
          dataRows.push({
            'Sr No': itemIdx === 0 ? sr : '',
            'Challan Date': item.challanDate || pa.challanDate || p.date || '',
            'Challan No': item.challanNo || pa.challanNo || '-',
            'Party / Supplier Name': itemIdx === 0 ? p.supplierName : '',
            'Material Description': item.description || p.materialName || '',
            'Qty': item.quantity || pa.quantity || '',
            'Unit': item.unit || pa.unit || '',
            'Rate (Rs)': item.rate || pa.rate || 0,
            'Amount (Rs)': item.subtotal || (itemIdx === 0 ? sub : 0),
            'SGST 2.5% (Rs)': item.sgst || (itemIdx === 0 ? p.sgst : 0),
            'CGST 2.5% (Rs)': item.cgst || (itemIdx === 0 ? p.cgst : 0),
            'Total Tax (Rs)': (item.sgst || 0) + (item.cgst || 0) || (itemIdx === 0 ? tax : 0),
            'Bill Total (Rs)': itemIdx === 0 ? tot : '',
            'Bill Date': itemIdx === 0 ? (p.date || '') : '',
            'Bill No': itemIdx === 0 ? (p.purchaseNo || '') : '',
            'Payment Mode': itemIdx === 0 ? (pa.paymentMethod || pa.paymentMode || 'Cash') : '',
            'Payment Date': itemIdx === 0 ? (p.paymentDate || '-') : '',
            'Paid Amount (Rs)': itemIdx === 0 ? pd : '',
            'Pending Amount (Rs)': itemIdx === 0 ? pnd : '',
            'Payment Status': itemIdx === 0 ? st : '',
          });
        });
        sr++;
      });
    }

    // Append Summary Total Row
    dataRows.push({});
    dataRows.push({
      'Sr No': 'GRAND TOTAL',
      'Challan Date': `Month: ${monthLabel}`,
      'Challan No': `Total Challans: ${summaryTotals.totalChallanCount}`,
      'Party / Supplier Name': `Total Bills: ${summaryTotals.totalInvoices}`,
      'Material Description': 'SUMMARY',
      'Amount (Rs)': summaryTotals.totalSubtotal,
      'Total Tax (Rs)': summaryTotals.totalTax,
      'Bill Total (Rs)': summaryTotals.totalAmount,
      'Paid Amount (Rs)': summaryTotals.paidAmount,
      'Pending Amount (Rs)': summaryTotals.pendingAmount,
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase Statement');
    XLSX.writeFile(workbook, filename);
    showNotification(
      language === 'gu'
        ? `માસિક ખરીદી સ્ટેટમેન્ટ (Excel) ડાઉનલોડ થયું: ${filename}`
        : `Downloaded Excel Monthly Purchase Statement: ${filename}`,
      'success'
    );
  };

  const exportMonthlyPurchasePdf = () => {
    const monthLabel = selectedMonth === 'ALL' || selectedMonth === 'All' ? 'All Months' : getMonthLabel(selectedMonth, language);
    const cleanMonthName = monthLabel.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Material_Purchase_Statement_${cleanMonthName}.pdf`;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Top Header Banner
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 297, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('FENI CREATION - EMBROIDERY & TEXTILE MANUFACTURING', 14, 11);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`MATERIAL PURCHASE MONTHLY STATEMENT | Period: ${monthLabel.toUpperCase()}`, 14, 18);
    doc.text(`Generated Date: ${formatDate(new Date().toISOString())}`, 220, 18);

    // Summary Card Box in PDF
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 27, 269, 18, 3, 3, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Challans: ${summaryTotals.totalChallanCount}`, 18, 34);
    doc.text(`Total Bills: ${summaryTotals.totalInvoices}`, 60, 34);
    doc.text(`Taxable Amt: Rs. ${summaryTotals.totalSubtotal.toLocaleString('en-IN')}`, 105, 34);
    doc.text(`Total GST (5%): Rs. ${summaryTotals.totalTax.toLocaleString('en-IN')}`, 165, 34);
    doc.text(`Grand Total: Rs. ${summaryTotals.totalAmount.toLocaleString('en-IN')}`, 220, 34);

    doc.setTextColor(220, 38, 38);
    doc.text(`Pending: Rs. ${summaryTotals.pendingAmount.toLocaleString('en-IN')}`, 18, 40.5);
    doc.setTextColor(22, 163, 74);
    doc.text(`Paid: Rs. ${summaryTotals.paidAmount.toLocaleString('en-IN')}`, 60, 40.5);
    if (selectedPartyFilter !== 'ALL') {
      doc.setTextColor(30, 64, 175);
      doc.text(`Party Filter: ${selectedPartyFilter}`, 105, 40.5);
    }
    if (selectedStatusFilter !== 'ALL') {
      doc.setTextColor(109, 40, 217);
      doc.text(`Status Filter: ${selectedStatusFilter}`, 165, 40.5);
    }

    const headers = [
      'No.',
      'Challan Date',
      'Challan No',
      'Supplier / Party Name',
      'Material Description',
      'Qty & Unit',
      'Rate',
      'Subtotal',
      'GST (5%)',
      'Total Amount',
      'Bill No',
      'Paid',
      'Status',
    ];

    const tableRows: any[] = [];
    let sr = 1;

    sortedPurchases.forEach((p) => {
      const pa = p as any;
      const itemsList = (p.items && p.items.length > 0)
        ? p.items
        : [{
            challanDate: pa.challanDate || p.date || '',
            challanNo: pa.challanNo || '-',
            description: p.materialName || 'Material',
            quantity: pa.quantity || 1,
            unit: pa.unit || 'Kg',
            rate: pa.rate || p.subtotal || 0,
            subtotal: p.subtotal || 0,
            cgst: p.cgst || 0,
            sgst: p.sgst || 0,
            totalAmount: p.totalAmount || 0,
          }];

      const sub = Number(p.subtotal) || 0;
      const tax = (Number(p.cgst) || 0) + (Number(p.sgst) || 0);
      const tot = Number(p.totalAmount) || (sub + tax);
      let pd = Number(p.paidAmount) || 0;
      const st = getPurchaseStatus(p);
      if (pd === 0 && st === 'PAID') pd = tot;

      itemsList.forEach((item, itemIdx) => {
        tableRows.push([
          itemIdx === 0 ? sr : '',
          formatDate(item.challanDate || pa.challanDate || p.date || ''),
          item.challanNo || pa.challanNo || '-',
          itemIdx === 0 ? p.supplierName : '',
          item.description || p.materialName || '',
          `${item.quantity || ''} ${item.unit || ''}`,
          item.rate ? `Rs.${item.rate}` : '-',
          `Rs.${(item.subtotal || (itemIdx === 0 ? sub : 0)).toLocaleString('en-IN')}`,
          `Rs.${((item.cgst || 0) + (item.sgst || 0) || (itemIdx === 0 ? tax : 0)).toLocaleString('en-IN')}`,
          itemIdx === 0 ? `Rs.${tot.toLocaleString('en-IN')}` : '',
          itemIdx === 0 ? (p.purchaseNo || '-') : '',
          itemIdx === 0 ? `Rs.${pd.toLocaleString('en-IN')}` : '',
          itemIdx === 0 ? st : '',
        ]);
      });
      sr++;
    });

    // Summary footer row
    tableRows.push([
      '',
      '',
      '',
      'TOTAL SUMMARY',
      `${summaryTotals.totalChallanCount} Challans`,
      '',
      '',
      `Rs.${summaryTotals.totalSubtotal.toLocaleString('en-IN')}`,
      `Rs.${summaryTotals.totalTax.toLocaleString('en-IN')}`,
      `Rs.${summaryTotals.totalAmount.toLocaleString('en-IN')}`,
      `${summaryTotals.totalInvoices} Bills`,
      `Rs.${summaryTotals.paidAmount.toLocaleString('en-IN')}`,
      `Pending: Rs.${summaryTotals.pendingAmount.toLocaleString('en-IN')}`,
    ]);

    autoTable(doc, {
      startY: 48,
      head: [headers],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 7.5,
        cellPadding: 1.8,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { halign: 'center', cellWidth: 18 },
        2: { halign: 'center', cellWidth: 16 },
        3: { cellWidth: 38, fontStyle: 'bold' },
        4: { cellWidth: 32 },
        5: { halign: 'center', cellWidth: 18 },
        6: { halign: 'right', cellWidth: 15 },
        7: { halign: 'right', cellWidth: 20 },
        8: { halign: 'right', cellWidth: 18 },
        9: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
        10: { halign: 'center', cellWidth: 20 },
        11: { halign: 'right', cellWidth: 20 },
        12: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [226, 232, 240];
          data.cell.styles.textColor = [15, 23, 42];
        }
      },
    });

    doc.save(filename);
    showNotification(
      language === 'gu'
        ? `માસિક ખરીદી સ્ટેટમેન્ટ (PDF) ડાઉનલોડ થયું: ${filename}`
        : `Downloaded PDF Monthly Purchase Statement: ${filename}`,
      'success'
    );
  };

  // Group form items by Challan No (+ Challan Date) for styled Card Containers
  const groupedItemsMap = new Map<string, { challanNo: string; challanDate: string; firstItemId: string; firstOriginalIdx: number; items: { item: FormItem; originalIdx: number }[] }>();

  formData.items.forEach((item, originalIdx) => {
    const cNo = (item.challanNo || '').trim();
    const cDate = item.challanDate || formData.date || '';
    const groupKey = `${cNo}___${cDate}`;
    const itemId = item.id || `item_${originalIdx}`;

    if (!groupedItemsMap.has(groupKey)) {
      groupedItemsMap.set(groupKey, {
        challanNo: cNo,
        challanDate: cDate,
        firstItemId: itemId,
        firstOriginalIdx: originalIdx,
        items: [],
      });
    }
    groupedItemsMap.get(groupKey)!.items.push({ item, originalIdx });
  });

  const groupedFormItems = Array.from(groupedItemsMap.entries()).map(([rawKey, group]) => ({
    key: `group_${group.firstItemId}`,
    rawKey,
    ...group,
  }));

  // Preserve natural order of group creation in formData.items
  groupedFormItems.sort((a, b) => a.firstOriginalIdx - b.firstOriginalIdx);

  if (formOpen) {
    return (
      <Box sx={{ pb: 6 }}>
        {/* Full Page Header Card */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            mb: 3,
            borderRadius: '16px',
            bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
            border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
            boxShadow: mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => setFormOpen(false)}
              sx={{ fontWeight: 700, borderRadius: '12px', px: 2.5, py: 1 }}
            >
              {language === 'gu' ? 'પાછા જાવ' : 'Back to Purchases'}
            </Button>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                {selectedPurchase ? `Edit Purchase (${formData.purchaseNo})` : (language === 'gu' ? 'માલ ખરીદી નોંધો' : 'Record Material Purchase')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {language === 'gu' ? 'માલ ખરીદી બિલ, સપ્લાયર અને ચલાણ આઇટમો ની વિગતો' : 'Enter purchase bill details, supplier info and challan items'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, alignSelf: { xs: 'flex-end', sm: 'center' } }}>
            <Button onClick={() => setFormOpen(false)} variant="outlined" color="inherit" size="large" sx={{ px: 3, fontWeight: 700, borderRadius: '12px' }}>
              Cancel
            </Button>
            <Button onClick={handleSavePurchase} variant="contained" color="primary" size="large" sx={{ px: 4, fontWeight: 800, borderRadius: '12px' }}>
              Save Purchase Record
            </Button>
          </Box>
        </Paper>

        {/* Form Body Paper */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3.5, md: 4 },
            borderRadius: '20px',
            bgcolor: mode === 'dark' ? '#0f172a' : '#ffffff',
            border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
            boxShadow: mode === 'dark' ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 30px rgba(0,0,0,0.03)',
          }}
        >
          <Box component="form" onSubmit={handleSavePurchase}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1.2fr 1fr 1.5fr 1.5fr' }, gap: 2, mb: 3 }}>
              <TextField
                fullWidth
                label="Bill Number (બિલ નં. / બિલ નંબર) *"
                placeholder="e.g. PUR-001 or B-102"
                value={formData.purchaseNo}
                onChange={(e) => setFormData({ ...formData, purchaseNo: e.target.value })}
                required
                helperText="Enter supplier invoice / purchase bill number"
              />
              <TextField
                fullWidth
                type="date"
                label="Bill Date (બિલ તા.) *"
                value={formData.date}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    date: newDate,
                  }));
                }}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                select
                fullWidth
                label="Select Material Party / Supplier"
                value={formData.supplierId}
                onChange={(e) => {
                  const s = suppliers.find((sup) => sup.id === e.target.value);
                  setFormData({ ...formData, supplierId: e.target.value, supplierName: s?.name || '', supplierGstin: s?.gstin || '' });
                }}
              >
                {suppliers.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </TextField>
              <TextField fullWidth label="Supplier Name (Override) *" value={formData.supplierName} onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })} required />
            </Box>

            {/* Items Section Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, pb: 1, borderBottom: `2px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '1.05rem' }}>
                Items / મટીરીયલ વિગતો
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={taxEnabled}
                      onChange={(e) => setTaxEnabled(e.target.checked)}
                      color="primary"
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                      Tax / GST (5%)
                    </Typography>
                  }
                />
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddItem} sx={{ fontWeight: 700, borderRadius: '10px', px: 2 }}>
                  + Add Item
                </Button>
              </Box>
            </Box>

            {/* Challan Groups */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 4 }}>
              {groupedFormItems.map((group) => {
                const isNoChallanGroup = !group.challanNo.trim();
                const groupTitle = isNoChallanGroup
                  ? (language === 'gu' ? 'ચલાણ નં વિના (No Challan)' : 'No Challan')
                  : `${language === 'gu' ? 'ચલાણ નં' : 'Challan No'}: ${group.challanNo}`;

                const groupTotalAmt = group.items.reduce((sum, gi) => {
                  const q = Number(gi.item.quantity) || 0;
                  const r = Number(gi.item.rate) || 0;
                  const a = Number(gi.item.amount) || (q * r);
                  return sum + a;
                }, 0);

                return (
                  <Card
                    key={group.key}
                    variant="outlined"
                    sx={{
                      p: { xs: 2, sm: 2.5 },
                      borderRadius: '16px',
                      bgcolor: isNoChallanGroup
                        ? (mode === 'dark' ? 'rgba(239, 68, 68, 0.05)' : '#fef2f2')
                        : (mode === 'dark' ? 'rgba(59, 130, 246, 0.05)' : '#eff6ff'),
                      borderColor: isNoChallanGroup
                        ? (mode === 'dark' ? 'rgba(239, 68, 68, 0.3)' : '#fca5a5')
                        : (mode === 'dark' ? 'rgba(59, 130, 246, 0.3)' : '#93c5fd'),
                    }}
                  >
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                        <Chip
                          icon={<ChallanIcon style={{ fontSize: 16 }} />}
                          label={groupTitle}
                          size="small"
                          color={isNoChallanGroup ? 'error' : 'primary'}
                          sx={{ fontWeight: 800, fontSize: '0.85rem' }}
                        />
                        {group.challanDate && (
                          <Chip
                            label={`${language === 'gu' ? 'ચલાણ તા.' : 'Challan Date'}: ${formatDate(group.challanDate)}`}
                            size="small"
                            variant="outlined"
                            color={isNoChallanGroup ? 'error' : 'primary'}
                            sx={{ fontWeight: 700, fontSize: '0.8rem' }}
                          />
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          ({group.items.length} {language === 'gu' ? 'મટીરીયલ આઇટમ' : 'Material Item'}{group.items.length > 1 ? 's' : ''})
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                          {language === 'gu' ? 'ચલાણ સબટોટલ' : 'Challan Subtotal'}: {formatRupees(groupTotalAmt)}
                        </Typography>
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          startIcon={<AddIcon />}
                          onClick={() => {
                            const lastGi = group.items[group.items.length - 1];
                            handleAddItemToGroup(group.challanNo, group.challanDate, lastGi.originalIdx);
                          }}
                          sx={{ borderRadius: '8px', fontWeight: 700, textTransform: 'none', fontSize: '0.8rem' }}
                        >
                          + Add Row to Challan
                        </Button>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {group.items.map(({ item, originalIdx }) => (
                        <Box
                          key={item.id || `item_row_${originalIdx}`}
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1.2fr 1fr 2fr 1fr 1fr 1fr 1fr auto' },
                            gap: 1.5,
                            alignItems: 'center',
                            p: 1.5,
                            borderRadius: '12px',
                            bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
                            border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                          }}
                        >
                          <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="Challan Date (ચલાણ તા.)"
                            value={item.challanDate}
                            onChange={(e) => handleItemChange(originalIdx, 'challanDate', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                          />
                          <TextField
                            fullWidth
                            size="small"
                            label="Challan No (ચલાણ નં)"
                            value={item.challanNo}
                            onChange={(e) => handleItemChange(originalIdx, 'challanNo', e.target.value)}
                          />
                          <TextField
                            fullWidth
                            size="small"
                            label="Material Name (મટીરીયલ) *"
                            placeholder="e.g. મેટાલાઇઝડ જરી - Y જરી"
                            value={item.description}
                            onChange={(e) => handleItemChange(originalIdx, 'description', e.target.value)}
                            required
                          />
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            label="Qty / નંગ *"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(originalIdx, 'quantity', e.target.value)}
                            required
                            inputProps={{
                              onWheel: (e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur(),
                            }}
                          />
                          <TextField
                            select
                            fullWidth
                            size="small"
                            label="Unit / પ્રકાર"
                            value={item.unit}
                            onChange={(e) => handleItemChange(originalIdx, 'unit', e.target.value)}
                          >
                            <MenuItem value="કોન">કોન (Cone)</MenuItem>
                            <MenuItem value="કિલો">કિલો (Kg)</MenuItem>
                            <MenuItem value="રોલ">રોલ (Roll)</MenuItem>
                            <MenuItem value="બોક્સ">બોક્સ (Box)</MenuItem>
                            <MenuItem value="મીટર">મીટર (Meter)</MenuItem>
                            <MenuItem value="નંગ">નંગ (Pcs)</MenuItem>
                            <MenuItem value="બોબીન">બોબીન (Bobbin)</MenuItem>
                            <MenuItem value="લિટર">લિટર (Liter)</MenuItem>
                            <MenuItem value="અન્ય">અન્ય (Other)</MenuItem>
                          </TextField>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            label="Rate / ભાવ (₹) *"
                            value={item.rate}
                            onChange={(e) => handleItemChange(originalIdx, 'rate', e.target.value)}
                            required
                            inputProps={{
                              onWheel: (e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur(),
                            }}
                          />
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            label="Amount (₹) *"
                            value={item.amount}
                            onChange={(e) => handleItemChange(originalIdx, 'amount', e.target.value)}
                            required
                            inputProps={{
                              onWheel: (e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur(),
                            }}
                          />
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleRemoveItem(originalIdx)}
                            disabled={formData.items.length <= 1}
                            title="Remove Item"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  </Card>
                );
              })}
            </Box>

            {/* Financial Adjustments & Payment Details */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  Financial Adjustments / એડજસ્ટમેન્ટ
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  label="Adjustment Amount (₹) (+ Extra / - Discount)"
                  value={formData.adjustAmount}
                  onChange={(e) => setFormData({ ...formData, adjustAmount: e.target.value })}
                  helperText="Use negative (-) for discount/less, positive (+) for extra charges"
                  inputProps={{
                    onWheel: (e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur(),
                  }}
                />
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Notes / નોંધ"
                  placeholder="e.g. Discount given by supplier or transport charges added"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  Payment Entry / પેમેન્ટ વિગત
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Paid Amount (ચુકવેલ રકમ ₹)"
                    value={formData.paidAmount}
                    onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                    inputProps={{
                      onWheel: (e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur(),
                    }}
                  />
                  <TextField
                    fullWidth
                    type="date"
                    label="Payment Paid Date (ચુકવણી તા.)"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    select
                    fullWidth
                    label="Payment Method"
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  >
                    <MenuItem value="રોકડ કેશ">રોકડ કેશ (Cash)</MenuItem>
                    <MenuItem value="બેંક ટ્રાન્સફર">બેંક ટ્રાન્સફર (Bank/NEFT)</MenuItem>
                    <MenuItem value="ચેક">ચેક (Cheque)</MenuItem>
                    <MenuItem value="UPI / Online">UPI / Online</MenuItem>
                  </TextField>
                </Box>
                <TextField
                  fullWidth
                  label="Cheque / Reference No"
                  value={formData.chequeNo}
                  onChange={(e) => setFormData({ ...formData, chequeNo: e.target.value })}
                />
              </Box>
            </Box>

            {/* Bill Summary Footer Box */}
            <Box sx={{ p: 2.5, bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', borderRadius: 3, border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, mb: 4 }}>
              <Typography variant="body2">
                Subtotal (આઇટમ સબટોટલ): <strong>{formatRupees(gstCalcs.rawItemsSubtotal)}</strong>
              </Typography>
              {Boolean(gstCalcs.adjustAmount) && (
                <Typography variant="body2" sx={{ color: gstCalcs.adjustAmount < 0 ? 'error.main' : 'success.main', fontWeight: 600 }}>
                  Adjust Amount (એડજસ્ટ રકમ): <strong>{gstCalcs.adjustAmount > 0 ? `+${formatRupees(gstCalcs.adjustAmount)}` : formatRupees(gstCalcs.adjustAmount)}</strong>
                  {gstCalcs.adjustAmount < 0 ? ' (Discount / ઘટાડો)' : ' (Extra Charge / વધારો)'}
                </Typography>
              )}
              {Boolean(gstCalcs.adjustAmount) && (
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', my: 0.2 }}>
                  Adjusted Subtotal (કુલ સબટોટલ): <strong>{formatRupees(gstCalcs.subtotal)}</strong>
                </Typography>
              )}
              {taxEnabled && (
                <>
                  <Typography variant="body2" color="text.secondary">
                    CGST (2.5%): <strong>{formatRupees(gstCalcs.cgst)}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    SGST (2.5%): <strong>{formatRupees(gstCalcs.sgst)}</strong>
                  </Typography>
                </>
              )}
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main', mt: 0.5 }}>
                Total Bill Amount (કુલ બિલ રકમ): {formatRupees(gstCalcs.totalAmount)}
              </Typography>
            </Box>

            {/* Bottom Form Action Buttons */}
            <Box
              sx={{
                p: 2.5,
                bgcolor: mode === 'dark' ? '#1e293b' : '#f8fafc',
                borderRadius: 3,
                border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
                Total Amount: {formatRupees(gstCalcs.totalAmount)}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button onClick={() => setFormOpen(false)} variant="outlined" size="large" sx={{ px: 3.5, fontWeight: 700, borderRadius: '12px' }}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" color="primary" size="large" sx={{ px: 4.5, fontWeight: 800, borderRadius: '12px' }}>
                  Save Purchase Record
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, gap: { xs: 1.5, md: 0 }, mb: 3 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, color: 'primary.main', fontSize: { xs: '1.15rem', sm: '1.3rem' } }}>
            {language === 'gu' ? 'માલ ખરીદી મેનેજમેન્ટ' : 'Material Purchase Management'}
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: '0.8rem', mt: 0.25 }}>
            {language === 'gu' ? 'કાચો માલ ખરીદી હિસાબ, સપ્લાયર ખાતું અને જીએસટી ગણતરી' : 'Track yarn/fabric purchase history, suppliers, pending bills and GST'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, width: { xs: '100%', md: 'auto' }, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<PdfIcon />}
            onClick={() => setStatementModalOpen(true)}
            sx={{
              py: 1,
              px: 2.2,
              fontWeight: 700,
              borderRadius: '10px',
              bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
              color: mode === 'dark' ? '#f8fafc' : '#0f172a',
              borderColor: mode === 'dark' ? '#475569' : '#cbd5e1',
              '&:hover': {
                bgcolor: mode === 'dark' ? '#334155' : '#f8fafc',
                borderColor: '#94a3b8',
              },
            }}
          >
            {language === 'gu' ? 'PDF સ્ટેટમેન્ટ' : 'PDF Statement'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateForm}
            sx={{
              py: 1,
              px: 2.5,
              fontWeight: 700,
              borderRadius: '10px',
              bgcolor: '#4f46e5',
              '&:hover': { bgcolor: '#4338ca' },
            }}
          >
            {language === 'gu' ? '+ માલ ખરીદી નોંધો' : '+ Record Purchase'}
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(7, 1fr)' }, gap: 1.5, mb: 3 }}>
        {/* Card 1: TOTAL CHALLAN */}
        <Card
          elevation={0}
          sx={{
            px: 1.75,
            py: 1.5,
            borderRadius: '16px',
            border: `1.5px solid ${mode === 'dark' ? 'rgba(45, 212, 191, 0.3)' : '#ccfbf1'}`,
            bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
            boxShadow: mode === 'dark' ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: mode === 'dark' ? '0 4px 12px rgba(45, 212, 191, 0.2)' : '0 4px 12px rgba(13, 148, 136, 0.1)',
              transform: 'translateY(-2px)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: mode === 'dark' ? 'rgba(45, 212, 191, 0.15)' : '#ccfbf1',
                color: mode === 'dark' ? '#2dd4bf' : '#0d9488',
                borderRadius: '10px',
              }}
            >
              <ChallanIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="caption" sx={{ color: mode === 'dark' ? '#5eead4' : '#0f766e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', fontSize: '0.675rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {language === 'gu' ? 'કુલ ચલાણ' : 'TOTAL CHALLAN'}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: mode === 'dark' ? '#2dd4bf' : '#0d9488', mt: 0.25, fontSize: { xs: '0.95rem', sm: '1.05rem', xl: '1.15rem' }, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {summaryTotals.totalChallanCount} {language === 'gu' ? 'ચલાણ' : summaryTotals.totalChallanCount === 1 ? 'Challan' : 'Challans'}
              </Typography>
            </Box>
          </Box>
        </Card>

        {/* Card 2: TOTAL PURCHASES */}
        <Card
          elevation={0}
          sx={{
            px: 1.75,
            py: 1.5,
            borderRadius: '16px',
            border: `1.5px solid ${mode === 'dark' ? 'rgba(56, 189, 248, 0.3)' : '#bae6fd'}`,
            bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
            boxShadow: mode === 'dark' ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: mode === 'dark' ? '0 4px 12px rgba(56, 189, 248, 0.2)' : '0 4px 12px rgba(2, 132, 199, 0.1)',
              transform: 'translateY(-2px)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: mode === 'dark' ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe',
                color: mode === 'dark' ? '#38bdf8' : '#0284c7',
                borderRadius: '10px',
              }}
            >
              <InvoiceIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="caption" sx={{ color: mode === 'dark' ? '#7dd3fc' : '#0369a1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', fontSize: '0.675rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {language === 'gu' ? 'કુલ ખરીદી બિલ' : 'TOTAL PURCHASES'}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: mode === 'dark' ? '#38bdf8' : '#0284c7', mt: 0.25, fontSize: { xs: '0.95rem', sm: '1.05rem', xl: '1.15rem' }, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {summaryTotals.totalInvoices} {language === 'gu' ? 'બિલ' : summaryTotals.totalInvoices === 1 ? 'Bill' : 'Bills'}
              </Typography>
            </Box>
          </Box>
        </Card>

        {/* Card 3: TOTAL BILLING */}
        <Card
          elevation={0}
          sx={{
            px: 1.75,
            py: 1.5,
            borderRadius: '16px',
            border: `1.5px solid ${mode === 'dark' ? 'rgba(192, 132, 252, 0.3)' : '#e9d5ff'}`,
            bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
            boxShadow: mode === 'dark' ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: mode === 'dark' ? '0 4px 12px rgba(192, 132, 252, 0.2)' : '0 4px 12px rgba(147, 51, 234, 0.1)',
              transform: 'translateY(-2px)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: mode === 'dark' ? 'rgba(192, 132, 252, 0.15)' : '#f3e8ff',
                color: mode === 'dark' ? '#c084fc' : '#9333ea',
                borderRadius: '10px',
              }}
            >
              <BillingIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="caption" sx={{ color: mode === 'dark' ? '#c084fc' : '#7e22ce', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', fontSize: '0.675rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {language === 'gu' ? 'કુલ ખરીદી રકમ' : 'TOTAL BILLING'}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: mode === 'dark' ? '#c084fc' : '#9333ea', mt: 0.25, fontSize: { xs: '0.95rem', sm: '1.05rem', xl: '1.15rem' }, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {formatRupees(summaryTotals.totalSubtotal)}
              </Typography>
            </Box>
          </Box>
        </Card>

        {/* Card 4: TOTAL TAX / GST */}
        <Card
          elevation={0}
          sx={{
            px: 1.75,
            py: 1.5,
            borderRadius: '16px',
            border: `1.5px solid ${mode === 'dark' ? 'rgba(251, 146, 60, 0.3)' : '#fed7aa'}`,
            bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
            boxShadow: mode === 'dark' ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: mode === 'dark' ? '0 4px 12px rgba(251, 146, 60, 0.2)' : '0 4px 12px rgba(234, 88, 12, 0.1)',
              transform: 'translateY(-2px)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: mode === 'dark' ? 'rgba(251, 146, 60, 0.15)' : '#fff7ed',
                color: mode === 'dark' ? '#fb923c' : '#ea580c',
                borderRadius: '10px',
              }}
            >
              <TaxIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="caption" sx={{ color: mode === 'dark' ? '#fdba74' : '#c2410c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', fontSize: '0.675rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {language === 'gu' ? 'કુલ GST ટેક્સ' : 'TOTAL GST'}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: mode === 'dark' ? '#fb923c' : '#ea580c', mt: 0.25, fontSize: { xs: '0.95rem', sm: '1.05rem', xl: '1.15rem' }, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {formatRupees(summaryTotals.totalTax)}
              </Typography>
            </Box>
          </Box>
        </Card>

        {/* Card 5: TOTAL AMOUNT (WITH TAX) */}
        <Card
          elevation={0}
          sx={{
            px: 1.75,
            py: 1.5,
            borderRadius: '16px',
            border: `1.5px solid ${mode === 'dark' ? 'rgba(129, 140, 248, 0.3)' : '#c7d2fe'}`,
            bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
            boxShadow: mode === 'dark' ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: mode === 'dark' ? '0 4px 12px rgba(129, 140, 248, 0.2)' : '0 4px 12px rgba(79, 70, 229, 0.1)',
              transform: 'translateY(-2px)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: mode === 'dark' ? 'rgba(129, 140, 248, 0.15)' : '#eef2ff',
                color: mode === 'dark' ? '#818cf8' : '#4f46e5',
                borderRadius: '10px',
              }}
            >
              <AmountIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="caption" sx={{ color: mode === 'dark' ? '#a5b4fc' : '#4338ca', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', fontSize: '0.675rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {language === 'gu' ? 'કુલ રકમ (ટેક્સ સહિત)' : 'TOTAL AMOUNT'}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: mode === 'dark' ? '#818cf8' : '#4f46e5', mt: 0.25, fontSize: { xs: '0.95rem', sm: '1.05rem', xl: '1.15rem' }, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {formatRupees(summaryTotals.totalAmount)}
              </Typography>
            </Box>
          </Box>
        </Card>

        {/* Card 6: TOTAL PENDING */}
        <Card
          elevation={0}
          sx={{
            px: 1.75,
            py: 1.5,
            borderRadius: '16px',
            border: `1.5px solid ${mode === 'dark' ? 'rgba(248, 113, 113, 0.3)' : '#fecdd3'}`,
            bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
            boxShadow: mode === 'dark' ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: mode === 'dark' ? '0 4px 12px rgba(248, 113, 113, 0.2)' : '0 4px 12px rgba(225, 29, 72, 0.1)',
              transform: 'translateY(-2px)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: mode === 'dark' ? 'rgba(248, 113, 113, 0.15)' : '#fff1f2',
                color: mode === 'dark' ? '#f87171' : '#dc2626',
                borderRadius: '10px',
              }}
            >
              <PendingIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="caption" sx={{ color: mode === 'dark' ? '#fca5a5' : '#b91c1c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', fontSize: '0.675rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {language === 'gu' ? 'બાકી રકમ' : 'TOTAL PENDING'}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: mode === 'dark' ? '#f87171' : '#dc2626', mt: 0.25, fontSize: { xs: '0.95rem', sm: '1.05rem', xl: '1.15rem' }, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {formatRupees(summaryTotals.pendingAmount)}
              </Typography>
            </Box>
          </Box>
        </Card>

        {/* Card 7: TOTAL PAID */}
        <Card
          elevation={0}
          sx={{
            px: 1.75,
            py: 1.5,
            borderRadius: '16px',
            border: `1.5px solid ${mode === 'dark' ? 'rgba(74, 222, 128, 0.3)' : '#bbf7d0'}`,
            bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
            boxShadow: mode === 'dark' ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: mode === 'dark' ? '0 4px 12px rgba(74, 222, 128, 0.2)' : '0 4px 12px rgba(22, 163, 74, 0.1)',
              transform: 'translateY(-2px)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: mode === 'dark' ? 'rgba(74, 222, 128, 0.15)' : '#f0fdf4',
                color: mode === 'dark' ? '#4ade80' : '#16a34a',
                borderRadius: '10px',
              }}
            >
              <PaidIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="caption" sx={{ color: mode === 'dark' ? '#86efac' : '#15803d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', fontSize: '0.675rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {language === 'gu' ? 'ચુકવેલ રકમ' : 'TOTAL PAID'}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: mode === 'dark' ? '#4ade80' : '#16a34a', mt: 0.25, fontSize: { xs: '0.95rem', sm: '1.05rem', xl: '1.15rem' }, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {formatRupees(summaryTotals.paidAmount)}
              </Typography>
            </Box>
          </Box>
        </Card>
      </Box>

      {/* Filter Bar */}
      <Card
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: '20px',
          border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
          bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
          boxShadow: mode === 'dark' ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.02)',
        }}
      >
        {/* Top Header Row in Filter Card: View Mode Switcher */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2, pb: 1.5, borderBottom: `1px dashed ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Typography variant="body2" sx={{ fontWeight: 800, color: mode === 'dark' ? '#f8fafc' : '#0f172a', fontSize: '0.825rem' }}>
              {language === 'gu' ? 'દર્શાવવાની રીત:' : 'Grouping View:'}
            </Typography>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, val) => val && setViewMode(val)}
              size="small"
              sx={{
                bgcolor: mode === 'dark' ? '#0f172a' : '#f1f5f9',
                p: 0.5,
                borderRadius: '12px',
                '& .MuiToggleButton-root': {
                  borderRadius: '8px',
                  px: 2,
                  py: 0.5,
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.775rem',
                  textTransform: 'none',
                  color: mode === 'dark' ? '#94a3b8' : '#64748b',
                  '&.Mui-selected': {
                    bgcolor: mode === 'dark' ? '#312e81' : '#ffffff',
                    color: mode === 'dark' ? '#818cf8' : '#4338ca',
                    boxShadow: mode === 'dark' ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.1)',
                  },
                },
              }}
            >
              <ToggleButton value="party">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Avatar sx={{ width: 18, height: 18, fontSize: '0.65rem', fontWeight: 800, bgcolor: 'primary.main', color: '#ffffff' }}>P</Avatar>
                  <span>{language === 'gu' ? '🏢 પાર્ટી વાઇઝ ગ્રુપિંગ (Party-Wise)' : '🏢 Party-Wise Grouping'}</span>
                </Box>
              </ToggleButton>
              <ToggleButton value="entry">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <span>{language === 'gu' ? '📄 એન્ટ્રી વાઇઝ (Entry-Wise)' : '📄 Entry-Wise List'}</span>
                </Box>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              size="small"
              label={
                viewMode === 'party'
                  ? (language === 'gu' ? `પાર્ટી ગ્રુપિંગ: ${partyGroups.length} પાર્ટીઓ` : `Party Grouping: ${partyGroups.length} Parties`)
                  : (language === 'gu' ? `એન્ટ્રી યાદી: ${sortedPurchases.length} ખરીદીઓ` : `Entry List: ${sortedPurchases.length} Purchases`)
              }
              color={viewMode === 'party' ? 'primary' : 'default'}
              variant="outlined"
              sx={{ fontWeight: 700, borderRadius: '8px' }}
            />
            <Button
              size="small"
              variant="outlined"
              color="primary"
              startIcon={allExpanded ? <CollapseAllIcon fontSize="small" /> : <ExpandAllIcon fontSize="small" />}
              onClick={toggleExpandAll}
              sx={{ fontWeight: 800, borderRadius: '8px', textTransform: 'none', px: 1.5, py: 0.3, fontSize: '0.78rem' }}
            >
              {language === 'gu'
                ? (allExpanded ? '▲ ચલાણ વિગત છુપાવો' : '▼ બધા ચલાણ બતાવો')
                : (allExpanded ? '▲ Collapse Details' : '▼ Expand All Details')}
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'center' }}>
          {/* Search Box */}
          <TextField
            fullWidth
            size="small"
            placeholder={language === 'gu' ? 'બિલ / ખરીદી નંબર, સપ્લાયરનું નામ અથવા મટીરીયલ શોધો...' : 'Search Paid Bill / Purchase No., Supplier Name or Material...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              sx: { borderRadius: '12px' },
            }}
          />

          {/* Party Wise Filter Dropdown */}
          <TextField
            select
            size="small"
            label={language === 'gu' ? 'પાર્ટી પસંદ કરો (Party Filter)' : 'Filter by Party'}
            value={selectedPartyFilter}
            onChange={(e) => setSelectedPartyFilter(e.target.value)}
            sx={{ minWidth: { xs: '100%', md: 240 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FilterListIcon fontSize="small" color="primary" />
                </InputAdornment>
              ),
              sx: { borderRadius: '12px', fontWeight: 600 },
            }}
          >
            <MenuItem value="ALL">
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                ✨ {language === 'gu' ? 'તમામ પાર્ટીઓ (All Parties)' : 'All Parties'}
              </Typography>
            </MenuItem>
            {partyOptions.map((partyName) => (
              <MenuItem key={partyName} value={partyName}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 22, height: 22, fontSize: '0.7rem', bgcolor: 'primary.main', fontWeight: 700 }}>
                    {partyName.charAt(0)}
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {partyName}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </TextField>

          {/* Status Filter Dropdown */}
          <TextField
            select
            size="small"
            label={language === 'gu' ? 'પેમેન્ટ સ્ટેટસ' : 'Payment Status'}
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            sx={{ minWidth: { xs: '100%', md: 200 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PaymentIcon fontSize="small" color="primary" />
                </InputAdornment>
              ),
              sx: { borderRadius: '12px', fontWeight: 600 },
            }}
          >
            <MenuItem value="ALL">
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {language === 'gu' ? 'તમામ સ્ટેટસ (All)' : 'All Statuses'}
              </Typography>
            </MenuItem>
            <MenuItem value="PENDING">
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#dc2626' }}>
                ⌛ {language === 'gu' ? 'બાકી (Pending)' : 'Pending'}
              </Typography>
            </MenuItem>
            <MenuItem value="PARTIAL">
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#d97706' }}>
                ⏳ {language === 'gu' ? 'અંશતઃ (Partial)' : 'Partial'}
              </Typography>
            </MenuItem>
            <MenuItem value="PAID">
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#16a34a' }}>
                ✅ {language === 'gu' ? 'ચુકવેલ (Paid)' : 'Paid'}
              </Typography>
            </MenuItem>
          </TextField>

          {/* Active Filter Indicators & Clear Button */}
          {(selectedPartyFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || search || (selectedMonth !== 'ALL' && selectedMonth !== 'All')) && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => {
                setSelectedPartyFilter('ALL');
                setSelectedStatusFilter('ALL');
                setSearch('');
              }}
              sx={{ whitespace: 'nowrap', borderRadius: '12px', px: 2, height: 40, fontWeight: 700 }}
            >
              {language === 'gu' ? 'ક્લિયર ફિલ્ટર' : 'Clear Filters'}
            </Button>
          )}
        </Box>

        {/* Active Filters Pill Bar */}
        {(selectedPartyFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || search || (selectedMonth !== 'ALL' && selectedMonth !== 'All')) && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mt: 2, pt: 1.5, borderTop: `1px border-dashed ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, mr: 0.5 }}>
              Active Filters:
            </Typography>

            {selectedMonth !== 'ALL' && selectedMonth !== 'All' && (
              <Chip
                size="small"
                label={`Month: ${selectedMonth}`}
                color="primary"
                variant="outlined"
                sx={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.725rem' }}
              />
            )}

            {selectedPartyFilter !== 'ALL' && (
              <Chip
                size="small"
                label={`Party: ${selectedPartyFilter}`}
                color="info"
                onDelete={() => setSelectedPartyFilter('ALL')}
                sx={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.725rem' }}
              />
            )}

            {selectedStatusFilter !== 'ALL' && (
              <Chip
                size="small"
                label={`Status: ${selectedStatusFilter}`}
                color="warning"
                onDelete={() => setSelectedStatusFilter('ALL')}
                sx={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.725rem' }}
              />
            )}

            {search && (
              <Chip
                size="small"
                label={`Search: "${search}"`}
                onDelete={() => setSearch('')}
                sx={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.725rem' }}
              />
            )}

            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, ml: 'auto' }}>
              ({filteredPurchases.length} {filteredPurchases.length === 1 ? 'purchase' : 'purchases'} found)
            </Typography>
          </Box>
        )}
      </Card>

      <Card sx={{ borderRadius: 3, overflow: 'hidden', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, boxShadow: mode === 'dark' ? 'none' : '0 4px 12px rgba(0, 0, 0, 0.03)' }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 1280 }}>
            {viewMode === 'entry' && (
              <TableHead>
              {/* Group Header Row */}
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', color: mode === 'dark' ? '#f8fafc' : '#334155', fontWeight: 700, fontSize: '0.8rem', py: 1, px: 1, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, borderRight: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                  {language === 'gu' ? 'પાર્ટી ચલાણ વિગતો' : 'PARTY & CHALLAN DETAILS'}
                </TableCell>
                <TableCell colSpan={3} align="center" sx={{ bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', color: mode === 'dark' ? '#f8fafc' : '#334155', fontWeight: 700, fontSize: '0.8rem', py: 1, px: 1, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, borderRight: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                  {language === 'gu' ? 'મટીરીયલ વિગતો' : 'MATERIAL DETAILS'}
                </TableCell>
                <TableCell colSpan={3} align="center" sx={{ bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', color: mode === 'dark' ? '#f8fafc' : '#334155', fontWeight: 700, fontSize: '0.8rem', py: 1, px: 1, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, borderRight: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                  {language === 'gu' ? 'રકમ અને GST લખાણ' : 'AMOUNT & GST DETAILS'}
                </TableCell>
                <TableCell colSpan={3} align="center" sx={{ bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', color: mode === 'dark' ? '#f8fafc' : '#334155', fontWeight: 700, fontSize: '0.8rem', py: 1, px: 1, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, borderRight: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                  {language === 'gu' ? 'બિલ વિગતો' : 'BILL DETAILS'}
                </TableCell>
                <TableCell colSpan={2} align="center" sx={{ bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', color: mode === 'dark' ? '#f8fafc' : '#334155', fontWeight: 700, fontSize: '0.8rem', py: 1, px: 1, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, borderRight: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                  {language === 'gu' ? 'પેમેન્ટ વિગતો' : 'PAYMENT DETAILS'}
                </TableCell>
                <TableCell colSpan={1} align="center" sx={{ bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', color: mode === 'dark' ? '#f8fafc' : '#334155', fontWeight: 700, fontSize: '0.8rem', py: 1, px: 1, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                  {language === 'gu' ? 'એક્શન' : 'ACTIONS'}
                </TableCell>
              </TableRow>

              {/* Detail Column Headers with Click-To-Sort */}
              <TableRow sx={{ bgcolor: mode === 'dark' ? '#0f172a' : '#f8fafc' }}>
                {/* Party & Challan */}
                <TableCell align="center" sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 600, py: 1, px: 0.8, fontSize: '0.75rem', borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, borderRight: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}` }}>
                  {language === 'gu' ? 'નં.' : 'NO.'}
                </TableCell>
                
                {/* CHALLAN DATE */}
                <TableCell
                  align="center"
                  onClick={() => handleSort('challanDate')}
                  sx={{
                    color: sortField === 'challanDate' ? 'primary.main' : (mode === 'dark' ? '#94a3b8' : '#64748b'),
                    fontWeight: 700,
                    py: 1,
                    px: 0.8,
                    fontSize: '0.75rem',
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    borderRight: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { color: 'primary.main', bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                  }}
                >
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                    <span>{language === 'gu' ? 'ચલાણ તા.' : 'CHALLAN DATE'}</span>
                    <Typography component="span" sx={{ fontSize: '0.8rem', fontWeight: 800 }}>
                      {sortField === 'challanDate' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                    </Typography>
                  </Box>
                </TableCell>

                {/* CHALLAN NO */}
                <TableCell
                  align="center"
                  onClick={() => handleSort('challanNo')}
                  sx={{
                    color: sortField === 'challanNo' ? 'primary.main' : (mode === 'dark' ? '#94a3b8' : '#64748b'),
                    fontWeight: 700,
                    py: 1,
                    px: 0.8,
                    fontSize: '0.75rem',
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    borderRight: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { color: 'primary.main', bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                  }}
                >
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                    <span>{language === 'gu' ? 'ચલાણ નં.' : 'CHALLAN NO.'}</span>
                    <Typography component="span" sx={{ fontSize: '0.8rem', fontWeight: 800 }}>
                      {sortField === 'challanNo' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                    </Typography>
                  </Box>
                </TableCell>

                {/* PARTY NAME */}
                <TableCell
                  align="left"
                  onClick={() => handleSort('supplierName')}
                  sx={{
                    color: sortField === 'supplierName' ? 'primary.main' : (mode === 'dark' ? '#94a3b8' : '#64748b'),
                    fontWeight: 700,
                    py: 1,
                    px: 0.8,
                    fontSize: '0.75rem',
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    borderRight: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { color: 'primary.main', bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                  }}
                >
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    <span>{language === 'gu' ? 'પાર્ટી નામ' : 'PARTY NAME'}</span>
                    <Typography component="span" sx={{ fontSize: '0.8rem', fontWeight: 800 }}>
                      {sortField === 'supplierName' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                    </Typography>
                  </Box>
                </TableCell>


                {/* QTY */}
                <TableCell
                  align="center"
                  onClick={() => handleSort('quantity')}
                  sx={{
                    color: sortField === 'quantity' ? 'primary.main' : (mode === 'dark' ? '#94a3b8' : '#64748b'),
                    fontWeight: 700,
                    py: 1,
                    px: 0.8,
                    fontSize: '0.75rem',
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    borderRight: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { color: 'primary.main', bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                  }}
                >
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                    <span>{language === 'gu' ? 'નંગ' : 'QTY'}</span>
                    <Typography component="span" sx={{ fontSize: '0.8rem', fontWeight: 800 }}>
                      {sortField === 'quantity' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                    </Typography>
                  </Box>
                </TableCell>

                {/* RATE */}
                <TableCell align="right" sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 600, py: 1, px: 0.8, fontSize: '0.75rem', borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, borderRight: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}` }}>
                  {language === 'gu' ? 'ભાવ' : 'RATE'}
                </TableCell>

                {/* AMOUNT */}
                <TableCell
                  align="right"
                  onClick={() => handleSort('subtotal')}
                  sx={{
                    color: sortField === 'subtotal' ? 'primary.main' : (mode === 'dark' ? '#94a3b8' : '#64748b'),
                    fontWeight: 700,
                    py: 1,
                    px: 0.8,
                    fontSize: '0.75rem',
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    borderRight: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { color: 'primary.main', bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                  }}
                >
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                    <span>{language === 'gu' ? 'કુલ રકમ' : 'AMOUNT'}</span>
                    <Typography component="span" sx={{ fontSize: '0.8rem', fontWeight: 800 }}>
                      {sortField === 'subtotal' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                    </Typography>
                  </Box>
                </TableCell>

                {/* Tax / GST */}
                <TableCell align="right" sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 600, py: 1, px: 0.8, fontSize: '0.75rem', borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, borderRight: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}` }}>SGST (2.5%)</TableCell>
                <TableCell align="right" sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 600, py: 1, px: 0.8, fontSize: '0.75rem', borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, borderRight: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}` }}>CGST (2.5%)</TableCell>

                {/* TOTAL WITH TAX */}
                <TableCell
                  align="right"
                  onClick={() => handleSort('totalAmount')}
                  sx={{
                    color: sortField === 'totalAmount' ? 'primary.main' : (mode === 'dark' ? '#94a3b8' : '#64748b'),
                    fontWeight: 700,
                    py: 1,
                    px: 0.8,
                    fontSize: '0.75rem',
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    borderRight: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { color: 'primary.main', bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                  }}
                >
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                    <span>{language === 'gu' ? 'કુલ ટેક્સ સહિત' : 'TOTAL WITH TAX'}</span>
                    <Typography component="span" sx={{ fontSize: '0.8rem', fontWeight: 800 }}>
                      {sortField === 'totalAmount' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                    </Typography>
                  </Box>
                </TableCell>

                {/* BILL DATE */}
                <TableCell
                  align="center"
                  onClick={() => handleSort('date')}
                  sx={{
                    color: sortField === 'date' ? 'primary.main' : (mode === 'dark' ? '#94a3b8' : '#64748b'),
                    fontWeight: 700,
                    py: 1,
                    px: 0.8,
                    fontSize: '0.75rem',
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    borderRight: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { color: 'primary.main', bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                  }}
                >
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                    <span>{language === 'gu' ? 'બિલ તા.' : 'BILL DATE'}</span>
                    <Typography component="span" sx={{ fontSize: '0.8rem', fontWeight: 800 }}>
                      {sortField === 'date' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                    </Typography>
                  </Box>
                </TableCell>

                {/* BILL NO */}
                <TableCell
                  align="center"
                  onClick={() => handleSort('purchaseNo')}
                  sx={{
                    color: sortField === 'purchaseNo' ? 'primary.main' : (mode === 'dark' ? '#94a3b8' : '#64748b'),
                    fontWeight: 700,
                    py: 1,
                    px: 0.8,
                    fontSize: '0.75rem',
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    borderRight: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { color: 'primary.main', bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                  }}
                >
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                    <span>{language === 'gu' ? 'બિલ નં.' : 'BILL NO.'}</span>
                    <Typography component="span" sx={{ fontSize: '0.8rem', fontWeight: 800 }}>
                      {sortField === 'purchaseNo' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                    </Typography>
                  </Box>
                </TableCell>

                <TableCell align="center" sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 600, py: 1, px: 0.8, fontSize: '0.75rem', borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, borderRight: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                  {language === 'gu' ? 'મોડ / રિફ.' : 'MODE / REF.'}
                </TableCell>

                {/* PAYMENT DATE */}
                <TableCell
                  align="center"
                  onClick={() => handleSort('paymentDate')}
                  sx={{
                    color: sortField === 'paymentDate' ? 'primary.main' : (mode === 'dark' ? '#94a3b8' : '#64748b'),
                    fontWeight: 700,
                    py: 1,
                    px: 0.8,
                    fontSize: '0.75rem',
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    borderRight: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { color: 'primary.main', bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                  }}
                >
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                    <span>{language === 'gu' ? 'પેમેન્ટ તા.' : 'PAYMENT DATE'}</span>
                    <Typography component="span" sx={{ fontSize: '0.8rem', fontWeight: 800 }}>
                      {sortField === 'paymentDate' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                    </Typography>
                  </Box>
                </TableCell>

                {/* STATUS */}
                <TableCell
                  align="center"
                  onClick={() => handleSort('status')}
                  sx={{
                    color: sortField === 'status' ? 'primary.main' : (mode === 'dark' ? '#94a3b8' : '#64748b'),
                    fontWeight: 700,
                    py: 1,
                    px: 0.8,
                    fontSize: '0.75rem',
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    borderRight: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { color: 'primary.main', bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                  }}
                >
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                    <span>{language === 'gu' ? 'સ્ટેટસ' : 'STATUS'}</span>
                    <Typography component="span" sx={{ fontSize: '0.8rem', fontWeight: 800 }}>
                      {sortField === 'status' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                    </Typography>
                  </Box>
                </TableCell>

                {/* Actions */}
                <TableCell align="center" sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 600, py: 1, px: 0.8, fontSize: '0.75rem', borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                  {language === 'gu' ? 'એક્શન' : 'ACTIONS'}
                </TableCell>
              </TableRow>
            </TableHead>
            )}

            {viewMode === 'party' && (
              <TableHead>
                <TableRow sx={{ bgcolor: mode === 'dark' ? '#1e293b' : '#f8fafc' }}>
                  <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem', py: 1.2, px: 1, color: mode === 'dark' ? '#cbd5e1' : '#475569', width: '4%', borderRight: '1px solid #e2e8f0', borderBottom: '2px solid #cbd5e1' }}>
                    {language === 'gu' ? 'નં.' : 'NO.'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', py: 1.2, px: 1.5, color: mode === 'dark' ? '#cbd5e1' : '#475569', width: '18%', borderRight: '1px solid #e2e8f0', borderBottom: '2px solid #cbd5e1' }}>
                    {language === 'gu' ? 'પાર્ટી નામ' : 'PARTY NAME'}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem', py: 1.2, px: 1, color: mode === 'dark' ? '#cbd5e1' : '#475569', width: '10%', borderRight: '1px solid #e2e8f0', borderBottom: '2px solid #cbd5e1' }}>
                    {language === 'gu' ? 'બિલ નં.' : 'BILL NO.'}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem', py: 1.2, px: 1, color: mode === 'dark' ? '#cbd5e1' : '#475569', width: '9%', borderRight: '1px solid #e2e8f0', borderBottom: '2px solid #cbd5e1' }}>
                    {language === 'gu' ? 'બિલ તા.' : 'BILL DATE'}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem', py: 1.2, px: 1, color: mode === 'dark' ? '#cbd5e1' : '#475569', width: '9%', borderRight: '1px solid #e2e8f0', borderBottom: '2px solid #cbd5e1' }}>
                    {language === 'gu' ? 'મોડ' : 'MODE'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.75rem', py: 1.2, px: 1, color: mode === 'dark' ? '#cbd5e1' : '#475569', width: '9%', borderRight: '1px solid #e2e8f0', borderBottom: '2px solid #cbd5e1' }}>
                    {language === 'gu' ? 'સબટોટલ' : 'SUBTOTAL'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.75rem', py: 1.2, px: 1, color: mode === 'dark' ? '#cbd5e1' : '#475569', width: '7%', borderRight: '1px solid #e2e8f0', borderBottom: '2px solid #cbd5e1' }}>
                    {language === 'gu' ? 'ટેક્સ (5%)' : 'TAX (5%)'}
                  </TableCell>
                  {/* NET TOTAL */}
                  <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.75rem', py: 1.2, px: 1, color: mode === 'dark' ? '#cbd5e1' : '#475569', width: '9%', borderRight: '1px solid #e2e8f0', borderBottom: '2px solid #cbd5e1' }}>
                    {language === 'gu' ? 'કુલ બિલ' : 'NET TOTAL'}
                  </TableCell>
                  {/* PAYMENT DATE */}
                  <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem', py: 1.2, px: 1, color: mode === 'dark' ? '#cbd5e1' : '#475569', width: '9%', borderRight: '1px solid #e2e8f0', borderBottom: '2px solid #cbd5e1' }}>
                    {language === 'gu' ? 'પેમેન્ટ તા.' : 'PAYMENT DATE'}
                  </TableCell>
                  {/* STATUS */}
                  <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem', py: 1.2, px: 1, color: mode === 'dark' ? '#cbd5e1' : '#475569', width: '7%', borderRight: '1px solid #e2e8f0', borderBottom: '2px solid #cbd5e1' }}>
                    {language === 'gu' ? 'સ્ટેટસ' : 'STATUS'}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem', py: 1.2, px: 1, color: mode === 'dark' ? '#cbd5e1' : '#475569', width: '9%', borderRight: '1px solid #e2e8f0', borderBottom: '2px solid #cbd5e1' }}>
                    {language === 'gu' ? 'ચલાણ' : 'CHALLAN'}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem', py: 1.2, px: 1, color: mode === 'dark' ? '#cbd5e1' : '#475569', width: '11%', borderBottom: '2px solid #cbd5e1' }}>
                    {language === 'gu' ? 'એક્શન' : 'ACTIONS'}
                  </TableCell>
                </TableRow>
              </TableHead>
            )}

            <TableBody>
              {(() => {
                if (sortedPurchases.length === 0) {
                  const partyHasOtherPurchases = purchasesForSelectedPartyInOtherMonths.length > 0;
                  return (
                    <TableRow>
                      <TableCell colSpan={16} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: mode === 'dark' ? '#cbd5e1' : '#334155' }}>
                            {language === 'gu' ? 'કોઈ ખરીદી મળી નથી (No material purchases found)' : 'No material purchases found'}
                          </Typography>
                          {partyHasOtherPurchases && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, bgcolor: mode === 'dark' ? '#1e293b' : '#f0f9ff', p: 2, borderRadius: 2.5, border: '1px solid #bae6fd', maxWidth: 500 }}>
                              <Typography variant="body2" sx={{ color: '#0369a1', fontWeight: 600 }}>
                                {language === 'gu'
                                  ? `પાર્ટી "${selectedPartyFilter}" માટે ચાલુ મહિનામાં કોઈ ખરીદી નથી, પણ અન્ય મહિનામાં ${purchasesForSelectedPartyInOtherMonths.length} એન્ટ્રીઓ મળેલી છે.`
                                  : `No purchases for "${selectedPartyFilter}" in ${selectedMonth === 'ALL' || selectedMonth === 'All' ? 'selected filter' : getMonthLabel(selectedMonth, language)}, but ${purchasesForSelectedPartyInOtherMonths.length} purchase(s) exist in other months.`}
                              </Typography>
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                onClick={() => setSelectedMonth('ALL')}
                                sx={{ textTransform: 'none', fontWeight: 800, borderRadius: '8px' }}
                              >
                                {language === 'gu'
                                  ? `તમામ મહિનાની ખરીદીઓ જુઓ (${purchasesForSelectedPartyInOtherMonths.length})`
                                  : `View All Months for ${selectedPartyFilter} (${purchasesForSelectedPartyInOtherMonths.length})`}
                              </Button>
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                }

                if (viewMode === 'party') {
                  const borderCell = `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`;

                  return partyGroups.map((group, gIdx) => {
                    const isSingleBill = group.purchases.length === 1;
                    const primaryBill = group.purchases[0];
                    const primaryStatus = primaryBill ? getPurchaseStatus(primaryBill) : 'PENDING';
                    const isGroupExpanded = group.purchases.some(p => (expandedBills[p.id] !== undefined ? expandedBills[p.id] : allExpanded));

                    return (
                      <React.Fragment key={`party-group-${group.partyName}-${gIdx}`}>
                        {/* Party Group Table Row */}
                        <TableRow
                          sx={{
                            bgcolor: mode === 'dark' ? (gIdx % 2 === 1 ? '#0f172a' : '#1e293b') : (gIdx % 2 === 1 ? '#f8fafc' : '#ffffff'),
                            '&:hover': { bgcolor: mode === 'dark' ? '#334155' : '#f1f5f9' },
                            borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#cbd5e1'}`,
                          }}
                        >
                          {/* NO. */}
                          <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.8rem', py: 1.2, px: 1, color: 'text.secondary', borderRight: borderCell }}>
                            {gIdx + 1}
                          </TableCell>

                          {/* PARTY NAME */}
                          <TableCell sx={{ py: 1.2, px: 1.5, borderRight: borderCell }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                              <Avatar sx={{ width: 32, height: 32, fontSize: '0.85rem', fontWeight: 800, bgcolor: mode === 'dark' ? '#4338ca' : '#e0e7ff', color: mode === 'dark' ? '#e0e7ff' : '#3730a3', border: '1px solid #818cf8' }}>
                                {group.partyName.charAt(0).toUpperCase()}
                              </Avatar>
                              <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: mode === 'dark' ? '#f8fafc' : '#1e1b4b' }}>
                                {group.partyName}
                              </Typography>
                            </Box>
                          </TableCell>

                          {/* BILL NO. */}
                          <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.8rem', py: 1.2, px: 1, color: mode === 'dark' ? '#a5b4fc' : '#4f46e5', borderRight: borderCell }}>
                            {primaryBill ? primaryBill.purchaseNo : '-'}
                          </TableCell>

                          {/* BILL DATE */}
                          <TableCell align="center" sx={{ fontSize: '0.8rem', py: 1.2, px: 1, color: mode === 'dark' ? '#cbd5e1' : '#334155', borderRight: borderCell }}>
                            {primaryBill ? formatDate(primaryBill.date) : '-'}
                          </TableCell>

                          {/* MODE */}
                          <TableCell align="center" sx={{ fontSize: '0.8rem', py: 1.2, px: 1, color: mode === 'dark' ? '#cbd5e1' : '#475569', borderRight: borderCell }}>
                            {primaryBill ? ((primaryBill as any).paymentMethod || (primaryBill as any).paymentMode || 'Cash') : '-'}
                          </TableCell>

                          {/* SUBTOTAL */}
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.8rem', py: 1.2, px: 1, color: mode === 'dark' ? '#cbd5e1' : '#334155', borderRight: borderCell }}>
                            {formatRupees(group.totalSubtotal)}
                          </TableCell>

                          {/* TAX */}
                          <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.8rem', py: 1.2, px: 1, color: mode === 'dark' ? '#c084fc' : '#6b21a8', borderRight: borderCell }}>
                            {formatRupees(group.totalTax)}
                          </TableCell>

                          {/* NET TOTAL */}
                          <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.85rem', py: 1.2, px: 1, color: mode === 'dark' ? '#4ade80' : '#15803d', borderRight: borderCell }}>
                            {formatRupees(group.totalAmount)}
                          </TableCell>

                          {/* PAYMENT DATE */}
                          <TableCell align="center" sx={{ fontSize: '0.8rem', py: 1.2, px: 1, color: mode === 'dark' ? '#cbd5e1' : '#334155', borderRight: borderCell, whiteSpace: 'nowrap' }}>
                            {primaryBill && primaryStatus !== 'PENDING' && (primaryBill.paidAmount > 0 || primaryStatus === 'PAID' || primaryStatus === 'PARTIAL') && primaryBill.paymentDate
                              ? formatDate(primaryBill.paymentDate)
                              : '-'}
                          </TableCell>

                          {/* STATUS */}
                          <TableCell align="center" sx={{ py: 1.2, px: 1, borderRight: borderCell }}>
                            <Chip
                              size="small"
                              label={primaryStatus === 'PAID' ? (language === 'gu' ? 'ચૂકવેલ' : 'Paid') : primaryStatus === 'PARTIAL' ? (language === 'gu' ? 'અંશતઃ' : 'Partial') : (language === 'gu' ? 'બાકી' : 'Pending')}
                              sx={{
                                fontWeight: 800,
                                height: 22,
                                fontSize: '0.7rem',
                                bgcolor: primaryStatus === 'PAID' ? (mode === 'dark' ? 'rgba(34,197,94,0.15)' : '#dcfce7') : primaryStatus === 'PARTIAL' ? (mode === 'dark' ? 'rgba(245,158,11,0.15)' : '#fef3c7') : (mode === 'dark' ? 'rgba(239,68,68,0.15)' : '#fee2e2'),
                                color: primaryStatus === 'PAID' ? (mode === 'dark' ? '#4ade80' : '#15803d') : primaryStatus === 'PARTIAL' ? (mode === 'dark' ? '#fbbf24' : '#d97706') : (mode === 'dark' ? '#f87171' : '#b91c1c'),
                              }}
                            />
                          </TableCell>

                          {/* CHALLAN */}
                          <TableCell align="center" sx={{ py: 1.2, px: 1, borderRight: borderCell }}>
                            <Chip
                              clickable
                              size="small"
                              icon={isGroupExpanded ? <ExpandLessIcon sx={{ fontSize: '14px !important' }} /> : <ExpandMoreIcon sx={{ fontSize: '14px !important' }} />}
                              label={`${group.challanCount} ${language === 'gu' ? 'ચલાણ' : 'Challans'}`}
                              color="primary"
                              variant={isGroupExpanded ? "filled" : "outlined"}
                              onClick={() => {
                                const groupPurchaseIds = group.purchases.map(p => p.id);
                                const nextState = !isGroupExpanded;
                                setExpandedBills(prev => {
                                  const copy = { ...prev };
                                  groupPurchaseIds.forEach(id => { copy[id] = nextState; });
                                  return copy;
                                });
                              }}
                              sx={{ fontWeight: 800, height: 24, fontSize: '0.72rem', cursor: 'pointer' }}
                            />
                          </TableCell>

                          {/* ACTIONS */}
                          <TableCell align="center" sx={{ py: 1.2, px: 1 }}>
                            {primaryBill && (
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                <Button
                                  size="small"
                                  startIcon={<ViewIcon sx={{ fontSize: '13px !important' }} />}
                                  onClick={() => { setPurchaseToView(primaryBill); setViewOpen(true); }}
                                  sx={{ textTransform: 'none', px: 1, py: 0.3, minWidth: 0, fontSize: '0.72rem', fontWeight: 600, borderRadius: '6px', bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', color: mode === 'dark' ? '#a855f7' : '#7c3aed', border: '1px solid #cbd5e1' }}
                                >
                                  {language === 'gu' ? 'જુઓ' : 'View'}
                                </Button>
                                <Button
                                  size="small"
                                  startIcon={<EditIcon sx={{ fontSize: '13px !important' }} />}
                                  onClick={() => handleOpenEditForm(primaryBill)}
                                  sx={{ textTransform: 'none', px: 1, py: 0.3, minWidth: 0, fontSize: '0.72rem', fontWeight: 600, borderRadius: '6px', bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', color: mode === 'dark' ? '#38bdf8' : '#0284c7', border: '1px solid #cbd5e1' }}
                                >
                                  {language === 'gu' ? 'સુધારો' : 'Edit'}
                                </Button>
                                <Button
                                  size="small"
                                  startIcon={<DeleteIcon sx={{ fontSize: '13px !important' }} />}
                                  onClick={() => { setPurchaseToDelete(primaryBill.id); setDeleteOpen(true); }}
                                  sx={{ textTransform: 'none', px: 1, py: 0.3, minWidth: 0, fontSize: '0.72rem', fontWeight: 600, borderRadius: '6px', bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff', color: mode === 'dark' ? '#f87171' : '#dc2626', border: '1px solid #cbd5e1' }}
                                >
                                  {language === 'gu' ? 'કાઢી નાખો' : 'Delete'}
                                </Button>
                              </Box>
                            )}
                          </TableCell>
                        </TableRow>

                        {/* Subtable Item Breakdown Row */}
                        {group.purchases.map((p) => {
                          const itemsList = (p.items && p.items.length > 0)
                            ? p.items
                            : [
                                {
                                  challanDate: p.date,
                                  challanNo: p.purchaseNo,
                                  description: p.materialName || '-',
                                  quantity: 1,
                                  unit: 'કોન',
                                  rate: p.subtotal,
                                  amount: p.subtotal,
                                }
                              ];
                          const itemCount = itemsList.length;
                          const uniqueChallansInBill = new Set(itemsList.map(i => (i.challanNo || '').trim()).filter(Boolean));
                          const isExpanded = expandedBills[p.id] !== undefined ? expandedBills[p.id] : allExpanded;

                          return (
                            <React.Fragment key={`party-bill-${p.id}`}>
                              {/* Nested Sub-Table Row */}
                              <TableRow key={`subtable-${p.id}`}>
                                <TableCell colSpan={12} sx={{ p: 0, border: 'none' }}>
                                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                    <Box sx={{ p: 1.5, bgcolor: mode === 'dark' ? '#0f172a' : '#f8fafc', borderBottom: `2.5px solid ${mode === 'dark' ? '#475569' : '#cbd5e1'}` }}>
                                      <Paper
                                        elevation={0}
                                        sx={{
                                          borderRadius: '12px',
                                          overflow: 'hidden',
                                          border: `1.5px solid ${mode === 'dark' ? '#334155' : '#cbd5e1'}`,
                                          bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
                                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                        }}
                                      >
                                        <Box sx={{ px: 2, py: 0.8, bgcolor: mode === 'dark' ? '#334155' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #dbeafe' }}>
                                          <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.75rem' }}>
                                            📦 {language === 'gu' ? 'ચલાણ અને મટીરીયલ વિગત વાઇઝ બ્રેકડાઉન' : 'Challan & Material Item Breakdown'} ({itemCount} {language === 'gu' ? 'આઇટમો' : 'Items'} across {uniqueChallansInBill.size || 1} {language === 'gu' ? 'ચલાણ' : 'Challans'})
                                          </Typography>
                                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                            {language === 'gu' ? 'બિલ નં.' : 'Bill No'}: <strong>{p.purchaseNo}</strong>
                                          </Typography>
                                        </Box>

                                        <Table size="small" sx={{ borderCollapse: 'collapse' }}>
                                          <TableHead>
                                            <TableRow sx={{ bgcolor: mode === 'dark' ? '#0f172a' : '#f8fafc' }}>
                                              <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.725rem', py: 0.8, color: mode === 'dark' ? '#94a3b8' : '#64748b', width: '12%', borderRight: '1px solid #e2e8f0' }}>
                                                {language === 'gu' ? 'ચલાણ તા.' : 'CHALLAN DATE'}
                                              </TableCell>
                                              <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.725rem', py: 0.8, color: 'error.main', width: '12%', borderRight: '1px solid #e2e8f0' }}>
                                                {language === 'gu' ? 'ચલાણ નં.' : 'CHALLAN NO.'}
                                              </TableCell>
                                              <TableCell sx={{ fontWeight: 800, fontSize: '0.725rem', py: 0.8, color: mode === 'dark' ? '#f8fafc' : '#0f172a', width: '34%', borderRight: '1px solid #e2e8f0' }}>
                                                {language === 'gu' ? 'મટીરીયલ વિગત' : 'MATERIAL DESCRIPTION'}
                                              </TableCell>
                                              <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.725rem', py: 0.8, color: mode === 'dark' ? '#cbd5e1' : '#475569', width: '12%', borderRight: '1px solid #e2e8f0' }}>
                                                {language === 'gu' ? 'જથ્થો' : 'QTY & UNIT'}
                                              </TableCell>
                                              <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.725rem', py: 0.8, color: mode === 'dark' ? '#cbd5e1' : '#475569', width: '10%', borderRight: '1px solid #e2e8f0' }}>
                                                {language === 'gu' ? 'ભાવ (₹)' : 'RATE (₹)'}
                                              </TableCell>
                                              <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.725rem', py: 0.8, color: 'primary.main', width: '10%', borderRight: '1px solid #e2e8f0' }}>
                                                {language === 'gu' ? 'રકમ (₹)' : 'AMOUNT (₹)'}
                                              </TableCell>
                                              <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.725rem', py: 0.8, color: mode === 'dark' ? '#94a3b8' : '#64748b', width: '10%' }}>
                                                {language === 'gu' ? 'GST (5%)' : 'GST (5%)'}
                                              </TableCell>
                                            </TableRow>
                                          </TableHead>
                                          <TableBody>
                                            {itemsList.map((item, idx) => {
                                              const itemAmt = item.amount || (item.quantity && item.rate ? item.quantity * item.rate : 0);
                                              const itemTax = (p.cgst > 0 || p.sgst > 0) ? Number((itemAmt * 0.05).toFixed(2)) : 0;
                                              return (
                                                <TableRow key={idx} sx={{ '&:hover': { bgcolor: mode === 'dark' ? '#334155' : '#f1f5f9' }, bgcolor: idx % 2 === 1 ? (mode === 'dark' ? '#1e293b' : '#fafafa') : 'transparent' }}>
                                                  <TableCell align="center" sx={{ fontSize: '0.78rem', py: 0.65, color: mode === 'dark' ? '#cbd5e1' : '#334155', borderRight: '1px solid #e2e8f0' }}>
                                                    {formatDate(item.challanDate || p.date)}
                                                  </TableCell>
                                                  <TableCell align="center" sx={{ fontSize: '0.78rem', py: 0.65, fontWeight: 700, color: mode === 'dark' ? '#f87171' : '#e11d48', borderRight: '1px solid #e2e8f0' }}>
                                                    {item.challanNo || p.purchaseNo}
                                                  </TableCell>
                                                  <TableCell sx={{ fontSize: '0.78rem', py: 0.65, fontWeight: 600, color: mode === 'dark' ? '#f1f5f9' : '#0f172a', borderRight: '1px solid #e2e8f0' }}>
                                                    {item.description || '-'}
                                                  </TableCell>
                                                  <TableCell align="center" sx={{ fontSize: '0.78rem', py: 0.65, fontWeight: 600, borderRight: '1px solid #e2e8f0' }}>
                                                    {item.quantity} {item.unit || ''}
                                                  </TableCell>
                                                  <TableCell align="right" sx={{ fontSize: '0.78rem', py: 0.65, borderRight: '1px solid #e2e8f0' }}>
                                                    {item.rate ? Number(item.rate).toFixed(2) : '-'}
                                                  </TableCell>
                                                  <TableCell align="right" sx={{ fontSize: '0.78rem', py: 0.65, fontWeight: 700, color: mode === 'dark' ? '#a5b4fc' : '#4338ca', borderRight: '1px solid #e2e8f0' }}>
                                                    {itemAmt ? Number(itemAmt).toFixed(2) : '-'}
                                                  </TableCell>
                                                  <TableCell align="right" sx={{ fontSize: '0.78rem', py: 0.65, color: 'text.secondary' }}>
                                                    {itemTax.toFixed(2)}
                                                  </TableCell>
                                                </TableRow>
                                              );
                                            })}
                                          </TableBody>
                                        </Table>
                                      </Paper>
                                    </Box>
                                  </Collapse>
                                </TableCell>
                              </TableRow>
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  });
                }

                const paginated = sortedPurchases.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

                return paginated.flatMap((p, pIdx) => {
                  const itemsList = (p.items && p.items.length > 0)
                    ? p.items
                    : [
                        {
                          challanDate: p.date,
                          challanNo: p.purchaseNo,
                          description: p.materialName || '-',
                          quantity: 1,
                          unit: 'કોન',
                          rate: p.subtotal,
                          amount: p.subtotal,
                        }
                      ];
                  const itemCount = itemsList.length;
                  const isPurchaseHovered = hoveredPurchaseId === p.id;
                  const borderCell = `1px solid ${mode === 'dark' ? '#1e293b' : '#e2e8f0'}`;
                  const groupBorderRight = `1.5px solid ${mode === 'dark' ? '#475569' : '#cbd5e1'}`;
                  const purchaseBottomBorder = `1.5px solid ${mode === 'dark' ? '#475569' : '#cbd5e1'}`;
                  const innerItemBorder = `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`;

                  return itemsList.map((item, iIdx) => {
                    const isFirst = iIdx === 0;
                    const isLast = iIdx === itemCount - 1;
                    const chDate = item.challanDate || p.date;
                    const chNo = item.challanNo || p.purchaseNo;
                    const itemAmt = item.amount || (item.quantity && item.rate ? item.quantity * item.rate : p.subtotal);
                    const itemSgst = (p.sgst > 0) ? Number((itemAmt * 0.025).toFixed(2)) : 0;
                    const itemCgst = (p.cgst > 0) ? Number((itemAmt * 0.025).toFixed(2)) : 0;

                    const itemBottomBorder = isLast ? purchaseBottomBorder : innerItemBorder;

                    const rowBg = isPurchaseHovered
                      ? (mode === 'dark' ? '#1e293b' : '#f1f5f9')
                      : (mode === 'dark' ? (pIdx % 2 === 1 ? '#0f172a' : '#090d16') : (pIdx % 2 === 1 ? '#fdfdfe' : '#ffffff'));

                    return (
                      <TableRow
                        key={`${p.id}-${iIdx}`}
                        onMouseEnter={() => setHoveredPurchaseId(p.id)}
                        onMouseLeave={() => setHoveredPurchaseId(null)}
                        sx={{
                          transition: 'background-color 0.12s ease',
                          '&:hover': {
                            bgcolor: mode === 'dark' ? '#1e293b' : '#f8fafc',
                          },
                        }}
                      >
                        {/* Sr No - RowSpanned */}
                        {isFirst && (
                          <TableCell
                            rowSpan={itemCount}
                            align="center"
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              py: 1.2,
                              px: 0.8,
                              color: mode === 'dark' ? '#94a3b8' : '#64748b',
                              bgcolor: rowBg,
                              verticalAlign: 'middle',
                              borderRight: borderCell,
                              borderBottom: purchaseBottomBorder,
                            }}
                          >
                            {page * rowsPerPage + pIdx + 1}
                          </TableCell>
                        )}

                        {/* Challan Date & Challan No */}
                        <TableCell align="center" sx={{ fontSize: '0.8rem', py: 1.2, px: 0.8, color: mode === 'dark' ? '#cbd5e1' : '#334155', bgcolor: rowBg, verticalAlign: 'middle', whiteSpace: 'nowrap', borderRight: borderCell, borderBottom: itemBottomBorder }}>
                          {formatDate(chDate)}
                        </TableCell>
                        <TableCell align="center" sx={{ fontSize: '0.8rem', py: 1.2, px: 0.8, color: mode === 'dark' ? '#f87171' : '#e11d48', fontWeight: 600, bgcolor: rowBg, verticalAlign: 'middle', whiteSpace: 'nowrap', borderRight: borderCell, borderBottom: itemBottomBorder }}>
                          {chNo || p.purchaseNo}
                        </TableCell>

                        {/* Party Name - RowSpanned */}
                        {isFirst && (
                          <TableCell
                            rowSpan={itemCount}
                            sx={{
                              py: 1.2,
                              px: 1,
                              bgcolor: rowBg,
                              verticalAlign: 'middle',
                              borderRight: groupBorderRight,
                              borderBottom: purchaseBottomBorder,
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                              <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem', fontWeight: 700, bgcolor: mode === 'dark' ? '#3730a3' : '#e0e7ff', color: mode === 'dark' ? '#e0e7ff' : '#3730a3' }}>
                                {p.supplierName ? p.supplierName.charAt(0) : 'P'}
                              </Avatar>
                              <Typography sx={{ fontWeight: 600, fontSize: '0.825rem', color: mode === 'dark' ? '#f8fafc' : '#0f172a' }}>
                                {p.supplierName}
                              </Typography>
                            </Box>
                          </TableCell>
                        )}

                        <TableCell align="center" sx={{ fontWeight: 500, fontSize: '0.8rem', py: 1.2, px: 0.8, color: mode === 'dark' ? '#cbd5e1' : '#475569', bgcolor: rowBg, verticalAlign: 'middle', whiteSpace: 'nowrap', borderRight: borderCell, borderBottom: itemBottomBorder }}>
                          {item.quantity} {item.unit || ''}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500, fontSize: '0.8rem', py: 1.2, px: 0.8, color: mode === 'dark' ? '#e2e8f0' : '#1e293b', bgcolor: rowBg, verticalAlign: 'middle', borderRight: borderCell, borderBottom: itemBottomBorder }}>
                          {item.rate ? `${Number(item.rate).toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.8rem', py: 1.2, px: 0.8, color: mode === 'dark' ? '#a5b4fc' : '#4338ca', bgcolor: rowBg, verticalAlign: 'middle', borderRight: groupBorderRight, borderBottom: itemBottomBorder }}>
                          {itemAmt ? Number(itemAmt).toFixed(2) : '-'}
                        </TableCell>

                        {/* Tax / GST per item */}
                        <TableCell align="right" sx={{ fontSize: '0.8rem', py: 1.2, px: 0.8, color: mode === 'dark' ? '#94a3b8' : '#64748b', bgcolor: rowBg, verticalAlign: 'middle', borderRight: borderCell, borderBottom: itemBottomBorder }}>
                          {itemSgst.toFixed(2)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.8rem', py: 1.2, px: 0.8, color: mode === 'dark' ? '#94a3b8' : '#64748b', bgcolor: rowBg, verticalAlign: 'middle', borderRight: borderCell, borderBottom: itemBottomBorder }}>
                          {itemCgst.toFixed(2)}
                        </TableCell>

                        {/* Total Bill Amount - RowSpanned */}
                        {isFirst && (
                          <TableCell
                            rowSpan={itemCount}
                            align="right"
                            sx={{
                              fontWeight: 700,
                              color: mode === 'dark' ? '#f8fafc' : '#0f172a',
                              bgcolor: rowBg,
                              fontSize: '0.85rem',
                              py: 1.2,
                              px: 1,
                              verticalAlign: 'middle',
                              borderRight: groupBorderRight,
                              borderBottom: purchaseBottomBorder,
                            }}
                          >
                            {formatRupees(p.totalAmount)}
                          </TableCell>
                        )}

                        {/* Bill Date & Bill No & Payment/Cheque - RowSpanned */}
                        {isFirst && (
                          <TableCell
                            rowSpan={itemCount}
                            align="center"
                            sx={{
                              fontSize: '0.8rem',
                              py: 1.2,
                              px: 0.8,
                              color: mode === 'dark' ? '#cbd5e1' : '#475569',
                              bgcolor: rowBg,
                              verticalAlign: 'middle',
                              whiteSpace: 'nowrap',
                              borderRight: borderCell,
                              borderBottom: purchaseBottomBorder,
                            }}
                          >
                            {formatDate(p.date)}
                          </TableCell>
                        )}
                        {isFirst && (
                          <TableCell
                            rowSpan={itemCount}
                            align="center"
                            sx={{
                              color: mode === 'dark' ? '#a5b4fc' : '#4f46e5',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              py: 1.2,
                              px: 0.8,
                              bgcolor: rowBg,
                              verticalAlign: 'middle',
                              whiteSpace: 'nowrap',
                              borderRight: borderCell,
                              borderBottom: purchaseBottomBorder,
                            }}
                          >
                            {p.purchaseNo}
                          </TableCell>
                        )}
                        {isFirst && (
                          <TableCell
                            rowSpan={itemCount}
                            align="center"
                            sx={{
                              fontSize: '0.8rem',
                              py: 1.2,
                              px: 0.8,
                              fontWeight: 500,
                              color: mode === 'dark' ? '#cbd5e1' : '#475569',
                              bgcolor: rowBg,
                              verticalAlign: 'middle',
                              borderRight: groupBorderRight,
                              borderBottom: purchaseBottomBorder,
                            }}
                          >
                            {p.paymentStatus === 'Pending' || (!p.paymentStatus && (Number(p.paidAmount) || 0) === 0)
                              ? '-'
                              : p.paymentMethod === 'Cheque' || p.chequeNo
                              ? `${language === 'gu' ? 'ચેક બેંક' : 'Cheque'} ${p.chequeNo ? `#${p.chequeNo}` : ''}`
                              : (p.paymentMethod === 'Cash' || p.paymentMethod === 'રોકડ કેશ')
                              ? (language === 'gu' ? 'રોકડ કેશ' : 'Cash')
                              : p.paymentMethod || '-'}
                          </TableCell>
                        )}

                        {/* Payment Date & Status - RowSpanned */}
                        {isFirst && (
                          <TableCell
                            rowSpan={itemCount}
                            align="center"
                            sx={{
                              fontSize: '0.8rem',
                              py: 1.2,
                              px: 0.8,
                              color: mode === 'dark' ? '#cbd5e1' : '#475569',
                              bgcolor: rowBg,
                              verticalAlign: 'middle',
                              whiteSpace: 'nowrap',
                              borderRight: borderCell,
                              borderBottom: purchaseBottomBorder,
                            }}
                          >
                            {getPurchaseStatus(p) !== 'PENDING' && (p.paidAmount > 0 || p.paymentStatus === 'Paid' || p.paymentStatus === 'PAID' || p.paymentStatus === 'Partial') && p.paymentDate
                              ? formatDate(p.paymentDate)
                              : '-'}
                          </TableCell>
                        )}
                        {isFirst && (
                          <TableCell
                            rowSpan={itemCount}
                            align="center"
                            sx={{
                              py: 1.2,
                              px: 0.8,
                              bgcolor: rowBg,
                              verticalAlign: 'middle',
                              borderRight: groupBorderRight,
                              borderBottom: purchaseBottomBorder,
                            }}
                          >
                            {(() => {
                              const st = getPurchaseStatus(p);
                              return (
                                <Chip
                                  label={
                                    st === 'PAID'
                                      ? (language === 'gu' ? 'ચૂકવેલ' : 'Paid')
                                      : st === 'PARTIAL'
                                      ? (language === 'gu' ? 'અંશતઃ' : 'Partial')
                                      : (language === 'gu' ? 'બાકી' : 'Pending')
                                  }
                                  size="small"
                                  sx={{
                                    fontWeight: 700,
                                    height: 24,
                                    fontSize: '0.72rem',
                                    px: 0.8,
                                    borderRadius: 3,
                                    bgcolor:
                                      st === 'PAID'
                                        ? (mode === 'dark' ? 'rgba(34,197,94,0.15)' : '#dcfce7')
                                        : st === 'PARTIAL'
                                        ? (mode === 'dark' ? 'rgba(245,158,11,0.15)' : '#fef3c7')
                                        : (mode === 'dark' ? 'rgba(239,68,68,0.15)' : '#fee2e2'),
                                    color:
                                      st === 'PAID'
                                        ? (mode === 'dark' ? '#4ade80' : '#15803d')
                                        : st === 'PARTIAL'
                                        ? (mode === 'dark' ? '#fbbf24' : '#d97706')
                                        : (mode === 'dark' ? '#f87171' : '#b91c1c'),
                                    border: '1px solid',
                                    borderColor:
                                      st === 'PAID'
                                        ? (mode === 'dark' ? 'rgba(34,197,94,0.3)' : '#bbf7d0')
                                        : st === 'PARTIAL'
                                        ? (mode === 'dark' ? 'rgba(245,158,11,0.3)' : '#fde68a')
                                        : (mode === 'dark' ? 'rgba(239,68,68,0.3)' : '#fecaca'),
                                  }}
                                />
                              );
                            })()}
                          </TableCell>
                        )}

                        {/* Actions - RowSpanned */}
                        {isFirst && (
                          <TableCell
                            rowSpan={itemCount}
                            align="center"
                            sx={{
                              py: 1.2,
                              px: 1,
                              bgcolor: rowBg,
                              verticalAlign: 'middle',
                              borderBottom: purchaseBottomBorder,
                            }}
                          >
                            <Box sx={{ display: 'flex', gap: 0.8, justifyContent: 'center', alignItems: 'center' }}>
                              <Button
                                size="small"
                                startIcon={<ViewIcon sx={{ fontSize: '13px !important' }} />}
                                onClick={() => {
                                  setPurchaseToView(p);
                                  setViewOpen(true);
                                }}
                                sx={{
                                  textTransform: 'none',
                                  px: 1.2,
                                  py: 0.4,
                                  minWidth: 0,
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  borderRadius: 2,
                                  bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
                                  color: mode === 'dark' ? '#a855f7' : '#7c3aed',
                                  border: '1px solid',
                                  borderColor: mode === 'dark' ? '#334155' : '#e2e8f0',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                  '&:hover': {
                                    bgcolor: mode === 'dark' ? '#334155' : '#f5f3ff',
                                    borderColor: '#ddd6fe',
                                  },
                                }}
                              >
                                {language === 'gu' ? 'જુઓ' : 'View'}
                              </Button>
                              <Button
                                size="small"
                                startIcon={<EditIcon sx={{ fontSize: '13px !important' }} />}
                                onClick={() => handleOpenEditForm(p)}
                                sx={{
                                  textTransform: 'none',
                                  px: 1.2,
                                  py: 0.4,
                                  minWidth: 0,
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  borderRadius: 2,
                                  bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
                                  color: mode === 'dark' ? '#38bdf8' : '#0284c7',
                                  border: '1px solid',
                                  borderColor: mode === 'dark' ? '#334155' : '#e2e8f0',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                  '&:hover': {
                                    bgcolor: mode === 'dark' ? '#334155' : '#f0f9ff',
                                    borderColor: '#bae6fd',
                                  },
                                }}
                              >
                                {language === 'gu' ? 'સુધારો' : 'Edit'}
                              </Button>
                              <Button
                                size="small"
                                startIcon={<DeleteIcon sx={{ fontSize: '13px !important' }} />}
                                onClick={() => {
                                  setPurchaseToDelete(p.id);
                                  setDeleteOpen(true);
                                }}
                                sx={{
                                  textTransform: 'none',
                                  px: 1.2,
                                  py: 0.4,
                                  minWidth: 0,
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  borderRadius: 2,
                                  bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
                                  color: mode === 'dark' ? '#f87171' : '#dc2626',
                                  border: '1px solid',
                                  borderColor: mode === 'dark' ? '#334155' : '#e2e8f0',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                  '&:hover': {
                                    bgcolor: mode === 'dark' ? '#334155' : '#fef2f2',
                                    borderColor: '#fca5a5',
                                  },
                                }}
                              >
                                {language === 'gu' ? 'કાઢી નાખો' : 'Delete'}
                              </Button>
                            </Box>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  });
                });
              })()}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={sortedPurchases.length}
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

      <ConfirmationDialog
        open={deleteOpen}
        title="Delete Purchase Record?"
        message="Are you sure you want to delete this purchase entry?"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteOpen(false)}
      />

      {/* View Purchase Details Dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
        {purchaseToView && (
          <>
            <DialogTitle sx={{ fontWeight: 800, bgcolor: 'primary.main', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                  {language === 'gu' ? 'ખરીદી પાવતી વિગતો (Purchase Details)' : 'Purchase Voucher Details'}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  Voucher No: #{purchaseToView.purchaseNo} | Date: {formatDate(purchaseToView.date)}
                </Typography>
              </Box>
              <Chip
                label={(purchaseToView.status === 'Paid' || (purchaseToView.status as string) === 'Received' || (purchaseToView.paidAmount && purchaseToView.paidAmount > 0)) ? (language === 'gu' ? 'જમા' : 'Paid') : (language === 'gu' ? 'બાકી' : 'Pending')}
                color={(purchaseToView.status === 'Paid' || (purchaseToView.status as string) === 'Received' || (purchaseToView.paidAmount && purchaseToView.paidAmount > 0)) ? 'success' : 'error'}
                sx={{ fontWeight: 800, color: '#fff' }}
              />
            </DialogTitle>

            <DialogContent sx={{ p: 3, pt: '24px !important' }}>
              {/* Supplier Info */}
              <Box sx={{ p: 2, bgcolor: mode === 'dark' ? '#1e293b' : '#f8fafc', borderRadius: 2, border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, mb: 3, mt: 1 }}>
                <Typography variant="caption" sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>
                  Supplier / Party Information
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: mode === 'dark' ? '#f8fafc' : '#0f172a', mt: 0.5 }}>
                  {purchaseToView.supplierName}
                </Typography>
                {purchaseToView.supplierGstin && (
                  <Typography variant="body2" sx={{ color: mode === 'dark' ? '#cbd5e1' : '#475569', fontWeight: 600 }}>
                    GSTIN: {purchaseToView.supplierGstin}
                  </Typography>
                )}
              </Box>

              {/* Items Table */}
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
                {language === 'gu' ? 'મટીરીયલ વિગતો (Items List)' : 'Purchased Items List'}
              </Typography>
              <TableContainer sx={{ border: '1px solid #e2e8f0', borderRadius: 2, mb: 3 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Challan Date</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Challan No.</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Material Name</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Qty</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Unit</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Rate (₹)</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Amount (₹)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {((purchaseToView.items && purchaseToView.items.length > 0)
                      ? purchaseToView.items
                      : [
                          {
                            challanDate: purchaseToView.date,
                            challanNo: purchaseToView.purchaseNo,
                            description: purchaseToView.materialName || 'Material',
                            quantity: 1,
                            unit: 'કોન',
                            rate: purchaseToView.subtotal,
                            amount: purchaseToView.subtotal,
                          },
                        ]
                    ).map((item, i) => (
                      <TableRow key={i} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{i + 1}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{formatDate(item.challanDate || purchaseToView.date)}</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#dc2626' }}>{item.challanNo || purchaseToView.purchaseNo}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>{item.description || '-'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>{item.quantity}</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#64748b' }}>{item.unit || '-'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>₹{item.rate}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatRupees(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Calculation Breakdown & Notes */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.2fr 1fr' }, gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                    Notes / Description
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, color: '#334155', fontWeight: 500 }}>
                    {purchaseToView.notes || 'No notes added for this purchase.'}
                  </Typography>
                </Box>

                <Box sx={{ p: 2, bgcolor: '#f1f5f9', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">Subtotal:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatRupees(purchaseToView.subtotal)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">CGST (2.5%):</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatRupees(purchaseToView.cgst || 0)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">SGST (2.5%):</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatRupees(purchaseToView.sgst || 0)}</Typography>
                  </Box>
                  {Boolean(purchaseToView.adjustAmount) && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ color: (purchaseToView.adjustAmount || 0) < 0 ? 'error.main' : 'success.main', fontWeight: 600 }}>
                        Adjust Amount ({(purchaseToView.adjustAmount || 0) < 0 ? 'Discount' : 'Extra'}):
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: (purchaseToView.adjustAmount || 0) < 0 ? 'error.main' : 'success.main' }}>
                        {(purchaseToView.adjustAmount || 0) > 0 ? `+${formatRupees(purchaseToView.adjustAmount || 0)}` : formatRupees(purchaseToView.adjustAmount || 0)}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px solid #cbd5e1', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>Total Amount:</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>{formatRupees(purchaseToView.totalAmount)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 700 }}>Paid Amount:</Typography>
                    <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 700 }}>{formatRupees(purchaseToView.paidAmount)}</Typography>
                  </Box>
                </Box>
              </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={() => window.print()}
                sx={{ fontWeight: 700 }}
              >
                Print / Print Voucher
              </Button>
              <Button variant="contained" onClick={() => setViewOpen(false)} sx={{ fontWeight: 700 }}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Monthly Purchase Statement PDF Modal */}
      <PurchaseStatementModal
        open={statementModalOpen}
        onClose={() => setStatementModalOpen(false)}
        purchases={sortedPurchases}
        selectedMonth={selectedMonth}
        monthLabel={selectedMonth === 'ALL' || selectedMonth === 'All' ? 'All Months' : getMonthLabel(selectedMonth, language)}
        selectedPartyFilter={selectedPartyFilter}
        selectedStatusFilter={selectedStatusFilter}
        summaryTotals={summaryTotals}
        settings={companySettings}
        language={language}
        onExportExcel={exportMonthlyPurchaseExcel}
      />
    </Box>
  );
};
