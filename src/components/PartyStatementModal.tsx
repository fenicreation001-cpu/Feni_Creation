import React, { useRef, useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  ListSubheader,
} from '@mui/material';
import {
  Print as PrintIcon,
  PictureAsPdf as PdfIcon,
  Close as CloseIcon,
  FileDownload as ExcelIcon,
  ViewAgenda as PagesViewIcon,
  TableRows as TableViewIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  AccountBalanceWallet as WalletIcon,
  CheckCircle as PaidIcon,
  HourglassTop as PendingIcon,
} from '@mui/icons-material';
import { Party, Bill, Purchase, Payment, CompanySettings } from '../types';
import { formatRupees, formatDate, numberToWords } from '../utils/formatters';
import { useThemeContext } from '../context/ThemeContext';
import { useCompany } from '../context/CompanyContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

export interface PartyStatementModalProps {
  open: boolean;
  onClose: () => void;
  parties: Party[];
  bills: Bill[];
  purchases: Purchase[];
  payments: Payment[];
  initialPartyId?: string;
  selectedMonth: string;
  monthLabel: string;
  settings?: CompanySettings;
  language?: 'en' | 'gu';
}

interface LedgerRow {
  srNo: number | '';
  date: string;
  particulars: string;
  refNo: string;
  debit: number; // Invoiced / Billed / Purchased
  credit: number; // Received / Paid
  balance: number;
  status: string;
  type: 'bill' | 'purchase' | 'payment';
}

interface DirectoryRow {
  isSectionHeader?: boolean;
  sectionTitle?: string;
  sectionCount?: number;
  sectionTotal?: number;
  sectionRecvPaid?: number;
  sectionPending?: number;
  isSubtotal?: boolean;
  subtotalLabel?: string;
  isGrandTotal?: boolean;
  category?: 'textile' | 'material' | 'credit-debit';
  srNo: number | string;
  partyName: string;
  partyType: string;
  contactPerson: string;
  mobile: string;
  gstin: string;
  totalAmount: number;
  receivedPaid: number;
  pendingDue: number;
  txCount: number;
  status: string;
  // Dedicated Credit & Debit financial ledger fields
  debitAmount?: number;
  creditAmount?: number;
  netBalance?: number;
  balanceType?: 'Dr' | 'Cr' | 'Nil';
}

