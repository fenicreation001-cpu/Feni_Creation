import React from 'react';
import { Bill, CompanySettings, Party } from '../types';
import { formatDate, numberToWords } from '../utils/formatters';
import { getBillCalculatedTotals } from '../utils/billCalculations';
import { useThemeContext } from '../context/ThemeContext';

interface BillDetailsPdfTemplateProps {
  bill: Bill;
  settings: CompanySettings;
  language?: 'en' | 'gu';
  parties?: Party[];
}

export const BillDetailsPdfTemplate: React.FC<BillDetailsPdfTemplateProps> = ({ bill, settings, language: propLanguage, parties }) => {
  const themeCtx = useThemeContext();
  const lang = propLanguage || themeCtx?.language || 'en';
  const isGu = lang === 'gu';

  const calcTotals = getBillCalculatedTotals(bill);
  const grossTotal = calcTotals.totalBillingAmount;
  const extraCharges = calcTotals.charge;
  const totalDiscount = calcTotals.totalDiscount;
  const taxVal = calcTotals.totalTax;
  const roundOff = calcTotals.roundOff;
  const netTotal = calcTotals.totalAmount;
  const paid = Number(bill.paidAmount) || 0;
  const pending = Math.max(0, netTotal - paid);
  const isPaid = bill.status === 'Paid' || bill.status === 'Received' || paid >= netTotal;

  const fontStack = "'Noto Sans Gujarati', 'Hind Vadodara', 'Mukta', 'Plus Jakarta Sans', system-ui, -apple-system, Roboto, sans-serif";

  // Labels for Gujarati vs English
  const badgeTitle = isGu ? 'ઇનવોઇસ અને બિલ વિગતો' : 'INVOICE & BILL DETAILS';
  const badgeWidth = isGu ? 210 : 170;

  const isPendingStatus = bill.status === 'Pending' || bill.paymentStatus === 'Pending' || (!isPaid && paid === 0);

  const getMethodText = (method?: string) => {
    if (isPendingStatus) {
      return isGu ? 'બાકી (Pending)' : 'Pending';
    }
    const m = method || 'Cash';
    if (!isGu) return m;
    if (m === 'Cash' || m === 'રોકડ') return 'રોકડ (Cash)';
    if (m === 'Cheque' || m === 'ચેક') return 'ચેક (Cheque)';
    if (m === 'UPI' || m === 'Online' || m === 'ઓનલાઇન') return 'ઓનલાઇન / UPI';
    if (m === 'Bank Transfer') return 'બેંક ટ્રાન્સફર (Bank Transfer)';
    return m;
  };

  const getStatusText = (status?: string, paidFlag?: boolean) => {
    if (!isGu) return status || (paidFlag ? 'Paid' : 'Pending');
    if (status === 'Paid' || status === 'Received' || paidFlag) return 'ચૂકવેલ (Paid)';
    return 'બાકી (Pending)';
  };

  return (
    <div
      style={{
        width: '760px',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        padding: '24px',
        fontFamily: fontStack,
        boxSizing: 'border-box',
        WebkitFontSmoothing: 'antialiased',
        margin: '0 auto',
      }}
    >
      {/* Document Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #6366f1', paddingBottom: '14px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt="Logo"
              style={{ width: '46px', height: '46px', borderRadius: '8px', objectFit: 'contain' }}
            />
          ) : (
            <div
              style={{
                width: '44px',
                height: '44px',
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
              {settings.companyName ? settings.companyName.substring(0, 2).toUpperCase() : 'FC'}
            </div>
          )}
          <div style={{ maxWidth: '460px' }}>
            <h1 style={{ margin: 0, color: '#312e81', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: '1.2' }}>
              {settings.companyName || 'FENI CREATION'}
            </h1>
            <p style={{ margin: '3px 0 0', color: '#4f46e5', fontSize: '12px', fontWeight: 700, lineHeight: '1.3' }}>
              {settings.tagline || (isGu ? 'એમ્બ્રોઇડરી અને ટેક્સટાઇલ મેન્યુફેક્ચરિંગ' : 'Embroidery & Textile Manufacturing')}
            </p>
            <p style={{ margin: '3px 0 0', color: '#334155', fontSize: '10px', fontWeight: 700, lineHeight: '1.3' }}>
              GSTIN: {settings.gstin || '24ABCDE1234F1Z5'}
            </p>
            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '10px', lineHeight: '1.3' }}>
              <span>{isGu ? 'મોબાઇલ' : 'Mobile'}: {(settings.phone || '+91 98765 43210').replace(/\|\|+/g, '|').replace(/\s*\|\s*/g, ' | ')}</span>
              <span> | </span>
              <span>Email: {settings.email || 'fenicreation001@gmail.com'}</span>
            </p>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '10px', lineHeight: '1.4' }}>
              {settings.address || 'Plot No. 124, GIDC Industrial Estate, Varachha, Surat - 395006, Gujarat, India'}
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div>
            <svg width={badgeWidth} height="26" viewBox={`0 0 ${badgeWidth} 26`} style={{ display: 'inline-block', verticalAlign: 'middle', marginBottom: '6px' }}>
              <rect x="0" y="0" width={badgeWidth} height="26" rx="13" fill="#4f46e5" />
              <text
                x={badgeWidth / 2}
                y="13"
                fill="#ffffff"
                fontSize="11"
                fontWeight="800"
                fontFamily={fontStack}
                dominantBaseline="central"
                textAnchor="middle"
                letterSpacing="0.4"
              >
                {badgeTitle}
              </text>
            </svg>
          </div>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#1e1b4b', lineHeight: '1.4' }}>
            {isGu ? 'ઇનવોઇસ નં:' : 'Invoice No:'} <span style={{ color: '#4f46e5' }}>#{bill.invoiceNo}</span>
          </p>
          <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#64748b', fontWeight: 600, lineHeight: '1.4' }}>
            {isGu ? 'તારીખ:' : 'Date:'} {formatDate(bill.date)}
          </p>
        </div>
      </div>

      {/* Top Cards: Customer & Party Details | Invoice & Challan Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
        {/* Card 1: Customer */}
        <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', boxSizing: 'border-box' }}>
          {(() => {
            const matchedParty = parties?.find(
              (p) => p.id === bill.partyId || p.name === bill.partyName || p.name?.toLowerCase() === bill.partyName?.toLowerCase()
            );
            const partyType = (bill as any).partyType || matchedParty?.type || 'Textile Party';
            const contactPerson = (bill as any).partyContactPerson || (bill as any).contactPerson || matchedParty?.contactPerson || 'ધર્મેશભાઇ - જયદીપ ધામેલિયા';
            const gstin = bill.partyGstin || matchedParty?.gstin || '24CXNPM7771G1ZZ';
            const mobile = bill.partyMobile || matchedParty?.mobile || '-';
            const address = bill.partyAddress || matchedParty?.address || 'New GIDC, સુરત,ગુજરાત';

            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', color: '#4f46e5' }}>👤</span>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {isGu ? 'ગ્રાહક અને પાર્ટી વિગતો' : 'CUSTOMER & PARTY DETAILS'}
                    </span>
                  </div>
                  {partyType ? (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#0369a1', backgroundColor: '#e0f2fe', padding: '2px 8px', borderRadius: '10px' }}>
                      {partyType}
                    </span>
                  ) : null}
                </div>

                <h2 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800, color: '#0f172a', lineHeight: '1.3' }}>{bill.partyName}</h2>

                <p style={{ margin: '5px 0 0', fontSize: '11px', color: '#1e293b', lineHeight: '1.4' }}>
                  <b>{isGu ? 'સંપર્ક વ્યક્તિ:' : 'Contact Person:'}</b> {contactPerson}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#1e293b', lineHeight: '1.4' }}>
                  <b>GSTIN Number:</b> <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>{gstin}</span>
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#334155', lineHeight: '1.4' }}>
                  <b>{isGu ? 'મોબાઇલ નંબર:' : 'Mobile Number:'}</b> {mobile}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#475569', lineHeight: '1.4' }}>
                  <b>{isGu ? 'સરનામું અને શહેર:' : 'Full Address & City:'}</b> {address}
                </p>
              </>
            );
          })()}
        </div>

        {/* Card 2: Invoice & Challan Info */}
        <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: '#4f46e5' }}>📅</span>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {isGu ? 'ઇનવોઇસ અને ચલાણ માહિતી' : 'INVOICE & CHALLAN INFO'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '8px 8px', borderRadius: '8px', border: '1px solid #f1f5f9', boxSizing: 'border-box' }}>
              <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, display: 'block', lineHeight: '1.2' }}>
                {isGu ? 'ઇનવોઇસ નં' : 'Invoice No'}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', marginTop: '2px', display: 'block', lineHeight: '1.2' }}>{bill.invoiceNo}</span>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '8px 8px', borderRadius: '8px', border: '1px solid #f1f5f9', boxSizing: 'border-box' }}>
              <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, display: 'block', lineHeight: '1.2' }}>
                {isGu ? 'ચલાણ નં' : 'Challan No'}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginTop: '2px', display: 'block', lineHeight: '1.2' }}>{bill.challanNo || '-'}</span>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '8px 8px', borderRadius: '8px', border: '1px solid #f1f5f9', boxSizing: 'border-box' }}>
              <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, display: 'block', lineHeight: '1.2' }}>
                {isGu ? 'ઇનવોઇસ તા.' : 'Invoice Date'}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155', marginTop: '2px', display: 'block', lineHeight: '1.2' }}>{formatDate(bill.date)}</span>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '8px 8px', borderRadius: '8px', border: '1px solid #f1f5f9', boxSizing: 'border-box' }}>
              <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, display: 'block', lineHeight: '1.2' }}>
                {isGu ? 'ચલાણ તા.' : 'Challan Date'}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155', marginTop: '2px', display: 'block', lineHeight: '1.2' }}>{formatDate(bill.dueDate || bill.date)}</span>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '8px 8px', borderRadius: '8px', border: '1px solid #f1f5f9', boxSizing: 'border-box' }}>
              <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, display: 'block', lineHeight: '1.2' }}>
                {isGu ? 'ડિલિવરી તા.' : 'Delivery Date'}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', marginTop: '2px', display: 'block', lineHeight: '1.2' }}>{bill.deliveryDate ? formatDate(bill.deliveryDate) : formatDate(bill.dueDate || bill.date)}</span>
            </div>
          </div>

          {(bill.deliveryLocation || bill.transportName || bill.deliveryPerson || bill.deliveryStatus || bill.deliveryNotes) && (
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '10px' }}>
              {bill.deliveryLocation && (
                <div><b>{isGu ? 'ડિલિવરી સ્થળ:' : 'Delivery Location:'}</b> <span style={{ color: '#0f172a' }}>{bill.deliveryLocation}</span></div>
              )}
              {bill.transportName && (
                <div><b>{isGu ? 'ટ્રાન્સપોર્ટ/વાહન:' : 'Transport/Vehicle:'}</b> <span style={{ color: '#0f172a' }}>{bill.transportName}</span></div>
              )}
              {bill.deliveryPerson && (
                <div><b>{isGu ? 'ડિલિવરી પર્સન/ડ્રાઇવર:' : 'Delivery Person:'}</b> <span style={{ color: '#0f172a' }}>{bill.deliveryPerson}</span></div>
              )}
              {bill.deliveryStatus && (
                <div><b>{isGu ? 'સ્ટેટસ:' : 'Status:'}</b> <span style={{ color: '#0284c7', fontWeight: 700 }}>{bill.deliveryStatus}</span></div>
              )}
              {bill.deliveryNotes && (
                <div style={{ width: '100%' }}><b>{isGu ? 'ડિલિવરી રીમાર્કસ:' : 'Delivery Notes:'}</b> <span style={{ color: '#475569' }}>{bill.deliveryNotes}</span></div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Billed Items List Table */}
      <div style={{ marginBottom: '18px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
          {isGu ? 'બિલ વસ્તુઓની યાદી' : 'Billed Items List'} ({(bill.items || []).length})
        </h3>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '11px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', color: '#475569', textAlign: 'center' }}>
              <th style={{ width: '3.5%', padding: '8px 4px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', fontSize: '9px', fontWeight: 800, verticalAlign: 'middle' }}>#</th>
              <th style={{ width: '10.5%', padding: '8px 4px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', fontSize: '9px', fontWeight: 800, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                {isGu ? 'ચલાણ તા.' : 'CHALLAN DATE'}
              </th>
              <th style={{ width: '10%', padding: '8px 4px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', fontSize: '9px', fontWeight: 800, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                {isGu ? 'ચલાણ નં.' : 'CHALLAN NO'}
              </th>
              <th style={{ width: '26%', padding: '8px 6px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', fontSize: '9px', fontWeight: 800, verticalAlign: 'middle' }}>
                {isGu ? 'વિગતો / ડિઝાઇન' : 'DESCRIPTION / PARTICULARS'}
              </th>
              <th style={{ width: '6%', padding: '8px 2px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', fontSize: '9px', fontWeight: 800, verticalAlign: 'middle' }}>
                {isGu ? 'લોટ' : 'LOT'}
              </th>
              <th style={{ width: '7%', padding: '8px 2px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', fontSize: '9px', fontWeight: 800, verticalAlign: 'middle' }}>
                {isGu ? 'ભાવ' : 'RATE'}
              </th>
              <th style={{ width: '6.5%', padding: '8px 2px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', fontSize: '9px', fontWeight: 800, verticalAlign: 'middle' }}>
                {isGu ? 'પ્લેન' : 'PLAIN'}
              </th>
              <th style={{ width: '6.5%', padding: '8px 2px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', fontSize: '9px', fontWeight: 800, verticalAlign: 'middle' }}>
                {isGu ? 'શોર્ટ' : 'SHORT'}
              </th>
              <th style={{ width: '9.5%', padding: '8px 4px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', fontSize: '9px', fontWeight: 800, verticalAlign: 'middle' }}>
                {isGu ? 'વટાવ' : 'DISC'}
              </th>
              <th style={{ width: '14.5%', padding: '8px 6px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', fontSize: '9px', fontWeight: 800, verticalAlign: 'middle' }}>
                {isGu ? 'કુલ રકમ' : 'TOTAL'}
              </th>
            </tr>
          </thead>
          <tbody>
            {(bill.items || []).map((item, idx) => {
              const lot = Number(item.quantity) || 0;
              const rate = Number(item.rate) || 0;
              const plain = Number(item.plain) || 0;
              const short = Number(item.shortage) || 0;
              const disc = Number(item.discountAmount) || 0;
              const payableLot = Math.max(0, lot - (plain + short));
              const rowTotal = Math.max(0, payableLot * rate - disc);

              return (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontWeight: 700, color: '#64748b', verticalAlign: 'middle' }}>{idx + 1}</td>
                  <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontWeight: 600, color: '#334155', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{formatDate(item.challanDate || bill.dueDate || bill.date)}</td>
                  <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontWeight: 800, color: '#4f46e5', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{item.challanNo || bill.challanNo || '-'}</td>
                  <td style={{ padding: '8px 8px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', wordBreak: 'break-word', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'nowrap', gap: '6px' }}>
                      {item.designNo && (() => {
                        const textStr = String(item.designNo);
                        const width = Math.max(46, textStr.length * 7 + 16);
                        return (
                          <svg width={width} height="18" viewBox={`0 0 ${width} 18`} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
                            <rect x="0" y="0" width={width} height="18" rx="5" fill="#e0f2fe" />
                            <text
                              x={width / 2}
                              y="9"
                              fill="#0369a1"
                              fontSize="9"
                              fontWeight="800"
                              fontFamily={fontStack}
                              dominantBaseline="central"
                              textAnchor="middle"
                            >
                              {textStr}
                            </text>
                          </svg>
                        );
                      })()}
                      <span style={{ fontWeight: 700, color: '#0f172a', verticalAlign: 'middle' }}>{item.description || (isGu ? 'વસ્તુ' : 'Item')}</span>
                    </div>
                  </td>
                  <td style={{ padding: '8px 3px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontWeight: 800, color: '#0f172a', verticalAlign: 'middle' }}>{lot}</td>
                  <td style={{ padding: '8px 3px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontWeight: 600, verticalAlign: 'middle' }}>₹{rate}</td>
                  <td style={{ padding: '8px 2px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', color: plain > 0 ? '#d97706' : '#94a3b8', verticalAlign: 'middle' }}>{plain > 0 ? plain : '-'}</td>
                  <td style={{ padding: '8px 2px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', color: short > 0 ? '#dc2626' : '#94a3b8', verticalAlign: 'middle' }}>{short > 0 ? short : '-'}</td>
                  <td style={{ padding: '8px 4px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', color: disc > 0 ? '#dc2626' : '#94a3b8', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                    {disc > 0 ? `- ₹${disc.toLocaleString('en-IN')}` : '-'}
                  </td>
                  <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontWeight: 800, color: '#4f46e5', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                    ₹{rowTotal.toLocaleString('en-IN')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom Cards: Payment Method & Totals Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '14px' }}>
        {/* Payment Info Card */}
        <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', boxSizing: 'border-box' }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {isGu ? 'ચૂકવણી વિગત અને પદ્ધતિ' : 'PAYMENT INFO & METHOD'}
          </p>
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: '#475569', fontWeight: 700 }}>
              {isGu ? 'ચુકવણી સ્થિતિ:' : 'Payment Status:'}
            </span>
            <span
              style={{
                display: 'inline-block',
                padding: '3px 10px',
                borderRadius: '12px',
                backgroundColor: isPaid ? '#dcfce7' : '#fee2e2',
                color: isPaid ? '#15803d' : '#dc2626',
                border: `1px solid ${isPaid ? '#bbf7d0' : '#fecaca'}`,
                fontWeight: 800,
                fontSize: '11px',
                fontFamily: fontStack,
              }}
            >
              {isPaid
                ? (isGu ? 'મળેલ (Received)' : 'Received')
                : (isGu ? 'બાકી (Pending)' : 'Pending')}
            </span>
          </div>
          <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#475569', fontWeight: 700 }}>
                {isGu ? 'પદ્ધતિ:' : 'Method:'}
              </span>
              <span
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  backgroundColor: isPendingStatus ? '#fef3c7' : '#e0f2fe',
                  color: isPendingStatus ? '#b45309' : '#0284c7',
                  border: `1px solid ${isPendingStatus ? '#fde68a' : '#bae6fd'}`,
                  fontWeight: 800,
                  fontSize: '11px',
                  fontFamily: fontStack,
                }}
              >
                {getMethodText(bill.paymentMethod)}
              </span>
            </div>
            {isPaid && bill.paymentDate && (
              <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>
                {isGu ? 'તારીખ:' : 'Date:'} {formatDate(bill.paymentDate)}
              </span>
            )}
          </div>

          {bill.paymentMethod === 'Cheque' && (
            <div style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', borderRadius: '6px', borderLeft: '3px solid #0284c7', marginBottom: (Boolean(bill.notes) || extraCharges > 0) ? '8px' : '0px', fontSize: '11px', color: '#1e293b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>{isGu ? 'ચેક નં:' : 'Cheque No:'} <strong style={{ fontWeight: 800 }}>{bill.chequeNo || 'N/A'}</strong></span>
                {bill.chequeDate && <span>{isGu ? 'તારીખ:' : 'Date:'} <strong style={{ fontWeight: 800 }}>{formatDate(bill.chequeDate)}</strong></span>}
              </div>
              {bill.chequeBank && <div style={{ marginTop: '3px', fontWeight: 600, color: '#475569' }}>{isGu ? 'બેંક:' : 'Bank:'} {bill.chequeBank}</div>}
            </div>
          )}

          {(Boolean(bill.notes) || extraCharges > 0) && (
            <div
              style={{
                marginTop: bill.paymentMethod === 'Cheque' ? '0px' : '6px',
                padding: '8px 12px',
                backgroundColor: '#fffbeb',
                borderRadius: '6px',
                borderLeft: '4px solid #d97706',
                fontSize: '11px',
                color: '#78350f',
                lineHeight: '1.4',
                boxSizing: 'border-box',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div style={{ flex: 1, minWidth: '140px' }}>
                <div style={{ color: '#b45309', fontWeight: 800, fontSize: '10px', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.4px' }}>
                  {isGu ? 'નોંધ / ડિલિવરી સૂચનાઓ:' : 'Notes / Delivery Instructions:'}
                </div>
                <div style={{ color: '#78350f', fontWeight: 600, fontSize: '11px' }}>
                  {bill.notes || '-'}
                </div>
              </div>
              {extraCharges > 0 && (
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap', paddingLeft: '12px', borderLeft: '1px solid #fde68a' }}>
                  <div style={{ color: '#dc2626', fontWeight: 800, fontSize: '13px' }}>
                    - ₹{extraCharges.toLocaleString('en-IN')}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Totals Breakdown Card */}
        <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', fontSize: '11px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#64748b', textTransform: 'uppercase', fontWeight: 800, fontSize: '9px', letterSpacing: '0.6px', marginBottom: '10px' }}>
              {isGu ? 'ગણતરી અને કુલ સરવાળો' : 'CALCULATIONS & SUMMARY'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px dashed #f1f5f9', color: '#475569' }}>
              <span style={{ fontWeight: 600 }}>{isGu ? 'કુલ બિલિંગ રકમ:' : 'Total Billing Amount:'}</span>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>₹{grossTotal.toLocaleString('en-IN')}</span>
            </div>

            {extraCharges > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px dashed #f1f5f9', color: '#e11d48' }}>
                <span style={{ fontWeight: 600 }}>{isGu ? 'મટીરીયલ / કાપડ બાદ રકમ:' : 'Material/Kapad Amount:'}</span>
                <span style={{ fontWeight: 800 }}>- ₹{extraCharges.toLocaleString('en-IN')}</span>
              </div>
            )}

            {totalDiscount > 0 && (() => {
              const rawPct = (bill as any).discountPercent;
              const discPctNum = (rawPct !== undefined && rawPct !== null && rawPct !== '' && !isNaN(Number(rawPct)) && Number(rawPct) > 0)
                ? Number(rawPct)
                : (grossTotal > 0 ? ((totalDiscount / grossTotal) * 100) : 0);
              const discPct = Number(discPctNum) || 0;
              const discPctStr = discPct > 0 ? ` (${discPct % 1 === 0 ? discPct.toFixed(0) : discPct.toFixed(2)}%)` : '';
              return (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px dashed #f1f5f9', color: '#e11d48' }}>
                  <span style={{ fontWeight: 600 }}>{isGu ? `કુલ વટાવ${discPctStr}:` : `Total Discount${discPctStr}:`}</span>
                  <span style={{ fontWeight: 800 }}>- ₹{totalDiscount.toLocaleString('en-IN')}</span>
                </div>
              );
            })()}

            {taxVal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px dashed #f1f5f9', color: '#7c3aed' }}>
                <span style={{ fontWeight: 600 }}>{isGu ? 'જીએસટી ટેક્સ (5%):' : 'GST Tax (5%):'}</span>
                <span style={{ fontWeight: 800 }}>+ ₹{taxVal.toLocaleString('en-IN')}</span>
              </div>
            )}

            {roundOff !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', color: '#64748b' }}>
                <span style={{ fontWeight: 600 }}>{isGu ? 'રાઉન્ડ ઓફ:' : 'Round Off:'}</span>
                <span style={{ fontWeight: 800 }}>{roundOff >= 0 ? `+ ₹${roundOff}` : `- ₹${Math.abs(roundOff)}`}</span>
              </div>
            )}
          </div>

          {/* Highlighted Total Amount Box */}
          <div
            style={{
              margin: '12px 0 0 0',
              padding: '10px 14px',
              backgroundColor: '#f0f7ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '11px' }}>
                {isGu ? 'કુલ રકમ:' : 'Total Amount:'}
              </span>
              <span style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '14px' }}>
                ₹{netTotal.toLocaleString('en-IN')}
              </span>
            </div>
            <div style={{ fontSize: '9.5px', color: '#2563eb', fontWeight: 600, fontStyle: 'italic', paddingTop: '6px', borderTop: '1px dotted #93c5fd' }}>
              {numberToWords(netTotal, isGu ? 'gu' : 'en')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

