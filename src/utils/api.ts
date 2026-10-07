import { Bill, CompanySettings, Party, Payment, Purchase, Worker } from '../types';
import { getBillPendingAmount } from './billCalculations';

// API BASE URL from environment variable (e.g. VITE_API_BASE_URL) if deployed separately
const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/$/, '');

// Default Initial Company Settings
const defaultSettings: CompanySettings = {
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
  termsAndConditions: '1. Any complaint regarding and should brought to our notice in written within 2 days.\n2. We are not responsible for Payment to unauthorized.\n3. Interest at 2.0 % per month charged on account not paid within due course.\n4. Subject to Surat Jurisdiction.',
  logoUrl: '',
  gujaratiSupport: true,
};

// Client-side Local Storage helpers with pre-seeded data
const getLocal = <T>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      setLocal(key, fallback);
      return fallback;
    }
    const parsed = JSON.parse(item);
    return parsed;
  } catch {
    return fallback;
  }
};

const setLocal = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

// Default Initial Sample Data for Static / Offline / Netlify deployments
const defaultParties: Party[] = [
  {
    id: 'p1',
    name: 'Radhe Krishna Prints',
    contactPerson: 'Rameshbhai Patel',
    type: 'Textile Party',
    mobile: '+91 98251 12345',
    gstin: '24AAACR1234F1Z1',
    address: 'Ring Road Market, Surat, Gujarat',
    openingBalance: 15000,
    createdAt: '2026-01-10',
  },
  {
    id: 'p2',
    name: 'Shree Ram Silk Mills',
    contactPerson: 'Sanjaybhai Shah',
    type: 'Textile Party',
    mobile: '+91 98980 54321',
    gstin: '24AABCS5678G1Z2',
    address: 'Sardar Market, Varachha, Surat',
    openingBalance: 28000,
    createdAt: '2026-01-12',
  },
  {
    id: 'p3',
    name: 'Surat Yarns & Threads Co.',
    contactPerson: 'Kiritbhai Goti',
    type: 'Material Party',
    mobile: '+91 97243 99887',
    gstin: '24AACSY9012H1Z3',
    address: 'GIDC Katargam, Surat, Gujarat',
    openingBalance: 0,
    createdAt: '2026-01-15',
  },
  {
    id: 'p4',
    name: 'Vraj Fashion Saree',
    contactPerson: 'Dinesh Kakadiya',
    type: 'Textile Party',
    mobile: '+91 94268 11223',
    gstin: '24AAACV3456I1Z4',
    address: 'Millennium Textile Market, Surat',
    openingBalance: 8500,
    createdAt: '2026-01-20',
  },
];

const defaultBills: Bill[] = [
  {
    id: 'b1',
    invoiceNo: 'FC-2026-001',
    partyId: 'p1',
    partyName: 'Radhe Krishna Prints',
    date: '2026-07-25',
    dueDate: '2026-08-10',
    items: [
      { id: 'bi1', description: 'Multi Embroidery Design Saree (Gold Zari)', quantity: 450, unit: 'Meters', rate: 85, amount: 38250, total: 38250, stitches: 24000 },
      { id: 'bi2', description: 'Sequins Cording Border Work', quantity: 300, unit: 'Meters', rate: 60, amount: 18000, total: 18000, stitches: 18000 },
    ],
    subtotal: 56250,
    cgst: 1406.25,
    sgst: 1406.25,
    taxRate: 5,
    totalTax: 2812.5,
    chargeAmount: 500,
    totalAmount: 59562.5,
    paidAmount: 30000,
    pendingAmount: 29562.5,
    status: 'Partial',
    notes: 'Urgent saree delivery batch 1',
    createdAt: '2026-07-25T10:00:00.000Z',
  },
  {
    id: 'b2',
    invoiceNo: 'FC-2026-002',
    partyId: 'p2',
    partyName: 'Shree Ram Silk Mills',
    date: '2026-07-28',
    dueDate: '2026-08-15',
    items: [
      { id: 'bi3', description: 'Daman Heavy Coding Embroidery (Dupatta)', quantity: 200, unit: 'Meters', rate: 140, amount: 28000, total: 28000, stitches: 45000 },
      { id: 'bi4', description: 'Schiffli Lace Embroidery Work', quantity: 150, unit: 'Meters', rate: 110, amount: 16500, total: 16500, stitches: 32000 },
    ],
    subtotal: 44500,
    cgst: 1112.5,
    sgst: 1112.5,
    taxRate: 5,
    totalTax: 2225,
    chargeAmount: 0,
    totalAmount: 46725,
    paidAmount: 46725,
    pendingAmount: 0,
    status: 'Paid',
    notes: 'Full payment received via UPI',
    createdAt: '2026-07-28T14:30:00.000Z',
  },
  {
    id: 'b3',
    invoiceNo: 'FC-2026-003',
    partyId: 'p4',
    partyName: 'Vraj Fashion Saree',
    date: '2026-07-30',
    dueDate: '2026-08-20',
    items: [
      { id: 'bi5', description: 'Garba Chaniya Choli Multi Work', quantity: 120, unit: 'Pcs', rate: 210, amount: 25200, total: 25200, stitches: 55000 },
    ],
    subtotal: 25200,
    cgst: 630,
    sgst: 630,
    taxRate: 5,
    totalTax: 1260,
    chargeAmount: 200,
    totalAmount: 26660,
    paidAmount: 0,
    pendingAmount: 26660,
    status: 'Pending',
    notes: 'Payment due within 20 days',
    createdAt: '2026-07-30T11:15:00.000Z',
  },
];

