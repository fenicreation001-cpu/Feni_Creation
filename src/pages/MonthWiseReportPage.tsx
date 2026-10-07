import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  MenuItem,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  CircularProgress,
  IconButton,
  Divider,
  Tooltip,
} from '@mui/material';
import ExcelIcon from '@mui/icons-material/FileDownload';
import PdfIcon from '@mui/icons-material/PictureAsPdf';
import CalendarIcon from '@mui/icons-material/CalendarMonth';
import InvoiceIcon from '@mui/icons-material/ReceiptLong';
import PurchaseIcon from '@mui/icons-material/ShoppingCart';
import WorkerIcon from '@mui/icons-material/Badge';
import ProfitIcon from '@mui/icons-material/TrendingUp';
import ViewIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import RefreshIcon from '@mui/icons-material/Refresh';
import WalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { Bill, Purchase, Worker } from '../types';
import { formatRupees, formatDate } from '../utils/formatters';
import { apiClient } from '../utils/api';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import { useNotification } from '../context/NotificationContext';
import { useThemeContext } from '../context/ThemeContext';
import { useCompany } from '../context/CompanyContext';

const MONTH_NAMES_EN: Record<string, string> = {
  '01': 'January',
  '02': 'February',
  '03': 'March',
  '04': 'April',
  '05': 'May',
  '06': 'June',
  '07': 'July',
  '08': 'August',
  '09': 'September',
  '10': 'October',
  '11': 'November',
  '12': 'December',
};

const MONTH_NAMES_GU: Record<string, string> = {
  '01': 'જાન્યુઆરી',
  '02': 'ફેબ્રુઆરી',
  '03': 'માર્ચ',
  '04': 'એપ્રિલ',
  '05': 'મે',
  '06': 'જૂન',
  '07': 'જુલાઈ',
  '08': 'ઓગસ્ટ',
  '09': 'સપ્ટેમ્બર',
  '10': 'ઓક્ટોબર',
  '11': 'નવેમ્બર',
  '12': 'ડિસેમ્બર',
};

interface MonthSummaryData {
  yearMonth: string; // YYYY-MM
  year: string;
  monthCode: string; // 01..12
  monthNameEn: string;
  monthNameGu: string;
  // Bills / Invoices
  invoiceCount: number;
  invoiceSubtotal: number;
  invoiceTax: number;
  invoiceTotal: number;
  invoicePaid: number;
  invoicePending: number;
  billsList: Bill[];
  // Purchases
  purchaseCount: number;
  purchaseSubtotal: number;
  purchaseTax: number;
  purchaseTotal: number;
  purchasePaid: number;
  purchasePending: number;
  purchasesList: Purchase[];
  // Workers
  workerCount: number;
  workerFixedSalaryTotal: number;
  workerAdvancesPaid: number;
  workerNetPayable: number;
  workersList: { worker: Worker; monthAdvances: number; monthPayable: number }[];
  // Summary
  netOperatingProfit: number;
}

