import React, { useRef, useState } from 'react';
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
  AutoAwesome as SparkleIcon,
  ViewAgenda as PagesViewIcon,
  TableRows as TableViewIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
} from '@mui/icons-material';
import { Purchase, CompanySettings } from '../types';
import { formatRupees, formatDate } from '../utils/formatters';
import { useThemeContext } from '../context/ThemeContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

interface FlatRow {
  srNo: number | '';
  challanDate: string;
  challanNo: string;
  supplierName: string;
  parentSupplierName: string;
  parentPurchaseNo: string;
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

  const themeCtx = useThemeContext();
  const currentMode = themeCtx?.mode || 'light';
  const isDark = currentMode === 'dark';
  const isGu = (themeCtx?.language || language) === 'gu';

  const fontStack = "'Noto Sans Gujarati', 'Hind Vadodara', 'Mukta', 'Plus Jakarta Sans', system-ui, -apple-system, Roboto, sans-serif";

  const companyName = settings?.companyName || 'FENI CREATION';
  const companySubtitle = settings?.tagline || (isGu ? 'એમ્બ્રોઇડરી અને ટેક્સટાઇલ મેન્યુફેક્ચરિંગ' : 'Embroidery & Textile Manufacturing');
  const gstin = settings?.gstin || '24ABCDE1234F1Z5';
  const phone = settings?.phone || '+91 98765 43210';
  const email = settings?.email || 'fenicreation001@gmail.com';
  const address = settings?.address || 'Plot No. 124, GIDC Industrial Estate, Varachha, Surat - 395006, Gujarat, India';

  const [viewMode, setViewMode] = useState<'pages' | 'continuous'>('pages');
  const [selectedPreviewPage, setSelectedPreviewPage] = useState<number | 'all'>('all');
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');

  // 1. Flatten purchases into item rows
  const flatRows: FlatRow[] = [];
  let globalSr = 1;

  // Chronologically sort purchases
  const sortedPurchasesList = [...purchases].sort((a, b) => {
    const dateA = a.date || (a.items && a.items[0]?.challanDate) || '';
    const dateB = b.date || (b.items && b.items[0]?.challanDate) || '';
    return dateA.localeCompare(dateB);
  });

  sortedPurchasesList.forEach((p) => {
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
    const statusText = isPaid ? (isGu ? 'ચૂકવેલ' : 'PAID') : isPartial ? (isGu ? 'અંશતઃ' : 'PARTIAL') : (isGu ? 'બાકી' : 'PENDING');

    itemsList.forEach((item, itemIdx) => {
      const itemQty = Number(item.quantity) || 0;
      let itemRate = Number(item.rate) || 0;
      let itemAmt =
        Number(item.amount) > 0
          ? Number(item.amount)
          : Number((item as any).subtotal) > 0
          ? Number((item as any).subtotal)
          : itemQty * itemRate;

      if (itemAmt === 0 && itemIdx === 0 && sub > 0) {
        itemAmt = sub;
      }
      if (itemRate === 0 && itemQty > 0 && itemAmt > 0) {
        itemRate = Number((itemAmt / itemQty).toFixed(2));
      }

      let itemTax = (Number((item as any).cgst) || 0) + (Number((item as any).sgst) || 0);
      if (itemTax === 0 && tax > 0 && sub > 0 && itemAmt > 0) {
        itemTax = Number(((itemAmt / sub) * tax).toFixed(2));
      } else if (itemTax === 0 && itemIdx === 0) {
        itemTax = tax;
      }

      const qtyStr = itemQty > 0 ? `${itemQty} ${item.unit || ''}` : item.quantity ? `${item.quantity} ${item.unit || ''}` : '-';
      const rateStr = itemRate > 0 ? `₹${itemRate}` : item.rate ? `₹${item.rate}` : '-';

      flatRows.push({
        srNo: itemIdx === 0 ? globalSr : '',
        challanDate: formatDate(item.challanDate || pa.challanDate || p.date || ''),
        challanNo: item.challanNo || pa.challanNo || '-',
        supplierName: itemIdx === 0 ? p.supplierName : '',
        parentSupplierName: p.supplierName,
        parentPurchaseNo: p.purchaseNo || '-',
        materialName: item.description || p.materialName || '-',
        quantityStr: qtyStr,
        rateStr: rateStr,
        subtotal: itemAmt,
        tax: itemTax,
        totalAmount: itemIdx === 0 ? tot : 0,
        purchaseNo: itemIdx === 0 ? (p.purchaseNo || '-') : '',
        isPaid,
        isPartial,
        statusText,
      });
    });

    globalSr++;
  });

