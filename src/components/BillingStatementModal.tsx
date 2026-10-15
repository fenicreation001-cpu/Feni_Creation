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
} from '@mui/material';
import {
  Print as PrintIcon,
  PictureAsPdf as PdfIcon,
  Close as CloseIcon,
  FileDownload as ExcelIcon,
  ViewAgenda as PagesViewIcon,
  TableRows as TableViewIcon,
  ReceiptLong as InvoiceIcon,
} from '@mui/icons-material';
import { Bill, CompanySettings } from '../types';
import { formatRupees, formatDate, numberToWords } from '../utils/formatters';
import { getBillCalculatedTotals } from '../utils/billCalculations';
import { useThemeContext } from '../context/ThemeContext';
import { useCompany } from '../context/CompanyContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

export interface BillingStatementModalProps {
  open: boolean;
  onClose: () => void;
  bills: Bill[];
  selectedMonth: string;
  monthLabel: string;
  selectedPartyFilter?: string;
  selectedStatusFilter?: string;
  settings?: CompanySettings;
  language?: 'en' | 'gu';
}

interface FlatBillRow {
  srNo: number | '';
  invoiceDate: string;
  invoiceNo: string;
  partyName: string;
  particulars: string;
  quantityStr: string;
  rateStr: string;
  subtotal: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  statusText: string;
}