const defaultPurchases: Purchase[] = [
  {
    id: 'pur1',
    purchaseNo: 'PUR-2026-089',
    supplierId: 'p3',
    supplierName: 'Surat Yarns & Threads Co.',
    supplierGstin: '24AACSY9012H1Z3',
    date: '2026-07-20',
    items: [
      { id: 'pi1', description: '120D/2 Viscose Embroidery Thread Spools (Gold)', quantity: 100, rate: 180, amount: 18000, total: 18000 },
      { id: 'pi2', description: '75D/2 Metallic Zari Thread Cone', quantity: 50, rate: 250, amount: 12500, total: 12500 },
    ],
    subtotal: 30500,
    cgst: 762.5,
    sgst: 762.5,
    taxRate: 5,
    totalTax: 1525,
    totalAmount: 32025,
    paidAmount: 32025,
    pendingAmount: 0,
    status: 'Paid',
    paymentMethod: 'Bank Transfer',
    notes: 'Yarn material delivered to Factory unit 1',
    createdAt: '2026-07-20T09:00:00.000Z',
  },
  {
    id: 'pur2',
    purchaseNo: 'PUR-2026-094',
    supplierId: 'p3',
    supplierName: 'Surat Yarns & Threads Co.',
    supplierGstin: '24AACSY9012H1Z3',
    date: '2026-07-27',
    items: [
      { id: 'pi3', description: 'Paper Backing Roll (80 GSM)', quantity: 30, rate: 450, amount: 13500, total: 13500 },
    ],
    subtotal: 13500,
    cgst: 337.5,
    sgst: 337.5,
    taxRate: 5,
    totalTax: 675,
    totalAmount: 14175,
    paidAmount: 5000,
    pendingAmount: 9175,
    status: 'Partial',
    paymentMethod: 'UPI',
    notes: 'Remaining amount due next week',
    createdAt: '2026-07-27T16:20:00.000Z',
  },
];

const defaultWorkers: Worker[] = [
  {
    id: 'w1',
    name: 'Rajesh Bhai',
    gujaratiName: 'રાજેશ ભાઈ',
    role: 'Embroidery Machine Operator',
    mobile: '+91 98765 11223',
    joiningDate: '2024-03-15',
    monthlySalary: 22000,
    advancePaid: 3000,
    advances: [
      { id: 'adv1', date: '2026-07-10', amount: 3000, reason: 'Personal Emergency' },
    ],
    bonus: 1000,
    paidSalaryAmount: 15000,
    paymentMethod: 'Cash',
    days: 30,
    remainingSalary: 5000,
    status: 'Partial',
  },
  {
    id: 'w2',
    name: 'Ketan Patel',
    gujaratiName: 'કેતન પટેલ',
    role: 'Design Master / Puncher',
    mobile: '+91 97123 44556',
    joiningDate: '2023-08-01',
    monthlySalary: 28000,
    advancePaid: 0,
    advances: [],
    bonus: 2000,
    paidSalaryAmount: 30000,
    paymentMethod: 'Bank Transfer',
    days: 30,
    remainingSalary: 0,
    status: 'Paid',
  },
  {
    id: 'w3',
    name: 'Manoj Kumar',
    gujaratiName: 'મનોજ કુમાર',
    role: 'Thread Cutter & Finishing Helper',
    mobile: '+91 99099 88776',
    joiningDate: '2025-01-10',
    monthlySalary: 16000,
    advancePaid: 2000,
    advances: [
      { id: 'adv2', date: '2026-07-15', amount: 2000, reason: 'Festival Advance' },
    ],
    bonus: 0,
    paidSalaryAmount: 0,
    paymentMethod: 'UPI',
    days: 28,
    remainingSalary: 14000,
    status: 'Pending',
  },
];