  // 2. Dynamic balanced pagination for A4 Landscape
  const pages: FlatRow[][] = [];
  const totalRows = flatRows.length;

  if (totalRows === 0) {
    pages.push([]);
  } else {
    const MAX_P1_SINGLE = 20;
    const MAX_P1_MULTI = 26;
    const MAX_MID = 30;
    const MAX_LAST = 26;

    let targetPages = 1;
    if (totalRows > MAX_P1_SINGLE) {
      targetPages = 2;
      while (true) {
        const maxCapacity = MAX_P1_MULTI + (targetPages - 2) * MAX_MID + MAX_LAST;
        if (totalRows <= maxCapacity || targetPages > 50) break;
        targetPages++;
      }
    }

    if (targetPages === 1) {
      pages.push([...flatRows]);
    } else {
      let offset = 0;
      let remaining = totalRows;

      for (let p = 1; p <= targetPages; p++) {
        if (p === targetPages) {
          pages.push(flatRows.slice(offset));
          break;
        }

        const isFirst = p === 1;
        const maxCap = isFirst ? MAX_P1_MULTI : MAX_MID;
        const remainingPages = targetPages - p + 1;
        let take = Math.ceil(remaining / remainingPages);

        const futurePages = targetPages - p;
        const futureMaxCap = (futurePages - 1) * MAX_MID + MAX_LAST;
        if (remaining - take > futureMaxCap) {
          take = remaining - futureMaxCap;
        }
        take = Math.min(maxCap, Math.max(1, take));

        pages.push(flatRows.slice(offset, offset + take));
        offset += take;
        remaining -= take;
      }
    }
  }

