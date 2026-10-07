import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Tabs,
  Tab,
  Paper,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import CopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import PlayIcon from '@mui/icons-material/PlayArrow';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CodeIcon from '@mui/icons-material/Code';
import AndroidIcon from '@mui/icons-material/PhoneAndroid';
import ServerIcon from '@mui/icons-material/Dns';
import RefreshIcon from '@mui/icons-material/Refresh';
import OnlineIcon from '@mui/icons-material/CheckCircle';
import OfflineIcon from '@mui/icons-material/Warning';
import PartyIcon from '@mui/icons-material/People';
import BillingIcon from '@mui/icons-material/ReceiptLong';
import PurchaseIcon from '@mui/icons-material/ShoppingCart';
import WorkerIcon from '@mui/icons-material/Badge';
import PaymentIcon from '@mui/icons-material/AccountBalanceWallet';
import SettingIcon from '@mui/icons-material/Settings';
import AuthIcon from '@mui/icons-material/VpnKey';

interface EndpointDoc {
  id: string;
  category: 'party' | 'billing' | 'purchase' | 'worker' | 'payment' | 'settings' | 'auth' | 'appuser';
  categoryLabel: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  title: string;
  description: string;
  headers?: Record<string, string>;
  requestBody?: any;
  responseBody: any;
  notes?: string;
}