const defaultPayments: Payment[] = [
  {
    id: 'pay1',
    date: '2026-07-26',
    partyId: 'p1',
    partyName: 'Radhe Krishna Prints',
    type: 'Received',
    refInvoiceNo: 'FC-2026-001',
    amount: 30000,
    paymentMethod: 'UPI',
    notes: 'Advance part payment for Bill FC-2026-001',
    createdAt: '2026-07-26T12:00:00.000Z',
  },
  {
    id: 'pay2',
    date: '2026-07-28',
    partyId: 'p2',
    partyName: 'Shree Ram Silk Mills',
    type: 'Received',
    refInvoiceNo: 'FC-2026-002',
    amount: 46725,
    paymentMethod: 'Bank Transfer',
    notes: 'Full settlement for Bill FC-2026-002',
    createdAt: '2026-07-28T15:00:00.000Z',
  },
  {
    id: 'pay3',
    date: '2026-07-21',
    partyId: 'p3',
    partyName: 'Surat Yarns & Threads Co.',
    type: 'Paid',
    refInvoiceNo: 'PUR-2026-089',
    amount: 32025,
    paymentMethod: 'Bank Transfer',
    notes: 'Supplier payment for thread purchase',
    createdAt: '2026-07-21T11:00:00.000Z',
  },
];

// API BASE URL helpers (support user-configured backend API URL in Settings or env var)
let isStaticHostDetected = false;

export function getCustomApiBase(): string {
  try {
    return localStorage.getItem('feni_api_url') || (import.meta as any).env?.VITE_API_BASE_URL || '';
  } catch {
    return (import.meta as any).env?.VITE_API_BASE_URL || '';
  }
}

export function setCustomApiBase(url: string): void {
  try {
    const cleanUrl = url.trim().replace(/\/$/, '');
    if (cleanUrl) {
      localStorage.setItem('feni_api_url', cleanUrl);
    } else {
      localStorage.removeItem('feni_api_url');
    }
    isStaticHostDetected = false;
  } catch {}
}

export function isStaticHostMode(): boolean {
  return isStaticHostDetected && !getCustomApiBase();
}

// Safe fetch wrapper that handles non-JSON / HTML responses (e.g. Netlify static server fallback)
async function safeFetchJson<T>(url: string, options?: RequestInit): Promise<T | null> {
  const apiBase = getCustomApiBase();
  
  // If static host without custom backend API is detected, bypass network calls to avoid HTML responses
  if (!apiBase && isStaticHostDetected) {
    return null;
  }

  try {
    const fullUrl = apiBase ? `${apiBase}${url}` : url;
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });

    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      return (await response.json()) as T;
    }

    // If relative API call returned HTML (e.g., Netlify index.html rewrite), mark static host
    if (!apiBase && contentType.includes('text/html')) {
      isStaticHostDetected = true;
      console.info('[Feni ERP] Netlify static host detected. Operating seamlessly in client LocalStorage database mode.');
    }
  } catch (err) {
    console.warn(`API request to ${url} failed or returned non-JSON. Operating in local storage mode.`, err);
  }
  return null;
}

