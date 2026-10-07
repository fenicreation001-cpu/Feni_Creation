import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, pdf, Image } from '@react-pdf/renderer';
import { Bill, CompanySettings, Party } from '../types';
import { formatDate, numberToWords } from './formatters';
import { apiClient } from './api';

// Register single Noto Sans Gujarati font for Gujarati & Latin text support in React-PDF
Font.register({
  family: 'GujaratiFont',
  src: 'https://fonts.gstatic.com/s/notosansgujarati/v27/wlpWgx_HC1ti5ViekvcxnhMlCVo3f5pv17ivlzsUB14gg1TMR2Gw4VceEl7MA_ypFwPM.ttf',
});

// Disable word hyphenation
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 9,
    fontFamily: 'GujaratiFont',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#6366f1',
    borderBottomStyle: 'solid',
    paddingBottom: 10,
    marginBottom: 12,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#312e81',
  },
  tagline: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4f46e5',
    marginTop: 2,
  },
  address: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 3,
  },
  contact: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
  },
  headerRight: {
    width: 170,
    alignItems: 'flex-end',
  },
  titleBadge: {
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  titleBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  invoiceNo: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e1b4b',
  },
  invoiceDate: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  topGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  partyName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  gstBadge: {
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  gstBadgeText: {
    color: '#0369a1',
    fontSize: 8,
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 9,
    color: '#475569',
    marginTop: 3,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  infoBox: {
    width: '47%',
    backgroundColor: '#f8fafc',
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  infoBoxLabel: {
    fontSize: 7,
    color: '#64748b',
    fontWeight: 'bold',
  },
  infoBoxValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 2,
  },
  table: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  th: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#475569',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  td: {
    fontSize: 8,
    color: '#0f172a',
  },
  designBadge: {
    backgroundColor: '#e0f2fe',
    borderRadius: 4,
    paddingVertical: 1,
    paddingHorizontal: 4,
    marginRight: 4,
  },
  designBadgeText: {
    fontSize: 7,
    color: '#0369a1',
    fontWeight: 'bold',
  },
  bottomGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  paymentCard: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'flex-start',
  },
  totalsCard: {
    flex: 1.1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'space-between',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 8,
    color: '#475569',
  },
  summaryValue: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  netTotalBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    flexDirection: 'column',
  },
  netTotalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1d4ed8',
  },
  netTotalValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1d4ed8',
  },
});

interface BillDetailsPdfDocumentProps {
  bills: Bill[];
  settings: CompanySettings;
  language?: 'en' | 'gu';
  parties?: Party[];
}