export const ApiDocsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [apiHealth, setApiHealth] = useState<{ status: string; connected?: boolean; time?: string } | null>(null);
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { status: number; data: any; timeMs: number }>>({});
  const [baseUrl, setBaseUrl] = useState<string>('');

  useEffect(() => {
    const origin = window.location.origin;
    setBaseUrl(`${origin}/api`);
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setApiHealth(data);
    } catch (err) {
      setApiHealth({ status: 'error', connected: false });
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTestApi = async (ep: EndpointDoc) => {
    setTestingEndpoint(ep.id);
    const startTime = performance.now();
    try {
      let url = ep.endpoint;
      if (url.includes(':id')) {
        url = url.replace(':id', 'p1');
      }

      const options: RequestInit = {
        method: ep.method,
        headers: {
          'Content-Type': 'application/json',
          ...ep.headers,
        },
      };

      if ((ep.method === 'POST' || ep.method === 'PUT') && ep.requestBody) {
        options.body = JSON.stringify(ep.requestBody);
      }

      const res = await fetch(url, options);
      const data = await res.json();
      const endTime = performance.now();

      setTestResults((prev) => ({
        ...prev,
        [ep.id]: {
          status: res.status,
          data,
          timeMs: Math.round(endTime - startTime),
        },
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [ep.id]: {
          status: 500,
          data: { error: err.message || 'Network fetch failed' },
          timeMs: 0,
        },
      }));
    } finally {
      setTestingEndpoint(null);
    }
  };

  const endpoints: EndpointDoc[] = [
    // --- APP USER MANAGEMENT (MOBILE APP) ---
    {
      id: 'app-user-get-all',
      category: 'appuser',
      categoryLabel: 'App Users (Mobile)',
      method: 'GET',
      endpoint: '/api/app-users',
      title: 'Get All Mobile App Users & Registration Requests',
      description: 'Fetch complete list of mobile registration accounts with current status (Pending, Approved, Declined).',
      responseBody: [
        {
          id: 'au_101',
          fullName: 'શિવમ ફેશન (Shivam Fashion)',
          mobileNumber: '9876543210',
          password: '1234',
          status: 'Pending',
          requestedAt: '2026-08-22',
        },
        {
          id: 'au_102',
          fullName: 'નિલેશ ભાઈ (Nilesh Bhai)',
          mobileNumber: '9825123456',
          password: '5678',
          status: 'Approved',
          requestedAt: '2026-08-20',
          approvedAt: '2026-08-21',
        },
      ],
    },
    {
      id: 'app-user-register',
      category: 'appuser',
      categoryLabel: 'App Users (Mobile)',
      method: 'POST',
      endpoint: '/api/app-users/register',
      title: 'Mobile App User Registration (નવી નોંધણી)',
      description: 'Register a new customer account from Android / iOS mobile application. Request enters "Pending" state awaiting admin approval.',
      headers: { 'Content-Type': 'application/json' },
      requestBody: {
        fullName: 'શિવમ ફેશન (Shivam Fashion)',
        mobileNumber: '9876543210',
        password: '1234',
      },
      responseBody: {
        success: true,
        message: 'તમારી એકાઉન્ટ નોંધણી વિનંતી સફળતાપૂર્વક મોકલવામાં આવી છે. એડમિન મંજૂરી આપશે પછી તમે લોગિન કરી શકશો.',
        appUser: {
          id: 'au_1700000000',
          fullName: 'શિવમ ફેશન',
          mobileNumber: '9876543210',
          status: 'Pending',
          requestedAt: '2026-08-22',
        },
      },
    },
    {
      id: 'app-user-login',
      category: 'appuser',
      categoryLabel: 'App Users (Mobile)',
      method: 'POST',
      endpoint: '/api/app-users/login',
      title: 'Mobile App User Login (લોગિન)',
      description: 'Authenticate mobile user using mobile number & password. Checks if account status is "Approved".',
      headers: { 'Content-Type': 'application/json' },
      requestBody: {
        mobileNumber: '9825123456',
        password: '5678',
      },
      responseBody: {
        success: true,
        status: 'Approved',
        message: 'લોગિન સફળ થયું!',
        user: {
          id: 'au_102',
          fullName: 'નિલેશ ભાઈ',
          mobileNumber: '9825123456',
          status: 'Approved',
        },
      },
    },
    {
      id: 'app-user-update-status',
      category: 'appuser',
      categoryLabel: 'App Users (Mobile)',
      method: 'PUT',
      endpoint: '/api/app-users/:id/status',
      title: 'Approve / Decline App User Request',
      description: 'Admin action to update mobile user status to "Approved" or "Declined".',
      headers: { 'Content-Type': 'application/json' },
      requestBody: {
        status: 'Approved',
      },
      responseBody: {
        success: true,
        message: 'User status updated to Approved',
        user: {
          id: 'au_101',
          status: 'Approved',
        },
      },
    },
    {
      id: 'app-user-delete',
      category: 'appuser',
      categoryLabel: 'App Users (Mobile)',
      method: 'DELETE',
      endpoint: '/api/app-users/:id',
      title: 'Delete App User Record',
      description: 'Remove a mobile user registration account record from the system.',
      responseBody: {
        success: true,
        id: 'au_101',
      },
    },

    // --- AUTH ---
    {
      id: 'auth-login',
      category: 'auth',
      categoryLabel: 'Authentication',
      method: 'POST',
      endpoint: '/api/auth/login',
      title: 'User Login / Authentication',
      description: 'Authenticate Android user with email/password and obtain JWT access token.',
      headers: { 'Content-Type': 'application/json' },
      requestBody: {
        email: 'fenicreation001@gmail.com',
        password: 'admin123',
      },
      responseBody: {
        success: true,
        token: 'feni_creation_jwt_admin_token_2026',
        user: {
          id: 'u1',
          name: 'Admin - Feni Creation',
          email: 'fenicreation001@gmail.com',
          role: 'Admin',
        },
      },
    },

    // --- PARTY API ---
    {
      id: 'party-get-all',
      category: 'party',
      categoryLabel: 'Party Management',
      method: 'GET',
      endpoint: '/api/parties',
      title: 'Get All Parties',
      description: 'Fetch complete list of registered Parties / Clients for Android party selection.',
      responseBody: [
        {
          id: 'p1',
          name: 'મોગલ ફેશન (Mogal Fashion)',
          partyName: 'Mogal Fashion',
          gstin: '32AABBA7990B1ZB',
          phone: '9878799879',
          address: 'Sumel Business Park 7, Kochi, Kerala - 380023',
          openingBalance: 5000,
          currentBalance: 12500,
        },
      ],
    },
    {
      id: 'party-create',
      category: 'party',
      categoryLabel: 'Party Management',
      method: 'POST',
      endpoint: '/api/parties',
      title: 'Create New Party',
      description: 'Add a new client/party account record from Android app.',
      requestBody: {
        id: 'p_' + Date.now(),
        name: 'જય અંબે ટેક્સટાઇલ',
        partyName: 'Jay Ambe Textile',
        gstin: '24AAAAA0000A1Z5',
        phone: '9898989898',
        address: 'Ring Road, Surat, Gujarat',
        openingBalance: 0,
      },
      responseBody: {
        id: 'p_1700000000',
        name: 'જય અંબે ટેક્સટાઇલ',
        partyName: 'Jay Ambe Textile',
        gstin: '24AAAAA0000A1Z5',
        phone: '9898989898',
        address: 'Ring Road, Surat, Gujarat',
        openingBalance: 0,
      },
    },
    {
      id: 'party-update',
      category: 'party',
      categoryLabel: 'Party Management',
      method: 'PUT',
      endpoint: '/api/parties/:id',
      title: 'Update Existing Party',
      description: 'Modify party profile details or contact info by party ID.',
      requestBody: {
        partyName: 'Jay Ambe Textile Pvt Ltd',
        phone: '9898989899',
        address: 'New Ring Road, Surat',
      },
      responseBody: {
        id: 'p1',
        partyName: 'Jay Ambe Textile Pvt Ltd',
        phone: '9898989899',
        address: 'New Ring Road, Surat',
      },
    },
    {
      id: 'party-delete',
      category: 'party',
      categoryLabel: 'Party Management',
      method: 'DELETE',
      endpoint: '/api/parties/:id',
      title: 'Delete Party Record',
      description: 'Remove a party entry from the database by ID.',
      responseBody: { success: true, message: 'Party deleted successfully' },
    },

    // --- BILLING API ---
    {
      id: 'billing-get-all',
      category: 'billing',
      categoryLabel: 'Billing Management',
      method: 'GET',
      endpoint: '/api/bills',
      title: 'Get All Tax Invoices (Billing)',
      description: 'Fetch list of all generated Sales Tax Invoices with party details & item breakdown.',
      responseBody: [
        {
          id: 'b1',
          invoiceNo: 'FCKB-1',
          date: '2026-04-02',
          partyId: 'p1',
          partyName: 'મોગલ ફેશન',
          partyChallanNo: '501',
          partyChallanDate: '2026-03-28',
          items: [
            {
              id: 'it1',
              designNo: 'D-32 - સાડીની જોબ વર્ક - 4 નીડલ',
              hsn: '9988',
              qty: 52,
              rate: 140,
              taxableValue: 7280,
              gstPercent: 5,
              gstAmount: 364,
              totalAmount: 7644,
            },
          ],
          subtotal: 6916,
          discountAmount: 364,
          totalTax: 0,
          totalAmount: 6916,
          amountInWords: 'SIX THOUSAND NINE HUNDRED AND SIXTEEN RUPEES ONLY',
        },
      ],
    },
    {
      id: 'billing-create',
      category: 'billing',
      categoryLabel: 'Billing Management',
      method: 'POST',
      endpoint: '/api/bills',
      title: 'Create New Bill / Tax Invoice',
      description: 'Generate and store a new Sales Invoice from Android app.',
      requestBody: {
        id: 'bill_' + Date.now(),
        invoiceNo: 'FCKB-102',
        date: '2026-08-05',
        partyId: 'p1',
        partyName: 'મોગલ ફેશન',
        partyChallanNo: '602',
        partyChallanDate: '2026-08-01',
        items: [
          {
            id: 'it_1',
            designNo: 'Embroidery Work Saree',
            hsn: '9988',
            qty: 100,
            rate: 150,
            taxableValue: 15000,
            gstPercent: 5,
            gstAmount: 750,
            totalAmount: 15750,
          },
        ],
        subtotal: 15000,
        discountAmount: 0,
        totalTax: 750,
        totalAmount: 15750,
        amountInWords: 'FIFTEEN THOUSAND SEVEN HUNDRED AND FIFTY RUPEES ONLY',
      },
      responseBody: {
        id: 'bill_1700000000',
        invoiceNo: 'FCKB-102',
        totalAmount: 15750,
        status: 'Saved',
      },
    },
    {
      id: 'billing-update',
      category: 'billing',
      categoryLabel: 'Billing Management',
      method: 'PUT',
      endpoint: '/api/bills/:id',
      title: 'Update Existing Invoice',
      description: 'Modify items, quantities, or discounts on an existing invoice.',
      requestBody: {
        totalAmount: 16000,
      },
      responseBody: { id: 'b1', success: true },
    },
    {
      id: 'billing-delete',
      category: 'billing',
      categoryLabel: 'Billing Management',
      method: 'DELETE',
      endpoint: '/api/bills/:id',
      title: 'Delete Invoice',
      description: 'Delete an invoice record by invoice ID.',
      responseBody: { success: true, message: 'Bill deleted successfully' },
    },

    // --- MATERIAL PURCHASE API ---
    {
      id: 'purchase-get-all',
      category: 'purchase',
      categoryLabel: 'Material Purchase',
      method: 'GET',
      endpoint: '/api/purchases',
      title: 'Get All Material Purchases',
      description: 'Fetch list of raw material & yarn/thread purchase entries.',
      responseBody: [
        {
          id: 'pur1',
          purchaseNo: 'PUR-201',
          date: '2026-07-15',
          supplierName: 'Shree Ram Thread Suppliers',
          itemName: 'Metallic Thread Spools (Gilt)',
          quantity: 250,
          unit: 'Pcs',
          rate: 85,
          totalAmount: 21250,
          gstin: '24AABCS9981B1Z2',
          notes: 'High shine embroidery thread lot',
        },
      ],
    },
    {
      id: 'purchase-create',
      category: 'purchase',
      categoryLabel: 'Material Purchase',
      method: 'POST',
      endpoint: '/api/purchases',
      title: 'Record Material Purchase',
      description: 'Save new raw material purchase entry from Android app.',
      requestBody: {
        id: 'pur_' + Date.now(),
        purchaseNo: 'PUR-202',
        date: '2026-08-05',
        supplierName: 'Surat Yarn Traders',
        itemName: 'Polyester Silk Cloth Roll',
        quantity: 50,
        unit: 'Meters',
        rate: 120,
        totalAmount: 6000,
      },
      responseBody: { id: 'pur_1700000', purchaseNo: 'PUR-202', totalAmount: 6000 },
    },

    // --- WORKER SALARY API ---
    {
      id: 'worker-get-all',
      category: 'worker',
      categoryLabel: 'Worker Salary (Karigar)',
      method: 'GET',
      endpoint: '/api/workers',
      title: 'Get All Workers & Upad (Salary Records)',
      description: 'Fetch Karigar (embroidery worker) master list, advances (Upad), daily production and wage balance.',
      responseBody: [
        {
          id: 'w1',
          name: 'રામેશભાઈ કારીગર (Ramesh Karigar)',
          phone: '9825012345',
          designation: 'Multi-head Embroidery Operator',
          workType: 'Piece Rate',
          ratePerPiece: 12,
          totalWorkDone: 1500,
          totalWagesEarned: 18000,
          totalUpadAdvance: 4000,
          netSalaryPayable: 14000,
          upadHistory: [
            { id: 'u1', date: '2026-07-10', amount: 2000, reason: 'Festival Advance' },
            { id: 'u2', date: '2026-07-25', amount: 2000, reason: 'Personal' },
          ],
        },
      ],
    },
    {
      id: 'worker-create',
      category: 'worker',
      categoryLabel: 'Worker Salary (Karigar)',
      method: 'POST',
      endpoint: '/api/workers',
      title: 'Add New Worker / Karigar',
      description: 'Register a new worker profile with piece rate / fixed salary details.',
      requestBody: {
        id: 'w_' + Date.now(),
        name: 'મહેશ પટેલ',
        phone: '9898001122',
        designation: 'Sequins Stitching Specialist',
        workType: 'Piece Rate',
        ratePerPiece: 15,
        totalUpadAdvance: 0,
      },
      responseBody: { id: 'w_170000', name: 'મહેશ પટેલ', status: 'Active' },
    },
    {
      id: 'worker-update',
      category: 'worker',
      categoryLabel: 'Worker Salary (Karigar)',
      method: 'PUT',
      endpoint: '/api/workers/:id',
      title: 'Update Worker / Log Upad (Salary Advance)',
      description: 'Update worker details or append new Upad / advance payment logs.',
      requestBody: {
        totalUpadAdvance: 5000,
        upadHistory: [
          { id: 'u3', date: '2026-08-05', amount: 1000, reason: 'Weekly Upad' },
        ],
      },
      responseBody: { id: 'w1', success: true },
    },

    // --- PAYMENT API ---
    {
      id: 'payment-get-all',
      category: 'payment',
      categoryLabel: 'Payment Management',
      method: 'GET',
      endpoint: '/api/payments',
      title: 'Get All Payments Received / Paid',
      description: 'Fetch complete list of financial payment transactions (Cash, Bank Transfer, UPI, Cheque).',
      responseBody: [
        {
          id: 'pay1',
          date: '2026-07-28',
          partyId: 'p1',
          partyName: 'મોગલ ફેશન',
          type: 'Received',
          amount: 10000,
          paymentMode: 'UPI / GPay',
          referenceNo: 'UPI/38291048201',
          notes: 'Partial payment against Bill #FCKB-1',
        },
      ],
    },
    {
      id: 'payment-create',
      category: 'payment',
      categoryLabel: 'Payment Management',
      method: 'POST',
      endpoint: '/api/payments',
      title: 'Record New Payment Transaction',
      description: 'Add a new received or paid transaction entry from Android app.',
      requestBody: {
        id: 'pay_' + Date.now(),
        date: '2026-08-05',
        partyId: 'p1',
        partyName: 'મોગલ ફેશન',
        type: 'Received',
        amount: 5000,
        paymentMode: 'Bank Transfer (NEFT)',
        referenceNo: 'NEFT98210391',
        notes: 'Final settlement against invoice',
      },
      responseBody: { id: 'pay_170000', amount: 5000, success: true },
    },

    // --- SETTINGS API ---
    {
      id: 'settings-get',
      category: 'settings',
      categoryLabel: 'Company Settings',
      method: 'GET',
      endpoint: '/api/settings',
      title: 'Get Company & Bank Details',
      description: 'Fetch company header info, GSTIN, bank details, and invoice terms for Android app config.',
      responseBody: {
        companyName: 'FENI CREATION',
        tagline: 'Embroidery & Textile Manufacturing',
        gstin: '24ABCDE1234F1Z5',
        email: 'fenicreation001@gmail.com',
        phone: '+91 98765 43210',
        address: 'Plot No. 124, GIDC Industrial Estate, Varachha, Surat - 395006, Gujarat, India',
        bankName: 'State Bank of India',
        accountNo: '39485726102',
        ifscCode: 'SBIN0001234',
        hsnCode: '9988',
        termsAndConditions: '1. Any complaint regarding should be brought to our notice in written within 2 days.\n2. We are not responsible for Payment to unauthorized person.',
      },
    },
    {
      id: 'settings-update',
      category: 'settings',
      categoryLabel: 'Company Settings',
      method: 'PUT',
      endpoint: '/api/settings',
      title: 'Update Company Profile',
      description: 'Save updated business details or bank details.',
      requestBody: {
        companyName: 'FENI CREATION',
        phone: '+91 98765 43210',
      },
      responseBody: { success: true, message: 'Settings updated successfully' },
    },
  ];

  const filteredEndpoints =
    activeTab === 'all' ? endpoints : endpoints.filter((e) => e.category === activeTab);

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return { bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc' };
      case 'POST':
        return { bg: '#dcfce7', color: '#15803d', border: '#86efac' };
      case 'PUT':
        return { bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
      case 'DELETE':
        return { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' };
      default:
        return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'party':
        return <PartyIcon fontSize="small" />;
      case 'billing':
        return <BillingIcon fontSize="small" />;
      case 'purchase':
        return <PurchaseIcon fontSize="small" />;
      case 'worker':
        return <WorkerIcon fontSize="small" />;
      case 'payment':
        return <PaymentIcon fontSize="small" />;
      case 'settings':
        return <SettingIcon fontSize="small" />;
      case 'auth':
        return <AuthIcon fontSize="small" />;
      case 'appuser':
        return <AndroidIcon fontSize="small" />;
      default:
        return <CodeIcon fontSize="small" />;
    }
  };

  return (
    <Box sx={{ maxWidth: '1400px', mx: 'auto', pb: 6 }}>
      {/* Header Banner */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          color: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.4)',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 2,
                  bgcolor: 'rgba(99, 102, 241, 0.2)',
                  color: '#a5b4fc',
                  display: 'inline-flex',
                }}
              >
                <AndroidIcon fontSize="medium" />
              </Box>
              <Chip
                label="Android Application REST API Specification"
                size="small"
                sx={{ bgcolor: '#4338ca', color: '#e0e7ff', fontWeight: 700, fontSize: '0.75rem' }}
              />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 1, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
              Android ERP Integration API Links & Docs
            </Typography>
            <Typography variant="body2" sx={{ color: '#cbd5e1', maxWidth: '800px', lineHeight: 1.6 }}>
              Complete live RESTful API endpoints for <strong>Party Management</strong>, <strong>Tax Billing</strong>, <strong>Material Purchases</strong>, <strong>Worker (Karigar) Salaries & Upad</strong>, and <strong>Payments</strong> to easily integrate with your Android native Kotlin/Java app.
            </Typography>
          </Box>

          <Box sx={{ minWidth: { xs: '100%', md: '300px' } }}>
            <Box sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.07)', borderRadius: 2, backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                  Live API Server Status
                </Typography>
                <IconButton size="small" onClick={checkHealth} sx={{ color: '#818cf8' }}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {apiHealth?.status === 'ok' ? (
                  <>
                    <OnlineIcon sx={{ color: '#4ade80' }} fontSize="small" />
                    <Typography variant="body2" sx={{ color: '#4ade80', fontWeight: 700 }}>
                      Online & Connected
                    </Typography>
                  </>
                ) : (
                  <>
                    <OfflineIcon sx={{ color: '#f87171' }} fontSize="small" />
                    <Typography variant="body2" sx={{ color: '#f87171', fontWeight: 700 }}>
                      Connecting to Backend...
                    </Typography>
                  </>
                )}
              </Box>
              <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mt: 0.5, fontSize: '0.7rem' }}>
                Base URL: <code>{baseUrl}</code>
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Base URL Box with Copy */}
      <Card sx={{ mb: 3, borderRadius: 2.5, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ width: '100%' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', display: 'block', mb: 0.8, letterSpacing: '0.05em' }}>
                Android Base API URL
              </Typography>
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  gap: 1.5, 
                  bgcolor: '#0f172a', 
                  p: 1.8, 
                  borderRadius: 2, 
                  border: '1px solid #334155',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
                  width: '100%',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
                  <ServerIcon sx={{ color: '#818cf8', flexShrink: 0 }} fontSize="small" />
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      fontFamily: 'monospace', 
                      fontWeight: 700, 
                      color: '#38bdf8', 
                      fontSize: { xs: '0.8rem', sm: '0.95rem' },
                      whiteSpace: 'nowrap',
                      overflowX: 'auto',
                      py: 0.5,
                      '&::-webkit-scrollbar': { height: 4 },
                      '&::-webkit-scrollbar-thumb': { bgcolor: '#475569', borderRadius: 2 },
                    }}
                  >
                    {baseUrl}
                  </Typography>
                </Box>
                <Tooltip title={copiedId === 'base-url' ? 'Copied!' : 'Copy Base URL'}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleCopy(baseUrl, 'base-url')}
                    color={copiedId === 'base-url' ? 'success' : 'primary'}
                    startIcon={copiedId === 'base-url' ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                    sx={{ flexShrink: 0, fontWeight: 700, textTransform: 'none', borderRadius: 1.5 }}
                  >
                    {copiedId === 'base-url' ? 'Copied' : 'Copy URL'}
                  </Button>
                </Tooltip>
              </Box>
            </Box>

            <Box sx={{ width: '100%' }}>
              <Box sx={{ bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', p: 1.8, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#166534', display: 'block', fontSize: '0.8rem' }}>
                    ⚡ Quick Android Retrofit Setup
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#15803d', display: 'block', fontSize: '0.78rem', mt: 0.3, fontFamily: 'monospace', wordBreak: 'break-word' }}>
                    Retrofit.Builder().baseUrl("{baseUrl}/").addConverterFactory(GsonConverterFactory.create()).build()
                  </Typography>
                </Box>
                <Tooltip title={copiedId === 'retrofit-code' ? 'Copied Snippet!' : 'Copy Retrofit Snippet'}>
                  <Button
                    variant="outlined"
                    size="small"
                    color="success"
                    onClick={() => handleCopy(`Retrofit.Builder().baseUrl("${baseUrl}/").addConverterFactory(GsonConverterFactory.create()).build()`, 'retrofit-code')}
                    startIcon={copiedId === 'retrofit-code' ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                    sx={{ flexShrink: 0, fontWeight: 700, textTransform: 'none', borderRadius: 1.5, bgcolor: '#ffffff' }}
                  >
                    {copiedId === 'retrofit-code' ? 'Copied' : 'Copy Code'}
                  </Button>
                </Tooltip>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 1,
            '& .MuiTab-root': {
              fontWeight: 700,
              fontSize: '0.85rem',
              py: 1.8,
              minHeight: 48,
            },
          }}
        >
          <Tab value="all" label={`All APIs (${endpoints.length})`} />
          <Tab value="appuser" icon={<AndroidIcon fontSize="small" />} iconPosition="start" label="App Users (Mobile)" />
          <Tab value="party" icon={<PartyIcon fontSize="small" />} iconPosition="start" label="Parties API" />
          <Tab value="billing" icon={<BillingIcon fontSize="small" />} iconPosition="start" label="Billing Invoices" />
          <Tab value="purchase" icon={<PurchaseIcon fontSize="small" />} iconPosition="start" label="Material Purchases" />
          <Tab value="worker" icon={<WorkerIcon fontSize="small" />} iconPosition="start" label="Worker Salary & Upad" />
          <Tab value="payment" icon={<PaymentIcon fontSize="small" />} iconPosition="start" label="Payments API" />
          <Tab value="settings" icon={<SettingIcon fontSize="small" />} iconPosition="start" label="Company Settings" />
          <Tab value="auth" icon={<AuthIcon fontSize="small" />} iconPosition="start" label="Authentication" />
        </Tabs>
      </Paper>

      {/* Endpoint Cards List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {filteredEndpoints.map((ep) => {
          const mColor = getMethodColor(ep.method);
          const fullUrl = `${baseUrl}${ep.endpoint.replace('/api', '')}`;
          const isTesting = testingEndpoint === ep.id;
          const result = testResults[ep.id];

          return (
            <Card
              key={ep.id}
              sx={{
                borderRadius: 2.5,
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: '#cbd5e1',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                },
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                {/* Header row */}
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Chip
                      label={ep.method}
                      sx={{
                        fontWeight: 900,
                        fontSize: '0.8rem',
                        bgcolor: mColor.bg,
                        color: mColor.color,
                        border: `1px solid ${mColor.border}`,
                        height: 28,
                        borderRadius: '6px',
                        px: 0.5,
                      }}
                    />
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', fontSize: { xs: '0.9rem', sm: '1.05rem' } }}>
                      {ep.endpoint}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      icon={getCategoryIcon(ep.category)}
                      label={ep.categoryLabel}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      color="primary"
                      startIcon={isTesting ? <CircularProgress size={14} color="inherit" /> : <PlayIcon fontSize="small" />}
                      disabled={isTesting}
                      onClick={() => handleTestApi(ep)}
                      sx={{ fontWeight: 700, borderRadius: 1.5, textTransform: 'none' }}
                    >
                      {isTesting ? 'Testing...' : 'Live Test API'}
                    </Button>
                  </Box>
                </Box>

                <Typography variant="body2" sx={{ color: '#475569', fontWeight: 600, mb: 1 }}>
                  {ep.title}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 2 }}>
                  {ep.description}
                </Typography>

                {/* Full Endpoint Copy Bar */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#f8fafc', p: 1.2, borderRadius: 1.5, border: '1px solid #e2e8f0', mb: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', minWidth: '70px' }}>
                    Full URL:
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#0f172a', flex: 1, overflowX: 'auto' }}>
                    {fullUrl}
                  </Typography>
                  <Tooltip title={copiedId === ep.id ? 'Copied URL!' : 'Copy Endpoint'}>
                    <IconButton size="small" onClick={() => handleCopy(fullUrl, ep.id)}>
                      {copiedId === ep.id ? <CheckIcon fontSize="small" color="success" /> : <CopyIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Request Payload / Response Details Accordion */}
                <Accordion elevation={0} defaultExpanded sx={{ border: '1px solid #e2e8f0', borderRadius: '10px !important', '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 40, py: 0.5, bgcolor: '#f8fafc' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155' }}>
                      Request Payload & Response JSON Examples
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
                      {/* Left: Request Body (if any) */}
                      {ep.requestBody && (
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e293b' }}>
                              JSON Request Body (POST / PUT)
                            </Typography>
                            <IconButton size="small" onClick={() => handleCopy(JSON.stringify(ep.requestBody, null, 2), ep.id + '_req')}>
                              {copiedId === ep.id + '_req' ? <CheckIcon fontSize="small" color="success" /> : <CopyIcon fontSize="small" />}
                            </IconButton>
                          </Box>
                          <Paper
                            elevation={0}
                            sx={{
                              p: 1.5,
                              bgcolor: '#0f172a',
                              color: '#38bdf8',
                              borderRadius: 1.5,
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              maxHeight: '220px',
                              overflowY: 'auto',
                            }}
                          >
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(ep.requestBody, null, 2)}</pre>
                          </Paper>
                        </Box>
                      )}

                      {/* Right: Response Example */}
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e293b' }}>
                            Expected Response JSON (HTTP 200 OK)
                          </Typography>
                          <IconButton size="small" onClick={() => handleCopy(JSON.stringify(ep.responseBody, null, 2), ep.id + '_res')}>
                            {copiedId === ep.id + '_res' ? <CheckIcon fontSize="small" color="success" /> : <CopyIcon fontSize="small" />}
                          </IconButton>
                        </Box>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 1.5,
                            bgcolor: '#1e293b',
                            color: '#4ade80',
                            borderRadius: 1.5,
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            maxHeight: '220px',
                            overflowY: 'auto',
                          }}
                        >
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(ep.responseBody, null, 2)}</pre>
                        </Paper>
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>

                {/* Live Test Results View */}
                {result && (
                  <Alert
                    severity={result.status >= 200 && result.status < 300 ? 'success' : 'error'}
                    sx={{ mt: 2, borderRadius: 2 }}
                    action={
                      <Typography variant="caption" sx={{ fontWeight: 700, ml: 1 }}>
                        {result.timeMs} ms
                      </Typography>
                    }
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      Live Server Response (Status: {result.status})
                    </Typography>
                    <Box
                      sx={{
                        mt: 1,
                        p: 1.5,
                        bgcolor: '#0f172a',
                        color: '#f8fafc',
                        borderRadius: 1.5,
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        maxHeight: '200px',
                        overflowY: 'auto',
                      }}
                    >
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(result.data, null, 2)}</pre>
                    </Box>
                  </Alert>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* Android Kotlin Sample Code Section */}
      <Paper sx={{ mt: 4, p: 3, borderRadius: 3, border: '1px solid #cbd5e1', bgcolor: '#0f172a', color: '#f8fafc' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <AndroidIcon sx={{ color: '#4ade80' }} fontSize="medium" />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Android Native Kotlin Integration Snippet (Retrofit)
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#cbd5e1', mb: 2 }}>
          Copy this interface into your Android Studio project (<code>FeniApiService.kt</code>) to immediately connect to all backend APIs:
        </Typography>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            bgcolor: '#1e293b',
            color: '#a5b4fc',
            borderRadius: 2,
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            overflowX: 'auto',
          }}
        >
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{`import retrofit2.Response
import retrofit2.http.*

interface FeniApiService {
    // 1. Parties API
    @GET("parties")
    suspend fun getParties(): Response<List<PartyModel>>

    @POST("parties")
    suspend fun createParty(@Body party: PartyModel): Response<PartyModel>

    @PUT("parties/{id}")
    suspend fun updateParty(@Path("id") id: String, @Body party: PartyModel): Response<PartyModel>

    // 2. Billing Invoices API
    @GET("bills")
    suspend fun getBills(): Response<List<BillModel>>

    @POST("bills")
    suspend fun createBill(@Body bill: BillModel): Response<BillModel>

    // 3. Material Purchase API
    @GET("purchases")
    suspend fun getPurchases(): Response<List<PurchaseModel>>

    @POST("purchases")
    suspend fun createPurchase(@Body purchase: PurchaseModel): Response<PurchaseModel>

    // 4. Worker Salary & Upad API
    @GET("workers")
    suspend fun getWorkers(): Response<List<WorkerModel>>

    @POST("workers")
    suspend fun createWorker(@Body worker: WorkerModel): Response<WorkerModel>

    @PUT("workers/{id}")
    suspend fun updateWorkerUpad(@Path("id") id: String, @Body workerData: Map<String, Any>): Response<Map<String, Any>>

    // 5. Payment Management API
    @GET("payments")
    suspend fun getPayments(): Response<List<PaymentModel>>

    @POST("payments")
    suspend fun createPayment(@Body payment: PaymentModel): Response<PaymentModel>
}`}</pre>
        </Paper>
      </Paper>
    </Box>
  );
};