export const apiClient = {
  // Generic REST methods
  async get<T>(url: string): Promise<T> {
    const res = await safeFetchJson<T>(`/api${url.startsWith('/') ? url : '/' + url}`);
    if (res !== null) {
      if (url.includes('/app-users') && Array.isArray(res)) {
        setLocal('feni_app_users', res);
      }
      return res;
    }
    // Fallback to local storage if available
    if (url.includes('/app-users')) {
      return getLocal<any>('feni_app_users', []) as T;
    }
    return [] as unknown as T;
  },

  async post<T>(url: string, body: any): Promise<T> {
    const res = await safeFetchJson<T>(`/api${url.startsWith('/') ? url : '/' + url}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (res !== null) return res;
    if (url.includes('/app-users')) {
      const current = getLocal<any[]>('feni_app_users', []);
      const newItem = { id: 'au_' + Date.now(), ...body, requestedAt: new Date().toISOString().split('T')[0] };
      setLocal('feni_app_users', [newItem, ...current]);
      return { success: true, appUser: newItem } as unknown as T;
    }
    return { success: true } as unknown as T;
  },

  async put<T>(url: string, body: any): Promise<T> {
    const res = await safeFetchJson<T>(`/api${url.startsWith('/') ? url : '/' + url}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    if (res !== null) return res;
    if (url.includes('/app-users')) {
      const current = getLocal<any[]>('feni_app_users', []);
      const parts = url.split('/');
      const id = parts[2];
      const updated = current.map((u) => (u.id === id ? { ...u, ...body } : u));
      setLocal('feni_app_users', updated);
      return { success: true } as unknown as T;
    }
    return { success: true } as unknown as T;
  },

  async delete<T>(url: string): Promise<T> {
    const res = await safeFetchJson<T>(`/api${url.startsWith('/') ? url : '/' + url}`, {
      method: 'DELETE',
    });
    if (res !== null) return res;
    if (url.includes('/app-users')) {
      const current = getLocal<any[]>('feni_app_users', []);
      const id = url.split('/')[2];
      setLocal(
        'feni_app_users',
        current.filter((u) => u.id !== id)
      );
    }
    return { success: true } as unknown as T;
  },

  // SETTINGS
  async getSettings(): Promise<CompanySettings> {
    const remote = await safeFetchJson<CompanySettings>('/api/settings');
    if (remote && remote.companyName) {
      setLocal('feni_settings', remote);
      return remote;
    }
    return getLocal<CompanySettings>('feni_settings', defaultSettings);
  },

  async updateSettings(settings: CompanySettings): Promise<CompanySettings> {
    const remote = await safeFetchJson<{ success: boolean; data: CompanySettings }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    const updated = remote?.data || settings;
    setLocal('feni_settings', updated);
    return updated;
  },

  // PARTIES
  async getParties(): Promise<Party[]> {
    const remote = await safeFetchJson<Party[]>('/api/parties');
    if (remote && Array.isArray(remote)) {
      setLocal('feni_parties', remote);
      return remote;
    }
    return getLocal<Party[]>('feni_parties', defaultParties);
  },

  async saveParty(party: Partial<Party>): Promise<Party> {
    const isEdit = !!party.id;
    const method = isEdit ? 'PUT' : 'POST';
    const endpoint = isEdit ? `/api/parties/${party.id}` : '/api/parties';

    const remote = await safeFetchJson<any>(endpoint, {
      method,
      body: JSON.stringify(party),
    });

    const current = getLocal<Party[]>('feni_parties', defaultParties);
    let updatedItem: Party;

    const savedFromRemote = remote?.party || (remote?.id ? remote : null);

    if (savedFromRemote && savedFromRemote.id) {
      updatedItem = savedFromRemote;
    } else {
      updatedItem = {
        id: party.id || 'p_' + Date.now(),
        name: party.name || '',
        contactPerson: party.contactPerson || '',
        type: party.type || 'Textile Party',
        mobile: party.mobile || '',
        gstin: party.gstin || '',
        address: party.address || '',
        openingBalance: party.openingBalance || 0,
        createdAt: party.createdAt || new Date().toISOString().split('T')[0],
      };
    }

    const nextList = isEdit
      ? current.map((p) => (p.id === updatedItem.id || (p as any)._id === updatedItem.id ? updatedItem : p))
      : [updatedItem, ...current];

    setLocal('feni_parties', nextList);
    return updatedItem;
  },

  async deleteParty(id: string): Promise<boolean> {
    await safeFetchJson(`/api/parties/${id}`, { method: 'DELETE' });
    const current = getLocal<Party[]>('feni_parties', defaultParties);
    setLocal('feni_parties', current.filter((p) => p.id !== id));
    return true;
  },

  // BILLS
  async getBills(): Promise<Bill[]> {
    const remote = await safeFetchJson<Bill[]>('/api/bills');
    if (remote && Array.isArray(remote)) {
      setLocal('feni_bills', remote);
      return remote;
    }
    return getLocal<Bill[]>('feni_bills', defaultBills);
  },

  async saveBill(bill: Partial<Bill>): Promise<Bill> {
    const isEdit = !!bill.id;
    const method = isEdit ? 'PUT' : 'POST';
    const endpoint = isEdit ? `/api/bills/${bill.id}` : '/api/bills';

    const remote = await safeFetchJson<any>(endpoint, {
      method,
      body: JSON.stringify(bill),
    });

    const current = getLocal<Bill[]>('feni_bills', defaultBills);
    let updatedItem: Bill;

    const savedFromRemote = remote?.bill || (remote?.id ? remote : null);

    if (savedFromRemote && (savedFromRemote.id || savedFromRemote.invoiceNo)) {
      updatedItem = savedFromRemote;
    } else {
      updatedItem = {
        id: bill.id || 'b_' + Date.now(),
        invoiceNo: bill.invoiceNo || 'FC-' + Date.now(),
        partyId: bill.partyId || '',
        partyName: bill.partyName || '',
        date: bill.date || new Date().toISOString().split('T')[0],
        dueDate: bill.dueDate || '',
        items: bill.items || [],
        subtotal: bill.subtotal || 0,
        cgst: bill.cgst || 0,
        sgst: bill.sgst || 0,
        totalTax: bill.totalTax || 0,
        totalAmount: bill.totalAmount || 0,
        paidAmount: bill.paidAmount || 0,
        pendingAmount: bill.pendingAmount || 0,
        status: bill.status || 'Pending',
        notes: bill.notes || '',
        extraCharges: bill.extraCharges || 0,
        createdAt: bill.createdAt || new Date().toISOString(),
      };
    }

    const nextList = isEdit
      ? current.map((b) => (b.id === updatedItem.id || (b as any)._id === updatedItem.id ? updatedItem : b))
      : [updatedItem, ...current];

    setLocal('feni_bills', nextList);
    return updatedItem;
  },

  async deleteBill(id: string): Promise<boolean> {
    await safeFetchJson(`/api/bills/${id}`, { method: 'DELETE' });
    const current = getLocal<Bill[]>('feni_bills', defaultBills);
    setLocal('feni_bills', current.filter((b) => b.id !== id && (b as any)._id !== id));
    return true;
  },

  // PURCHASES
  async getPurchases(): Promise<Purchase[]> {
    const remote = await safeFetchJson<Purchase[]>('/api/purchases');
    if (remote && Array.isArray(remote)) {
      setLocal('feni_purchases', remote);
      return remote;
    }
    return getLocal<Purchase[]>('feni_purchases', defaultPurchases);
  },

  async savePurchase(purchase: Partial<Purchase>): Promise<Purchase> {
    const isEdit = !!purchase.id;
    const method = isEdit ? 'PUT' : 'POST';
    const endpoint = isEdit ? `/api/purchases/${purchase.id}` : '/api/purchases';

    const remote = await safeFetchJson<any>(endpoint, {
      method,
      body: JSON.stringify(purchase),
    });

    const current = getLocal<Purchase[]>('feni_purchases', defaultPurchases);
    let updatedItem: Purchase;

    const savedFromRemote = remote?.purchase || (remote?.id ? remote : null);

    if (savedFromRemote && savedFromRemote.id) {
      updatedItem = savedFromRemote;
    } else {
      updatedItem = {
        id: purchase.id || 'pur_' + Date.now(),
        purchaseNo: purchase.purchaseNo || 'PUR-' + Date.now(),
        supplierId: purchase.supplierId || '',
        supplierName: purchase.supplierName || '',
        supplierGstin: purchase.supplierGstin || '',
        date: purchase.date || new Date().toISOString().split('T')[0],
        items: purchase.items || [],
        subtotal: purchase.subtotal || 0,
        cgst: purchase.cgst || 0,
        sgst: purchase.sgst || 0,
        totalTax: purchase.totalTax || 0,
        totalAmount: purchase.totalAmount || 0,
        paidAmount: purchase.paidAmount || 0,
        pendingAmount: purchase.pendingAmount || 0,
        status: purchase.status || 'Pending',
        paymentMethod: purchase.paymentMethod || 'Cash',
        notes: purchase.notes || '',
        createdAt: purchase.createdAt || new Date().toISOString(),
      };
    }

    const nextList = isEdit
      ? current.map((p) => (p.id === updatedItem.id || (p as any)._id === updatedItem.id ? updatedItem : p))
      : [updatedItem, ...current];

    setLocal('feni_purchases', nextList);
    return updatedItem;
  },

  async deletePurchase(id: string): Promise<boolean> {
    await safeFetchJson(`/api/purchases/${id}`, { method: 'DELETE' });
    const current = getLocal<Purchase[]>('feni_purchases', defaultPurchases);
    setLocal('feni_purchases', current.filter((p) => p.id !== id && (p as any)._id !== id));
    return true;
  },

  // WORKERS
  async getWorkers(): Promise<Worker[]> {
    const remote = await safeFetchJson<Worker[]>('/api/workers');
    const local = getLocal<Worker[]>('feni_workers', defaultWorkers);
    if (remote && Array.isArray(remote)) {
      const remoteIds = new Set(remote.map((w) => w.id || (w as any)._id));
      const localOnly = local.filter((w) => w.id && !remoteIds.has(w.id));
      const merged = [...remote, ...localOnly];
      setLocal('feni_workers', merged);
      return merged;
    }
    return local;
  },

  async saveWorker(worker: Partial<Worker>): Promise<Worker> {
    const isEdit = !!worker.id;
    const method = isEdit ? 'PUT' : 'POST';
    const endpoint = isEdit ? `/api/workers/${worker.id}` : '/api/workers';

    const monthlySalary = Number(worker.monthlySalary || 0);
    const bonus = Number(worker.bonus || 0);
    const advances = Array.isArray(worker.advances) ? [...worker.advances] : [];
    let advancePaid = Number(worker.advancePaid || 0);
    if (advances.length > 0) {
      advancePaid = advances.reduce((s, a) => s + Number(a.amount || 0), 0);
    }
    const remainingSalary = Number((monthlySalary + bonus - advancePaid).toFixed(2));
    let status: 'Paid' | 'Pending' | 'Partial' | 'Active' = 'Pending';
    if (remainingSalary <= 0) status = 'Paid';
    else if (advancePaid > 0) status = 'Partial';

    const payloadToSave = {
      ...worker,
      monthlySalary,
      advancePaid,
      advances,
      bonus,
      remainingSalary,
      status: (worker.status as any) || status,
    };

    const remote = await safeFetchJson<any>(endpoint, {
      method,
      body: JSON.stringify(payloadToSave),
    });

    const current = getLocal<Worker[]>('feni_workers', defaultWorkers);
    let updatedItem: Worker;

    const savedFromRemote = remote?.worker || (remote?.id ? remote : null);

    if (savedFromRemote && savedFromRemote.id) {
      updatedItem = savedFromRemote;
    } else {
      updatedItem = {
        id: worker.id || 'w_' + Date.now(),
        name: worker.name || '',
        gujaratiName: worker.gujaratiName || '',
        role: worker.role || 'Embroidery Machine Operator',
        mobile: worker.mobile || '',
        joiningDate: worker.joiningDate || new Date().toISOString().split('T')[0],
        monthlySalary,
        advancePaid,
        advances,
        bonus,
        remainingSalary,
        status: (worker.status as any) || status,
      };
    }

    const nextList = isEdit
      ? current.map((w) => (w.id === updatedItem.id ? updatedItem : w))
      : [updatedItem, ...current];

    setLocal('feni_workers', nextList);
    return updatedItem;
  },

  async deleteWorker(id: string): Promise<boolean> {
    await safeFetchJson(`/api/workers/${id}`, { method: 'DELETE' });
    const current = getLocal<Worker[]>('feni_workers', defaultWorkers);
    setLocal('feni_workers', current.filter((w) => w.id !== id));
    return true;
  },

  // PAYMENTS
  async getPayments(): Promise<Payment[]> {
    const remote = await safeFetchJson<Payment[]>('/api/payments');
    if (remote && Array.isArray(remote)) {
      setLocal('feni_payments', remote);
      return remote;
    }
    return getLocal<Payment[]>('feni_payments', defaultPayments);
  },

  async savePayment(payment: Partial<Payment>): Promise<Payment> {
    const isEdit = !!payment.id;
    const method = isEdit ? 'PUT' : 'POST';
    const endpoint = isEdit ? `/api/payments/${payment.id}` : '/api/payments';

    const remote = await safeFetchJson<any>(endpoint, {
      method,
      body: JSON.stringify(payment),
    });

    const current = getLocal<Payment[]>('feni_payments', defaultPayments);
    let updatedItem: Payment;

    const savedFromRemote = remote?.payment || (remote?.id ? remote : null);

    if (savedFromRemote && savedFromRemote.id) {
      updatedItem = savedFromRemote;
    } else {
      updatedItem = {
        id: payment.id || 'pay_' + Date.now(),
        date: payment.date || new Date().toISOString().split('T')[0],
        partyId: payment.partyId || '',
        partyName: payment.partyName || '',
        type: payment.type || 'Received',
        refInvoiceNo: payment.refInvoiceNo || '',
        amount: Number(payment.amount || 0),
        paymentMethod: payment.paymentMethod || 'UPI',
        notes: payment.notes || '',
        createdAt: payment.createdAt || new Date().toISOString(),
      };
    }

    const nextList = isEdit
      ? current.map((p) => (p.id === updatedItem.id ? updatedItem : p))
      : [updatedItem, ...current];

    setLocal('feni_payments', nextList);
    return updatedItem;
  },

  async deletePayment(id: string): Promise<boolean> {
    await safeFetchJson(`/api/payments/${id}`, { method: 'DELETE' });
    const current = getLocal<Payment[]>('feni_payments', defaultPayments);
    setLocal('feni_payments', current.filter((p) => p.id !== id));
    return true;
  },

  // DASHBOARD STATS
  async getDashboardStats() {
    const remote = await safeFetchJson<any>('/api/dashboard/stats');
    if (remote && remote.totalSales !== undefined) {
      return remote;
    }

    const bills = getLocal<Bill[]>('feni_bills', defaultBills);
    const purchases = getLocal<Purchase[]>('feni_purchases', defaultPurchases);
    const workers = getLocal<Worker[]>('feni_workers', defaultWorkers);

    const totalSales = bills.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
    const totalReceived = bills.reduce((acc, b) => acc + (Number(b.paidAmount) || 0), 0);
    const totalPurchase = purchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
    const totalWorkerSalary = workers.reduce((acc, w) => acc + (w.monthlySalary || 0), 0);
    const pendingPayment = bills.reduce((acc, b) => acc + getBillPendingAmount(b), 0);
    const monthlyIncome = totalSales - totalPurchase - totalWorkerSalary;

    return {
      totalSales,
      totalReceived,
      totalPurchase,
      totalWorkerSalary,
      pendingPayment,
      monthlyIncome,
      chartData: [
        { month: 'Jan', sales: 120000, purchase: 45000, salary: 35000 },
        { month: 'Feb', sales: 145000, purchase: 52000, salary: 38000 },
        { month: 'Mar', sales: 160000, purchase: 60000, salary: 40000 },
        { month: 'Apr', sales: 135000, purchase: 48000, salary: 42000 },
        { month: 'May', sales: 180000, purchase: 70000, salary: 45000 },
        { month: 'Jun', sales: 195000, purchase: 75000, salary: 48000 },
        { month: 'Jul', sales: totalSales || 118650, purchase: totalPurchase || 38850, salary: totalWorkerSalary || 52000 },
      ],
      recentActivities: bills.slice(0, 5).map((b) => ({
        id: b.id,
        type: 'Bill Generated',
        ref: b.invoiceNo,
        party: b.partyName,
        amount: b.totalAmount,
        date: b.date,
        status: b.status,
      })),
      isMongoConnected: false,
    };
  },

  async checkDbStatus() {
    const remote = await safeFetchJson<{ connected: boolean }>('/api/db/status');
    return remote ? !!remote.connected : false;
  },
};
