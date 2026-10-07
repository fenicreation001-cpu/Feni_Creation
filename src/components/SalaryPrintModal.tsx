import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  CircularProgress,
  IconButton,
  Chip,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import PdfIcon from '@mui/icons-material/PictureAsPdf';
import CloseIcon from '@mui/icons-material/Close';
import BadgeIcon from '@mui/icons-material/Badge';
import { Worker, CompanySettings } from '../types';
import { formatRupees, formatDate } from '../utils/formatters';
import { useCompany } from '../context/CompanyContext';
import html2pdf from 'html2pdf.js';

interface SalaryPrintModalProps {
  open: boolean;
  onClose: () => void;
  worker?: Worker | null;
  workers?: Worker[] | null;
  settings: CompanySettings;
}

export const SalaryPrintModal: React.FC<SalaryPrintModalProps> = ({
  open,
  onClose,
  worker,
  workers,
  settings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const { settings: globalSettings } = useCompany();

  const activeSettings: CompanySettings = {
    ...globalSettings,
    ...settings,
    logoUrl: settings?.logoUrl || globalSettings?.logoUrl || '',
  };

  const workerList: Worker[] = workers && workers.length > 0 ? workers : worker ? [worker] : [];

  if (!open || workerList.length === 0) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const elem = document.getElementById('printable-salary-a4-container');
    if (!elem) return;

    setDownloading(true);
    setProgressText('Preparing A4 PDF...');

    try {
      const fileName =
        workerList.length === 1
          ? `Salary_Slip_${workerList[0].name.replace(/\s+/g, '_')}_A4.pdf`
          : `Salary_Slips_${workerList.length}_Workers_${new Date().toISOString().split('T')[0]}.pdf`;

      const opt = {
        margin: [5, 5, 5, 5] as [number, number, number, number],
        filename: fileName,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
          backgroundColor: '#ffffff',
        },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      await html2pdf().set(opt).from(elem).save();
    } catch (e) {
      console.error('Error creating Salary PDF:', e);
    } finally {
      setDownloading(false);
      setProgressText('');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
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
            <BadgeIcon sx={{ color: '#ffffff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1rem', sm: '1.15rem' }, lineHeight: 1.2 }}>
              Salary Slip Preview (A4 Format) / પગાર સ્લિપ
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>
              {workerList.length === 1
                ? `Worker: ${workerList[0].name}`
                : `${workerList.length} Salary Slips Selected`}
            </Typography>
          </Box>
        </Box>

        <IconButton
          onClick={onClose}
          disabled={downloading}
          sx={{
            color: '#cbd5e1',
            '&:hover': { color: '#ffffff', bgcolor: 'rgba(255, 255, 255, 0.1)' },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Action Toolbar */}
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          bgcolor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', gap: 1.5, width: { xs: '100%', sm: 'auto' } }}>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            disabled={downloading}
            sx={{
              flex: 1,
              fontWeight: 700,
              px: 3,
              py: 1,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)',
              },
            }}
          >
            {workerList.length > 1 ? `Print ${workerList.length} A4 Slips` : 'Print A4 Salary Slip'}
          </Button>

          <Button
            variant="contained"
            startIcon={downloading ? <CircularProgress size={18} color="inherit" /> : <PdfIcon />}
            onClick={handleDownloadPdf}
            disabled={downloading}
            sx={{
              flex: 1,
              fontWeight: 700,
              px: 3,
              py: 1,
              borderRadius: 2,
              bgcolor: '#0f172a',
              color: '#ffffff',
              '&:hover': { bgcolor: '#1e293b' },
            }}
          >
            {downloading ? progressText : workerList.length > 1 ? `Download ${workerList.length} PDFs` : 'Download A4 PDF'}
          </Button>
        </Box>

        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
          {activeSettings.companyName || 'FENI CREATION'} • Standard A4 Format
        </Typography>
      </Box>

      {/* Printable Area - Standard A4 Width (750px) */}
      <DialogContent sx={{ p: { xs: 1.5, sm: 3 }, bgcolor: '#cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #printable-salary-a4-container, #printable-salary-a4-container * {
              visibility: visible !important;
            }
            #printable-salary-a4-container {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: none !important;
              box-shadow: none !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .a4-salary-slip-card {
              box-shadow: none !important;
              margin: 0 !important;
              border: 1px solid #000000 !important;
              page-break-after: always !important;
              break-after: page !important;
            }
            .a4-salary-slip-card:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
            @page {
              size: A4 portrait;
              margin: 5mm;
            }
          }
        `}</style>

        <div id="printable-salary-a4-container" ref={containerRef} style={{ width: '750px' }}>
          {workerList.map((w, index) => {
            const other = w.otherAmount || 0;
            const grossPayable = (w.monthlySalary || 0) + (w.bonus || 0);
            const netGross = grossPayable + (other > 0 ? other : 0);
            const remaining = w.remainingSalary ?? (grossPayable + other - (w.advancePaid || 0) - (w.paidSalaryAmount || 0));

            return (
              <div
                key={w.id || index}
                id={`printable-salary-slip-${index}`}
                className="a4-salary-slip-card"
                style={{
                  width: '750px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  padding: '32px',
                  marginBottom: index === workerList.length - 1 ? '0' : '24px',
                  boxSizing: 'border-box',
                }}
              >
                {/* Brand Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '18px',
                    borderBottom: '3px solid #4f46e5',
                    marginBottom: '24px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {activeSettings.logoUrl ? (
                      <img
                        src={activeSettings.logoUrl}
                        alt={activeSettings.companyName || 'Logo'}
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '10px',
                          objectFit: 'contain',
                          border: '1px solid #cbd5e1',
                          padding: '2px',
                          backgroundColor: '#ffffff',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '10px',
                          backgroundColor: '#4f46e5',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '900',
                          fontSize: '22px',
                          flexShrink: 0,
                        }}
                      >
                        {activeSettings.companyName ? activeSettings.companyName.substring(0, 2).toUpperCase() : 'FC'}
                      </div>
                    )}

                    <div>
                      <div
                        style={{
                          fontWeight: '900',
                          color: '#1e1b4b',
                          fontSize: '24px',
                          lineHeight: '1.1',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {activeSettings.companyName || 'FENI CREATION'}
                      </div>
                      <div style={{ fontWeight: '700', color: '#4f46e5', fontSize: '13px', marginTop: '3px' }}>
                        {activeSettings.tagline || 'Embroidery & Textile Manufacturing'}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
                        GSTIN: <strong style={{ color: '#0f172a' }}>{activeSettings.gstin || '24ABCDE1234F1Z5'}</strong> • Mobile: {activeSettings.phone || '+91 98765 43210'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div
                      style={{
                        width: '220px',
                        backgroundColor: '#1e1b4b',
                        color: '#ffffff',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ color: '#ffffff', fontWeight: '800', fontSize: '13px', letterSpacing: '0.05em', lineHeight: '1.3', textAlign: 'center', width: '100%' }}>
                        KARIGAR PAGAR PATRAK
                      </div>
                      <div style={{ color: '#ffffff', fontWeight: '800', fontSize: '13px', marginTop: '3px', lineHeight: '1.3', textAlign: 'center', width: '100%' }}>
                        (કારીગર પગાર પત્રક)
                      </div>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', marginTop: '6px', textAlign: 'center', width: '220px' }}>
                      Date: {formatDate(new Date().toISOString().split('T')[0])}
                    </div>
                  </div>
                </div>

                {/* Worker Details Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    padding: '20px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '24px',
                  }}
                >
                  <div>
                    <div style={{ color: '#64748b', fontWeight: '700', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                      Worker Name / કારીગરનું નામ
                    </div>
                    <div style={{ fontWeight: '900', color: '#0f172a', fontSize: '18px', marginTop: '4px' }}>
                      {w.name} {w.gujaratiName ? <span style={{ color: '#4338ca', fontWeight: '800' }}>({w.gujaratiName})</span> : ''}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '13px', marginTop: '6px' }}>
                      Mobile: <strong style={{ color: '#0f172a' }}>{w.mobile || '-'}</strong>
                    </div>
                  </div>

                  <div>
                    <div style={{ color: '#64748b', fontWeight: '700', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                      Role & Attendance / કામગીરી
                    </div>
                    <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '16px', marginTop: '4px' }}>
                      {w.role}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '13px', marginTop: '6px' }}>
                      Attendance: <strong style={{ color: '#0f172a' }}>{w.days ?? 30} Days / દિવસો</strong>
                      {w.joiningDate ? ` • Joining: ${formatDate(w.joiningDate)}` : ''}
                    </div>
                  </div>
                </div>

                {/* Salary Breakdown Table */}
                <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #cbd5e1', marginBottom: '24px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#1e1b4b', color: '#ffffff' }}>
                        <th
                          style={{
                            backgroundColor: '#1e1b4b',
                            color: '#ffffff',
                            fontWeight: '800',
                            fontSize: '13px',
                            padding: '12px 16px',
                            textAlign: 'left',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderBottom: 'none',
                          }}
                        >
                          Salary Component (વિગત)
                        </th>
                        <th
                          style={{
                            backgroundColor: '#1e1b4b',
                            color: '#ffffff',
                            fontWeight: '800',
                            fontSize: '13px',
                            padding: '12px 16px',
                            textAlign: 'right',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            borderBottom: 'none',
                          }}
                        >
                          Amount (₹)
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {/* Base Salary */}
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '700', color: '#334155' }}>
                          Monthly Base Salary (માસિક મૂળ પગાર)
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: '800', color: '#0f172a', textAlign: 'right' }}>
                          {formatRupees(w.monthlySalary)}
                        </td>
                      </tr>

                      {/* Bonus */}
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '700', color: '#166534' }}>
                          Bonus (+) (બોનસ)
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: '800', color: '#166534', textAlign: 'right' }}>
                          +{formatRupees(w.bonus)}
                        </td>
                      </tr>

                      {/* Other Amount (+ / -) */}
                      {other !== 0 && (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: '800', color: other > 0 ? '#166534' : '#dc2626' }}>
                              {other > 0 ? 'Other Allowance / Adjustment (+) (અન્ય ઉમેરો)' : 'Other Deduction / Adjustment (-) (અન્ય કપાત)'}
                            </div>
                            {w.notes && (
                              <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>
                                Note / વિગત: {w.notes}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: '800', color: other > 0 ? '#166534' : '#dc2626', textAlign: 'right' }}>
                            {other > 0 ? `+${formatRupees(other)}` : `-${formatRupees(Math.abs(other))}`}
                          </td>
                        </tr>
                      )}

                      {/* Note Row if other === 0 but notes exists */}
                      {other === 0 && w.notes && (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 16px' }} colSpan={2}>
                            <div style={{ color: '#475569', fontSize: '12px' }}>
                              <strong>Note / વિગત:</strong> {w.notes}
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Total Gross Payable */}
                      <tr style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '900', color: '#1e1b4b' }}>
                          Total Gross Payable (કુલ મળવાપાત્ર રકમ)
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: '900', color: '#1e1b4b', textAlign: 'right', fontSize: '15px' }}>
                          {formatRupees(grossPayable + (other > 0 ? other : 0))}
                        </td>
                      </tr>

                      {/* Advance Paid / Upad */}
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: '800', color: '#dc2626' }}>
                            Advance Paid / Upad (-) (ઉપાડ બાદ)
                          </div>
                          {w.advances && w.advances.length > 0 && (
                            <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: '#fef2f2', borderRadius: '6px', borderLeft: '3px solid #ef4444' }}>
                              <div style={{ fontWeight: '800', color: '#991b1b', fontSize: '11px', marginBottom: '4px' }}>
                                Upad History (ઉપાડની તારીખવાર વિગત):
                              </div>
                              {w.advances.map((adv, idx) => (
                                <div key={adv.id || idx} style={{ color: '#7f1d1d', fontSize: '12px', paddingTop: '2px', paddingBottom: '2px' }}>
                                  • {formatDate(adv.date)}: <strong>{formatRupees(adv.amount)}</strong> {adv.notes ? `(${adv.notes})` : ''}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: '800', color: '#dc2626', textAlign: 'right', verticalAlign: 'top' }}>
                          -{formatRupees(w.advancePaid)}
                        </td>
                      </tr>

                      {/* Paid Salary Amount */}
                      {(w.paidSalaryAmount ?? 0) > 0 && (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: '800', color: '#0284c7' }}>
                              Paid Salary Amount (-) (ચૂકવેલ પગાર)
                            </div>
                            {w.paymentMethod && (
                              <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>
                                Payment Mode: {w.paymentMethod}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: '800', color: '#0284c7', textAlign: 'right' }}>
                            -{formatRupees(w.paidSalaryAmount || 0)}
                          </td>
                        </tr>
                      )}

                      {/* Net Remaining Salary */}
                      <tr style={{ backgroundColor: '#f0fdf4', borderTop: '2px solid #10b981' }}>
                        <td style={{ padding: '16px', fontWeight: '900', fontSize: '15px', color: '#065f46' }}>
                          Net Remaining Salary (બાકી ચૂકવવાનો પગાર)
                        </td>
                        <td style={{ padding: '16px', fontWeight: '900', fontSize: '18px', color: '#065f46', textAlign: 'right' }}>
                          {formatRupees(remaining)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Signatures & Seal */}
                <div style={{ marginTop: '48px', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div style={{ textAlign: 'center', width: '200px' }}>
                    <div style={{ height: '36px', borderBottom: '1px dashed #94a3b8', marginBottom: '8px' }} />
                    <div style={{ fontWeight: '800', color: '#475569', fontSize: '12px' }}>
                      Worker Signature (કારીગર સહી)
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', width: '220px' }}>
                    <div
                      style={{
                        height: '48px',
                        border: '1.5px dashed #a5b4fc',
                        borderRadius: '8px',
                        backgroundColor: '#faf5ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <span style={{ color: '#6366f1', fontWeight: '800', fontSize: '11px', letterSpacing: '0.05em' }}>
                        [ AUTHORIZED SEAL ]
                      </span>
                    </div>
                    <div style={{ fontWeight: '800', color: '#1e1b4b', fontSize: '12px' }}>
                      For {activeSettings.companyName || 'FENI CREATION'}
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