  const totalPdfPages = pages.length;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!pdfExportRef.current || downloading) return;
    setDownloading(true);
    setDownloadProgress(isGu ? 'A4 PDF તૈયાર થઈ રહ્યું છે...' : 'Preparing A4 PDF...');

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
      const filename = `Material_Purchase_Statement_${cleanMonth}.pdf`;

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const totalPages = pageElements.length;

      for (let i = 0; i < totalPages; i++) {
        setDownloadProgress(
          isGu
            ? `પેજ ${i + 1} / ${totalPages} ડાઉનલોડ થઈ રહ્યું છે...`
            : `Rendering Page ${i + 1} of ${totalPages}...`
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
      console.error('Error generating A4 PDF:', err);
    } finally {
      setDownloading(false);
      setDownloadProgress('');
    }
  };

  // Reusable Statement Header Component
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
                <span>{isGu ? 'મોબાઇલ' : 'Mobile'}: <strong style={{ color: '#0f172a' }}>{phone.replace(/\|\|+/g, '|').replace(/\s*\|\s*/g, ' | ')}</strong></span>
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
              {isGu ? 'માલ ખરીદી સ્ટેટમેન્ટ' : 'MATERIAL PURCHASE STATEMENT'}
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
              {isGu ? 'માલ ખરીદી સ્ટેટમેન્ટ (ચાલુ)' : 'Material Purchase Statement (Contd.)'}
            </span>
            <span style={{ color: '#94a3b8' }}>•</span>
            <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600 }}>{monthLabel}</span>
          </div>
          <div style={{ fontSize: '10px', color: '#475569', fontWeight: 700 }}>
            {isGu ? `પેજ ${pageNum} / ${totalPdfPages}` : `Page ${pageNum} of ${totalPdfPages}`}
          </div>
        </div>
      );
  };

  // Reusable Executive Summary Cards Bar Component
  const renderSummaryCards = () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '6px',
        marginBottom: '10px',
        padding: '7px 10px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ textAlign: 'center', borderRight: '1px solid #e2e8f0', paddingRight: '4px' }}>
        <div style={{ color: '#64748b', fontWeight: 800, textTransform: 'uppercase', fontSize: '8px', letterSpacing: '0.3px' }}>
          {isGu ? 'કુલ ચલણ' : 'TOTAL CHALLANS'}
        </div>
        <div style={{ fontWeight: 900, color: '#0f766e', fontSize: '12px', marginTop: '1px' }}>
          {summaryTotals.totalChallanCount}
        </div>
      </div>

      <div style={{ textAlign: 'center', borderRight: '1px solid #e2e8f0', paddingRight: '4px' }}>
        <div style={{ color: '#64748b', fontWeight: 800, textTransform: 'uppercase', fontSize: '8px', letterSpacing: '0.3px' }}>
          {isGu ? 'કુલ બિલ' : 'TOTAL BILLS'}
        </div>
        <div style={{ fontWeight: 900, color: '#1d4ed8', fontSize: '12px', marginTop: '1px' }}>
          {summaryTotals.totalInvoices} {isGu ? 'બિલ' : 'Bills'}
        </div>
      </div>

      <div style={{ textAlign: 'center', borderRight: '1px solid #e2e8f0', paddingRight: '4px' }}>
        <div style={{ color: '#64748b', fontWeight: 800, textTransform: 'uppercase', fontSize: '8px', letterSpacing: '0.3px' }}>
          {isGu ? 'કરપાત્ર રકમ' : 'TOTAL SUBTOTAL'}
        </div>
        <div style={{ fontWeight: 900, color: '#4338ca', fontSize: '12px', marginTop: '1px' }}>
          {formatRupees(summaryTotals.totalSubtotal)}
        </div>
      </div>

      <div style={{ textAlign: 'center', borderRight: '1px solid #e2e8f0', paddingRight: '4px' }}>
        <div style={{ color: '#64748b', fontWeight: 800, textTransform: 'uppercase', fontSize: '8px', letterSpacing: '0.3px' }}>
          {isGu ? 'કુલ GST (5%)' : 'TOTAL GST (5%)'}
        </div>
        <div style={{ fontWeight: 900, color: '#c2410c', fontSize: '12px', marginTop: '1px' }}>
          {formatRupees(summaryTotals.totalTax)}
        </div>
      </div>

      <div style={{ textAlign: 'center', borderRight: '1px solid #e2e8f0', paddingRight: '4px' }}>
        <div style={{ color: '#64748b', fontWeight: 800, textTransform: 'uppercase', fontSize: '8px', letterSpacing: '0.3px' }}>
          {isGu ? 'કુલ બિલ રકમ' : 'TOTAL AMOUNT'}
        </div>
        <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '12px', marginTop: '1px' }}>
          {formatRupees(summaryTotals.totalAmount)}
        </div>
      </div>

      <div style={{ textAlign: 'center', borderRight: '1px solid #e2e8f0', paddingRight: '4px' }}>
        <div style={{ color: '#64748b', fontWeight: 800, textTransform: 'uppercase', fontSize: '8px', letterSpacing: '0.3px' }}>
          {isGu ? 'કુલ ચૂકવેલ' : 'TOTAL PAID'}
        </div>
        <div style={{ fontWeight: 900, color: '#16a34a', fontSize: '12px', marginTop: '1px' }}>
          {formatRupees(summaryTotals.paidAmount)}
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#64748b', fontWeight: 800, textTransform: 'uppercase', fontSize: '8px', letterSpacing: '0.3px' }}>
          {isGu ? 'કુલ બાકી રકમ' : 'TOTAL PENDING'}
        </div>
        <div style={{ fontWeight: 900, color: '#dc2626', fontSize: '12px', marginTop: '1px' }}>
          {formatRupees(summaryTotals.pendingAmount)}
        </div>
      </div>
    </div>
  );

  // Table Column Definitions (Sum = exactly 100%)
  const columns = [
    { label: '#', labelGu: '#', width: '3.5%', align: 'center' },
    { label: 'Date', labelGu: 'ચલણ તા.', width: '8.5%', align: 'center' },
    { label: 'Challan No', labelGu: 'ચલણ નં.', width: '8%', align: 'center' },
    { label: 'Party / Supplier', labelGu: 'પાર્ટી / સપ્લાયર', width: '18%', align: 'left' },
    { label: 'Material Item', labelGu: 'મટીરીયલ વિગત', width: '16%', align: 'left' },
    { label: 'Qty & Unit', labelGu: 'જથ્થો', width: '8.5%', align: 'center' },
    { label: 'Rate', labelGu: 'ભાવ', width: '7.5%', align: 'right' },
    { label: 'Subtotal', labelGu: 'કરપાત્ર રકમ', width: '8%', align: 'right' },
    { label: 'GST (5%)', labelGu: 'જીએસટી', width: '6%', align: 'right' },
    { label: 'Total (₹)', labelGu: 'કુલ બિલ', width: '8%', align: 'right' },
    { label: 'Bill No', labelGu: 'બિલ નં.', width: '8%', align: 'center' },
    { label: 'Status', labelGu: 'સ્ટેટસ', width: '8.5%', align: 'center' },
  ];

  // Table Component for an A4 Page
  const renderTable = (rows: FlatRow[], isLastPage: boolean) => (
    <table
      style={{
        width: '100%',
        tableLayout: 'fixed',
        borderCollapse: 'collapse',
        borderSpacing: 0,
        border: '1.5px solid #0f172a',
        backgroundColor: '#ffffff',
        fontFamily: fontStack,
      }}
    >
      <thead>
        <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
          {columns.map((c, idx) => (
            <th
              key={idx}
              style={{
                width: c.width,
                backgroundColor: '#0f172a',
                color: '#ffffff',
                fontWeight: 900,
                textAlign: c.align as any,
                verticalAlign: 'middle',
                padding: '6px 4px',
                fontSize: '9px',
                letterSpacing: '0.3px',
                borderRight: idx === columns.length - 1 ? 'none' : '1px solid #334155',
                borderBottom: '1.5px solid #0f172a',
                whiteSpace: 'nowrap',
              }}
            >
              {isGu ? c.labelGu : c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, rIdx) => {
          const isContinuation = r.srNo === '' && rIdx === 0;
          return (
            <tr
              key={rIdx}
              style={{
                backgroundColor: rIdx % 2 === 0 ? '#ffffff' : '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                height: '24px',
              }}
            >
              {/* 1. Sr No */}
              <td
                style={{
                  borderRight: '1px solid #e2e8f0',
                  padding: '3px 2px',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  fontWeight: 700,
                  fontSize: '9px',
                  color: isContinuation ? '#64748b' : '#0f172a',
                }}
              >
                {r.srNo || (isContinuation ? '↳' : '')}
              </td>

              {/* 2. Date */}
              <td
                style={{
                  borderRight: '1px solid #e2e8f0',
                  padding: '3px 3px',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  whiteSpace: 'nowrap',
                  fontSize: '9px',
                  color: '#334155',
                }}
              >
                {r.challanDate}
              </td>

              {/* 3. Challan No */}
              <td
                style={{
                  borderRight: '1px solid #e2e8f0',
                  padding: '3px 4px',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  fontWeight: 800,
                  color: '#1e40af',
                  whiteSpace: 'nowrap',
                  fontSize: '9px',
                }}
              >
                {r.challanNo}
              </td>

              {/* 4. Party / Supplier */}
              <td
                style={{
                  borderRight: '1px solid #e2e8f0',
                  padding: '3px 5px',
                  textAlign: 'left',
                  verticalAlign: 'middle',
                  fontWeight: 700,
                  color: '#090d16',
                  fontSize: '9px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {r.supplierName ? (
                  r.supplierName
                ) : isContinuation ? (
                  <span style={{ color: '#475569', fontStyle: 'italic', fontSize: '8.5px' }}>
                    {r.parentSupplierName} {isGu ? '(ચાલુ)' : '(Contd.)'}
                  </span>
                ) : (
                  ''
                )}
              </td>

              {/* 5. Material Item */}
              <td
                style={{
                  borderRight: '1px solid #e2e8f0',
                  padding: '3px 5px',
                  textAlign: 'left',
                  verticalAlign: 'middle',
                  fontWeight: 600,
                  fontSize: '9px',
                  color: '#334155',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {r.materialName}
              </td>

              {/* 6. Qty & Unit */}
              <td
                style={{
                  borderRight: '1px solid #e2e8f0',
                  padding: '3px 3px',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  fontSize: '9px',
                  color: '#0f172a',
                }}
              >
                {r.quantityStr}
              </td>

              {/* 7. Rate */}
              <td
                style={{
                  borderRight: '1px solid #e2e8f0',
                  padding: '3px 4px',
                  textAlign: 'right',
                  verticalAlign: 'middle',
                  fontWeight: 600,
                  fontSize: '9px',
                  color: '#334155',
                }}
              >
                {r.rateStr}
              </td>

              {/* 8. Subtotal */}
              <td
                style={{
                  borderRight: '1px solid #e2e8f0',
                  padding: '3px 4px',
                  textAlign: 'right',
                  verticalAlign: 'middle',
                  fontWeight: 600,
                  fontSize: '9px',
                  color: '#0f172a',
                }}
              >
                {formatRupees(r.subtotal)}
              </td>

              {/* 9. GST */}
              <td
                style={{
                  borderRight: '1px solid #e2e8f0',
                  padding: '3px 4px',
                  textAlign: 'right',
                  verticalAlign: 'middle',
                  color: '#64748b',
                  fontSize: '9px',
                }}
              >
                {formatRupees(r.tax)}
              </td>

              {/* 10. Total Bill */}
              <td
                style={{
                  borderRight: '1px solid #e2e8f0',
                  padding: '3px 4px',
                  textAlign: 'right',
                  verticalAlign: 'middle',
                  fontWeight: 800,
                  color: '#0f172a',
                  fontSize: '9px',
                }}
              >
                {r.totalAmount ? formatRupees(r.totalAmount) : ''}
              </td>

              {/* 11. Bill No */}
              <td
                style={{
                  borderRight: '1px solid #e2e8f0',
                  padding: '3px 3px',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  fontWeight: 700,
                  color: '#1e40af',
                  whiteSpace: 'nowrap',
                  fontSize: '9px',
                }}
              >
                {r.purchaseNo ? (
                  r.purchaseNo
                ) : isContinuation ? (
                  <span style={{ color: '#64748b', fontSize: '8.5px' }}>
                    {r.parentPurchaseNo}
                  </span>
                ) : (
                  ''
                )}
              </td>

              {/* 12. Status */}
              <td style={{ padding: '3px 2px', textAlign: 'center', verticalAlign: 'middle' }}>
                {(r.srNo !== '' || isContinuation) && r.statusText ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontSize: '8px',
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                      backgroundColor: r.isPaid ? '#dcfce7' : r.isPartial ? '#fef3c7' : '#fee2e2',
                      color: r.isPaid ? '#15803d' : r.isPartial ? '#b45309' : '#b91c1c',
                      border: `1px solid ${r.isPaid ? '#bbf7d0' : r.isPartial ? '#fde68a' : '#fecaca'}`,
                    }}
                  >
                    {r.statusText}
                  </span>
                ) : null}
              </td>
            </tr>
          );
        })}

        {/* Grand Total Row on the final page */}
        {isLastPage && (
          <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
            <td
              colSpan={7}
              style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                padding: '6px 8px',
                fontWeight: 900,
                textAlign: 'right',
                verticalAlign: 'middle',
                fontSize: '9.5px',
                letterSpacing: '0.4px',
                borderRight: '1px solid #334155',
              }}
            >
              {isGu ? 'કુલ ગ્રાન્ડ ટોટલ સમરી:' : 'GRAND TOTAL SUMMARY:'}
            </td>
            <td
              style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                padding: '6px 4px',
                fontWeight: 900,
                textAlign: 'right',
                verticalAlign: 'middle',
                fontSize: '9.5px',
                borderRight: '1px solid #334155',
              }}
            >
              {formatRupees(summaryTotals.totalSubtotal)}
            </td>
            <td
              style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                padding: '6px 4px',
                fontWeight: 900,
                textAlign: 'right',
                verticalAlign: 'middle',
                fontSize: '9.5px',
                borderRight: '1px solid #334155',
              }}
            >
              {formatRupees(summaryTotals.totalTax)}
            </td>
            <td
              style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                padding: '6px 4px',
                fontWeight: 900,
                textAlign: 'right',
                verticalAlign: 'middle',
                fontSize: '9.5px',
                borderRight: '1px solid #334155',
              }}
            >
              {formatRupees(summaryTotals.totalAmount)}
            </td>
            <td
              colSpan={2}
              style={{
                backgroundColor: '#0f172a',
                color: '#4ade80',
                padding: '6px 4px',
                fontWeight: 900,
                textAlign: 'center',
                verticalAlign: 'middle',
                fontSize: '9px',
              }}
            >
              {isGu ? 'ચૂકવેલ: ' : 'Paid: '}{formatRupees(summaryTotals.paidAmount)} | {isGu ? 'બાકી: ' : 'Pending: '}{formatRupees(summaryTotals.pendingAmount)}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  // Signatures and Statement Footer Component
  const renderSignaturesAndFooter = (isLastPage: boolean, pageNum: number) => (
    <>
      {isLastPage && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginTop: '12px',
            paddingTop: '6px',
            borderTop: '1px solid #cbd5e1',
          }}
        >
          <div>
            <div style={{ color: '#64748b', fontSize: '9px', fontWeight: 600 }}>
              * {isGu ? `આ ${companyName} નું કોમ્પ્યુટર નિર્મિત અધિકૃત માલ ખરીદી સ્ટેટમેન્ટ છે.` : `Official computer-generated Material Purchase Summary for ${companyName}.`}
            </div>
          </div>
          <div style={{ textAlign: 'center', minWidth: '180px' }}>
            <div style={{ fontWeight: 800, color: '#090d16', marginBottom: '20px', fontSize: '10.5px' }}>
              For, {companyName}
            </div>
            <div style={{ color: '#475569', fontWeight: 800, borderTop: '1px solid #94a3b8', paddingTop: '3px', fontSize: '9px' }}>
              {isGu ? 'અધિકૃત સહી' : 'Authorized Signatory'}
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '4px',
          borderTop: '1px solid #e2e8f0',
          color: '#94a3b8',
          fontSize: '8.5px',
          fontWeight: 600,
          marginTop: 'auto',
        }}
      >
        <div>{isGu ? 'ફેની ક્રિએશન બિલિંગ સિસ્ટમ દ્વારા પ્રિન્ટ થયેલ' : 'Printed via Feni Creation Billing System'}</div>
        <div>{isGu ? `પેજ ${pageNum} / ${totalPdfPages}` : `Page ${pageNum} of ${totalPdfPages}`}</div>
      </div>
    </>
  );

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
          bgcolor: isDark ? '#0f172a' : '#f8fafc',
          border: isDark ? '1px solid #1e293b' : 'none',
        },
      }}
    >
      {/* Header Bar */}
      <DialogTitle
        sx={{
          p: { xs: 2, sm: 2.25 },
          background: 'linear-gradient(135deg, #090d16 0%, #1e3a8a 100%)',
          color: '#ffffff',
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
              borderRadius: 2,
              bgcolor: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(4px)',
            }}
          >
            <PdfIcon sx={{ color: '#ffffff', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1rem', sm: '1.2rem' }, lineHeight: 1.2 }}>
              {isGu ? 'માસિક ખરીદી સ્ટેટમેન્ટ' : 'Material Purchase Statement'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#93c5fd', fontSize: '0.78rem', fontWeight: 600 }}>
              {monthLabel} • {pages.length} {isGu ? 'પેજ A4 લેન્ડસ્કેપ' : 'A4 Landscape Pages'}
            </Typography>
          </Box>
        </Box>

        <IconButton
          onClick={onClose}
          sx={{
            color: '#cbd5e1',
            '&:hover': { color: '#ffffff', bgcolor: 'rgba(255, 255, 255, 0.15)' },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Top Action & View Toolbar */}
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: 1.5,
          bgcolor: isDark ? '#111827' : '#ffffff',
          borderBottom: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        {/* Left: View Modes & Page Selectors */}
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
                px: 1.5,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.8rem',
                color: isDark ? '#cbd5e1' : '#475569',
                '&.Mui-selected': {
                  bgcolor: '#1e40af',
                  color: '#ffffff',
                  '&:hover': { bgcolor: '#1e3a8a' },
                },
              },
            }}
          >
            <ToggleButton value="pages">
              <PagesViewIcon sx={{ fontSize: 16, mr: 0.75 }} />
              {isGu ? 'A4 પેજ વ્યુ (PDF)' : 'A4 Page View (PDF)'}
            </ToggleButton>
            <ToggleButton value="continuous">
              <TableViewIcon sx={{ fontSize: 16, mr: 0.75 }} />
              {isGu ? 'સતત સીટ વ્યુ' : 'Full Sheet View'}
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Quick Page filter buttons if in pages mode */}
          {viewMode === 'pages' && pages.length > 1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Chip
                label={isGu ? 'તમામ પેજ' : 'All Pages'}
                size="small"
                onClick={() => setSelectedPreviewPage('all')}
                color={selectedPreviewPage === 'all' ? 'primary' : 'default'}
                variant={selectedPreviewPage === 'all' ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, cursor: 'pointer', borderRadius: '6px' }}
              />
              {pages.map((_, idx) => (
                <Chip
                  key={idx}
                  label={isGu ? `પેજ ${idx + 1}` : `Page ${idx + 1}`}
                  size="small"
                  onClick={() => setSelectedPreviewPage(idx + 1)}
                  color={selectedPreviewPage === idx + 1 ? 'primary' : 'default'}
                  variant={selectedPreviewPage === idx + 1 ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 700, cursor: 'pointer', borderRadius: '6px' }}
                />
              ))}
            </Box>
          )}

          <Chip
            label={monthLabel}
            size="small"
            sx={{ fontWeight: 800, bgcolor: isDark ? '#1e293b' : '#e0e7ff', color: '#1e40af', borderRadius: '6px' }}
          />
        </Box>

        {/* Right: Actions (Excel, PDF, Print) */}
        <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap', alignItems: 'center' }}>
          {onExportExcel && (
            <Button
              variant="outlined"
              color="success"
              size="small"
              startIcon={<ExcelIcon />}
              onClick={onExportExcel}
              sx={{ fontWeight: 700, borderRadius: '8px', textTransform: 'none', px: 1.75 }}
            >
              {isGu ? 'એક્સેલ ડાઉનલોડ' : 'Download Excel'}
            </Button>
          )}

          <Button
            variant="contained"
            size="small"
            startIcon={downloading ? <CircularProgress size={16} sx={{ color: '#ffffff' }} /> : <PdfIcon />}
            onClick={handleDownloadPdf}
            disabled={downloading}
            sx={{
              fontWeight: 800,
              borderRadius: '8px',
              textTransform: 'none',
              px: 2.25,
              bgcolor: '#1e40af',
              '&:hover': { bgcolor: '#1e3a8a' },
            }}
          >
            {downloading
              ? (downloadProgress || (isGu ? 'A4 PDF ડાઉનલોડ...' : 'Downloading A4 PDF...'))
              : (isGu ? 'A4 PDF ડાઉનલોડ' : 'Download A4 PDF')}
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            disabled={downloading}
            sx={{
              fontWeight: 700,
              borderRadius: '8px',
              textTransform: 'none',
              px: 2,
              borderColor: isDark ? '#334155' : '#cbd5e1',
              color: isDark ? '#f8fafc' : '#0f172a',
            }}
          >
            {isGu ? 'પ્રિન્ટ' : 'Print'}
          </Button>
        </Box>
      </Box>

      {/* Main Content Area */}
      <DialogContent sx={{ p: { xs: 1.5, sm: 3 }, bgcolor: isDark ? '#0b0f19' : '#f1f5f9' }}>
        {/* Print Stylesheet for Browser Print */}
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Hind+Vadodara:wght@400;500;600;700&family=Noto+Sans+Gujarati:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');

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
                padding: 0;
                border: none !important;
                box-shadow: none !important;
                background-color: #ffffff !important;
              }
              .pdf-page-block {
                page-break-after: always !important;
                break-after: page !important;
                box-shadow: none !important;
                margin: 0 0 20px 0 !important;
              }
              #pdf-export-container, #pdf-export-container * {
                display: none !important;
                visibility: hidden !important;
              }
              @page {
                size: A4 landscape;
                margin: 6mm;
              }
            }
          `}
        </style>

        {/* ON-SCREEN PREVIEW CONTAINER */}
        <div
          ref={printRef}
          id="printable-purchase-statement"
          style={{
            maxWidth: '1123px',
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box',
          }}
        >
          {/* VIEW MODE 1: A4 PAGE VIEW (Identical to Downloaded PDF) */}
          {viewMode === 'pages' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
              {pages.map((pageRows, pageIdx) => {
                const pageNum = pageIdx + 1;
                const isFirstPage = pageNum === 1;
                const isLastItemPage = pageIdx === pages.length - 1;

                if (selectedPreviewPage !== 'all' && selectedPreviewPage !== pageNum) {
                  return null;
                }

                return (
                  <div key={pageIdx} style={{ width: '100%', maxWidth: '1123px' }}>
                    {pages.length > 1 && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '4px 8px',
                          marginBottom: '6px',
                          color: isDark ? '#94a3b8' : '#64748b',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        <span>
                          {isGu ? `A4 લેન્ડસ્કેપ શીટ - પેજ ${pageNum} / ${totalPdfPages}` : `A4 Landscape Sheet - Page ${pageNum} of ${totalPdfPages}`}
                        </span>
                        <span>{pageRows.length} {isGu ? 'રેકોર્ડ્સ' : 'Records'}</span>
                      </div>
                    )}

                    <Paper
                      elevation={3}
                      className="pdf-page-block"
                      sx={{
                        width: '100%',
                        minHeight: '760px',
                        boxSizing: 'border-box',
                        bgcolor: '#ffffff',
                        color: '#0f172a',
                        fontFamily: fontStack,
                        padding: '24px 28px 18px 28px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {renderHeader(isFirstPage, pageNum)}
                        {isFirstPage && renderSummaryCards()}

                        {/* Table */}
                        <div style={{ overflowX: 'auto', marginBottom: '8px' }}>
                          {renderTable(pageRows, isLastItemPage)}
                        </div>

                        {renderSignaturesAndFooter(isLastItemPage, pageNum)}
                      </div>
                    </Paper>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW MODE 2: CONTINUOUS SHEET VIEW */}
          {viewMode === 'continuous' && (
            <Paper
              elevation={3}
              sx={{
                width: '100%',
                bgcolor: '#ffffff',
                color: '#0f172a',
                fontFamily: fontStack,
                padding: '24px 28px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
              }}
            >
              {renderHeader(true, 1)}
              {renderSummaryCards()}

              {/* All rows rendered continuously */}
              <div style={{ overflowX: 'auto', marginBottom: '12px' }}>
                {renderTable(flatRows, true)}
              </div>

              {renderSignaturesAndFooter(true, 1)}
            </Paper>
          )}
        </div>

        {/* DEDICATED CONTAINER FOR PIXEL-PERFECT A4 LANDSCAPE PDF EXPORT */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: -9999,
            pointerEvents: 'none',
            backgroundColor: '#ffffff',
          }}
        >
          <div
            ref={pdfExportRef}
            id="pdf-export-container"
            style={{
              width: '297mm',
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
                <div
                  key={pageIdx}
                  className="pdf-page-block"
                  style={{
                    width: '297mm',
                    height: '210mm',
                    minHeight: '210mm',
                    maxHeight: '210mm',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    backgroundColor: '#ffffff',
                    fontFamily: fontStack,
                    padding: '7mm 10mm 6mm 10mm',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                  }}
                >
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {renderHeader(isFirstPage, pageNum)}
                    {isFirstPage && renderSummaryCards()}

                    {/* Table */}
                    <div style={{ marginBottom: '6px' }}>
                      {renderTable(pageRows, isLastItemPage)}
                    </div>

                    {renderSignaturesAndFooter(isLastItemPage, pageNum)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
