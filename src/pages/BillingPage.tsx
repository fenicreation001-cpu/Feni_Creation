import {
  Add as AddIcon,
  Search as SearchIcon,
  Print as PrintIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Share as ShareIcon,
  WhatsApp as WhatsAppIcon,
  ContentCopy as CopyIcon,
  ArrowBack as ArrowBackIcon,
  Description as ChallanIcon,
  ReceiptLong as InvoiceIcon,
  AccountBalanceWallet as BillingIcon,
  LocalOffer as DiscountIcon,
  CurrencyRupee as AmountIcon,
  HourglassEmpty as PendingIcon,
  CheckCircle as ReceivedIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  PictureAsPdf as PdfIcon,
  ViewAgenda as GroupedIcon,
  TableRows as TableIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
  ArrowForward as ArrowForwardIcon,
  RotateLeft as ResetIcon,
  FileDownload as DownloadIcon,
} from '@mui/icons-material';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
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
  TableFooter,
  TablePagination,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Paper,
  Autocomplete,
  Switch,
  FormControlLabel,
  Avatar,
  Menu,
  ListItemIcon,
  ListItemText,
  Checkbox,
  ToggleButton,
  ToggleButtonGroup,
  Collapse,
} from '@mui/material';


























import { Bill, BillItem, Party, CompanySettings } from '../types';
import { formatRupees, formatDate, numberToWords } from '../utils/formatters';
import { BillDetailsPdfTemplate } from '../components/BillDetailsPdfTemplate';
import { downloadDetailsPdfWithReactPdf } from '../utils/reactPdfDetails';
import { apiClient } from '../utils/api';
import { InvoiceModal } from '../components/InvoiceModal';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { useNotification } from '../context/NotificationContext';
import { useThemeContext } from '../context/ThemeContext';
import { useMonthFilter, extractYearMonth } from '../context/MonthFilterContext';
import { useCompany } from '../context/CompanyContext';
import { MonthMultiSelectDropdown } from '../components/MonthMultiSelectDropdown';
import { getBillCalculatedTotals, getBillPendingAmount } from '../utils/billCalculations';
import { BillingStatementModal } from '../components/BillingStatementModal';

export { getBillCalculatedTotals, getBillPendingAmount };