export const BillingStatementModal: React.FC<BillingStatementModalProps> = ({
  open,
  onClose,
  bills,
  selectedMonth,
  monthLabel,
  selectedPartyFilter,
  selectedStatusFilter,
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

  const [viewMode, setViewMode] = useState<'pages' | 'continuous'>('pages');
  const [selectedPreviewPage, setSelectedPreviewPage] = useState<number | 'all'>('all');
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');

  // 1. Flatten bill items into rows
  const { flatRows, summaryTotals } = useMemo(() => {
    const rows: FlatBillRow[] = [];
    let totSubtotal = 0;
    let totTax = 0;
    let totAmount = 0;
    let totPaid = 0;
    let totPending = 0;
    let globalSr = 1;

    bills.forEach((bill) => {
      const calc = getBillCalculatedTotals(bill);
      const sub = calc.subtotal;
      const tax = calc.totalTax;
      const tot = calc.totalAmount;
      const paid = Number(bill.paidAmount) || 0;
      const pending = Math.max(0, tot - paid);

      totSubtotal += sub;
      totTax += tax;
      totAmount += tot;
      totPaid += paid;
      totPending += pending;

      const isPaid = bill.status === 'Paid' || bill.status === 'Received' || pending <= 0;
      const isPartial = !isPaid && paid > 0;
      const statusText = isPaid ? 'Paid' : isPartial ? 'Partial' : 'Pending';

      const items = bill.items && bill.items.length > 0 ? bill.items : null;

      if (!items) {
        rows.push({
          srNo: globalSr,
          invoiceDate: formatDate(bill.date || bill.createdAt),
          invoiceNo: bill.invoiceNo || 'INV-Bill',
          partyName: bill.partyName || 'Customer',
          particulars: bill.notes || (isGu ? 'કાપડ જોબવર્ક / એમ્બ્રોઇડરી' : 'Embroidery Jobwork'),
          quantityStr: '-',
          rateStr: '-',
          subtotal: sub,
          tax: tax,
          totalAmount: tot,
          paidAmount: paid,
          pendingAmount: pending,
          statusText,
        });
      } else {
        items.forEach((item, itemIdx) => {
          const itemQty = Number(item.quantity) || 0;
          const itemRate = Number(item.rate) || 0;
          const itemAmt = Number(item.amount) || itemQty * itemRate;

          rows.push({
            srNo: itemIdx === 0 ? globalSr : '',
            invoiceDate: formatDate(bill.date || bill.createdAt),
            invoiceNo: itemIdx === 0 ? bill.invoiceNo || 'INV-Bill' : '',
            partyName: itemIdx === 0 ? bill.partyName || 'Customer' : '',
            particulars: item.description || item.designNo ? `Design ${item.designNo || ''} - ${item.description || ''}` : bill.notes || '-',
            quantityStr: itemQty > 0 ? `${itemQty} ${item.unit || 'Mtr'}` : '-',
            rateStr: itemRate > 0 ? `₹${itemRate}` : '-',
            subtotal: itemAmt,
            tax: itemIdx === 0 ? tax : 0,
            totalAmount: itemIdx === 0 ? tot : 0,
            paidAmount: itemIdx === 0 ? paid : 0,
            pendingAmount: itemIdx === 0 ? pending : 0,
            statusText: itemIdx === 0 ? statusText : '',
          });
        });
      }

      globalSr++;
    });

    return {
      flatRows: rows,
      summaryTotals: {
        totalInvoices: bills.length,
        totalSubtotal: totSubtotal,
        totalTax: totTax,
        totalAmount: totAmount,
        paidAmount: totPaid,
        pendingAmount: totPending,
      },
    };
  }, [bills, isGu]);

  // 2. Dynamic pagination for A4 Landscape
  const pages = useMemo(() => {
    const totalRows = flatRows.length;
    if (totalRows === 0) return [[]];

    const MAX_P1 = 15;
    const MAX_OTHER = 18;

    const p: FlatBillRow[][] = [];
    if (totalRows <= MAX_P1) {
      p.push(flatRows);
    } else {
      p.push(flatRows.slice(0, MAX_P1));
      let cur = MAX_P1;
      while (cur < totalRows) {
        p.push(flatRows.slice(cur, cur + MAX_OTHER));
        cur += MAX_OTHER;
      }
    }
    return p;
  }, [flatRows]);

  const totalPagesCount = pages.length;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!pdfExportRef.current || downloading) return;
    setDownloading(true);
    setDownloadProgress(isGu ? 'A4 સેલ્સ સ્ટેટમેન્ટ PDF તૈયાર થઈ રહ્યું છે...' : 'Preparing A4 Sales PDF Statement...');

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

      const cleanMonth = monthLabel.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Textile_Sales_Statement_${cleanMonth}.pdf`;

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
      console.error('Error generating A4 Sales PDF:', err);
    } finally {
      setDownloading(false);
      setDownloadProgress('');
    }
  };

  const handleExportExcel = () => {
    const data = flatRows.map((r) => ({
      'Sr No': r.srNo,
      'Invoice Date': r.invoiceDate,
      'Invoice No': r.invoiceNo,
      'Customer Party': r.partyName,
      'Description / Design': r.particulars,
      'Quantity': r.quantityStr,
      'Rate': r.rateStr,
      'Subtotal (₹)': r.subtotal,
      'GST Tax (₹)': r.tax,
      'Total Amount (₹)': r.totalAmount,
      'Paid (₹)': r.paidAmount,
      'Pending (₹)': r.pendingAmount,
      'Status': r.statusText,
    }));

    data.push({
      'Sr No': '' as any,
      'Invoice Date': '',
      'Invoice No': '',
      'Customer Party': 'GRAND TOTAL',
      'Description / Design': '',
      'Quantity': '',
      'Rate': '',
      'Subtotal (₹)': summaryTotals.totalSubtotal,
      'GST Tax (₹)': summaryTotals.totalTax,
      'Total Amount (₹)': summaryTotals.totalAmount,
      'Paid (₹)': summaryTotals.paidAmount,
      'Pending (₹)': summaryTotals.pendingAmount,
      'Status': '',
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Statement');
    XLSX.writeFile(workbook, `Textile_Sales_Statement_${monthLabel.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  };

  // Header
  const renderHeader = (isFirstPage: boolean, pageNum: number) => {
    return isFirstPage ? (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '10px',
          marginBottom: '10px',
          borderBottom: '2.5px solid #1e40af',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          {settings?.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt="Logo"
              crossOrigin="anonymous"
              style={{ width: '52px', height: '52px', borderRadius: '8px', objectFit: 'contain', border: '1px solid #e2e8f0' }}
            />
          ) : (
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '8px',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '18px',
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
                fontSize: '22px',
                letterSpacing: '-0.3px',
                lineHeight: '1.2',
              }}
            >
              {companyName}
            </h1>
            <div style={{ fontWeight: 600, color: '#475569', fontSize: '11px', marginTop: '2px', lineHeight: '1.3' }}>
              {companySubtitle}
            </div>
            <div style={{ color: '#1e293b', fontSize: '10px', fontWeight: 600, marginTop: '3px', lineHeight: '1.3' }}>
              <span>GSTIN: <strong style={{ color: '#0f172a' }}>{gstin}</strong></span>
              <span style={{ margin: '0 6px', color: '#cbd5e1' }}>|</span>
              <span>{isGu ? 'મોબાઇલ' : 'Mobile'}: <strong style={{ color: '#0f172a' }}>{phone}</strong></span>
              <span style={{ margin: '0 6px', color: '#cbd5e1' }}>|</span>
              <span>Email: <strong>{email}</strong></span>
            </div>
            <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px', lineHeight: '1.3' }}>
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
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '8px 14px',
            minWidth: '240px',
          }}
        >
          <div
            style={{
              fontSize: '11.5px',
              fontWeight: 900,
              color: '#0f172a',
              letterSpacing: '0.4px',
              textTransform: 'uppercase',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '4px',
              marginBottom: '4px',
            }}
          >
            {isGu ? 'ટેક્સટાઇલ સેલ્સ સ્ટેટમેન્ટ' : 'TEXTILE SALES STATEMENT'}
          </div>
          <div style={{ fontSize: '10px', color: '#334155', fontWeight: 600, lineHeight: '1.4' }}>
            <span style={{ color: '#64748b' }}>{isGu ? 'સમયગાળો:' : 'Period:'}</span>{' '}
            <strong style={{ color: '#0f172a' }}>{monthLabel}</strong>
          </div>
          <div style={{ fontSize: '9.5px', color: '#64748b', fontWeight: 500, lineHeight: '1.4' }}>
            {isGu ? 'તારીખ:' : 'Date:'} {formatDate(new Date().toISOString())}
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
          <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '13px' }}>{companyName}</span>
          <span style={{ color: '#94a3b8' }}>•</span>
          <span style={{ color: '#334155', fontSize: '11px', fontWeight: 800 }}>
            {isGu ? 'ટેક્સટાઇલ સેલ્સ સ્ટેટમેન્ટ (ચાલુ)' : 'Textile Sales Statement (Contd.)'}
          </span>
          <span style={{ color: '#94a3b8' }}>•</span>
          <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600 }}>{monthLabel}</span>
        </div>
        <div style={{ fontSize: '10px', color: '#475569', fontWeight: 700 }}>
          {isGu ? `પેજ ${pageNum} / ${totalPagesCount}` : `Page ${pageNum} of ${totalPagesCount}`}
        </div>
      </div>
    );
  };

  // Summary KPI cards
  const renderSummaryCards = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '10px' }}>
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px' }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
          {isGu ? 'કુલ ઇન્વોઇસ' : 'TOTAL BILLS'}
        </div>
        <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', marginTop: '1px' }}>
          {summaryTotals.totalInvoices} {isGu ? 'બિલ' : 'Bills'}
        </div>
      </div>
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px' }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
          {isGu ? 'સબટોટલ (કર સિવાય)' : 'SUBTOTAL (TAX EXCL.)'}
        </div>
        <div style={{ fontSize: '13px', fontWeight: 900, color: '#1e40af', marginTop: '1px' }}>
          {formatRupees(summaryTotals.totalSubtotal)}
        </div>
      </div>
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px' }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
          {isGu ? 'કુલ જીએસટી ટેક્સ' : 'TOTAL GST TAX'}
        </div>
        <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', marginTop: '1px' }}>
          {formatRupees(summaryTotals.totalTax)}
        </div>
      </div>
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px' }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
          {isGu ? 'જમા રકમ (વસૂલાત)' : 'AMOUNT COLLECTED'}
        </div>
        <div style={{ fontSize: '13px', fontWeight: 900, color: '#16a34a', marginTop: '1px' }}>
          {formatRupees(summaryTotals.paidAmount)}
        </div>
      </div>
      <div style={{ backgroundColor: '#ffffff', border: '1.5px solid #fca5a5', borderRadius: '6px', padding: '6px 10px' }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}>
          {isGu ? 'બાકી ઉઘરાણી' : 'PENDING RECEIVABLES'}
        </div>
        <div style={{ fontSize: '13px', fontWeight: 900, color: '#dc2626', marginTop: '1px' }}>
          {formatRupees(summaryTotals.pendingAmount)}
        </div>
      </div>
    </div>
  );

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
          <InvoiceIcon sx={{ color: '#1e40af', fontSize: 24 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {isGu ? 'ટેક્સટાઇલ સેલ્સ બિલિંગ સ્ટેટમેન્ટ' : 'Textile Sales Billing Statement'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {monthLabel} • {isGu ? 'A4 સાઇઝ પ્રિન્ટ અને PDF ડાઉનલોડ' : 'A4 Landscape Print & PDF'}
            </Typography>
          </Box>
        </Box>

        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Action Toolbar */}
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
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
                '&.Mui-selected': { bgcolor: '#1e40af', color: '#ffffff' },
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

          {viewMode === 'pages' && totalPagesCount > 1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip
                label={isGu ? 'તમામ' : 'All'}
                size="small"
                onClick={() => setSelectedPreviewPage('all')}
                color={selectedPreviewPage === 'all' ? 'primary' : 'default'}
                variant={selectedPreviewPage === 'all' ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, cursor: 'pointer', height: 24, fontSize: '0.72rem' }}
              />
              {pages.map((_, idx) => (
                <Chip
                  key={idx}
                  label={`${idx + 1}`}
                  size="small"
                  onClick={() => setSelectedPreviewPage(idx + 1)}
                  color={selectedPreviewPage === idx + 1 ? 'primary' : 'default'}
                  variant={selectedPreviewPage === idx + 1 ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 700, cursor: 'pointer', height: 24, fontSize: '0.72rem' }}
                />
              ))}
            </Box>
          )}

          <Chip
            label={monthLabel}
            size="small"
            sx={{ fontWeight: 800, bgcolor: '#dbeafe', color: '#1e40af', borderRadius: '6px' }}
          />
        </Box>

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
              bgcolor: '#1e40af',
              '&:hover': { bgcolor: '#1e3a8a' },
            }}
          >
            {downloading ? downloadProgress || (isGu ? 'PDF ડાઉનલોડ...' : 'Downloading...') : (isGu ? 'A4 PDF ડાઉનલોડ' : 'Download A4 PDF')}
          </Button>
        </Box>
      </Box>

      {/* Content Preview */}
      <DialogContent sx={{ p: { xs: 1.5, sm: 2.5 }, overflowY: 'auto' }}>
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
              {renderHeader(true, 1)}
              {renderSummaryCards()}

              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #cbd5e1',
                  marginBottom: '10px',
                  fontFamily: fontStack,
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#1e40af', color: '#ffffff' }}>
                    <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'center', width: '35px' }}>SR</th>
                    <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'left', width: '75px' }}>DATE</th>
                    <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'left', width: '85px' }}>INV NO</th>
                    <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'left', width: '160px' }}>PARTY NAME</th>
                    <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'left' }}>DESCRIPTION / DESIGN</th>
                    <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'right', width: '75px' }}>QTY</th>
                    <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'right', width: '65px' }}>RATE</th>
                    <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'right', width: '85px' }}>TAX</th>
                    <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'right', width: '95px' }}>TOTAL</th>
                    <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'right', width: '85px' }}>PAID</th>
                    <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'right', width: '90px' }}>DUE</th>
                    <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'center', width: '70px' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {flatRows.map((r, idx) => (
                    <tr
                      key={idx}
                      style={{
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                      }}
                    >
                      <td style={{ padding: '5px 8px', fontSize: '9px', textAlign: 'center', color: '#64748b' }}>{r.srNo}</td>
                      <td style={{ padding: '5px 8px', fontSize: '9px', color: '#1e293b' }}>{r.invoiceDate}</td>
                      <td style={{ padding: '5px 8px', fontSize: '9px', fontFamily: 'monospace', fontWeight: 700, color: '#1e40af' }}>{r.invoiceNo}</td>
                      <td style={{ padding: '5px 8px', fontSize: '9px', fontWeight: 800, color: '#0f172a' }}>{r.partyName}</td>
                      <td style={{ padding: '5px 8px', fontSize: '9px', color: '#334155' }}>{r.particulars}</td>
                      <td style={{ padding: '5px 8px', fontSize: '9px', textAlign: 'right' }}>{r.quantityStr}</td>
                      <td style={{ padding: '5px 8px', fontSize: '9px', textAlign: 'right' }}>{r.rateStr}</td>
                      <td style={{ padding: '5px 8px', fontSize: '9px', textAlign: 'right', color: '#64748b' }}>{r.tax > 0 ? formatRupees(r.tax) : '-'}</td>
                      <td style={{ padding: '5px 8px', fontSize: '9px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{r.totalAmount > 0 ? formatRupees(r.totalAmount) : '-'}</td>
                      <td style={{ padding: '5px 8px', fontSize: '9px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{r.paidAmount > 0 ? formatRupees(r.paidAmount) : '-'}</td>
                      <td style={{ padding: '5px 8px', fontSize: '9px', textAlign: 'right', fontWeight: 800, color: r.pendingAmount > 0 ? '#dc2626' : '#16a34a' }}>{r.pendingAmount > 0 ? formatRupees(r.pendingAmount) : '-'}</td>
                      <td style={{ padding: '5px 8px', fontSize: '8.5px', textAlign: 'center' }}>
                        {r.statusText && (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 5px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              backgroundColor: r.statusText === 'Paid' ? '#dcfce7' : r.statusText === 'Partial' ? '#fef3c7' : '#fee2e2',
                              color: r.statusText === 'Paid' ? '#15803d' : r.statusText === 'Partial' ? '#b45309' : '#b91c1c',
                            }}
                          >
                            {r.statusText}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Grand Totals */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#eff6ff',
                  border: '1.5px solid #1e40af',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  marginBottom: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#1e40af' }}>
                    {isGu ? 'શબ્દોમાં ચોખ્ખી બાકી રકમ:' : 'Net Pending in Words:'}
                  </div>
                  <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#0f172a', fontStyle: 'italic', marginTop: '2px' }}>
                    {numberToWords(summaryTotals.pendingAmount)} Only
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b' }}>TOTAL SALES</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e40af' }}>{formatRupees(summaryTotals.totalAmount)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b' }}>COLLECTED</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#16a34a' }}>{formatRupees(summaryTotals.paidAmount)}</div>
                  </div>
                  <div style={{ textAlign: 'right', borderLeft: '1.5px solid #cbd5e1', paddingLeft: '16px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 800, color: '#b91c1c' }}>PENDING DUE</div>
                    <div style={{ fontSize: '15px', fontWeight: 900, color: '#dc2626' }}>{formatRupees(summaryTotals.pendingAmount)}</div>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', paddingTop: '16px', marginBottom: '10px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px dashed #94a3b8', height: '20px', marginBottom: '4px' }}></div>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569' }}>{isGu ? 'તૈયાર કરનાર' : 'Prepared By'}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px dashed #94a3b8', height: '20px', marginBottom: '4px' }}></div>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569' }}>{isGu ? 'ચકાસણી કરનાર' : 'Checked By'}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px dashed #94a3b8', height: '20px', marginBottom: '4px' }}></div>
                  <div style={{ fontSize: '9px', fontWeight: 800, color: '#090d16' }}>{companyName}</div>
                  <div style={{ fontSize: '8px', color: '#1e40af', fontWeight: 700 }}>{isGu ? 'સત્તાવાર સહી' : 'Authorized Signatory'}</div>
                </div>
              </div>
            </Paper>
          ) : (
            pages.map((pageRows, pageIdx) => {
              const pageNum = pageIdx + 1;
              if (selectedPreviewPage !== 'all' && selectedPreviewPage !== pageNum) {
                return null;
              }
              const isFirstPage = pageNum === 1;
              const isLastPage = pageNum === totalPagesCount;

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
                    {renderHeader(isFirstPage, pageNum)}
                    {isFirstPage && renderSummaryCards()}

                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        border: '1px solid #cbd5e1',
                        marginBottom: '8px',
                        fontFamily: fontStack,
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: '#1e40af', color: '#ffffff' }}>
                          <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'center', width: '35px' }}>SR</th>
                          <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'left', width: '75px' }}>DATE</th>
                          <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'left', width: '85px' }}>INV NO</th>
                          <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'left', width: '160px' }}>PARTY NAME</th>
                          <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'left' }}>DESCRIPTION / DESIGN</th>
                          <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'right', width: '75px' }}>QTY</th>
                          <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'right', width: '65px' }}>RATE</th>
                          <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'right', width: '85px' }}>TAX</th>
                          <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'right', width: '95px' }}>TOTAL</th>
                          <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'right', width: '85px' }}>PAID</th>
                          <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'right', width: '90px' }}>DUE</th>
                          <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'center', width: '70px' }}>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((r, idx) => (
                          <tr
                            key={idx}
                            style={{
                              backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                              borderBottom: '1px solid #e2e8f0',
                            }}
                          >
                            <td style={{ padding: '5px 8px', fontSize: '9px', textAlign: 'center', color: '#64748b' }}>{r.srNo}</td>
                            <td style={{ padding: '5px 8px', fontSize: '9px', color: '#1e293b' }}>{r.invoiceDate}</td>
                            <td style={{ padding: '5px 8px', fontSize: '9px', fontFamily: 'monospace', fontWeight: 700, color: '#1e40af' }}>{r.invoiceNo}</td>
                            <td style={{ padding: '5px 8px', fontSize: '9px', fontWeight: 800, color: '#0f172a' }}>{r.partyName}</td>
                            <td style={{ padding: '5px 8px', fontSize: '9px', color: '#334155' }}>{r.particulars}</td>
                            <td style={{ padding: '5px 8px', fontSize: '9px', textAlign: 'right' }}>{r.quantityStr}</td>
                            <td style={{ padding: '5px 8px', fontSize: '9px', textAlign: 'right' }}>{r.rateStr}</td>
                            <td style={{ padding: '5px 8px', fontSize: '9px', textAlign: 'right', color: '#64748b' }}>{r.tax > 0 ? formatRupees(r.tax) : '-'}</td>
                            <td style={{ padding: '5px 8px', fontSize: '9px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{r.totalAmount > 0 ? formatRupees(r.totalAmount) : '-'}</td>
                            <td style={{ padding: '5px 8px', fontSize: '9px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{r.paidAmount > 0 ? formatRupees(r.paidAmount) : '-'}</td>
                            <td style={{ padding: '5px 8px', fontSize: '9px', textAlign: 'right', fontWeight: 800, color: r.pendingAmount > 0 ? '#dc2626' : '#16a34a' }}>{r.pendingAmount > 0 ? formatRupees(r.pendingAmount) : '-'}</td>
                            <td style={{ padding: '5px 8px', fontSize: '8.5px', textAlign: 'center' }}>
                              {r.statusText && (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '2px 5px',
                                    borderRadius: '4px',
                                    fontWeight: 700,
                                    backgroundColor: r.statusText === 'Paid' ? '#dcfce7' : r.statusText === 'Partial' ? '#fef3c7' : '#fee2e2',
                                    color: r.statusText === 'Paid' ? '#15803d' : r.statusText === 'Partial' ? '#b45309' : '#b91c1c',
                                  }}
                                >
                                  {r.statusText}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                    {isLastPage && (
                      <>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#eff6ff',
                            border: '1.5px solid #1e40af',
                            borderRadius: '6px',
                            padding: '8px 14px',
                            marginBottom: '12px',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#1e40af' }}>
                              {isGu ? 'શબ્દોમાં ચોખ્ખી બાકી રકમ:' : 'Net Pending in Words:'}
                            </div>
                            <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#0f172a', fontStyle: 'italic', marginTop: '2px' }}>
                              {numberToWords(summaryTotals.pendingAmount)} Only
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b' }}>TOTAL SALES</div>
                              <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e40af' }}>{formatRupees(summaryTotals.totalAmount)}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b' }}>COLLECTED</div>
                              <div style={{ fontSize: '13px', fontWeight: 800, color: '#16a34a' }}>{formatRupees(summaryTotals.paidAmount)}</div>
                            </div>
                            <div style={{ textAlign: 'right', borderLeft: '1.5px solid #cbd5e1', paddingLeft: '16px' }}>
                              <div style={{ fontSize: '9px', fontWeight: 800, color: '#b91c1c' }}>PENDING DUE</div>
                              <div style={{ fontSize: '15px', fontWeight: 900, color: '#dc2626' }}>{formatRupees(summaryTotals.pendingAmount)}</div>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', paddingTop: '16px', marginBottom: '10px' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ borderBottom: '1px dashed #94a3b8', height: '20px', marginBottom: '4px' }}></div>
                            <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569' }}>{isGu ? 'તૈયાર કરનાર' : 'Prepared By'}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ borderBottom: '1px dashed #94a3b8', height: '20px', marginBottom: '4px' }}></div>
                            <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569' }}>{isGu ? 'ચકાસણી કરનાર' : 'Checked By'}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ borderBottom: '1px dashed #94a3b8', height: '20px', marginBottom: '4px' }}></div>
                            <div style={{ fontSize: '9px', fontWeight: 800, color: '#090d16' }}>{companyName}</div>
                            <div style={{ fontSize: '8px', color: '#1e40af', fontWeight: 700 }}>{isGu ? 'સત્તાવાર સહી' : 'Authorized Signatory'}</div>
                          </div>
                        </div>
                      </>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid #e2e8f0',
                        paddingTop: '6px',
                        fontSize: '8.5px',
                        color: '#64748b',
                      }}
                    >
                      <div>
                        {isGu
                          ? 'કમ્પ્યુટર જનરેટેડ સેલ્સ સ્ટેટમેન્ટ • ફેની ક્રિએશન'
                          : 'Computer Generated Sales Statement • Feni Creation'}
                      </div>
                      <div>
                        {isGu ? `પેજ ${pageNum} / ${totalPagesCount}` : `Page ${pageNum} of ${totalPagesCount}`}
                      </div>
                    </div>
                  </div>
                </Box>
              );
            })
          )}
        </Box>

        {/* Hidden Container strictly for high-res PDF export */}
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
          {pages.map((pageRows, pageIdx) => {
            const pageNum = pageIdx + 1;
            const isFirstPage = pageNum === 1;
            const isLastPage = pageNum === totalPagesCount;

            return (
              <div
                key={`pdf-sales-${pageIdx}`}
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
                  {renderHeader(isFirstPage, pageNum)}
                  {isFirstPage && renderSummaryCards()}

                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      border: '1px solid #cbd5e1',
                      marginBottom: '8px',
                      fontFamily: fontStack,
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: '#1e40af', color: '#ffffff' }}>
                        <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'center', width: '35px' }}>SR</th>
                        <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'left', width: '75px' }}>DATE</th>
                        <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'left', width: '85px' }}>INV NO</th>
                        <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'left', width: '160px' }}>PARTY NAME</th>
                        <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'left' }}>DESCRIPTION / DESIGN</th>
                        <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'right', width: '75px' }}>QTY</th>
                        <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'right', width: '65px' }}>RATE</th>
                        <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'right', width: '85px' }}>TAX</th>
                        <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'right', width: '95px' }}>TOTAL</th>
                        <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'right', width: '85px' }}>PAID</th>
                        <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'right', width: '90px' }}>DUE</th>
                        <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 800, textAlign: 'center', width: '70px' }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((r, idx) => (
                        <tr
                          key={idx}
                          style={{
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                            borderBottom: '1px solid #e2e8f0',
                          }}
                        >
                          <td style={{ padding: '5px 8px', fontSize: '9px', textAlign: 'center', color: '#64748b' }}>{r.srNo}</td>
                          <td style={{ padding: '5px 8px', fontSize: '9px', color: '#1e293b' }}>{r.invoiceDate}</td>
                          <td style={{ padding: '5px 8px', fontSize: '9px', fontFamily: 'monospace', fontWeight: 700, color: '#1e40af' }}>{r.invoiceNo}</td>
                          <td style={{ padding: '5px 8px', fontSize: '9px', fontWeight: 800, color: '#0f172a' }}>{r.partyName}</td>
                          <td style={{ padding: '5px 8px', fontSize: '9px', color: '#334155' }}>{r.particulars}</td>
                          <td style={{ padding: '5px 8px', fontSize: '9px', textAlign: 'right' }}>{r.quantityStr}</td>
                          <td style={{ padding: '5px 8px', fontSize: '9px', textAlign: 'right' }}>{r.rateStr}</td>
                          <td style={{ padding: '5px 8px', fontSize: '9px', textAlign: 'right', color: '#64748b' }}>{r.tax > 0 ? formatRupees(r.tax) : '-'}</td>
                          <td style={{ padding: '5px 8px', fontSize: '9px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{r.totalAmount > 0 ? formatRupees(r.totalAmount) : '-'}</td>
                          <td style={{ padding: '5px 8px', fontSize: '9px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{r.paidAmount > 0 ? formatRupees(r.paidAmount) : '-'}</td>
                          <td style={{ padding: '5px 8px', fontSize: '9px', textAlign: 'right', fontWeight: 800, color: r.pendingAmount > 0 ? '#dc2626' : '#16a34a' }}>{r.pendingAmount > 0 ? formatRupees(r.pendingAmount) : '-'}</td>
                          <td style={{ padding: '5px 8px', fontSize: '8.5px', textAlign: 'center' }}>
                            {r.statusText && (
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 5px',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                  backgroundColor: r.statusText === 'Paid' ? '#dcfce7' : r.statusText === 'Partial' ? '#fef3c7' : '#fee2e2',
                                  color: r.statusText === 'Paid' ? '#15803d' : r.statusText === 'Partial' ? '#b45309' : '#b91c1c',
                                }}
                              >
                                {r.statusText}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                  {isLastPage && (
                    <>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: '#eff6ff',
                          border: '1.5px solid #1e40af',
                          borderRadius: '6px',
                          padding: '8px 14px',
                          marginBottom: '12px',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#1e40af' }}>
                            {isGu ? 'શબ્દોમાં ચોખ્ખી બાકી રકમ:' : 'Net Pending in Words:'}
                          </div>
                          <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#0f172a', fontStyle: 'italic', marginTop: '2px' }}>
                            {numberToWords(summaryTotals.pendingAmount)} Only
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b' }}>TOTAL SALES</div>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e40af' }}>{formatRupees(summaryTotals.totalAmount)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b' }}>COLLECTED</div>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#16a34a' }}>{formatRupees(summaryTotals.paidAmount)}</div>
                          </div>
                          <div style={{ textAlign: 'right', borderLeft: '1.5px solid #cbd5e1', paddingLeft: '16px' }}>
                            <div style={{ fontSize: '9px', fontWeight: 800, color: '#b91c1c' }}>PENDING DUE</div>
                            <div style={{ fontSize: '15px', fontWeight: 900, color: '#dc2626' }}>{formatRupees(summaryTotals.pendingAmount)}</div>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', paddingTop: '16px', marginBottom: '10px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ borderBottom: '1px dashed #94a3b8', height: '20px', marginBottom: '4px' }}></div>
                          <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569' }}>{isGu ? 'તૈયાર કરનાર' : 'Prepared By'}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ borderBottom: '1px dashed #94a3b8', height: '20px', marginBottom: '4px' }}></div>
                          <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569' }}>{isGu ? 'ચકાસણી કરનાર' : 'Checked By'}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ borderBottom: '1px dashed #94a3b8', height: '20px', marginBottom: '4px' }}></div>
                          <div style={{ fontSize: '9px', fontWeight: 800, color: '#090d16' }}>{companyName}</div>
                          <div style={{ fontSize: '8px', color: '#1e40af', fontWeight: 700 }}>{isGu ? 'સત્તાવાર સહી' : 'Authorized Signatory'}</div>
                        </div>
                      </div>
                    </>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid #e2e8f0',
                      paddingTop: '6px',
                      fontSize: '8.5px',
                      color: '#64748b',
                    }}
                  >
                    <div>
                      {isGu
                        ? 'કમ્પ્યુટર જનરેટેડ સેલ્સ સ્ટેટમેન્ટ • ફેની ક્રિએશન'
                        : 'Computer Generated Sales Statement • Feni Creation'}
                    </div>
                    <div>
                      {isGu ? `પેજ ${pageNum} / ${totalPagesCount}` : `Page ${pageNum} of ${totalPagesCount}`}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
