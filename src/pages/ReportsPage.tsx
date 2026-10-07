import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  MenuItem,
  TextField,
} from '@mui/material';
import ExcelIcon from '@mui/icons-material/FileDownload';
import PdfIcon from '@mui/icons-material/PictureAsPdf';
import CalendarIcon from '@mui/icons-material/CalendarMonth';
import { Bill, Purchase, Worker } from '../types';
import { formatRupees, formatDate } from '../utils/formatters';
import { apiClient } from '../utils/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNotification } from '../context/NotificationContext';
import { useThemeContext } from '../context/ThemeContext';
import { useMonthFilter } from '../context/MonthFilterContext';

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<'billing' | 'purchase' | 'salary' | 'gst'>('billing');
  const [bills, setBills] = useState<Bill[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);

  const { showNotification } = useNotification();
  const { language } = useThemeContext();
  const { selectedMonth, isDateInSelectedMonth, getMonthLabel } = useMonthFilter();

  const filteredBills = bills.filter((b) => isDateInSelectedMonth(b.date || b.createdAt));
  const filteredPurchases = purchases.filter((p) => isDateInSelectedMonth(p.date || p.createdAt));

  useEffect(() => {
    Promise.all([
      apiClient.getBills(),
      apiClient.getPurchases(),
      apiClient.getWorkers(),
    ])
      .then(([b, p, w]) => {
        setBills(b || []);
        setPurchases(p || []);
        setWorkers(w || []);
      })
      .catch(() => {});
  }, []);

  const exportToExcel = () => {
    let exportData: any[] = [];
    let filename = 'Feni_Creation_Report.xlsx';

    if (reportType === 'billing') {
      filename = 'Monthly_Billing_Report.xlsx';
      exportData = filteredBills.map((b) => ({
        'Invoice No': b.invoiceNo,
        Date: b.date,
        'Party Name': b.partyName,
        'GSTIN': b.partyGstin || '',
        Subtotal: b.subtotal,
        'CGST (2.5%)': b.cgst,
        'SGST (2.5%)': b.sgst,
        'Total Tax': b.totalTax,
        'Total Amount': b.totalAmount,
        'Paid Amount': b.paidAmount,
        'Pending Amount': b.pendingAmount,
        Status: b.status,
      }));
    } else if (reportType === 'purchase') {
      filename = 'Material_Purchase_Report.xlsx';
      exportData = filteredPurchases.map((p) => ({
        'Purchase No': p.purchaseNo,
        Date: p.date,
        Supplier: p.supplierName,
        Subtotal: p.subtotal,
        'Total Tax': (p.cgst || 0) + (p.sgst || 0),
        'Total Amount': p.totalAmount,
        'Paid Amount': p.paidAmount,
        'Pending Amount': p.pendingAmount,
        Status: p.status,
      }));
    } else if (reportType === 'salary') {
      filename = 'Worker_Salary_Report.xlsx';
      exportData = workers.map((w) => ({
        'Worker Name': w.name,
        Role: w.role,
        Mobile: w.mobile,
        'Monthly Salary': w.monthlySalary,
        'Advance Paid (Upad)': w.advancePaid,
        'Bonus': w.bonus,
        'Remaining Balance': w.remainingSalary,
        Status: w.status,
      }));
    } else if (reportType === 'gst') {
      filename = 'GST_Summary_Report.xlsx';
      exportData = filteredBills.map((b) => ({
        'Invoice No': b.invoiceNo,
        Date: b.date,
        'Party Name': b.partyName,
        'Taxable Amount': b.subtotal,
        'CGST 2.5%': b.cgst,
        'SGST 2.5%': b.sgst,
        'Total GST 5%': b.totalTax,
        'Invoice Total': b.totalAmount,
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, filename);
    showNotification(`Exported Excel: ${filename}`, 'success');
  };

  const exportToPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('FENI CREATION - MANAGEMENT REPORT', 14, 20);
    doc.setFontSize(11);
    doc.text(`Report Category: ${reportType.toUpperCase()} STATEMENT`, 14, 28);
    doc.text(`Generated On: ${formatDate(new Date().toISOString())}`, 14, 34);

    let headers: string[] = [];
    let rows: any[] = [];

    if (reportType === 'billing') {
      headers = ['Invoice No', 'Date', 'Party', 'Subtotal', 'Tax (5%)', 'Total', 'Status'];
      rows = filteredBills.map((b) => [
        b.invoiceNo,
        formatDate(b.date),
        b.partyName,
        `Rs. ${b.subtotal}`,
        `Rs. ${b.totalTax}`,
        `Rs. ${b.totalAmount}`,
        b.status,
      ]);
    } else if (reportType === 'purchase') {
      headers = ['Purchase No', 'Date', 'Supplier', 'Subtotal', 'Tax', 'Total', 'Status'];
      rows = filteredPurchases.map((p) => [
        p.purchaseNo,
        formatDate(p.date),
        p.supplierName,
        `Rs. ${p.subtotal}`,
        `Rs. ${(p.cgst || 0) + (p.sgst || 0)}`,
        `Rs. ${p.totalAmount}`,
        p.status,
      ]);
    } else if (reportType === 'salary') {
      headers = ['Worker Name', 'Role', 'Monthly Salary', 'Advance (Upad)', 'Bonus', 'Remaining', 'Status'];
      rows = workers.map((w) => [
        w.name,
        w.role,
        `Rs. ${w.monthlySalary}`,
        `Rs. ${w.advancePaid}`,
        `Rs. ${w.bonus}`,
        `Rs. ${w.remainingSalary}`,
        w.status,
      ]);
    } else if (reportType === 'gst') {
      headers = ['Invoice No', 'Party', 'Taxable Val', 'CGST (2.5%)', 'SGST (2.5%)', 'Total GST'];
      rows = filteredBills.map((b) => [
        b.invoiceNo,
        b.partyName,
        `Rs. ${b.subtotal}`,
        `Rs. ${b.cgst}`,
        `Rs. ${b.sgst}`,
        `Rs. ${b.totalTax}`,
      ]);
    }

    autoTable(doc, {
      startY: 42,
      head: [headers],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [26, 54, 93], textColor: 255 },
    });

    doc.save(`Feni_Creation_${reportType}_Report.pdf`);
    showNotification('Exported PDF Report', 'success');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 1.5, sm: 0 }, mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            {language === 'gu' ? 'રિપોર્ટ્સ અને એક્સપોર્ટ' : 'Reports & Analytical Statements'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {language === 'gu' ? 'વેચાણ રિપોર્ટ, ખરીદી રિપોર્ટ, કારીગર પગાર પત્રક અને જીએસટી ટેક્સ રિપોર્ટ' : 'Generate Excel and PDF statements for Billing, Purchases, Worker Salary and GST calculation'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, width: { xs: '100%', sm: 'auto' }, flexWrap: 'wrap' }}>
          <Button component={Link} to="/monthly-summary" variant="contained" startIcon={<CalendarIcon />} sx={{ fontWeight: 800, bgcolor: '#0f172a', color: '#ffffff', '&:hover': { bgcolor: '#1e293b' }, width: { xs: '100%', sm: 'auto' } }}>
            {language === 'gu' ? 'મહિનાવાર સમરી રિપોર્ટ ➔' : 'Month-Wise Summary ➔'}
          </Button>
          <Button variant="contained" color="success" startIcon={<ExcelIcon />} onClick={exportToExcel} sx={{ fontWeight: 700, width: { xs: '100%', sm: 'auto' } }}>
            {language === 'gu' ? 'એક્સેલ ડાઉનલોડ (.xlsx)' : 'Export Excel (.xlsx)'}
          </Button>
          <Button variant="contained" color="secondary" startIcon={<PdfIcon />} onClick={exportToPdf} sx={{ fontWeight: 700, width: { xs: '100%', sm: 'auto' } }}>
            {language === 'gu' ? 'PDF ડાઉનલોડ (.pdf)' : 'Export PDF (.pdf)'}
          </Button>
        </Box>
      </Box>

      <Card sx={{ p: 2, mb: 3 }}>
        <Box sx={{ width: { xs: '100%', sm: 400 } }}>
          <TextField select fullWidth size="small" label={language === 'gu' ? 'રિપોર્ટનો પ્રકાર પસંદ કરો' : 'Select Report Type'} value={reportType} onChange={(e) => setReportType(e.target.value as any)}>
            <MenuItem value="billing">{language === 'gu' ? 'માસિક બિલિંગ અને વેચાણ રિપોર્ટ' : 'Monthly Billing & Sales Report'}</MenuItem>
            <MenuItem value="purchase">{language === 'gu' ? 'મટીરીયલ ખરીદી રિપોર્ટ' : 'Material Purchase Report'}</MenuItem>
            <MenuItem value="salary">{language === 'gu' ? 'કારીગર પગાર રિપોર્ટ' : 'Worker Salary Sheet'}</MenuItem>
            <MenuItem value="gst">{language === 'gu' ? 'જીએસટી ટેક્સ રિપોર્ટ (5%)' : 'GST 5% Tax Summary Report'}</MenuItem>
          </TextField>
        </Box>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            {reportType === 'billing' && (
              <>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>{language === 'gu' ? 'ઇનવોઇસ નં.' : 'Invoice No.'}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>{language === 'gu' ? 'તારીખ' : 'Date'}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>{language === 'gu' ? 'પાર્ટીનું નામ' : 'Party Name'}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">{language === 'gu' ? 'સબટોટલ' : 'Subtotal'}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">{language === 'gu' ? 'જીએસટી (5%)' : 'GST (5%)'}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">{language === 'gu' ? 'કુલ રકમ' : 'Total Amount'}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="center">{language === 'gu' ? 'સ્થિતિ' : 'Status'}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredBills.map((b) => (
                    <TableRow key={b.id} hover>
                      <TableCell sx={{ fontWeight: 800, color: 'primary.main' }}>{b.invoiceNo}</TableCell>
                      <TableCell>{formatDate(b.date)}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{b.partyName}</TableCell>
                      <TableCell align="right">{formatRupees(b.subtotal)}</TableCell>
                      <TableCell align="right">{formatRupees(b.totalTax)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>{formatRupees(b.totalAmount)}</TableCell>
                      <TableCell align="center">{b.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </>
            )}

            {reportType === 'purchase' && (
              <>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>{language === 'gu' ? 'ખરીદી નં.' : 'Purchase No.'}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>{language === 'gu' ? 'તારીખ' : 'Date'}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>{language === 'gu' ? 'સપ્લાયરનું નામ' : 'Supplier Name'}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">{language === 'gu' ? 'સબટોટલ' : 'Subtotal'}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">{language === 'gu' ? 'કુલ જીએસટી' : 'Total GST'}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">{language === 'gu' ? 'કુલ બિલ' : 'Total Bill'}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="center">{language === 'gu' ? 'સ્થિતિ' : 'Status'}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPurchases.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell sx={{ fontWeight: 800, color: 'primary.main' }}>{p.purchaseNo}</TableCell>
                      <TableCell>{formatDate(p.date)}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{p.supplierName}</TableCell>
                      <TableCell align="right">{formatRupees(p.subtotal)}</TableCell>
                      <TableCell align="right">{formatRupees((p.cgst || 0) + (p.sgst || 0))}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>{formatRupees(p.totalAmount)}</TableCell>
                      <TableCell align="center">{p.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </>
            )}

            {reportType === 'salary' && (
              <>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>{language === 'gu' ? 'કારીગરનું નામ' : 'Worker Name'}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>{language === 'gu' ? 'રોલ' : 'Role'}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">{language === 'gu' ? 'મૂળ પગાર' : 'Base Salary'}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">{language === 'gu' ? 'ઉપાડ (-)' : 'Advance / Upad (-)'}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">{language === 'gu' ? 'બોનસ (+)' : 'Bonus (+)'}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">{language === 'gu' ? 'બાકી મળવાપાત્ર' : 'Net Payable'}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="center">{language === 'gu' ? 'સ્થિતિ' : 'Status'}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {workers.map((w) => (
                    <TableRow key={w.id} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{w.name}</TableCell>
                      <TableCell>{w.role}</TableCell>
                      <TableCell align="right">{formatRupees(w.monthlySalary)}</TableCell>
                      <TableCell align="right" sx={{ color: 'error.main' }}>{formatRupees(w.advancePaid)}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>{formatRupees(w.bonus)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>{formatRupees(w.remainingSalary)}</TableCell>
                      <TableCell align="center">{w.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </>
            )}

            {reportType === 'gst' && (
              <>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>{language === 'gu' ? 'ઇનવોઇસ નં.' : 'Invoice No.'}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>{language === 'gu' ? 'પાર્ટીનું નામ' : 'Party Name'}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">{language === 'gu' ? 'ટેક્સ પાત્ર રકમ' : 'Taxable Value'}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">{language === 'gu' ? 'CGST (2.5%)' : 'CGST (2.5%)'}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">{language === 'gu' ? 'SGST (2.5%)' : 'SGST (2.5%)'}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">{language === 'gu' ? 'કુલ GST (5%)' : 'Total GST Tax (5%)'}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredBills.map((b) => (
                    <TableRow key={b.id} hover>
                      <TableCell sx={{ fontWeight: 800, color: 'primary.main' }}>{b.invoiceNo}</TableCell>
                      <TableCell>{b.partyName}</TableCell>
                      <TableCell align="right">{formatRupees(b.subtotal)}</TableCell>
                      <TableCell align="right">{formatRupees(b.cgst)}</TableCell>
                      <TableCell align="right">{formatRupees(b.sgst)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.main' }}>{formatRupees(b.totalTax)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </>
            )}
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};