export const PartyStatementModal: React.FC<PartyStatementModalProps> = ({
  open,
  onClose,
  parties,
  bills,
  purchases,
  payments,
  initialPartyId,
  selectedMonth,
  monthLabel,
  settings: propSettings,
  language: propLang,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const pdfExportRef = useRef<HTMLDivElement>(null);

  const themeCtx = useThemeContext();
  const { companySettings } = useCompany();
  const settings = propSettings || companySettings;

  const currentMode = themeCtx?.mode || 'light';
  const isDark = currentMode === 'dark';
  const isGu = (propLang || themeCtx?.language || 'en') === 'gu';

  // State
  const [selectedPartyId, setSelectedPartyId] = useState<string>(initialPartyId || 'ALL');
  const [categoryScope, setCategoryScope] = useState<'all' | 'textile' | 'material' | 'credit-debit'>('all');
  const [periodScope, setPeriodScope] = useState<'month' | 'all'>(selectedMonth === 'ALL' ? 'all' : 'month');
  const [viewMode, setViewMode] = useState<'pages' | 'continuous'>('pages');
  const [selectedPreviewPage, setSelectedPreviewPage] = useState<number | 'all'>('all');
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');

  // Sync initial party when opened
  React.useEffect(() => {
    if (open) {
      if (initialPartyId) {
        setSelectedPartyId(initialPartyId);
      }
      if (selectedMonth === 'ALL') {
        setPeriodScope('all');
      } else {
        setPeriodScope('month');
      }
      setSelectedPreviewPage('all');
    }
  }, [open, initialPartyId, selectedMonth]);

  const fontStack =
    "'Noto Sans Gujarati', 'Hind Vadodara', 'Mukta', 'Plus Jakarta Sans', system-ui, -apple-system, Roboto, sans-serif";

  const companyName = settings?.companyName || 'FENI CREATION';
  const companySubtitle =
    settings?.tagline ||
    (isGu ? 'એમ્બ્રોઇડરી અને ટેક્સટાઇલ મેન્યુફેક્ચરિંગ' : 'Embroidery & Textile Manufacturing');
  const gstin = settings?.gstin || '24ABCDE1234F1Z5';
  const phone = settings?.phone || '+91 98765 43210';
  const email = settings?.email || 'fenicreation001@gmail.com';
  const address = settings?.address || 'Plot 102, GIDC Industrial Estate, Surat, Gujarat - 395006';

  const isIndividualParty = selectedPartyId !== 'ALL';
  const currentParty = useMemo(() => {
    return parties.find((p) => p.id === selectedPartyId);
  }, [parties, selectedPartyId]);

  // Active period display label
  const activePeriodLabel = useMemo(() => {
    if (periodScope === 'all') {
      return isGu ? 'તમામ સમયગાળો / લાઈફટાઈમ (All-Time)' : 'All-Time / Lifetime History';
    }
    return monthLabel || (isGu ? 'ચાલુ મહિનો' : 'Selected Month');
  }, [periodScope, monthLabel, isGu]);

  // Date filtering helper
  const isDateMatch = (dateStr?: string) => {
    if (periodScope === 'all') return true;
    if (!dateStr) return false;
    if (selectedMonth === 'ALL') return true;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return true;
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      return `${yr}-${mo}` === selectedMonth;
    } catch {
      return true;
    }
  };

  // 1. Build Ledger Rows for Individual Party
  const { ledgerRows, partyTotals } = useMemo(() => {
    if (!currentParty) {
      return { ledgerRows: [], partyTotals: { debit: 0, credit: 0, balance: 0, count: 0 } };
    }

    const pName = (currentParty.name || '').trim().toLowerCase();
    const isMaterial =
      currentParty.type === 'Material Party' ||
      (currentParty.type as string) === 'Material' ||
      (currentParty.type as string) === 'Supplier' ||
      (currentParty as any).category === 'Material';

    // Transactions array
    type TxItem = {
      date: string;
      particulars: string;
      refNo: string;
      debit: number;
      credit: number;
      type: 'bill' | 'purchase' | 'payment';
      status: string;
      rawDate: string;
    };

    const rawTxs: TxItem[] = [];

    // Relevant Bills
    bills.forEach((b) => {
      const bParty = (b.partyName || '').trim().toLowerCase();
      if (bParty === pName || b.partyId === currentParty.id) {
        const d = b.date || b.createdAt || '';
        if (isDateMatch(d)) {
          const tot = Number(b.totalAmount) || 0;
          const pd = Number(b.paidAmount) || 0;
          const pend = Number(b.pendingAmount) !== undefined ? Number(b.pendingAmount) : Math.max(0, tot - pd);
          const stat = b.status || (pend <= 0 ? 'Paid' : pd > 0 ? 'Partial' : 'Pending');
          const desc = b.notes ? `Tax Invoice (${b.notes})` : `Tax Invoice - Textile Sales`;

          rawTxs.push({
            date: formatDate(d),
            rawDate: d,
            particulars: desc,
            refNo: b.invoiceNo || 'INV-Bill',
            debit: tot,
            credit: pd > 0 ? pd : 0,
            type: 'bill',
            status: stat,
          });
        }
      }
    });

    // Relevant Purchases
    purchases.forEach((p) => {
      const pSupp = (p.supplierName || '').trim().toLowerCase();
      if (pSupp === pName || p.supplierId === currentParty.id) {
        const d = p.date || p.createdAt || '';
        if (isDateMatch(d)) {
          const tot = Number(p.totalAmount) || 0;
          const pd = Number(p.paidAmount) || 0;
          const pend = Number(p.pendingAmount) !== undefined ? Number(p.pendingAmount) : Math.max(0, tot - pd);
          const stat = p.status || (pend <= 0 ? 'Paid' : pd > 0 ? 'Partial' : 'Pending');
          const desc = p.materialName
            ? `Purchase - ${p.materialName}`
            : `Raw Material Purchase`;

          rawTxs.push({
            date: formatDate(d),
            rawDate: d,
            particulars: desc,
            refNo: p.purchaseNo || (p as any).challanNo || 'PUR-Challan',
            debit: tot,
            credit: pd > 0 ? pd : 0,
            type: 'purchase',
            status: stat,
          });
        }
      }
    });

    // Relevant standalone Payments
    payments.forEach((pay) => {
      const payParty = (pay.partyName || '').trim().toLowerCase();
      if (payParty === pName || pay.partyId === currentParty.id) {
        const d = pay.date || (pay as any).createdAt || '';
        if (isDateMatch(d)) {
          const amt = Number(pay.amount) || 0;
          const isReceived = pay.type === 'Received';
          const methodStr = pay.paymentMethod ? ` [${pay.paymentMethod}]` : '';
          const notesStr = pay.notes ? ` - ${pay.notes}` : '';

          rawTxs.push({
            date: formatDate(d),
            rawDate: d,
            particulars: isReceived
              ? `Payment Received${methodStr}${notesStr}`
              : `Payment Made${methodStr}${notesStr}`,
            refNo: (pay as any).referenceNo || (pay as any).receiptNo || (pay as any).chequeNo || 'PAY-RCPT',
            debit: 0,
            credit: amt,
            type: 'payment',
            status: 'Paid',
          });
        }
      }
    });

    // Sort by date ascending
    rawTxs.sort((a, b) => {
      const da = new Date(a.rawDate).getTime();
      const db = new Date(b.rawDate).getTime();
      if (isNaN(da) || isNaN(db)) return 0;
      return da - db;
    });

    // Calculate running balance and totals
    let runningBalance = 0;
    let totDebit = 0;
    let totCredit = 0;

    const rows: LedgerRow[] = rawTxs.map((tx, idx) => {
      totDebit += tx.debit;
      totCredit += tx.credit;
      runningBalance += tx.debit - tx.credit;

      return {
        srNo: idx + 1,
        date: tx.date,
        particulars: tx.particulars,
        refNo: tx.refNo,
        debit: tx.debit,
        credit: tx.credit,
        balance: runningBalance,
        status: tx.status,
        type: tx.type,
      };
    });

    return {
      ledgerRows: rows,
      partyTotals: {
        debit: totDebit,
        credit: totCredit,
        balance: Math.max(0, totDebit - totCredit),
        count: rows.length,
      },
    };
  }, [currentParty, bills, purchases, payments, periodScope, selectedMonth]);

  // 2. Build Directory Rows for All Parties (1st: Textile Customer, 2nd: Material Supplier, 3rd: Credit & Debit)
  const {
    directoryRows,
    textileSectionRows,
    materialSectionRows,
    creditDebitSectionRows,
    dirTotals,
    textileTotals,
    materialTotals,
  } = useMemo(() => {
    if (isIndividualParty) {
      return {
        directoryRows: [],
        textileSectionRows: [],
        materialSectionRows: [],
        creditDebitSectionRows: [],
        dirTotals: { totalAmount: 0, receivedPaid: 0, pending: 0, count: 0 },
        textileTotals: { totalAmount: 0, receivedPaid: 0, pending: 0, count: 0 },
        materialTotals: { totalAmount: 0, receivedPaid: 0, pending: 0, count: 0 },
      };
    }

    const isMaterialParty = (p: Party) => {
      const rawType = (p.type as string) || '';
      return (
        rawType === 'Material Party' ||
        rawType === 'Supplier' ||
        rawType === 'Material' ||
        (p as any).category === 'Material'
      );
    };

    const textileParties = parties.filter((p) => !isMaterialParty(p));
    const materialParties = parties.filter((p) => isMaterialParty(p));

    const calcParty = (p: Party, isMaterial: boolean) => {
      const pName = (p.name || '').trim().toLowerCase();
      let partyTot = 0;
      let partyRec = 0;
      let partyTx = 0;

      if (isMaterial) {
        purchases.forEach((pur) => {
          if (
            ((pur.supplierName || '').trim().toLowerCase() === pName || pur.supplierId === p.id) &&
            isDateMatch(pur.date || pur.createdAt)
          ) {
            partyTot += Number(pur.totalAmount) || 0;
            partyRec += Number(pur.paidAmount) || 0;
            partyTx++;
          }
        });
      } else {
        bills.forEach((b) => {
          if (
            ((b.partyName || '').trim().toLowerCase() === pName || b.partyId === p.id) &&
            isDateMatch(b.date || b.createdAt)
          ) {
            partyTot += Number(b.totalAmount) || 0;
            partyRec += Number(b.paidAmount) || 0;
            partyTx++;
          }
        });
      }

      payments.forEach((pay) => {
        if (
          ((pay.partyName || '').trim().toLowerCase() === pName || pay.partyId === p.id) &&
          isDateMatch(pay.date)
        ) {
          partyRec += Number(pay.amount) || 0;
        }
      });

      // Fallback if no matching transactions in period
      if (partyTot === 0 && periodScope === 'all') {
        partyTot = Number(p.totalAmount) || 0;
        partyRec = Number(p.totalAmount || 0) - Number(p.pendingAmount || 0);
        if (partyRec < 0) partyRec = 0;
      }

      const pending = Math.max(0, partyTot - partyRec);
      const stat =
        pending <= 0 && partyTot > 0
          ? 'Clear'
          : pending > 0 && partyRec > 0
          ? 'Partial'
          : pending > 0
          ? 'Pending'
          : 'Inactive';

      return {
        partyTot,
        partyRec,
        pending,
        partyTx,
        stat,
      };
    };

    // Calculate Textile Customers
    let textTotAmt = 0;
    let textTotRec = 0;
    let textTotPend = 0;

    const textileRowItems: DirectoryRow[] = textileParties.map((p, idx) => {
      const { partyTot, partyRec, pending, partyTx, stat } = calcParty(p, false);
      textTotAmt += partyTot;
      textTotRec += partyRec;
      textTotPend += pending;

      return {
        srNo: idx + 1,
        partyName: p.name || 'Unnamed Customer',
        partyType: isGu ? 'ટેક્સટાઇલ ગ્રાહક' : 'Textile Customer',
        contactPerson: p.contactPerson || '-',
        mobile: p.mobile || '-',
        gstin: p.gstin || 'URP',
        totalAmount: partyTot,
        receivedPaid: partyRec,
        pendingDue: pending,
        txCount: partyTx,
        status: stat,
        category: 'textile',
      };
    });

    // Calculate Material Suppliers
    let matTotAmt = 0;
    let matTotRec = 0;
    let matTotPend = 0;

    const materialRowItems: DirectoryRow[] = materialParties.map((p, idx) => {
      const { partyTot, partyRec, pending, partyTx, stat } = calcParty(p, true);
      matTotAmt += partyTot;
      matTotRec += partyRec;
      matTotPend += pending;

      return {
        srNo: idx + 1,
        partyName: p.name || 'Unnamed Supplier',
        partyType: isGu ? 'મટિરિયલ સપ્લાયર' : 'Material Supplier',
        contactPerson: p.contactPerson || '-',
        mobile: p.mobile || '-',
        gstin: p.gstin || 'URP',
        totalAmount: partyTot,
        receivedPaid: partyRec,
        pendingDue: pending,
        txCount: partyTx,
        status: stat,
        category: 'material',
      };
    });

    const textileSectionRows: DirectoryRow[] = [];
    const materialSectionRows: DirectoryRow[] = [];

    // 1. FIRST: TEXTILE CUSTOMER DATA
    if (categoryScope === 'all' || categoryScope === 'textile') {
      textileSectionRows.push({
        isSectionHeader: true,
        sectionTitle: isGu
          ? '૧. ટેક્સટાઇલ ગ્રાહકો / 1. TEXTILE CUSTOMERS (Sales Accounts)'
          : '1. TEXTILE CUSTOMERS (Sales & Tax Invoices)',
        category: 'textile',
        sectionCount: textileParties.length,
        sectionTotal: textTotAmt,
        sectionRecvPaid: textTotRec,
        sectionPending: textTotPend,
        srNo: '',
        partyName: '',
        partyType: '',
        contactPerson: '',
        mobile: '',
        gstin: '',
        totalAmount: 0,
        receivedPaid: 0,
        pendingDue: 0,
        txCount: 0,
        status: '',
      });

      textileSectionRows.push(...textileRowItems);

      textileSectionRows.push({
        isSubtotal: true,
        subtotalLabel: isGu
          ? `સબટોટલ — ૧. ટેક્સટાઇલ ગ્રાહકો (${textileParties.length} પાર્ટીઓ)`
          : `SUBTOTAL — 1. TEXTILE CUSTOMERS (${textileParties.length} Parties)`,
        category: 'textile',
        srNo: '•',
        partyName: isGu ? 'ટેક્સટાઇલ સબટોટલ' : 'Textile Subtotal',
        partyType: '',
        contactPerson: '',
        mobile: '',
        gstin: '',
        totalAmount: textTotAmt,
        receivedPaid: textTotRec,
        pendingDue: textTotPend,
        txCount: textileParties.length,
        status: textTotPend > 0 ? (isGu ? 'બાકી રકમ' : 'Pending Due') : (isGu ? 'ચૂકતે' : 'Cleared'),
      });
    }

    // 2. SECOND: MATERIAL SUPPLIER DATA
    if (categoryScope === 'all' || categoryScope === 'material') {
      materialSectionRows.push({
        isSectionHeader: true,
        sectionTitle: isGu
          ? '૨. મટિરિયલ સપ્લાયર્સ / 2. MATERIAL SUPPLIERS (Purchase Accounts)'
          : '2. MATERIAL SUPPLIERS (Raw Materials & Purchases)',
        category: 'material',
        sectionCount: materialParties.length,
        sectionTotal: matTotAmt,
        sectionRecvPaid: matTotRec,
        sectionPending: matTotPend,
        srNo: '',
        partyName: '',
        partyType: '',
        contactPerson: '',
        mobile: '',
        gstin: '',
        totalAmount: 0,
        receivedPaid: 0,
        pendingDue: 0,
        txCount: 0,
        status: '',
      });

      materialSectionRows.push(...materialRowItems);

      materialSectionRows.push({
        isSubtotal: true,
        subtotalLabel: isGu
          ? `સબટોટલ — ૨. મટિરિયલ સપ્લાયર્સ (${materialParties.length} સપ્લાયર્સ)`
          : `SUBTOTAL — 2. MATERIAL SUPPLIERS (${materialParties.length} Parties)`,
        category: 'material',
        srNo: '•',
        partyName: isGu ? 'મટિરિયલ સબટોટલ' : 'Material Subtotal',
        partyType: '',
        contactPerson: '',
        mobile: '',
        gstin: '',
        totalAmount: matTotAmt,
        receivedPaid: matTotRec,
        pendingDue: matTotPend,
        txCount: materialParties.length,
        status: matTotPend > 0 ? (isGu ? 'ચૂકવવાપાત્ર' : 'Payable') : (isGu ? 'ચૂકતે' : 'Cleared'),
      });
    }

    // 3. THIRD: CREDIT & DEBIT STATEMENT DATA (Starts on Page 3!)
    const creditDebitSectionRows: DirectoryRow[] = [];
    if (categoryScope === 'all' || categoryScope === 'credit-debit') {
      creditDebitSectionRows.push({
        isSectionHeader: true,
        sectionTitle: isGu
          ? '૩. ક્રેડિટ & ડેબિટ સ્ટેટમેન્ટ / 3. CREDIT & DEBIT ACCOUNT STATEMENT'
          : '3. CREDIT & DEBIT ACCOUNT STATEMENT (Consolidated Ledger & Net Balance)',
        category: 'credit-debit',
        sectionCount: textileParties.length + materialParties.length,
        sectionTotal: textTotAmt + matTotAmt,
        sectionRecvPaid: textTotRec + matTotRec,
        sectionPending: textTotPend + matTotPend,
        srNo: '',
        partyName: '',
        partyType: '',
        contactPerson: '',
        mobile: '',
        gstin: '',
        totalAmount: 0,
        receivedPaid: 0,
        pendingDue: 0,
        txCount: 0,
        status: '',
      });

      // Textile Customers in Credit & Debit
      textileRowItems.forEach((r, idx) => {
        const isDr = r.pendingDue > 0;
        creditDebitSectionRows.push({
          srNo: idx + 1,
          partyName: r.partyName,
          partyType: isGu ? 'ટેક્સટાઇલ ગ્રાહક (Dr)' : 'Textile Customer (Dr)',
          contactPerson: r.contactPerson,
          mobile: r.mobile,
          gstin: r.gstin,
          totalAmount: r.totalAmount,
          receivedPaid: r.receivedPaid,
          pendingDue: r.pendingDue,
          debitAmount: r.totalAmount,
          creditAmount: r.receivedPaid,
          netBalance: r.pendingDue,
          balanceType: isDr ? 'Dr' : 'Nil',
          txCount: r.txCount,
          status: isDr ? (isGu ? 'Dr લેવાના' : 'Dr Receivable') : (isGu ? 'ચૂકતે (Nil)' : 'Cleared'),
          category: 'credit-debit',
        });
      });

      // Textile Subtotal in Credit/Debit
      creditDebitSectionRows.push({
        isSubtotal: true,
        subtotalLabel: isGu
          ? `સબટોટલ — ૧. ટેક્સટાઇલ ડેબિટ એકાઉન્ટ્સ (${textileParties.length} પાર્ટીઓ)`
          : `SUBTOTAL — 1. TEXTILE DEBIT ACCOUNTS (${textileParties.length} Parties)`,
        category: 'credit-debit',
        srNo: '•',
        partyName: isGu ? 'ટેક્સટાઇલ ડેબિટ સબટોટલ' : 'Textile Debit Subtotal',
        partyType: '',
        contactPerson: '',
        mobile: '',
        gstin: '',
        totalAmount: textTotAmt,
        receivedPaid: textTotRec,
        pendingDue: textTotPend,
        debitAmount: textTotAmt,
        creditAmount: textTotRec,
        netBalance: textTotPend,
        balanceType: textTotPend > 0 ? 'Dr' : 'Nil',
        txCount: textileParties.length,
        status: textTotPend > 0 ? (isGu ? 'Dr લેવાના' : 'Dr Receivable') : (isGu ? 'ચૂકતે' : 'Cleared'),
      });

      // Material Suppliers in Credit & Debit
      materialRowItems.forEach((r, idx) => {
        const isCr = r.pendingDue > 0;
        creditDebitSectionRows.push({
          srNo: textileRowItems.length + idx + 1,
          partyName: r.partyName,
          partyType: isGu ? 'મટિરિયલ સપ્લાયર (Cr)' : 'Material Supplier (Cr)',
          contactPerson: r.contactPerson,
          mobile: r.mobile,
          gstin: r.gstin,
          totalAmount: r.totalAmount,
          receivedPaid: r.receivedPaid,
          pendingDue: r.pendingDue,
          debitAmount: r.receivedPaid,
          creditAmount: r.totalAmount,
          netBalance: r.pendingDue,
          balanceType: isCr ? 'Cr' : 'Nil',
          txCount: r.txCount,
          status: isCr ? (isGu ? 'Cr આપવાના' : 'Cr Payable') : (isGu ? 'ચૂકતે (Nil)' : 'Cleared'),
          category: 'credit-debit',
        });
      });

      // Material Subtotal in Credit/Debit
      creditDebitSectionRows.push({
        isSubtotal: true,
        subtotalLabel: isGu
          ? `સબટોટલ — ૨. મટિરિયલ ક્રેડિટ એકાઉન્ટ્સ (${materialParties.length} સપ્લાયર્સ)`
          : `SUBTOTAL — 2. MATERIAL CREDIT ACCOUNTS (${materialParties.length} Parties)`,
        category: 'credit-debit',
        srNo: '•',
        partyName: isGu ? 'મટિરિયલ ક્રેડિટ સબટોટલ' : 'Material Credit Subtotal',
        partyType: '',
        contactPerson: '',
        mobile: '',
        gstin: '',
        totalAmount: matTotAmt,
        receivedPaid: matTotRec,
        pendingDue: matTotPend,
        debitAmount: matTotRec,
        creditAmount: matTotAmt,
        netBalance: matTotPend,
        balanceType: matTotPend > 0 ? 'Cr' : 'Nil',
        txCount: materialParties.length,
        status: matTotPend > 0 ? (isGu ? 'Cr આપવાના' : 'Cr Payable') : (isGu ? 'ચૂકતે' : 'Cleared'),
      });

      // Grand Total Row in Credit/Debit
      const netPosition = textTotPend - matTotPend;
      creditDebitSectionRows.push({
        isGrandTotal: true,
        subtotalLabel: isGu
          ? 'ગ્રાન્ડ ટોટલ — સમગ્ર ક્રેડિટ & ડેબિટ સરવૈયું (Net Position)'
          : 'GRAND TOTAL — CONSOLIDATED CREDIT & DEBIT (Net Position)',
        category: 'credit-debit',
        srNo: '★',
        partyName: isGu ? 'નેટ બેલેન્સ સરવૈયું' : 'Net Settlement Balance',
        partyType: '',
        contactPerson: '',
        mobile: '',
        gstin: '',
        totalAmount: textTotAmt + matTotAmt,
        receivedPaid: textTotRec + matTotRec,
        pendingDue: Math.abs(netPosition),
        debitAmount: textTotAmt + matTotRec,
        creditAmount: matTotAmt + textTotRec,
        netBalance: Math.abs(netPosition),
        balanceType: netPosition > 0 ? 'Dr' : netPosition < 0 ? 'Cr' : 'Nil',
        txCount: textileParties.length + materialParties.length,
        status:
          netPosition > 0
            ? (isGu ? 'Net Dr લેવાના' : 'Net Dr Receivable')
            : netPosition < 0
            ? (isGu ? 'Net Cr ચૂકવવાના' : 'Net Cr Payable')
            : (isGu ? 'સરભર Nil' : 'Balanced Nil'),
      });
    }

    const combinedRows: DirectoryRow[] = [
      ...textileSectionRows,
      ...materialSectionRows,
      ...creditDebitSectionRows,
    ];

    return {
      directoryRows: combinedRows,
      textileSectionRows,
      materialSectionRows,
      creditDebitSectionRows,
      dirTotals: {
        totalAmount: textTotAmt + matTotAmt,
        receivedPaid: textTotRec + matTotRec,
        pending: textTotPend + matTotPend,
        count: textileParties.length + materialParties.length,
      },
      textileTotals: {
        totalAmount: textTotAmt,
        receivedPaid: textTotRec,
        pending: textTotPend,
        count: textileParties.length,
      },
      materialTotals: {
        totalAmount: matTotAmt,
        receivedPaid: matTotRec,
        pending: matTotPend,
        count: materialParties.length,
      },
    };
  }, [parties, bills, purchases, payments, isIndividualParty, periodScope, selectedMonth, isGu, categoryScope]);

  // Dynamic pagination calculation for A4 Landscape
  // Ensures:
  // Page 1: Textile Customers
  // Page 2: Material Suppliers (starts on fresh page)
  // Page 3: Credit & Debit Statement (starts on fresh page)
  const pagedRows = useMemo(() => {
    if (isIndividualParty) {
      const rawList = ledgerRows;
      const total = rawList.length;
      if (total === 0) return [[]];

      const MAX_P1 = 14;
      const MAX_OTHER = 16;

      const pages: (LedgerRow[])[] = [];
      if (total <= MAX_P1) {
        pages.push(rawList);
      } else {
        pages.push(rawList.slice(0, MAX_P1));
        let current = MAX_P1;
        while (current < total) {
          pages.push(rawList.slice(current, current + MAX_OTHER));
          current += MAX_OTHER;
        }
      }
      return pages;
    }

    // DIRECTORY STATEMENT PAGINATION:
    // When categoryScope is 'all':
    // Page 1: Textile Customers
    // Page 2: Material Suppliers
    // Page 3: Credit & Debit Statement
    const pages: (DirectoryRow[])[] = [];

    if (categoryScope === 'all') {
      const MAX_P1 = 14;
      const MAX_OTHER = 16;

      // 1. Textile Customers Section (Starts on Page 1)
      if (textileSectionRows.length > 0) {
        if (textileSectionRows.length <= MAX_P1) {
          pages.push(textileSectionRows);
        } else {
          pages.push(textileSectionRows.slice(0, MAX_P1));
          let curr = MAX_P1;
          while (curr < textileSectionRows.length) {
            pages.push(textileSectionRows.slice(curr, curr + MAX_OTHER));
            curr += MAX_OTHER;
          }
        }
      }

      // 2. Material Suppliers Section ALWAYS starts on a fresh page (Page 2 / Second Page!)
      if (materialSectionRows.length > 0) {
        if (materialSectionRows.length <= MAX_OTHER) {
          pages.push(materialSectionRows);
        } else {
          let curr = 0;
          while (curr < materialSectionRows.length) {
            pages.push(materialSectionRows.slice(curr, curr + MAX_OTHER));
            curr += MAX_OTHER;
          }
        }
      }

      // 3. Credit & Debit Section ALWAYS starts on a fresh page (Page 3 / Third Page!)
      if (creditDebitSectionRows.length > 0) {
        if (creditDebitSectionRows.length <= MAX_OTHER) {
          pages.push(creditDebitSectionRows);
        } else {
          let curr = 0;
          while (curr < creditDebitSectionRows.length) {
            pages.push(creditDebitSectionRows.slice(curr, curr + MAX_OTHER));
            curr += MAX_OTHER;
          }
        }
      }

      return pages.length > 0 ? pages : [[]];
    } else if (categoryScope === 'credit-debit') {
      // Dedicated Credit & Debit View
      const total = creditDebitSectionRows.length;
      if (total === 0) return [[]];

      const MAX_P1 = 14;
      const MAX_OTHER = 16;

      if (total <= MAX_P1) {
        pages.push(creditDebitSectionRows);
      } else {
        pages.push(creditDebitSectionRows.slice(0, MAX_P1));
        let curr = MAX_P1;
        while (curr < total) {
          pages.push(creditDebitSectionRows.slice(curr, curr + MAX_OTHER));
          curr += MAX_OTHER;
        }
      }
      return pages;
    } else {
      // Single category view ('textile' only or 'material' only)
      const targetRows = categoryScope === 'textile' ? textileSectionRows : materialSectionRows;
      const total = targetRows.length;
      if (total === 0) return [[]];

      const MAX_P1 = 14;
      const MAX_OTHER = 16;

      if (total <= MAX_P1) {
        pages.push(targetRows);
      } else {
        pages.push(targetRows.slice(0, MAX_P1));
        let curr = MAX_P1;
        while (curr < total) {
          pages.push(targetRows.slice(curr, curr + MAX_OTHER));
          curr += MAX_OTHER;
        }
      }
      return pages;
    }
  }, [
    isIndividualParty,
    ledgerRows,
    directoryRows,
    textileSectionRows,
    materialSectionRows,
    creditDebitSectionRows,
    categoryScope,
  ]);

  const totalPagesCount = pagedRows.length;

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // PDF Export using html2canvas & jsPDF A4 landscape
  const handleDownloadPdf = async () => {
    if (!pdfExportRef.current || downloading) return;
    setDownloading(true);
    setDownloadProgress(isGu ? 'A4 સ્ટેટમેન્ટ PDF તૈયાર થઈ રહ્યું છે...' : 'Preparing A4 PDF Statement...');

    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));

      const container = pdfExportRef.current;
      const pageElements = container.querySelectorAll<HTMLElement>('.pdf-page-block');
      if (!pageElements || pageElements.length === 0) {
        throw new Error('No PDF pages found to export');
      }

      const partySafeName = isIndividualParty && currentParty
        ? currentParty.name.replace(/[^a-zA-Z0-9]/g, '_')
        : 'All_Parties_Directory';
      const cleanMonth = activePeriodLabel.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Party_Statement_${partySafeName}_${cleanMonth}.pdf`;

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const totalP = pageElements.length;

      for (let i = 0; i < totalP; i++) {
        setDownloadProgress(
          isGu
            ? `પેજ ${i + 1} / ${totalP} રેન્ડર થઈ રહ્યું છે...`
            : `Rendering Page ${i + 1} of ${totalP}...`
        );

        const pageEl = pageElements[i];

        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 1123,
          scrollX: 0,
          scrollY: 0,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.98);

        if (i > 0) {
          doc.addPage('a4', 'landscape');
        }

        doc.addImage(imgData, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
      }

      doc.save(filename);
    } catch (err) {
      console.error('Error generating A4 PDF Statement:', err);
    } finally {
      setDownloading(false);
      setDownloadProgress('');
    }
  };

  // Excel Export
  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();

    if (isIndividualParty && currentParty) {
      const data = ledgerRows.map((r) => ({
        'Sr No': r.srNo,
        'Date': r.date,
        'Particulars': r.particulars,
        'Ref / Invoice No': r.refNo,
        'Debit / Billed (₹)': r.debit,
        'Credit / Paid (₹)': r.credit,
        'Balance (₹)': r.balance,
        'Status': r.status,
      }));

      // Add summary row
      data.push({
        'Sr No': '' as any,
        'Date': '',
        'Particulars': 'TOTAL',
        'Ref / Invoice No': '',
        'Debit / Billed (₹)': partyTotals.debit,
        'Credit / Paid (₹)': partyTotals.credit,
        'Balance (₹)': partyTotals.balance,
        'Status': partyTotals.balance > 0 ? 'Pending Due' : 'Cleared',
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Party Ledger');
      const filename = `Ledger_${currentParty.name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
      XLSX.writeFile(workbook, filename);
    } else {
      const exportList: any[] = [];
      directoryRows.forEach((r) => {
        if (r.isSectionHeader) {
          exportList.push({
            'Section / Category': r.sectionTitle,
            'Sr No': '',
            'Party Name': '',
            'Type': '',
            'Contact Person': '',
            'Mobile': '',
            'GSTIN': '',
            'Total Amount (₹)': '' as any,
            'Received / Paid (₹)': '' as any,
            'Pending Due (₹)': '' as any,
            'Status': '',
          });
        } else if (r.isSubtotal) {
          exportList.push({
            'Section / Category': '',
            'Sr No': '',
            'Party Name': r.subtotalLabel,
            'Type': 'SUBTOTAL',
            'Contact Person': '',
            'Mobile': '',
            'GSTIN': '',
            'Total Amount (₹)': r.totalAmount,
            'Received / Paid (₹)': r.receivedPaid,
            'Pending Due (₹)': r.pendingDue,
            'Status': r.status,
          });
        } else {
          exportList.push({
            'Section / Category':
              r.category === 'textile'
                ? '1. Textile Customer'
                : r.category === 'material'
                ? '2. Material Supplier'
                : '3. Credit & Debit',
            'Sr No': r.srNo,
            'Party Name': r.partyName,
            'Type': r.partyType,
            'Contact Person': r.contactPerson,
            'Mobile': r.mobile,
            'GSTIN': r.gstin,
            'Total Amount (₹)': r.totalAmount,
            'Debit / Dr (₹)': r.debitAmount !== undefined ? r.debitAmount : (r.category === 'textile' ? r.totalAmount : r.receivedPaid),
            'Credit / Cr (₹)': r.creditAmount !== undefined ? r.creditAmount : (r.category === 'material' ? r.totalAmount : r.receivedPaid),
            'Net Balance (₹)': r.netBalance !== undefined ? r.netBalance : r.pendingDue,
            'Status': r.status,
          });
        }
      });

      // Add summary row
      exportList.push({
        'Section / Category': '',
        'Sr No': '',
        'Party Name': 'GRAND TOTAL',
        'Type': '',
        'Contact Person': '',
        'Mobile': '',
        'GSTIN': '',
        'Total Amount (₹)': dirTotals.totalAmount,
        'Debit / Dr (₹)': textileTotals?.totalAmount || 0,
        'Credit / Cr (₹)': materialTotals?.totalAmount || 0,
        'Net Balance (₹)': dirTotals.pending,
        'Status': dirTotals.pending > 0 ? 'Pending Balance' : 'Cleared',
      });

      const worksheet = XLSX.utils.json_to_sheet(exportList);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Parties Statement');
      XLSX.writeFile(workbook, `Parties_Directory_Statement_${activePeriodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
    }
  };

  // Reusable Company & Statement Header with Section Awareness
  const renderHeader = (
    isFirstPage: boolean,
    pageNum: number,
    pageSection: 'textile' | 'material' | 'credit-debit' | 'all' = 'all'
  ) => {
    // If it's the first page OR section start page in 'all' view (Page 2: Material, Page 3: Credit/Debit), render full letterhead!
    const isSectionStartPage =
      isFirstPage ||
      (categoryScope === 'all' && (
        (pageSection === 'material' && pageNum === 2) ||
        (pageSection === 'credit-debit' && pageNum === 3)
      ));

    return isSectionStartPage ? (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingBottom: '10px',
          marginBottom: '10px',
          borderBottom: '2px solid #0f172a',
        }}
      >
        {/* Left: Prestigious Company Letterhead */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          {settings?.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt="Logo"
              crossOrigin="anonymous"
              style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'contain', border: '1px solid #e2e8f0' }}
            />
          ) : (
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '17px',
                letterSpacing: '0.5px',
                flexShrink: 0,
              }}
            >
              {companyName ? companyName.substring(0, 2).toUpperCase() : 'FC'}
            </div>
          )}
          <div>
            <h1
              style={{
                margin: 0,
                fontWeight: 900,
                color: '#0f172a',
                fontSize: '21px',
                letterSpacing: '-0.3px',
                lineHeight: '1.2',
              }}
            >
              {companyName}
            </h1>
            <div style={{ fontWeight: 600, color: '#475569', fontSize: '10.5px', marginTop: '2px', lineHeight: '1.3' }}>
              {companySubtitle}
            </div>
            <div style={{ color: '#1e293b', fontSize: '9.5px', fontWeight: 600, marginTop: '2px', lineHeight: '1.3' }}>
              <span>GSTIN: <strong style={{ color: '#0f172a' }}>{gstin}</strong></span>
              <span style={{ margin: '0 6px', color: '#cbd5e1' }}>|</span>
              <span>{isGu ? 'મોબાઇલ' : 'Mobile'}: <strong style={{ color: '#0f172a' }}>{phone}</strong></span>
              <span style={{ margin: '0 6px', color: '#cbd5e1' }}>|</span>
              <span>Email: <strong>{email}</strong></span>
            </div>
            <div style={{ color: '#64748b', fontSize: '9.5px', marginTop: '2px', lineHeight: '1.3' }}>
              {address}
            </div>
          </div>
        </div>

        {/* Right: Statement Document Meta Box */}
        <div
          style={{
            textAlign: 'right',
            flexShrink: 0,
            backgroundColor: '#f8fafc',
            border: '1.5px solid #cbd5e1',
            borderRadius: '6px',
            padding: '8px 14px',
            minWidth: '255px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 900,
              color: '#0f172a',
              letterSpacing: '0.4px',
              textTransform: 'uppercase',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '4px',
              marginBottom: '4px',
            }}
          >
            {isIndividualParty
              ? isGu ? 'પાર્ટી ખાતાવહી સ્ટેટમેન્ટ' : 'PARTY ACCOUNT STATEMENT'
              : categoryScope === 'all'
              ? pageSection === 'textile'
                ? isGu ? 'સ્ટેટમેન્ટ - ભાગ ૧: ટેક્સટાઇલ ગ્રાહકો' : 'STATEMENT — PART 1: TEXTILE CUSTOMERS'
                : pageSection === 'material'
                ? isGu ? 'સ્ટેટમેન્ટ - ભાગ ૨: મટિરિયલ સપ્લાયર્સ' : 'STATEMENT — PART 2: MATERIAL SUPPLIERS'
                : isGu ? 'સ્ટેટમેન્ટ - ભાગ ૩: ક્રેડિટ & ડેબિટ સ્ટેટમેન્ટ' : 'STATEMENT — PART 3: CREDIT & DEBIT'
              : categoryScope === 'textile'
              ? isGu ? 'ટેક્સટાઇલ ગ્રાહકો સ્ટેટમેન્ટ' : 'TEXTILE CUSTOMERS STATEMENT'
              : categoryScope === 'material'
              ? isGu ? 'મટિરિયલ સપ્લાયર્સ સ્ટેટમેન્ટ' : 'MATERIAL SUPPLIERS STATEMENT'
              : isGu ? 'ક્રેડિટ & ડેબિટ ખાતાવહી સ્ટેટમેન્ટ' : 'CREDIT & DEBIT ACCOUNT STATEMENT'}
          </div>
          <div style={{ fontSize: '9.5px', color: '#334155', fontWeight: 600, lineHeight: '1.4' }}>
            <span style={{ color: '#64748b' }}>{isGu ? 'વિભાગ / ખાતું:' : 'Section / Scope:'}</span>{' '}
            <strong
              style={{
                color:
                  pageSection === 'credit-debit'
                    ? '#047857'
                    : pageSection === 'material'
                    ? '#b45309'
                    : '#1e3a8a',
              }}
            >
              {isIndividualParty
                ? currentParty?.name
                : categoryScope === 'all'
                ? pageSection === 'textile'
                  ? (isGu ? '૧. ટેક્સટાઇલ ગ્રાહકો (વેચાણ)' : '1. Textile Customers (Sales)')
                  : pageSection === 'material'
                  ? (isGu ? '૨. મટિરિયલ સપ્લાયર્સ (ખરીદી)' : '2. Material Suppliers (Purchases)')
                  : (isGu ? '૩. ક્રેડિટ અને ડેબિટ સરવૈયું (Net Position)' : '3. Credit & Debit Summary (Net Position)')
                : categoryScope === 'textile'
                ? (isGu ? 'ટેક્સટાઇલ ગ્રાહકો' : 'Textile Customers')
                : categoryScope === 'material'
                ? (isGu ? 'મટિરિયલ સપ્લાયર્સ' : 'Material Suppliers')
                : (isGu ? 'ક્રેડિટ & ડેબિટ સ્ટેટમેન્ટ' : 'Credit & Debit Statement')}
            </strong>
          </div>
          <div style={{ fontSize: '9.5px', color: '#334155', fontWeight: 600, lineHeight: '1.4' }}>
            <span style={{ color: '#64748b' }}>{isGu ? 'સમયગાળો:' : 'Period:'}</span>{' '}
            <strong style={{ color: '#0f172a' }}>{activePeriodLabel}</strong>
          </div>
          <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, lineHeight: '1.4' }}>
            <span>{isGu ? 'તારીખ:' : 'Date:'} {formatDate(new Date().toISOString())}</span>
            <span style={{ margin: '0 5px', color: '#cbd5e1' }}>|</span>
            <span style={{ color: '#0f172a', fontWeight: 800 }}>
              {isGu ? `પેજ ${pageNum} / ${totalPagesCount}` : `Page ${pageNum} of ${totalPagesCount}`}
            </span>
          </div>
        </div>
      </div>
    ) : (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '6px',
          marginBottom: '8px',
          borderBottom: '1.5px solid #0f172a',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '12.5px' }}>{companyName}</span>
          <span style={{ color: '#94a3b8' }}>•</span>
          <span style={{ color: '#334155', fontSize: '11px', fontWeight: 800 }}>
            {isIndividualParty
              ? isGu ? `ખાતાવહી - ${currentParty?.name || ''} (ચાલુ)` : `Party Ledger - ${currentParty?.name || ''} (Contd.)`
              : pageSection === 'credit-debit'
              ? isGu ? 'ભાગ ૩: ક્રેડિટ & ડેબિટ ખાતાવહી (ચાલુ)' : 'Part 3: Credit & Debit Statement (Contd.)'
              : pageSection === 'material'
              ? isGu ? 'ભાગ ૨: મટિરિયલ સપ્લાયર્સ (ચાલુ)' : 'Part 2: Material Suppliers (Contd.)'
              : isGu ? 'ભાગ ૧: ટેક્સટાઇલ ગ્રાહકો (ચાલુ)' : 'Part 1: Textile Customers (Contd.)'}
          </span>
          <span style={{ color: '#94a3b8' }}>•</span>
          <span style={{ color: '#64748b', fontSize: '10.5px', fontWeight: 600 }}>{activePeriodLabel}</span>
        </div>
        <div style={{ fontSize: '10px', color: '#475569', fontWeight: 800 }}>
          {isGu ? `પેજ ${pageNum} / ${totalPagesCount}` : `Page ${pageNum} of ${totalPagesCount}`}
        </div>
      </div>
    );
  };

  // Reusable Party Info Card (for individual party)
  const renderPartyInfoCard = () => {
    if (!isIndividualParty || !currentParty) return null;

    const isMaterial =
      currentParty.type === 'Material Party' ||
      (currentParty.type as string) === 'Material' ||
      (currentParty.type as string) === 'Supplier' ||
      (currentParty as any).category === 'Material';

    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          padding: '8px 14px',
          marginBottom: '10px',
        }}
      >
        <div>
          <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{currentParty.name}</span>
            <span
              style={{
                fontSize: '9.5px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: isMaterial ? '#fef3c7' : '#e0e7ff',
                color: isMaterial ? '#92400e' : '#3730a3',
                border: `1px solid ${isMaterial ? '#fde68a' : '#c7d2fe'}`,
              }}
            >
              {isMaterial ? (isGu ? 'મટિરિયલ સપ્લાયર' : 'Material Supplier') : (isGu ? 'ટેક્સટાઇલ પાર્ટી' : 'Textile Customer')}
            </span>
          </div>
          <div style={{ fontSize: '10px', color: '#475569', marginTop: '3px' }}>
            <span>{isGu ? 'સંપર્ક વ્યક્તિ:' : 'Contact:'} <strong style={{ color: '#0f172a' }}>{currentParty.contactPerson || '-'}</strong></span>
            <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
            <span>{isGu ? 'મોબાઇલ:' : 'Mobile:'} <strong style={{ color: '#0f172a' }}>{currentParty.mobile || '-'}</strong></span>
            <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
            <span>GSTIN: <strong style={{ color: '#0f172a' }}>{currentParty.gstin || 'URP (Unregistered)'}</strong></span>
          </div>
          {currentParty.address && (
            <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '2px' }}>
              {isGu ? 'સરનામું:' : 'Address:'} {currentParty.address}
            </div>
          )}
        </div>

        {/* Right Balance Block */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            {isGu ? 'ચાલુ ચોખ્ખી બાકી રકમ' : 'NET OUTSTANDING BALANCE'}
          </div>
          <div
            style={{
              fontSize: '17px',
              fontWeight: 900,
              color: partyTotals.balance > 0 ? '#dc2626' : '#15803d',
              fontFamily: 'monospace',
            }}
          >
            {formatRupees(partyTotals.balance)}
          </div>
          <div style={{ fontSize: '9.5px', fontWeight: 700, color: partyTotals.balance > 0 ? '#dc2626' : '#15803d' }}>
            {partyTotals.balance > 0 ? (isGu ? 'બાકી રકમ (Due)' : 'Outstanding Due') : (isGu ? 'સંપૂર્ણ ક્લિયર (Nil)' : 'Cleared / Nil')}
          </div>
        </div>
      </div>
    );
  };

  // Reusable Summary Metric Chips Bar with Section Awareness
  const renderSummaryCards = (
    pageSection: 'textile' | 'material' | 'credit-debit' | 'all' = 'all'
  ) => {
    if (isIndividualParty) {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '10px' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderTop: '3px solid #0f172a', borderRadius: '6px', padding: '7px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              {isGu ? 'કુલ વ્યવહારો' : 'TOTAL TRANSACTIONS'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginTop: '2px', fontFamily: 'monospace' }}>
              {partyTotals.count} {isGu ? 'એન્ટ્રી' : 'Entries'}
            </div>
            <div style={{ fontSize: '8.5px', color: '#64748b', marginTop: '1px' }}>
              {isGu ? 'ખાતાવહી વ્યવહાર' : 'Ledger Records'}
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderTop: '3px solid #1e3a8a', borderRadius: '6px', padding: '7px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              {isGu ? 'કુલ બિલિંગ / ડેબિટ' : 'TOTAL BILLED / DEBIT'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginTop: '2px', fontFamily: 'monospace' }}>
              {formatRupees(partyTotals.debit)}
            </div>
            <div style={{ fontSize: '8.5px', color: '#1e3a8a', fontWeight: 600, marginTop: '1px' }}>
              {isGu ? 'વેચાણ / બિલ રકમ' : 'Gross Billed Amount'}
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderTop: '3px solid #15803d', borderRadius: '6px', padding: '7px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              {isGu ? 'કુલ જમા / ક્રેડિટ' : 'TOTAL RECEIVED / CREDIT'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#15803d', marginTop: '2px', fontFamily: 'monospace' }}>
              {formatRupees(partyTotals.credit)}
            </div>
            <div style={{ fontSize: '8.5px', color: '#15803d', fontWeight: 600, marginTop: '1px' }}>
              {isGu ? 'જમા થયેલ રકમ' : 'Settled / Paid Amount'}
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderTop: '3px solid #dc2626', borderRadius: '6px', padding: '7px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              {isGu ? 'ચોખ્ખી બાકી રકમ' : 'PENDING BALANCE DUE'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: partyTotals.balance > 0 ? '#dc2626' : '#15803d', marginTop: '2px', fontFamily: 'monospace' }}>
              {formatRupees(partyTotals.balance)}
            </div>
            <div style={{ fontSize: '8.5px', fontWeight: 700, color: partyTotals.balance > 0 ? '#dc2626' : '#15803d', marginTop: '1px' }}>
              {partyTotals.balance > 0 ? (isGu ? 'ચૂકવણી બાકી (Due)' : 'Outstanding Due') : (isGu ? 'સંપૂર્ણ ક્લિયર (Nil)' : 'Cleared / Nil')}
            </div>
          </div>
        </div>
      );
    }

    // 1. DEDICATED CARDS FOR PAGE 1: TEXTILE CUSTOMERS
    if (pageSection === 'textile') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '10px' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderTop: '3px solid #1e3a8a', borderRadius: '6px', padding: '7px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {isGu ? '૧. ટેક્સટાઇલ કુલ વેચાણ' : '1. TEXTILE TOTAL SALES'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginTop: '2px', fontFamily: 'monospace' }}>
              {formatRupees(textileTotals?.totalAmount || 0)}
            </div>
            <div style={{ fontSize: '8.5px', color: '#64748b', fontWeight: 600, marginTop: '1px' }}>
              {textileTotals?.count || 0} {isGu ? 'ગ્રાહક પક્ષકારો' : 'Customer Accounts'}
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderTop: '3px solid #15803d', borderRadius: '6px', padding: '7px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {isGu ? 'જમા રકમ (વસૂલાત)' : 'COLLECTED / RECEIVED'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#15803d', marginTop: '2px', fontFamily: 'monospace' }}>
              {formatRupees(textileTotals?.receivedPaid || 0)}
            </div>
            <div style={{ fontSize: '8.5px', color: '#15803d', fontWeight: 600, marginTop: '1px' }}>
              {isGu ? 'ગ્રાહકો પાસેથી જમા' : 'Customer Payments Received'}
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderTop: '3px solid #dc2626', borderRadius: '6px', padding: '7px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {isGu ? 'ટેક્સટાઇલ બાકી રકમ (લેવાની)' : 'PENDING RECEIVABLE'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: (textileTotals?.pending || 0) > 0 ? '#dc2626' : '#15803d', marginTop: '2px', fontFamily: 'monospace' }}>
              {formatRupees(textileTotals?.pending || 0)}
            </div>
            <div style={{ fontSize: '8.5px', color: '#b91c1c', fontWeight: 700, marginTop: '1px' }}>
              {(textileTotals?.pending || 0) > 0 ? (isGu ? 'ગ્રાહકો પાસેથી લેવાના' : 'Outstanding To Collect') : (isGu ? 'સંપૂર્ણ ક્લિયર' : 'All Cleared')}
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderTop: '3px solid #0f172a', borderRadius: '6px', padding: '7px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {isGu ? 'એક્ટિવ ટેક્સટાઇલ પાર્ટી' : 'ACTIVE TEXTILE PARTIES'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginTop: '2px', fontFamily: 'monospace' }}>
              {textileTotals?.count || 0} {isGu ? 'પાર્ટીઓ' : 'Parties'}
            </div>
            <div style={{ fontSize: '8.5px', color: '#64748b', fontWeight: 600, marginTop: '1px' }}>
              {isGu ? 'કાપડ અને જોબવર્ક ગ્રાહકો' : 'Fabric & Job Work Clients'}
            </div>
          </div>
        </div>
      );
    }

    // 2. DEDICATED CARDS FOR PAGE 2: MATERIAL SUPPLIERS
    if (pageSection === 'material') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '10px' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderTop: '3px solid #b45309', borderRadius: '6px', padding: '7px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {isGu ? '૨. મટિરિયલ કુલ ખરીદી' : '2. MATERIAL TOTAL PURCHASES'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginTop: '2px', fontFamily: 'monospace' }}>
              {formatRupees(materialTotals?.totalAmount || 0)}
            </div>
            <div style={{ fontSize: '8.5px', color: '#64748b', fontWeight: 600, marginTop: '1px' }}>
              {materialTotals?.count || 0} {isGu ? 'સપ્લાયર્સ વેન્ડર' : 'Vendor Accounts'}
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderTop: '3px solid #15803d', borderRadius: '6px', padding: '7px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {isGu ? 'ચૂકવેલ રકમ (પેમેન્ટ)' : 'PAID / DISBURSED'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#15803d', marginTop: '2px', fontFamily: 'monospace' }}>
              {formatRupees(materialTotals?.receivedPaid || 0)}
            </div>
            <div style={{ fontSize: '8.5px', color: '#15803d', fontWeight: 600, marginTop: '1px' }}>
              {isGu ? 'સપ્લાયર્સને ચૂકવેલ' : 'Supplier Invoices Paid'}
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderTop: '3px solid #b45309', borderRadius: '6px', padding: '7px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {isGu ? 'મટિરિયલ બાકી રકમ (દેવાની)' : 'PENDING PAYABLE'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: (materialTotals?.pending || 0) > 0 ? '#b45309' : '#15803d', marginTop: '2px', fontFamily: 'monospace' }}>
              {formatRupees(materialTotals?.pending || 0)}
            </div>
            <div style={{ fontSize: '8.5px', color: '#b45309', fontWeight: 700, marginTop: '1px' }}>
              {(materialTotals?.pending || 0) > 0 ? (isGu ? 'સપ્લાયર્સને ચૂકવવાપાત્ર' : 'Payable To Suppliers') : (isGu ? 'સંપૂર્ણ ક્લિયર' : 'All Cleared')}
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderTop: '3px solid #0f172a', borderRadius: '6px', padding: '7px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {isGu ? 'એક્ટિવ સપ્લાયર્સ' : 'ACTIVE VENDORS'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginTop: '2px', fontFamily: 'monospace' }}>
              {materialTotals?.count || 0} {isGu ? 'સપ્લાયર્સ' : 'Suppliers'}
            </div>
            <div style={{ fontSize: '8.5px', color: '#64748b', fontWeight: 600, marginTop: '1px' }}>
              {isGu ? 'યાર્ન, થ્રેડ અને કાચો માલ' : 'Yarn, Thread & Material'}
            </div>
          </div>
        </div>
      );
    }

    // 3. DEDICATED CARDS FOR PAGE 3: CREDIT & DEBIT CONSOLIDATED STATEMENT
    if (pageSection === 'credit-debit') {
      const netDiff = (textileTotals?.pending || 0) - (materialTotals?.pending || 0);
      const isNetDr = netDiff >= 0;

      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '10px' }}>
          {/* Card 1: Total Business Debit (Customer Sales / Receivables) */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderTop: '3px solid #1e3a8a', borderRadius: '6px', padding: '7px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {isGu ? '૩.૧ કુલ ડેબિટ (ઉધાર - Dr)' : '3.1 TOTAL DEBIT (Dr)'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginTop: '2px', fontFamily: 'monospace' }}>
              {formatRupees(textileTotals?.totalAmount || 0)}
            </div>
            <div style={{ fontSize: '8.5px', color: '#64748b', fontWeight: 600, marginTop: '1px' }}>
              {isGu ? 'લેવાની બાકી: ' : 'Pending Due: '}
              <strong style={{ color: '#dc2626' }}>{formatRupees(textileTotals?.pending || 0)}</strong>
            </div>
          </div>

          {/* Card 2: Total Business Credit (Material Purchases / Payables) */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderTop: '3px solid #b45309', borderRadius: '6px', padding: '7px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {isGu ? '૩.૨ કુલ ક્રેડિટ (જમા - Cr)' : '3.2 TOTAL CREDIT (Cr)'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginTop: '2px', fontFamily: 'monospace' }}>
              {formatRupees(materialTotals?.totalAmount || 0)}
            </div>
            <div style={{ fontSize: '8.5px', color: '#64748b', fontWeight: 600, marginTop: '1px' }}>
              {isGu ? 'ચૂકવવાની બાકી: ' : 'Payable Due: '}
              <strong style={{ color: '#b45309' }}>{formatRupees(materialTotals?.pending || 0)}</strong>
            </div>
          </div>

          {/* Card 3: Net Settlement Position */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderTop: `3px solid ${isNetDr ? '#15803d' : '#dc2626'}`, borderRadius: '6px', padding: '7px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: isNetDr ? '#15803d' : '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {isGu ? '૩.૩ નેટ બેલેન્સ સરવૈયું' : '3.3 NET POSITION'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: isNetDr ? '#15803d' : '#dc2626', marginTop: '2px', fontFamily: 'monospace' }}>
              {formatRupees(Math.abs(netDiff))} {isNetDr ? 'Dr' : 'Cr'}
            </div>
            <div style={{ fontSize: '8.5px', fontWeight: 700, color: isNetDr ? '#15803d' : '#b91c1c', marginTop: '1px' }}>
              {isNetDr
                ? (isGu ? 'ચોખ્ખા લેવાના (Net Dr to Collect)' : 'Net Receivable (Dr)')
                : (isGu ? 'ચોખ્ખા ચૂકવવાના (Net Cr to Pay)' : 'Net Payable (Cr)')}
            </div>
          </div>

          {/* Card 4: Total Accounts */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderTop: '3px solid #0f172a', borderRadius: '6px', padding: '7px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {isGu ? '૩.૪ સક્રિય ખાતાઓ' : '3.4 TOTAL ACCOUNTS'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginTop: '2px', fontFamily: 'monospace' }}>
              {(textileTotals?.count || 0) + (materialTotals?.count || 0)} {isGu ? 'પાર્ટીઓ' : 'Parties'}
            </div>
            <div style={{ fontSize: '8.5px', color: '#64748b', fontWeight: 600, marginTop: '1px' }}>
              {textileTotals?.count || 0} {isGu ? 'ટેક્સટાઇલ (Dr)' : 'Textile (Dr)'} • {materialTotals?.count || 0} {isGu ? 'મટિરિયલ (Cr)' : 'Material (Cr)'}
            </div>
          </div>
        </div>
      );
    }

    // Consolidated Directory Summary with Separate Textile & Material Cards
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '10px' }}>
        {/* Card 1: 1. Textile Customers */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderTop: '3px solid #1e3a8a', borderRadius: '6px', padding: '7px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {isGu ? '૧. ટેક્સટાઇલ ગ્રાહકો' : '1. TEXTILE CUSTOMERS'}
            </span>
            <span style={{ fontSize: '8.5px', fontWeight: 700, color: '#475569' }}>
              {textileTotals?.count || 0} {isGu ? 'પાર્ટી' : 'Parties'}
            </span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginTop: '2px', fontFamily: 'monospace' }}>
            {formatRupees(textileTotals?.totalAmount || 0)}
          </div>
          <div style={{ fontSize: '8.5px', color: '#475569', fontWeight: 600, marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
            <span>{isGu ? 'જમા:' : 'Recv:'} <strong style={{ color: '#15803d' }}>{formatRupees(textileTotals?.receivedPaid || 0)}</strong></span>
            <span>{isGu ? 'બાકી:' : 'Due:'} <strong style={{ color: '#dc2626' }}>{formatRupees(textileTotals?.pending || 0)}</strong></span>
          </div>
        </div>

        {/* Card 2: 2. Material Suppliers */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderTop: '3px solid #b45309', borderRadius: '6px', padding: '7px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {isGu ? '૨. મટિરિયલ સપ્લાયર્સ' : '2. MATERIAL SUPPLIERS'}
            </span>
            <span style={{ fontSize: '8.5px', fontWeight: 700, color: '#475569' }}>
              {materialTotals?.count || 0} {isGu ? 'સપ્લાયર્સ' : 'Vendors'}
            </span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginTop: '2px', fontFamily: 'monospace' }}>
            {formatRupees(materialTotals?.totalAmount || 0)}
          </div>
          <div style={{ fontSize: '8.5px', color: '#475569', fontWeight: 600, marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
            <span>{isGu ? 'ચૂકવેલ:' : 'Paid:'} <strong style={{ color: '#15803d' }}>{formatRupees(materialTotals?.receivedPaid || 0)}</strong></span>
            <span>{isGu ? 'બાકી:' : 'Due:'} <strong style={{ color: '#b45309' }}>{formatRupees(materialTotals?.pending || 0)}</strong></span>
          </div>
        </div>

        {/* Card 3: Total Combined Turnover */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderTop: '3px solid #334155', borderRadius: '6px', padding: '7px 12px' }}>
          <div style={{ fontSize: '9px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            {isGu ? 'કુલ ટર્નઓવર વોલ્યુમ' : 'TOTAL COMBINED VOLUME'}
          </div>
          <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginTop: '2px', fontFamily: 'monospace' }}>
            {formatRupees(dirTotals.totalAmount)}
          </div>
          <div style={{ fontSize: '8.5px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
            {dirTotals.count} {isGu ? 'કુલ પક્ષકારો એકંદર' : 'Parties Combined (Sales + Purchase)'}
          </div>
        </div>

        {/* Card 4: Net Balance Due */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderTop: '3px solid #dc2626', borderRadius: '6px', padding: '7px 12px' }}>
          <div style={{ fontSize: '9px', fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            {isGu ? 'ચોખ્ખી નેટ બાકી રકમ' : 'NET BALANCE DUE'}
          </div>
          <div style={{ fontSize: '15px', fontWeight: 900, color: dirTotals.pending > 0 ? '#dc2626' : '#15803d', marginTop: '2px', fontFamily: 'monospace' }}>
            {formatRupees(dirTotals.pending)}
          </div>
          <div style={{ fontSize: '8.5px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
            {isGu ? 'લેવાની:' : 'Recv:'} <strong style={{ color: '#15803d' }}>{formatRupees(textileTotals?.pending || 0)}</strong> | {isGu ? 'દેવાની:' : 'Pay:'} <strong style={{ color: '#b45309' }}>{formatRupees(materialTotals?.pending || 0)}</strong>
          </div>
        </div>
      </div>
    );
  };

  // Render Table Header
  const renderTableHeader = (pageSection: 'textile' | 'material' | 'credit-debit' | 'all' = 'all') => {
    if (isIndividualParty) {
      return (
        <thead>
          <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
            <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'center', width: '42px', letterSpacing: '0.4px' }}>
              {isGu ? 'ક્રમ' : 'SR'}
            </th>
            <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'left', width: '85px', letterSpacing: '0.4px' }}>
              {isGu ? 'તારીખ' : 'DATE'}
            </th>
            <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'left', width: '95px', letterSpacing: '0.4px' }}>
              {isGu ? 'રેફ. નં.' : 'REF NO'}
            </th>
            <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'left', letterSpacing: '0.4px' }}>
              {isGu ? 'વિગત / પર્ટીક્યુલર્સ' : 'PARTICULARS / DESCRIPTION'}
            </th>
            <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'right', width: '105px', letterSpacing: '0.4px' }}>
              {isGu ? 'ડેબિટ / બિલ (₹)' : 'DEBIT / BILLED (₹)'}
            </th>
            <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'right', width: '105px', letterSpacing: '0.4px' }}>
              {isGu ? 'ક્રેડિટ / જમા (₹)' : 'CREDIT / PAID (₹)'}
            </th>
            <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'right', width: '110px', letterSpacing: '0.4px' }}>
              {isGu ? 'બેલેન્સ (₹)' : 'BALANCE (₹)'}
            </th>
            <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'center', width: '75px', letterSpacing: '0.4px' }}>
              {isGu ? 'સ્ટેટસ' : 'STATUS'}
            </th>
          </tr>
        </thead>
      );
    }

    // Dedicated Credit & Debit Table Header for Page 3
    if (pageSection === 'credit-debit') {
      return (
        <thead>
          <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
            <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'center', width: '38px', letterSpacing: '0.4px' }}>
              {isGu ? 'ક્રમ' : 'SR'}
            </th>
            <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'left', width: '185px', letterSpacing: '0.4px' }}>
              {isGu ? 'પાર્ટીનું નામ' : 'PARTY NAME'}
            </th>
            <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'left', width: '120px', letterSpacing: '0.4px' }}>
              {isGu ? 'ખાતા પ્રકાર' : 'ACCOUNT TYPE'}
            </th>
            <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'left', width: '130px', letterSpacing: '0.4px' }}>
              {isGu ? 'સંપર્ક / મોબાઇલ' : 'CONTACT & MOBILE'}
            </th>
            <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'right', width: '105px', letterSpacing: '0.4px' }}>
              {isGu ? 'કુલ રકમ (₹)' : 'TOTAL AMOUNT (₹)'}
            </th>
            <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'right', width: '110px', letterSpacing: '0.4px' }}>
              {isGu ? 'ડેબિટ / Dr (₹)' : 'DEBIT / Dr (₹)'}
            </th>
            <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'right', width: '110px', letterSpacing: '0.4px' }}>
              {isGu ? 'ક્રેડિટ / Cr (₹)' : 'CREDIT / Cr (₹)'}
            </th>
            <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'right', width: '115px', letterSpacing: '0.4px' }}>
              {isGu ? 'નેટ બાકી (₹)' : 'NET BALANCE (₹)'}
            </th>
            <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'center', width: '85px', letterSpacing: '0.4px' }}>
              {isGu ? 'સ્થિતિ' : 'STATUS'}
            </th>
          </tr>
        </thead>
      );
    }

    // Standard Directory Header (Pages 1 & 2)
    return (
      <thead>
        <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
          <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'center', width: '42px', letterSpacing: '0.4px' }}>
            {isGu ? 'ક્રમ' : 'SR'}
          </th>
          <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'left', width: '190px', letterSpacing: '0.4px' }}>
            {isGu ? 'પાર્ટીનું નામ' : 'PARTY NAME'}
          </th>
          <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'left', width: '100px', letterSpacing: '0.4px' }}>
            {isGu ? 'પ્રકાર' : 'CATEGORY'}
          </th>
          <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'left', width: '130px', letterSpacing: '0.4px' }}>
            {isGu ? 'સંપર્ક / મોબાઇલ' : 'CONTACT & MOBILE'}
          </th>
          <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'left', width: '120px', letterSpacing: '0.4px' }}>
            GSTIN
          </th>
          <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'right', width: '105px', letterSpacing: '0.4px' }}>
            {isGu ? 'કુલ રકમ (₹)' : 'TOTAL AMOUNT (₹)'}
          </th>
          <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'right', width: '105px', letterSpacing: '0.4px' }}>
            {isGu ? 'જમા / ચૂકવેલ (₹)' : 'RECEIVED / PAID (₹)'}
          </th>
          <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'right', width: '105px', letterSpacing: '0.4px' }}>
            {isGu ? 'બાકી રકમ (₹)' : 'BALANCE DUE (₹)'}
          </th>
          <th style={{ padding: '7px 8px', fontSize: '9.5px', fontWeight: 800, textAlign: 'center', width: '75px', letterSpacing: '0.4px' }}>
            {isGu ? 'સ્ટેટસ' : 'STATUS'}
          </th>
        </tr>
      </thead>
    );
  };

  // Render Table Rows
  const renderTableRows = (
    rows: any[],
    pageSection: 'textile' | 'material' | 'credit-debit' | 'all' = 'all'
  ) => {
    if (isIndividualParty) {
      const lRows = rows as LedgerRow[];
      if (lRows.length === 0) {
        return (
          <tbody>
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '11px' }}>
                {isGu ? 'આ સમયગાળામાં કોઈ લેવડદેવડ મળેલ નથી.' : 'No transactions recorded for this period.'}
              </td>
            </tr>
          </tbody>
        );
      }

      return (
        <tbody>
          {lRows.map((r, idx) => (
            <tr
              key={idx}
              style={{
                backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <td style={{ padding: '6px 8px', fontSize: '9.5px', textAlign: 'center', color: '#64748b' }}>
                {r.srNo}
              </td>
              <td style={{ padding: '6px 8px', fontSize: '9.5px', fontWeight: 600, color: '#1e293b' }}>
                {r.date}
              </td>
              <td style={{ padding: '6px 8px', fontSize: '9.5px', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                {r.refNo}
              </td>
              <td style={{ padding: '6px 8px', fontSize: '9.5px', color: '#0f172a', fontWeight: 500 }}>
                {r.particulars}
              </td>
              <td style={{ padding: '6px 8px', fontSize: '9.5px', textAlign: 'right', fontWeight: 700, color: r.debit > 0 ? '#0f172a' : '#94a3b8', fontFamily: 'monospace' }}>
                {r.debit > 0 ? formatRupees(r.debit) : '-'}
              </td>
              <td style={{ padding: '6px 8px', fontSize: '9.5px', textAlign: 'right', fontWeight: 700, color: r.credit > 0 ? '#15803d' : '#94a3b8', fontFamily: 'monospace' }}>
                {r.credit > 0 ? formatRupees(r.credit) : '-'}
              </td>
              <td style={{ padding: '6px 8px', fontSize: '9.5px', textAlign: 'right', fontWeight: 800, color: r.balance > 0 ? '#dc2626' : '#15803d', fontFamily: 'monospace' }}>
                {formatRupees(r.balance)}
              </td>
              <td style={{ padding: '6px 8px', fontSize: '8.5px', textAlign: 'center' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    backgroundColor: r.status === 'Paid' ? '#dcfce7' : r.status === 'Partial' ? '#fef3c7' : '#fee2e2',
                    color: r.status === 'Paid' ? '#15803d' : r.status === 'Partial' ? '#b45309' : '#b91c1c',
                  }}
                >
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      );
    }

    // Directory rows (rendered with Section Headers, Subtotals, and Credit & Debit)
    const dRows = rows as DirectoryRow[];
    if (dRows.length === 0) {
      return (
        <tbody>
          <tr>
            <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '11px' }}>
              {isGu ? 'કોઈ પાર્ટી મળેલ નથી.' : 'No party records found.'}
            </td>
          </tr>
        </tbody>
      );
    }

    const isCreditDebitMode = pageSection === 'credit-debit' || dRows.some((r) => r.category === 'credit-debit');

    return (
      <tbody>
        {dRows.map((r, idx) => {
          // 1. SECTION HEADER BANNER ROW
          if (r.isSectionHeader) {
            const isTextile = r.category === 'textile';
            const isCD = r.category === 'credit-debit';
            const count = r.sectionCount || (isTextile ? textileTotals?.count : isCD ? dirTotals?.count : materialTotals?.count) || 0;
            const totAmt = r.sectionTotal || (isTextile ? textileTotals?.totalAmount : isCD ? dirTotals?.totalAmount : materialTotals?.totalAmount) || 0;
            const dueAmt = r.sectionPending || (isTextile ? textileTotals?.pending : isCD ? dirTotals?.pending : materialTotals?.pending) || 0;

            return (
              <tr
                key={`sec-${idx}`}
                style={{
                  backgroundColor: isCD ? '#0f172a' : isTextile ? '#1e293b' : '#334155',
                  color: '#ffffff',
                }}
              >
                <td
                  colSpan={9}
                  style={{
                    padding: '6px 12px',
                    fontWeight: 800,
                    fontSize: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          backgroundColor: isCD ? '#38bdf8' : isTextile ? '#60a5fa' : '#f59e0b',
                        }}
                      />
                      <span style={{ fontSize: '10.5px', fontWeight: 900, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                        {r.sectionTitle}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '9px', fontWeight: 600, color: '#e2e8f0' }}>
                      <span>
                        {count} {isCD ? (isGu ? 'કુલ ખાતા' : 'Accounts') : isTextile ? (isGu ? 'પાર્ટીઓ' : 'Parties') : (isGu ? 'સપ્લાયર્સ' : 'Vendors')}
                      </span>
                      <span>•</span>
                      <span>
                        {isCD
                          ? (isGu ? 'કુલ વ્યવહાર: ' : 'Total Volume: ')
                          : isTextile
                          ? (isGu ? 'કુલ બિલિંગ: ' : 'Total Billed: ')
                          : (isGu ? 'કુલ ખરીદી: ' : 'Total Purchase: ')}
                        <strong style={{ color: '#ffffff' }}>
                          {formatRupees(totAmt)}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        {isGu ? 'બાકી: ' : 'Due: '}
                        <strong style={{ color: isCD ? '#fde68a' : isTextile ? '#fca5a5' : '#fde68a' }}>
                          {formatRupees(dueAmt)}
                        </strong>
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
            );
          }

          // 2. GRAND TOTAL ROW IN CREDIT & DEBIT
          if (r.isGrandTotal) {
            return (
              <tr
                key={`grand-${idx}`}
                style={{
                  backgroundColor: '#e2e8f0',
                  borderTop: '2px solid #0f172a',
                  borderBottom: '3.5px double #0f172a',
                  fontWeight: 900,
                }}
              >
                <td style={{ padding: '7px 8px', fontSize: '10px', textAlign: 'center', color: '#0f172a' }}>
                  ★
                </td>
                <td
                  colSpan={3}
                  style={{
                    padding: '7px 8px',
                    fontSize: '10px',
                    fontWeight: 900,
                    color: '#0f172a',
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase',
                  }}
                >
                  {r.subtotalLabel}
                </td>
                <td style={{ padding: '7px 8px', fontSize: '10px', textAlign: 'right', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                  {formatRupees(r.totalAmount)}
                </td>
                <td style={{ padding: '7px 8px', fontSize: '10px', textAlign: 'right', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                  {formatRupees(r.debitAmount || 0)}
                </td>
                <td style={{ padding: '7px 8px', fontSize: '10px', textAlign: 'right', fontWeight: 900, color: '#15803d', fontFamily: 'monospace' }}>
                  {formatRupees(r.creditAmount || 0)}
                </td>
                <td style={{ padding: '7px 8px', fontSize: '10px', textAlign: 'right', fontWeight: 900, color: r.balanceType === 'Cr' ? '#b45309' : '#dc2626', fontFamily: 'monospace' }}>
                  {formatRupees(r.netBalance || r.pendingDue || 0)}
                </td>
                <td style={{ padding: '7px 8px', fontSize: '8.5px', textAlign: 'center' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontWeight: 900,
                      fontSize: '8px',
                      backgroundColor: r.balanceType === 'Cr' ? '#fef3c7' : '#fee2e2',
                      color: r.balanceType === 'Cr' ? '#b45309' : '#b91c1c',
                    }}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            );
          }

          // 3. SUBTOTAL HIGHLIGHT ROW
          if (r.isSubtotal) {
            return (
              <tr
                key={`sub-${idx}`}
                style={{
                  backgroundColor: '#f1f5f9',
                  borderTop: '1.5px solid #0f172a',
                  borderBottom: '2.5px double #0f172a',
                  fontWeight: 900,
                }}
              >
                <td style={{ padding: '6px 8px', fontSize: '9.5px', textAlign: 'center', color: '#64748b' }}>
                  •
                </td>
                <td
                  colSpan={isCreditDebitMode ? 3 : 4}
                  style={{
                    padding: '6px 8px',
                    fontSize: '10px',
                    fontWeight: 900,
                    color: '#0f172a',
                    letterSpacing: '0.2px',
                  }}
                >
                  {r.subtotalLabel}
                </td>
                <td style={{ padding: '6px 8px', fontSize: '10px', textAlign: 'right', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                  {formatRupees(r.totalAmount)}
                </td>
                <td style={{ padding: '6px 8px', fontSize: '10px', textAlign: 'right', fontWeight: 900, color: isCreditDebitMode ? '#0f172a' : '#15803d', fontFamily: 'monospace' }}>
                  {formatRupees(isCreditDebitMode ? r.debitAmount || 0 : r.receivedPaid)}
                </td>
                <td style={{ padding: '6px 8px', fontSize: '10px', textAlign: 'right', fontWeight: 900, color: isCreditDebitMode ? '#15803d' : (r.pendingDue > 0 ? '#dc2626' : '#15803d'), fontFamily: 'monospace' }}>
                  {formatRupees(isCreditDebitMode ? r.creditAmount || 0 : r.pendingDue)}
                </td>
                {isCreditDebitMode && (
                  <td style={{ padding: '6px 8px', fontSize: '10px', textAlign: 'right', fontWeight: 900, color: r.balanceType === 'Cr' ? '#b45309' : (r.netBalance || 0) > 0 ? '#dc2626' : '#15803d', fontFamily: 'monospace' }}>
                    {formatRupees(r.netBalance || r.pendingDue)}
                  </td>
                )}
                <td style={{ padding: '6px 8px', fontSize: '8.5px', textAlign: 'center' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '1px 6px',
                      borderRadius: '3px',
                      fontWeight: 800,
                      fontSize: '8px',
                      backgroundColor: r.balanceType === 'Cr' ? '#fef3c7' : r.pendingDue <= 0 ? '#dcfce7' : '#fee2e2',
                      color: r.balanceType === 'Cr' ? '#b45309' : r.pendingDue <= 0 ? '#15803d' : '#b91c1c',
                    }}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            );
          }

          // 4. CREDIT & DEBIT DEDICATED PARTY ROW
          if (isCreditDebitMode) {
            return (
              <tr
                key={idx}
                style={{
                  backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfdfe',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <td style={{ padding: '6px 8px', fontSize: '9.5px', textAlign: 'center', color: '#64748b' }}>
                  {r.srNo}
                </td>
                <td style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 800, color: '#0f172a' }}>
                  {r.partyName}
                </td>
                <td style={{ padding: '6px 8px', fontSize: '9px', color: '#475569', fontWeight: 600 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      backgroundColor: r.partyType.includes('Textile') || r.partyType.includes('ટેક્સટાઇલ') ? '#eff6ff' : '#fef3c7',
                      color: r.partyType.includes('Textile') || r.partyType.includes('ટેક્સટાઇલ') ? '#1e40af' : '#b45309',
                      fontWeight: 700,
                      fontSize: '8.5px',
                    }}
                  >
                    {r.partyType}
                  </span>
                </td>
                <td style={{ padding: '6px 8px', fontSize: '9px', color: '#334155' }}>
                  {r.contactPerson && r.contactPerson !== '-' ? `${r.contactPerson} (${r.mobile})` : r.mobile}
                </td>
                <td style={{ padding: '6px 8px', fontSize: '10px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                  {formatRupees(r.totalAmount)}
                </td>
                <td style={{ padding: '6px 8px', fontSize: '10px', textAlign: 'right', fontWeight: 700, color: (r.debitAmount || 0) > 0 ? '#0f172a' : '#94a3b8', fontFamily: 'monospace' }}>
                  {(r.debitAmount || 0) > 0 ? formatRupees(r.debitAmount || 0) : '-'}
                </td>
                <td style={{ padding: '6px 8px', fontSize: '10px', textAlign: 'right', fontWeight: 700, color: (r.creditAmount || 0) > 0 ? '#15803d' : '#94a3b8', fontFamily: 'monospace' }}>
                  {(r.creditAmount || 0) > 0 ? formatRupees(r.creditAmount || 0) : '-'}
                </td>
                <td style={{ padding: '6px 8px', fontSize: '10px', textAlign: 'right', fontWeight: 800, color: r.balanceType === 'Cr' ? '#b45309' : (r.netBalance || 0) > 0 ? '#dc2626' : '#15803d', fontFamily: 'monospace' }}>
                  {formatRupees(r.netBalance || r.pendingDue || 0)}
                </td>
                <td style={{ padding: '6px 8px', fontSize: '8.5px', textAlign: 'center' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '1px 6px',
                      borderRadius: '3px',
                      fontWeight: 700,
                      fontSize: '8px',
                      backgroundColor: r.balanceType === 'Cr' ? '#fef3c7' : (r.netBalance || 0) > 0 ? '#fee2e2' : '#dcfce7',
                      color: r.balanceType === 'Cr' ? '#b45309' : (r.netBalance || 0) > 0 ? '#b91c1c' : '#15803d',
                    }}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            );
          }

          // 5. REGULAR DIRECTORY PARTY ROW (Pages 1 & 2)
          return (
            <tr
              key={idx}
              style={{
                backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfdfe',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <td style={{ padding: '6px 8px', fontSize: '9.5px', textAlign: 'center', color: '#64748b' }}>
                {r.srNo}
              </td>
              <td style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 800, color: '#0f172a' }}>
                {r.partyName}
              </td>
              <td style={{ padding: '6px 8px', fontSize: '9px', color: '#475569', fontWeight: 600 }}>
                {r.partyType}
              </td>
              <td style={{ padding: '6px 8px', fontSize: '9px', color: '#334155' }}>
                {r.contactPerson && r.contactPerson !== '-' ? `${r.contactPerson} (${r.mobile})` : r.mobile}
              </td>
              <td style={{ padding: '6px 8px', fontSize: '9px', fontFamily: 'monospace', color: '#475569' }}>
                {r.gstin}
              </td>
              <td style={{ padding: '6px 8px', fontSize: '10px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                {formatRupees(r.totalAmount)}
              </td>
              <td style={{ padding: '6px 8px', fontSize: '10px', textAlign: 'right', fontWeight: 700, color: '#15803d', fontFamily: 'monospace' }}>
                {formatRupees(r.receivedPaid)}
              </td>
              <td style={{ padding: '6px 8px', fontSize: '10px', textAlign: 'right', fontWeight: 800, color: r.pendingDue > 0 ? '#dc2626' : '#15803d', fontFamily: 'monospace' }}>
                {formatRupees(r.pendingDue)}
              </td>
              <td style={{ padding: '6px 8px', fontSize: '8.5px', textAlign: 'center' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '1px 6px',
                    borderRadius: '3px',
                    fontWeight: 700,
                    fontSize: '8px',
                    backgroundColor: r.status === 'Clear' ? '#dcfce7' : r.status === 'Partial' ? '#fef3c7' : r.status === 'Pending' ? '#fee2e2' : '#f1f5f9',
                    color: r.status === 'Clear' ? '#15803d' : r.status === 'Partial' ? '#b45309' : r.status === 'Pending' ? '#b91c1c' : '#64748b',
                  }}
                >
                  {r.status}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    );
  };

  // Reusable Statement Footer with Totals and Signatures
  const renderFooter = (
    isLastPage: boolean,
    pageNum: number,
    pageSection: 'textile' | 'material' | 'credit-debit' | 'all' = 'all'
  ) => {
    return (
      <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
        {isLastPage ? (
          <>
            {/* Grand Totals Box on Final Page */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: '6px',
                padding: '7px 14px',
                marginBottom: '10px',
              }}
            >
              <div>
                <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {isGu ? 'શબ્દોમાં ચોખ્ખી બાકી રકમ:' : 'NET PENDING BALANCE IN WORDS:'}
                </div>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#0f172a', fontStyle: 'italic', marginTop: '2px' }}>
                  {numberToWords(isIndividualParty ? partyTotals.balance : dirTotals.pending)} Only
                </div>
                <div style={{ fontSize: '8px', color: '#64748b', marginTop: '1px' }}>
                  {isGu
                    ? 'નોંધ: આ સત્તાવાર એકાઉન્ટ સમરી સ્ટેટમેન્ટ છે.'
                    : 'Note: Official system-verified accounting statement.'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    {isIndividualParty
                      ? isGu ? 'કુલ ડેબિટ / વેચાણ' : 'Total Billed'
                      : isGu ? '૧. ટેક્સટાઇલ ડેબિટ (Dr)' : '1. Textile Debit (Dr)'}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                    {formatRupees(isIndividualParty ? partyTotals.debit : textileTotals?.totalAmount || 0)}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    {isIndividualParty
                      ? isGu ? 'કુલ જમા / ક્રેડિટ' : 'Total Paid'
                      : isGu ? '૨. મટિરિયલ ક્રેડિટ (Cr)' : '2. Material Credit (Cr)'}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                    {formatRupees(isIndividualParty ? partyTotals.credit : materialTotals?.totalAmount || 0)}
                  </div>
                </div>

                <div style={{ textAlign: 'right', borderLeft: '1.5px solid #cbd5e1', paddingLeft: '14px' }}>
                  <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase' }}>
                    {isGu ? 'ચોખ્ખી બાકી રકમ (Net)' : 'NET BALANCE DUE'}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: (isIndividualParty ? partyTotals.balance : dirTotals.pending) > 0 ? '#dc2626' : '#15803d', fontFamily: 'monospace' }}>
                    {formatRupees(isIndividualParty ? partyTotals.balance : dirTotals.pending)}
                  </div>
                </div>
              </div>
            </div>

            {/* 3 Formal Signature Blocks */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '20px',
                paddingTop: '8px',
                marginBottom: '8px',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderBottom: '1px dashed #94a3b8', height: '18px', marginBottom: '3px' }}></div>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#334155' }}>
                  {isGu ? 'તૈયાર કરનાર' : 'Prepared By'}
                </div>
                <div style={{ fontSize: '8px', color: '#64748b' }}>
                  {isGu ? 'અકાઉન્ટ વિભાગ' : 'Accounts Department'}
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ borderBottom: '1px dashed #94a3b8', height: '18px', marginBottom: '3px' }}></div>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#334155' }}>
                  {isGu ? 'ચકાસણી કરનાર' : 'Checked & Verified'}
                </div>
                <div style={{ fontSize: '8px', color: '#64748b' }}>
                  {isGu ? 'ઓડિટર / મેનેજર' : 'Auditor / Manager'}
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ borderBottom: '1px dashed #94a3b8', height: '18px', marginBottom: '3px' }}></div>
                <div style={{ fontSize: '9px', fontWeight: 800, color: '#0f172a' }}>
                  {companyName}
                </div>
                <div style={{ fontSize: '8px', color: '#0f172a', fontWeight: 700 }}>
                  {isGu ? 'સત્તાવાર સહી' : 'Authorized Signatory'}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Intermediate Page Transition Banner */
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '6px',
              padding: '6px 12px',
              marginBottom: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 900,
                  color: pageNum === 2 ? '#b45309' : '#1e3a8a',
                }}
              >
                {pageNum === 1
                  ? isGu
                    ? '➡️ ભાગ ૧: ટેક્સટાઇલ ગ્રાહકો પૂર્ણ'
                    : '➡️ PART 1: TEXTILE CUSTOMERS COMPLETE'
                  : isGu
                  ? '➡️ ભાગ ૨: મટિરિયલ સપ્લાયર્સ પૂર્ણ'
                  : '➡️ PART 2: MATERIAL SUPPLIERS COMPLETE'}
              </span>
              <span style={{ color: '#94a3b8', fontSize: '9px' }}>•</span>
              <span style={{ fontSize: '9.5px', color: '#475569', fontWeight: 600 }}>
                {pageNum === 1
                  ? isGu
                    ? 'મટિરિયલ સપ્લાયર્સ અને ખરીદી ખાતા માટે પેજ ૨ જુઓ'
                    : 'Please see Page 2 for Material Suppliers & Raw Material Purchases'
                  : isGu
                  ? 'ક્રેડિટ & ડેબિટ ખાતાવહી અને સરવૈયા માટે પેજ ૩ જુઓ'
                  : 'Please see Page 3 for Consolidated Credit & Debit Statement & Net Settlement'}
              </span>
            </div>
            <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#0f172a' }}>
              {isGu ? `પેજ ${pageNum} / ${totalPagesCount}` : `Page ${pageNum} of ${totalPagesCount}`}
            </div>
          </div>
        )}

        {/* Page Numbering & Security Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '5px',
            fontSize: '8px',
            color: '#64748b',
          }}
        >
          <div>
            {isGu
              ? 'કમ્પ્યુટર જનરેટેડ સત્તાવાર સ્ટેટમેન્ટ • ફેની ક્રિએશન'
              : 'Computer Generated Official Accounting Statement • Feni Creation'}
          </div>
          <div style={{ fontWeight: 700 }}>
            {isGu ? `પેજ ${pageNum} / ${totalPagesCount}` : `Page ${pageNum} of ${totalPagesCount}`}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: isDark ? '#0f172a' : '#f8fafc',
          maxHeight: '92vh',
        },
      }}
    >
      {/* Dialog Header */}
      <DialogTitle
        sx={{
          p: 2,
          px: 3,
          bgcolor: isDark ? '#1e293b' : '#ffffff',
          borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <BusinessIcon sx={{ color: '#1e40af', fontSize: 24 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {isIndividualParty
                ? isGu
                  ? `પાર્ટી ખાતાવહી સ્ટેટમેન્ટ (${currentParty?.name || ''})`
                  : `Party Account Statement - ${currentParty?.name || ''}`
                : isGu
                ? 'સમગ્ર પાર્ટી યાદી સ્ટેટમેન્ટ (Consolidated)'
                : 'Consolidated Party Statement'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {activePeriodLabel} • {isGu ? 'A4 સાઇઝ પ્રિન્ટ અને PDF ડાઉનલોડ' : 'A4 Landscape Print & PDF'}
            </Typography>
          </Box>
        </Box>

        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Control Bar: Party Selector, Period Toggle, View Mode, Download Buttons */}
      <Box
        sx={{
          px: 3,
          py: 1.5,
          bgcolor: isDark ? '#111827' : '#ffffff',
          borderBottom: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        {/* Left Controls: Party Select & Period */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {/* Party Dropdown with Grouping */}
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel id="party-select-label" sx={{ fontSize: '0.8rem' }}>
              {isGu ? 'પાર્ટી પસંદ કરો' : 'Select Party'}
            </InputLabel>
            <Select
              labelId="party-select-label"
              value={selectedPartyId}
              label={isGu ? 'પાર્ટી પસંદ કરો' : 'Select Party'}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              sx={{
                fontSize: '0.825rem',
                fontWeight: 700,
                borderRadius: '8px',
                bgcolor: isDark ? '#1e293b' : '#f8fafc',
              }}
            >
              <MenuItem value="ALL" sx={{ fontWeight: 900, color: '#1e40af', py: 1 }}>
                {isGu
                  ? '📋 તમામ પાર્ટીઓ (૧. ટેક્સટાઇલ • ૨. મટિરિયલ • ૩. ક્રેડિટ & ડેબિટ)'
                  : '📋 All Parties (1. Textile • 2. Material • 3. Credit & Debit)'}
              </MenuItem>

              <ListSubheader
                sx={{
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  color: '#1e40af',
                  bgcolor: isDark ? '#1e293b' : '#eff6ff',
                  lineHeight: '28px',
                }}
              >
                {isGu ? '૧. ટેક્સટાઇલ ગ્રાહકો (Textile Customers)' : '1. Textile Customers (Sales)'}
              </ListSubheader>
              {parties
                .filter(
                  (p) =>
                    p.type !== 'Material Party' &&
                    (p.type as string) !== 'Supplier' &&
                    (p.type as string) !== 'Material' &&
                    (p as any).category !== 'Material'
                )
                .map((p) => (
                  <MenuItem key={p.id} value={p.id} sx={{ fontSize: '0.85rem', pl: 3 }}>
                    {p.name}
                  </MenuItem>
                ))}

              <ListSubheader
                sx={{
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  color: '#b45309',
                  bgcolor: isDark ? '#1e293b' : '#fef3c7',
                  lineHeight: '28px',
                }}
              >
                {isGu ? '૨. મટિરિયલ સપ્લાયર્સ (Material Suppliers)' : '2. Material Suppliers (Purchase)'}
              </ListSubheader>
              {parties
                .filter(
                  (p) =>
                    p.type === 'Material Party' ||
                    (p.type as string) === 'Supplier' ||
                    (p.type as string) === 'Material' ||
                    (p as any).category === 'Material'
                )
                .map((p) => (
                  <MenuItem key={p.id} value={p.id} sx={{ fontSize: '0.85rem', pl: 3 }}>
                    {p.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          {/* Category Scope Filter when viewing All Parties */}
          {selectedPartyId === 'ALL' && (
            <ToggleButtonGroup
              value={categoryScope}
              exclusive
              onChange={(_, val) => val && setCategoryScope(val)}
              size="small"
              sx={{
                bgcolor: isDark ? '#1e293b' : '#f1f5f9',
                borderRadius: '8px',
                '& .MuiToggleButton-root': {
                  py: 0.5,
                  px: 1.1,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.76rem',
                  '&.Mui-selected': {
                    bgcolor: '#0f172a',
                    color: '#ffffff',
                    '&:hover': { bgcolor: '#1e293b' },
                  },
                },
              }}
            >
              <ToggleButton value="all">
                {isGu ? 'બધા (૧. ટેક્સટાઇલ + ૨. મટિરિયલ + ૩. ક્રેડિટ-ડેબિટ)' : 'All (1. Textile • 2. Material • 3. Credit/Debit)'}
              </ToggleButton>
              <ToggleButton value="textile">
                {isGu ? '૧. ટેક્સટાઇલ' : '1. Textile'}
              </ToggleButton>
              <ToggleButton value="material">
                {isGu ? '૨. મટિરિયલ' : '2. Material'}
              </ToggleButton>
              <ToggleButton value="credit-debit">
                {isGu ? '૩. ક્રેડિટ / ડેબિટ' : '3. Credit / Debit'}
              </ToggleButton>
            </ToggleButtonGroup>
          )}

          {/* Period Toggle */}
          <ToggleButtonGroup
            value={periodScope}
            exclusive
            onChange={(_, val) => val && setPeriodScope(val)}
            size="small"
            sx={{
              bgcolor: isDark ? '#1e293b' : '#f1f5f9',
              borderRadius: '8px',
              '& .MuiToggleButton-root': {
                py: 0.5,
                px: 1.2,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.78rem',
                '&.Mui-selected': {
                  bgcolor: '#0f172a',
                  color: '#ffffff',
                  '&:hover': { bgcolor: '#1e293b' },
                },
              },
            }}
          >
            <ToggleButton value="month">
              {isGu ? `આ મહિનો (${monthLabel})` : `Selected Month (${monthLabel})`}
            </ToggleButton>
            <ToggleButton value="all">
              {isGu ? 'લાઈફટાઈમ (All-Time)' : 'All-Time / Lifetime'}
            </ToggleButton>
          </ToggleButtonGroup>

          {/* View Mode */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, val) => val && setViewMode(val)}
            size="small"
            sx={{
              bgcolor: isDark ? '#1e293b' : '#f1f5f9',
              borderRadius: '8px',
              '& .MuiToggleButton-root': {
                py: 0.5,
                px: 1.2,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.78rem',
                '&.Mui-selected': {
                  bgcolor: '#0f172a',
                  color: '#ffffff',
                  '&:hover': { bgcolor: '#1e293b' },
                },
              },
            }}
          >
            <ToggleButton value="pages">
              <PagesViewIcon sx={{ fontSize: 15, mr: 0.5 }} />
              {isGu ? 'A4 પેજ વ્યુ' : 'A4 Pages'}
            </ToggleButton>
            <ToggleButton value="continuous">
              <TableViewIcon sx={{ fontSize: 15, mr: 0.5 }} />
              {isGu ? 'ફુલ શીટ' : 'Full Sheet'}
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Page quick switcher if multi-page */}
          {viewMode === 'pages' && totalPagesCount > 1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <Chip
                label={isGu ? `બધા પેજ (${totalPagesCount})` : `All Pages (${totalPagesCount})`}
                size="small"
                onClick={() => setSelectedPreviewPage('all')}
                color={selectedPreviewPage === 'all' ? 'primary' : 'default'}
                variant={selectedPreviewPage === 'all' ? 'filled' : 'outlined'}
                sx={{ fontWeight: 800, cursor: 'pointer', height: 26, fontSize: '0.74rem' }}
              />
              {pagedRows.map((pRows, idx) => {
                const pNum = idx + 1;
                const isCD = pRows.some((r) => r.category === 'credit-debit');
                const isMat = pRows.some((r) => r.category === 'material');
                const chipLabel =
                  categoryScope === 'all'
                    ? isCD
                      ? isGu ? 'પેજ ૩: ક્રેડિટ & ડેબિટ' : 'Page 3: Credit & Debit'
                      : isMat
                      ? isGu ? 'પેજ ૨: મટિરિયલ' : 'Page 2: Material'
                      : isGu ? 'પેજ ૧: ટેક્સટાઇલ' : 'Page 1: Textile'
                    : `${isGu ? 'પેજ' : 'Page'} ${pNum}`;

                return (
                  <Chip
                    key={idx}
                    label={chipLabel}
                    size="small"
                    onClick={() => setSelectedPreviewPage(pNum)}
                    color={selectedPreviewPage === pNum ? 'primary' : 'default'}
                    variant={selectedPreviewPage === pNum ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 800, cursor: 'pointer', height: 26, fontSize: '0.74rem' }}
                  />
                );
              })}
            </Box>
          )}
        </Box>

        {/* Right Actions: Excel, Print, PDF */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="outlined"
            color="success"
            size="small"
            startIcon={<ExcelIcon />}
            onClick={handleExportExcel}
            sx={{ fontWeight: 700, borderRadius: '8px', textTransform: 'none', fontSize: '0.8rem' }}
          >
            {isGu ? 'એક્સેલ' : 'Excel'}
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            sx={{
              fontWeight: 700,
              borderRadius: '8px',
              textTransform: 'none',
              fontSize: '0.8rem',
              borderColor: isDark ? '#334155' : '#cbd5e1',
              color: isDark ? '#f8fafc' : '#0f172a',
            }}
          >
            {isGu ? 'પ્રિન્ટ' : 'Print'}
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <PdfIcon />}
            disabled={downloading}
            onClick={handleDownloadPdf}
            sx={{
              fontWeight: 700,
              borderRadius: '8px',
              textTransform: 'none',
              fontSize: '0.8rem',
              bgcolor: '#0f172a',
              '&:hover': { bgcolor: '#1e293b' },
            }}
          >
            {downloading ? downloadProgress || (isGu ? 'PDF ડાઉનલોડ...' : 'Downloading...') : (isGu ? 'A4 PDF ડાઉનલોડ' : 'Download A4 PDF')}
          </Button>
        </Box>
      </Box>

      {/* Main Content Area */}
      <DialogContent sx={{ p: { xs: 1.5, sm: 2.5 }, overflowY: 'auto' }}>
        {/* Visible Preview Screen */}
        <Box
          ref={printRef}
          className="print-area"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            py: 1,
          }}
        >
          {viewMode === 'continuous' ? (
            /* Continuous View */
            <Paper
              elevation={2}
              sx={{
                width: '100%',
                maxWidth: '1123px',
                p: '20px 24px',
                bgcolor: '#ffffff',
                color: '#000000',
                borderRadius: '8px',
                fontFamily: fontStack,
                boxSizing: 'border-box',
              }}
            >
              {renderHeader(true, 1, 'all')}
              {renderPartyInfoCard()}
              {renderSummaryCards('all')}

              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #cbd5e1',
                  marginBottom: '10px',
                  fontFamily: fontStack,
                }}
              >
                {renderTableHeader('all')}
                {renderTableRows(isIndividualParty ? ledgerRows : directoryRows, 'all')}
              </table>

              {renderFooter(true, 1, 'all')}
            </Paper>
          ) : (
            /* Paged A4 Landscape View */
            pagedRows.map((pageRows, pageIdx) => {
              const pageNum = pageIdx + 1;
              if (selectedPreviewPage !== 'all' && selectedPreviewPage !== pageNum) {
                return null;
              }
              const isFirstPage = pageNum === 1;
              const isLastPage = pageNum === totalPagesCount;
              const pageSection: 'textile' | 'material' | 'credit-debit' | 'all' = isIndividualParty
                ? 'all'
                : pageRows.some((r) => r.category === 'credit-debit')
                ? 'credit-debit'
                : pageRows.some((r) => r.category === 'material')
                ? 'material'
                : 'textile';

              return (
                <Box
                  key={pageIdx}
                  className="pdf-page-block"
                  sx={{
                    width: '1123px',
                    minHeight: '794px',
                    bgcolor: '#ffffff',
                    color: '#000000',
                    p: '20px 24px',
                    boxSizing: 'border-box',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                    borderRadius: '4px',
                    fontFamily: fontStack,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    pageBreakAfter: 'always',
                    breakAfter: 'page',
                    '@media print': {
                      boxShadow: 'none',
                      p: '15mm 20mm',
                      width: '100% !important',
                      minHeight: 'auto !important',
                      pageBreakAfter: 'always !important',
                      breakAfter: 'page !important',
                    },
                  }}
                >
                  <div>
                    {renderHeader(isFirstPage, pageNum, pageSection)}
                    {isFirstPage && renderPartyInfoCard()}
                    {renderSummaryCards(pageSection)}

                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        border: '1px solid #cbd5e1',
                        marginBottom: '8px',
                        fontFamily: fontStack,
                      }}
                    >
                      {renderTableHeader(pageSection)}
                      {renderTableRows(pageRows, pageSection)}
                    </table>
                  </div>

                  {renderFooter(isLastPage, pageNum, pageSection)}
                </Box>
              );
            })
          )}
        </Box>

        {/* Hidden Container strictly for high-res PDF generation */}
        <div
          ref={pdfExportRef}
          style={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            width: '1123px',
            pointerEvents: 'none',
          }}
        >
          {pagedRows.map((pageRows, pageIdx) => {
            const pageNum = pageIdx + 1;
            const isFirstPage = pageNum === 1;
            const isLastPage = pageNum === totalPagesCount;
            const pageSection: 'textile' | 'material' | 'credit-debit' | 'all' = isIndividualParty
              ? 'all'
              : pageRows.some((r) => r.category === 'credit-debit')
              ? 'credit-debit'
              : pageRows.some((r) => r.category === 'material')
              ? 'material'
              : 'textile';

            return (
              <div
                key={`pdf-${pageIdx}`}
                className="pdf-page-block"
                style={{
                  width: '1123px',
                  height: '794px',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  padding: '20px 24px',
                  boxSizing: 'border-box',
                  fontFamily: fontStack,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  overflow: 'hidden',
                }}
              >
                <div>
                  {renderHeader(isFirstPage, pageNum, pageSection)}
                  {isFirstPage && renderPartyInfoCard()}
                  {renderSummaryCards(pageSection)}

                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      border: '1px solid #cbd5e1',
                      marginBottom: '8px',
                      fontFamily: fontStack,
                    }}
                  >
                    {renderTableHeader(pageSection)}
                    {renderTableRows(pageRows, pageSection)}
                  </table>
                </div>

                {renderFooter(isLastPage, pageNum, pageSection)}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