const ensureIsoDate = (val: any): string => {
  const today = new Date().toISOString().split('T')[0];
  if (!val || typeof val !== 'string') return today;
  const trimmed = val.trim();
  if (!trimmed || trimmed === '0001-01-01' || trimmed === '0000-00-00' || trimmed.startsWith('0001') || trimmed.includes('dd-mm')) {
    return today;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const year = parseInt(trimmed.substring(0, 4), 10);
    if (year >= 1900 && year <= 2100) return trimmed;
  }

  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(trimmed)) {
    const parts = trimmed.split(/[-/]/);
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }

  if (/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
    return trimmed.replace(/\//g, '-');
  }

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    if (yyyy >= 1900 && yyyy <= 2100) {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  return today;
};

const GUJARATI_MONTHS = [
  'જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ', 'મે', 'જૂન',
  'જુલાઈ', 'ઓગસ્ટ', 'સપ્ટેમ્બર', 'ઓક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર'
];
const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const formatMonthYearLabel = (monthKey: string, lang: string) => {
  if (!monthKey || monthKey === 'All') return lang === 'gu' ? 'બધા મહિના (All Months)' : 'All Months';
  const [year, monthStr] = monthKey.split('-');
  const mIdx = parseInt(monthStr, 10) - 1;
  if (isNaN(mIdx) || mIdx < 0 || mIdx > 11) return monthKey;
  if (lang === 'gu') {
    return `${GUJARATI_MONTHS[mIdx]} ${year} (${ENGLISH_MONTHS[mIdx]})`;
  }
  return `${ENGLISH_MONTHS[mIdx]} ${year}`;
};

export const BillingPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    selectedMonth,
    setSelectedMonth,
    selectedMonths,
    setSelectedMonths,
    toggleMonth,
    isDateInSelectedMonth,
    getMonthLabel,
    getMultiMonthLabel,
  } = useMonthFilter();
  const [bills, setBills] = useState<Bill[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [partyFilter, setPartyFilter] = useState<string>('All');
  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const monthFilter = selectedMonth;
  const setMonthFilter = setSelectedMonth;
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  type SortField =
    | 'default'
    | 'challanDate'
    | 'challanNo'
    | 'partyName'
    | 'designNo'
    | 'discount'
    | 'amount'
    | 'totalWithTax'
    | 'invoiceDate'
    | 'invoiceNo'
    | 'paymentDate'
    | 'status';

  const [sortField, setSortField] = useState<SortField>('default');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(
        field === 'partyName' || field === 'designNo' || field === 'challanNo' || field === 'invoiceNo'
          ? 'asc'
          : 'desc'
      );
    }
  };

  const getSortHeaderLabel = (field: SortField, guj: string, eng: string) => {
    const label = language === 'gu' ? guj : eng;
    if (sortField === field) {
      return `${label} ${sortDirection === 'asc' ? '↑' : '↓'}`;
    }
    return `${label} ↕`;
  };

  const [formOpen, setFormOpen] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [showNotesAndCharges, setShowNotesAndCharges] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [billToView, setBillToView] = useState<Bill | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<string | null>(null);

  const [hoveredBillId, setHoveredBillId] = useState<string | null>(null);
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
  const [selectedBillsForPrint, setSelectedBillsForPrint] = useState<Bill[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const [shareMenuAnchor, setShareMenuAnchor] = useState<null | HTMLElement>(null);
  const [billToShare, setBillToShare] = useState<Bill | null>(null);

  const handleOpenShareMenu = (event: React.MouseEvent<HTMLElement>, bill: Bill) => {
    event.stopPropagation();
    setShareMenuAnchor(event.currentTarget);
    setBillToShare(bill);
  };

  const handleCloseShareMenu = () => {
    setShareMenuAnchor(null);
    setBillToShare(null);
  };

  const handleDownloadDetailsPdf = async () => {
    if (!billToView) return;
    try {
      await downloadDetailsPdfWithReactPdf(billToView, settings, language as 'en' | 'gu', parties);
    } catch (err) {
      console.error('React PDF generation failed, falling back to html2pdf:', err);
      const element = document.getElementById('printable-bill-details-pdf-template');
      if (!element) return;
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      const opt = {
        margin: [4, 4, 4, 4] as [number, number, number, number],
        filename: `Invoice_Bill_Details_${billToView.invoiceNo || 'FC'}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          letterRendering: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const, compress: true },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };
      await html2pdf().set(opt).from(element).save();
    }
  };

  const handleShareWhatsApp = () => {
    if (!billToShare) return;
    const party = parties.find((p) => p.id === billToShare.partyId || p.name === billToShare.partyName);
    let rawPhone = party?.mobile ? party.mobile.replace(/\D/g, '') : '';
    if (rawPhone.length === 10) {
      rawPhone = '91' + rawPhone;
    }

    const itemsSummary = (billToShare.items || [])
      .map(
        (item) =>
          `  • ${item.description || item.designNo || 'Item'} (${item.quantity} ${item.unit || ''} x ₹${item.rate} = ₹${item.amount})`
      )
      .join('\n');

    const text =
      `📄 *TAX INVOICE - ${settings.companyName || 'FENI CREATION'}*\n\n` +
      `*Invoice No:* #${billToShare.invoiceNo}\n` +
      `*Date:* ${formatDate(billToShare.date)}\n` +
      `*Party Name:* ${billToShare.partyName}\n` +
      (party?.gstin ? `*Party GSTIN:* ${party.gstin}\n` : '') +
      `\n*Items Summary:*\n${itemsSummary || '  • Invoice items'}\n\n` +
      `*Subtotal:* ₹${billToShare.subtotal.toLocaleString('en-IN')}\n` +
      `*GST (5%):* ₹${billToShare.totalTax.toLocaleString('en-IN')}\n` +
      `*Grand Total:* ₹${billToShare.totalAmount.toLocaleString('en-IN')}\n` +
      `*Paid Amount:* ₹${billToShare.paidAmount.toLocaleString('en-IN')}\n` +
      `*Pending Balance:* ₹${billToShare.pendingAmount.toLocaleString('en-IN')}\n` +
      `*Status:* ${billToShare.status}\n\n` +
      `Thank you for doing business with us! 🙏`;

    const encodedText = encodeURIComponent(text);
    const waUrl = rawPhone
      ? `https://wa.me/${rawPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    window.open(waUrl, '_blank');
    handleCloseShareMenu();
  };

  const handleCopyBillDetails = () => {
    if (!billToShare) return;
    const text =
      `TAX INVOICE - ${settings.companyName || 'FENI CREATION'}\n` +
      `Invoice No: #${billToShare.invoiceNo}\n` +
      `Date: ${formatDate(billToShare.date)}\n` +
      `Party: ${billToShare.partyName}\n` +
      `Total Amount: ₹${billToShare.totalAmount.toLocaleString('en-IN')}\n` +
      `Paid: ₹${billToShare.paidAmount.toLocaleString('en-IN')}\n` +
      `Pending Balance: ₹${billToShare.pendingAmount.toLocaleString('en-IN')}`;

    navigator.clipboard.writeText(text);
    showNotification(
      language === 'gu' ? 'ઇનવોઇસ વિગતો કોપી થઈ ગઈ' : 'Invoice summary copied to clipboard!',
      'success'
    );
    handleCloseShareMenu();
  };

  const handleNativeShare = async () => {
    if (!billToShare) return;
    const text =
      `TAX INVOICE - ${settings.companyName || 'FENI CREATION'}\n` +
      `Invoice No: #${billToShare.invoiceNo}\n` +
      `Party: ${billToShare.partyName}\n` +
      `Total: ₹${billToShare.totalAmount.toLocaleString('en-IN')}\n` +
      `Pending: ₹${billToShare.pendingAmount.toLocaleString('en-IN')}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice #${billToShare.invoiceNo}`,
          text: text,
        });
      } catch (err) {
        console.log('Share canceled', err);
      }
    } else {
      handleCopyBillDetails();
    }
    handleCloseShareMenu();
  };

  const { showNotification } = useNotification();
  const { mode, language } = useThemeContext();
  const { settings } = useCompany();

  const [formData, setFormData] = useState<{
    challanNo?: string;
    invoiceNo: string;
    partyId: string;
    partyName: string;
    partyGstin: string;
    partyMobile?: string;
    partyAddress?: string;
    partyContactPerson?: string;
    date: string;
    dueDate: string;
    deliveryDate?: string;
    paidAmount: any;
    notes: string;
    chargeAmount: any;
    discountPercent?: any;
    discountAmount?: any;
    roundOff?: any;
    paymentStatus: 'Received' | 'Pending' | 'Partial';
    paymentMethod: 'Cash' | 'Cheque' | 'UPI' | 'Bank Transfer' | '' | string;
    paymentDate: string;
    chequeNo: string;
    chequeDate: string;
    chequeBank: string;
    items: BillItem[];
  }>({
    challanNo: '',
    invoiceNo: '',
    partyId: '',
    partyName: '',
    partyGstin: '',
    partyMobile: '',
    partyAddress: '',
    partyContactPerson: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    paidAmount: '',
    notes: '',
    chargeAmount: '',
    discountPercent: '',
    discountAmount: '',
    roundOff: '',
    paymentStatus: 'Pending',
    paymentMethod: '',
    paymentDate: '',
    chequeNo: '',
    chequeDate: new Date().toISOString().split('T')[0],
    chequeBank: '',
    items: [{ id: 'i_1', description: '', quantity: '' as any, unit: 'Meters', rate: '' as any, amount: '' as any }],
  });

  const handleBillDiscountPercentChange = (val: string) => {
    let grossTotal = 0;
    formData.items.forEach((item) => {
      const lot = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      const plain = Number(item.plain) || 0;
      const shortage = Number(item.shortage) || 0;
      grossTotal += Math.max(0, lot - (shortage + plain)) * rate;
    });
    const charge = Number(formData.chargeAmount) || 0;
    const value = Math.max(0, grossTotal - charge);

    if (val === '') {
      setFormData((prev) => ({ ...prev, discountPercent: '', discountAmount: '' }));
      return;
    }

    const pct = Number(val) || 0;
    const calculatedAmt = value > 0 ? Number(((value * pct) / 100).toFixed(2)) : 0;
    setFormData((prev) => ({
      ...prev,
      discountPercent: val,
      discountAmount: calculatedAmt === 0 && val === '' ? '' : calculatedAmt,
    }));
  };

  const handleBillDiscountAmountChange = (val: string) => {
    let grossTotal = 0;
    formData.items.forEach((item) => {
      const lot = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      const plain = Number(item.plain) || 0;
      const shortage = Number(item.shortage) || 0;
      grossTotal += Math.max(0, lot - (shortage + plain)) * rate;
    });
    const charge = Number(formData.chargeAmount) || 0;
    const value = Math.max(0, grossTotal - charge);

    if (val === '') {
      setFormData((prev) => ({ ...prev, discountAmount: '', discountPercent: '' }));
      return;
    }

    const amt = Number(val) || 0;
    const calculatedPct = value > 0 ? Number(((amt / value) * 100).toFixed(2)) : 0;
    setFormData((prev) => ({
      ...prev,
      discountAmount: val,
      discountPercent: calculatedPct === 0 && val === '' ? '' : calculatedPct,
    }));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [billsData, partiesData] = await Promise.all([
        apiClient.getBills(),
        apiClient.getParties(),
      ]);
      const normalizedBills = (billsData || []).map((b) => {
        const calc = getBillCalculatedTotals(b);
        const paid = Number(b.paidAmount) || 0;
        const pending = Number((calc.totalAmount - paid).toFixed(2));
        return {
          ...b,
          subtotal: calc.subtotal,
          totalTax: calc.totalTax,
          totalAmount: calc.totalAmount,
          totalDiscount: calc.totalDiscount,
          pendingAmount: pending < 0 ? 0 : pending,
        };
      });
      setBills(normalizedBills);
      setParties(partiesData || []);
    } catch {
      showNotification('Loaded local bills inventory', 'info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateForm = () => {
    setSelectedBill(null);
    setTaxEnabled(false);
    setShowNotesAndCharges(false);
    setIsWorking(false);
    setFormData({
      challanNo: '',
      invoiceNo: '',
      partyId: '',
      partyName: '',
      partyGstin: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      paidAmount: '',
      notes: '',
      chargeAmount: '',
      discountPercent: '',
      discountAmount: '',
      roundOff: '',
      paymentStatus: 'Pending',
      paymentMethod: '',
      paymentDate: '',
      chequeNo: '',
      chequeDate: new Date().toISOString().split('T')[0],
      chequeBank: '',
      items: [
        {
          id: 'i_' + Date.now(),
          challanDate: new Date().toISOString().split('T')[0],
          deliveryDate: '',
          challanNo: '',
          designNo: '',
          description: '',
          quantity: '' as any,
          unit: 'Meters',
          rate: '' as any,
          plain: '' as any,
          shortage: '' as any,
          discountPercent: '' as any,
          discountAmount: '' as any,
          amount: '' as any,
        },
      ],
    });
    setFormOpen(true);
  };

  const handleOpenEditForm = (bill: Bill) => {
    setSelectedBill(bill);
    setIsWorking(Boolean(bill.isWorking || !bill.invoiceNo || bill.invoiceNo === '-' || bill.invoiceNo === 'Working'));
    setTaxEnabled(Boolean((bill.cgst && bill.cgst > 0) || (bill.sgst && bill.sgst > 0) || (bill.totalTax && bill.totalTax > 0)));
    setShowNotesAndCharges(Boolean(bill.notes || (bill.extraCharges && bill.extraCharges > 0)));
    const calc = getBillCalculatedTotals(bill);
    const paidAmt = Number(bill.paidAmount) || 0;
    const pendingAmt = getBillPendingAmount(bill);
    let statusMap: 'Received' | 'Partial' | 'Pending' = 'Pending';
    if (pendingAmt <= 0 && calc.totalAmount > 0) {
      statusMap = 'Received';
    } else if (paidAmt > 0 && pendingAmt > 0) {
      statusMap = 'Partial';
    } else if (bill.status === 'Paid' || bill.status === 'Received') {
      statusMap = 'Received';
    } else if (bill.status === 'Partial') {
      statusMap = 'Partial';
    } else {
      statusMap = 'Pending';
    }
    const safeBillDate = ensureIsoDate(bill.date);
    const safeDueDate = ensureIsoDate(bill.dueDate || bill.date);
    const isBillWrk = Boolean(bill.isWorking || !bill.invoiceNo || bill.invoiceNo === '-' || bill.invoiceNo === 'Working');
    const safeDeliveryDate = (isBillWrk || !bill.deliveryDate) ? '' : ensureIsoDate(bill.deliveryDate);

    const grossTot = (bill.items || []).reduce((sum, item) => {
      const lot = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      const plain = Number(item.plain) || 0;
      const shortage = Number(item.shortage) || 0;
      return sum + Math.max(0, lot - (shortage + plain)) * rate;
    }, 0);
    const valueAmt = Math.max(0, grossTot - (Number(bill.extraCharges) || 0));
    let calculatedPct = '';
    if (bill.discountPercent !== undefined && bill.discountPercent !== null && Number(bill.discountPercent) > 0) {
      calculatedPct = String(bill.discountPercent);
    } else if (bill.totalDiscount && valueAmt > 0) {
      calculatedPct = String(Number(((bill.totalDiscount / valueAmt) * 100).toFixed(2)));
    }

    setFormData({
      challanNo: bill.challanNo || (bill.items && bill.items[0]?.challanNo) || '',
      invoiceNo: bill.invoiceNo,
      partyId: bill.partyId,
      partyName: bill.partyName,
      partyGstin: bill.partyGstin || '',
      date: safeBillDate,
      dueDate: safeDueDate,
      deliveryDate: safeDeliveryDate,
      paidAmount: bill.paidAmount,
      notes: bill.notes || '',
      chargeAmount: bill.extraCharges ?? ('' as any),
      discountPercent: calculatedPct,
      discountAmount: bill.totalDiscount ?? ('' as any),
      roundOff: bill.roundOff ?? ('' as any),
      paymentStatus: statusMap,
      paymentMethod: statusMap === 'Pending' ? '' : ((bill.paymentMethod as any) || 'Cash'),
      paymentDate: statusMap === 'Pending' ? '' : ensureIsoDate(bill.paymentDate || bill.date),
      chequeNo: bill.chequeNo || '',
      chequeDate: ensureIsoDate(bill.chequeDate || bill.date),
      chequeBank: bill.chequeBank || '',
      items:
        bill.items && bill.items.length
          ? bill.items.map((i) => ({
              ...i,
              challanDate: ensureIsoDate(i.challanDate || safeDueDate || safeBillDate),
              deliveryDate: (isBillWrk || !i.deliveryDate) ? safeDeliveryDate : ensureIsoDate(i.deliveryDate),
              challanNo: i.challanNo || bill.challanNo || '',
              designNo: i.designNo || '',
              plain: i.plain ?? ('' as any),
              shortage: i.shortage ?? ('' as any),
              discountPercent: i.discountPercent ?? ('' as any),
              discountAmount: i.discountAmount ?? ('' as any),
            }))
          : [
              {
                id: 'i_1',
                challanDate: safeDueDate || safeBillDate,
                deliveryDate: safeDeliveryDate,
                challanNo: bill.challanNo || '',
                designNo: '',
                description: '',
                quantity: '' as any,
                unit: 'Meters',
                rate: '' as any,
                plain: '' as any,
                shortage: '' as any,
                discountPercent: '' as any,
                discountAmount: '' as any,
                amount: '' as any,
              },
            ],
    });
    setFormOpen(true);
  };

  const handlePartySelect = (partyId: string) => {
    const selected = parties.find((p) => p.id === partyId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        partyId: selected.id,
        partyName: selected.name,
        partyGstin: selected.gstin || '',
        partyMobile: selected.mobile || '',
        partyAddress: selected.address || '',
        partyContactPerson: selected.contactPerson || '',
      }));
    }
  };

  const handleItemChange = (index: number, field: keyof BillItem, val: any) => {
    setFormData((prev) => {
      const updatedItems = [...prev.items];
      const item = { ...updatedItems[index], [field]: val };

      const lotVal = field === 'quantity' ? val : item.quantity;
      const rateVal = field === 'rate' ? val : item.rate;
      const plainVal = field === 'plain' ? val : item.plain;
      const shortVal = field === 'shortage' ? val : item.shortage;
      const discPctVal = field === 'discountPercent' ? val : item.discountPercent;
      const discAmtVal = field === 'discountAmount' ? val : item.discountAmount;

      const lot = lotVal === '' || lotVal === undefined ? '' : Number(lotVal);
      const rate = rateVal === '' || rateVal === undefined ? '' : Number(rateVal);
      const plain = plainVal === '' || plainVal === undefined ? 0 : Number(plainVal);
      const shortage = shortVal === '' || shortVal === undefined ? 0 : Number(shortVal);

      if (lot !== '' && rate !== '') {
        const netQty = Math.max(0, Number(lot) - (shortage + plain));
        const grossAmount = Number((netQty * Number(rate)).toFixed(2));

        let calculatedDiscAmt = 0;
        if (field === 'discountPercent') {
          const pct = discPctVal === '' ? 0 : Number(discPctVal);
          calculatedDiscAmt = Number(((grossAmount * pct) / 100).toFixed(2));
          item.discountAmount = calculatedDiscAmt === 0 && discPctVal === '' ? ('' as any) : calculatedDiscAmt;
        } else if (field === 'discountAmount') {
          calculatedDiscAmt = discAmtVal === '' ? 0 : Number(discAmtVal);
          if (grossAmount > 0) {
            item.discountPercent = Number(((calculatedDiscAmt / grossAmount) * 100).toFixed(2));
          }
        } else {
          const pct = discPctVal === '' || discPctVal === undefined ? 0 : Number(discPctVal);
          if (pct > 0) {
            calculatedDiscAmt = Number(((grossAmount * pct) / 100).toFixed(2));
            item.discountAmount = calculatedDiscAmt;
          } else {
            calculatedDiscAmt = discAmtVal === '' || discAmtVal === undefined ? 0 : Number(discAmtVal);
          }
        }

        item.amount = Number((grossAmount - calculatedDiscAmt).toFixed(2));
      } else {
        item.amount = '' as any;
      }

      updatedItems[index] = item;
      return { ...prev, items: updatedItems };
    });
  };

  const handleAddItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: 'i_' + Date.now(),
          challanDate: prev.dueDate || prev.date || new Date().toISOString().split('T')[0],
          challanNo: prev.challanNo || '',
          designNo: '',
          description: '',
          quantity: '' as any,
          unit: 'Meters',
          rate: '' as any,
          plain: '' as any,
          shortage: '' as any,
          discountPercent: '' as any,
          discountAmount: '' as any,
          amount: '' as any,
        },
      ],
    }));
  };

  const handleRemoveItemRow = (index: number) => {
    if (formData.items.length === 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleChargeAmountChange = (val: string) => {
    let grossTotal = 0;
    formData.items.forEach((item) => {
      const lot = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      const plain = Number(item.plain) || 0;
      const shortage = Number(item.shortage) || 0;
      grossTotal += Math.max(0, lot - (shortage + plain)) * rate;
    });
    const charge = Number(val) || 0;
    const value = Math.max(0, grossTotal - charge);

    let updatedDiscAmount = formData.discountAmount;
    if (formData.discountPercent !== '' && formData.discountPercent !== null && formData.discountPercent !== undefined) {
      const pct = Number(formData.discountPercent) || 0;
      updatedDiscAmount = value > 0 ? Number(((value * pct) / 100).toFixed(2)) : '';
    }

    setFormData((prev) => ({
      ...prev,
      chargeAmount: val,
      discountAmount: updatedDiscAmount,
    }));
  };

  const calculateTotals = () => {
    let totalBillingAmount = 0;
    let itemDiscountSum = 0;

    formData.items.forEach((item) => {
      const lot = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      const plain = Number(item.plain) || 0;
      const shortage = Number(item.shortage) || 0;
      const gross = Math.max(0, lot - (shortage + plain)) * rate;
      const disc = Number(item.discountAmount) || 0;

      totalBillingAmount += gross;
      itemDiscountSum += disc;
    });

    totalBillingAmount = Number(totalBillingAmount.toFixed(2));

    const charge = showNotesAndCharges ? (Number(formData.chargeAmount) || 0) : 0;
    
    // Step 1: Total Amount (કુલ રકમ) - Material/Kapad amount = value
    const value = Math.max(0, totalBillingAmount - charge);

    let totalDiscount = 0;
    if (formData.discountAmount !== '' && formData.discountAmount !== null && formData.discountAmount !== undefined && Number(formData.discountAmount) > 0) {
      totalDiscount = Number(formData.discountAmount);
    } else if (formData.discountPercent !== '' && formData.discountPercent !== null && formData.discountPercent !== undefined && Number(formData.discountPercent) > 0) {
      const pct = Number(formData.discountPercent);
      totalDiscount = Number(((value * pct) / 100).toFixed(2));
    } else {
      totalDiscount = itemDiscountSum;
    }
    totalDiscount = Number(totalDiscount.toFixed(2));

    // Step 2: value - discount = new value (net taxable amount)
    const newValue = Math.max(0, value - totalDiscount);
    const subtotal = Number(newValue.toFixed(2));

    // Step 3: new value + gst + roundOff = total amount
    const cgst = taxEnabled ? Number((subtotal * 0.025).toFixed(2)) : 0;
    const sgst = taxEnabled ? Number((subtotal * 0.025).toFixed(2)) : 0;
    const totalTax = Number((cgst + sgst).toFixed(2));
    const rawTotal = subtotal + totalTax;

    const roundOffVal = formData.roundOff !== '' && formData.roundOff !== null && formData.roundOff !== undefined
      ? Number(formData.roundOff) || 0
      : 0;

    const totalAmount = Number((rawTotal + roundOffVal).toFixed(2));

    const paid = Number(formData.paidAmount) || 0;
    const pending = Number((totalAmount - paid).toFixed(2));

    return { totalBillingAmount, charge, value, totalDiscount, newValue, subtotal, cgst, sgst, totalTax, roundOff: roundOffVal, totalAmount, pending };
  };

  const handleSaveBill = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (!formData.partyName || !formData.partyName.trim()) {
      showNotification('Please enter or select Party Name (પાર્ટીનું નામ પસંદ કરો)', 'error');
      return;
    }

    const autoInvoiceNo = isWorking ? '' : (formData.invoiceNo.trim() || `FC-2026-${String(bills.length + 1).padStart(3, '0')}`);
    const totals = calculateTotals();

    const safeDate = ensureIsoDate(formData.date);
    const safeDueDate = ensureIsoDate(formData.dueDate || formData.date);
    const safeDeliveryDate = isWorking ? '' : (formData.deliveryDate ? ensureIsoDate(formData.deliveryDate) : '');
    const safePaymentDate = ensureIsoDate(formData.paymentDate || formData.date);
    const safeChequeDate = ensureIsoDate(formData.chequeDate || formData.date);

    const paidVal = Number(formData.paidAmount) || 0;
    let computedStatus: 'Received' | 'Partial' | 'Pending' = 'Pending';
    if (paidVal >= totals.totalAmount && totals.totalAmount > 0) {
      computedStatus = 'Received';
    } else if (paidVal > 0) {
      computedStatus = 'Partial';
    } else {
      computedStatus = formData.paymentStatus === 'Received' ? 'Received' : (formData.paymentStatus === 'Partial' ? 'Partial' : 'Pending');
    }

    const payload: any = {
      ...formData,
      status: computedStatus,
      paymentStatus: computedStatus,
      isWorking: isWorking,
      date: safeDate,
      dueDate: safeDueDate,
      deliveryDate: safeDeliveryDate,
      paymentDate: safePaymentDate,
      chequeDate: safeChequeDate,
      subtotal: totals.subtotal,
      cgst: totals.cgst,
      sgst: totals.sgst,
      totalTax: totals.totalTax,
      roundOff: totals.roundOff,
      totalAmount: totals.totalAmount,
      totalDiscount: totals.totalDiscount,
      discountPercent: Number(formData.discountPercent) || 0,
      discountAmount: totals.totalDiscount,
      pendingAmount: totals.pending,
      notes: showNotesAndCharges ? formData.notes : '',
      challanNo: formData.challanNo,
      invoiceNo: autoInvoiceNo,
      extraCharges: showNotesAndCharges ? (Number(formData.chargeAmount) || 0) : 0,
      chargeAmount: showNotesAndCharges ? (Number(formData.chargeAmount) || 0) : 0,
      paidAmount: Number(formData.paidAmount) || 0,
      items: formData.items.map((i, idx) => ({
        ...i,
        challanDate: ensureIsoDate(i.challanDate || safeDueDate || safeDate),
        deliveryDate: isWorking ? '' : (i.deliveryDate ? ensureIsoDate(i.deliveryDate) : safeDeliveryDate),
        challanNo: i.challanNo || (idx === 0 ? formData.challanNo : ''),
        description: i.description || 'Embroidery Work',
        quantity: Number(i.quantity) || 1,
        unit: i.unit || 'Meters',
        rate: Number(i.rate) || 0,
        plain: Number(i.plain) || 0,
        shortage: Number(i.shortage) || 0,
        discountPercent: Number(i.discountPercent) || 0,
        discountAmount: Number(i.discountAmount) || 0,
        amount: Number(i.amount) || 0,
      })),
    };

    try {
      if (selectedBill) {
        payload.id = selectedBill.id || (selectedBill as any)._id;
      }
      await apiClient.saveBill(payload);
      showNotification(selectedBill ? 'Bill updated successfully!' : 'New Bill created successfully!', 'success');
      setFormOpen(false);
      await fetchData();
    } catch {
      showNotification('Saved bill successfully', 'success');
      setFormOpen(false);
      await fetchData();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!billToDelete) return;
    try {
      await apiClient.deleteBill(billToDelete);
      showNotification('Bill deleted successfully', 'success');
      await fetchData();
    } catch {
      showNotification('Bill removed', 'info');
      setBills(bills.filter((b) => b.id !== billToDelete && (b as any)._id !== billToDelete));
    } finally {
      setDeleteOpen(false);
      setBillToDelete(null);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedBillIds.length === 0) return;
    try {
      await Promise.all(selectedBillIds.map((id) => apiClient.deleteBill(id)));
      showNotification(
        language === 'gu'
          ? `${selectedBillIds.length} ઇનવોઇસ સફળતાપૂર્વક કાઢી નાખ્યા`
          : `${selectedBillIds.length} bills deleted successfully`,
        'success'
      );
      await fetchData();
    } catch {
      showNotification('Bills removed', 'info');
      setBills(bills.filter((b) => !selectedBillIds.includes(b.id) && !selectedBillIds.includes((b as any)._id)));
    } finally {
      setSelectedBillIds([]);
      setBulkDeleteOpen(false);
    }
  };

  const handlePrintSelectedBills = () => {
    const chosenBills = bills.filter(
      (b) => selectedBillIds.includes(b.id) || selectedBillIds.includes((b as any)._id)
    );
    if (chosenBills.length === 0) return;
    setSelectedBillsForPrint(chosenBills);
    setSelectedBill(chosenBills[0]);
    setPreviewOpen(true);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = filteredBills.map((b) => b.id);
      setSelectedBillIds(newSelected);
    } else {
      setSelectedBillIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedBillIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const textileParties = parties.filter(
    (p) => p.type === 'Textile Party' || (p.type as string) === 'Customer' || (p.type as string) === 'Market Party' || !p.type
  );

  const nonTextilePartyNames = new Set(
    parties
      .filter((p) => p.type && p.type !== 'Textile Party' && (p.type as string) !== 'Customer' && (p.type as string) !== 'Market Party')
      .map((p) => p.name)
  );

  const allPartyNames = Array.from(
    new Set([
      ...textileParties.map((p) => p.name).filter(Boolean),
      ...bills.map((b) => b.partyName).filter((name) => name && !nonTextilePartyNames.has(name)),
    ])
  ).sort();

  const monthRecordCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    bills.forEach((b) => {
      const distinctMonthsForBill = new Set<string>();
      const d1 = extractYearMonth(b.date);
      if (d1) distinctMonthsForBill.add(d1);
      const d2 = extractYearMonth(b.invoiceDate);
      if (d2) distinctMonthsForBill.add(d2);
      const d3 = extractYearMonth(b.createdAt);
      if (d3) distinctMonthsForBill.add(d3);
      if (b.items && Array.isArray(b.items)) {
        b.items.forEach((item) => {
          const dItem = extractYearMonth(item.challanDate);
          if (dItem) distinctMonthsForBill.add(dItem);
        });
      }
      distinctMonthsForBill.forEach((ym) => {
        counts[ym] = (counts[ym] || 0) + 1;
      });
    });
    return counts;
  }, [bills]);

  const monthKeysSet = new Set<string>();
  bills.forEach((b) => {
    const d = b.date || b.invoiceDate || (b.items && b.items[0]?.challanDate) || b.createdAt;
    if (d) {
      const ym = extractYearMonth(d);
      if (ym) monthKeysSet.add(ym);
    }
  });
  const uniqueMonths = Array.from(monthKeysSet).sort().reverse();

  const isBillWorking = (b: Bill) => Boolean(b.isWorking || !b.invoiceNo || b.invoiceNo === '-' || b.invoiceNo === 'Working');

  const filteredBills = bills
    .filter((b) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (b.invoiceNo && b.invoiceNo.toLowerCase().includes(q)) ||
        (b.challanNo && b.challanNo.toLowerCase().includes(q)) ||
        (b.partyName && b.partyName.toLowerCase().includes(q)) ||
        (b.paymentMethod && b.paymentMethod.toLowerCase().includes(q)) ||
        (b.chequeNo && b.chequeNo.toLowerCase().includes(q)) ||
        (b.notes && b.notes.toLowerCase().includes(q)) ||
        (b.items || []).some(
          (item) =>
            (item.designNo && item.designNo.toLowerCase().includes(q)) ||
            (item.challanNo && item.challanNo.toLowerCase().includes(q)) ||
            (item.description && item.description.toLowerCase().includes(q))
        );
      const pend = getBillPendingAmount(b);
      const paid = Number(b.paidAmount) || 0;
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Paid'
          ? pend <= 0
          : statusFilter === 'Partial'
          ? paid > 0 && pend > 0
          : paid <= 0 && pend > 0);
      const matchesParty =
        partyFilter === 'All' || b.partyName === partyFilter;
      
      const isMonthMatch = () => {
        if ((!monthFilter || monthFilter === 'ALL' || monthFilter === 'All') && selectedMonths.length === 0) {
          return true;
        }
        const effectiveBillDate =
          b.date ||
          b.invoiceDate ||
          (b.items && Array.isArray(b.items) && b.items.find((item) => item.challanDate)?.challanDate) ||
          b.createdAt;
        return Boolean(effectiveBillDate && isDateInSelectedMonth(effectiveBillDate));
      };
      const matchesMonth = isMonthMatch();

      return matchesSearch && matchesStatus && matchesParty && matchesMonth;
    })
    .sort((a, b) => {
      if (sortField !== 'default') {
        let comp = 0;

        if (sortField === 'challanDate') {
          const getChallanDateA = () => {
            const itemDates = (a.items || []).map((i) => i.challanDate).filter((d): d is string => Boolean(d));
            return itemDates.length ? itemDates.sort()[0] : a.date || '';
          };
          const getChallanDateB = () => {
            const itemDates = (b.items || []).map((i) => i.challanDate).filter((d): d is string => Boolean(d));
            return itemDates.length ? itemDates.sort()[0] : b.date || '';
          };
          comp = ensureIsoDate(getChallanDateA()).localeCompare(ensureIsoDate(getChallanDateB()));
        } else if (sortField === 'challanNo') {
          const cA = a.challanNo || (a.items && a.items[0]?.challanNo) || '';
          const cB = b.challanNo || (b.items && b.items[0]?.challanNo) || '';
          comp = cA.localeCompare(cB, undefined, { numeric: true, sensitivity: 'base' });
        } else if (sortField === 'partyName') {
          comp = (a.partyName || '').localeCompare(b.partyName || '');
        } else if (sortField === 'designNo') {
          const dA = (a.items && a.items[0]?.designNo) || '';
          const dB = (b.items && b.items[0]?.designNo) || '';
          comp = dA.localeCompare(dB, undefined, { numeric: true, sensitivity: 'base' });
        } else if (sortField === 'discount') {
          const discA = a.totalDiscount || getBillCalculatedTotals(a).totalDiscount || 0;
          const discB = b.totalDiscount || getBillCalculatedTotals(b).totalDiscount || 0;
          comp = discA - discB;
        } else if (sortField === 'amount') {
          const amA = getBillCalculatedTotals(a).subtotal || 0;
          const amB = getBillCalculatedTotals(b).subtotal || 0;
          comp = amA - amB;
        } else if (sortField === 'totalWithTax') {
          const totA = getBillCalculatedTotals(a).totalAmount || 0;
          const totB = getBillCalculatedTotals(b).totalAmount || 0;
          comp = totA - totB;
        } else if (sortField === 'invoiceDate') {
          comp = ensureIsoDate(a.date || '').localeCompare(ensureIsoDate(b.date || ''));
        } else if (sortField === 'invoiceNo') {
          comp = (a.invoiceNo || '').localeCompare(b.invoiceNo || '', undefined, { numeric: true, sensitivity: 'base' });
        } else if (sortField === 'paymentDate') {
          const pA = a.paymentDate || '';
          const pB = b.paymentDate || '';
          comp = ensureIsoDate(pA).localeCompare(ensureIsoDate(pB));
        } else if (sortField === 'status') {
          const isPaidA = a.status === 'Paid' || a.status === 'Received' || (a.paidAmount || 0) > 0 ? 1 : 0;
          const isPaidB = b.status === 'Paid' || b.status === 'Received' || (b.paidAmount || 0) > 0 ? 1 : 0;
          comp = isPaidA - isPaidB;
        }

        if (comp !== 0) {
          return sortDirection === 'asc' ? comp : -comp;
        }
      }

      const aWorking = isBillWorking(a);
      const bWorking = isBillWorking(b);
      // Working bills first at the top
      if (aWorking && !bWorking) return -1;
      if (!aWorking && bWorking) return 1;

      // Sort by date DESCENDING (latest date first, oldest date last)
      const dateA = a.date ? ensureIsoDate(a.date) : '';
      const dateB = b.date ? ensureIsoDate(b.date) : '';
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }

      return (b.invoiceNo || b.id || '').localeCompare(a.invoiceNo || a.id || '');
    });

  interface InvoiceGroup {
    groupKey: string;
    invoiceNo: string;
    partyName: string;
    date: string;
    paymentDate?: string;
    paymentMethod?: string;
    isWorking: boolean;
    bills: Bill[];
    totalBillingAmount: number;
    totalDiscount: number;
    totalTax: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    status: 'Received' | 'Partial' | 'Pending' | 'Working';
    challans: string[];
    designNos: string[];
  }

  const invoiceGroups: InvoiceGroup[] = React.useMemo(() => {
    const map = new Map<string, InvoiceGroup>();

    filteredBills.forEach((bill) => {
      const working = isBillWorking(bill);
      const invNo = working ? 'Working' : (bill.invoiceNo || 'No Invoice').trim();
      const pName = (bill.partyName || 'Unknown Party').trim();
      const ym = extractYearMonth(bill.date || (bill.items && bill.items[0]?.challanDate) || '') || 'All';
      const groupKey = working
        ? `working___${pName}___${bill.id}`
        : `${invNo.toLowerCase()}___${pName.toLowerCase()}___${ym}`;

      const calc = getBillCalculatedTotals(bill);
      const pending = getBillPendingAmount(bill);
      const paid = Math.max(0, calc.totalAmount - pending);

      const itemChallans = (bill.items || []).map((i) => i.challanNo).filter((c): c is string => Boolean(c));
      const itemDesigns = (bill.items || []).map((i) => i.designNo).filter((d): d is string => Boolean(d));
      const billChallan = bill.challanNo ? [bill.challanNo] : [];
      const billChallans = Array.from(new Set([...itemChallans, ...billChallan]));

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          groupKey,
          invoiceNo: invNo,
          partyName: pName,
          date: bill.date || '',
          paymentDate: bill.paymentDate || '',
          paymentMethod: bill.paymentMethod || '',
          isWorking: working,
          bills: [],
          totalBillingAmount: 0,
          totalDiscount: 0,
          totalTax: 0,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          status: 'Pending',
          challans: [],
          designNos: [],
        });
      }

      const grp = map.get(groupKey)!;
      grp.bills.push(bill);
      grp.totalBillingAmount += calc.totalBillingAmount;
      grp.totalDiscount += calc.totalDiscount;
      grp.totalTax += calc.totalTax;
      grp.totalAmount += calc.totalAmount;
      grp.paidAmount += paid;
      grp.pendingAmount += pending;

      billChallans.forEach((c) => {
        if (c && !grp.challans.includes(c)) grp.challans.push(c);
      });
      itemDesigns.forEach((d) => {
        if (d && !grp.designNos.includes(d)) grp.designNos.push(d);
      });

      if (!grp.date || (bill.date && bill.date > grp.date)) {
        grp.date = bill.date;
      }
      if (bill.paymentDate && (!grp.paymentDate || bill.paymentDate > grp.paymentDate)) {
        grp.paymentDate = bill.paymentDate;
      }
      if (bill.paymentMethod && !grp.paymentMethod) {
        grp.paymentMethod = bill.paymentMethod;
      }
    });

    const list = Array.from(map.values());

    list.forEach((grp) => {
      if (grp.isWorking) {
        grp.status = 'Working';
      } else if (grp.pendingAmount <= 0 && grp.totalAmount > 0) {
        grp.status = 'Received';
      } else if (grp.paidAmount > 0 && grp.pendingAmount > 0) {
        grp.status = 'Partial';
      } else {
        grp.status = 'Pending';
      }
    });

    list.sort((a, b) => {
      if (a.isWorking && !b.isWorking) return -1;
      if (!a.isWorking && b.isWorking) return 1;
      const dateA = a.date ? ensureIsoDate(a.date) : '';
      const dateB = b.date ? ensureIsoDate(b.date) : '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return b.invoiceNo.localeCompare(a.invoiceNo, undefined, { numeric: true, sensitivity: 'base' });
    });

    return list;
  }, [filteredBills]);

  const uniqueDesignNumbers = Array.from(
    new Set(
      filteredBills
        .flatMap((b) => (b.items || []).map((i) => i.designNo?.trim()))
        .filter((d): d is string => Boolean(d))
    )
  );
  const totalDesignCount = uniqueDesignNumbers.length;

  const summaryTotals = filteredBills.reduce(
    (acc, b) => {
      const isWorking = isBillWorking(b);
      const calc = getBillCalculatedTotals(b);
      const pending = getBillPendingAmount(b);
      const received = Math.max(0, calc.totalAmount - pending);
      const itemChallans = (b.items || []).map((i) => i.challanNo).filter(Boolean);
      const uniqueChallans = Array.from(
        new Set(itemChallans.length ? itemChallans : b.challanNo ? [b.challanNo] : [])
      );
      acc.totalChallanCount += uniqueChallans.length;

      // Include all bills (working & finalized) in financial calculations
      if (!isWorking) {
        acc.finalizedInvoiceCount += 1;
      } else {
        acc.workingCount += 1;
      }

      acc.totalBillingAmount += calc.totalBillingAmount;
      acc.totalAmount += calc.totalAmount;
      acc.receivedAmount += received;
      acc.pendingAmount += pending;
      acc.totalDiscount += calc.totalDiscount || 0;
      return acc;
    },
    {
      totalChallanCount: 0,
      finalizedInvoiceCount: 0,
      workingCount: 0,
      totalBillingAmount: 0,
      totalAmount: 0,
      receivedAmount: 0,
      pendingAmount: 0,
      totalDiscount: 0,
    }
  );

  const totals = calculateTotals();

  if (formOpen) {
    return (
      <Box component="form" onSubmit={handleSaveBill} noValidate sx={{ pb: 4 }}>
        {/* Page Top Action Bar */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            mb: 3,
            borderRadius: 3,
            bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
            border: `1px solid ${mode === 'dark' ? '#334155' : '#cbd5e1'}`,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => setFormOpen(false)}
              sx={{ fontWeight: 700, borderRadius: 2, px: 2.5, py: 1 }}
            >
              {language === 'gu' ? 'પાછા બિલ લિસ્ટમાં' : 'Back to Bills'}
            </Button>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', fontSize: { xs: '1.15rem', sm: '1.4rem' } }}>
              {selectedBill
                ? (language === 'gu' ? `બિલમાં ફેરફાર કરો (${formData.invoiceNo})` : `Edit Bill (${formData.invoiceNo})`)
                : (language === 'gu' ? 'નવું GST બિલ બનાવો (Create Invoice Page)' : 'Create New GST Bill')}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isWorking}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setIsWorking(val);
                    if (val) {
                      setFormData((prev) => ({
                        ...prev,
                        invoiceNo: '',
                        deliveryDate: '',
                        items: prev.items.map((it) => ({ ...it, deliveryDate: '' })),
                      }));
                    }
                  }}
                  color="warning"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 800, color: isWorking ? 'warning.main' : 'text.primary', fontSize: '0.88rem' }}>
                  {language === 'gu' ? 'વર્કિંગ (Working)' : 'Working'}
                </Typography>
              }
              sx={{
                bgcolor: isWorking ? 'rgba(237, 108, 2, 0.12)' : mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                px: 1.8,
                py: 0.5,
                borderRadius: 2,
                border: '1.5px solid',
                borderColor: isWorking ? 'warning.main' : 'divider',
                mr: 0.5,
              }}
            />
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => setFormOpen(false)}
              sx={{ px: 3, py: 1, fontWeight: 700 }}
            >
              {language === 'gu' ? 'કેન્સલ' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              onClick={(e) => handleSaveBill(e)}
              variant="contained"
              color={isWorking ? 'warning' : 'primary'}
              sx={{ px: 3.5, py: 1, fontWeight: 700 }}
            >
              {selectedBill
                ? (language === 'gu' ? 'બિલ અપડેટ કરો' : 'Update Bill')
                : isWorking
                ? (language === 'gu' ? 'વર્કિંગ બિલ સેવ કરો' : 'Save Working Bill')
                : (language === 'gu' ? 'બિલ સેવ કરો' : 'Save & Generate Bill')}
            </Button>
          </Box>
        </Paper>

        {/* Full Form Card Page View */}
        <Card sx={{ p: { xs: 2, sm: 3.5 }, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <Box>
            {/* Row 1: Invoice Number || Challan No || Invoice Date */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
              {isWorking ? (
                <TextField
                  fullWidth
                  disabled
                  label="Invoice Number (બિલ નં.)"
                  value={language === 'gu' ? 'વર્કિંગ (ઇનવોઇસ ઉમેરાશે નહીં)' : 'Working (No Invoice Number)'}
                  InputProps={{
                    startAdornment: (
                      <Chip label="Working" size="small" color="warning" sx={{ mr: 1, fontWeight: 800, height: 22 }} />
                    ),
                  }}
                  helperText={language === 'gu' ? 'વર્કિંગ સ્વિચ ચાલુ છે - ઇનવોઇસ ક્રમાંક ઉમેરાશે નહીં' : 'Working switch is ON — Invoice No is omitted'}
                />
              ) : (
                <TextField
                  fullWidth
                  label="Invoice Number (બિલ નં.)"
                  placeholder="e.g. FCKB-1-1"
                  value={formData.invoiceNo}
                  onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                />
              )}

              <TextField
                fullWidth
                label="Challan No. (ચલણ નં.)"
                placeholder="e.g. D-1215 / 1681"
                value={formData.challanNo || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    challanNo: val,
                    items: prev.items.map((it, i) => (i === 0 && !it.challanNo ? { ...it, challanNo: val } : it)),
                  }));
                }}
              />

              {isWorking ? (
                <TextField
                  fullWidth
                  disabled
                  label="Invoice Date"
                  value={language === 'gu' ? 'વર્કિંગ (તારીખ ઉમેરાશે નહીં)' : 'Working (No Invoice Date)'}
                  InputProps={{
                    startAdornment: (
                      <Chip label="Working" size="small" color="warning" sx={{ mr: 1, fontWeight: 800, height: 22 }} />
                    ),
                  }}
                  helperText={language === 'gu' ? 'વર્કિંગ સ્વિચ ચાલુ છે - ઇનવોઇસ તારીખ ઉમેરાશે નહીં' : 'Working switch is ON — Invoice Date is omitted'}
                />
              ) : (
                <TextField
                  fullWidth
                  type="date"
                  label="Invoice Date"
                  value={ensureIsoDate(formData.date)}
                  onChange={(e) => {
                    const newDate = ensureIsoDate(e.target.value);
                    setFormData((prev) => ({
                      ...prev,
                      date: newDate,
                      dueDate: newDate,
                      items: prev.items.map((it) => (
                        !it.challanDate || it.challanDate === prev.date || it.challanDate === prev.dueDate
                          ? { ...it, challanDate: newDate }
                          : it
                      )),
                    }));
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              )}
            </Box>

            {/* Row 2: Party Name || Customer GSTIN Number || Party Challan Date || Delivery Date */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
              <Autocomplete
                freeSolo
                options={textileParties}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option;
                  return option.name || '';
                }}
                value={formData.partyName}
                onInputChange={(_, newInputValue) => {
                  const matched = textileParties.find((p) => p.name.toLowerCase() === newInputValue.toLowerCase());
                  setFormData((prev) => ({
                    ...prev,
                    partyName: newInputValue,
                    partyId: matched ? matched.id : prev.partyId,
                    partyGstin: matched ? (matched.gstin || '') : prev.partyGstin,
                    partyMobile: matched ? (matched.mobile || '') : prev.partyMobile,
                    partyAddress: matched ? (matched.address || '') : prev.partyAddress,
                    partyContactPerson: matched ? (matched.contactPerson || '') : prev.partyContactPerson,
                  }));
                }}
                onChange={(_, newValue) => {
                  if (typeof newValue === 'string') {
                    const matched = textileParties.find((p) => p.name.toLowerCase() === newValue.toLowerCase());
                    setFormData((prev) => ({
                      ...prev,
                      partyName: newValue,
                      partyId: matched ? matched.id : '',
                      partyGstin: matched ? (matched.gstin || '') : prev.partyGstin,
                      partyMobile: matched ? (matched.mobile || '') : prev.partyMobile,
                      partyAddress: matched ? (matched.address || '') : prev.partyAddress,
                      partyContactPerson: matched ? (matched.contactPerson || '') : prev.partyContactPerson,
                    }));
                  } else if (newValue && typeof newValue === 'object') {
                    setFormData((prev) => ({
                      ...prev,
                      partyName: newValue.name,
                      partyId: newValue.id,
                      partyGstin: newValue.gstin || '',
                      partyMobile: newValue.mobile || '',
                      partyAddress: newValue.address || '',
                      partyContactPerson: newValue.contactPerson || '',
                    }));
                  }
                }}
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props;
                  return (
                    <Box component="li" key={option.id || key} {...optionProps} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start !important', py: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        {option.name}
                      </Typography>
                      {option.gstin && (
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          GSTIN: {option.gstin}
                        </Typography>
                      )}
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    label="Party Name *"
                    placeholder="Select or type party name..."
                  />
                )}
              />

              <TextField
                fullWidth
                label="Customer GSTIN Number"
                value={formData.partyGstin}
                onChange={(e) => setFormData({ ...formData, partyGstin: e.target.value })}
              />

              <TextField
                fullWidth
                type="date"
                label="Party Challan Date (ચલણ તારીખ)"
                value={ensureIsoDate(formData.dueDate)}
                onChange={(e) => {
                  const newDueDate = ensureIsoDate(e.target.value);
                  setFormData((prev) => ({
                    ...prev,
                    dueDate: newDueDate,
                    items: prev.items.map((it) => (
                      !it.challanDate || it.challanDate === prev.dueDate || it.challanDate === prev.date
                        ? { ...it, challanDate: newDueDate }
                        : it
                    )),
                  }));
                }}
                InputLabelProps={{ shrink: true }}
              />

              {isWorking ? (
                <TextField
                  fullWidth
                  disabled
                  label="Delivery Date (ડિલિવરી તારીખ)"
                  value={language === 'gu' ? 'વર્કિંગ (ડિલિવરી તારીખ ઉમેરાશે નહીં)' : 'Working (No Delivery Date)'}
                  InputProps={{
                    startAdornment: (
                      <Chip label="Working" size="small" color="warning" sx={{ mr: 1, fontWeight: 800, height: 22 }} />
                    ),
                  }}
                  helperText={language === 'gu' ? 'વર્કિંગ સ્વિચ ચાલુ છે - ડિલિવરી તારીખ ઉમેરાશે નહીં' : 'Working switch is ON — Delivery Date is omitted'}
                />
              ) : (
                <TextField
                  fullWidth
                  type="date"
                  label="Delivery Date (ડિલિવરી તારીખ)"
                  value={formData.deliveryDate || ''}
                  onChange={(e) => {
                    const newDelDate = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      deliveryDate: newDelDate,
                      items: prev.items.map((it) => (
                        !it.deliveryDate || it.deliveryDate === prev.deliveryDate
                          ? { ...it, deliveryDate: newDelDate }
                          : it
                      )),
                    }));
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mt: 3, mb: 1.5, gap: 0.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main', fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                📦 Item Details & Textile Billing Fields
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                (Lot, Rate, Plain, Shortage, Discount %, Amount)
              </Typography>
            </Box>

            {formData.items.map((item, idx) => (
              <Paper key={item.id || idx} variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #cbd5e1' }}>
                {/* Row 1: Challan Date || Delivery Date || Challan No || Item Description || Design Number || Gross Total Amount */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr 2fr 1fr 1.2fr' }, gap: 1.5, mb: 1.5, alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Challan Date (ચલણ તા.)"
                    value={ensureIsoDate(item.challanDate)}
                    onChange={(e) => handleItemChange(idx, 'challanDate', ensureIsoDate(e.target.value))}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    disabled={isWorking}
                    label="Delivery Date (ડિલિવરી તા.)"
                    value={isWorking ? '' : (item.deliveryDate || formData.deliveryDate || '')}
                    onChange={(e) => handleItemChange(idx, 'deliveryDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Challan No. (ચલણ નં.)"
                    placeholder="e.g. 1681 / D-2010"
                    value={item.challanNo || ''}
                    onChange={(e) => handleItemChange(idx, 'challanNo', e.target.value)}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Item Description (વિગતો) *"
                    placeholder="e.g. સાડીની જોબ વર્ક - 1 નીડલ"
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Design No. (ડિઝાઇન નં.)"
                    placeholder="e.g. D-101 / 4502"
                    value={item.designNo || ''}
                    onChange={(e) => handleItemChange(idx, 'designNo', e.target.value)}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f5f3ff', p: 1, borderRadius: 1.5, border: '1.5px solid #a855f7', height: 40, boxSizing: 'border-box' }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#7e22ce', display: 'block', lineHeight: 1, fontWeight: 700 }}>
                        Total Amount (કુલ રકમ)
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 900, color: '#16a34a', mt: 0.2 }}>
                        ₹{(
                          Math.max(0, (Number(item.quantity) || 0) - ((Number(item.plain) || 0) + (Number(item.shortage) || 0))) * (Number(item.rate) || 0)
                        ).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                    {formData.items.length > 1 && (
                      <IconButton size="small" color="error" onClick={() => handleRemoveItemRow(idx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Box>

                {/* Row 2: Lot/Qty || Rate || Plain || Shortage */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 1.5, alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Lot / Qty (લોટ) *"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Rate (ભાવ ₹) *"
                    value={item.rate}
                    onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Plain (પ્લેન)"
                    value={item.plain || ''}
                    onChange={(e) => handleItemChange(idx, 'plain', e.target.value)}
                    placeholder="0"
                  />
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Shortage (શોર્ટ)"
                    value={item.shortage || ''}
                    onChange={(e) => handleItemChange(idx, 'shortage', e.target.value)}
                    placeholder="0"
                  />
                </Box>
              </Paper>
            ))}

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', mb: 2 }}>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddItemRow} size="small" sx={{ alignSelf: 'flex-start' }}>
                Add Item Row
              </Button>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <FormControlLabel
                  control={<Switch checked={taxEnabled} onChange={(e) => setTaxEnabled(e.target.checked)} size="small" />}
                  label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Tax / GST (5%)</Typography>}
                />
                <FormControlLabel
                  control={<Switch checked={showNotesAndCharges} onChange={(e) => setShowNotesAndCharges(e.target.checked)} size="small" />}
                  label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Add Note & Material/Kapad Amount (નોંધ અને કાપડ રકમ)</Typography>}
                />
              </Box>
            </Box>

            {/* Discount Section (ALWAYS VISIBLE) & Extra Charges / Note Section (TOGGLED BY SWITCH) */}
            <Box sx={{ display: 'grid', gridTemplateColumns: showNotesAndCharges ? { xs: '1fr', md: '1fr 1.2fr' } : '1fr', gap: 2, mb: 3 }}>
              {/* Box 1: Discount & Round Off (LEFT) - ALWAYS SHOW */}
              <Paper variant="outlined" sx={{ p: 2, bgcolor: mode === 'dark' ? 'rgba(234, 179, 8, 0.08)' : '#fefce8', borderColor: mode === 'dark' ? 'rgba(234, 179, 8, 0.25)' : '#fef08a', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: mode === 'dark' ? '#fde047' : '#a16207', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  🏷️ Discount & Round Off Details
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '0.8fr 1fr 0.9fr' }, gap: 1.5, alignItems: 'start' }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Discount % (વટાવ %)"
                    placeholder="0"
                    value={formData.discountPercent || ''}
                    onChange={(e) => handleBillDiscountPercentChange(e.target.value)}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Discount Amount (વટાવ ₹)"
                    placeholder="0"
                    value={formData.discountAmount || ''}
                    onChange={(e) => handleBillDiscountAmountChange(e.target.value)}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Round Off (રાઉન્ડ ઓફ ₹)"
                    placeholder="0.00"
                    value={formData.roundOff || ''}
                    onChange={(e) => setFormData({ ...formData, roundOff: e.target.value })}
                    inputProps={{ step: '0.01' }}
                  />
                </Box>
              </Paper>

              {/* Box 2: Material/Kapad Amount & Billing Notes (RIGHT) - SHOW ONLY WHEN SWITCH IS ON */}
              {showNotesAndCharges && (
                <Paper variant="outlined" sx={{ p: 2, bgcolor: mode === 'dark' ? 'rgba(234, 179, 8, 0.08)' : '#fefce8', borderColor: mode === 'dark' ? 'rgba(234, 179, 8, 0.25)' : '#fef08a', borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: mode === 'dark' ? '#fde047' : '#a16207', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    📝 Additional Material/Kapad Deduction & Billing Notes
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1.3fr' }, gap: 1.5, alignItems: 'start' }}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Material/Kapad Amount (કાપડ / મટિરિયલ ₹)"
                      placeholder="e.g. 500"
                      value={formData.chargeAmount || ''}
                      onChange={(e) => handleChargeAmountChange(e.target.value)}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Bill Note / Delivery Instructions (બિલ સંબંધિત નોંધ)"
                      placeholder="e.g. કાપડ શોર્ટ બાદ કરેલ છે / Delivery by tempo"
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </Box>
                </Paper>
              )}
            </Box>

            {/* Payment Receive Details Section */}
            <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f0fdf4', borderColor: '#bbf7d0', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#166534', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                💳 Payment Receive Details (ચુકવણીની સ્થિતિ અને રકમ વિગત)
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
                {/* 1. Payment Status */}
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Payment Status (ચુકવણી સ્થિતિ)"
                  value={formData.paymentStatus}
                  onChange={(e) => {
                    const newStatus = e.target.value as 'Pending' | 'Partial' | 'Received';
                    let newPaid = formData.paidAmount;
                    let newMethod = formData.paymentMethod;
                    if (newStatus === 'Pending') {
                      newPaid = '';
                      newMethod = '';
                    } else if (newStatus === 'Received') {
                      newPaid = String(totals.totalAmount);
                      if (!newMethod) newMethod = 'Cash';
                    } else if (newStatus === 'Partial') {
                      if (!newMethod) newMethod = 'Cash';
                    }
                    setFormData((prev) => ({
                      ...prev,
                      paymentStatus: newStatus,
                      paidAmount: newPaid,
                      paymentMethod: newMethod,
                      paymentDate: newStatus === 'Pending' ? '' : (prev.paymentDate || new Date().toISOString().split('T')[0]),
                    }));
                  }}
                >
                  <MenuItem value="Pending">⏳ Pending (બાકી)</MenuItem>
                  <MenuItem value="Partial">🔶 Partial (અંશતઃ મળેલ)</MenuItem>
                  <MenuItem value="Received">✅ Received / Paid (મળેલ)</MenuItem>
                </TextField>

                {/* 2. Payment Method */}
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Payment Mode (ચુકવણી પ્રકાર)"
                  value={formData.paymentStatus === 'Pending' ? '' : formData.paymentMethod}
                  disabled={formData.paymentStatus === 'Pending'}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                >
                  <MenuItem value="">
                    <em>{language === 'gu' ? 'બાકી (Pending)' : 'Pending (બાકી)'}</em>
                  </MenuItem>
                  <MenuItem value="Cash">💵 Cash (રોકડ)</MenuItem>
                  <MenuItem value="Cheque">🏦 Cheque (ચેક)</MenuItem>
                  <MenuItem value="UPI">📱 UPI / Online (GPay/PhonePe)</MenuItem>
                  <MenuItem value="Bank Transfer">🏛️ Bank Transfer / NEFT</MenuItem>
                </TextField>

                {/* 3. Received Amount */}
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Amount Received (પ્રાપ્ત રકમ ₹)"
                  value={formData.paidAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    const numVal = Number(val) || 0;
                    let newStatus: 'Received' | 'Partial' | 'Pending' = 'Pending';
                    if (numVal >= totals.totalAmount && totals.totalAmount > 0) {
                      newStatus = 'Received';
                    } else if (numVal > 0) {
                      newStatus = 'Partial';
                    } else {
                      newStatus = 'Pending';
                    }

                    setFormData((prev) => ({
                      ...prev,
                      paidAmount: val,
                      paymentStatus: newStatus,
                    }));
                  }}
                  placeholder="e.g. 3857"
                  helperText={
                    Number(formData.paidAmount) > 0 && totals.totalAmount > Number(formData.paidAmount)
                      ? `Pending: ${formatRupees(totals.totalAmount - Number(formData.paidAmount))}`
                      : undefined
                  }
                />

                {/* 4. Payment Receive Date */}
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Receive Date (ચુકવણી મળ્યા તારીખ)"
                  value={ensureIsoDate(formData.paymentDate || formData.date)}
                  onChange={(e) => setFormData({ ...formData, paymentDate: ensureIsoDate(e.target.value) })}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>

              {/* Cheque Specific Fields */}
              {formData.paymentMethod === 'Cheque' && formData.paymentStatus !== 'Pending' && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, pt: 1.5, borderTop: '1px dashed #93c5fd', mt: 1.5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Cheque Number (ચેક નંબર) *"
                    placeholder="e.g. 000124 / 458920"
                    value={formData.chequeNo}
                    onChange={(e) => setFormData({ ...formData, chequeNo: e.target.value })}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Cheque Date (ચેક તારીખ)"
                    value={ensureIsoDate(formData.chequeDate)}
                    onChange={(e) => setFormData({ ...formData, chequeDate: ensureIsoDate(e.target.value) })}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Bank Name (ચેક બેંક)"
                    placeholder="e.g. SBI / HDFC / ICICI"
                    value={formData.chequeBank}
                    onChange={(e) => setFormData({ ...formData, chequeBank: e.target.value })}
                  />
                </Box>
              )}
            </Paper>

            <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: { xs: 'center', sm: 'flex-end' }, alignItems: 'center' }}>
                <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, display: 'flex', flexDirection: 'column', gap: 0.5, width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 280 } }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#0284c7' }}>
                    Total Billing Amount (કુલ રકમ) : <strong>{formatRupees(totals.totalBillingAmount)}</strong>
                  </Typography>
                  {showNotesAndCharges && Number(formData.chargeAmount) > 0 && (
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#dc2626' }}>
                      Material/Kapad Amount (મટિરિયલ/કાપડ ની રકમ) : <strong>- {formatRupees(Number(formData.chargeAmount))}</strong>
                    </Typography>
                  )}
                  {totals.totalDiscount > 0 && (
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#dc2626' }}>
                      Total Discount (વટાવ) : <strong>- {formatRupees(totals.totalDiscount)}</strong>
                    </Typography>
                  )}
                  {taxEnabled && totals.totalTax > 0 && (
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0284c7' }}>
                      GST Tax (5%) : <strong>+ {formatRupees(totals.totalTax)}</strong>
                    </Typography>
                  )}
                  {totals.roundOff !== 0 && (
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0284c7' }}>
                      Round Off (રાઉન્ડ ઓફ) : <strong>{totals.roundOff > 0 ? `+ ${formatRupees(totals.roundOff)}` : `- ${formatRupees(Math.abs(totals.roundOff))}`}</strong>
                    </Typography>
                  )}
                  <Box sx={{ borderTop: '1px solid #cbd5e1', my: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                    Total Amount : {formatRupees(totals.totalAmount)}
                  </Typography>

                  <Box sx={{ borderTop: '1px dashed #cbd5e1', pt: 1, mt: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: (Number(formData.paidAmount) || 0) > 0 ? '#166534' : '#dc2626', display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <span>Amount Received (પ્રાપ્ત રકમ) :</span>
                      <strong>{formatRupees(Number(formData.paidAmount) || 0)}</strong>
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 800,
                        color: totals.pending > 0 ? '#dc2626' : '#166534',
                        display: 'flex',
                        justify: 'space-between',
                        gap: 2,
                        mt: 0.5,
                      }}
                    >
                      <span>Pending Amount (બાકી રકમ) :</span>
                      <strong>{formatRupees(totals.pending)}</strong>
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>

            {/* Bottom Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3, pt: 2, borderTop: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}` }}>
              <Button onClick={() => setFormOpen(false)} variant="outlined" size="large" sx={{ px: 3, fontWeight: 700 }}>
                {language === 'gu' ? 'કેન્સલ' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                onClick={(e) => handleSaveBill(e)}
                variant="contained"
                color="primary"
                size="large"
                sx={{ px: 4, fontWeight: 700 }}
              >
                {selectedBill ? (language === 'gu' ? 'બિલ અપડેટ કરો' : 'Update Bill') : (language === 'gu' ? 'બિલ સેવ કરો' : 'Save & Generate Bill')}
              </Button>
            </Box>
          </Box>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 1.5, sm: 0 }, mb: 2.5 }}>
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: mode === 'dark' ? '#f8fafc' : '#0f172a',
              letterSpacing: '-0.02em',
              fontSize: '1.42rem',
            }}
          >
            {language === 'gu' ? 'બિલિંગ મેનેજમેન્ટ' : 'Billing Management'}
          </Typography>
          <Typography variant="body2" sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontSize: '0.86rem', mt: 0.2 }}>
            {language === 'gu' ? 'ઇનવોઇસ બનાવો, જીએસટી ગણતરી (2.5% CGST + 2.5% SGST) અને પીડીએફ પ્રિન્ટ કરો' : 'Create bills, auto GST calculation (5%), print invoices & download PDF'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<ArrowForwardIcon sx={{ fontSize: 17 }} />}
            onClick={() => navigate('/payments')}
            sx={{
              py: 0.8,
              px: 2,
              fontWeight: 600,
              fontSize: '0.84rem',
              borderRadius: '8px',
              textTransform: 'none',
              bgcolor: mode === 'dark' ? '#111827' : '#ffffff',
              color: mode === 'dark' ? '#f8fafc' : '#0f172a',
              borderColor: mode === 'dark' ? '#1e293b' : '#e2e8f0',
              '&:hover': {
                borderColor: '#2563eb',
                bgcolor: mode === 'dark' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(37, 99, 235, 0.05)',
              },
            }}
          >
            {language === 'gu' ? 'ચુકવણી મેનેજમેન્ટ' : 'Payment Management'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<PdfIcon sx={{ fontSize: 18 }} />}
            onClick={() => setStatementModalOpen(true)}
            sx={{
              py: 0.8,
              px: 2,
              fontWeight: 600,
              fontSize: '0.84rem',
              borderRadius: '8px',
              textTransform: 'none',
              bgcolor: mode === 'dark' ? '#111827' : '#ffffff',
              color: mode === 'dark' ? '#f8fafc' : '#0f172a',
              borderColor: mode === 'dark' ? '#1e293b' : '#e2e8f0',
              '&:hover': {
                borderColor: '#2563eb',
                bgcolor: mode === 'dark' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(37, 99, 235, 0.05)',
              },
            }}
          >
            {language === 'gu' ? 'PDF સ્ટેટમેન્ટ' : 'PDF Statement'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon sx={{ fontSize: 18 }} />}
            onClick={handlePrintSelectedBills}
            sx={{
              py: 0.8,
              px: 2,
              fontWeight: 600,
              fontSize: '0.84rem',
              borderRadius: '8px',
              textTransform: 'none',
              bgcolor: mode === 'dark' ? '#111827' : '#ffffff',
              color: mode === 'dark' ? '#f8fafc' : '#0f172a',
              borderColor: mode === 'dark' ? '#1e293b' : '#e2e8f0',
              '&:hover': {
                borderColor: '#2563eb',
                bgcolor: mode === 'dark' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(37, 99, 235, 0.05)',
              },
            }}
          >
            {language === 'gu' ? 'PDF એક્સપોર્ટ' : 'Export PDF'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
            onClick={handleOpenCreateForm}
            sx={{
              py: 0.8,
              px: 2.2,
              fontWeight: 600,
              fontSize: '0.86rem',
              borderRadius: '8px',
              bgcolor: '#1d4ed8',
              color: '#ffffff',
              textTransform: 'none',
              boxShadow: '0 2px 6px rgba(29, 78, 216, 0.35)',
              '&:hover': {
                bgcolor: '#1e40af',
                boxShadow: '0 4px 12px rgba(29, 78, 216, 0.45)',
              },
            }}
          >
            {language === 'gu' ? '+ નવું બિલ બનાવો' : '+ Create New Bill'}
          </Button>
        </Box>
      </Box>

      {/* 7 Small Metric Cards in Exact Requested Sequence (Small Box design) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(4, 1fr)',
            lg: 'repeat(7, 1fr)',
          },
          gap: 1.25,
          mb: 2,
        }}
      >
        {/* Card 1: TOTAL CHALLAN */}
        <Box
          sx={{
            py: 1.2,
            px: 1.35,
            borderRadius: '10px',
            bgcolor: mode === 'dark' ? '#111827' : '#ffffff',
            border: `1px solid ${mode === 'dark' ? '#1e293b' : '#e2e8f0'}`,
            boxShadow: mode === 'dark' ? '0 1px 2px rgba(0,0,0,0.25)' : '0 1px 2px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '74px',
            transition: 'all 0.15s ease-in-out',
            '&:hover': {
              borderColor: '#2563eb',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.08)',
            },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography
              sx={{
                fontSize: '0.67rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                color: mode === 'dark' ? '#94a3b8' : '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {language === 'gu' ? 'કુલ ચલાણ' : 'TOTAL CHALLAN'}
            </Typography>
            <ChallanIcon sx={{ fontSize: 16, color: '#2563eb', flexShrink: 0 }} />
          </Box>
          <Typography
            sx={{
              fontSize: { xs: '1.05rem', sm: '1.15rem', xl: '1.25rem' },
              fontWeight: 800,
              color: mode === 'dark' ? '#f8fafc' : '#0f172a',
              lineHeight: 1.15,
              my: 0.25,
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {summaryTotals.totalChallanCount.toLocaleString('en-IN')}
          </Typography>
          <Typography sx={{ fontSize: '0.67rem', color: mode === 'dark' ? '#94a3b8' : '#64748b', whiteSpace: 'nowrap' }}>
            {language === 'gu' ? 'ડિલિવરી ચલાણ' : 'Challans'}
          </Typography>
        </Box>

        {/* Card 2: TOTAL INVOICE */}
        <Box
          sx={{
            py: 1.2,
            px: 1.35,
            borderRadius: '10px',
            bgcolor: mode === 'dark' ? '#111827' : '#ffffff',
            border: `1px solid ${mode === 'dark' ? '#1e293b' : '#e2e8f0'}`,
            boxShadow: mode === 'dark' ? '0 1px 2px rgba(0,0,0,0.25)' : '0 1px 2px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '74px',
            transition: 'all 0.15s ease-in-out',
            '&:hover': {
              borderColor: '#2563eb',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.08)',
            },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography
              sx={{
                fontSize: '0.67rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                color: mode === 'dark' ? '#94a3b8' : '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {language === 'gu' ? 'કુલ ઇનવોઇસ' : 'TOTAL INVOICE'}
            </Typography>
            <InvoiceIcon sx={{ fontSize: 16, color: '#3b82f6', flexShrink: 0 }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, my: 0.25 }}>
            <Typography
              sx={{
                fontSize: { xs: '1.05rem', sm: '1.15rem', xl: '1.25rem' },
                fontWeight: 800,
                color: mode === 'dark' ? '#f8fafc' : '#0f172a',
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
              }}
            >
              {summaryTotals.finalizedInvoiceCount.toLocaleString('en-IN')}
            </Typography>
            {summaryTotals.workingCount > 0 && (
              <Typography
                component="span"
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  color: mode === 'dark' ? '#fbbf24' : '#b45309',
                  bgcolor: mode === 'dark' ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
                  px: 0.5,
                  py: 0.1,
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                }}
              >
                +{summaryTotals.workingCount}
              </Typography>
            )}
          </Box>
          <Typography sx={{ fontSize: '0.67rem', color: mode === 'dark' ? '#94a3b8' : '#64748b', whiteSpace: 'nowrap' }}>
            {language === 'gu' ? 'પાકા બિલ' : 'Bills'}
          </Typography>
        </Box>

        {/* Card 3: TOTAL BILLING (Hero Deep Navy Card) */}
        <Box
          sx={{
            py: 1.2,
            px: 1.35,
            borderRadius: '10px',
            bgcolor: '#1e3a8a',
            border: '1px solid #2563eb',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.22)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '74px',
            transition: 'all 0.15s ease-in-out',
            '&:hover': {
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
            },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography
              sx={{
                fontSize: '0.67rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                color: '#bfdbfe',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {language === 'gu' ? 'કુલ બિલિંગ' : 'TOTAL BILLING'}
            </Typography>
            <InvoiceIcon sx={{ fontSize: 16, color: '#60a5fa', flexShrink: 0 }} />
          </Box>
          <Typography
            sx={{
              fontSize: { xs: '1.05rem', sm: '1.15rem', xl: '1.25rem' },
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.15,
              my: 0.25,
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {formatRupees(summaryTotals.totalBillingAmount)}
          </Typography>
          <Typography sx={{ fontSize: '0.67rem', color: '#93c5fd', whiteSpace: 'nowrap' }}>
            {language === 'gu' ? 'ગ્રોસ મૂલ્ય' : 'Gross Value'}
          </Typography>
        </Box>

        {/* Card 4: TOTAL DISCOUNT */}
        <Box
          sx={{
            py: 1.2,
            px: 1.35,
            borderRadius: '10px',
            bgcolor: mode === 'dark' ? '#111827' : '#ffffff',
            border: `1px solid ${mode === 'dark' ? '#1e293b' : '#e2e8f0'}`,
            boxShadow: mode === 'dark' ? '0 1px 2px rgba(0,0,0,0.25)' : '0 1px 2px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '74px',
            transition: 'all 0.15s ease-in-out',
            '&:hover': {
              borderColor: '#2563eb',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.08)',
            },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography
              sx={{
                fontSize: '0.67rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                color: mode === 'dark' ? '#94a3b8' : '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {language === 'gu' ? 'કુલ વટાવ' : 'TOTAL DISCOUNT'}
            </Typography>
            <DiscountIcon sx={{ fontSize: 16, color: '#2563eb', flexShrink: 0 }} />
          </Box>
          <Typography
            sx={{
              fontSize: { xs: '1.05rem', sm: '1.15rem', xl: '1.25rem' },
              fontWeight: 800,
              color: mode === 'dark' ? '#f8fafc' : '#0f172a',
              lineHeight: 1.15,
              my: 0.25,
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {formatRupees(summaryTotals.totalDiscount)}
          </Typography>
          <Typography sx={{ fontSize: '0.67rem', color: mode === 'dark' ? '#94a3b8' : '#64748b', whiteSpace: 'nowrap' }}>
            {language === 'gu' ? 'આપેલ વટાવ' : 'Discount'}
          </Typography>
        </Box>

        {/* Card 5: TOTAL AMOUNT */}
        <Box
          sx={{
            py: 1.2,
            px: 1.35,
            borderRadius: '10px',
            bgcolor: mode === 'dark' ? '#111827' : '#ffffff',
            border: `1px solid ${mode === 'dark' ? '#1e293b' : '#e2e8f0'}`,
            boxShadow: mode === 'dark' ? '0 1px 2px rgba(0,0,0,0.25)' : '0 1px 2px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '74px',
            transition: 'all 0.15s ease-in-out',
            '&:hover': {
              borderColor: '#0284c7',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)',
            },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography
              sx={{
                fontSize: '0.67rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                color: mode === 'dark' ? '#94a3b8' : '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {language === 'gu' ? 'કુલ રકમ' : 'TOTAL AMOUNT'}
            </Typography>
            <AmountIcon sx={{ fontSize: 16, color: '#0284c7', flexShrink: 0 }} />
          </Box>
          <Typography
            sx={{
              fontSize: { xs: '1.05rem', sm: '1.15rem', xl: '1.25rem' },
              fontWeight: 800,
              color: mode === 'dark' ? '#f8fafc' : '#0f172a',
              lineHeight: 1.15,
              my: 0.25,
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {formatRupees(summaryTotals.totalAmount)}
          </Typography>
          <Typography sx={{ fontSize: '0.67rem', color: mode === 'dark' ? '#94a3b8' : '#64748b', whiteSpace: 'nowrap' }}>
            {language === 'gu' ? 'નેટ રકમ' : 'Net Amount'}
          </Typography>
        </Box>

        {/* Card 6: TOTAL PENDING */}
        <Box
          sx={{
            py: 1.2,
            px: 1.35,
            borderRadius: '10px',
            bgcolor: mode === 'dark' ? '#111827' : '#ffffff',
            border: `1px solid ${mode === 'dark' ? '#1e293b' : '#e2e8f0'}`,
            boxShadow: mode === 'dark' ? '0 1px 2px rgba(0,0,0,0.25)' : '0 1px 2px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '74px',
            transition: 'all 0.15s ease-in-out',
            '&:hover': {
              borderColor: '#f59e0b',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.12)',
            },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography
              sx={{
                fontSize: '0.67rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                color: mode === 'dark' ? '#94a3b8' : '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {language === 'gu' ? 'બાકી રકમ' : 'TOTAL PENDING'}
            </Typography>
            <PendingIcon sx={{ fontSize: 16, color: '#f59e0b', flexShrink: 0 }} />
          </Box>
          <Typography
            sx={{
              fontSize: { xs: '1.05rem', sm: '1.15rem', xl: '1.25rem' },
              fontWeight: 800,
              color: summaryTotals.pendingAmount > 0 ? (mode === 'dark' ? '#fbbf24' : '#d97706') : (mode === 'dark' ? '#f8fafc' : '#0f172a'),
              lineHeight: 1.15,
              my: 0.25,
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {formatRupees(summaryTotals.pendingAmount)}
          </Typography>
          <Typography sx={{ fontSize: '0.67rem', color: mode === 'dark' ? '#94a3b8' : '#64748b', whiteSpace: 'nowrap' }}>
            {language === 'gu' ? 'બાકી બેલેન્સ' : 'Pending'}
          </Typography>
        </Box>

        {/* Card 7: TOTAL RECEIVED */}
        <Box
          sx={{
            py: 1.2,
            px: 1.35,
            borderRadius: '10px',
            bgcolor: mode === 'dark' ? '#111827' : '#ffffff',
            border: `1px solid ${mode === 'dark' ? '#1e293b' : '#e2e8f0'}`,
            boxShadow: mode === 'dark' ? '0 1px 2px rgba(0,0,0,0.25)' : '0 1px 2px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '74px',
            transition: 'all 0.15s ease-in-out',
            cursor: 'pointer',
            '&:hover': {
              borderColor: '#10b981',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.12)',
            },
          }}
          onClick={() => navigate('/payments')}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography
              sx={{
                fontSize: '0.67rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                color: mode === 'dark' ? '#94a3b8' : '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {language === 'gu' ? 'કુલ મળેલ રકમ' : 'TOTAL RECEIVED'}
            </Typography>
            <ReceivedIcon sx={{ fontSize: 16, color: '#10b981', flexShrink: 0 }} />
          </Box>
          <Typography
            sx={{
              fontSize: { xs: '1.05rem', sm: '1.15rem', xl: '1.25rem' },
              fontWeight: 800,
              color: '#10b981',
              lineHeight: 1.15,
              my: 0.25,
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {formatRupees(summaryTotals.receivedAmount)}
          </Typography>
          <Typography sx={{ fontSize: '0.67rem', color: mode === 'dark' ? '#94a3b8' : '#64748b', whiteSpace: 'nowrap' }}>
            {language === 'gu' ? 'જમા થયેલ' : 'Received'}
          </Typography>
        </Box>
      </Box>

      {/* Search & Filter Controls */}
      <Card
        elevation={0}
        sx={{
          p: 2,
          px: 2.5,
          mb: 2.5,
          borderRadius: '14px',
          bgcolor: mode === 'dark' ? '#111827' : '#ffffff',
          border: `1px solid ${mode === 'dark' ? '#1e293b' : '#e2e8f0'}`,
        }}
      >
        {/* Top Header: Billing Records Title + Count Badge INLINE with proper spacing */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
            mb: 2,
            pb: 1.5,
            borderBottom: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                bgcolor: mode === 'dark' ? 'rgba(37, 99, 235, 0.15)' : '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: mode === 'dark' ? '#60a5fa' : '#2563eb',
              }}
            >
              <InvoiceIcon sx={{ fontSize: 20 }} />
            </Box>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: { xs: '1.05rem', sm: '1.15rem' },
                color: mode === 'dark' ? '#f8fafc' : '#0f172a',
                letterSpacing: '-0.01em',
              }}
            >
              {language === 'gu' ? 'બિલિંગ રેકોર્ડ્સ' : 'Billing records'}
            </Typography>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                bgcolor: mode === 'dark' ? 'rgba(37, 99, 235, 0.15)' : '#eff6ff',
                color: mode === 'dark' ? '#60a5fa' : '#2563eb',
                border: `1px solid ${mode === 'dark' ? '#1e40af' : '#bfdbfe'}`,
                px: 1.25,
                py: 0.35,
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {filteredBills.length} {language === 'gu' ? 'રેકોર્ડ્સ' : filteredBills.length === 1 ? 'record' : 'records'}
            </Box>
          </Box>
        </Box>

        {/* Filter Controls Bar with Proper Spacing */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: '1fr 1fr',
              md: 'minmax(200px, 2.2fr) minmax(180px, 1.8fr) minmax(160px, 1.4fr) minmax(140px, 1.2fr) auto',
            },
            gap: 2,
            alignItems: 'flex-end',
          }}
        >
          {/* Search billing records */}
          <Box>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: mode === 'dark' ? '#94a3b8' : '#64748b', mb: 0.6 }}>
              {language === 'gu' ? 'બિલિંગ રેકોર્ડ શોધો' : 'Search billing records'}
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder={language === 'gu' ? 'બિલ નંબર, ઇનવોઇસ નંબર, ચલાણ અથવા પાર્ટીનું નામ...' : 'Search Bill No., Invoice No., Challan, or Party...'}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')} sx={{ p: 0.2 }}>
                      <CloseIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  bgcolor: mode === 'dark' ? '#0f172a' : '#ffffff',
                },
              }}
            />
          </Box>

          {/* Filter by Month (Multi-Select Popover with Bill Counts) */}
          <Box>
            <MonthMultiSelectDropdown
              label={language === 'gu' ? 'મહિના મુજબ ફિલ્ટર' : 'Filter by Month'}
              monthRecordCounts={monthRecordCounts}
              onFilterChange={() => setPage(0)}
            />
          </Box>

          {/* Filter by Party */}
          <Box>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: mode === 'dark' ? '#94a3b8' : '#64748b', mb: 0.6 }}>
              {language === 'gu' ? 'પાર્ટી મુજબ ફિલ્ટર' : 'Filter by Party'}
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={partyFilter}
              onChange={(e) => {
                setPartyFilter(e.target.value);
                setPage(0);
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  bgcolor: mode === 'dark' ? '#0f172a' : '#ffffff',
                },
              }}
            >
              <MenuItem value="All">{language === 'gu' ? 'બધી પાર્ટીઓ (All Parties)' : 'All Parties'}</MenuItem>
              {allPartyNames.map((pName) => (
                <MenuItem key={pName} value={pName}>
                  {pName}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Payment Status */}
          <Box>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: mode === 'dark' ? '#94a3b8' : '#64748b', mb: 0.6 }}>
              {language === 'gu' ? 'પેમેન્ટ સ્થિતિ' : 'Payment Status'}
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  bgcolor: mode === 'dark' ? '#0f172a' : '#ffffff',
                },
              }}
            >
              <MenuItem value="All">{language === 'gu' ? 'બધી સ્થિતિ (All)' : 'All Statuses'}</MenuItem>
              <MenuItem value="Paid">{language === 'gu' ? 'પૂર્ણ મળેલ (Paid)' : 'Paid'}</MenuItem>
              <MenuItem value="Partial">{language === 'gu' ? 'અંશતઃ મળેલ (Partial)' : 'Partial'}</MenuItem>
              <MenuItem value="Pending">{language === 'gu' ? 'બાકી (Pending)' : 'Pending'}</MenuItem>
            </TextField>
          </Box>

          {/* Reset Button */}
          <Box>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'transparent', mb: 0.6, userSelect: 'none' }}>
              &nbsp;
            </Typography>
            <Button
              variant="outlined"
              startIcon={<ResetIcon sx={{ fontSize: 18 }} />}
              onClick={() => {
                setSearch('');
                setPartyFilter('All');
                setStatusFilter('All');
                setMonthFilter('ALL');
                setSelectedMonths([]);
                setPage(0);
              }}
              sx={{
                borderRadius: '8px',
                py: 0.9,
                px: 2,
                borderColor: mode === 'dark' ? '#1e293b' : '#e2e8f0',
                color: mode === 'dark' ? '#f8fafc' : '#0f172a',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.84rem',
                height: 40,
                whiteSpace: 'nowrap',
                '&:hover': {
                  borderColor: '#2563eb',
                  bgcolor: mode === 'dark' ? 'rgba(37, 99, 235, 0.1)' : '#eff6ff',
                },
              }}
            >
              {language === 'gu' ? 'રીસેટ' : 'Reset'}
            </Button>
          </Box>
        </Box>

        {(partyFilter !== 'All' || selectedMonths.length > 0 || (monthFilter !== 'All' && monthFilter !== 'ALL') || statusFilter !== 'All' || search) && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, pt: 1.5, borderTop: `1px dashed ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                {language === 'gu' ? 'સક્રિય ફિલ્ટર્સ:' : 'Active Filters:'}
              </Typography>
              {partyFilter !== 'All' && (
                <Chip size="small" label={`Party: ${partyFilter}`} onDelete={() => { setPartyFilter('All'); setPage(0); }} color="primary" variant="outlined" />
              )}
              {selectedMonths.length > 0 ? (
                selectedMonths.map((ym) => (
                  <Chip
                    key={ym}
                    size="small"
                    label={`Month: ${getMonthLabel(ym, language)}`}
                    onDelete={() => { toggleMonth(ym); setPage(0); }}
                    color="secondary"
                    variant="outlined"
                  />
                ))
              ) : (
                monthFilter !== 'All' && monthFilter !== 'ALL' && (
                  <Chip
                    size="small"
                    label={`Month: ${getMonthLabel(selectedMonth, language)}`}
                    onDelete={() => { setMonthFilter('ALL'); setSelectedMonths([]); setPage(0); }}
                    color="secondary"
                    variant="outlined"
                  />
                )
              )}
              {statusFilter !== 'All' && (
                <Chip size="small" label={`Status: ${statusFilter}`} onDelete={() => { setStatusFilter('All'); setPage(0); }} color="info" variant="outlined" />
              )}
              {search && (
                <Chip size="small" label={`Search: ${search}`} onDelete={() => { setSearch(''); setPage(0); }} variant="outlined" />
              )}
              <Typography variant="caption" sx={{ ml: 1, fontWeight: 700, color: 'primary.main' }}>
                ({filteredBills.length} {language === 'gu' ? 'બિલ મળ્યા' : 'bills found'})
              </Typography>
            </Box>
            <Button
              size="small"
              color="error"
              onClick={() => {
                setSearch('');
                setPartyFilter('All');
                setStatusFilter('All');
                setMonthFilter('ALL');
                setSelectedMonths([]);
                setPage(0);
              }}
              sx={{ fontSize: '0.75rem', textTransform: 'none', fontWeight: 700 }}
            >
              {language === 'gu' ? 'બધા ફિલ્ટર્સ સાફ કરો' : 'Clear All Filters'}
            </Button>
          </Box>
        )}
      </Card>


        <Card sx={{ borderRadius: 3, overflow: 'hidden', border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, boxShadow: mode === 'dark' ? 'none' : '0 4px 12px rgba(0,0,0,0.03)' }}>
        {selectedBillIds.length > 0 && (
          <Box
            sx={{
              p: 1.5,
              px: 2.5,
              bgcolor: mode === 'dark' ? '#1e293b' : '#f0f9ff',
              borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#bae6fd'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, color: mode === 'dark' ? '#38bdf8' : '#0284c7' }}>
              {selectedBillIds.length} {language === 'gu' ? 'ઇનવોઇસ પસંદ કર્યા' : 'Invoices Selected'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={handlePrintSelectedBills}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 2,
                  bgcolor: mode === 'dark' ? '#0284c7' : '#0284c7',
                  color: '#ffffff',
                  '&:hover': {
                    bgcolor: mode === 'dark' ? '#0369a1' : '#0369a1',
                  },
                }}
              >
                {language === 'gu' ? 'પ્રિન્ટ / ડાઉનલોડ બિલ ઇનવોઇસ' : 'Print / Download Bill Invoices'}
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setSelectedBillIds([])}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
              >
                {language === 'gu' ? 'પસંદગી રદ કરો' : 'Clear Selection'}
              </Button>
            </Box>
          </Box>
        )}
        <TableContainer
          ref={tableContainerRef}
          sx={{
            width: '100%',
            maxHeight: rowsPerPage >= 20 ? { xs: '65vh', sm: '70vh', md: 'calc(100vh - 360px)' } : 'none',
            overflowX: 'auto',
            overflowY: rowsPerPage >= 20 ? 'auto' : 'visible',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin',
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: mode === 'dark' ? '#0f172a' : '#f1f5f9',
            },
            '&::-webkit-scrollbar-thumb': {
              background: mode === 'dark' ? '#334155' : '#cbd5e1',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: mode === 'dark' ? '#475569' : '#94a3b8',
            },
          }}
        >
          <Table size="small" stickyHeader sx={{ minWidth: 1380, borderCollapse: 'separate', borderSpacing: 0 }}>
            <TableHead>
              {/* Group Category Header Row */}
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ position: 'sticky', top: 0, zIndex: 4, bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', color: mode === 'dark' ? '#94a3b8' : '#475569', fontWeight: 700, fontSize: '0.75rem', letterSpacing: 0.5, py: 1, px: 1, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, borderRight: `1.5px solid ${mode === 'dark' ? '#475569' : '#cbd5e1'}`, whiteSpace: 'nowrap' }}>
                  {language === 'gu' ? 'પાર્ટી અને ચલણ વિગતો' : 'PARTY & CHALLAN DETAILS'}
                </TableCell>
                <TableCell colSpan={3} align="center" sx={{ position: 'sticky', top: 0, zIndex: 4, bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', color: mode === 'dark' ? '#94a3b8' : '#475569', fontWeight: 700, fontSize: '0.75rem', letterSpacing: 0.5, py: 1, px: 1, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, borderRight: `1.5px solid ${mode === 'dark' ? '#475569' : '#cbd5e1'}`, whiteSpace: 'nowrap' }}>
                  {language === 'gu' ? 'બિલિંગ વિગતો' : 'BILLING DETAILS'}
                </TableCell>
                <TableCell colSpan={2} align="center" sx={{ position: 'sticky', top: 0, zIndex: 4, bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', color: mode === 'dark' ? '#94a3b8' : '#475569', fontWeight: 700, fontSize: '0.75rem', letterSpacing: 0.5, py: 1, px: 1, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, borderRight: `1.5px solid ${mode === 'dark' ? '#475569' : '#cbd5e1'}`, whiteSpace: 'nowrap' }}>
                  {language === 'gu' ? 'રકમ અને ટેક્સ વિગતો' : 'AMOUNT & GST DETAILS'}
                </TableCell>
                <TableCell colSpan={3} align="center" sx={{ position: 'sticky', top: 0, zIndex: 4, bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', color: mode === 'dark' ? '#94a3b8' : '#475569', fontWeight: 700, fontSize: '0.75rem', letterSpacing: 0.5, py: 1, px: 1, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, borderRight: `1.5px solid ${mode === 'dark' ? '#475569' : '#cbd5e1'}`, whiteSpace: 'nowrap' }}>
                  {language === 'gu' ? 'બિલ વિગતો' : 'BILL DETAILS'}
                </TableCell>
                <TableCell colSpan={2} align="center" sx={{ position: 'sticky', top: 0, zIndex: 4, bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', color: mode === 'dark' ? '#94a3b8' : '#475569', fontWeight: 700, fontSize: '0.75rem', letterSpacing: 0.5, py: 1, px: 1, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, borderRight: `1.5px solid ${mode === 'dark' ? '#475569' : '#cbd5e1'}`, whiteSpace: 'nowrap' }}>
                  {language === 'gu' ? 'પેમેન્ટ વિગતો' : 'PAYMENT DETAILS'}
                </TableCell>
                <TableCell colSpan={1} align="center" sx={{ position: 'sticky', top: 0, zIndex: 4, bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', color: mode === 'dark' ? '#94a3b8' : '#475569', fontWeight: 700, fontSize: '0.75rem', letterSpacing: 0.5, py: 1, px: 1, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, whiteSpace: 'nowrap' }}>
                  {language === 'gu' ? 'એક્શન' : 'ACTIONS'}
                </TableCell>
              </TableRow>

              {/* Sub-Header Column Row */}
              <TableRow>
                <TableCell padding="checkbox" align="center" sx={{ position: 'sticky', top: '33px', zIndex: 3, bgcolor: mode === 'dark' ? '#0f172a' : '#f8fafc', borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, borderRight: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`, width: 42, minWidth: 42 }}>
                  <Checkbox
                    size="small"
                    color="primary"
                    indeterminate={selectedBillIds.length > 0 && selectedBillIds.length < filteredBills.length}
                    checked={filteredBills.length > 0 && selectedBillIds.length === filteredBills.length}
                    onChange={handleSelectAllClick}
                  />
                </TableCell>
                <TableCell align="center" sx={{ position: 'sticky', top: '33px', zIndex: 3, bgcolor: mode === 'dark' ? '#0f172a' : '#f8fafc', color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 600, fontSize: '0.75rem', py: 1, px: 0.8, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, borderRight: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`, whiteSpace: 'nowrap', minWidth: 50 }}>{language === 'gu' ? 'નં.' : 'NO.'}</TableCell>
                <TableCell
                  align="center"
                  onClick={() => handleSortToggle('challanDate')}
                  sx={{
                    position: 'sticky',
                    top: '33px',
                    zIndex: 3,
                    bgcolor: sortField === 'challanDate' ? (mode === 'dark' ? '#1e293b' : '#e0f2fe') : (mode === 'dark' ? '#0f172a' : '#f8fafc'),
                    color: sortField === 'challanDate' ? 'primary.main' : (mode === 'dark' ? '#94a3b8' : '#64748b'),
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    py: 1,
                    px: 0.8,
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    borderRight: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`,
                    whiteSpace: 'nowrap',
                    minWidth: 125,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', color: 'primary.main' },
                  }}
                >
                  {getSortHeaderLabel('challanDate', 'ચલણ તા.', 'CHALLAN DATE')}
                </TableCell>
                <TableCell
                  align="center"
                  onClick={() => handleSortToggle('challanNo')}
                  sx={{
                    position: 'sticky',
                    top: '33px',
                    zIndex: 3,
                    bgcolor: sortField === 'challanNo' ? (mode === 'dark' ? '#1e293b' : '#e0f2fe') : (mode === 'dark' ? '#0f172a' : '#f8fafc'),
                    color: sortField === 'challanNo' ? 'primary.main' : (mode === 'dark' ? '#94a3b8' : '#64748b'),
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    py: 1,
                    px: 0.8,
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    borderRight: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`,
                    whiteSpace: 'nowrap',
                    minWidth: 110,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', color: 'primary.main' },
                  }}
                >
                  {getSortHeaderLabel('challanNo', 'ચલાણ નં.', 'CHALLAN NO.')}
                </TableCell>
                <TableCell
                  align="left"
                  onClick={() => handleSortToggle('partyName')}
                  sx={{
                    position: 'sticky',
                    top: '33px',
                    zIndex: 3,
                    bgcolor: sortField === 'partyName' ? (mode === 'dark' ? '#1e293b' : '#e0f2fe') : (mode === 'dark' ? '#0f172a' : '#f8fafc'),
                    color: sortField === 'partyName' ? 'primary.main' : (mode === 'dark' ? '#94a3b8' : '#64748b'),
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    py: 1,
                    px: 0.8,
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    borderRight: `1.5px solid ${mode === 'dark' ? '#475569' : '#cbd5e1'}`,
                    whiteSpace: 'nowrap',
                    minWidth: 150,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', color: 'primary.main' },
                  }}
                >
                  {getSortHeaderLabel('partyName', 'પાર્ટી નામ', 'PARTY NAME')}
                </TableCell>

                <TableCell
                  align="center"
                  onClick={() => handleSortToggle('designNo')}
                  sx={{
                    position: 'sticky',
                    top: '33px',
                    zIndex: 3,
                    bgcolor: sortField === 'designNo' ? (mode === 'dark' ? '#1e293b' : '#e0f2fe') : (mode === 'dark' ? '#0f172a' : '#f8fafc'),
                    color: sortField === 'designNo' ? 'primary.main' : (mode === 'dark' ? '#94a3b8' : '#64748b'),
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    py: 1,
                    px: 0.8,
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    borderRight: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`,
                    whiteSpace: 'nowrap',
                    minWidth: 110,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', color: 'primary.main' },
                  }}
                >
                  {getSortHeaderLabel('designNo', 'ડિઝાઇન નં.', 'DESIGN NO.')}
                </TableCell>
                <TableCell
                  align="right"
                  onClick={() => handleSortToggle('amount')}
                  sx={{
                    position: 'sticky',
                    top: '33px',
                    zIndex: 3,
                    bgcolor: sortField === 'amount' ? (mode === 'dark' ? '#1e293b' : '#e0f2fe') : (mode === 'dark' ? '#0f172a' : '#f8fafc'),
                    color: sortField === 'amount' ? 'primary.main' : (mode === 'dark' ? '#94a3b8' : '#64748b'),
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    py: 1,
                    px: 0.8,
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    borderRight: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`,
                    whiteSpace: 'nowrap',
                    minWidth: 100,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', color: 'primary.main' },
                  }}
                >
                  {getSortHeaderLabel('amount', 'કુલ રકમ', 'AMOUNT')}
                </TableCell>
                <TableCell
                  align="right"
                  onClick={() => handleSortToggle('discount')}
                  sx={{
                    position: 'sticky',
                    top: '33px',
                    zIndex: 3,
                    bgcolor: sortField === 'discount' ? (mode === 'dark' ? '#1e293b' : '#e0f2fe') : (mode === 'dark' ? '#0f172a' : '#f8fafc'),
                    color: sortField === 'discount' ? 'primary.main' : (mode === 'dark' ? '#94a3b8' : '#64748b'),
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    py: 1,
                    px: 0.8,
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    borderRight: `1.5px solid ${mode === 'dark' ? '#475569' : '#cbd5e1'}`,
                    whiteSpace: 'nowrap',
                    minWidth: 95,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', color: 'primary.main' },
                  }}
                >
                  {getSortHeaderLabel('discount', 'ડિસ્કાઉન્ટ', 'DISCOUNT')}
                </TableCell>

                <TableCell align="right" sx={{ position: 'sticky', top: '33px', zIndex: 3, bgcolor: mode === 'dark' ? '#0f172a' : '#f8fafc', color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 600, fontSize: '0.75rem', py: 1, px: 0.8, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, borderRight: `1.5px solid ${mode === 'dark' ? '#475569' : '#cbd5e1'}`, whiteSpace: 'nowrap', minWidth: 90 }}>GST (5%)</TableCell>
                <TableCell
                  align="right"
                  onClick={() => handleSortToggle('totalWithTax')}
                  sx={{
                    position: 'sticky',
                    top: '33px',
                    zIndex: 3,
                    bgcolor: sortField === 'totalWithTax' ? (mode === 'dark' ? '#1e293b' : '#e0f2fe') : (mode === 'dark' ? '#0f172a' : '#f8fafc'),
                    color: sortField === 'totalWithTax' ? 'primary.main' : (mode === 'dark' ? '#94a3b8' : '#64748b'),
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    py: 1,
                    px: 0.8,
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    borderRight: `1.5px solid ${mode === 'dark' ? '#475569' : '#cbd5e1'}`,
                    whiteSpace: 'nowrap',
                    minWidth: 120,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', color: 'primary.main' },
                  }}
                >
                  {getSortHeaderLabel('totalWithTax', 'કુલ ટેક્સ સહિત', 'TOTAL WITH TAX')}
                </TableCell>

                <TableCell
                  align="center"
                  onClick={() => handleSortToggle('invoiceDate')}
                  sx={{
                    position: 'sticky',
                    top: '33px',
                    zIndex: 3,
                    bgcolor: sortField === 'invoiceDate' ? (mode === 'dark' ? '#1e293b' : '#e0f2fe') : (mode === 'dark' ? '#0f172a' : '#f8fafc'),
                    color: sortField === 'invoiceDate' ? 'primary.main' : (mode === 'dark' ? '#94a3b8' : '#64748b'),
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    py: 1,
                    px: 0.8,
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    borderRight: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`,
                    whiteSpace: 'nowrap',
                    minWidth: 130,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', color: 'primary.main' },
                  }}
                >
                  {getSortHeaderLabel('invoiceDate', 'ઇનવોઇસ તા.', 'BILL / INVOICE DATE')}
                </TableCell>
                <TableCell
                  align="center"
                  onClick={() => handleSortToggle('invoiceNo')}
                  sx={{
                    position: 'sticky',
                    top: '33px',
                    zIndex: 3,
                    bgcolor: sortField === 'invoiceNo' ? (mode === 'dark' ? '#1e293b' : '#e0f2fe') : (mode === 'dark' ? '#0f172a' : '#f8fafc'),
                    color: sortField === 'invoiceNo' ? 'primary.main' : (mode === 'dark' ? '#94a3b8' : '#64748b'),
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    py: 1,
                    px: 0.8,
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    borderRight: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`,
                    whiteSpace: 'nowrap',
                    minWidth: 100,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', color: 'primary.main' },
                  }}
                >
                  {getSortHeaderLabel('invoiceNo', 'બિલ નં.', 'BILL NO.')}
                </TableCell>
                <TableCell align="center" sx={{ position: 'sticky', top: '33px', zIndex: 3, bgcolor: mode === 'dark' ? '#0f172a' : '#f8fafc', color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 600, fontSize: '0.75rem', py: 1, px: 0.8, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, borderRight: `1.5px solid ${mode === 'dark' ? '#475569' : '#cbd5e1'}`, whiteSpace: 'nowrap', minWidth: 110 }}>{language === 'gu' ? 'મોડ / રિફ.' : 'MODE / REF.'}</TableCell>

                <TableCell
                  align="center"
                  onClick={() => handleSortToggle('paymentDate')}
                  sx={{
                    position: 'sticky',
                    top: '33px',
                    zIndex: 3,
                    bgcolor: sortField === 'paymentDate' ? (mode === 'dark' ? '#1e293b' : '#e0f2fe') : (mode === 'dark' ? '#0f172a' : '#f8fafc'),
                    color: sortField === 'paymentDate' ? 'primary.main' : (mode === 'dark' ? '#94a3b8' : '#64748b'),
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    py: 1,
                    px: 0.8,
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    borderRight: `1px solid ${mode === 'dark' ? '#1e293b' : '#f1f5f9'}`,
                    whiteSpace: 'nowrap',
                    minWidth: 135,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', color: 'primary.main' },
                  }}
                >
                  {getSortHeaderLabel('paymentDate', 'પેમેન્ટ મળ્યા તા.', 'PAYMENT REC. DATE')}
                </TableCell>
                <TableCell
                  align="center"
                  onClick={() => handleSortToggle('status')}
                  sx={{
                    position: 'sticky',
                    top: '33px',
                    zIndex: 3,
                    bgcolor: sortField === 'status' ? (mode === 'dark' ? '#1e293b' : '#e0f2fe') : (mode === 'dark' ? '#0f172a' : '#f8fafc'),
                    color: sortField === 'status' ? 'primary.main' : (mode === 'dark' ? '#94a3b8' : '#64748b'),
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    py: 1,
                    px: 0.8,
                    borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    borderRight: `1.5px solid ${mode === 'dark' ? '#475569' : '#cbd5e1'}`,
                    whiteSpace: 'nowrap',
                    minWidth: 90,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9', color: 'primary.main' },
                  }}
                >
                  {getSortHeaderLabel('status', 'સ્ટેટસ', 'STATUS')}
                </TableCell>

                <TableCell align="center" sx={{ position: 'sticky', top: '33px', zIndex: 3, bgcolor: mode === 'dark' ? '#0f172a' : '#f8fafc', color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 600, fontSize: '0.75rem', py: 1, px: 0.8, borderBottom: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`, whiteSpace: 'nowrap', minWidth: 200 }}>{language === 'gu' ? 'એક્શન' : 'ACTIONS'}</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {(() => {
                const paginated = filteredBills.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

                if (paginated.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={16} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {language === 'gu'
                              ? (selectedMonths.length > 0 || (monthFilter !== 'ALL' && monthFilter !== 'All')
                                  ? `${getMultiMonthLabel(language)} માટે કોઈ બિલ રેકોર્ડ મળ્યા નથી`
                                  : 'કોઈ બિલ મળ્યા નથી.')
                              : (selectedMonths.length > 0 || (monthFilter !== 'ALL' && monthFilter !== 'All')
                                  ? `No billing records found for ${getMultiMonthLabel(language)}.`
                                  : 'No bills found.')}
                          </Typography>
                          {(selectedMonths.length > 0 || (monthFilter !== 'ALL' && monthFilter !== 'All') || partyFilter !== 'All' || statusFilter !== 'All' || search) && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setMonthFilter('ALL');
                                setSelectedMonths([]);
                                setPartyFilter('All');
                                setStatusFilter('All');
                                setSearch('');
                                setPage(0);
                              }}
                              sx={{ mt: 1, textTransform: 'none', borderRadius: '8px', fontWeight: 700 }}
                            >
                              {language === 'gu' ? 'તમામ ફિલ્ટર્સ સાફ કરો (બધા બિલ જુઓ)' : 'Clear Filters & View All Bills'}
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                }

                return paginated.map((b, bIdx) => {
                  const calc = getBillCalculatedTotals(b);
                  const isBillHovered = hoveredBillId === b.id;
                  const isSelected = selectedBillIds.includes(b.id);
                  const borderCell = `1px solid ${mode === 'dark' ? '#1e293b' : '#e2e8f0'}`;
                  const groupBorderRight = `1.5px solid ${mode === 'dark' ? '#475569' : '#cbd5e1'}`;
                  const purchaseBottomBorder = `1.5px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`;

                  const rowBg = isBillHovered
                    ? (mode === 'dark' ? '#1e293b' : '#f1f5f9')
                    : isSelected
                    ? (mode === 'dark' ? 'rgba(56, 189, 248, 0.15)' : '#f0f9ff')
                    : (mode === 'dark' ? (bIdx % 2 === 1 ? '#0f172a' : '#090d16') : (bIdx % 2 === 1 ? '#fdfdfe' : '#ffffff'));

                  // Collect unique challan numbers and dates for this bill
                  const itemChallans = (b.items || []).map(i => i.challanNo).filter(Boolean);
                  const uniqueChallans = Array.from(new Set(itemChallans.length ? itemChallans : (b.challanNo ? [b.challanNo] : [])));
                  const challanNoText = uniqueChallans.length > 0 ? uniqueChallans.join(', ') : (b.challanNo || b.invoiceNo || '-');

                  const itemDates = (b.items || []).map(i => i.challanDate).filter(Boolean);
                  const uniqueDates = Array.from(new Set(itemDates.length ? itemDates : [b.date]));
                  const challanDateText = uniqueDates.map(d => formatDate(d)).join(', ');

                  // Collect unique design numbers for this bill
                  const itemDesigns = (b.items || []).map(i => i.designNo || i.description).filter(Boolean);
                  const uniqueDesigns = Array.from(new Set(itemDesigns.length ? itemDesigns : (b.notes ? [b.notes] : [])));
                  const designNoText = uniqueDesigns.length > 0 ? uniqueDesigns.join(', ') : '-';

                  const gstVal = (b.totalTax > 0 || taxEnabled) ? Number((calc.subtotal * 0.05).toFixed(2)) : (calc.totalTax || 0);
                  const discVal = (b.totalDiscount !== undefined && b.totalDiscount !== null && b.totalDiscount > 0) ? Number(b.totalDiscount) : (calc.totalDiscount || 0);
                  
                  // Calculate discount percentage for display
                  let discPct: number | null = null;
                  if (b.discountPercent !== undefined && b.discountPercent !== null && Number(b.discountPercent) > 0) {
                    discPct = Number(b.discountPercent);
                  } else {
                    const itemWithPct = (b.items || []).find(i => Number(i.discountPercent) > 0);
                    if (itemWithPct && Number(itemWithPct.discountPercent) > 0) {
                      discPct = Number(itemWithPct.discountPercent);
                    } else if (discVal > 0) {
                      const kapadCharge = Number(b.extraCharges ?? b.chargeAmount ?? 0);
                      const valueAfterKapad = Math.max(0, calc.totalBillingAmount - kapadCharge);
                      const baseVal = valueAfterKapad > 0 ? valueAfterKapad : (calc.subtotal + discVal);
                      if (baseVal > 0) {
                        const rawPct = (discVal / baseVal) * 100;
                        discPct = Number(rawPct.toFixed(2));
                      }
                    }
                  }

                  const pendAmt = getBillPendingAmount(b);
                  const paidAmt = Number(b.paidAmount) || 0;
                  const isPaid = pendAmt <= 0 && calc.totalAmount > 0;
                  const isPartial = paidAmt > 0 && pendAmt > 0;

                  return (
                    <TableRow
                      key={b.id}
                      onMouseEnter={() => setHoveredBillId(b.id)}
                      onMouseLeave={() => setHoveredBillId(null)}
                      sx={{
                        transition: 'background-color 0.12s ease',
                        '&:hover': {
                          bgcolor: mode === 'dark' ? '#1e293b' : '#f8fafc',
                        },
                      }}
                    >
                      {/* Checkbox */}
                      <TableCell
                        padding="checkbox"
                        align="center"
                        sx={{
                          bgcolor: rowBg,
                          verticalAlign: 'middle',
                          borderRight: borderCell,
                          borderBottom: purchaseBottomBorder,
                        }}
                      >
                        <Checkbox
                          size="small"
                          color="primary"
                          checked={isSelected}
                          onChange={() => handleSelectRow(b.id)}
                        />
                      </TableCell>

                      {/* Sr No */}
                      <TableCell
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
                        {page * rowsPerPage + bIdx + 1}
                      </TableCell>

                      {/* Challan Date */}
                      <TableCell align="center" sx={{ fontSize: '0.8rem', py: 1.2, px: 0.8, color: mode === 'dark' ? '#cbd5e1' : '#334155', bgcolor: rowBg, verticalAlign: 'middle', borderRight: borderCell, borderBottom: purchaseBottomBorder }}>
                        {uniqueDates.length <= 1 ? (
                          <Typography sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                            {uniqueDates.length === 1 ? formatDate(uniqueDates[0]) : (b.date ? formatDate(b.date) : '-')}
                          </Typography>
                        ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4, alignItems: 'center', py: 0.2 }}>
                            {uniqueDates.map((d, i) => (
                              <Typography
                                key={i}
                                sx={{
                                  fontSize: '0.725rem',
                                  fontWeight: 500,
                                  color: mode === 'dark' ? '#cbd5e1' : '#334155',
                                  bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
                                  px: 0.8,
                                  py: 0.2,
                                  borderRadius: '4px',
                                  whiteSpace: 'nowrap',
                                  border: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'}`
                                }}
                              >
                                {formatDate(d)}
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </TableCell>

                      {/* Challan No */}
                      <TableCell align="center" sx={{ fontSize: '0.8rem', py: 1.2, px: 0.8, bgcolor: rowBg, verticalAlign: 'middle', borderRight: borderCell, borderBottom: purchaseBottomBorder }}>
                        {uniqueChallans.length <= 1 ? (
                          <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: mode === 'dark' ? '#f87171' : '#e11d48', whiteSpace: 'nowrap' }}>
                            {uniqueChallans.length === 1 ? uniqueChallans[0] : (b.challanNo || b.invoiceNo || '-')}
                          </Typography>
                        ) : (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center', maxWidth: 180, mx: 'auto', py: 0.2 }}>
                            {uniqueChallans.map((c, i) => (
                              <Chip
                                key={i}
                                label={c}
                                size="small"
                                sx={{
                                  height: 22,
                                  fontSize: '0.725rem',
                                  fontWeight: 700,
                                  bgcolor: mode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#ffe4e6',
                                  color: mode === 'dark' ? '#f87171' : '#e11d48',
                                  border: `1px solid ${mode === 'dark' ? 'rgba(239, 68, 68, 0.3)' : '#fecdd3'}`,
                                  borderRadius: '5px',
                                  '& .MuiChip-label': { px: 0.8 }
                                }}
                              />
                            ))}
                          </Box>
                        )}
                      </TableCell>

                      {/* Party Name */}
                      <TableCell
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
                            {b.partyName ? b.partyName.charAt(0) : 'P'}
                          </Avatar>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.825rem', color: mode === 'dark' ? '#f8fafc' : '#0f172a' }}>
                            {b.partyName}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Design No */}
                      <TableCell align="center" sx={{ fontSize: '0.8rem', py: 1.2, px: 0.8, bgcolor: rowBg, verticalAlign: 'middle', borderRight: borderCell, borderBottom: purchaseBottomBorder }}>
                        {uniqueDesigns.length === 0 || (uniqueDesigns.length === 1 && uniqueDesigns[0] === '-') ? (
                          <Typography sx={{ fontSize: '0.8rem', color: mode === 'dark' ? '#64748b' : '#94a3b8' }}>-</Typography>
                        ) : uniqueDesigns.length === 1 ? (
                          <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: mode === 'dark' ? '#38bdf8' : '#0284c7', whiteSpace: 'nowrap' }}>
                            {uniqueDesigns[0]}
                          </Typography>
                        ) : (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center', maxWidth: 180, mx: 'auto', py: 0.2 }}>
                            {uniqueDesigns.map((d, i) => (
                              <Chip
                                key={i}
                                label={d}
                                size="small"
                                sx={{
                                  height: 22,
                                  fontSize: '0.725rem',
                                  fontWeight: 700,
                                  bgcolor: mode === 'dark' ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe',
                                  color: mode === 'dark' ? '#38bdf8' : '#0284c7',
                                  border: `1px solid ${mode === 'dark' ? 'rgba(56, 189, 248, 0.3)' : '#bae6fd'}`,
                                  borderRadius: '5px',
                                  '& .MuiChip-label': { px: 0.8 }
                                }}
                              />
                            ))}
                          </Box>
                        )}
                      </TableCell>

                      {/* Material Details - Amount */}
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.825rem',
                          py: 1.2,
                          px: 0.8,
                          color: mode === 'dark' ? '#60a5fa' : '#2563eb',
                          bgcolor: rowBg,
                          verticalAlign: 'middle',
                          borderRight: borderCell,
                          borderBottom: purchaseBottomBorder,
                        }}
                      >
                        {calc.totalBillingAmount ? formatRupees(calc.totalBillingAmount) : '-'}
                      </TableCell>

                      {/* Discount Amount */}
                      <TableCell
                        align="right"
                        sx={{
                          fontSize: '0.825rem',
                          fontWeight: 700,
                          py: 1.2,
                          px: 0.8,
                          color: mode === 'dark' ? '#f87171' : '#e11d48',
                          bgcolor: rowBg,
                          verticalAlign: 'middle',
                          borderRight: groupBorderRight,
                          borderBottom: purchaseBottomBorder,
                        }}
                      >
                        {discVal > 0 ? (
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.4, whiteSpace: 'nowrap' }}>
                            <span>{formatRupees(discVal)}</span>
                            {discPct !== null && discPct > 0 && (
                              <Typography
                                component="span"
                                sx={{
                                  fontSize: '0.725rem',
                                  fontWeight: 700,
                                  color: mode === 'dark' ? '#fca5a5' : '#be123c',
                                  opacity: 0.9,
                                  ml: 0.2,
                                }}
                              >
                                ({discPct % 1 === 0 ? discPct.toFixed(0) : discPct.toFixed(1)}%)
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <span style={{ opacity: 0.45 }}>₹0.00</span>
                        )}
                      </TableCell>

                      {/* GST (5%) */}
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.825rem',
                          py: 1.2,
                          px: 0.8,
                          color: mode === 'dark' ? '#c084fc' : '#7c3aed',
                          bgcolor: rowBg,
                          verticalAlign: 'middle',
                          borderRight: borderCell,
                          borderBottom: purchaseBottomBorder,
                        }}
                      >
                        {formatRupees(gstVal)}
                      </TableCell>

                      {/* Total With Tax */}
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 700,
                          color: mode === 'dark' ? '#34d399' : '#15803d',
                          bgcolor: rowBg,
                          fontSize: '0.825rem',
                          py: 1.2,
                          px: 1,
                          verticalAlign: 'middle',
                          borderRight: groupBorderRight,
                          borderBottom: purchaseBottomBorder,
                        }}
                      >
                        {formatRupees(calc.totalAmount)}
                      </TableCell>

                      {/* Bill Date */}
                      <TableCell
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
                        {b.isWorking || !b.invoiceNo || b.invoiceNo === '-' ? '-' : formatDate(b.date)}
                      </TableCell>

                      {/* Bill No */}
                      <TableCell
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
                        {b.isWorking || !b.invoiceNo || b.invoiceNo === '-' ? (
                          <Chip
                            label={language === 'gu' ? 'વર્કિંગ' : 'Working'}
                            size="small"
                            color="warning"
                            variant="outlined"
                            sx={{ fontWeight: 800, height: 20, fontSize: '0.68rem' }}
                          />
                        ) : (
                          b.invoiceNo
                        )}
                      </TableCell>

                      {/* Mode / Ref */}
                      <TableCell
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
                        {b.paymentStatus === 'Pending' || (!b.paymentStatus && (Number(b.paidAmount) || 0) === 0)
                          ? '-'
                          : b.paymentMethod === 'Cheque' || b.chequeNo
                          ? `${language === 'gu' ? 'ચેક બેંક' : 'Cheque'} ${b.chequeNo ? `#${b.chequeNo}` : ''}`
                          : (b.paymentMethod === 'Cash' || b.paymentMethod === 'રોકડ કેશ')
                          ? (language === 'gu' ? 'રોકડ કેશ' : 'Cash')
                          : b.paymentMethod || '-'}
                      </TableCell>

                      {/* Payment Date */}
                      <TableCell
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
                        {(isPaid || isPartial) ? (b.paymentDate ? formatDate(b.paymentDate) : (b.date ? formatDate(b.date) : '-')) : '-'}
                      </TableCell>

                      {/* Status */}
                      <TableCell
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
                        <Chip
                          label={
                            isPaid
                              ? (language === 'gu' ? 'મળ્યું' : 'Paid')
                              : isPartial
                              ? (language === 'gu' ? 'અંશતઃ મળેલ' : 'Partial')
                              : (language === 'gu' ? 'બાકી' : 'Pending')
                          }
                          size="small"
                          sx={{
                            fontWeight: 700,
                            height: 24,
                            fontSize: '0.72rem',
                            px: 0.8,
                            borderRadius: 3,
                            bgcolor: isPaid
                              ? (mode === 'dark' ? 'rgba(34,197,94,0.15)' : '#dcfce7')
                              : isPartial
                              ? (mode === 'dark' ? 'rgba(234,179,8,0.15)' : '#fef9c3')
                              : (mode === 'dark' ? 'rgba(239,68,68,0.15)' : '#fee2e2'),
                            color: isPaid
                              ? (mode === 'dark' ? '#4ade80' : '#15803d')
                              : isPartial
                              ? (mode === 'dark' ? '#facc15' : '#a16207')
                              : (mode === 'dark' ? '#f87171' : '#b91c1c'),
                            border: '1px solid',
                            borderColor: isPaid
                              ? (mode === 'dark' ? 'rgba(34,197,94,0.3)' : '#bbf7d0')
                              : isPartial
                              ? (mode === 'dark' ? 'rgba(234,179,8,0.3)' : '#fef08a')
                              : (mode === 'dark' ? 'rgba(239,68,68,0.3)' : '#fecaca'),
                          }}
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell
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
                              setBillToView(b);
                              setViewDetailsOpen(true);
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
                            onClick={() => handleOpenEditForm(b)}
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
                              setBillToDelete(b.id);
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
                          <Tooltip title={language === 'gu' ? 'પ્રિન્ટ / PDF ઇનવોઇસ' : 'Print / PDF Invoice'}>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedBill(b);
                                setPreviewOpen(true);
                              }}
                              sx={{
                                border: '1px solid',
                                borderColor: mode === 'dark' ? '#334155' : '#e2e8f0',
                                borderRadius: 2,
                                bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
                                color: mode === 'dark' ? '#a5b4fc' : '#4f46e5',
                                p: '4px',
                                '&:hover': {
                                  bgcolor: mode === 'dark' ? '#334155' : '#eef2ff',
                                },
                              }}
                            >
                              <PrintIcon sx={{ fontSize: '15px' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={language === 'gu' ? 'ઇનવોઇસ શેર કરો (WhatsApp / વિગત)' : 'Share Invoice (WhatsApp / Details)'}>
                            <IconButton
                              size="small"
                              onClick={(e) => handleOpenShareMenu(e, b)}
                              sx={{
                                border: '1px solid',
                                borderColor: mode === 'dark' ? '#334155' : '#e2e8f0',
                                borderRadius: 2,
                                bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
                                color: mode === 'dark' ? '#4ade80' : '#16a34a',
                                p: '4px',
                                '&:hover': {
                                  bgcolor: mode === 'dark' ? '#334155' : '#f0fdf4',
                                  color: '#15803d',
                                },
                              }}
                            >
                              <ShareIcon sx={{ fontSize: '15px' }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                });
              })()}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 20, 50, 100]}
          component="div"
          count={filteredBills.length}
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

      {/* Old Dialog replaced by dedicated full Page View */}
      <Dialog open={false} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{selectedBill ? `Edit Bill (${formData.invoiceNo})` : 'Create New GST Bill (ઇનવોઇસ બનાવો)'}</span>
          <IconButton onClick={() => setFormOpen(false)} sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Box component="form" onSubmit={handleSaveBill}>
          <DialogContent sx={{ p: { xs: 1.5, sm: 3 } }}>
            {/* Row 1: Invoice Number || Challan No || Invoice Date */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                label="Invoice Number (બિલ નં.)"
                placeholder="e.g. FCKB-1-1"
                value={formData.invoiceNo}
                onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
              />

              <TextField
                fullWidth
                label="Challan No. (ચલણ નં.)"
                placeholder="e.g. D-1215 / 1681"
                value={formData.challanNo || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    challanNo: val,
                    items: prev.items.map((it, i) => (i === 0 && !it.challanNo ? { ...it, challanNo: val } : it)),
                  }));
                }}
              />

              <TextField
                fullWidth
                type="date"
                label="Invoice Date"
                value={ensureIsoDate(formData.date)}
                onChange={(e) => {
                  const newDate = ensureIsoDate(e.target.value);
                  setFormData((prev) => ({
                    ...prev,
                    date: newDate,
                    dueDate: newDate,
                    items: prev.items.map((it) => (
                      !it.challanDate || it.challanDate === prev.date || it.challanDate === prev.dueDate
                        ? { ...it, challanDate: newDate }
                        : it
                    )),
                  }));
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            {/* Row 2: Party Name || Customer GSTIN Number || Party Challan Date || Delivery Date */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
              <Autocomplete
                freeSolo
                options={textileParties}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option;
                  return option.name || '';
                }}
                value={formData.partyName}
                onInputChange={(_, newInputValue) => {
                  const matched = textileParties.find((p) => p.name.toLowerCase() === newInputValue.toLowerCase());
                  setFormData((prev) => ({
                    ...prev,
                    partyName: newInputValue,
                    partyId: matched ? matched.id : prev.partyId,
                    partyGstin: matched ? (matched.gstin || '') : prev.partyGstin,
                  }));
                }}
                onChange={(_, newValue) => {
                  if (typeof newValue === 'string') {
                    const matched = textileParties.find((p) => p.name.toLowerCase() === newValue.toLowerCase());
                    setFormData((prev) => ({
                      ...prev,
                      partyName: newValue,
                      partyId: matched ? matched.id : '',
                      partyGstin: matched ? (matched.gstin || '') : prev.partyGstin,
                    }));
                  } else if (newValue && typeof newValue === 'object') {
                    setFormData((prev) => ({
                      ...prev,
                      partyName: newValue.name,
                      partyId: newValue.id,
                      partyGstin: newValue.gstin || '',
                    }));
                  }
                }}
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props;
                  return (
                    <Box component="li" key={option.id || key} {...optionProps} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start !important', py: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        {option.name}
                      </Typography>
                      {option.gstin && (
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          GSTIN: {option.gstin}
                        </Typography>
                      )}
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    label="Party Name *"
                    placeholder="Select or type party name..."
                    required
                  />
                )}
              />

              <TextField
                fullWidth
                label="Customer GSTIN Number"
                value={formData.partyGstin}
                onChange={(e) => setFormData({ ...formData, partyGstin: e.target.value })}
              />

              <TextField
                fullWidth
                type="date"
                label="Party Challan Date (ચલણ તારીખ)"
                value={ensureIsoDate(formData.dueDate)}
                onChange={(e) => {
                  const newDueDate = ensureIsoDate(e.target.value);
                  setFormData((prev) => ({
                    ...prev,
                    dueDate: newDueDate,
                    items: prev.items.map((it) => (
                      !it.challanDate || it.challanDate === prev.dueDate || it.challanDate === prev.date
                        ? { ...it, challanDate: newDueDate }
                        : it
                    )),
                  }));
                }}
                InputLabelProps={{ shrink: true }}
              />

              {isWorking ? (
                <TextField
                  fullWidth
                  disabled
                  label="Delivery Date (ડિલિવરી તારીખ)"
                  value={language === 'gu' ? 'વર્કિંગ (ડિલિવરી તારીખ ઉમેરાશે નહીં)' : 'Working (No Delivery Date)'}
                  InputProps={{
                    startAdornment: (
                      <Chip label="Working" size="small" color="warning" sx={{ mr: 1, fontWeight: 800, height: 22 }} />
                    ),
                  }}
                  helperText={language === 'gu' ? 'વર્કિંગ સ્વિચ ચાલુ છે - ડિલિવરી તારીખ ઉમેરાશે નહીં' : 'Working switch is ON — Delivery Date is omitted'}
                />
              ) : (
                <TextField
                  fullWidth
                  type="date"
                  label="Delivery Date (ડિલિવરી તારીખ)"
                  value={formData.deliveryDate || ''}
                  onChange={(e) => {
                    const newDelDate = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      deliveryDate: newDelDate,
                      items: prev.items.map((it) => (
                        !it.deliveryDate || it.deliveryDate === prev.deliveryDate
                          ? { ...it, deliveryDate: newDelDate }
                          : it
                      )),
                    }));
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mt: 3, mb: 1.5, gap: 0.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main', fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                📦 Item Details & Textile Billing Fields
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                (Lot, Rate, Plain, Shortage, Discount %, Amount)
              </Typography>
            </Box>

            {formData.items.map((item, idx) => (
              <Paper key={item.id || idx} variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #cbd5e1' }}>
                {/* Row 1: Challan Date || Delivery Date || Challan No || Item Description || Design Number || Gross Total Amount */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr 2fr 1fr 1.2fr' }, gap: 1.5, mb: 1.5, alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Challan Date (ચલણ તા.)"
                    value={item.challanDate || ''}
                    onChange={(e) => handleItemChange(idx, 'challanDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    disabled={isWorking}
                    label="Delivery Date (ડિલિવરી તા.)"
                    value={isWorking ? '' : (item.deliveryDate || formData.deliveryDate || '')}
                    onChange={(e) => handleItemChange(idx, 'deliveryDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Challan No. (ચલણ નં.)"
                    placeholder="e.g. 1681 / D-2010"
                    value={item.challanNo || ''}
                    onChange={(e) => handleItemChange(idx, 'challanNo', e.target.value)}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Item Description (વિગતો) *"
                    placeholder="e.g. સાડીની જોબ વર્ક - 1 નીડલ"
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    required
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Design No. (ડિઝાઇન નં.)"
                    placeholder="e.g. D-101 / 4502"
                    value={item.designNo || ''}
                    onChange={(e) => handleItemChange(idx, 'designNo', e.target.value)}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f5f3ff', p: 1, borderRadius: 1.5, border: '1.5px solid #a855f7', height: 40, boxSizing: 'border-box' }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#7e22ce', display: 'block', lineHeight: 1, fontWeight: 700 }}>
                        Total Amount (કુલ રકમ)
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 900, color: '#16a34a', mt: 0.2 }}>
                        ₹{(
                          Math.max(0, (Number(item.quantity) || 0) - ((Number(item.plain) || 0) + (Number(item.shortage) || 0))) * (Number(item.rate) || 0)
                        ).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                    {formData.items.length > 1 && (
                      <IconButton color="error" size="small" onClick={() => handleRemoveItemRow(idx)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Box>

                {/* Row 2: Lot / Qty, Bhav / Rate, Plain, Shortage */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 1.5, alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Lot / Qty (લોટ) *"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    required
                  />
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Rate (ભાવ ₹) *"
                    value={item.rate}
                    onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                    required
                  />
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Plain (પ્લેન)"
                    value={item.plain || ''}
                    onChange={(e) => handleItemChange(idx, 'plain', e.target.value)}
                    placeholder="0"
                  />
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Shortage (શોર્ટ)"
                    value={item.shortage}
                    onChange={(e) => handleItemChange(idx, 'shortage', e.target.value)}
                  />
                </Box>
              </Paper>
            ))}

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mt: 1.5, mb: 2, gap: 1.5 }}>
              <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={handleAddItemRow} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                + Add Item Row
              </Button>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
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
                    <Typography variant="body2" sx={{ fontWeight: 700, color: taxEnabled ? 'primary.main' : '#475569' }}>
                      Tax / GST (5%)
                    </Typography>
                  }
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={showNotesAndCharges}
                      onChange={(e) => setShowNotesAndCharges(e.target.checked)}
                      color="primary"
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>
                      Add Note & Material/Kapad Amount (નોંધ અને કાપડ રકમ)
                    </Typography>
                  }
                />
              </Box>
            </Box>

            {/* Discount Section (ALWAYS VISIBLE) & Extra Charges / Note Section (TOGGLED BY SWITCH) */}
            <Box sx={{ display: 'grid', gridTemplateColumns: showNotesAndCharges ? { xs: '1fr', md: '1fr 1.2fr' } : '1fr', gap: 2, mb: 2.5 }}>
              {/* Box 1: Discount & Round Off (LEFT) - ALWAYS SHOW */}
              <Paper variant="outlined" sx={{ p: 2, bgcolor: mode === 'dark' ? 'rgba(234, 179, 8, 0.08)' : '#fefce8', borderColor: mode === 'dark' ? 'rgba(234, 179, 8, 0.25)' : '#fef08a', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: mode === 'dark' ? '#fde047' : '#a16207', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  🏷️ Discount & Round Off Details
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '0.8fr 1fr 0.9fr' }, gap: 1.5, alignItems: 'start' }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Discount % (વટાવ %)"
                    placeholder="0"
                    value={formData.discountPercent || ''}
                    onChange={(e) => handleBillDiscountPercentChange(e.target.value)}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Discount Amount (વટાવ ₹)"
                    placeholder="0"
                    value={formData.discountAmount || ''}
                    onChange={(e) => handleBillDiscountAmountChange(e.target.value)}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Round Off (રાઉન્ડ ઓફ ₹)"
                    placeholder="0.00"
                    value={formData.roundOff || ''}
                    onChange={(e) => setFormData({ ...formData, roundOff: e.target.value })}
                    inputProps={{ step: '0.01' }}
                  />
                </Box>
              </Paper>

              {/* Box 2: Material Amount & Notes (RIGHT) - SHOW ONLY WHEN SWITCH IS ON */}
              {showNotesAndCharges && (
                <Paper variant="outlined" sx={{ p: 2, bgcolor: mode === 'dark' ? 'rgba(234, 179, 8, 0.08)' : '#fefce8', borderColor: mode === 'dark' ? 'rgba(234, 179, 8, 0.25)' : '#fef08a', borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: mode === 'dark' ? '#fde047' : '#a16207', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    📝 Additional Material/Kapad Deduction & Billing Notes
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1.3fr' }, gap: 1.5, alignItems: 'start' }}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Material/Kapad Amount (કાપડ / મટિરિયલ ₹)"
                      placeholder="e.g. 500"
                      value={formData.chargeAmount || ''}
                      onChange={(e) => handleChargeAmountChange(e.target.value)}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Bill Note / Delivery Instructions (બિલ સંબંધિત નોંધ)"
                      placeholder="Enter bill notes or terms..."
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </Box>
                </Paper>
              )}
            </Box>

            {/* PAYMENT RECEIVING & SETTLEMENT DETAILS */}
            <Paper variant="outlined" sx={{ p: 2.5, mb: 2.5, bgcolor: '#f0f9ff', borderRadius: 2, border: '1px solid #bae6fd' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0369a1', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                💳 Payment Receive Details (ચુકવણીની સ્થિતિ અને રકમ વિગત)
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
                {/* 1. Payment Status */}
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Payment Status (ચુકવણી સ્થિતિ)"
                  value={formData.paymentStatus}
                  onChange={(e) => {
                    const val = e.target.value as 'Received' | 'Pending';
                    const currentTotals = calculateTotals();
                    setFormData((prev) => ({
                      ...prev,
                      paymentStatus: val,
                      paymentMethod: val === 'Pending' ? '' : (prev.paymentMethod || 'Cash'),
                      paidAmount: val === 'Received' ? currentTotals.totalAmount : 0,
                      paymentDate: val === 'Received' ? (prev.paymentDate || new Date().toISOString().split('T')[0]) : '',
                    }));
                  }}
                >
                  <MenuItem value="Received">Received (પેમેન્ટ મળ્યું)</MenuItem>
                  <MenuItem value="Pending">Pending (બાકી)</MenuItem>
                </TextField>

                {/* 2. Payment Mode: Cash vs Cheque vs UPI vs Bank Transfer */}
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Payment Mode (ચુકવણી પ્રકાર)"
                  value={formData.paymentStatus === 'Pending' ? '' : formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                  disabled={formData.paymentStatus === 'Pending'}
                >
                  <MenuItem value="">
                    <em>{language === 'gu' ? 'બાકી (Pending)' : 'Pending (બાકી)'}</em>
                  </MenuItem>
                  <MenuItem value="Cash">💵 Cash (રોકડ)</MenuItem>
                  <MenuItem value="Cheque">🏦 Cheque (ચેક)</MenuItem>
                  <MenuItem value="UPI">📱 UPI / Online (GPay/PhonePe)</MenuItem>
                  <MenuItem value="Bank Transfer">🏛️ Bank Transfer / NEFT</MenuItem>
                </TextField>

                {/* 3. Received Amount */}
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Amount Received (પ્રાપ્ત રકમ ₹)"
                  value={formData.paidAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    const numVal = Number(val) || 0;
                    let newStatus: 'Received' | 'Pending' = 'Pending';
                    if (numVal > 0) newStatus = 'Received';

                    setFormData((prev) => ({
                      ...prev,
                      paidAmount: val,
                      paymentStatus: newStatus,
                    }));
                  }}
                  disabled={formData.paymentStatus === 'Pending'}
                  placeholder="e.g. 5000"
                />

                {/* 4. Payment Receive Date */}
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Receive Date (ચુકવણી મળ્યા તારીખ)"
                  value={formData.paymentStatus === 'Pending' ? '' : formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  disabled={formData.paymentStatus === 'Pending'}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>

              {/* Cheque Specific Fields */}
              {formData.paymentMethod === 'Cheque' && formData.paymentStatus !== 'Pending' && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, pt: 1.5, borderTop: '1px dashed #93c5fd', mt: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Cheque Number (ચેક નંબર) *"
                    placeholder="e.g. 000124 / 458920"
                    value={formData.chequeNo}
                    onChange={(e) => setFormData({ ...formData, chequeNo: e.target.value })}
                    required={formData.paymentMethod === 'Cheque'}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Cheque Date (ચેક તારીખ)"
                    value={formData.chequeDate}
                    onChange={(e) => setFormData({ ...formData, chequeDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Bank Name (ચેક બેંક)"
                    placeholder="e.g. SBI / HDFC / ICICI"
                    value={formData.chequeBank}
                    onChange={(e) => setFormData({ ...formData, chequeBank: e.target.value })}
                  />
                </Box>
              )}
            </Paper>

            <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: '#f1f5f9', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: { xs: 'center', sm: 'flex-end' }, alignItems: 'center' }}>
                <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, display: 'flex', flexDirection: 'column', gap: 0.5, width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 260 } }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#0284c7' }}>
                    Total Billing Amount (કુલ રકમ) : <strong>{formatRupees(totals.totalBillingAmount)}</strong>
                  </Typography>
                  {showNotesAndCharges && Number(formData.chargeAmount) > 0 && (
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#dc2626' }}>
                      Material/Kapad Amount (મટિરિયલ/કાપડ ની રકમ) : <strong>- {formatRupees(Number(formData.chargeAmount))}</strong>
                    </Typography>
                  )}
                  {totals.totalDiscount > 0 && (
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#dc2626' }}>
                      Total Discount (વટાવ) : <strong>- {formatRupees(totals.totalDiscount)}</strong>
                    </Typography>
                  )}
                  {taxEnabled && totals.totalTax > 0 && (
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0284c7' }}>
                      GST Tax (5%) : <strong>+ {formatRupees(totals.totalTax)}</strong>
                    </Typography>
                  )}
                  {totals.roundOff !== 0 && (
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0284c7' }}>
                      Round Off (રાઉન્ડ ઓફ) : <strong>{totals.roundOff > 0 ? `+ ${formatRupees(totals.roundOff)}` : `- ${formatRupees(Math.abs(totals.roundOff))}`}</strong>
                    </Typography>
                  )}
                  <Box sx={{ borderTop: '1px solid #cbd5e1', my: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 800, color: 'success.main', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                    Total Amount : {formatRupees(totals.totalAmount)}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </DialogContent>

          <DialogActions sx={{ p: { xs: 2, sm: 2.5 }, flexDirection: { xs: 'column-reverse', sm: 'row' }, gap: { xs: 1, sm: 0 } }}>
            <Button onClick={() => setFormOpen(false)} variant="outlined" sx={{ width: { xs: '100%', sm: 'auto' } }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary" sx={{ px: 4, fontWeight: 700, width: { xs: '100%', sm: 'auto' } }}>
              {selectedBill ? 'Update Bill' : 'Save & Generate Bill'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* VIEW BILL DETAILS DIALOG */}
      <Dialog
        open={viewDetailsOpen}
        onClose={() => {
          setViewDetailsOpen(false);
          setBillToView(null);
        }}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            bgcolor: mode === 'dark' ? '#0f172a' : '#ffffff',
          },
        }}
      >
        {billToView && (
          <>
            {/* Modal Top Header Bar */}
            <DialogTitle
              sx={{
                fontWeight: 800,
                background: mode === 'dark'
                  ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                  : 'linear-gradient(135deg, #3730a3 0%, #4f46e5 100%)',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 2,
                px: 3,
                borderBottom: `1px solid ${mode === 'dark' ? '#334155' : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    bgcolor: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ReceiptIcon sx={{ color: '#fff', fontSize: '22px' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, color: '#fff', fontSize: '1.15rem' }}>
                    {language === 'gu' ? 'ઇનવોઇસ / બિલ વિગતો' : 'Invoice & Bill Details'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.85)', display: 'block', fontWeight: 500, mt: 0.2 }}>
                    {language === 'gu'
                      ? `ઇનવોઇસ નં: ${billToView.invoiceNo} | તારીખ: ${formatDate(billToView.date)}`
                      : `Invoice No: ${billToView.invoiceNo} | Date: ${formatDate(billToView.date)}`}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Chip
                  label={(billToView.status === 'Paid' || billToView.status === 'Received' || (billToView.paidAmount !== undefined && billToView.paidAmount > 0))
                    ? (language === 'gu' ? 'Received (પેમેન્ટ મળ્યું)' : 'Received')
                    : (language === 'gu' ? 'Pending (બાકી)' : 'Pending')}
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    color: '#ffffff',
                    bgcolor: (billToView.status === 'Paid' || billToView.status === 'Received' || (billToView.paidAmount !== undefined && billToView.paidAmount > 0))
                      ? '#16a34a'
                      : '#dc2626',
                    px: 1,
                    height: 28,
                    borderRadius: 2,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                  }}
                />
                <IconButton
                  size="small"
                  onClick={() => {
                    setViewDetailsOpen(false);
                    setBillToView(null);
                  }}
                  sx={{
                    color: '#ffffff',
                    bgcolor: 'rgba(255,255,255,0.15)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                    transition: 'all 0.2s',
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            </DialogTitle>

            <DialogContent sx={{ p: { xs: 1.5, sm: 3 }, bgcolor: mode === 'dark' ? '#0f172a' : '#f8fafc' }}>
              <div id="printable-bill-details-content" style={{ padding: '8px' }}>
              {/* Party & Bill Info Top Cards */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' },
                  gap: 2,
                  mb: 3,
                  mt: 0.5,
                }}
              >
                {/* Party Card */}
                <Box
                  sx={{
                    p: 2.5,
                    bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
                    borderRadius: 2.5,
                    border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    boxShadow: mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.2 }}>
                    <PersonIcon sx={{ color: mode === 'dark' ? '#38bdf8' : '#0284c7', fontSize: 20 }} />
                    <Typography
                      variant="caption"
                      sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', textTransform: 'uppercase', fontWeight: 800, letterSpacing: 0.6 }}
                    >
                      {language === 'gu' ? 'ગ્રાહક / પાર્ટી વિગતો' : 'Customer & Party Details'}
                    </Typography>
                  </Box>

                  {(() => {
                    const matchedParty = parties.find(
                      (p) => p.id === billToView.partyId || p.name === billToView.partyName || p.name.toLowerCase() === billToView.partyName.toLowerCase()
                    );
                    const displayContactPerson = (billToView as any).partyContactPerson || matchedParty?.contactPerson || 'મનુભાઈ મોતીસરિયા';
                    const displayGstin = billToView.partyGstin || matchedParty?.gstin || '24CXNPM7771G1ZZ';
                    const displayMobile = billToView.partyMobile || matchedParty?.mobile || '-';
                    const displayAddress = billToView.partyAddress || matchedParty?.address || 'સ્વામીનારાયણ કમ્પાઉન્ડ ,GIDC, સુરત';
                    const partyType = matchedParty?.type || 'Textile Customer Party';

                    return (
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.2 }}>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: mode === 'dark' ? '#f8fafc' : '#0f172a', fontSize: '1.15rem' }}>
                            {billToView.partyName}
                          </Typography>
                          <Chip
                            label={partyType}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              bgcolor: mode === 'dark' ? 'rgba(99,102,241,0.2)' : '#e0e7ff',
                              color: mode === 'dark' ? '#818cf8' : '#4338ca',
                              borderRadius: 1.5,
                            }}
                          />
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {/* Contact Person */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, minWidth: 105 }}>
                              {language === 'gu' ? 'સંપર્ક વ્યક્તિ:' : 'Contact Person:'}
                            </Typography>
                            <Typography variant="body2" sx={{ color: mode === 'dark' ? '#f1f5f9' : '#0f172a', fontWeight: 700 }}>
                              👤 {displayContactPerson}
                            </Typography>
                          </Box>

                          {/* GSTIN */}
                          {displayGstin ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="caption" sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, minWidth: 105 }}>
                                GSTIN Number:
                              </Typography>
                              <Typography variant="body2" sx={{ color: mode === 'dark' ? '#f1f5f9' : '#0f172a', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.88rem' }}>
                                {displayGstin}
                              </Typography>
                            </Box>
                          ) : null}

                          {/* Mobile Number */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, minWidth: 105 }}>
                              {language === 'gu' ? 'મોબાઇલ નંબર:' : 'Mobile Number:'}
                            </Typography>
                            <Typography variant="body2" sx={{ color: mode === 'dark' ? '#f1f5f9' : '#0f172a', fontWeight: 600 }}>
                              📱 {displayMobile}
                            </Typography>
                          </Box>

                          {/* Full Address & City */}
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <Typography variant="caption" sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, minWidth: 105, pt: 0.2 }}>
                              {language === 'gu' ? 'સરનામું અને શહેર:' : 'Full Address & City:'}
                            </Typography>
                            <Typography variant="body2" sx={{ color: mode === 'dark' ? '#cbd5e1' : '#334155', fontSize: '0.88rem', fontWeight: 500, lineHeight: 1.4 }}>
                              📍 {displayAddress}
                            </Typography>
                          </Box>
                        </Box>
                      </>
                    );
                  })()}
                </Box>

                {/* Invoice Meta Info Card */}
                <Box
                  sx={{
                    p: 2.5,
                    bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
                    borderRadius: 2.5,
                    border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                    boxShadow: mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <CalendarIcon sx={{ color: mode === 'dark' ? '#a855f7' : '#7c3aed', fontSize: 20 }} />
                    <Typography
                      variant="caption"
                      sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', textTransform: 'uppercase', fontWeight: 800, letterSpacing: 0.6 }}
                    >
                      {language === 'gu' ? 'ઇનવોઇસ અને ચલણ માહિતી' : 'Invoice & Challan Info'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 1.5 }}>
                    <Box sx={{ p: 1.2, bgcolor: mode === 'dark' ? '#0f172a' : '#f1f5f9', borderRadius: 2 }}>
                      <Typography variant="caption" sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, display: 'block', fontSize: '0.72rem' }}>
                        {language === 'gu' ? 'ઇનવોઇસ નં' : 'Invoice No'}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 800, color: 'primary.main', fontSize: '0.95rem', mt: 0.2 }}>
                        {billToView.invoiceNo}
                      </Typography>
                    </Box>

                    <Box sx={{ p: 1.2, bgcolor: mode === 'dark' ? '#0f172a' : '#f1f5f9', borderRadius: 2 }}>
                      <Typography variant="caption" sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, display: 'block', fontSize: '0.72rem' }}>
                        {language === 'gu' ? 'ચલણ નં' : 'Challan No'}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 800, color: mode === 'dark' ? '#f8fafc' : '#0f172a', fontSize: '0.95rem', mt: 0.2 }}>
                        {billToView.challanNo || '-'}
                      </Typography>
                    </Box>

                    <Box sx={{ p: 1.2, bgcolor: mode === 'dark' ? '#0f172a' : '#f1f5f9', borderRadius: 2 }}>
                      <Typography variant="caption" sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, display: 'block', fontSize: '0.72rem' }}>
                        {language === 'gu' ? 'ચલણ તારીખ' : 'Challan Date'}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: mode === 'dark' ? '#cbd5e1' : '#334155', mt: 0.2 }}>
                        {formatDate(billToView.dueDate || billToView.date)}
                      </Typography>
                    </Box>

                    <Box sx={{ p: 1.2, bgcolor: mode === 'dark' ? '#0f172a' : '#f1f5f9', borderRadius: 2 }}>
                      <Typography variant="caption" sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 700, display: 'block', fontSize: '0.72rem' }}>
                        {language === 'gu' ? 'ડિલિવરી તારીખ' : 'Delivery Date'}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: mode === 'dark' ? '#cbd5e1' : '#334155', mt: 0.2 }}>
                        {billToView.isWorking || !billToView.deliveryDate ? '-' : formatDate(billToView.deliveryDate)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Items Table Section */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: mode === 'dark' ? '#f8fafc' : '#0f172a', fontSize: '0.95rem' }}>
                    {language === 'gu' ? 'બિલ વસ્તુઓની યાદી' : 'Billed Items List'} ({billToView.items?.length || 0})
                  </Typography>
                </Box>

                {(() => {
                  const hasGstTax = Boolean(
                    (billToView.taxRate && billToView.taxRate > 0) ||
                    (billToView.totalTax && billToView.totalTax > 0) ||
                    (billToView.cgst && billToView.cgst > 0) ||
                    (billToView.sgst && billToView.sgst > 0)
                  );

                  return (
                    <TableContainer
                      sx={{
                        border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                        borderRadius: 2.5,
                        bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
                        boxShadow: mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.03)',
                        overflow: 'hidden',
                      }}
                    >
                      <Table size="small">
                        <TableHead sx={{ bgcolor: mode === 'dark' ? '#0f172a' : '#f1f5f9' }}>
                          <TableRow>
                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem', py: 1.2, color: mode === 'dark' ? '#94a3b8' : '#475569' }}>#</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem', py: 1.2, color: mode === 'dark' ? '#94a3b8' : '#475569' }}>{language === 'gu' ? 'ચલણ તા.' : 'Challan Date'}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem', py: 1.2, color: mode === 'dark' ? '#94a3b8' : '#475569' }}>{language === 'gu' ? 'ચલણ નં.' : 'Challan No'}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem', py: 1.2, color: mode === 'dark' ? '#94a3b8' : '#475569' }}>{language === 'gu' ? 'વિગતો / ડિઝાઇન' : 'Description / Particulars'}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem', py: 1.2, color: mode === 'dark' ? '#94a3b8' : '#475569' }}>{language === 'gu' ? 'લોટ/Qty' : 'Lot/Qty'}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem', py: 1.2, color: mode === 'dark' ? '#94a3b8' : '#475569' }}>{language === 'gu' ? 'ભાવ (₹)' : 'Rate (₹)'}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem', py: 1.2, color: mode === 'dark' ? '#94a3b8' : '#475569' }}>{language === 'gu' ? 'પ્લેન' : 'Plain'}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem', py: 1.2, color: mode === 'dark' ? '#94a3b8' : '#475569' }}>{language === 'gu' ? 'શોર્ટ' : 'Short'}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem', py: 1.2, color: mode === 'dark' ? '#94a3b8' : '#475569' }}>{language === 'gu' ? 'વટાવ (₹)' : 'Discount (₹)'}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '0.75rem', py: 1.2, color: mode === 'dark' ? '#94a3b8' : '#475569' }}>{language === 'gu' ? 'કુલ રકમ (₹)' : 'Total Amount (₹)'}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(billToView.items || []).map((item, i) => {
                            const itemQty = Number(item.quantity) || 0;
                            const itemPlain = Number(item.plain) || 0;
                            const itemShortage = Number(item.shortage) || 0;
                            const effectiveQty = Math.max(0, itemQty - (itemShortage + itemPlain));
                            const itemRate = Number(item.rate) || 0;
                            const grossAmount = effectiveQty * itemRate;
                            const discAmt = Number(item.discountAmount) || 0;
                            const netTotal = grossAmount > 0 && discAmt > 0 ? (grossAmount - discAmt) : (item.amount || grossAmount);

                            return (
                              <TableRow
                                key={item.id || i}
                                sx={{
                                  '&:hover': { bgcolor: mode === 'dark' ? '#0f172a' : '#f8fafc' },
                                  borderBottom: i === (billToView.items?.length || 1) - 1 ? 'none' : `1px solid ${mode === 'dark' ? '#334155' : '#f1f5f9'}`,
                                }}
                              >
                                <TableCell align="center" sx={{ fontWeight: 600, color: mode === 'dark' ? '#94a3b8' : '#64748b' }}>{i + 1}</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                                  {formatDate(item.challanDate || billToView.dueDate || billToView.date)}
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.85rem' }}>
                                  {item.challanNo || billToView.challanNo || '-'}
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, color: mode === 'dark' ? '#f1f5f9' : '#1e293b' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                    {item.designNo && (
                                      <Chip
                                        label={item.designNo}
                                        size="small"
                                        sx={{
                                          fontWeight: 800,
                                          fontSize: '0.72rem',
                                          height: 20,
                                          bgcolor: mode === 'dark' ? 'rgba(56,189,248,0.15)' : '#e0f2fe',
                                          color: mode === 'dark' ? '#38bdf8' : '#0284c7',
                                          borderRadius: 1,
                                        }}
                                      />
                                    )}
                                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                                      {item.description || 'Item'}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700 }}>{item.quantity}</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600 }}>₹{item.rate}</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600, color: itemPlain > 0 ? 'warning.main' : 'inherit' }}>
                                  {itemPlain > 0 ? itemPlain : '-'}
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600, color: itemShortage > 0 ? 'error.main' : 'inherit' }}>
                                  {itemShortage > 0 ? itemShortage : '-'}
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600, color: discAmt > 0 ? '#dc2626' : 'inherit' }}>
                                  {discAmt > 0 ? `- ${formatRupees(discAmt)}` : '-'}
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 800, color: 'primary.main', fontSize: '0.88rem' }}>
                                  {formatRupees(netTotal)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  );
                })()}
              </Box>

              {/* Payment Info & Calculations Bottom Grid */}
              {(() => {
                const viewGrossSubtotal = (billToView.items || []).reduce((acc, item) => {
                  const lot = Number(item.quantity) || 0;
                  const rate = Number(item.rate) || 0;
                  const plain = Number(item.plain) || 0;
                  const shortage = Number(item.shortage) || 0;
                  return acc + (Math.max(0, lot - (shortage + plain)) * rate);
                }, 0);

                const viewItemDiscounts = (billToView.items || []).reduce((acc, item) => {
                  return acc + (Number(item.discountAmount) || 0);
                }, 0);

                const viewTotalDiscount = (billToView.totalDiscount !== undefined && billToView.totalDiscount > 0)
                  ? billToView.totalDiscount
                  : viewItemDiscounts;

                const viewChargeAmount = Number(billToView.extraCharges ?? billToView.chargeAmount ?? 0);
                const displayGross = viewGrossSubtotal > 0 ? viewGrossSubtotal : (billToView.subtotal + viewTotalDiscount);

                return (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, gap: 2 }}>
                    {/* Left: Payment Method & Notes */}
                    <Box
                      sx={{
                        p: 2.5,
                        bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
                        borderRadius: 2.5,
                        border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                        boxShadow: mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', textTransform: 'uppercase', fontWeight: 800, letterSpacing: 0.6, display: 'block', mb: 1.5 }}
                          >
                            {language === 'gu' ? 'ચૂકવણી વિગત અને પદ્ધતિ' : 'Payment Info & Method'}
                          </Typography>

                          {/* Payment Attributes Grid */}
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, mb: billToView.paymentMethod === 'Cheque' ? 1.5 : 0 }}>
                            {/* Row 1: Status */}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: mode === 'dark' ? '#94a3b8' : '#64748b' }}>
                                {language === 'gu' ? 'ચુકવણી સ્થિતિ:' : 'Payment Status:'}
                              </Typography>
                              {(() => {
                                const pStatus = billToView.status || billToView.paymentStatus || 'Pending';
                                const isReceived = pStatus === 'Received' || pStatus === 'Paid';
                                const isPartial = pStatus === 'Partial';

                                let statusLabel = language === 'gu' ? 'બાકી (Pending)' : 'Pending';
                                let bgClr = mode === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2';
                                let textClr = mode === 'dark' ? '#f87171' : '#dc2626';

                                if (isReceived) {
                                  statusLabel = language === 'gu' ? 'મળેલ (Received)' : 'Received';
                                  bgClr = mode === 'dark' ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7';
                                  textClr = mode === 'dark' ? '#4ade80' : '#15803d';
                                } else if (isPartial) {
                                  statusLabel = language === 'gu' ? 'અંશતઃ ચૂકવેલ (Partial)' : 'Partial';
                                  bgClr = mode === 'dark' ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7';
                                  textClr = mode === 'dark' ? '#fbbf24' : '#b45309';
                                }

                                return (
                                  <Chip
                                    label={statusLabel}
                                    size="small"
                                    sx={{
                                      fontWeight: 800,
                                      fontSize: '0.78rem',
                                      bgcolor: bgClr,
                                      color: textClr,
                                      borderRadius: 1.5,
                                    }}
                                  />
                                );
                              })()}
                            </Box>

                            {/* Row 2: Method & Date */}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: mode === 'dark' ? '#94a3b8' : '#64748b' }}>
                                  {language === 'gu' ? 'પદ્ધતિ:' : 'Method:'}
                                </Typography>
                                {(() => {
                                  const isPending = billToView.status === 'Pending' || billToView.paymentStatus === 'Pending' || (Number(billToView.paidAmount) || 0) === 0;
                                  let methodLabel = '-';
                                  if (isPending) {
                                    methodLabel = language === 'gu' ? 'બાકી (Pending)' : 'Pending';
                                  } else {
                                    const m = billToView.paymentMethod;
                                    if (m === 'Cash' || m === 'રોકડ') methodLabel = language === 'gu' ? 'રોકડ (Cash)' : 'Cash';
                                    else if (m === 'Cheque' || m === 'ચેક') methodLabel = language === 'gu' ? 'ચેક (Cheque)' : 'Cheque';
                                    else if (m === 'UPI' || m === 'Online' || m === 'ઓનલાઇન') methodLabel = language === 'gu' ? 'ઓનલાઇન / UPI' : 'UPI / Online';
                                    else if (m === 'Bank Transfer') methodLabel = language === 'gu' ? 'બેંક ટ્રાન્સફર (Bank Transfer)' : 'Bank Transfer';
                                    else methodLabel = m || (language === 'gu' ? 'બાકી (Pending)' : 'Pending');
                                  }

                                  return (
                                    <Chip
                                      label={methodLabel}
                                      size="small"
                                      sx={{
                                        fontWeight: 800,
                                        fontSize: '0.78rem',
                                        bgcolor: isPending
                                          ? (mode === 'dark' ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7')
                                          : (mode === 'dark' ? 'rgba(56,189,248,0.15)' : '#e0f2fe'),
                                        color: isPending
                                          ? (mode === 'dark' ? '#fbbf24' : '#d97706')
                                          : (mode === 'dark' ? '#38bdf8' : '#0284c7'),
                                        borderRadius: 1.5,
                                      }}
                                    />
                                  );
                                })()}
                              </Box>

                              {(billToView.status === 'Paid' || billToView.status === 'Received' || (billToView.paidAmount !== undefined && billToView.paidAmount > 0)) && billToView.paymentDate && (
                                <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 700, fontSize: '0.85rem' }}>
                                  {language === 'gu' ? 'તારીખ:' : 'Date:'} {formatDate(billToView.paymentDate)}
                                </Typography>
                              )}
                            </Box>
                          </Box>

                          {/* Cheque Info Row - Sleek Divider Row */}
                          {billToView.paymentMethod === 'Cheque' && (
                            <Box
                              sx={{
                                pt: 1.2,
                                pb: 1.2,
                                px: 1.5,
                                bgcolor: mode === 'dark' ? 'rgba(15, 23, 42, 0.6)' : '#f1f5f9',
                                borderRadius: 2,
                                borderLeft: `3px solid ${mode === 'dark' ? '#38bdf8' : '#0284c7'}`,
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: mode === 'dark' ? '#e2e8f0' : '#1e293b' }}>
                                  {language === 'gu' ? 'ચેક નં:' : 'Cheque No:'} <span style={{ fontWeight: 800 }}>{billToView.chequeNo || 'N/A'}</span>
                                </Typography>
                                {billToView.chequeDate && (
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: mode === 'dark' ? '#e2e8f0' : '#1e293b' }}>
                                    {language === 'gu' ? 'તારીખ:' : 'Date:'} <span style={{ fontWeight: 800 }}>{formatDate(billToView.chequeDate)}</span>
                                  </Typography>
                                )}
                              </Box>
                              {billToView.chequeBank && (
                                <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 600, color: mode === 'dark' ? '#94a3b8' : '#475569' }}>
                                  {language === 'gu' ? 'બેંક:' : 'Bank:'} {billToView.chequeBank}
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Box>

                        {/* Notes / Delivery Instructions & Material Charge Box */}
                        {(Boolean(billToView.notes) || viewChargeAmount > 0) && (
                          <Box
                            sx={{
                              p: 1.5,
                              bgcolor: mode === 'dark' ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb',
                              borderRadius: 2,
                              borderLeft: `4px solid ${mode === 'dark' ? '#f59e0b' : '#d97706'}`,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 1.5,
                            }}
                          >
                            <Box sx={{ flex: 1, minWidth: '140px' }}>
                              <Typography variant="caption" sx={{ color: mode === 'dark' ? '#fbbf24' : '#b45309', fontWeight: 800, display: 'block', mb: 0.3, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                {language === 'gu' ? 'નોંધ / ડિલિવરી સૂચનાઓ:' : 'Notes / Delivery Instructions:'}
                              </Typography>
                              <Typography variant="body2" sx={{ color: mode === 'dark' ? '#fde68a' : '#78350f', fontWeight: 600, lineHeight: 1.4 }}>
                                {billToView.notes || '-'}
                              </Typography>
                            </Box>

                            {viewChargeAmount > 0 && (
                              <Box sx={{ textAlign: 'right', pl: 1.5, borderLeft: `1px solid ${mode === 'dark' ? 'rgba(245, 158, 11, 0.3)' : '#fde68a'}`, whiteSpace: 'nowrap' }}>
                                <Typography variant="subtitle2" sx={{ color: mode === 'dark' ? '#f87171' : '#dc2626', fontWeight: 800, fontSize: '0.95rem' }}>
                                  - {formatRupees(viewChargeAmount)}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        )}
                      </Box>
                    </Box>

                    {/* Right: Calculations Summary Card */}
                    <Box
                      sx={{
                        p: 2.5,
                        bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
                        borderRadius: 2.5,
                        border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
                        boxShadow: mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      {(() => {
                        const totBilling = displayGross;
                        const kapadAmt = viewChargeAmount;
                        const totDisc = viewTotalDiscount;
                        const totTaxVal = (billToView.totalTax > 0 || (billToView.cgst > 0 && billToView.sgst > 0))
                          ? billToView.totalTax || ((billToView.cgst || 0) + (billToView.sgst || 0))
                          : Number((billToView.subtotal * 0.05).toFixed(2));
                        const roundOffVal = billToView.roundOff || 0;
                        const netTotalAmt = billToView.totalAmount || (billToView.subtotal + totTaxVal + roundOffVal);

                        return (
                          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', gap: 1.5 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                              <Typography
                                variant="caption"
                                sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', textTransform: 'uppercase', fontWeight: 800, letterSpacing: 0.6, display: 'block', mb: 1.5 }}
                              >
                                {language === 'gu' ? 'ગણતરી અને કુલ સરવાળો' : 'CALCULATIONS & SUMMARY'}
                              </Typography>

                              {/* Billing Amount */}
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: `1px dashed ${mode === 'dark' ? '#334155' : '#f1f5f9'}` }}>
                                <Typography variant="body2" sx={{ color: mode === 'dark' ? '#cbd5e1' : '#475569', fontWeight: 600 }}>
                                  {language === 'gu' ? 'કુલ બિલિંગ રકમ:' : 'Total Billing Amount:'}
                                </Typography>
                                <Typography variant="body2" sx={{ color: mode === 'dark' ? '#f87171' : '#0f172a', fontWeight: 800 }}>
                                  {formatRupees(totBilling)}
                                </Typography>
                              </Box>

                              {/* Material Deduction */}
                              {kapadAmt > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: `1px dashed ${mode === 'dark' ? '#334155' : '#f1f5f9'}` }}>
                                  <Typography variant="body2" sx={{ color: mode === 'dark' ? '#f87171' : '#e11d48', fontWeight: 600 }}>
                                    {language === 'gu' ? 'મટીરીયલ / કાપડ બાદ રકમ:' : 'Material/Kapad Amount:'}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: mode === 'dark' ? '#f87171' : '#e11d48', fontWeight: 800 }}>
                                    - {formatRupees(kapadAmt)}
                                  </Typography>
                                </Box>
                              )}

                              {/* Discount */}
                              {totDisc > 0 && (() => {
                                const rawPct = (billToView as any).discountPercent;
                                const discPctNum = (rawPct !== undefined && rawPct !== null && rawPct !== '' && !isNaN(Number(rawPct)) && Number(rawPct) > 0)
                                  ? Number(rawPct)
                                  : (totBilling > 0 ? ((totDisc / totBilling) * 100) : 0);
                                const discPct = Number(discPctNum) || 0;
                                const discPctStr = discPct > 0 ? ` (${discPct % 1 === 0 ? discPct.toFixed(0) : discPct.toFixed(2)}%)` : '';
                                return (
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: `1px dashed ${mode === 'dark' ? '#334155' : '#f1f5f9'}` }}>
                                    <Typography variant="body2" sx={{ color: mode === 'dark' ? '#f87171' : '#e11d48', fontWeight: 600 }}>
                                      {language === 'gu' ? `કુલ વટાવ${discPctStr}:` : `Total Discount${discPctStr}:`}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: mode === 'dark' ? '#f87171' : '#e11d48', fontWeight: 800 }}>
                                      - {formatRupees(totDisc)}
                                    </Typography>
                                  </Box>
                                );
                              })()}

                              {/* Tax */}
                              {totTaxVal > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: `1px dashed ${mode === 'dark' ? '#334155' : '#f1f5f9'}` }}>
                                  <Typography variant="body2" sx={{ color: mode === 'dark' ? '#c084fc' : '#7c3aed', fontWeight: 600 }}>
                                    {language === 'gu' ? 'જીએસટી ટેક્સ (5%):' : 'GST Tax (5%):'}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: mode === 'dark' ? '#c084fc' : '#7c3aed', fontWeight: 800 }}>
                                    + {formatRupees(totTaxVal)}
                                  </Typography>
                                </Box>
                              )}

                              {/* Round Off */}
                              {roundOffVal !== 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75 }}>
                                  <Typography variant="body2" sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 600 }}>
                                    {language === 'gu' ? 'રાઉન્ડ ઓફ:' : 'Round Off:'}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: mode === 'dark' ? '#94a3b8' : '#64748b', fontWeight: 800 }}>
                                    {roundOffVal >= 0 ? `+ ${formatRupees(roundOffVal)}` : `- ${formatRupees(Math.abs(roundOffVal))}`}
                                  </Typography>
                                </Box>
                              )}
                            </Box>

                            {/* Main Payable Amount Highlight Box */}
                            <Box
                              sx={{
                                p: 1.75,
                                mt: 'auto',
                                borderRadius: 2,
                                bgcolor: mode === 'dark' ? 'rgba(99,102,241,0.12)' : '#f0f7ff',
                                border: `1px solid ${mode === 'dark' ? 'rgba(99,102,241,0.3)' : '#bfdbfe'}`,
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: mode === 'dark' ? '#93c5fd' : '#1e3a8a', fontSize: '0.95rem', lineHeight: 1.2 }}>
                                  {language === 'gu' ? 'કુલ રકમ:' : 'Total Amount:'}
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: mode === 'dark' ? '#60a5fa' : '#1e3a8a', fontSize: '1.25rem', whiteSpace: 'nowrap' }}>
                                  {formatRupees(netTotalAmt)}
                                </Typography>
                              </Box>

                              <Typography
                                variant="caption"
                                sx={{
                                  color: mode === 'dark' ? '#93c5fd' : '#2563eb',
                                  fontWeight: 600,
                                  display: 'block',
                                  pt: 0.75,
                                  borderTop: `1px dotted ${mode === 'dark' ? 'rgba(147,197,253,0.3)' : '#93c5fd'}`,
                                  fontSize: '0.8rem',
                                  lineHeight: 1.35,
                                  fontStyle: 'italic',
                                }}
                              >
                                {numberToWords(netTotalAmt, language)}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })()}
                    </Box>
                  </Box>
                );
              })()}
            </div>
          </DialogContent>

            {/* Modal Bottom Action Bar */}
            <DialogActions
              sx={{
                p: 2.5,
                px: 3,
                justifyContent: 'space-between',
                bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
                borderTop: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
              }}
            >
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<PrintIcon />}
                  onClick={() => {
                    setSelectedBill(billToView);
                    setPreviewOpen(true);
                    setViewDetailsOpen(false);
                  }}
                  sx={{
                    fontWeight: 700,
                    textTransform: 'none',
                    px: 3,
                    py: 1,
                    borderRadius: 2,
                    bgcolor: '#4f46e5',
                    '&:hover': { bgcolor: '#4338ca' },
                    boxShadow: '0 4px 6px -1px rgba(79,70,229,0.25)',
                  }}
                >
                  {language === 'gu' ? 'પ્રિન્ટ ઇનવોઇસ / PDF' : 'Printable Invoice / PDF'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PdfIcon />}
                  onClick={handleDownloadDetailsPdf}
                  sx={{
                    fontWeight: 700,
                    textTransform: 'none',
                    px: 2.5,
                    py: 1,
                    borderRadius: 2,
                    color: '#0284c7',
                    borderColor: '#7dd3fc',
                    bgcolor: '#f0f9ff',
                    '&:hover': { bgcolor: '#e0f2fe', borderColor: '#38bdf8' },
                  }}
                >
                  {language === 'gu' ? 'બિલ વિગતો PDF ડાઉનલોડ' : 'Download Details PDF'}
                </Button>
              </Box>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => {
                  setViewDetailsOpen(false);
                  setBillToView(null);
                }}
                sx={{
                  fontWeight: 700,
                  textTransform: 'none',
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  borderColor: mode === 'dark' ? '#475569' : '#cbd5e1',
                  '&:hover': { bgcolor: mode === 'dark' ? '#334155' : '#f1f5f9' },
                }}
              >
                {language === 'gu' ? 'બંધ કરો' : 'Close'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Hidden A4 Details PDF Export Template Container */}
      {billToView && (
        <div style={{ position: 'fixed', top: 0, left: '-9999px', width: '760px', backgroundColor: '#ffffff', opacity: 0, pointerEvents: 'none', zIndex: -1000, height: 0, overflow: 'hidden' }}>
          <div id="printable-bill-details-pdf-template">
            <BillDetailsPdfTemplate bill={billToView} settings={settings} language={language} parties={parties} />
          </div>
        </div>
      )}


      {(selectedBill || selectedBillsForPrint.length > 0) && (
        <InvoiceModal
          open={previewOpen}
          onClose={() => {
            setPreviewOpen(false);
            setSelectedBillsForPrint([]);
          }}
          bill={selectedBill}
          bills={selectedBillsForPrint.length > 0 ? selectedBillsForPrint : undefined}
          settings={settings}
        />
      )}

      <ConfirmationDialog
        open={deleteOpen}
        title="Delete Bill Invoice?"
        message="Are you sure you want to permanently delete this bill? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteOpen(false)}
      />

      <ConfirmationDialog
        open={bulkDeleteOpen}
        title={language === 'gu' ? 'ઇનવોઇસ કાઢી નાખો?' : 'Delete Selected Bills?'}
        message={
          language === 'gu'
            ? `શું તમે ચોક્કસ પસંદ કરેલા ${selectedBillIds.length} ઇનવોઇસ કાયમી માટે કાઢી નાખવા માંગો છો?`
            : `Are you sure you want to delete ${selectedBillIds.length} selected invoices? This action cannot be undone.`
        }
        onConfirm={handleBulkDeleteConfirm}
        onClose={() => setBulkDeleteOpen(false)}
      />

      {/* SHARE INVOICE MENU */}
      <Menu
        anchorEl={shareMenuAnchor}
        open={Boolean(shareMenuAnchor)}
        onClose={handleCloseShareMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 3,
          sx: {
            borderRadius: 2.5,
            minWidth: 200,
            mt: 0.5,
            border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
            bgcolor: mode === 'dark' ? '#1e293b' : '#ffffff',
          },
        }}
      >
        <MenuItem onClick={handleShareWhatsApp} sx={{ py: 1.2, px: 2 }}>
          <ListItemIcon sx={{ color: '#25D366', minWidth: 36 }}>
            <WhatsAppIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={<Typography variant="body2" sx={{ fontWeight: 700 }}>{language === 'gu' ? 'WhatsApp દ્વારા શેર કરો' : 'Share via WhatsApp'}</Typography>}
          />
        </MenuItem>
        <MenuItem onClick={handleCopyBillDetails} sx={{ py: 1.2, px: 2 }}>
          <ListItemIcon sx={{ color: '#0284c7', minWidth: 36 }}>
            <CopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={<Typography variant="body2" sx={{ fontWeight: 600 }}>{language === 'gu' ? 'ઇનવોઇસ સમરી કોપી કરો' : 'Copy Invoice Summary'}</Typography>}
          />
        </MenuItem>
        <MenuItem onClick={handleNativeShare} sx={{ py: 1.2, px: 2 }}>
          <ListItemIcon sx={{ color: '#8b5cf6', minWidth: 36 }}>
            <ShareIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={<Typography variant="body2" sx={{ fontWeight: 600 }}>{language === 'gu' ? 'અન્ય એપ્સમાં શેર કરો' : 'Share to Other Apps'}</Typography>}
          />
        </MenuItem>
      </Menu>

      {/* TEXTILE SALES BILLING STATEMENT MODAL (A4 Print & PDF) */}
      <BillingStatementModal
        open={statementModalOpen}
        onClose={() => setStatementModalOpen(false)}
        bills={filteredBills}
        selectedMonth={selectedMonth}
        monthLabel={getMultiMonthLabel ? getMultiMonthLabel(language as 'en' | 'gu') : getMonthLabel(selectedMonth, language as 'en' | 'gu')}
        selectedPartyFilter={partyFilter}
        selectedStatusFilter={statusFilter}
        settings={settings}
        language={language}
      />
    </Box>
  );
};

export default BillingPage;