const SingleBillPage: React.FC<{ bill: Bill; settings: CompanySettings; language?: 'en' | 'gu'; parties?: Party[] }> = ({ bill, settings, language = 'en', parties }) => {
  const isGu = language === 'gu';

  const matchedParty = parties?.find(
    (p) => p.id === bill.partyId || p.name === bill.partyName || p.name?.toLowerCase() === bill.partyName?.toLowerCase()
  );
  const partyType = (bill as any).partyType || matchedParty?.type || 'Textile Party';
  const displayContactPerson = (bill as any).partyContactPerson || (bill as any).contactPerson || matchedParty?.contactPerson || 'ધર્મેશભાઇ - જયદીપ ધામેલિયા';
  const displayGstin = bill.partyGstin || matchedParty?.gstin || '24CXNPM7771G1ZZ';
  const displayMobile = bill.partyMobile || matchedParty?.mobile || '-';
  const displayAddress = bill.partyAddress || matchedParty?.address || 'New GIDC, સુરત,ગુજરાત';

  const grossTotal = (bill.items || []).reduce((acc, item) => {
    const lot = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const plain = Number(item.plain) || 0;
    const shortage = Number(item.shortage) || 0;
    return acc + Math.max(0, lot - (shortage + plain)) * rate;
  }, 0);

  const extraCharges = Number(bill.extraCharges ?? bill.chargeAmount ?? 0);
  const totalDiscount = Number(bill.totalDiscount ?? 0);
  const taxVal = bill.totalTax || ((bill.cgst || 0) + (bill.sgst || 0)) || Number((bill.subtotal * 0.05).toFixed(2));
  const roundOff = bill.roundOff || 0;
  const netTotal = bill.totalAmount || (bill.subtotal + taxVal + roundOff);
  const paid = Number(bill.paidAmount) || 0;
  const isPaid = bill.status === 'Paid' || bill.status === 'Received' || paid >= netTotal;

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

  return (
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 360, flexDirection: 'row', alignItems: 'flex-start' }}>
          {settings.logoUrl && (settings.logoUrl.startsWith('data:image/') || settings.logoUrl.startsWith('http://') || settings.logoUrl.startsWith('https://')) ? (
            <Image
              src={settings.logoUrl}
              style={{ width: 44, height: 44, borderRadius: 6, marginRight: 10, objectFit: 'contain' }}
            />
          ) : (
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 8,
                backgroundColor: '#4f46e5',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 10,
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold' }}>
                {settings.companyName ? settings.companyName.substring(0, 2).toUpperCase() : 'FC'}
              </Text>
            </View>
          )}

          <View style={{ width: 304 }}>
            <Text style={styles.companyName}>{settings.companyName || 'FENI CREATION'}</Text>
            <Text style={styles.tagline}>
              {settings.tagline || (isGu ? 'એમ્બ્રોઇડરી અને ટેક્સટાઇલ મેન્યુફેક્ચરિંગ' : 'Embroidery & Textile Manufacturing')}
            </Text>
            <Text style={{ fontSize: 8, color: '#334155', marginTop: 2, fontWeight: 'bold' }}>
              GSTIN: {settings.gstin || '24ABCDE1234F1Z5'}
            </Text>
            <Text style={styles.contact}>
              {isGu ? 'મોબાઇલ: ' : 'Mobile: '}
              {(settings.phone || '+91 98765 43210').replace(/\|\|+/g, '|').replace(/\s*\|\s*/g, ' | ')}
              {' | '}
              Email: {settings.email || 'fenicreation001@gmail.com'}
            </Text>
            <Text style={styles.address}>
              {settings.address || 'Plot No. 124, GIDC Industrial Estate, Varachha, Surat - 395006, Gujarat, India'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.titleBadge}>
            <Text style={styles.titleBadgeText}>
              {isGu ? 'ઇનવોઇસ અને બિલ વિગતો' : 'INVOICE & BILL DETAILS'}
            </Text>
          </View>
          <Text style={styles.invoiceNo}>
            <Text>{isGu ? 'ઇનવોઇસ નં: ' : 'Invoice No: '}</Text>
            <Text style={{ color: '#4f46e5' }}>#{bill.invoiceNo || bill.id || ''}</Text>
          </Text>
          <Text style={styles.invoiceDate}>
            {isGu ? 'તારીખ:' : 'Date:'} {formatDate(bill.date)}
          </Text>
        </View>
      </View>

      {/* Top Cards */}
      <View style={styles.topGrid}>
        {/* Customer Card */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {isGu ? 'ગ્રાહક અને પાર્ટી વિગતો' : 'CUSTOMER & PARTY DETAILS'}
              </Text>
            </View>
            {partyType ? (
              <View style={{ backgroundColor: '#e0f2fe', borderRadius: 8, paddingVertical: 2, paddingHorizontal: 6 }}>
                <Text style={{ fontSize: 7.5, color: '#0369a1', fontWeight: 'bold' }}>{partyType}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.partyName}>{bill.partyName}</Text>

          <View style={{ marginTop: 6, gap: 3.5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 8, color: '#64748b', width: 92, fontWeight: 'bold' }}>
                {isGu ? 'સંપર્ક વ્યક્તિ:' : 'Contact Person:'}
              </Text>
              <Text style={{ fontSize: 8.5, color: '#0f172a', fontWeight: 'bold', flex: 1 }}>
                {displayContactPerson}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 8, color: '#64748b', width: 92, fontWeight: 'bold' }}>
                GSTIN Number:
              </Text>
              <Text style={{ fontSize: 8.5, color: '#0f172a', fontWeight: 'bold', flex: 1 }}>
                {displayGstin}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 8, color: '#64748b', width: 92, fontWeight: 'bold' }}>
                {isGu ? 'મોબાઇલ નંબર:' : 'Mobile Number:'}
              </Text>
              <Text style={{ fontSize: 8.5, color: '#0f172a', flex: 1 }}>
                {displayMobile}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 8, color: '#64748b', width: 92, fontWeight: 'bold' }}>
                {isGu ? 'સરનામું અને શહેર:' : 'Full Address & City:'}
              </Text>
              <Text style={{ fontSize: 8.5, color: '#0f172a', flex: 1 }}>
                {displayAddress}
              </Text>
            </View>
          </View>
        </View>

        {/* Invoice Info Card */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.cardTitle}>
              {isGu ? 'ઇનવોઇસ અને ચલાણ માહિતી' : 'INVOICE & CHALLAN INFO'}
            </Text>
          </View>

          <View style={{ flexDirection: 'column', gap: 6 }}>
            {/* Row 1: Invoice No & Challan No */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ width: '48.5%', backgroundColor: '#f8fafc', padding: 6, borderRadius: 6, borderWidth: 1, borderColor: '#f1f5f9' }}>
                <Text style={{ fontSize: 7, color: '#64748b', fontWeight: 'bold' }}>{isGu ? 'ઇનવોઇસ નં' : 'Invoice No'}</Text>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#4f46e5', marginTop: 2 }}>{bill.invoiceNo || '-'}</Text>
              </View>

              <View style={{ width: '48.5%', backgroundColor: '#f8fafc', padding: 6, borderRadius: 6, borderWidth: 1, borderColor: '#f1f5f9' }}>
                <Text style={{ fontSize: 7, color: '#64748b', fontWeight: 'bold' }}>{isGu ? 'ચલાણ નં' : 'Challan No'}</Text>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#0f172a', marginTop: 2 }}>{bill.challanNo || '-'}</Text>
              </View>
            </View>

            {/* Row 2: Invoice Date & Challan Date */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ width: '48.5%', backgroundColor: '#f8fafc', padding: 6, borderRadius: 6, borderWidth: 1, borderColor: '#f1f5f9' }}>
                <Text style={{ fontSize: 7, color: '#64748b', fontWeight: 'bold' }}>{isGu ? 'ઇનવોઇસ તારીખ' : 'Invoice Date'}</Text>
                <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: '#334155', marginTop: 2 }}>{formatDate(bill.date)}</Text>
              </View>

              <View style={{ width: '48.5%', backgroundColor: '#f8fafc', padding: 6, borderRadius: 6, borderWidth: 1, borderColor: '#f1f5f9' }}>
                <Text style={{ fontSize: 7, color: '#64748b', fontWeight: 'bold' }}>{isGu ? 'ચલાણ તારીખ' : 'Challan Date'}</Text>
                <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: '#334155', marginTop: 2 }}>{formatDate(bill.dueDate || bill.date)}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: '3.5%', textAlign: 'center' }]}>#</Text>
          <Text style={[styles.th, { width: '10.5%', textAlign: 'center' }]}>{isGu ? 'ચલાણ તા.' : 'CHALLAN DATE'}</Text>
          <Text style={[styles.th, { width: '10%', textAlign: 'center' }]}>{isGu ? 'ચલાણ નં.' : 'CHALLAN NO'}</Text>
          <Text style={[styles.th, { width: '26%', textAlign: 'center' }]}>{isGu ? 'વિગતો / ડિઝાઇન' : 'DESCRIPTION / PARTICULARS'}</Text>
          <Text style={[styles.th, { width: '6%', textAlign: 'center' }]}>{isGu ? 'લોટ' : 'LOT'}</Text>
          <Text style={[styles.th, { width: '7%', textAlign: 'center' }]}>{isGu ? 'ભાવ' : 'RATE'}</Text>
          <Text style={[styles.th, { width: '6.5%', textAlign: 'center' }]}>{isGu ? 'પ્લેન' : 'PLAIN'}</Text>
          <Text style={[styles.th, { width: '6.5%', textAlign: 'center' }]}>{isGu ? 'શોર્ટ' : 'SHORT'}</Text>
          <Text style={[styles.th, { width: '9.5%', textAlign: 'center' }]}>{isGu ? 'વટાવ' : 'DISC'}</Text>
          <Text style={[styles.th, { width: '14.5%', textAlign: 'center' }]}>{isGu ? 'કુલ રકમ' : 'TOTAL'}</Text>
        </View>

        {(bill.items || []).map((item, idx) => {
          const lot = Number(item.quantity) || 0;
          const rate = Number(item.rate) || 0;
          const plain = Number(item.plain) || 0;
          const short = Number(item.shortage) || 0;
          const disc = Number(item.discountAmount) || 0;
          const payableLot = Math.max(0, lot - (plain + short));
          const rowTotal = Math.max(0, payableLot * rate - disc);

          return (
            <View key={idx} style={[styles.tableRow, { backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa' }]}>
              <Text style={[styles.td, { width: '3.5%', textAlign: 'center', color: '#64748b' }]}>{idx + 1}</Text>
              <Text style={[styles.td, { width: '10.5%', textAlign: 'center', color: '#334155' }]}>{formatDate(item.challanDate || bill.dueDate || bill.date)}</Text>
              <Text style={[styles.td, { width: '10%', textAlign: 'center', fontWeight: 'bold', color: '#4f46e5' }]}>{item.challanNo || bill.challanNo || '-'}</Text>
              <View style={{ width: '26%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                {item.designNo ? (
                  <View style={styles.designBadge}>
                    <Text style={styles.designBadgeText}>{item.designNo}</Text>
                  </View>
                ) : null}
                <Text style={[styles.td, { fontWeight: 'bold', textAlign: 'center' }]}>{item.description || (isGu ? 'વસ્તુ' : 'Item')}</Text>
              </View>
              <Text style={[styles.td, { width: '6%', textAlign: 'center', fontWeight: 'bold' }]}>{lot}</Text>
              <Text style={[styles.td, { width: '7%', textAlign: 'center' }]}>₹{rate}</Text>
              <Text style={[styles.td, { width: '6.5%', textAlign: 'center', color: plain > 0 ? '#d97706' : '#94a3b8' }]}>{plain > 0 ? plain : '-'}</Text>
              <Text style={[styles.td, { width: '6.5%', textAlign: 'center', color: short > 0 ? '#dc2626' : '#94a3b8' }]}>{short > 0 ? short : '-'}</Text>
              <Text style={[styles.td, { width: '9.5%', textAlign: 'center', color: disc > 0 ? '#dc2626' : '#94a3b8' }]}>
                {disc > 0 ? `- ₹${disc.toLocaleString('en-IN')}` : '-'}
              </Text>
              <Text style={[styles.td, { width: '14.5%', textAlign: 'center', fontWeight: 'bold', color: '#4f46e5' }]}>
                ₹{rowTotal.toLocaleString('en-IN')}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomGrid}>
        {/* Payment Card */}
        <View style={styles.paymentCard}>
          <View>
            <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {isGu ? 'ચૂકવણી વિગત અને પદ્ધતિ' : 'PAYMENT INFO & METHOD'}
            </Text>

            {/* Payment Status Row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 8.5, color: '#475569', fontWeight: 'bold' }}>
                {isGu ? 'ચુકવણી સ્થિતિ:' : 'Payment Status:'}
              </Text>
              <View
                style={{
                  backgroundColor: isPaid ? '#dcfce7' : '#fee2e2',
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 2.5,
                }}
              >
                <Text
                  style={{
                    fontSize: 8,
                    fontWeight: 'bold',
                    color: isPaid ? '#15803d' : '#dc2626',
                  }}
                >
                  {isPaid ? (isGu ? 'મળેલ (Received)' : 'Received') : (isGu ? 'બાકી (Pending)' : 'Pending')}
                </Text>
              </View>
            </View>

            {/* Payment Method & Date Row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 8.5, color: '#475569', fontWeight: 'bold', marginRight: 6 }}>
                  {isGu ? 'પદ્ધતિ:' : 'Method:'}
                </Text>
                <View
                  style={{
                    backgroundColor: isPendingStatus ? '#fef3c7' : '#e0f2fe',
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 2.5,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 8,
                      fontWeight: 'bold',
                      color: isPendingStatus ? '#b45309' : '#0284c7',
                    }}
                  >
                    {getMethodText(bill.paymentMethod)}
                  </Text>
                </View>
              </View>

              {isPaid && bill.paymentDate ? (
                <Text style={{ fontSize: 8.5, color: '#16a34a', fontWeight: 'bold' }}>
                  {isGu ? 'તારીખ: ' : 'Date: '}{formatDate(bill.paymentDate)}
                </Text>
              ) : null}
            </View>

            {/* Cheque Info Section - Sleek accent row */}
            {bill.paymentMethod === 'Cheque' ? (
              <View style={{ backgroundColor: '#f1f5f9', padding: 6, borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#0284c7', marginTop: 4, marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 8, color: '#0f172a', fontWeight: 'bold' }}>
                    {isGu ? 'ચેક નં:' : 'Cheque No:'} {bill.chequeNo || 'N/A'}
                  </Text>
                  {bill.chequeDate ? (
                    <Text style={{ fontSize: 8, color: '#0f172a', fontWeight: 'bold' }}>
                      {isGu ? 'તારીખ:' : 'Date:'} {formatDate(bill.chequeDate)}
                    </Text>
                  ) : null}
                </View>
                {bill.chequeBank ? (
                  <Text style={{ fontSize: 8, color: '#475569', marginTop: 2, fontWeight: 'bold' }}>
                    {isGu ? 'બેંક:' : 'Bank:'} {bill.chequeBank}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* Notes Section & Material Charge Box */}
          {(Boolean(bill.notes) || extraCharges > 0) ? (
            <View style={{ backgroundColor: '#fffbeb', padding: 6, borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#d97706', marginTop: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 7, color: '#b45309', fontWeight: 'bold', marginBottom: 2, textTransform: 'uppercase' }}>
                  {isGu ? 'નોંધ / ડિલિવરી સૂચનાઓ:' : 'Notes / Delivery Instructions:'}
                </Text>
                <Text style={{ fontSize: 8.5, color: '#78350f' }}>
                  {bill.notes || '-'}
                </Text>
              </View>
              {extraCharges > 0 ? (
                <View style={{ marginLeft: 8, paddingLeft: 8, borderLeftWidth: 1, borderLeftColor: '#fde68a', alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 9, color: '#dc2626', fontWeight: 'bold' }}>
                    - ₹{extraCharges.toLocaleString('en-IN')}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Totals Card */}
        <View style={styles.totalsCard}>
          <View>
            <Text style={{ fontSize: 7, color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              {isGu ? 'ગણતરી અને કુલ સરવાળો' : 'CALCULATIONS & SUMMARY'}
            </Text>

            <View style={{ ...styles.summaryRow, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9', paddingBottom: 4 }}>
              <Text style={styles.summaryLabel}>{isGu ? 'કુલ બિલિંગ રકમ:' : 'Total Billing Amount:'}</Text>
              <Text style={styles.summaryValue}>₹{grossTotal.toLocaleString('en-IN')}</Text>
            </View>

            {extraCharges > 0 ? (
              <View style={{ ...styles.summaryRow, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9', paddingBottom: 4 }}>
                <Text style={{ ...styles.summaryLabel, color: '#e11d48' }}>{isGu ? 'મટીરીયલ / કાપડ બાદ રકમ:' : 'Material/Kapad Amount:'}</Text>
                <Text style={{ ...styles.summaryValue, color: '#e11d48' }}>- ₹{extraCharges.toLocaleString('en-IN')}</Text>
              </View>
            ) : null}

            {totalDiscount > 0 ? (() => {
              const rawPct = (bill as any).discountPercent;
              const discPctNum = (rawPct !== undefined && rawPct !== null && rawPct !== '' && !isNaN(Number(rawPct)) && Number(rawPct) > 0)
                ? Number(rawPct)
                : (grossTotal > 0 ? ((totalDiscount / grossTotal) * 100) : 0);
              const discPct = Number(discPctNum) || 0;
              const discPctStr = discPct > 0 ? ` (${discPct % 1 === 0 ? discPct.toFixed(0) : discPct.toFixed(2)}%)` : '';
              return (
                <View style={{ ...styles.summaryRow, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9', paddingBottom: 4 }}>
                  <Text style={{ ...styles.summaryLabel, color: '#e11d48' }}>
                    {isGu ? `કુલ વટાવ${discPctStr}:` : `Total Discount${discPctStr}:`}
                  </Text>
                  <Text style={{ ...styles.summaryValue, color: '#e11d48' }}>- ₹{totalDiscount.toLocaleString('en-IN')}</Text>
                </View>
              );
            })() : null}

            {taxVal > 0 ? (
              <View style={{ ...styles.summaryRow, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9', paddingBottom: 4 }}>
                <Text style={{ ...styles.summaryLabel, color: '#7c3aed' }}>{isGu ? 'જીએસટી ટેક્સ (5%):' : 'GST Tax (5%):'}</Text>
                <Text style={{ ...styles.summaryValue, color: '#7c3aed' }}>+ ₹{taxVal.toLocaleString('en-IN')}</Text>
              </View>
            ) : null}

            {roundOff !== 0 ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{isGu ? 'રાઉન્ડ ઓફ:' : 'Round Off:'}</Text>
                <Text style={styles.summaryValue}>
                  {roundOff >= 0 ? `+ ₹${roundOff}` : `- ₹${Math.abs(roundOff)}`}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={{ ...styles.netTotalBox, backgroundColor: '#f0f7ff', borderColor: '#bfdbfe' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ ...styles.netTotalLabel, color: '#1e3a8a' }}>{isGu ? 'કુલ રકમ:' : 'Total Amount:'}</Text>
              <Text style={{ ...styles.netTotalValue, color: '#1e3a8a' }}>₹{netTotal.toLocaleString('en-IN')}</Text>
            </View>
            <Text style={{ fontSize: 7.5, color: '#2563eb', fontWeight: 'bold', marginTop: 4, paddingTop: 4, borderTopWidth: 0.5, borderTopColor: '#93c5fd' }}>
              {numberToWords(netTotal, isGu ? 'gu' : 'en')}
            </Text>
          </View>
        </View>
      </View>
    </Page>
  );
};

export const BillDetailsPdfDocument: React.FC<BillDetailsPdfDocumentProps> = ({ bills, settings, language = 'en', parties }) => {
  return (
    <Document title={`Invoice_Bill_Details.pdf`}>
      {bills.map((bill, index) => (
        <SingleBillPage key={bill.id || bill.invoiceNo || index} bill={bill} settings={settings} language={language} parties={parties} />
      ))}
    </Document>
  );
};

export async function downloadDetailsPdfWithReactPdf(
  input: Bill | Bill[],
  settings: CompanySettings,
  language: 'en' | 'gu' = 'en',
  partiesInput?: Party[]
) {
  try {
    const bills = Array.isArray(input) ? input : [input];
    if (bills.length === 0) return;

    let parties = partiesInput;
    if (!parties || parties.length === 0) {
      try {
        parties = await apiClient.getParties();
      } catch (err) {
        console.warn('Could not fetch parties for PDF:', err);
      }
    }

    const doc = <BillDetailsPdfDocument bills={bills} settings={settings} language={language} parties={parties} />;
    const asBlob = await pdf(doc).toBlob();
    const url = URL.createObjectURL(asBlob);
    const link = document.createElement('a');
    link.href = url;

    const filename = bills.length === 1
      ? `Invoice_Bill_Details_${bills[0].invoiceNo || 'FC'}.pdf`
      : `Invoice_Bill_Details_${bills.length}_Bills.pdf`;

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error('Failed to generate React PDF blob:', error);
    throw error;
  }
}
