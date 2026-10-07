import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import PdfIcon from '@mui/icons-material/PictureAsPdf';
import CloseIcon from '@mui/icons-material/Close';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { Bill, CompanySettings } from '../types';
import { formatDate, numberToWords } from '../utils/formatters';
import { getBillCalculatedTotals } from '../utils/billCalculations';
import html2pdf from 'html2pdf.js';
import { BillDetailsPdfTemplate } from './BillDetailsPdfTemplate';
import { downloadDetailsPdfWithReactPdf } from '../utils/reactPdfDetails';
import { useThemeContext } from '../context/ThemeContext';

interface InvoiceModalProps {
  open: boolean;
  onClose: () => void;
  bill: Bill | null;
  bills?: Bill[];
  settings: CompanySettings;
}

interface SingleBillInvoiceRenderProps {
  bill: Bill;
  template: 'freight' | 'classic';
  settings: CompanySettings;
  isLast: boolean;
}

const SingleBillInvoiceRender: React.FC<SingleBillInvoiceRenderProps> = ({
  bill,
  template,
  settings,
  isLast,
}) => {
  // Calculate totals
  const items = bill.items || [];
  const totalQty = items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  
  const calcTotals = getBillCalculatedTotals(bill);
  const grossBillingAmount = calcTotals.totalBillingAmount;
  const totalDiscount = calcTotals.totalDiscount;
  const extraCharges = calcTotals.charge;
  const valueAfterKapad = Math.max(0, grossBillingAmount - extraCharges);
  const subtotal = calcTotals.subtotal;

  // Calculate CGST + SGST
  const cgst = bill.cgst !== undefined ? Number(bill.cgst) : Number((subtotal * 0.025).toFixed(2));
  const sgst = bill.sgst !== undefined ? Number(bill.sgst) : Number((subtotal * 0.025).toFixed(2));
  const totalTax = calcTotals.totalTax;
  const roundOff = calcTotals.roundOff;
  const totalAmount = calcTotals.totalAmount;

  // Minimum rows for clean paper structure
  const minRows = 8;
  const emptyRowsCount = Math.max(0, minRows - items.length);

  return (
    <div
      className="invoice-card-container"
      style={{
        width: '750px',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: "'Noto Sans Gujarati', 'Mukta', 'Hind Vadodara', Arial, Helvetica, sans-serif",
        fontSize: '11px',
        border: '1px solid #000000',
        boxSizing: 'border-box',
        padding: '0',
        margin: isLast ? '12px auto' : '12px auto 28px auto',
        boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
        pageBreakAfter: isLast ? 'auto' : 'always',
        breakAfter: isLast ? 'auto' : 'page',
      }}
    >
          {template === 'freight' ? (
            /* ========================================================= */
            /* FREIGHT TOOLS DESIGN (Matching User's Reference Image)    */
            /* ========================================================= */
            <div style={{ width: '750px', boxSizing: 'border-box' }}>
              {/* Header Top Table */}
              <table style={{ width: '750px', tableLayout: 'fixed', borderCollapse: 'collapse', borderSpacing: '0', backgroundColor: '#ffffff' }}>
                <colgroup>
                  <col style={{ width: '460px' }} />
                  <col style={{ width: '290px' }} />
                </colgroup>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px 12px 6px 12px', verticalAlign: 'top' }}>
                      <div
                        style={{
                          fontSize: '20px',
                          fontWeight: 'bold',
                          color: '#1e1b4b',
                          letterSpacing: '0.5px',
                          fontFamily: 'Arial, Helvetica, sans-serif',
                          textTransform: 'uppercase',
                          lineHeight: '22px',
                          margin: '0 0 4px 0',
                        }}
                      >
                        {settings.companyName || 'FENI CREATION'}
                      </div>

                      {/* Teal Banner Bar */}
                      <div
                        style={{
                          display: 'inline-block',
                          backgroundColor: '#008b8b',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          padding: '4px 10px',
                          lineHeight: '15px',
                          margin: '2px 0 6px 0',
                          borderRadius: '2px',
                          whiteSpace: 'nowrap',
                          boxSizing: 'border-box',
                        }}
                      >
                        {settings.tagline || 'Embroidery & Textile Manufacturing'}
                      </div>

                      {/* Address Lines */}
                      <div style={{ fontSize: '11px', color: '#1e293b', lineHeight: '15px' }}>
                        {settings.address || 'Plot No. 124, GIDC Industrial Estate, Varachha, Surat - 395006, Gujarat, India'}
                      </div>
                    </td>

                    <td style={{ padding: '10px 12px 6px 12px', verticalAlign: 'top', textAlign: 'right' }}>
                      {/* Logo Graphic */}
                      <div style={{ minHeight: '38px', marginBottom: '4px', textAlign: 'right' }}>
                        {settings.logoUrl ? (
                          <img src={settings.logoUrl} alt="Logo" style={{ maxHeight: '38px', maxWidth: '140px', objectFit: 'contain', display: 'inline-block' }} />
                        ) : (
                          <div style={{ display: 'inline-block' }}>
                            <table style={{ borderCollapse: 'collapse', borderSpacing: '0', marginLeft: 'auto' }}>
                              <tbody>
                                <tr>
                                  <td style={{ verticalAlign: 'middle', paddingRight: '6px' }}>
                                    <svg width="34" height="34" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z" stroke="#008b8b" strokeWidth="6" fill="none" />
                                      <path d="M50 10 L50 90 M15 30 L85 70 M85 30 L15 70" stroke="#008b8b" strokeWidth="4" />
                                      <circle cx="50" cy="50" r="10" fill="#1e1b4b" />
                                    </svg>
                                  </td>
                                  <td style={{ verticalAlign: 'middle', textAlign: 'left', lineHeight: '12px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e1b4b', letterSpacing: '0.5px', lineHeight: '14px' }}>LOGOTEXT</div>
                                    <div style={{ fontSize: '8px', color: '#64748b', letterSpacing: '1px', marginTop: '1px', lineHeight: '10px' }}>SLOGANHERE</div>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Contact Rows */}
                      <div style={{ fontSize: '11px', lineHeight: '16px', color: '#0f172a', textAlign: 'right' }}>
                        <div><b>Tel :</b> {settings.phone || '+91 98765 43210'}</div>
                        <div><b>Web :</b> {settings.email || 'fenicreation001@gmail.com'}</div>
                        <div><b>Web :</b> info@gft.com</div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* TAX INVOICE Header Box */}
              <div
                style={{
                  width: '750px',
                  boxSizing: 'border-box',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  padding: '4px 0',
                  borderTop: '1px solid #000000',
                  borderBottom: '1px solid #000000',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  backgroundColor: '#ffffff',
                  lineHeight: '16px',
                }}
              >
                TAX INVOICE
              </div>

              {/* Party & Invoice Details Table (2 Columns) */}
              <table style={{ width: '750px', tableLayout: 'fixed', borderCollapse: 'collapse', borderSpacing: '0', borderBottom: '1px solid #000000' }}>
                <colgroup>
                  <col style={{ width: '460px' }} />
                  <col style={{ width: '290px' }} />
                </colgroup>
                <tbody>
                  <tr>
                    {/* Left Column: Party Details */}
                    <td style={{ borderRight: '1px solid #000000', padding: '6px 10px', verticalAlign: 'top' }}>
                      <table style={{ width: '440px', tableLayout: 'fixed', borderCollapse: 'collapse', borderSpacing: '0', fontSize: '11px', lineHeight: '17px' }}>
                        <tbody>
                          <tr>
                            <td style={{ width: '85px', fontWeight: 'bold', verticalAlign: 'top', lineHeight: '17px' }}>Party Name</td>
                            <td style={{ fontWeight: 'bold', verticalAlign: 'top', lineHeight: '17px' }}>: {bill.partyName}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold', verticalAlign: 'top', lineHeight: '17px' }}>Name</td>
                            <td style={{ verticalAlign: 'top', lineHeight: '17px' }}>: {bill.notes || 'સાડી નું કાપડ'}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold', verticalAlign: 'top', lineHeight: '17px' }}>Address</td>
                            <td style={{ verticalAlign: 'top', lineHeight: '17px' }}>: {bill.partyAddress || 'Sumel Business Park 7, Kochi, Kerala - 380023'}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold', verticalAlign: 'top', lineHeight: '17px' }}>GSTIN</td>
                            <td style={{ verticalAlign: 'top', lineHeight: '17px' }}>: {bill.partyGstin || '32AABBA7990B1ZB'}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold', verticalAlign: 'top', lineHeight: '17px' }}>Phone</td>
                            <td style={{ verticalAlign: 'top', lineHeight: '17px' }}>: {bill.partyMobile || '9878799879'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>

                    {/* Right Column: Invoice Metadata */}
                    <td style={{ padding: '6px 10px', verticalAlign: 'top' }}>
                      <table style={{ width: '270px', tableLayout: 'fixed', borderCollapse: 'collapse', borderSpacing: '0', fontSize: '11px', lineHeight: '17px' }}>
                        <tbody>
                          <tr>
                            <td style={{ width: '90px', fontWeight: 'bold', verticalAlign: 'top', lineHeight: '17px' }}>Invoice</td>
                            <td style={{ fontWeight: 'bold', textAlign: 'right', verticalAlign: 'top', lineHeight: '17px' }}>{bill.isWorking || !bill.invoiceNo ? 'Working Challan' : bill.invoiceNo}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold', verticalAlign: 'top', lineHeight: '17px' }}>Invoice Date</td>
                            <td style={{ textAlign: 'right', verticalAlign: 'top', lineHeight: '17px' }}>{bill.isWorking || !bill.invoiceNo ? '-' : formatDate(bill.date)}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold', verticalAlign: 'top', lineHeight: '17px' }}>Party Ch. No</td>
                            <td style={{ textAlign: 'right', verticalAlign: 'top', lineHeight: '17px' }}>{bill.challanNo || items[0]?.challanNo || '1015'}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold', verticalAlign: 'top', lineHeight: '17px' }}>Party Ch. Date</td>
                            <td style={{ textAlign: 'right', verticalAlign: 'top', lineHeight: '17px' }}>{formatDate(bill.dueDate || bill.date)}</td>
                          </tr>
                          {(bill.deliveryDate || items[0]?.deliveryDate) && (
                            <tr>
                              <td style={{ fontWeight: 'bold', verticalAlign: 'top', lineHeight: '17px' }}>Delivery Date</td>
                              <td style={{ textAlign: 'right', verticalAlign: 'top', lineHeight: '17px' }}>{formatDate(bill.deliveryDate || items[0]?.deliveryDate)}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Main Product Table (Pure HTML Table Structure) */}
              <table style={{ width: '750px', tableLayout: 'fixed', borderCollapse: 'collapse', borderSpacing: '0', fontSize: '11px', emptyCells: 'show' }}>
                <colgroup>
                  <col style={{ width: '38px' }} />
                  <col style={{ width: '242px' }} />
                  <col style={{ width: '60px' }} />
                  <col style={{ width: '50px' }} />
                  <col style={{ width: '60px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '40px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '80px' }} />
                </colgroup>
                <thead>
                  <tr style={{ height: '22px' }}>
                    <th rowSpan={2} style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', verticalAlign: 'middle', textAlign: 'center', fontWeight: 'bold', padding: '4px 2px', lineHeight: '14px' }}>Sr.<br />No.</th>
                    <th rowSpan={2} style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', verticalAlign: 'middle', textAlign: 'left', fontWeight: 'bold', padding: '4px 6px', lineHeight: '14px' }}>Description</th>
                    <th rowSpan={2} style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', verticalAlign: 'middle', textAlign: 'center', fontWeight: 'bold', padding: '4px 2px', lineHeight: '14px' }}>HSN</th>
                    <th rowSpan={2} style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', verticalAlign: 'middle', textAlign: 'center', fontWeight: 'bold', padding: '4px 2px', lineHeight: '14px' }}>Qty</th>
                    <th rowSpan={2} style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', verticalAlign: 'middle', textAlign: 'center', fontWeight: 'bold', padding: '4px 2px', lineHeight: '14px' }}>Rate</th>
                    <th rowSpan={2} style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', verticalAlign: 'middle', textAlign: 'center', fontWeight: 'bold', padding: '4px 2px', lineHeight: '14px' }}>Taxable Value</th>
                    <th colSpan={2} style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', verticalAlign: 'middle', textAlign: 'center', fontWeight: 'bold', padding: '4px 2px', lineHeight: '14px' }}>IGST / GST</th>
                    <th rowSpan={2} style={{ borderBottom: '1px solid #000000', verticalAlign: 'middle', textAlign: 'center', fontWeight: 'bold', padding: '4px 2px', lineHeight: '14px' }}>Total</th>
                  </tr>
                  <tr style={{ height: '18px' }}>
                    <th style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', verticalAlign: 'middle', textAlign: 'center', fontWeight: 'bold', padding: '3px 2px', lineHeight: '14px' }}>%</th>
                    <th style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', verticalAlign: 'middle', textAlign: 'center', fontWeight: 'bold', padding: '3px 2px', lineHeight: '14px' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const itemQty = Number(item.quantity) || 0;
                    const itemRate = Number(item.rate) || 0;
                    const itemTaxable = itemQty * itemRate;
                    const itemTaxAmt = itemTaxable * 0.05;
                    const itemTotal = itemTaxable + itemTaxAmt;

                    return (
                      <tr key={index} style={{ height: '24px', borderBottom: '1px solid #000000' }}>
                        <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '3px 2px', verticalAlign: 'middle', lineHeight: '15px' }}>{index + 1}</td>
                        <td style={{ borderRight: '1px solid #000000', padding: '3px 6px', fontWeight: 'bold', verticalAlign: 'middle', lineHeight: '15px' }}>
                          {(() => {
                            let desc = item.description || 'Item';
                            desc = desc.replace(/^Design\s*#?\s*/i, '');
                            if (item.designNo) {
                              const cleanDesign = item.designNo.replace(/^Design\s*#?\s*/i, '');
                              if (!desc.toLowerCase().includes(cleanDesign.toLowerCase())) {
                                return `${cleanDesign} - ${desc}`;
                              }
                            }
                            return desc;
                          })()}
                        </td>
                        <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '3px 2px', verticalAlign: 'middle', lineHeight: '15px' }}>
                          {item.hsnCode || settings.hsnCode || '9988'}
                        </td>
                        <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '3px 2px', verticalAlign: 'middle', lineHeight: '15px' }}>{item.quantity}</td>
                        <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '3px 2px', verticalAlign: 'middle', lineHeight: '15px' }}>{item.rate}</td>
                        <td style={{ borderRight: '1px solid #000000', textAlign: 'right', padding: '3px 6px', verticalAlign: 'middle', lineHeight: '15px' }}>
                          {itemTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '3px 2px', verticalAlign: 'middle', lineHeight: '15px' }}>5%</td>
                        <td style={{ borderRight: '1px solid #000000', textAlign: 'right', padding: '3px 4px', verticalAlign: 'middle', lineHeight: '15px' }}>
                          {itemTaxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'right', padding: '3px 6px', fontWeight: 'bold', verticalAlign: 'middle', lineHeight: '15px' }}>
                          {itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Empty rows filler for paper feel */}
                  {Array.from({ length: emptyRowsCount }).map((_, idx) => (
                    <tr key={`empty-${idx}`} style={{ height: '24px', borderBottom: '1px solid #000000' }}>
                      <td style={{ borderRight: '1px solid #000000', height: '24px', lineHeight: '15px' }}>&nbsp;</td>
                      <td style={{ borderRight: '1px solid #000000', height: '24px', lineHeight: '15px' }}>&nbsp;</td>
                      <td style={{ borderRight: '1px solid #000000', height: '24px', lineHeight: '15px' }}>&nbsp;</td>
                      <td style={{ borderRight: '1px solid #000000', height: '24px', lineHeight: '15px' }}>&nbsp;</td>
                      <td style={{ borderRight: '1px solid #000000', height: '24px', lineHeight: '15px' }}>&nbsp;</td>
                      <td style={{ borderRight: '1px solid #000000', height: '24px', lineHeight: '15px' }}>&nbsp;</td>
                      <td style={{ borderRight: '1px solid #000000', height: '24px', lineHeight: '15px' }}>&nbsp;</td>
                      <td style={{ borderRight: '1px solid #000000', height: '24px', lineHeight: '15px' }}>&nbsp;</td>
                      <td style={{ height: '24px', lineHeight: '15px' }}>&nbsp;</td>
                    </tr>
                  ))}

                  {/* Table Total Row */}
                  <tr style={{ borderTop: '1px solid #000000', borderBottom: '1px solid #000000', height: '26px', fontWeight: 'bold' }}>
                    <td colSpan={3} style={{ borderRight: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', lineHeight: '16px' }}>
                      Total
                    </td>
                    <td style={{ borderRight: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', lineHeight: '16px' }}>{totalQty}</td>
                    <td style={{ borderRight: '1px solid #000000', verticalAlign: 'middle', lineHeight: '16px' }}>&nbsp;</td>
                    <td style={{ borderRight: '1px solid #000000', textAlign: 'right', paddingRight: '6px', verticalAlign: 'middle', lineHeight: '16px' }}>
                      {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ borderRight: '1px solid #000000', verticalAlign: 'middle', lineHeight: '16px' }}>&nbsp;</td>
                    <td style={{ borderRight: '1px solid #000000', textAlign: 'right', paddingRight: '4px', verticalAlign: 'middle', lineHeight: '16px' }}>
                      {totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '6px', verticalAlign: 'middle', lineHeight: '16px' }}>
                      {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Bottom Structured Master Table */}
              <table style={{ width: '750px', tableLayout: 'fixed', borderCollapse: 'collapse', borderSpacing: '0', fontSize: '11px', emptyCells: 'show' }}>
                <colgroup>
                  <col style={{ width: '460px' }} />
                  <col style={{ width: '290px' }} />
                </colgroup>
                <tbody>
                  {/* Row 1: Words & Bank Details (left) + Tax Summary (right) */}
                  <tr>
                    <td style={{ verticalAlign: 'top', borderRight: '1px solid #000000', borderBottom: '1px solid #000000', padding: '0' }}>
                      <table style={{ width: '460px', tableLayout: 'fixed', borderCollapse: 'collapse', borderSpacing: '0' }}>
                        <tbody>
                          <tr>
                            <td style={{ borderBottom: '1px solid #000000', padding: '6px 8px', textAlign: 'center' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '11px', lineHeight: '15px' }}>Total in words</div>
                              <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#008b8b', marginTop: '2px', lineHeight: '15px' }}>
                                {numberToWords(totalAmount)}
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ borderBottom: '1px solid #000000', padding: '4px 0', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', lineHeight: '15px' }}>
                              Bank Details
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '6px 10px' }}>
                              <table style={{ width: '440px', tableLayout: 'fixed', borderCollapse: 'collapse', borderSpacing: '0', fontSize: '11px', lineHeight: '17px' }}>
                                <tbody>
                                  <tr>
                                    <td style={{ width: '90px', fontWeight: 'bold', lineHeight: '17px' }}>Name</td>
                                    <td style={{ lineHeight: '17px' }}>: {settings.bankName || 'State Bank of India'}</td>
                                  </tr>
                                  <tr>
                                    <td style={{ fontWeight: 'bold', lineHeight: '17px' }}>Acc. Number</td>
                                    <td style={{ lineHeight: '17px' }}>: {settings.accountNo || '39485726102'}</td>
                                  </tr>
                                  <tr>
                                    <td style={{ fontWeight: 'bold', lineHeight: '17px' }}>IFSC</td>
                                    <td style={{ lineHeight: '17px' }}>: {settings.ifscCode || 'SBIN0001234'}</td>
                                  </tr>
                                  <tr>
                                    <td style={{ fontWeight: 'bold', lineHeight: '17px' }}>Branch</td>
                                    <td style={{ lineHeight: '17px' }}>: Surate</td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>

                    {/* Taxable Amount / Total Tax / Total Amount After Tax */}
                    <td style={{ verticalAlign: 'top', borderBottom: '1px solid #000000', padding: '0' }}>
                      <table style={{ width: '290px', tableLayout: 'fixed', borderCollapse: 'collapse', borderSpacing: '0', fontSize: '11px' }}>
                        <tbody>
                          <tr>
                            <td style={{ padding: '6px 8px', fontWeight: 'bold', verticalAlign: 'middle', lineHeight: '16px', borderBottom: '1px solid #000000' }}>Gross Billing Amount</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', verticalAlign: 'middle', lineHeight: '16px', borderBottom: '1px solid #000000' }}>
                              {grossBillingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                          {extraCharges > 0 && (
                            <>
                              <tr>
                                <td style={{ padding: '6px 8px', fontWeight: 'bold', color: '#dc2626', verticalAlign: 'middle', lineHeight: '16px', borderBottom: '1px solid #000000' }}>Material / Kapad Amount (-)</td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', color: '#dc2626', fontWeight: 'bold', verticalAlign: 'middle', lineHeight: '16px', borderBottom: '1px solid #000000' }}>
                                  - {extraCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                              <tr style={{ backgroundColor: '#f1f5f9' }}>
                                <td style={{ padding: '4px 8px', fontWeight: 'bold', color: '#0284c7', verticalAlign: 'middle', lineHeight: '14px', borderBottom: '1px solid #000000' }}>Value (રકમ)</td>
                                <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 'bold', color: '#0284c7', verticalAlign: 'middle', lineHeight: '14px', borderBottom: '1px solid #000000' }}>
                                  {valueAfterKapad.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            </>
                          )}
                          {totalDiscount > 0 && (
                            <>
                              <tr>
                                <td style={{ padding: '6px 8px', fontWeight: 'bold', color: '#dc2626', verticalAlign: 'middle', lineHeight: '16px', borderBottom: '1px solid #000000' }}>Total Discount (-)</td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', color: '#dc2626', fontWeight: 'bold', verticalAlign: 'middle', lineHeight: '16px', borderBottom: '1px solid #000000' }}>
                                  - {totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                              <tr style={{ backgroundColor: '#f1f5f9' }}>
                                <td style={{ padding: '4px 8px', fontWeight: 'bold', color: '#0284c7', verticalAlign: 'middle', lineHeight: '14px', borderBottom: '1px solid #000000' }}>New Value (Taxable Amount)</td>
                                <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 'bold', color: '#0284c7', verticalAlign: 'middle', lineHeight: '14px', borderBottom: '1px solid #000000' }}>
                                  {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            </>
                          )}
                          {totalDiscount === 0 && (
                            <tr>
                              <td style={{ padding: '6px 8px', fontWeight: 'bold', verticalAlign: 'middle', lineHeight: '16px', borderBottom: '1px solid #000000' }}>Taxable Amount</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', verticalAlign: 'middle', lineHeight: '16px', borderBottom: '1px solid #000000' }}>
                                {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          )}
                          <tr>
                            <td style={{ padding: '6px 8px', fontWeight: 'bold', verticalAlign: 'middle', lineHeight: '16px', borderBottom: '1px solid #000000' }}>Total Tax</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', verticalAlign: 'middle', lineHeight: '16px', borderBottom: '1px solid #000000' }}>
                              {totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                          {roundOff !== 0 && (
                            <tr>
                              <td style={{ padding: '6px 8px', fontWeight: 'bold', verticalAlign: 'middle', lineHeight: '16px', borderBottom: '1px solid #000000' }}>Round Off</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', verticalAlign: 'middle', lineHeight: '16px', borderBottom: '1px solid #000000' }}>
                                {roundOff > 0 ? `+ ${roundOff.toFixed(2)}` : `- ${Math.abs(roundOff).toFixed(2)}`}
                              </td>
                            </tr>
                          )}
                          <tr>
                            <td style={{ padding: '8px 8px', fontWeight: 'bold', verticalAlign: 'middle', lineHeight: '18px' }}>Total Amount After Tax</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold', verticalAlign: 'middle', lineHeight: '18px' }}>
                              ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>

                  {/* Row 2: Terms and Conditions (left) + Authorised Signatory (right) */}
                  <tr>
                    <td style={{ verticalAlign: 'top', borderRight: '1px solid #000000', padding: '0' }}>
                      <table style={{ width: '460px', tableLayout: 'fixed', borderCollapse: 'collapse', borderSpacing: '0' }}>
                        <tbody>
                          <tr>
                            <td style={{ borderBottom: '1px solid #000000', padding: '4px 0', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', lineHeight: '15px' }}>
                              Terms and Conditions
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '6px 10px', fontSize: '10px', lineHeight: '15px' }}>
                              1. Any complaint regarding and should brought to our notice in written within 2 days.<br />
                              2. We are not responsible for Payment to unauthorized.<br />
                              3. Interest at 2.0 % per month charged on account not paid within due course.<br />
                              4. Subject to Surat Jurisdiction.
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>

                    <td style={{ verticalAlign: 'top', padding: '0' }}>
                      <table style={{ width: '290px', tableLayout: 'fixed', borderCollapse: 'collapse', borderSpacing: '0' }}>
                        <tbody>
                          <tr>
                            <td style={{ borderBottom: '1px solid #000000', padding: '4px 0', textAlign: 'center', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase', lineHeight: '15px' }}>
                              Authorised Signatory
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '40px 8px 10px 8px', textAlign: 'center', fontSize: '10px', fontWeight: 'bold', lineHeight: '15px' }}>
                              Sign. Of Receiver
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            /* ========================================================= */
            /* CLASSIC FCB DESIGN (Traditional Ledger Style)              */
            /* ========================================================= */
            <div style={{ width: '750px', boxSizing: 'border-box' }}>
              {/* Top Header */}
              <div style={{ textAlign: 'center', padding: '6px 12px 4px 12px', borderBottom: '1px solid #000000' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px', lineHeight: '14px' }}>
                  || SHREE GANESHAY NAMAH ||
                </div>
                <div style={{ fontSize: '22px', fontWeight: 'bold', margin: '2px 0 1px 0', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: '26px' }}>
                  {settings.companyName || 'FENI CREATION'}
                </div>
                <div style={{ fontSize: '11px', lineHeight: '15px' }}>
                  {settings.address || 'Plot No.19, 2nd Floor, Laxmi Textile Compound, A.K Road, Varachha, Surat - 394161'}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '2px', lineHeight: '15px' }}>
                  GST NO. : {settings.gstin || '24BAMPV2618G2ZI'} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Mob. {settings.phone || '+91 7265800782 || +91 8160663175'}
                </div>
              </div>

              {/* Title Bar */}
              <div
                style={{
                  width: '750px',
                  boxSizing: 'border-box',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  padding: '3px 0',
                  borderBottom: '1px solid #000000',
                  letterSpacing: '1px',
                  backgroundColor: '#ffffff',
                  lineHeight: '16px',
                }}
              >
                TAX INVOICE
              </div>

              {/* Details Section (2 Columns) */}
              <table style={{ width: '750px', tableLayout: 'fixed', borderCollapse: 'collapse', borderSpacing: '0', borderBottom: '1px solid #000000' }}>
                <colgroup>
                  <col style={{ width: '435px' }} />
                  <col style={{ width: '315px' }} />
                </colgroup>
                <tbody>
                  <tr>
                    {/* Left Column: Party Details */}
                    <td style={{ borderRight: '1px solid #000000', padding: '6px 10px', verticalAlign: 'top' }}>
                      <table style={{ width: '415px', tableLayout: 'fixed', borderCollapse: 'collapse', borderSpacing: '0', fontSize: '11px', lineHeight: '17px' }}>
                        <tbody>
                          <tr>
                            <td style={{ width: '85px', fontWeight: 'bold', verticalAlign: 'top', lineHeight: '17px' }}>Party Name</td>
                            <td style={{ width: '10px', fontWeight: 'bold', verticalAlign: 'top', textAlign: 'center', lineHeight: '17px' }}>:</td>
                            <td style={{ fontWeight: 'bold', verticalAlign: 'top', lineHeight: '17px' }}>{bill.partyName}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold', verticalAlign: 'top', lineHeight: '17px' }}>GST No.</td>
                            <td style={{ fontWeight: 'bold', verticalAlign: 'top', textAlign: 'center', lineHeight: '17px' }}>:</td>
                            <td style={{ verticalAlign: 'top', lineHeight: '17px' }}>{bill.partyGstin || '-'}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold', verticalAlign: 'top', lineHeight: '17px' }}>Contact No.</td>
                            <td style={{ fontWeight: 'bold', verticalAlign: 'top', textAlign: 'center', lineHeight: '17px' }}>:</td>
                            <td style={{ verticalAlign: 'top', lineHeight: '17px' }}>{bill.partyMobile || '-'}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold', verticalAlign: 'top', lineHeight: '17px' }}>Address</td>
                            <td style={{ fontWeight: 'bold', verticalAlign: 'top', textAlign: 'center', lineHeight: '17px' }}>:</td>
                            <td style={{ verticalAlign: 'top', lineHeight: '17px' }}>{bill.partyAddress || 'Surat, Gujarat'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>

                    {/* Right Column: Invoice Details */}
                    <td style={{ padding: '6px 10px', verticalAlign: 'top' }}>
                      <table style={{ width: '295px', tableLayout: 'fixed', borderCollapse: 'collapse', borderSpacing: '0', fontSize: '11px', lineHeight: '17px' }}>
                        <tbody>
                          <tr>
                            <td style={{ width: '100px', fontWeight: 'bold', lineHeight: '17px' }}>Invoice No.</td>
                            <td style={{ width: '10px', fontWeight: 'bold', textAlign: 'center', lineHeight: '17px' }}>:</td>
                            <td style={{ fontWeight: 'bold', lineHeight: '17px' }}>{bill.invoiceNo}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold', lineHeight: '17px' }}>Date</td>
                            <td style={{ fontWeight: 'bold', textAlign: 'center', lineHeight: '17px' }}>:</td>
                            <td style={{ lineHeight: '17px' }}>{formatDate(bill.date)}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold', lineHeight: '17px' }}>Party Ch. No</td>
                            <td style={{ fontWeight: 'bold', textAlign: 'center', lineHeight: '17px' }}>:</td>
                            <td style={{ lineHeight: '17px' }}>{bill.challanNo || items[0]?.challanNo || '-'}</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold', lineHeight: '17px' }}>Party Ch. Date</td>
                            <td style={{ fontWeight: 'bold', textAlign: 'center', lineHeight: '17px' }}>:</td>
                            <td style={{ lineHeight: '17px' }}>-</td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 'bold', lineHeight: '17px' }}>Party Due Date</td>
                            <td style={{ fontWeight: 'bold', textAlign: 'center', lineHeight: '17px' }}>:</td>
                            <td style={{ lineHeight: '17px' }}>{formatDate(bill.dueDate)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Ledger Items Table */}
              <table style={{ width: '750px', tableLayout: 'fixed', borderCollapse: 'collapse', borderSpacing: '0', fontSize: '11px', emptyCells: 'show' }}>
                <colgroup>
                  <col style={{ width: '38px' }} />
                  <col style={{ width: '247px' }} />
                  <col style={{ width: '65px' }} />
                  <col style={{ width: '50px' }} />
                  <col style={{ width: '60px' }} />
                  <col style={{ width: '50px' }} />
                  <col style={{ width: '50px' }} />
                  <col style={{ width: '190px' }} />
                </colgroup>
                <thead>
                  <tr style={{ backgroundColor: '#d1d5db', height: '22px' }}>
                    <th style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', padding: '4px', textAlign: 'center', fontWeight: 'bold', lineHeight: '14px' }}>Sr. No.</th>
                    <th style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold', lineHeight: '14px' }}>Description</th>
                    <th style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', padding: '4px', textAlign: 'center', fontWeight: 'bold', lineHeight: '14px' }}>HSN Code</th>
                    <th style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', padding: '4px', textAlign: 'center', fontWeight: 'bold', lineHeight: '14px' }}>Qty</th>
                    <th style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', padding: '4px', textAlign: 'center', fontWeight: 'bold', lineHeight: '14px' }}>Rate</th>
                    <th style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', padding: '4px', textAlign: 'center', fontWeight: 'bold', lineHeight: '14px' }}>Plain</th>
                    <th style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', padding: '4px', textAlign: 'center', fontWeight: 'bold', lineHeight: '14px' }}>Short</th>
                    <th style={{ borderBottom: '1px solid #000000', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold', lineHeight: '14px' }}>Total Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} style={{ height: '24px', borderBottom: '1px solid #000000' }}>
                      <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '3px 2px', verticalAlign: 'middle', lineHeight: '15px' }}>{index + 1}</td>
                      <td style={{ borderRight: '1px solid #000000', padding: '3px 6px', verticalAlign: 'middle', lineHeight: '15px' }}>
                        {item.description}
                        {item.designNo && <span style={{ fontSize: '10px', fontWeight: 'bold', display: 'inline-block', marginLeft: '6px' }}>(Design: {item.designNo})</span>}
                      </td>
                      <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '3px 2px', verticalAlign: 'middle', lineHeight: '15px' }}>{item.hsnCode || settings.hsnCode || '9988'}</td>
                      <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '3px 2px', verticalAlign: 'middle', lineHeight: '15px' }}>{item.quantity}</td>
                      <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '3px 2px', verticalAlign: 'middle', lineHeight: '15px' }}>{item.rate}</td>
                      <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '3px 2px', verticalAlign: 'middle', lineHeight: '15px' }}>{item.plain || 0}</td>
                      <td style={{ borderRight: '1px solid #000000', textAlign: 'center', padding: '3px 2px', verticalAlign: 'middle', lineHeight: '15px' }}>{item.shortage || 0}</td>
                      <td style={{ textAlign: 'right', padding: '3px 6px', fontWeight: 'bold', verticalAlign: 'middle', lineHeight: '15px' }}>
                        {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}

                  {/* Render empty rows to maintain standard ledger vertical grid lines */}
                  {Array.from({ length: emptyRowsCount }).map((_, idx) => (
                    <tr key={`empty-${idx}`} style={{ height: '24px', borderBottom: '1px solid #000000' }}>
                      <td style={{ borderRight: '1px solid #000000', height: '24px', lineHeight: '15px' }}>&nbsp;</td>
                      <td style={{ borderRight: '1px solid #000000', height: '24px', lineHeight: '15px' }}>&nbsp;</td>
                      <td style={{ borderRight: '1px solid #000000', height: '24px', lineHeight: '15px' }}>&nbsp;</td>
                      <td style={{ borderRight: '1px solid #000000', height: '24px', lineHeight: '15px' }}>&nbsp;</td>
                      <td style={{ borderRight: '1px solid #000000', height: '24px', lineHeight: '15px' }}>&nbsp;</td>
                      <td style={{ borderRight: '1px solid #000000', height: '24px', lineHeight: '15px' }}>&nbsp;</td>
                      <td style={{ borderRight: '1px solid #000000', height: '24px', lineHeight: '15px' }}>&nbsp;</td>
                      <td style={{ height: '24px', lineHeight: '15px' }}>&nbsp;</td>
                    </tr>
                  ))}

                  {/* Ledger Total Row */}
                  <tr style={{ borderTop: '1px solid #000000', borderBottom: '1px solid #000000', height: '26px', fontWeight: 'bold', backgroundColor: '#d1d5db' }}>
                    <td colSpan={3} style={{ borderRight: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', lineHeight: '16px' }}>
                      Total
                    </td>
                    <td style={{ borderRight: '1px solid #000000', textAlign: 'center', verticalAlign: 'middle', lineHeight: '16px' }}>
                      {totalQty}
                    </td>
                    <td style={{ borderRight: '1px solid #000000', verticalAlign: 'middle', lineHeight: '16px' }}>&nbsp;</td>
                    <td style={{ borderRight: '1px solid #000000', verticalAlign: 'middle', lineHeight: '16px' }}>&nbsp;</td>
                    <td style={{ borderRight: '1px solid #000000', verticalAlign: 'middle', lineHeight: '16px' }}>&nbsp;</td>
                    <td style={{ textAlign: 'right', paddingRight: '8px', verticalAlign: 'middle', lineHeight: '16px' }}>
                      {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Bottom Section (2 Columns) */}
              <table style={{ width: '750px', tableLayout: 'fixed', borderCollapse: 'collapse', borderSpacing: '0', borderTop: '1px solid #000000' }}>
                <colgroup>
                  <col style={{ width: '415px' }} />
                  <col style={{ width: '335px' }} />
                </colgroup>
                <tbody>
                  <tr>
                    {/* Left Box: Words, Bank Details, Terms */}
                    <td style={{ borderRight: '1px solid #000000', padding: '6px 8px', verticalAlign: 'top' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '11px', lineHeight: '15px' }}>Total Invoice Amount in Words :</div>
                        <div style={{ fontStyle: 'italic', fontWeight: 'bold', fontSize: '11px', margin: '2px 0 8px 0', lineHeight: '15px' }}>
                          {numberToWords(totalAmount)}
                        </div>

                        <div style={{ fontWeight: 'bold', fontSize: '11px', marginTop: '4px', lineHeight: '15px' }}>Bank Details :</div>
                        <table style={{ width: '395px', tableLayout: 'fixed', borderCollapse: 'collapse', borderSpacing: '0', fontSize: '11px', margin: '2px 0 8px 0', lineHeight: '16px' }}>
                          <tbody>
                            <tr>
                              <td style={{ width: '85px', fontWeight: 'bold', lineHeight: '16px' }}>Bank Name</td>
                              <td style={{ width: '10px', textAlign: 'center', lineHeight: '16px' }}>:</td>
                              <td style={{ fontWeight: 'bold', lineHeight: '16px' }}>{settings.bankName || 'State Bank of India'}</td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: 'bold', lineHeight: '16px' }}>Bank A/C No.</td>
                              <td style={{ textAlign: 'center', lineHeight: '16px' }}>:</td>
                              <td style={{ fontWeight: 'bold', lineHeight: '16px' }}>{settings.accountNo || '39485726102'}</td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: 'bold', lineHeight: '16px' }}>IFSC Code</td>
                              <td style={{ textAlign: 'center', lineHeight: '16px' }}>:</td>
                              <td style={{ fontWeight: 'bold', lineHeight: '16px' }}>{settings.ifscCode || 'SBIN0001234'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '11px', lineHeight: '15px' }}>Terms and Conditions :</div>
                        <div style={{ padding: '2px 0 0 0', fontSize: '10px', lineHeight: '14px' }}>
                          1. Any complaint regarding and should brought to our notice in written within 2 days.<br />
                          2. We are not responsible for Payment to unauthorized.<br />
                          3. Interest at 2.0 % per month charged on account not paid within due course.<br />
                          4. Subject to Surat Jurisdiction.
                        </div>
                      </div>
                    </td>

                    {/* Right Box: Calculations & Signature */}
                    <td style={{ verticalAlign: 'top', padding: '0' }}>
                      <div style={{ padding: '4px 8px' }}>
                        <table style={{ width: '315px', tableLayout: 'fixed', borderCollapse: 'collapse', borderSpacing: '0', fontSize: '11px', lineHeight: '17px' }}>
                          <tbody>
                            <tr>
                              <td style={{ fontWeight: 'bold', lineHeight: '17px' }}>Gross Billing Amount</td>
                              <td style={{ width: '10px', textAlign: 'center', lineHeight: '17px' }}>:</td>
                              <td style={{ width: '50px', textAlign: 'right', lineHeight: '17px' }}></td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold', lineHeight: '17px' }}>
                                {grossBillingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                            {extraCharges > 0 && (
                              <tr>
                                <td style={{ fontWeight: 'bold', lineHeight: '17px' }}>Less : Material/Kapad Amt</td>
                                <td style={{ width: '10px', textAlign: 'center', lineHeight: '17px' }}>:</td>
                                <td style={{ width: '50px', textAlign: 'right', lineHeight: '17px' }}>-</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#dc2626', lineHeight: '17px' }}>
                                  {extraCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            )}
                            <tr>
                              <td style={{ fontWeight: 'bold', lineHeight: '17px' }}>Total Discount</td>
                              <td style={{ width: '10px', textAlign: 'center', lineHeight: '17px' }}>:</td>
                              <td style={{ width: '50px', textAlign: 'right', lineHeight: '17px' }}>-</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold', color: totalDiscount > 0 ? '#dc2626' : 'inherit', lineHeight: '17px' }}>
                                {totalDiscount > 0
                                  ? totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                  : '0.00'}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: 'bold', lineHeight: '17px' }}>Taxable Amount</td>
                              <td style={{ width: '10px', textAlign: 'center', lineHeight: '17px' }}>:</td>
                              <td style={{ width: '50px', textAlign: 'right', lineHeight: '17px' }}></td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold', lineHeight: '17px' }}>
                                {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: 'bold', lineHeight: '17px' }}>Add : CGST</td>
                              <td style={{ textAlign: 'center', lineHeight: '17px' }}>:</td>
                              <td style={{ textAlign: 'right', lineHeight: '17px' }}>2.50%</td>
                              <td style={{ textAlign: 'right', lineHeight: '17px' }}>{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: 'bold', lineHeight: '17px' }}>Add : SGST</td>
                              <td style={{ textAlign: 'center', lineHeight: '17px' }}>:</td>
                              <td style={{ textAlign: 'right', lineHeight: '17px' }}>2.50%</td>
                              <td style={{ textAlign: 'right', lineHeight: '17px' }}>{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: 'bold', lineHeight: '17px' }}>Add : IGST</td>
                              <td style={{ textAlign: 'center', lineHeight: '17px' }}>:</td>
                              <td style={{ textAlign: 'right', lineHeight: '17px' }}>0.00%</td>
                              <td style={{ textAlign: 'right', lineHeight: '17px' }}>0.00</td>
                            </tr>
                            <tr style={{ borderTop: '1px solid #000000', borderBottom: '1px solid #000000' }}>
                              <td colSpan={2} style={{ fontWeight: 'bold', padding: '3px 0', lineHeight: '17px' }}>Tax Amount : GST</td>
                              <td style={{ textAlign: 'center', lineHeight: '17px' }}>:</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '3px 0', lineHeight: '17px' }}>
                                {totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #000000', fontWeight: 'bold' }}>
                              <td colSpan={2} style={{ padding: '4px 0', lineHeight: '17px' }}>Total Amount After Tax</td>
                              <td style={{ textAlign: 'center', lineHeight: '17px' }}>:</td>
                              <td style={{ textAlign: 'right', fontSize: '12px', padding: '4px 0', lineHeight: '17px' }}>
                                {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Signatures Footer */}
                      <div style={{ padding: '10px 8px 8px 8px' }}>
                        <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '11px', marginBottom: '28px', lineHeight: '15px' }}>
                          For, {settings.companyName || 'Feni Creation'}
                        </div>
                        <table style={{ width: '315px', tableLayout: 'fixed', borderCollapse: 'collapse', borderSpacing: '0', fontSize: '11px' }}>
                          <tbody>
                            <tr>
                              <td style={{ textAlign: 'left', lineHeight: '15px' }}>(Sign. Of Receiver)</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold', lineHeight: '15px' }}>Authorised Signatory</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    };

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  open,
  onClose,
  bill,
  bills,
  settings,
}) => {
  const { language } = useThemeContext();
  const printRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const [template, setTemplate] = useState<'freight' | 'classic'>('freight');

  const targetBills = (bills && bills.length > 0) ? bills : (bill ? [bill] : []);
  if (targetBills.length === 0) return null;
  const isMultiple = targetBills.length > 1;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      const element = printRef.current;

      const opt = {
        margin: [4, 4, 4, 4] as [number, number, number, number],
        filename: isMultiple
          ? `Tax_Invoices_Selected_${targetBills.length}_Bills.pdf`
          : `Tax_Invoice_${targetBills[0].invoiceNo}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.65 },
        html2canvas: {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          letterRendering: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          dpi: 120,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait' as const,
          compress: true,
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (e) {
      console.error('PDF generation error:', e);
    }
  };

  const handleDownloadDetailsPdf = async () => {
    if (!targetBills || targetBills.length === 0) return;
    try {
      await downloadDetailsPdfWithReactPdf(targetBills, settings, language as 'en' | 'gu');
    } catch (e) {
      console.error('React PDF generation error, falling back to html2pdf:', e);
      if (!detailsRef.current) return;
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      const element = detailsRef.current;

      const opt = {
        margin: [4, 4, 4, 4] as [number, number, number, number],
        filename: isMultiple
          ? `Invoice_Bill_Details_${targetBills.length}_Bills.pdf`
          : `Invoice_Bill_Details_${targetBills[0].invoiceNo}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.65 },
        html2canvas: {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          letterRendering: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          dpi: 120,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait' as const,
          compress: true,
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      await html2pdf().set(opt).from(element).save();
    }
  };

  const handleShareWhatsApp = () => {
    const text = isMultiple
      ? `📄 *TAX INVOICES (${targetBills.length} Bills) - ${settings.companyName || 'FENI CREATION'}*\n\n` +
        `*Selected Invoices:* ${targetBills.map((b) => `#${b.invoiceNo}`).join(', ')}\n\n` +
        `Thank you for doing business with us! 🙏`
      : `📄 *TAX INVOICE - ${settings.companyName || 'FENI CREATION'}*\n\n` +
        `*Invoice No:* #${targetBills[0].invoiceNo}\n` +
        `*Date:* ${formatDate(targetBills[0].date)}\n` +
        `*Party Name:* ${targetBills[0].partyName}\n` +
        `*Total Amount:* ₹${(targetBills[0].totalAmount || 0).toLocaleString('en-IN')}\n\n` +
        `Thank you for doing business with us! 🙏`;

    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
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
            <ReceiptIcon sx={{ color: '#ffffff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1rem', sm: '1.15rem' }, lineHeight: 1.2 }}>
              Tax Invoice Preview / ઇનવોઇસ
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>
              {isMultiple
                ? `${targetBills.length} Invoices Selected`
                : `Invoice No: #${targetBills[0]?.invoiceNo || ''}`}
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

      {/* Action Toolbar */}
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          bgcolor: '#f8fafc',
          borderBottom: '1px solid #cbd5e1',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            sx={{
              fontWeight: 700,
              borderRadius: 2,
              px: 2.5,
              background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
            }}
          >
            {isMultiple ? `Print (${targetBills.length})` : 'Print Invoice'}
          </Button>

          <Button
            variant="contained"
            startIcon={<PdfIcon />}
            onClick={handleDownloadPdf}
            sx={{ fontWeight: 700, borderRadius: 2, bgcolor: '#0f172a', '&:hover': { bgcolor: '#1e293b' } }}
          >
            {isMultiple ? `PDF (${targetBills.length})` : 'Download PDF'}
          </Button>

          <Button
            variant="outlined"
            startIcon={<WhatsAppIcon />}
            onClick={handleShareWhatsApp}
            sx={{
              fontWeight: 700,
              borderRadius: 2,
              color: '#16a34a',
              borderColor: '#86efac',
              bgcolor: '#f0fdf4',
              '&:hover': { bgcolor: '#dcfce7', borderColor: '#4ade80' },
            }}
          >
            Share WhatsApp
          </Button>

          <Button
            variant="outlined"
            startIcon={<ReceiptIcon />}
            onClick={handleDownloadDetailsPdf}
            sx={{
              fontWeight: 700,
              borderRadius: 2,
              color: '#4f46e5',
              borderColor: '#c7d2fe',
              bgcolor: '#eef2ff',
              '&:hover': { bgcolor: '#e0e7ff', borderColor: '#818cf8' },
            }}
          >
            {isMultiple ? `Details PDF (${targetBills.length})` : 'Bill Details PDF'}
          </Button>
        </Box>

        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
          {settings.companyName || 'FENI CREATION'}
        </Typography>
      </Box>

      <DialogContent sx={{ p: { xs: 1, sm: 3 }, bgcolor: '#e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' }}>
        {/* CSS Print Styles for A4 Output */}
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #printable-a4-invoice, #printable-a4-invoice * {
              visibility: visible !important;
            }
            #printable-a4-invoice {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: none !important;
              box-shadow: none !important;
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box !important;
            }
            .invoice-card-container {
              box-shadow: none !important;
              margin: 0 !important;
              border: 1px solid #000000 !important;
              page-break-after: always !important;
              break-after: page !important;
            }
            .invoice-card-container:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
            @page {
              size: A4 portrait;
              margin: 4mm;
            }
          }
        `}</style>

        {/* Dynamic A4 Document Layout */}
        <div id="printable-a4-invoice" ref={printRef} style={{ width: '750px' }}>
          {targetBills.map((currentBill, billIndex) => (
            <SingleBillInvoiceRender
              key={currentBill.id || billIndex}
              bill={currentBill}
              template={template}
              settings={settings}
              isLast={billIndex === targetBills.length - 1}
            />
          ))}
        </div>

        {/* Hidden Details PDF Export Container */}
        <div style={{ position: 'absolute', top: 0, left: '-9999px', width: '760px', backgroundColor: '#ffffff', opacity: 1, pointerEvents: 'none', zIndex: -1000 }} ref={detailsRef}>
          {targetBills.map((currentBill, billIndex) => (
            <BillDetailsPdfTemplate
              key={`details-${currentBill.id || billIndex}`}
              bill={currentBill}
              settings={settings}
              language={language}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};


