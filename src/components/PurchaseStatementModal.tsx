import React, { useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Print as PrintIcon,
  PictureAsPdf as PdfIcon,
  Close as CloseIcon,
  FileDownload as ExcelIcon,
} from '@mui/icons-material';
import { Purchase, CompanySettings } from '../types';
import { formatRupees, formatDate } from '../utils/formatters';
import html2pdf from 'html2pdf.js';

interface PurchaseStatementModalProps {
  open: boolean;
  onClose: () => void;
  purchases: Purchase[];
  selectedMonth: string;
  monthLabel: string;
  selectedPartyFilter: string;
  selectedStatusFilter: string;
  summaryTotals: {
    totalChallanCount: number;
    totalInvoices: number;
    totalSubtotal: number;
    totalTax: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
  };
  settings?: CompanySettings;
  language?: 'en' | 'gu';
  onExportExcel?: () => void;
}

export const PurchaseStatementModal: React.FC<PurchaseStatementModalProps> = ({
  open,
  onClose,
  purchases,
  monthLabel,
  selectedPartyFilter,
  selectedStatusFilter,
  summaryTotals,
  settings,
  language = 'en',
  onExportExcel,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const pdfExportRef = useRef<HTMLDivElement>(null);

  const isGu = language === 'gu';
  const fontStack = "'Noto Sans Gujarati', 'Hind Vadodara', 'Mukta', 'Plus Jakarta Sans', system-ui, -apple-system, Roboto, sans-serif";

  const companyName = settings?.companyName || 'FENI CREATION';
  const companySubtitle = settings?.tagline || (isGu ? 'એમ્બ્રોઇડરી અને ટેક્સટાઇલ મેન્યુફેક્ચરિંગ' : 'Embroidery & Textile Manufacturing');
  const gstin = settings?.gstin || '24ABCDE1234F1Z5';
  const phone = settings?.phone || '+91 98765 43210';
  const email = settings?.email || 'fenicreation001@gmail.com';
  const address = settings?.address || 'Plot No. 124, GIDC Industrial Estate, Varachha, Surat - 395006, Gujarat, India';

  // Flatten purchases into item rows for clean tabular & paginated PDF export
  interface FlatRow {
    srNo: number | '';
    challanDate: string;
    challanNo: string;
    supplierName: string;
    materialName: string;
    quantityStr: string;
    rateStr: string;
    subtotal: number;
    tax: number;
    totalAmount: number;
    purchaseNo: string;
    isPaid: boolean;
    isPartial: boolean;
    statusText: string;
  }

  const flatRows: FlatRow[] = [];
  let globalSr = 1;

  purchases.forEach((p) => {
    const pa = p as any;
    const itemsList =
      p.items && p.items.length > 0
        ? p.items
        : [
            {
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
            },
          ];

    const sub = Number(p.subtotal) || 0;
    const tax = (Number(p.cgst) || 0) + (Number(p.sgst) || 0);
    const tot = Number(p.totalAmount) || sub + tax;
    let pd = Number(p.paidAmount) || 0;
    if (pd === 0 && (p.status === 'Paid' || (p as any).status === 'PAID')) pd = tot;
    const isPaid = tot > 0 && pd >= tot;
    const isPartial = pd > 0 && pd < tot;
    const statusText = isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'PENDING';

    itemsList.forEach((item, itemIdx) => {
      const itemSub = item.subtotal || (itemIdx === 0 ? sub : 0);
      const itemTax = (item.cgst || 0) + (item.sgst || 0) || (itemIdx === 0 ? tax : 0);
      const qtyStr = item.quantity ? `${item.quantity} ${item.unit || ''}` : '-';
      const rateStr = item.rate ? `₹${item.rate}` : '-';

      flatRows.push({
        srNo: itemIdx === 0 ? globalSr : '',
        challanDate: formatDate(item.challanDate || pa.challanDate || p.date || ''),
        challanNo: item.challanNo || pa.challanNo || '-',
        supplierName: itemIdx === 0 ? p.supplierName : '',
        materialName: item.description || p.materialName || '-',
        quantityStr: qtyStr,
        rateStr: rateStr,
        subtotal: itemSub,
        tax: itemTax,
        totalAmount: itemIdx === 0 ? tot : 0,
        purchaseNo: itemIdx === 0 ? (p.purchaseNo || '-') : '',
        isPaid,
        isPartial,
        statusText: itemIdx === 0 ? statusText : '',
      });
    });

    globalSr++;
  });

  // Chunk flatRows into clean page blocks
  // Page 1: 14 rows + Full Header + Summary Cards
  // Subsequent pages: 20 rows + Slim Header
  const pages: FlatRow[][] = [];
  if (flatRows.length === 0) {
    pages.push([]);
  } else {
    let remaining = [...flatRows];
    pages.push(remaining.slice(0, 14));
    remaining = remaining.slice(14);

    while (remaining.length > 0) {
      pages.push(remaining.slice(0, 20));
      remaining = remaining.slice(20);
    }
  }

  const lastPageItemCount = pages[pages.length - 1]?.length || 0;
  const needsDedicatedSummaryPage = lastPageItemCount > 12;
  const totalPdfPages = needsDedicatedSummaryPage ? pages.length + 1 : pages.length;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    if (!pdfExportRef.current) return;
    const element = pdfExportRef.current;
    const cleanMonth = monthLabel.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Material_Purchase_Statement_${cleanMonth}.pdf`;

    const opt = {
      margin: [0, 0, 0, 0] as [number, number, number, number],
      filename: filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1080,
      },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'landscape' as const, compress: true },
      pagebreak: { mode: ['css' as const, 'legacy' as const], before: '.html2pdf-page-break' },
    };

    try {
      html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      scroll="paper"
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: 3,
          overflow: 'hidden',
          bgcolor: '#ffffff',
        },
      }}
    >
      {/* Header Bar */}
      <DialogTitle
        sx={{
          p: { xs: 2, sm: 2.5 },
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              bgcolor: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(4px)',
            }}
          >
            <PdfIcon sx={{ color: '#ffffff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1rem', sm: '1.15rem' }, lineHeight: 1.2 }}>
              {isGu ? 'માસિક ખરીદી સ્ટેટમેન્ટ' : 'Monthly Purchase Statement'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>
              {monthLabel} • A4 Landscape Statement
            </Typography>
          </Box>
        </Box>

        <IconButton
          onClick={onClose}
          sx={{
            color: '#cbd5e1',
            '&:hover': { color: '#ffffff', bgcolor: 'rgba(255, 255, 255, 0.1)' },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Top Action Bar */}
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          bgcolor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={monthLabel}
            color="primary"
            size="small"
            sx={{ fontWeight: 700, borderRadius: '8px' }}
          />
          <Chip
            label="A4 Size"
            color="secondary"
            variant="outlined"
            size="small"
            sx={{ fontWeight: 800, borderRadius: '8px' }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
          {onExportExcel && (
            <Button
              variant="outlined"
              color="success"
              startIcon={<ExcelIcon />}
              onClick={onExportExcel}
              sx={{ fontWeight: 700, borderRadius: '10px' }}
            >
              {isGu ? 'એક્સેલ ડાઉનલોડ' : 'Download Excel'}
            </Button>
          )}

          <Button
            variant="contained"
            color="secondary"
            startIcon={<PdfIcon />}
            onClick={handleDownloadPdf}
            sx={{ fontWeight: 700, borderRadius: '10px', px: 2.5 }}
          >
            {isGu ? 'A4 PDF ડાઉનલોડ' : 'Download A4 PDF'}
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            sx={{ fontWeight: 700, borderRadius: '10px' }}
          >
            {isGu ? 'A4 પ્રિન્ટ સ્ટેટમેન્ટ' : 'Print A4 Statement'}
          </Button>
        </Box>
      </Box>

      <DialogContent sx={{ p: { xs: 1.5, sm: 3 }, bgcolor: '#f8fafc' }}>
        {/* Printable Area Box (for on-screen preview & window.print) */}
        <Paper
          ref={printRef}
          id="printable-purchase-statement"
          elevation={0}
          sx={{
            p: 3,
            bgcolor: '#ffffff',
            color: '#0f172a',
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            fontFamily: fontStack,
            maxWidth: '1080px',
            width: '100%',
            mx: 'auto',
            boxSizing: 'border-box',
          }}
        >
          {/* Print CSS & Gujarati Web Fonts Injection */}
          <style>
            {`
              @import url('https://fonts.googleapis.com/css2?family=Hind+Vadodara:wght@400;500;600;700&family=Noto+Sans+Gujarati:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');

              @media print, all {
                tr {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                thead {
                  display: table-header-group !important;
                }
                tbody {
                  display: table-row-group !important;
                }
              }
              @media print {
                body * {
                  visibility: hidden;
                }
                #printable-purchase-statement, #printable-purchase-statement * {
                  visibility: visible;
                }
                #printable-purchase-statement {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  margin: 0;
                  padding: 10px;
                  border: none !important;
                  box-shadow: none !important;
                }
                @page {
                  size: A4 landscape;
                  margin: 6mm;
                }
              }
            `}
          </style>

          {/* Statement Header - Clean Invoice Style */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #6366f1', paddingBottom: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              {settings?.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt="Logo"
                  style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'contain' }}
                />
              ) : (
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '8px',
                    backgroundColor: '#4f46e5',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '16px',
                    flexShrink: 0,
                  }}
                >
                  {companyName ? companyName.substring(0, 2).toUpperCase() : 'FC'}
                </div>
              )}
              <div style={{ maxWidth: '520px' }}>
                <h1 style={{ margin: 0, color: '#312e81', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: '1.2' }}>
                  {companyName}
                </h1>
                <p style={{ margin: '3px 0 0', color: '#4f46e5', fontSize: '12px', fontWeight: 700, lineHeight: '1.3' }}>
                  {companySubtitle}
                </p>
                <p style={{ margin: '3px 0 0', color: '#334155', fontSize: '11px', fontWeight: 700, lineHeight: '1.3' }}>
                  GSTIN: {gstin}
                </p>
                <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '10px', lineHeight: '1.3' }}>
                  <span>{isGu ? 'મોબાઇલ' : 'Mobile'}: {phone.replace(/\|\|+/g, '|').replace(/\s*\|\s*/g, ' | ')}</span>
                  <span> | </span>
                  <span>Email: {email}</span>
                </p>
                <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '10px', lineHeight: '1.4' }}>
                  {address}
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div>
                <svg width={isGu ? "230" : "210"} height="28" viewBox={`0 0 ${isGu ? 230 : 210} 28`} style={{ display: 'inline-block', verticalAlign: 'middle', marginBottom: '6px' }}>
                  <rect x="0" y="0" width={isGu ? "230" : "210"} height="28" rx="14" fill="#4f46e5" />
                  <text
                    x={isGu ? 115 : 105}
                    y="14"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="800"
                    fontFamily={fontStack}
                    dominantBaseline="central"
                    textAnchor="middle"
                    letterSpacing="0.4"
                  >
                    {isGu ? 'માલ ખરીદી સ્ટેટમેન્ટ' : 'MATERIAL PURCHASE STATEMENT'}
                  </text>
                </svg>
              </div>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#1e1b4b', lineHeight: '1.4' }}>
                {isGu ? 'સમયગાળો:' : 'Period:'} <span style={{ color: '#4f46e5' }}>{monthLabel}</span>
              </p>
              <p style={{ margin: '3px 0 0', fontSize: '10px', color: '#64748b', fontWeight: 600, lineHeight: '1.4' }}>
                {isGu ? 'તારીખ:' : 'Generated Date:'} {formatDate(new Date().toISOString())}
              </p>
            </div>
          </div>

          {/* Summary Cards Row */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 1,
              mb: 2,
              p: 1.25,
              bgcolor: '#f1f5f9',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                {isGu ? 'કુલ ચલણ' : 'Total Challan'}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 800, color: '#0d9488', fontSize: '0.88rem' }}>
                {summaryTotals.totalChallanCount}
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                {isGu ? 'કુલ બિલ' : 'Total Bills'}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 800, color: '#0284c7', fontSize: '0.88rem' }}>
                {summaryTotals.totalInvoices} {isGu ? 'બિલ' : 'Bills'}
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                {isGu ? 'કુલ રકમ (Taxable)' : 'Total Subtotal'}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 800, color: '#9333ea', fontSize: '0.88rem' }}>
                {formatRupees(summaryTotals.totalSubtotal)}
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                {isGu ? 'કુલ GST (5%)' : 'Total GST (5%)'}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 800, color: '#ea580c', fontSize: '0.88rem' }}>
                {formatRupees(summaryTotals.totalTax)}
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                {isGu ? 'કુલ બિલ રકમ' : 'Total Amount'}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 800, color: '#4f46e5', fontSize: '0.88rem' }}>
                {formatRupees(summaryTotals.totalAmount)}
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                {isGu ? 'કુલ ચૂકવેલ' : 'Total Paid'}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 800, color: '#16a34a', fontSize: '0.88rem' }}>
                {formatRupees(summaryTotals.paidAmount)}
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                {isGu ? 'કુલ બાકી રકમ' : 'Total Pending'}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 800, color: '#dc2626', fontSize: '0.88rem' }}>
                {formatRupees(summaryTotals.pendingAmount)}
              </Typography>
            </Box>
          </Box>

          {/* Active Filters Bar if filtered */}
          {(selectedPartyFilter !== 'ALL' || selectedStatusFilter !== 'ALL') && (
            <Box sx={{ mb: 1.5, display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
                {isGu ? 'ફિલ્ટર્સ:' : 'Applied Filters:'}
              </Typography>
              {selectedPartyFilter !== 'ALL' && (
                <Chip label={`Party: ${selectedPartyFilter}`} size="small" variant="outlined" color="primary" />
              )}
              {selectedStatusFilter !== 'ALL' && (
                <Chip label={`Status: ${selectedStatusFilter}`} size="small" variant="outlined" color="secondary" />
              )}
            </Box>
          )}

          {/* Purchase Details Table */}
          <Table
            size="small"
            sx={{
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              tableLayout: 'fixed',
              width: '100%',
              fontFamily: fontStack,
              '& .MuiTableCell-root': {
                borderRight: '1px solid #e2e8f0',
                borderBottom: '1px solid #e2e8f0',
                padding: '4px 5px',
                fontSize: '0.72rem',
                wordBreak: 'break-word',
                fontFamily: fontStack,
                verticalAlign: 'middle',
              },
            }}
          >
            <TableHead>
              <TableRow sx={{ backgroundColor: '#1e293b' }}>
                <TableCell sx={{ backgroundColor: '#1e293b !important', color: '#ffffff !important', fontWeight: 800, textAlign: 'center', verticalAlign: 'middle', width: '3.5%', px: '2px !important', py: '6px !important', fontSize: '0.68rem' }}>#</TableCell>
                <TableCell sx={{ backgroundColor: '#1e293b !important', color: '#ffffff !important', fontWeight: 800, textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', width: '9.5%', px: '3px !important', py: '6px !important', fontSize: '0.68rem' }}>{isGu ? 'ચલણ તા.' : 'Date'}</TableCell>
                <TableCell sx={{ backgroundColor: '#1e293b !important', color: '#ffffff !important', fontWeight: 800, textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', width: '8.5%', px: '3px !important', py: '6px !important', fontSize: '0.68rem' }}>{isGu ? 'ચલણ નં.' : 'Challan No'}</TableCell>
                <TableCell sx={{ backgroundColor: '#1e293b !important', color: '#ffffff !important', fontWeight: 800, textAlign: 'left', pl: '6px !important', pr: '4px !important', py: '6px !important', verticalAlign: 'middle', width: '15.5%', fontSize: '0.68rem' }}>{isGu ? 'પાર્ટી / સપ્લાયર' : 'Party / Supplier'}</TableCell>
                <TableCell sx={{ backgroundColor: '#1e293b !important', color: '#ffffff !important', fontWeight: 800, textAlign: 'left', pl: '6px !important', pr: '4px !important', py: '6px !important', verticalAlign: 'middle', width: '15.5%', fontSize: '0.68rem' }}>{isGu ? 'મટીરીયલ વિગત' : 'Material Item'}</TableCell>
                <TableCell sx={{ backgroundColor: '#1e293b !important', color: '#ffffff !important', fontWeight: 800, textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', width: '10%', px: '3px !important', py: '6px !important', fontSize: '0.68rem' }}>{isGu ? 'જથ્થો' : 'Qty & Unit'}</TableCell>
                <TableCell sx={{ backgroundColor: '#1e293b !important', color: '#ffffff !important', fontWeight: 800, textAlign: 'right', pr: '6px !important', py: '6px !important', verticalAlign: 'middle', width: '7.5%', fontSize: '0.68rem' }}>{isGu ? 'ભાવ' : 'Rate'}</TableCell>
                <TableCell sx={{ backgroundColor: '#1e293b !important', color: '#ffffff !important', fontWeight: 800, textAlign: 'right', pr: '6px !important', py: '6px !important', verticalAlign: 'middle', width: '8.5%', fontSize: '0.68rem' }}>{isGu ? 'રકમ' : 'Subtotal'}</TableCell>
                <TableCell sx={{ backgroundColor: '#1e293b !important', color: '#ffffff !important', fontWeight: 800, textAlign: 'right', pr: '6px !important', py: '6px !important', verticalAlign: 'middle', width: '6.5%', fontSize: '0.68rem' }}>{isGu ? 'GST' : 'GST (5%)'}</TableCell>
                <TableCell sx={{ backgroundColor: '#1e293b !important', color: '#ffffff !important', fontWeight: 800, textAlign: 'right', pr: '6px !important', py: '6px !important', verticalAlign: 'middle', width: '9%', fontSize: '0.68rem' }}>{isGu ? 'કુલ બિલ' : 'Total (₹)'}</TableCell>
                <TableCell sx={{ backgroundColor: '#1e293b !important', color: '#ffffff !important', fontWeight: 800, textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', width: '8.5%', px: '3px !important', py: '6px !important', fontSize: '0.68rem' }}>{isGu ? 'બિલ નં.' : 'Bill No'}</TableCell>
                <TableCell sx={{ backgroundColor: '#1e293b !important', color: '#ffffff !important', fontWeight: 800, textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', width: '7.5%', px: '3px !important', py: '6px !important', fontSize: '0.68rem' }}>{isGu ? 'સ્ટેટસ' : 'Status'}</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {purchases.map((p, pIdx) => {
                const pa = p as any;
                const itemsList =
                  p.items && p.items.length > 0
                    ? p.items
                    : [
                        {
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
                        },
                      ];

                const sub = Number(p.subtotal) || 0;
                const tax = (Number(p.cgst) || 0) + (Number(p.sgst) || 0);
                const tot = Number(p.totalAmount) || sub + tax;
                let pd = Number(p.paidAmount) || 0;
                const isPaid = tot > 0 && pd >= tot;
                const isPartial = pd > 0 && pd < tot;
                if (pd === 0 && (p.status === 'Paid' || (p as any).status === 'PAID')) pd = tot;

                return itemsList.map((item, itemIdx) => {
                  const isFirstRow = itemIdx === 0;

                  return (
                    <TableRow
                      key={`${p.id || pIdx}-${itemIdx}`}
                      sx={{
                        bgcolor: pIdx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        '&:hover': { bgcolor: '#f1f5f9' },
                      }}
                    >
                      {isFirstRow ? (
                        <TableCell rowSpan={itemsList.length} sx={{ fontWeight: 800, textAlign: 'center', verticalAlign: 'middle', bgcolor: '#f1f5f9' }}>
                          {pIdx + 1}
                        </TableCell>
                      ) : null}

                      <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                        {formatDate(item.challanDate || pa.challanDate || p.date || '')}
                      </TableCell>

                      <TableCell sx={{ fontWeight: 800, color: '#dc2626', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {item.challanNo || pa.challanNo || '-'}
                      </TableCell>

                      {isFirstRow ? (
                        <TableCell rowSpan={itemsList.length} sx={{ fontWeight: 800, color: '#0f172a', textAlign: 'left', pl: '8px !important', verticalAlign: 'middle' }}>
                          {p.supplierName}
                        </TableCell>
                      ) : null}

                      <TableCell sx={{ fontWeight: 600, textAlign: 'left', pl: '8px !important', verticalAlign: 'middle' }}>
                        {item.description || p.materialName || '-'}
                      </TableCell>

                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {item.quantity ? `${item.quantity} ${item.unit || ''}` : '-'}
                      </TableCell>

                      <TableCell sx={{ textAlign: 'right', pr: '8px !important', verticalAlign: 'middle', fontWeight: 600 }}>
                        {item.rate ? `₹${item.rate}` : '-'}
                      </TableCell>

                      <TableCell sx={{ textAlign: 'right', pr: '8px !important', verticalAlign: 'middle', fontWeight: 600 }}>
                        {formatRupees(item.subtotal || (isFirstRow ? sub : 0))}
                      </TableCell>

                      <TableCell sx={{ textAlign: 'right', pr: '8px !important', verticalAlign: 'middle', color: '#64748b' }}>
                        {formatRupees((item.cgst || 0) + (item.sgst || 0) || (isFirstRow ? tax : 0))}
                      </TableCell>

                      {isFirstRow ? (
                        <TableCell rowSpan={itemsList.length} sx={{ textAlign: 'right', pr: '8px !important', verticalAlign: 'middle', fontWeight: 800, color: '#1e293b' }}>
                          {formatRupees(tot)}
                        </TableCell>
                      ) : null}

                      {isFirstRow ? (
                        <TableCell rowSpan={itemsList.length} sx={{ textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, color: '#2563eb', whiteSpace: 'nowrap' }}>
                          {p.purchaseNo || '-'}
                        </TableCell>
                      ) : null}

                      {isFirstRow ? (
                        <TableCell rowSpan={itemsList.length} sx={{ textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '0.66rem',
                              fontWeight: 800,
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: isPaid ? '#dcfce7' : isPartial ? '#fef3c7' : '#fee2e2',
                              color: isPaid ? '#15803d' : isPartial ? '#d97706' : '#b91c1c',
                              border: `1px solid ${isPaid ? '#bbf7d0' : isPartial ? '#fde68a' : '#fecaca'}`,
                            }}
                          >
                            {isPaid ? (isGu ? 'ચૂકવેલ' : 'PAID') : isPartial ? (isGu ? 'અંશતઃ' : 'PARTIAL') : (isGu ? 'બાકી' : 'PENDING')}
                          </span>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                });
              })}

              {/* Grand Total Summary Row */}
              <TableRow sx={{ backgroundColor: '#0f172a' }}>
                <TableCell colSpan={7} sx={{ backgroundColor: '#0f172a !important', color: '#ffffff !important', fontWeight: 900, fontSize: '0.78rem', textAlign: 'right', pr: '10px !important', verticalAlign: 'middle' }}>
                  {isGu ? 'કુલ સમરી સરવાળો:' : 'GRAND TOTAL SUMMARY:'}
                </TableCell>
                <TableCell sx={{ backgroundColor: '#0f172a !important', color: '#ffffff !important', fontWeight: 900, textAlign: 'right', pr: '8px !important', verticalAlign: 'middle', fontSize: '0.78rem' }}>
                  {formatRupees(summaryTotals.totalSubtotal)}
                </TableCell>
                <TableCell sx={{ backgroundColor: '#0f172a !important', color: '#ffffff !important', fontWeight: 900, textAlign: 'right', pr: '8px !important', verticalAlign: 'middle', fontSize: '0.78rem' }}>
                  {formatRupees(summaryTotals.totalTax)}
                </TableCell>
                <TableCell sx={{ backgroundColor: '#0f172a !important', color: '#ffffff !important', fontWeight: 900, textAlign: 'right', pr: '8px !important', verticalAlign: 'middle', fontSize: '0.78rem' }}>
                  {formatRupees(summaryTotals.totalAmount)}
                </TableCell>
                <TableCell colSpan={2} sx={{ backgroundColor: '#0f172a !important', color: '#4ade80 !important', fontWeight: 900, textAlign: 'center', verticalAlign: 'middle', fontSize: '0.75rem' }}>
                  {isGu ? 'ચૂકવેલ:' : 'Paid:'} {formatRupees(summaryTotals.paidAmount)} | {isGu ? 'બાકી:' : 'Pending:'} {formatRupees(summaryTotals.pendingAmount)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* Statement Footer */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              mt: 4,
              pt: 2,
              borderTop: '1px solid #cbd5e1',
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                * {isGu ? `આ ${companyName} નું કોમ્પ્યુટર નિર્મિત માલ ખરીદી સમરી સ્ટેટમેન્ટ છે.` : `This statement is an official computer-generated Material Purchase Summary for ${companyName}.`}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                Printed via Feni Creation Billing System
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'center', minWidth: '200px' }}>
              <Typography variant="body2" sx={{ fontWeight: 800, color: '#1e293b', mb: 5 }}>
                For, {companyName}
              </Typography>
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, borderTop: '1px solid #94a3b8', pt: 0.5, px: 2 }}>
                {isGu ? 'અધિકૃત સહી' : 'Authorized Signatory'}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Dedicated Hidden Container for Paginated Multi-Page PDF Generation */}
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
          <div
            ref={pdfExportRef}
            id="pdf-export-container"
            style={{
              width: '1080px',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              fontFamily: fontStack,
            }}
          >
            {pages.map((pageRows, pageIdx) => {
              const pageNum = pageIdx + 1;
              const isFirstPage = pageNum === 1;
              const isLastItemPage = pageIdx === pages.length - 1;

              return (
                <div key={pageIdx} className="html2pdf-page-break" style={{ height: '620px', minHeight: '620px', maxHeight: '620px', boxSizing: 'border-box', overflow: 'hidden', backgroundColor: '#ffffff', fontFamily: fontStack, padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    {/* Header section */}
                    {isFirstPage ? (
                      /* Full Header on Page 1 */
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingBottom: '10px',
                          marginBottom: '10px',
                          borderBottom: '2px solid #6366f1',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          {settings?.logoUrl ? (
                            <img
                              src={settings.logoUrl}
                              alt="Logo"
                              style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'contain' }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '8px',
                                backgroundColor: '#4f46e5',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '15px',
                                flexShrink: 0,
                              }}
                            >
                              {companyName ? companyName.substring(0, 2).toUpperCase() : 'FC'}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 800, color: '#312e81', fontSize: '20px', lineHeight: 1.1 }}>
                              {companyName}
                            </div>
                            <div style={{ fontWeight: 700, color: '#4f46e5', fontSize: '11px', marginTop: '2px' }}>
                              {companySubtitle}
                            </div>
                            <div style={{ color: '#334155', fontSize: '9.5px', fontWeight: 700, marginTop: '2px' }}>
                              GSTIN: <strong>{gstin}</strong> | Mobile: {phone}
                            </div>
                            <div style={{ color: '#64748b', fontSize: '9px', marginTop: '2px' }}>
                              {address}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div>
                            <svg width={isGu ? "210" : "190"} height="24" viewBox={`0 0 ${isGu ? 210 : 190} 24`} style={{ display: 'inline-block', verticalAlign: 'middle', marginBottom: '4px' }}>
                              <rect x="0" y="0" width={isGu ? "210" : "190"} height="24" rx="12" fill="#4f46e5" />
                              <text
                                x={isGu ? 105 : 95}
                                y="12"
                                fill="#ffffff"
                                fontSize="10"
                                fontWeight="800"
                                fontFamily={fontStack}
                                dominantBaseline="central"
                                textAnchor="middle"
                                letterSpacing="0.4"
                              >
                                {isGu ? 'માલ ખરીદી સ્ટેટમેન્ટ' : 'MATERIAL PURCHASE STATEMENT'}
                              </text>
                            </svg>
                          </div>
                          <div style={{ fontWeight: 700, color: '#334155', fontSize: '10.5px' }}>
                            Period: <strong>{monthLabel}</strong>
                          </div>
                          <div style={{ color: '#64748b', fontSize: '9px' }}>
                            Generated: {formatDate(new Date().toISOString())}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Slim Header on Page 2+ */
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingBottom: '6px',
                          marginBottom: '10px',
                          borderBottom: '1px solid #cbd5e1',
                        }}
                      >
                        <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '13px' }}>
                          {companyName} — Material Purchase Statement ({monthLabel})
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700 }}>
                          Page {pageNum} of {totalPdfPages}
                        </div>
                      </div>
                    )}

                    {/* Summary Cards on Page 1 */}
                    {isFirstPage && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(7, 1fr)',
                          gap: '6px',
                          marginBottom: '10px',
                          padding: '8px',
                          backgroundColor: '#f1f5f9',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#64748b', fontWeight: 700, fontSize: '8.5px', textTransform: 'uppercase' }}>
                            {isGu ? 'કુલ ચલણ' : 'Total Challan'}
                          </div>
                          <div style={{ fontWeight: 800, color: '#0d9488', fontSize: '12px' }}>
                            {summaryTotals.totalChallanCount}
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#64748b', fontWeight: 700, fontSize: '8.5px', textTransform: 'uppercase' }}>
                            {isGu ? 'કુલ બિલ' : 'Total Purchases'}
                          </div>
                          <div style={{ fontWeight: 800, color: '#0284c7', fontSize: '12px' }}>
                            {summaryTotals.totalInvoices} Bills
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#64748b', fontWeight: 700, fontSize: '8.5px', textTransform: 'uppercase' }}>
                            {isGu ? 'કુલ રકમ' : 'Total Subtotal'}
                          </div>
                          <div style={{ fontWeight: 800, color: '#9333ea', fontSize: '12px' }}>
                            {formatRupees(summaryTotals.totalSubtotal)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#64748b', fontWeight: 700, fontSize: '8.5px', textTransform: 'uppercase' }}>
                            Total GST (5%)
                          </div>
                          <div style={{ fontWeight: 800, color: '#ea580c', fontSize: '12px' }}>
                            {formatRupees(summaryTotals.totalTax)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#64748b', fontWeight: 700, fontSize: '8.5px', textTransform: 'uppercase' }}>
                            {isGu ? 'કુલ બિલ રકમ' : 'Total Amount'}
                          </div>
                          <div style={{ fontWeight: 800, color: '#4f46e5', fontSize: '12px' }}>
                            {formatRupees(summaryTotals.totalAmount)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#64748b', fontWeight: 700, fontSize: '8.5px', textTransform: 'uppercase' }}>
                            {isGu ? 'કુલ ચૂકવેલ' : 'Total Paid'}
                          </div>
                          <div style={{ fontWeight: 800, color: '#16a34a', fontSize: '12px' }}>
                            {formatRupees(summaryTotals.paidAmount)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#64748b', fontWeight: 700, fontSize: '8.5px', textTransform: 'uppercase' }}>
                            {isGu ? 'કુલ બાકી રકમ' : 'Total Pending'}
                          </div>
                          <div style={{ fontWeight: 800, color: '#dc2626', fontSize: '12px' }}>
                            {formatRupees(summaryTotals.pendingAmount)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Table for this Page */}
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        border: '1px solid #cbd5e1',
                        tableLayout: 'fixed',
                        fontSize: '9.5px',
                        fontFamily: fontStack,
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: '#1e293b' }}>
                          <th style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: '5px 2px', fontWeight: 800, textAlign: 'center', verticalAlign: 'middle', width: '3.5%', fontSize: '9.5px' }}>#</th>
                          <th style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: '5px 3px', fontWeight: 800, textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', width: '9.5%', fontSize: '9.5px' }}>{isGu ? 'ચલણ તા.' : 'Date'}</th>
                          <th style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: '5px 3px', fontWeight: 800, textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', width: '8.5%', fontSize: '9.5px' }}>{isGu ? 'ચલણ નં.' : 'Challan No'}</th>
                          <th style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: '5px 5px', fontWeight: 800, textAlign: 'left', verticalAlign: 'middle', width: '15.5%', fontSize: '9.5px' }}>{isGu ? 'પાર્ટી / સપ્લાયર' : 'Party / Supplier'}</th>
                          <th style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: '5px 5px', fontWeight: 800, textAlign: 'left', verticalAlign: 'middle', width: '15.5%', fontSize: '9.5px' }}>{isGu ? 'મટીરીયલ વિગત' : 'Material Item'}</th>
                          <th style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: '5px 3px', fontWeight: 800, textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', width: '10%', fontSize: '9.5px' }}>{isGu ? 'જથ્થો' : 'Qty & Unit'}</th>
                          <th style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: '5px 5px', fontWeight: 800, textAlign: 'right', verticalAlign: 'middle', width: '7.5%', fontSize: '9.5px' }}>{isGu ? 'ભાવ' : 'Rate'}</th>
                          <th style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: '5px 5px', fontWeight: 800, textAlign: 'right', verticalAlign: 'middle', width: '8.5%', fontSize: '9.5px' }}>{isGu ? 'રકમ' : 'Subtotal'}</th>
                          <th style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: '5px 5px', fontWeight: 800, textAlign: 'right', verticalAlign: 'middle', width: '6.5%', fontSize: '9.5px' }}>{isGu ? 'GST' : 'GST (5%)'}</th>
                          <th style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: '5px 5px', fontWeight: 800, textAlign: 'right', verticalAlign: 'middle', width: '9%', fontSize: '9.5px' }}>{isGu ? 'કુલ બિલ' : 'Total (₹)'}</th>
                          <th style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: '5px 3px', fontWeight: 800, textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', width: '8.5%', fontSize: '9.5px' }}>{isGu ? 'બિલ નં.' : 'Bill No'}</th>
                          <th style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: '5px 3px', fontWeight: 800, textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', width: '7.5%', fontSize: '9.5px' }}>{isGu ? 'સ્ટેટસ' : 'Status'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((r, rIdx) => (
                          <tr key={rIdx} style={{ backgroundColor: rIdx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0', height: '23px' }}>
                            <td style={{ borderRight: '1px solid #e2e8f0', padding: '3px 2px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, fontSize: '9px' }}>{r.srNo}</td>
                            <td style={{ borderRight: '1px solid #e2e8f0', padding: '3px 3px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', fontSize: '9px' }}>{r.challanDate}</td>
                            <td style={{ borderRight: '1px solid #e2e8f0', padding: '3px 3px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 800, color: '#dc2626', whiteSpace: 'nowrap', fontSize: '9px' }}>{r.challanNo}</td>
                            <td style={{ borderRight: '1px solid #e2e8f0', padding: '3px 5px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 700, color: '#0f172a', fontSize: '9px' }}>{r.supplierName}</td>
                            <td style={{ borderRight: '1px solid #e2e8f0', padding: '3px 5px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 600, fontSize: '9px' }}>{r.materialName}</td>
                            <td style={{ borderRight: '1px solid #e2e8f0', padding: '3px 3px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 600, whiteSpace: 'nowrap', fontSize: '9px' }}>{r.quantityStr}</td>
                            <td style={{ borderRight: '1px solid #e2e8f0', padding: '3px 5px', textAlign: 'right', verticalAlign: 'middle', fontWeight: 600, fontSize: '9px' }}>{r.rateStr}</td>
                            <td style={{ borderRight: '1px solid #e2e8f0', padding: '3px 5px', textAlign: 'right', verticalAlign: 'middle', fontWeight: 600, fontSize: '9px' }}>{formatRupees(r.subtotal)}</td>
                            <td style={{ borderRight: '1px solid #e2e8f0', padding: '3px 5px', textAlign: 'right', verticalAlign: 'middle', color: '#64748b', fontSize: '9px' }}>{formatRupees(r.tax)}</td>
                            <td style={{ borderRight: '1px solid #e2e8f0', padding: '3px 5px', textAlign: 'right', verticalAlign: 'middle', fontWeight: 800, color: '#1e293b', fontSize: '9px' }}>
                              {r.totalAmount ? formatRupees(r.totalAmount) : ''}
                            </td>
                            <td style={{ borderRight: '1px solid #e2e8f0', padding: '3px 3px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, color: '#2563eb', whiteSpace: 'nowrap', fontSize: '9px' }}>{r.purchaseNo}</td>
                            <td style={{ padding: '3px 3px', textAlign: 'center', verticalAlign: 'middle' }}>
                              {r.statusText ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '1px 6px',
                                    borderRadius: '6px',
                                    fontSize: '8.5px',
                                    fontWeight: 800,
                                    whiteSpace: 'nowrap',
                                    backgroundColor: r.isPaid ? '#dcfce7' : r.isPartial ? '#fef3c7' : '#fee2e2',
                                    color: r.isPaid ? '#15803d' : r.isPartial ? '#d97706' : '#b91c1c',
                                    border: `1px solid ${r.isPaid ? '#bbf7d0' : r.isPartial ? '#fde68a' : '#fecaca'}`,
                                  }}
                                >
                                  {r.statusText}
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        ))}

                        {/* Render Grand Total Summary row on last item page if it fits */}
                        {isLastItemPage && !needsDedicatedSummaryPage && (
                          <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                            <td colSpan={7} style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '6px 8px', fontWeight: 900, textAlign: 'right', verticalAlign: 'middle', fontSize: '10px' }}>
                              GRAND TOTAL SUMMARY:
                            </td>
                            <td style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '6px 5px', fontWeight: 900, textAlign: 'right', verticalAlign: 'middle', fontSize: '10px' }}>
                              {formatRupees(summaryTotals.totalSubtotal)}
                            </td>
                            <td style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '6px 5px', fontWeight: 900, textAlign: 'right', verticalAlign: 'middle', fontSize: '10px' }}>
                              {formatRupees(summaryTotals.totalTax)}
                            </td>
                            <td style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '6px 5px', fontWeight: 900, textAlign: 'right', verticalAlign: 'middle', fontSize: '10px' }}>
                              {formatRupees(summaryTotals.totalAmount)}
                            </td>
                            <td colSpan={2} style={{ backgroundColor: '#0f172a', color: '#4ade80', padding: '6px 5px', fontWeight: 900, textAlign: 'center', verticalAlign: 'middle', fontSize: '9.5px' }}>
                              Paid: {formatRupees(summaryTotals.paidAmount)} | Pending: {formatRupees(summaryTotals.pendingAmount)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Render Signature block on last item page if it fits */}
                    {isLastItemPage && !needsDedicatedSummaryPage && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '16px', paddingTop: '8px', borderTop: '1px solid #cbd5e1' }}>
                        <div>
                          <div style={{ color: '#64748b', fontSize: '9.5px' }}>* Official computer-generated Material Purchase Summary for {companyName}.</div>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: '180px' }}>
                          <div style={{ fontWeight: 800, color: '#1e293b', marginBottom: '28px', fontSize: '10.5px' }}>For, {companyName}</div>
                          <div style={{ color: '#475569', fontWeight: 700, borderTop: '1px solid #94a3b8', paddingTop: '2px', fontSize: '9.5px' }}>
                            Authorized Signatory
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Footer on every item page */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '9.5px', marginTop: '8px' }}>
                    <div>Printed via Feni Creation Billing System</div>
                    <div>Page {pageNum} of {totalPdfPages}</div>
                  </div>
                </div>
              );
            })}

            {/* Render Dedicated Summary Page if last item page was full */}
            {needsDedicatedSummaryPage && (
              <div className="html2pdf-page-break" style={{ height: '620px', minHeight: '620px', maxHeight: '620px', boxSizing: 'border-box', overflow: 'hidden', backgroundColor: '#ffffff', fontFamily: fontStack, padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingBottom: '8px',
                      marginBottom: '16px',
                      borderBottom: '1px solid #cbd5e1',
                    }}
                  >
                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '14px' }}>
                      {companyName} — Material Purchase Statement ({monthLabel})
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700 }}>
                      Page {totalPdfPages} of {totalPdfPages}
                    </div>
                  </div>

                  <div style={{ marginTop: '20px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '14px', marginBottom: '12px' }}>
                      SUMMARY TOTALS & STATEMENT VERIFICATION
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', height: '30px' }}>
                          <td style={{ fontWeight: 700, color: '#475569' }}>Total Subtotal (Taxable Amount):</td>
                          <td style={{ fontWeight: 800, color: '#9333ea', textAlign: 'right' }}>{formatRupees(summaryTotals.totalSubtotal)}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', height: '30px' }}>
                          <td style={{ fontWeight: 700, color: '#475569' }}>Total GST Tax (5%):</td>
                          <td style={{ fontWeight: 800, color: '#ea580c', textAlign: 'right' }}>{formatRupees(summaryTotals.totalTax)}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', height: '30px' }}>
                          <td style={{ fontWeight: 800, color: '#1e293b', fontSize: '12px' }}>Grand Total Net Amount:</td>
                          <td style={{ fontWeight: 900, color: '#4f46e5', textAlign: 'right', fontSize: '13px' }}>{formatRupees(summaryTotals.totalAmount)}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', height: '30px' }}>
                          <td style={{ fontWeight: 700, color: '#16a34a' }}>Total Amount Paid:</td>
                          <td style={{ fontWeight: 800, color: '#16a34a', textAlign: 'right' }}>{formatRupees(summaryTotals.paidAmount)}</td>
                        </tr>
                        <tr style={{ height: '30px' }}>
                          <td style={{ fontWeight: 700, color: '#dc2626' }}>Total Balance Pending:</td>
                          <td style={{ fontWeight: 800, color: '#dc2626', textAlign: 'right' }}>{formatRupees(summaryTotals.pendingAmount)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '60px', paddingTop: '10px', borderTop: '1px solid #cbd5e1' }}>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '10px' }}>* Official computer-generated Material Purchase Summary for {companyName}.</div>
                      <div style={{ color: '#94a3b8', fontSize: '9px', marginTop: '2px' }}>All transactions verified against company ledgers.</div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: '200px' }}>
                      <div style={{ fontWeight: 800, color: '#1e293b', marginBottom: '45px', fontSize: '11px' }}>For, {companyName}</div>
                      <div style={{ color: '#475569', fontWeight: 700, borderTop: '1px solid #94a3b8', paddingTop: '3px', fontSize: '10px' }}>
                        Authorized Signatory
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '9.5px', marginTop: '8px' }}>
                  <div>Printed via Feni Creation Billing System</div>
                  <div>Page {totalPdfPages} of {totalPdfPages}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