export const MonthWiseReportPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);

  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedDetailMonth, setSelectedDetailMonth] = useState<MonthSummaryData | null>(null);
  const [detailTab, setDetailTab] = useState<number>(0);
  const [pdfGenerating, setPdfGenerating] = useState<boolean>(false);

  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const { showNotification } = useNotification();
  const { language } = useThemeContext();
  const { settings } = useCompany();
  const isGu = language === 'gu';

  const fontStack = "'Noto Sans Gujarati', 'Hind Vadodara', 'Mukta', 'Plus Jakarta Sans', system-ui, sans-serif";

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bRes, pRes, wRes] = await Promise.all([
        apiClient.getBills(),
        apiClient.getPurchases(),
        apiClient.getWorkers(),
      ]);
      setBills(bRes || []);
      setPurchases(pRes || []);
      setWorkers(wRes || []);
    } catch (err) {
      showNotification(isGu ? 'ડેટા લોડ કરવામાં ભૂલ આવી' : 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute available years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add('2026');
    yearsSet.add('2025');

    bills.forEach((b) => {
      const d = b.date || b.createdAt;
      if (d && d.length >= 4) yearsSet.add(d.substring(0, 4));
    });
    purchases.forEach((p) => {
      const d = p.date || p.createdAt;
      if (d && d.length >= 4) yearsSet.add(d.substring(0, 4));
    });
    return Array.from(yearsSet).sort().reverse();
  }, [bills, purchases]);

  // Compute Month-Wise Summary List
  const monthSummaries = useMemo<MonthSummaryData[]>(() => {
    const map = new Map<string, MonthSummaryData>();

    // Helper to get or init month node
    const getOrInit = (ym: string): MonthSummaryData => {
      if (map.has(ym)) return map.get(ym)!;

      const parts = ym.split('-');
      const y = parts[0] || '2026';
      const m = parts[1] || '01';

      const node: MonthSummaryData = {
        yearMonth: ym,
        year: y,
        monthCode: m,
        monthNameEn: MONTH_NAMES_EN[m] || `Month ${m}`,
        monthNameGu: MONTH_NAMES_GU[m] || `મહિનો ${m}`,
        invoiceCount: 0,
        invoiceSubtotal: 0,
        invoiceTax: 0,
        invoiceTotal: 0,
        invoicePaid: 0,
        invoicePending: 0,
        billsList: [],
        purchaseCount: 0,
        purchaseSubtotal: 0,
        purchaseTax: 0,
        purchaseTotal: 0,
        purchasePaid: 0,
        purchasePending: 0,
        purchasesList: [],
        workerCount: 0,
        workerFixedSalaryTotal: 0,
        workerAdvancesPaid: 0,
        workerNetPayable: 0,
        workersList: [],
        netOperatingProfit: 0,
      };
      map.set(ym, node);
      return node;
    };

    // 1. Process Bills
    bills.forEach((b) => {
      const dateStr = b.date || b.createdAt || '';
      if (!dateStr || dateStr.length < 7) return;
      const ym = dateStr.substring(0, 7); // YYYY-MM
      const node = getOrInit(ym);

      node.invoiceCount += 1;
      node.invoiceSubtotal += b.subtotal || 0;
      node.invoiceTax += b.totalTax || (b.cgst || 0) + (b.sgst || 0);
      node.invoiceTotal += b.totalAmount || 0;
      node.invoicePaid += Number(b.paidAmount) || 0;
      node.invoicePending += Number(b.pendingAmount) || Math.max(0, (b.totalAmount || 0) - (b.paidAmount || 0));
      node.billsList.push(b);
    });

    // 2. Process Purchases
    purchases.forEach((p) => {
      const dateStr = p.date || p.createdAt || '';
      if (!dateStr || dateStr.length < 7) return;
      const ym = dateStr.substring(0, 7); // YYYY-MM
      const node = getOrInit(ym);

      node.purchaseCount += 1;
      node.purchaseSubtotal += p.subtotal || 0;
      node.purchaseTax += p.totalTax || (p.cgst || 0) + (p.sgst || 0);
      node.purchaseTotal += p.totalAmount || 0;
      node.purchasePaid += Number(p.paidAmount) || 0;
      node.purchasePending += Number(p.pendingAmount) || Math.max(0, (p.totalAmount || 0) - (p.paidAmount || 0));
      node.purchasesList.push(p);
    });

    // 3. Ensure all 12 months for selectedYear exist in map
    if (selectedYear !== 'ALL') {
      for (let m = 1; m <= 12; m++) {
        const mStr = m < 10 ? `0${m}` : `${m}`;
        const ym = `${selectedYear}-${mStr}`;
        getOrInit(ym);
      }
    }

    // 4. Process Worker Advances / Salary per month
    // Iterate over each month node
    map.forEach((node, ym) => {
      let monthAdvTotal = 0;
      let monthPayableTotal = 0;
      let activeWorkerCount = 0;

      const wList: { worker: Worker; monthAdvances: number; monthPayable: number }[] = [];

      workers.forEach((w) => {
        // Calculate advances taken specifically in this month
        let advInMonth = 0;
        if (w.advances && Array.isArray(w.advances) && w.advances.length > 0) {
          advInMonth = w.advances
            .filter((a) => a.date && a.date.startsWith(ym))
            .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
        } else if (w.advancePaid > 0) {
          // If no array but total advance is recorded, check if worker joined in this month or default
          if (w.joiningDate && w.joiningDate.startsWith(ym)) {
            advInMonth = w.advancePaid;
          }
        }

        const fixedSal = Number(w.monthlySalary) || 0;
        const netPayable = Math.max(0, fixedSal - advInMonth + (Number(w.bonus) || 0));

        if (fixedSal > 0 || advInMonth > 0) {
          activeWorkerCount += 1;
          monthAdvTotal += advInMonth;
          monthPayableTotal += netPayable;
          wList.push({
            worker: w,
            monthAdvances: advInMonth,
            monthPayable: netPayable,
          });
        }
      });

      node.workerCount = activeWorkerCount || workers.length;
      node.workerAdvancesPaid = monthAdvTotal;
      node.workerFixedSalaryTotal = workers.reduce((s, w) => s + (Number(w.monthlySalary) || 0), 0);
      node.workerNetPayable = monthPayableTotal;
      node.workersList = wList;

      // Operating Profit = Total Sales Revenue - Material Purchase Cost - Worker Expenses (Advances Paid or Fixed Salary)
      node.netOperatingProfit = node.invoiceTotal - node.purchaseTotal - node.workerAdvancesPaid;
    });

    // Convert map to array and sort descending by yearMonth
    let list = Array.from(map.values());

    if (selectedYear !== 'ALL') {
      list = list.filter((item) => item.year === selectedYear);
    }

    list.sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
    return list;
  }, [bills, purchases, workers, selectedYear]);

  // Yearly Summary Totals
  const yearlyOverall = useMemo(() => {
    return monthSummaries.reduce(
      (acc, m) => {
        acc.totalInvoicesCount += m.invoiceCount;
        acc.totalInvoicesAmount += m.invoiceTotal;
        acc.totalInvoicesPaid += m.invoicePaid;
        acc.totalInvoicesPending += m.invoicePending;

        acc.totalPurchasesCount += m.purchaseCount;
        acc.totalPurchasesAmount += m.purchaseTotal;
        acc.totalPurchasesPaid += m.purchasePaid;
        acc.totalPurchasesPending += m.purchasePending;

        acc.totalWorkerAdvances += m.workerAdvancesPaid;
        acc.totalWorkerSalary += m.workerFixedSalaryTotal;

        acc.totalNetOperatingProfit += m.netOperatingProfit;
        return acc;
      },
      {
        totalInvoicesCount: 0,
        totalInvoicesAmount: 0,
        totalInvoicesPaid: 0,
        totalInvoicesPending: 0,
        totalPurchasesCount: 0,
        totalPurchasesAmount: 0,
        totalPurchasesPaid: 0,
        totalPurchasesPending: 0,
        totalWorkerAdvances: 0,
        totalWorkerSalary: 0,
        totalNetOperatingProfit: 0,
      }
    );
  }, [monthSummaries]);

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const summaryRows = monthSummaries.map((m) => ({
        'Month & Year': `${m.monthNameEn} ${m.year}`,
        'Month Code': m.yearMonth,
        'Total Invoices': m.invoiceCount,
        'Invoice Subtotal': m.invoiceSubtotal,
        'Invoice GST': m.invoiceTax,
        'Total Invoice Amount (₹)': m.invoiceTotal,
        'Invoice Paid (₹)': m.invoicePaid,
        'Invoice Pending (₹)': m.invoicePending,
        'Total Purchases': m.purchaseCount,
        'Purchase Subtotal': m.purchaseSubtotal,
        'Purchase GST': m.purchaseTax,
        'Total Material Amount (₹)': m.purchaseTotal,
        'Purchase Paid (₹)': m.purchasePaid,
        'Purchase Pending (₹)': m.purchasePending,
        'Active Workers': m.workerCount,
        'Worker Advances Paid (₹)': m.workerAdvancesPaid,
        'Net Operating Profit (₹)': m.netOperatingProfit,
      }));

      const wb = XLSX.utils.book_new();

      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Month-Wise Summary');

      // Add Invoices Sheet
      const invoicesRows = bills.map((b) => ({
        'Invoice No': b.invoiceNo,
        Date: b.date,
        Party: b.partyName,
        'Total Amount': b.totalAmount,
        'Paid Amount': b.paidAmount,
        'Pending Amount': b.pendingAmount,
        Status: b.status,
      }));
      const wsInvoices = XLSX.utils.json_to_sheet(invoicesRows);
      XLSX.utils.book_append_sheet(wb, wsInvoices, 'All Invoices');

      // Add Purchases Sheet
      const purchasesRows = purchases.map((p) => ({
        'Purchase No': p.purchaseNo,
        Date: p.date,
        Supplier: p.supplierName,
        'Total Amount': p.totalAmount,
        'Paid Amount': p.paidAmount,
        'Pending Amount': p.pendingAmount,
        Status: p.status,
      }));
      const wsPurchases = XLSX.utils.json_to_sheet(purchasesRows);
      XLSX.utils.book_append_sheet(wb, wsPurchases, 'Material Purchases');

      XLSX.writeFile(wb, `Feni_Creation_Month_Wise_Report_${selectedYear}.xlsx`);
      showNotification(isGu ? 'એક્સપોર્ટ સફળતાપૂર્વક પૂર્ણ થયું' : 'Excel exported successfully', 'success');
    } catch (e) {
      showNotification(isGu ? 'એક્સપોર્ટ એરર' : 'Failed to export Excel', 'error');
    }
  };

  // Export to PDF
  const handleDownloadPdf = () => {
    if (!pdfContainerRef.current) return;
    setPdfGenerating(true);

    const element = pdfContainerRef.current;
    const opt = {
      margin: [8, 8, 8, 8] as [number, number, number, number],
      filename: `Month_Wise_Summary_Report_${selectedYear}_${Date.now()}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'landscape' as const },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(() => {
        setPdfGenerating(false);
        showNotification(isGu ? 'PDF ડાઉનલોડ સફળ થયું' : 'PDF downloaded successfully', 'success');
      })
      .catch((err: any) => {
        setPdfGenerating(false);
        showNotification(isGu ? 'PDF જનરેટ કરવામાં ભૂલ આવી' : 'Failed to generate PDF', 'error');
      });
  };

  return (
    <Box sx={{ fontFamily: fontStack, pb: 6 }}>
      {/* Page Title & Controls Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box
              sx={{
                bgcolor: '#3b82f6',
                color: '#ffffff',
                p: 1,
                borderRadius: '12px',
                display: 'flex',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              }}
            >
              <CalendarIcon sx={{ fontSize: 28 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', fontFamily: fontStack }}>
              {isGu ? 'મહિનાવાર સમરી રિપોર્ટ' : 'Month-Wise Summary Report'}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#64748b', fontFamily: fontStack }}>
            {isGu
              ? 'કુલ ઇનવોઇસ (વેચાણ), કુલ મટીરીયલ ખરીદી, અને કારીગર પગારનો મહિનાવાર રિપોર્ટ'
              : 'Consolidated Month-by-Month Analytics for Total Invoices, Material Purchases, and Worker Salaries'}
          </Typography>
        </Box>

        {/* Action Controls */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
          {/* Year Selector */}
          <TextField
            select
            size="small"
            label={isGu ? 'વર્ષ પસંદ કરો' : 'Select Year'}
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            sx={{
              minWidth: 140,
              bgcolor: '#ffffff',
              borderRadius: '8px',
              '& .MuiOutlinedInput-root': {
                fontWeight: 700,
              },
            }}
          >
            <MenuItem value="ALL">{isGu ? 'તમામ વર્ષો (All Years)' : 'All Years'}</MenuItem>
            {availableYears.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </TextField>

          <Button
            variant="outlined"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={fetchData}
            sx={{ fontWeight: 700, borderRadius: '8px', textTransform: 'none' }}
          >
            {isGu ? 'રીફ્રેશ' : 'Refresh'}
          </Button>

          <Button
            variant="outlined"
            color="success"
            startIcon={<ExcelIcon />}
            onClick={handleExportExcel}
            sx={{ fontWeight: 700, borderRadius: '8px', textTransform: 'none' }}
          >
            {isGu ? 'એક્સપોર્ટ એક્સેલ' : 'Export Excel'}
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={pdfGenerating ? <CircularProgress size={20} color="inherit" /> : <PdfIcon />}
            onClick={handleDownloadPdf}
            disabled={pdfGenerating || loading}
            sx={{
              fontWeight: 800,
              borderRadius: '8px',
              textTransform: 'none',
              bgcolor: '#1e293b',
              '&:hover': { bgcolor: '#0f172a' },
              boxShadow: '0 4px 12px rgba(30, 41, 59, 0.3)',
            }}
          >
            {isGu ? 'ડાઉનલોડ PDF' : 'Download PDF'}
          </Button>
        </Box>
      </Box>

      {/* KPI Overview Summary Cards Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2.5, mb: 3.5 }}>
        {/* Total Invoices (Sales) Card */}
        <Box>
          <Card
            elevation={0}
            sx={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              p: 2,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#2563eb', fontFamily: fontStack }}>
                {isGu ? 'કુલ ઇનવોઇસ (વેચાણ)' : 'TOTAL INVOICES (SALES)'}
              </Typography>
              <Box sx={{ bgcolor: '#eff6ff', color: '#2563eb', p: 1, borderRadius: '10px' }}>
                <InvoiceIcon fontSize="small" />
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a', mb: 1 }}>
              {formatRupees(yearlyOverall.totalInvoicesAmount)}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px dashed #e2e8f0' }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
                {isGu ? 'ઇનવોઇસ સંખ્યા:' : 'Total Bills:'} <strong>{yearlyOverall.totalInvoicesCount}</strong>
              </Typography>
              <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 800 }}>
                {isGu ? 'જમા:' : 'Paid:'} {formatRupees(yearlyOverall.totalInvoicesPaid)}
              </Typography>
            </Box>
          </Card>
        </Box>

        {/* Total Material Purchase Card */}
        <Box>
          <Card
            elevation={0}
            sx={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              p: 2,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#7c3aed', fontFamily: fontStack }}>
                {isGu ? 'કુલ મટીરીયલ ખરીદી' : 'TOTAL MATERIAL PURCHASE'}
              </Typography>
              <Box sx={{ bgcolor: '#f5f3ff', color: '#7c3aed', p: 1, borderRadius: '10px' }}>
                <PurchaseIcon fontSize="small" />
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a', mb: 1 }}>
              {formatRupees(yearlyOverall.totalPurchasesAmount)}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px dashed #e2e8f0' }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
                {isGu ? 'ખરીદી ચલણ:' : 'Purchases:'} <strong>{yearlyOverall.totalPurchasesCount}</strong>
              </Typography>
              <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 800 }}>
                {isGu ? 'બાકી:' : 'Pending:'} {formatRupees(yearlyOverall.totalPurchasesPending)}
              </Typography>
            </Box>
          </Card>
        </Box>

        {/* Worker Expenses / Upad Card */}
        <Box>
          <Card
            elevation={0}
            sx={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              p: 2,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#ea580c', fontFamily: fontStack }}>
                {isGu ? 'કારીગર ઉપાડ / પગાર' : 'WORKER SALARY & UPAD'}
              </Typography>
              <Box sx={{ bgcolor: '#fff7ed', color: '#ea580c', p: 1, borderRadius: '10px' }}>
                <WorkerIcon fontSize="small" />
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a', mb: 1 }}>
              {formatRupees(yearlyOverall.totalWorkerAdvances)}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1, borderTop: '1px dashed #e2e8f0' }}>
              <Typography variant="caption" sx={{ color: '#2563eb', fontWeight: 800 }}>
                {isGu ? 'ફિક્સ પગાર:' : 'Fixed Sal:'} {formatRupees(yearlyOverall.totalWorkerSalary)}
              </Typography>
            </Box>
          </Card>
        </Box>

        {/* Net Operating Balance Card */}
        <Box>
          <Card
            elevation={0}
            sx={{
              borderRadius: '16px',
              border: `1px solid ${yearlyOverall.totalNetOperatingProfit >= 0 ? '#bbf7d0' : '#fecaca'}`,
              bgcolor: yearlyOverall.totalNetOperatingProfit >= 0 ? '#f0fdf4' : '#fef2f2',
              p: 2,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 800,
                  color: yearlyOverall.totalNetOperatingProfit >= 0 ? '#15803d' : '#b91c1c',
                  fontFamily: fontStack,
                }}
              >
                {isGu ? 'ચોખ્ખો નફો / નેટ બેલેન્સ' : 'NET OPERATING PROFIT'}
              </Typography>
              <Box
                sx={{
                  bgcolor: yearlyOverall.totalNetOperatingProfit >= 0 ? '#dcfce7' : '#fee2e2',
                  color: yearlyOverall.totalNetOperatingProfit >= 0 ? '#15803d' : '#b91c1c',
                  p: 1,
                  borderRadius: '10px',
                }}
              >
                <ProfitIcon fontSize="small" />
              </Box>
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 900,
                color: yearlyOverall.totalNetOperatingProfit >= 0 ? '#15803d' : '#b91c1c',
                mb: 1,
              }}
            >
              {formatRupees(yearlyOverall.totalNetOperatingProfit)}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px dashed #cbd5e1' }}>
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700 }}>
                {isGu ? 'ગણતરી:' : 'Formula:'} Sales - Purchase - Upad
              </Typography>
              <Chip
                size="small"
                label={yearlyOverall.totalNetOperatingProfit >= 0 ? 'PROFIT' : 'DEFICIT'}
                sx={{
                  fontWeight: 800,
                  fontSize: '0.65rem',
                  bgcolor: yearlyOverall.totalNetOperatingProfit >= 0 ? '#16a34a' : '#dc2626',
                  color: '#ffffff',
                  height: 20,
                }}
              />
            </Box>
          </Card>
        </Box>
      </Box>

      {/* Month-Wise Consolidated Main Table Card */}
      <Card
        elevation={0}
        sx={{
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          bgcolor: '#ffffff',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        }}
      >
        <Box
          sx={{
            p: 2.5,
            bgcolor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CalendarIcon sx={{ color: '#60a5fa' }} />
            <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: fontStack, letterSpacing: '0.3px' }}>
              {isGu
                ? `મહિનાવાર એકત્રિત રિપોર્ટ કલેક્શન (${selectedYear === 'ALL' ? 'તમામ વર્ષો' : selectedYear})`
                : `Month-Wise Consolidated Statement (${selectedYear === 'ALL' ? 'All Years' : selectedYear})`}
            </Typography>
          </Box>
          <Chip
            label={isGu ? `${monthSummaries.length} મહિનાઓ` : `${monthSummaries.length} Months Records`}
            sx={{ bgcolor: '#1e293b', color: '#93c5fd', fontWeight: 800 }}
          />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress color="primary" />
          </Box>
        ) : (
          <TableContainer>
            <Table
              sx={{
                minWidth: 950,
                fontFamily: fontStack,
                '& .MuiTableCell-root': {
                  px: 2,
                  py: 1.6,
                  borderColor: '#f1f5f9',
                  fontFamily: fontStack,
                },
              }}
            >
              <TableHead>
                <TableRow sx={{ bgcolor: '#1e293b' }}>
                  <TableCell
                    sx={{
                      color: '#ffffff !important',
                      fontWeight: 800,
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      width: '4%',
                    }}
                  >
                    #
                  </TableCell>
                  <TableCell
                    sx={{
                      color: '#ffffff !important',
                      fontWeight: 800,
                      textAlign: 'left',
                      verticalAlign: 'middle',
                      width: '14%',
                    }}
                  >
                    {isGu ? 'મહિનો અને વર્ષ' : 'Month & Year'}
                  </TableCell>

                  {/* Billing Invoices */}
                  <TableCell
                    sx={{
                      color: '#60a5fa !important',
                      fontWeight: 800,
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      width: '9%',
                    }}
                  >
                    {isGu ? 'ઇનવોઇસ સંખ્યા' : 'Invoices'}
                  </TableCell>
                  <TableCell
                    sx={{
                      color: '#ffffff !important',
                      fontWeight: 800,
                      textAlign: 'right',
                      verticalAlign: 'middle',
                      width: '13%',
                    }}
                  >
                    {isGu ? 'કુલ ઇનવોઇસ રકમ' : 'Total Sales (₹)'}
                  </TableCell>

                  {/* Material Purchase */}
                  <TableCell
                    sx={{
                      color: '#c084fc !important',
                      fontWeight: 800,
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      width: '9%',
                    }}
                  >
                    {isGu ? 'ખરીદી ચલણ' : 'Purchases'}
                  </TableCell>
                  <TableCell
                    sx={{
                      color: '#ffffff !important',
                      fontWeight: 800,
                      textAlign: 'right',
                      verticalAlign: 'middle',
                      width: '13%',
                    }}
                  >
                    {isGu ? 'કુલ ખરીદી રકમ' : 'Total Purchase (₹)'}
                  </TableCell>

                  {/* Worker Expenses */}
                  <TableCell
                    sx={{
                      color: '#fb923c !important',
                      fontWeight: 800,
                      textAlign: 'right',
                      verticalAlign: 'middle',
                      width: '13%',
                    }}
                  >
                    {isGu ? 'કારીગર ઉપાડ/પગાર' : 'Worker Advances (₹)'}
                  </TableCell>

                  {/* Net Operating Balance */}
                  <TableCell
                    sx={{
                      color: '#4ade80 !important',
                      fontWeight: 800,
                      textAlign: 'right',
                      verticalAlign: 'middle',
                      width: '14%',
                    }}
                  >
                    {isGu ? 'નેટ ઓપરેટિંગ નફો' : 'Net Operating Profit (₹)'}
                  </TableCell>

                  {/* Action */}
                  <TableCell
                    sx={{
                      color: '#ffffff !important',
                      fontWeight: 800,
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      width: '11%',
                    }}
                  >
                    {isGu ? 'એક્શન' : 'Action'}
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {monthSummaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4, color: '#64748b' }}>
                      {isGu ? 'કોઈ મહિનાવાર રેકોર્ડ મળ્યો નથી' : 'No month-wise records found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  monthSummaries.map((m, idx) => {
                    const isProfit = m.netOperatingProfit >= 0;
                    return (
                      <TableRow
                        key={m.yearMonth}
                        hover
                        sx={{
                          bgcolor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                          '&:hover': { bgcolor: '#f1f5f9' },
                        }}
                      >
                        <TableCell align="center" sx={{ fontWeight: 700, color: '#64748b' }}>
                          {idx + 1}
                        </TableCell>

                        {/* Month & Year */}
                        <TableCell align="left" sx={{ fontWeight: 800, color: '#0f172a' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CalendarIcon fontSize="small" sx={{ color: '#3b82f6' }} />
                            <span>{isGu ? `${m.monthNameGu} ${m.year}` : `${m.monthNameEn} ${m.year}`}</span>
                          </Box>
                        </TableCell>

                        {/* Invoices Count & Total */}
                        <TableCell align="center" sx={{ fontWeight: 700, color: '#2563eb' }}>
                          <Chip
                            label={m.invoiceCount}
                            size="small"
                            sx={{
                              bgcolor: m.invoiceCount > 0 ? '#dbeafe' : '#f1f5f9',
                              color: m.invoiceCount > 0 ? '#1d4ed8' : '#94a3b8',
                              fontWeight: 800,
                              minWidth: 32,
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a' }}>
                          {formatRupees(m.invoiceTotal)}
                        </TableCell>

                        {/* Purchase Count & Total */}
                        <TableCell align="center" sx={{ fontWeight: 700, color: '#7c3aed' }}>
                          <Chip
                            label={m.purchaseCount}
                            size="small"
                            sx={{
                              bgcolor: m.purchaseCount > 0 ? '#f3e8ff' : '#f1f5f9',
                              color: m.purchaseCount > 0 ? '#6b21a8' : '#94a3b8',
                              fontWeight: 800,
                              minWidth: 32,
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a' }}>
                          {formatRupees(m.purchaseTotal)}
                        </TableCell>

                        {/* Worker Advances */}
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#c2410c' }}>
                          {formatRupees(m.workerAdvancesPaid)}
                        </TableCell>

                        {/* Net Profit */}
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 900,
                            color: isProfit ? '#15803d' : '#b91c1c',
                          }}
                        >
                          <span
                            style={{
                              backgroundColor: isProfit ? '#dcfce7' : '#fee2e2',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              display: 'inline-block',
                            }}
                          >
                            {formatRupees(m.netOperatingProfit)}
                          </span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell align="center">
                          <Tooltip title={isGu ? 'વિગતવાર જુઓ' : 'View Detailed Month Breakdown'}>
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              startIcon={<ViewIcon />}
                              onClick={() => {
                                setSelectedDetailMonth(m);
                                setDetailTab(0);
                              }}
                              sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                borderRadius: '8px',
                                py: 0.5,
                                fontSize: '0.75rem',
                              }}
                            >
                              {isGu ? 'વિગત' : 'Details'}
                            </Button>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}

                {/* Grand Total Row */}
                {monthSummaries.length > 0 && (
                  <TableRow sx={{ bgcolor: '#0f172a' }}>
                    <TableCell colSpan={2} align="right" sx={{ color: '#ffffff !important', fontWeight: 900, fontSize: '0.85rem' }}>
                      {isGu ? 'કુલ સરવાળો (GRAND TOTAL):' : 'GRAND TOTAL:'}
                    </TableCell>
                    <TableCell align="center" sx={{ color: '#60a5fa !important', fontWeight: 900 }}>
                      {yearlyOverall.totalInvoicesCount}
                    </TableCell>
                    <TableCell align="right" sx={{ color: '#ffffff !important', fontWeight: 900, fontSize: '0.85rem' }}>
                      {formatRupees(yearlyOverall.totalInvoicesAmount)}
                    </TableCell>

                    <TableCell align="center" sx={{ color: '#c084fc !important', fontWeight: 900 }}>
                      {yearlyOverall.totalPurchasesCount}
                    </TableCell>
                    <TableCell align="right" sx={{ color: '#ffffff !important', fontWeight: 900, fontSize: '0.85rem' }}>
                      {formatRupees(yearlyOverall.totalPurchasesAmount)}
                    </TableCell>

                    <TableCell align="right" sx={{ color: '#fb923c !important', fontWeight: 900, fontSize: '0.85rem' }}>
                      {formatRupees(yearlyOverall.totalWorkerAdvances)}
                    </TableCell>

                    <TableCell
                      align="right"
                      sx={{
                        color: yearlyOverall.totalNetOperatingProfit >= 0 ? '#4ade80 !important' : '#fca5a5 !important',
                        fontWeight: 900,
                        fontSize: '0.88rem',
                      }}
                    >
                      {formatRupees(yearlyOverall.totalNetOperatingProfit)}
                    </TableCell>

                    <TableCell align="center" sx={{ color: '#94a3b8 !important', fontWeight: 700, fontSize: '0.75rem' }}>
                      {isGu ? 'એકત્રિત' : 'Summary'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* DETAILED MONTH DRILL-DOWN DIALOG */}
      <Dialog
        open={!!selectedDetailMonth}
        onClose={() => setSelectedDetailMonth(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden' } }}
      >
        {selectedDetailMonth && (
          <>
            <DialogTitle
              sx={{
                bgcolor: '#0f172a',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CalendarIcon sx={{ color: '#3b82f6' }} />
                <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: fontStack }}>
                  {isGu
                    ? `${selectedDetailMonth.monthNameGu} ${selectedDetailMonth.year} - વિગતવાર સમરી સ્ટેટમેન્ટ`
                    : `${selectedDetailMonth.monthNameEn} ${selectedDetailMonth.year} - Detailed Month Breakdown`}
                </Typography>
              </Box>
              <IconButton onClick={() => setSelectedDetailMonth(null)} sx={{ color: '#ffffff' }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3, bgcolor: '#f8fafc' }}>
              {/* Month Quick Metric Pills */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
                <Box>
                  <Paper sx={{ p: 2, borderRadius: '12px', bgcolor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                    <Typography variant="caption" sx={{ color: '#1d4ed8', fontWeight: 800 }}>
                      {isGu ? 'વેચાણ ઇનવોઇસ' : 'TOTAL SALES INVOICES'}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: '#0f172a', mt: 0.5 }}>
                      {formatRupees(selectedDetailMonth.invoiceTotal)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      {selectedDetailMonth.invoiceCount} Bills Generated
                    </Typography>
                  </Paper>
                </Box>

                <Box>
                  <Paper sx={{ p: 2, borderRadius: '12px', bgcolor: '#f5f3ff', border: '1px solid #ddd6fe' }}>
                    <Typography variant="caption" sx={{ color: '#6b21a8', fontWeight: 800 }}>
                      {isGu ? 'મટીરીયલ ખરીદી' : 'TOTAL MATERIAL PURCHASES'}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: '#0f172a', mt: 0.5 }}>
                      {formatRupees(selectedDetailMonth.purchaseTotal)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      {selectedDetailMonth.purchaseCount} Material Purchases
                    </Typography>
                  </Paper>
                </Box>

                <Box>
                  <Paper sx={{ p: 2, borderRadius: '12px', bgcolor: '#fff7ed', border: '1px solid #fed7aa' }}>
                    <Typography variant="caption" sx={{ color: '#c2410c', fontWeight: 800 }}>
                      {isGu ? 'કારીગર ઉપાડ' : 'WORKER ADVANCES (UPAD)'}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: '#0f172a', mt: 0.5 }}>
                      {formatRupees(selectedDetailMonth.workerAdvancesPaid)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      {selectedDetailMonth.workerCount} Active Workers
                    </Typography>
                  </Paper>
                </Box>
              </Box>

              {/* Breakdown Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={detailTab} onChange={(_, val) => setDetailTab(val)}>
                  <Tab
                    icon={<InvoiceIcon />}
                    iconPosition="start"
                    label={isGu ? `ઇનવોઇસ (${selectedDetailMonth.billsList.length})` : `Invoices (${selectedDetailMonth.billsList.length})`}
                    sx={{ fontWeight: 800, textTransform: 'none' }}
                  />
                  <Tab
                    icon={<PurchaseIcon />}
                    iconPosition="start"
                    label={isGu ? `મટીરીયલ ખરીદી (${selectedDetailMonth.purchasesList.length})` : `Purchases (${selectedDetailMonth.purchasesList.length})`}
                    sx={{ fontWeight: 800, textTransform: 'none' }}
                  />
                  <Tab
                    icon={<WorkerIcon />}
                    iconPosition="start"
                    label={isGu ? `કારીગર ઉપાડ/પગાર (${selectedDetailMonth.workersList.length})` : `Workers (${selectedDetailMonth.workersList.length})`}
                    sx={{ fontWeight: 800, textTransform: 'none' }}
                  />
                </Tabs>
              </Box>

              {/* Tab 1: Bills List */}
              {detailTab === 0 && (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#1e293b' }}>
                        <TableCell sx={{ color: '#ffffff', fontWeight: 800, textAlign: 'center' }}>#</TableCell>
                        <TableCell sx={{ color: '#ffffff', fontWeight: 800, textAlign: 'center' }}>{isGu ? 'તારીખ' : 'Date'}</TableCell>
                        <TableCell sx={{ color: '#ffffff', fontWeight: 800, textAlign: 'center' }}>{isGu ? 'બિલ નં' : 'Invoice No'}</TableCell>
                        <TableCell sx={{ color: '#ffffff', fontWeight: 800, textAlign: 'left' }}>{isGu ? 'પાર્ટી નામ' : 'Party Name'}</TableCell>
                        <TableCell sx={{ color: '#ffffff', fontWeight: 800, textAlign: 'right' }}>{isGu ? 'રકમ (₹)' : 'Total Amount (₹)'}</TableCell>
                        <TableCell sx={{ color: '#ffffff', fontWeight: 800, textAlign: 'center' }}>{isGu ? 'સ્ટેટસ' : 'Status'}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedDetailMonth.billsList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 3, color: '#64748b' }}>
                            {isGu ? 'આ મહિનામાં કોઈ વેચાણ બિલ નથી' : 'No invoices for this month.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedDetailMonth.billsList.map((b, i) => (
                          <TableRow key={b.id || i} hover>
                            <TableCell align="center">{i + 1}</TableCell>
                            <TableCell align="center">{formatDate(b.date)}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, color: '#2563eb' }}>
                              {b.invoiceNo}
                            </TableCell>
                            <TableCell align="left" sx={{ fontWeight: 700 }}>
                              {b.partyName}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800 }}>
                              {formatRupees(b.totalAmount)}
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                size="small"
                                label={b.status || 'Pending'}
                                sx={{
                                  fontWeight: 800,
                                  fontSize: '0.68rem',
                                  bgcolor: b.status === 'Paid' || b.status === 'Received' ? '#dcfce7' : '#fee2e2',
                                  color: b.status === 'Paid' || b.status === 'Received' ? '#15803d' : '#b91c1c',
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Tab 2: Purchases List */}
              {detailTab === 1 && (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#1e293b' }}>
                        <TableCell sx={{ color: '#ffffff', fontWeight: 800, textAlign: 'center' }}>#</TableCell>
                        <TableCell sx={{ color: '#ffffff', fontWeight: 800, textAlign: 'center' }}>{isGu ? 'તારીખ' : 'Date'}</TableCell>
                        <TableCell sx={{ color: '#ffffff', fontWeight: 800, textAlign: 'center' }}>{isGu ? 'ખરીદી નં' : 'Purchase No'}</TableCell>
                        <TableCell sx={{ color: '#ffffff', fontWeight: 800, textAlign: 'left' }}>{isGu ? 'સપ્લાયર / પાર્ટી' : 'Supplier Name'}</TableCell>
                        <TableCell sx={{ color: '#ffffff', fontWeight: 800, textAlign: 'right' }}>{isGu ? 'કુલ રકમ (₹)' : 'Total Amount (₹)'}</TableCell>
                        <TableCell sx={{ color: '#ffffff', fontWeight: 800, textAlign: 'center' }}>{isGu ? 'સ્ટેટસ' : 'Status'}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedDetailMonth.purchasesList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 3, color: '#64748b' }}>
                            {isGu ? 'આ મહિનામાં કોઈ મટીરીયલ ખરીદી નથી' : 'No material purchases for this month.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedDetailMonth.purchasesList.map((p, i) => (
                          <TableRow key={p.id || i} hover>
                            <TableCell align="center">{i + 1}</TableCell>
                            <TableCell align="center">{formatDate(p.date)}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, color: '#7c3aed' }}>
                              {p.purchaseNo}
                            </TableCell>
                            <TableCell align="left" sx={{ fontWeight: 700 }}>
                              {p.supplierName}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800 }}>
                              {formatRupees(p.totalAmount)}
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                size="small"
                                label={p.status || 'Pending'}
                                sx={{
                                  fontWeight: 800,
                                  fontSize: '0.68rem',
                                  bgcolor: p.status === 'Paid' ? '#dcfce7' : '#fee2e2',
                                  color: p.status === 'Paid' ? '#15803d' : '#b91c1c',
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Tab 3: Workers List */}
              {detailTab === 2 && (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#1e293b' }}>
                        <TableCell sx={{ color: '#ffffff', fontWeight: 800, textAlign: 'center' }}>#</TableCell>
                        <TableCell sx={{ color: '#ffffff', fontWeight: 800, textAlign: 'left' }}>{isGu ? 'કારીગર નામ' : 'Worker Name'}</TableCell>
                        <TableCell sx={{ color: '#ffffff', fontWeight: 800, textAlign: 'center' }}>{isGu ? 'હોદ્દો (Role)' : 'Role'}</TableCell>
                        <TableCell sx={{ color: '#ffffff', fontWeight: 800, textAlign: 'right' }}>{isGu ? 'ફિક્સ પગાર (₹)' : 'Monthly Salary (₹)'}</TableCell>
                        <TableCell sx={{ color: '#ffffff', fontWeight: 800, textAlign: 'right' }}>{isGu ? 'આ મહિનાનો ઉપાડ (₹)' : 'Month Advance/Upad (₹)'}</TableCell>
                        <TableCell sx={{ color: '#ffffff', fontWeight: 800, textAlign: 'right' }}>{isGu ? 'ચૂકવવાપાત્ર બાકી (₹)' : 'Net Payable (₹)'}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedDetailMonth.workersList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 3, color: '#64748b' }}>
                            {isGu ? 'કોઈ કારીગર વિગત નથી' : 'No worker records for this month.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedDetailMonth.workersList.map((item, i) => (
                          <TableRow key={item.worker.id || i} hover>
                            <TableCell align="center">{i + 1}</TableCell>
                            <TableCell align="left" sx={{ fontWeight: 800, color: '#0f172a' }}>
                              {item.worker.name}
                            </TableCell>
                            <TableCell align="center">{item.worker.role || 'Staff'}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              {formatRupees(item.worker.monthlySalary)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, color: '#c2410c' }}>
                              {formatRupees(item.monthAdvances)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, color: '#15803d' }}>
                              {formatRupees(item.monthPayable)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DialogContent>

            <DialogActions sx={{ p: 2, bgcolor: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
              <Button onClick={() => setSelectedDetailMonth(null)} variant="outlined" sx={{ fontWeight: 800, textTransform: 'none' }}>
                {isGu ? 'બંધ કરો' : 'Close'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* PRINT / PDF EXPORT CONTAINER (HIDDEN OFF-SCREEN) */}
      <Box sx={{ position: 'absolute', top: -9999, left: -9999 }}>
        <div
          ref={pdfContainerRef}
          style={{
            width: '280mm',
            padding: '12mm',
            backgroundColor: '#ffffff',
            fontFamily: fontStack,
            color: '#0f172a',
            boxSizing: 'border-box',
          }}
        >
          {/* Company Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" style={{ width: '50px', height: '50px', objectFit: 'contain' }} />
              ) : (
                <div style={{ width: '48px', height: '48px', backgroundColor: '#0f172a', color: '#ffffff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '20px' }}>
                  FC
                </div>
              )}
              <div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#0f172a', letterSpacing: '0.5px' }}>
                  {settings.companyName || 'FENI CREATION'}
                </h1>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#475569', fontWeight: 600 }}>
                  {settings.tagline || 'Embroidery & Textile Manufacturing'}
                </p>
                <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#64748b' }}>
                  GSTIN: <strong>{settings.gstin || '24ABCDE1234F1Z5'}</strong> | Mobile: {settings.phone || '+91 98765 43210'}
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-block' }}>
                MONTH-WISE SUMMARY STATEMENT
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '11px', fontWeight: 700, color: '#334155' }}>
                Financial Period: {selectedYear === 'ALL' ? 'All Years' : `Year ${selectedYear}`}
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#64748b' }}>
                Report Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* KPI Summary Row */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <div style={{ flex: 1, padding: '10px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#1d4ed8', fontWeight: 800 }}>TOTAL INVOICES (SALES)</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>{formatRupees(yearlyOverall.totalInvoicesAmount)}</div>
              <div style={{ fontSize: '9px', color: '#475569', marginTop: '2px' }}>{yearlyOverall.totalInvoicesCount} Total Bills</div>
            </div>

            <div style={{ flex: 1, padding: '10px', backgroundColor: '#f5f3ff', borderRadius: '8px', border: '1px solid #ddd6fe', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#6b21a8', fontWeight: 800 }}>TOTAL MATERIAL PURCHASES</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>{formatRupees(yearlyOverall.totalPurchasesAmount)}</div>
              <div style={{ fontSize: '9px', color: '#475569', marginTop: '2px' }}>{yearlyOverall.totalPurchasesCount} Total Purchases</div>
            </div>

            <div style={{ flex: 1, padding: '10px', backgroundColor: '#fff7ed', borderRadius: '8px', border: '1px solid #fed7aa', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#c2410c', fontWeight: 800 }}>WORKER ADVANCES (UPAD)</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>{formatRupees(yearlyOverall.totalWorkerAdvances)}</div>
              <div style={{ fontSize: '9px', color: '#475569', marginTop: '2px' }}>{workers.length} Active Workers</div>
            </div>

            <div style={{ flex: 1, padding: '10px', backgroundColor: yearlyOverall.totalNetOperatingProfit >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: '8px', border: `1px solid ${yearlyOverall.totalNetOperatingProfit >= 0 ? '#bbf7d0' : '#fecaca'}`, textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: yearlyOverall.totalNetOperatingProfit >= 0 ? '#15803d' : '#b91c1c', fontWeight: 800 }}>NET OPERATING PROFIT</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: yearlyOverall.totalNetOperatingProfit >= 0 ? '#15803d' : '#b91c1c', marginTop: '2px' }}>{formatRupees(yearlyOverall.totalNetOperatingProfit)}</div>
              <div style={{ fontSize: '9px', color: '#475569', marginTop: '2px' }}>Sales - Purchase - Upad</div>
            </div>
          </div>

          {/* Main Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>
                <th style={{ padding: '8px 6px', textAlign: 'center', width: '5%', fontWeight: 800 }}>#</th>
                <th style={{ padding: '8px 8px', textAlign: 'left', width: '18%', fontWeight: 800 }}>Month & Year</th>
                <th style={{ padding: '8px 6px', textAlign: 'center', width: '10%', fontWeight: 800 }}>Invoices</th>
                <th style={{ padding: '8px 8px', textAlign: 'right', width: '16%', fontWeight: 800 }}>Total Sales (₹)</th>
                <th style={{ padding: '8px 6px', textAlign: 'center', width: '10%', fontWeight: 800 }}>Purchases</th>
                <th style={{ padding: '8px 8px', textAlign: 'right', width: '16%', fontWeight: 800 }}>Total Purchase (₹)</th>
                <th style={{ padding: '8px 8px', textAlign: 'right', width: '15%', fontWeight: 800 }}>Worker Advances (₹)</th>
                <th style={{ padding: '8px 8px', textAlign: 'right', width: '18%', fontWeight: 800 }}>Net Profit (₹)</th>
              </tr>
            </thead>
            <tbody>
              {monthSummaries.map((m, idx) => {
                const isProfit = m.netOperatingProfit >= 0;
                return (
                  <tr key={m.yearMonth} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 800, color: '#0f172a' }}>{m.monthNameEn} {m.year}</td>
                    <td style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 800, color: '#2563eb' }}>{m.invoiceCount}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 800 }}>{formatRupees(m.invoiceTotal)}</td>
                    <td style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 800, color: '#7c3aed' }}>{m.purchaseCount}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 800 }}>{formatRupees(m.purchaseTotal)}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: '#c2410c' }}>{formatRupees(m.workerAdvancesPaid)}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 900, color: isProfit ? '#15803d' : '#b91c1c' }}>
                      {formatRupees(m.netOperatingProfit)}
                    </td>
                  </tr>
                );
              })}

              <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                <td colSpan={2} style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 900, fontSize: '11px' }}>GRAND TOTAL SUMMARY:</td>
                <td style={{ padding: '9px 6px', textAlign: 'center', fontWeight: 900, color: '#60a5fa' }}>{yearlyOverall.totalInvoicesCount}</td>
                <td style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 900, fontSize: '11px' }}>{formatRupees(yearlyOverall.totalInvoicesAmount)}</td>
                <td style={{ padding: '9px 6px', textAlign: 'center', fontWeight: 900, color: '#c084fc' }}>{yearlyOverall.totalPurchasesCount}</td>
                <td style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 900, fontSize: '11px' }}>{formatRupees(yearlyOverall.totalPurchasesAmount)}</td>
                <td style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 900, color: '#fb923c', fontSize: '11px' }}>{formatRupees(yearlyOverall.totalWorkerAdvances)}</td>
                <td style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 900, color: yearlyOverall.totalNetOperatingProfit >= 0 ? '#4ade80' : '#fca5a5', fontSize: '12px' }}>
                  {formatRupees(yearlyOverall.totalNetOperatingProfit)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Footer Signature */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '30px', paddingTop: '16px', borderTop: '1px solid #cbd5e1' }}>
            <div style={{ fontSize: '10px', color: '#64748b' }}>
              <p style={{ margin: 0, fontWeight: 700 }}>{settings.companyName || 'FENI CREATION'} - Billing & Accounting System</p>
              <p style={{ margin: '2px 0 0 0' }}>Address: {settings.address || 'GIDC Industrial Estate, Varachha, Surat, Gujarat'}</p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ height: '35px' }}></div>
              <div style={{ width: '180px', borderTop: '1.5px solid #0f172a', paddingTop: '4px', fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>
      </Box>
    </Box>
  );
};

export default MonthWiseReportPage;
