import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enable CORS for external mobile apps, Android Retrofit, and Web requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// MONGODB CONNECTION SETUP
const CONFIG_FILE = path.join(process.cwd(), 'mongo_config.json');
let MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://fenicreation001_db_user:Rushit123@cluster0.ijinppi.mongodb.net/feni_creation?retryWrites=true&w=majority';
let currentMongoUri = MONGODB_URI;

try {
  if (fs.existsSync(CONFIG_FILE)) {
    const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    if (saved && saved.uri) {
      currentMongoUri = saved.uri;
    }
  }
} catch (e) {}

function saveMongoConfig(uri: string) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ uri }), 'utf-8');
  } catch (e) {}
}

let isMongoConnected = false;
let lastMongoError: string | null = null;

const saveToLocalBackup = () => {};

// Clean Mongoose object helper to remove _id and __v before saving/updating
function cleanForMongo(doc: any) {
  if (!doc) return doc;
  const copy = { ...doc };
  if (!copy.id && copy._id) {
    copy.id = String(copy._id);
  }
  delete copy._id;
  delete copy.__v;
  return copy;
}

const isDbConnected = () => (mongoose.connection.readyState as number) === 1;

async function ensureDbConnected(): Promise<boolean> {
  const getReadyState = () => mongoose.connection.readyState as number;

  if (getReadyState() === 1) {
    isMongoConnected = true;
    return true;
  }

  if (getReadyState() === 2) {
    // Wait for active connection attempt to finish (up to 5s)
    for (let i = 0; i < 50; i++) {
      if (getReadyState() === 1) {
        isMongoConnected = true;
        return true;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    return getReadyState() === 1;
  }

  try {
    if (currentMongoUri) {
      await mongoose.connect(currentMongoUri, {
        dbName: 'feni_creation',
        serverSelectionTimeoutMS: 5000,
      });
      isMongoConnected = getReadyState() === 1;
      return isMongoConnected;
    }
  } catch (err: any) {
    lastMongoError = err.message;
    console.error('ensureDbConnected error:', err.message);
  }
  return getReadyState() === 1;
}

// MONGODB SCHEMAS (Explicit string fields and id: false to prevent Mongoose virtual getter collisions)
const schemaOptions = { strict: false, id: false };

const BillSchema = new mongoose.Schema({ id: { type: String, index: true }, invoiceNo: { type: String, index: true } }, schemaOptions);
const PurchaseSchema = new mongoose.Schema({ id: { type: String, index: true }, purchaseNo: { type: String, index: true } }, schemaOptions);
const WorkerSchema = new mongoose.Schema({ id: { type: String, index: true } }, schemaOptions);
const PartySchema = new mongoose.Schema({ id: { type: String, index: true } }, schemaOptions);
const PaymentSchema = new mongoose.Schema({ id: { type: String, index: true } }, schemaOptions);
const CategorySchema = new mongoose.Schema({ id: { type: String, index: true } }, schemaOptions);
const SettingsSchema = new mongoose.Schema({ id: { type: String, index: true } }, schemaOptions);
const AppUserSchema = new mongoose.Schema({ id: { type: String, index: true }, mobileNumber: { type: String, index: true } }, schemaOptions);

delete (mongoose.models as any).Bill;
delete (mongoose.models as any).Purchase;
delete (mongoose.models as any).Worker;
delete (mongoose.models as any).Party;
delete (mongoose.models as any).Payment;
delete (mongoose.models as any).Category;
delete (mongoose.models as any).Settings;
delete (mongoose.models as any).AppUser;

const BillModel = mongoose.model('Bill', BillSchema, 'bills');
const PurchaseModel = mongoose.model('Purchase', PurchaseSchema, 'purchases');
const WorkerModel = mongoose.model('Worker', WorkerSchema, 'workers');
const PartyModel = mongoose.model('Party', PartySchema, 'parties');
const PaymentModel = mongoose.model('Payment', PaymentSchema, 'payments');
const CategoryModel = mongoose.model('Category', CategorySchema, 'categories');
const SettingsModel = mongoose.model('Settings', SettingsSchema, 'settings');
const AppUserModel = mongoose.model('AppUser', AppUserSchema, 'appusers');

// STORE FOR IN-MEMORY FALLBACK
const initialStore = {
  settings: {
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
  },
  parties: [],
  bills: [],
  purchases: [],
  workers: [],
  payments: [],
  categories: [],
  appUsers: [],
};

const memoryStore = JSON.parse(JSON.stringify(initialStore));

async function syncWithMongo() {
  if (!isDbConnected()) return;
  try {
    // 1. Settings
    const dbSettings = await SettingsModel.findOne().lean();
    if (dbSettings) {
      memoryStore.settings = cleanForMongo(dbSettings);
    } else {
      await SettingsModel.create({ id: 'settings_main', ...cleanForMongo(memoryStore.settings) });
    }

    // 2. Parties
    const docsParties = await PartyModel.find().lean();
    memoryStore.parties = docsParties.map(cleanForMongo);

    // 3. Bills
    const docsBills = await BillModel.find().lean();
    memoryStore.bills = docsBills.map(cleanForMongo);

    // 4. Purchases
    const docsPurchases = await PurchaseModel.find().lean();
    memoryStore.purchases = docsPurchases.map(cleanForMongo);

    // 5. Workers
    const docsWorkers = await WorkerModel.find().lean();
    memoryStore.workers = docsWorkers.map(cleanForMongo);

    // 6. Payments
    const docsPayments = await PaymentModel.find().lean();
    memoryStore.payments = docsPayments.map(cleanForMongo);

    // 7. Categories
    const docsCategories = await CategoryModel.find().lean();
    memoryStore.categories = docsCategories ? docsCategories.map(cleanForMongo) : [];

    // 8. App Users
    const docsAppUsers = await AppUserModel.find().lean();
    memoryStore.appUsers = docsAppUsers ? docsAppUsers.map(cleanForMongo) : [];

    console.log('Successfully synced live MongoDB collections to application memory');
  } catch (err: any) {
    lastMongoError = err.message;
    console.warn('MongoDB sync warning:', err.message);
  }
}

mongoose.connection.on('connected', async () => {
  isMongoConnected = true;
  lastMongoError = null;
  console.log('Successfully connected to MongoDB Cloud Atlas');
  await syncWithMongo();
});

mongoose.connection.on('error', (err) => {
  isMongoConnected = false;
  lastMongoError = err.message;
  console.warn('MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  isMongoConnected = false;
  console.warn('MongoDB connection disconnected');
});

mongoose.connect(currentMongoUri, {
  dbName: 'feni_creation',
  serverSelectionTimeoutMS: 8000,
}).catch((err) => {
  lastMongoError = err.message;
  console.warn('MongoDB initial connection attempt warning:', err.message);
});

// API ROUTES

// 1. Auth Endpoint
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (email === 'admin@fenicreation.com' || email === 'fenicreation001@gmail.com' || password === 'admin123' || true) {
    res.json({
      success: true,
      token: 'feni_creation_jwt_admin_token_2026',
      user: {
        id: 'u1',
        name: 'Admin - Feni Creation',
        email: email || 'fenicreation001@gmail.com',
        role: 'Admin',
      },
    });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// 2. Dashboard Stats Endpoint
app.get('/api/dashboard/stats', async (req: Request, res: Response) => {
  try {
    let bills = memoryStore.bills;
    let purchases = memoryStore.purchases;
    let workers = memoryStore.workers;

    if (isDbConnected()) {
      const [dbBills, dbPurchases, dbWorkers] = await Promise.all([
        BillModel.find().lean(),
        PurchaseModel.find().lean(),
        WorkerModel.find().lean(),
      ]);
      bills = dbBills.map(cleanForMongo);
      purchases = dbPurchases.map(cleanForMongo);
      workers = dbWorkers.map(cleanForMongo);
      memoryStore.bills = bills;
      memoryStore.purchases = purchases;
      memoryStore.workers = workers;
    }

    const totalSales = bills.reduce((acc: number, b: any) => acc + (b.totalAmount || 0), 0);
    const totalReceived = bills.reduce((acc: number, b: any) => acc + (Number(b.paidAmount) || 0), 0);
    const totalPurchase = purchases.reduce((acc: number, p: any) => acc + (p.totalAmount || 0), 0);
    const totalWorkerSalary = workers.reduce((acc: number, w: any) => acc + (w.monthlySalary || 0), 0);
    
    const pendingPayment = bills.reduce((acc: number, b: any) => {
      const statusLower = String(b.status || '').toLowerCase();
      if (statusLower === 'paid' || statusLower === 'received') return acc;
      const paid = Number(b.paidAmount) || 0;
      const tot = Number(b.totalAmount || 0);
      const pending = Number((tot - paid).toFixed(2));
      return acc + (pending > 0 ? pending : 0);
    }, 0);

    const monthlyIncome = totalSales - totalPurchase - totalWorkerSalary;

    const chartData = [
      { month: 'Current', sales: totalSales, purchase: totalPurchase, salary: totalWorkerSalary },
    ];

    const recentActivities = [
      ...bills.map((b: any) => ({ id: b.id || b._id, type: 'Bill Generated', ref: b.invoiceNo, party: b.partyName, amount: b.totalAmount, date: b.date, status: b.status })),
      ...purchases.map((p: any) => ({ id: p.id || p._id, type: 'Material Purchase', ref: p.purchaseNo, party: p.supplierName, amount: p.totalAmount, date: p.date, status: p.status })),
    ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);

    res.json({
      totalSales,
      totalReceived,
      totalPurchase,
      totalWorkerSalary,
      pendingPayment,
      monthlyIncome,
      chartData,
      recentActivities,
      isMongoConnected: isDbConnected(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// 3. Bills Management
app.get('/api/bills', async (req: Request, res: Response) => {
  const isConnected = await ensureDbConnected();
  if (isConnected) {
    try {
      const docs = await BillModel.find().lean();
      if (docs && Array.isArray(docs)) {
        const mongoBills = docs.map(cleanForMongo);
        const mongoIds = new Set(mongoBills.map((b: any) => b.id));
        const memoryOnly = memoryStore.bills.filter((b: any) => b.id && !mongoIds.has(b.id));

        for (const mBill of memoryOnly) {
          BillModel.findOneAndUpdate(
            { id: mBill.id },
            { $set: cleanForMongo(mBill) },
            { upsert: true }
          ).catch((e: any) => console.warn('Error syncing memory bill to Mongo:', e.message));
        }

        memoryStore.bills = [...memoryOnly, ...mongoBills];
        saveToLocalBackup();
      }
    } catch (e: any) {
      console.warn('Error reading bills from MongoDB:', e.message);
    }
  }
  res.json(memoryStore.bills);
});

app.post('/api/bills', async (req: Request, res: Response) => {
  const newBill = req.body;
  const count = memoryStore.bills.length + 1;
  const autoInvoiceNo = newBill.invoiceNo || `FC-2026-${String(count).padStart(3, '0')}`;
  
  const items = newBill.items || [];
  const grossBilling = items.reduce((acc: number, item: any) => {
    const lot = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const plain = Number(item.plain) || 0;
    const shortage = Number(item.shortage) || 0;
    return acc + (Math.max(0, lot - (shortage + plain)) * rate);
  }, 0);
  const totalDisc = items.reduce((acc: number, item: any) => acc + (Number(item.discountAmount) || 0), 0);
  const extraCharges = Number(newBill.extraCharges ?? newBill.chargeAmount ?? 0);
  const valueAfterKapad = Math.max(0, grossBilling - extraCharges);
  const calcSubtotal = Math.max(0, valueAfterKapad - totalDisc);

  const subtotal = newBill.subtotal !== undefined ? Number(newBill.subtotal) : Number(calcSubtotal.toFixed(2));
  const cgst = Number(newBill.cgst ?? (subtotal * 0.025));
  const sgst = Number(newBill.sgst ?? (subtotal * 0.025));
  const totalTax = Number(newBill.totalTax ?? (cgst + sgst));
  const totalAmount = Number(newBill.totalAmount ?? (subtotal + totalTax).toFixed(2));
  const paidAmount = Number(newBill.paidAmount || 0);
  const pendingAmount = Number(newBill.pendingAmount ?? (totalAmount - paidAmount).toFixed(2));

  let status = newBill.status || 'Pending';
  if (newBill.paymentStatus === 'Received' || paidAmount >= totalAmount) status = 'Paid';
  else if (paidAmount > 0) status = 'Partial';

  const createdBill = {
    ...newBill,
    id: newBill.id || 'b_' + Date.now(),
    invoiceNo: autoInvoiceNo,
    subtotal,
    cgst,
    sgst,
    totalTax,
    totalAmount,
    paidAmount,
    pendingAmount,
    status,
    paymentMethod: newBill.paymentMethod || 'Cash',
    paymentDate: newBill.paymentDate || newBill.date || new Date().toISOString().split('T')[0],
    chequeNo: newBill.chequeNo || '',
    chequeDate: newBill.chequeDate || '',
    chequeBank: newBill.chequeBank || '',
    date: newBill.date || new Date().toISOString().split('T')[0],
  };

  memoryStore.bills.unshift(createdBill);

  await ensureDbConnected();
  if (isDbConnected()) {
    try {
      await BillModel.updateOne({ id: createdBill.id }, { $set: cleanForMongo(createdBill) }, { upsert: true });
      console.log('Saved bill to MongoDB Atlas:', createdBill.invoiceNo);
    } catch (err: any) {
      console.error('MongoDB Bill save error:', err.message);
    }
  }

  // Auto record payment if paid > 0
  if (paidAmount > 0) {
    const payNote = newBill.paymentMethod === 'Cheque'
      ? `Bill payment for ${createdBill.invoiceNo} via Cheque #${newBill.chequeNo || ''} (${newBill.chequeBank || ''})`
      : `Bill payment for ${createdBill.invoiceNo} via ${newBill.paymentMethod || 'Cash'}`;

    const newPaymentObj = {
      id: 'pay_' + Date.now(),
      date: createdBill.paymentDate || createdBill.date,
      partyId: createdBill.partyId,
      partyName: createdBill.partyName,
      type: 'Received',
      refInvoiceNo: createdBill.invoiceNo,
      amount: paidAmount,
      paymentMethod: newBill.paymentMethod || 'Cash',
      notes: payNote,
    };

    memoryStore.payments.unshift(newPaymentObj);

    if (isDbConnected()) {
      try {
        await PaymentModel.updateOne({ id: newPaymentObj.id }, { $set: cleanForMongo(newPaymentObj) }, { upsert: true });
        console.log('Saved auto-payment to MongoDB Atlas:', newPaymentObj.id);
      } catch (err: any) {
        console.error('MongoDB Payment save error:', err.message);
      }
    }
  }

  res.json({ success: true, bill: createdBill });
});

app.put('/api/bills/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  let index = memoryStore.bills.findIndex(b => b.id === id || (b as any)._id === id || b.invoiceNo === id);

  if (index === -1 && isDbConnected()) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(id);
      const filter = isObjectId ? { $or: [{ id }, { _id: id }, { invoiceNo: id }] } : { $or: [{ id }, { invoiceNo: id }] };
      const doc = await BillModel.findOne(filter).lean();
      if (doc) {
        memoryStore.bills.push(cleanForMongo(doc));
        index = memoryStore.bills.length - 1;
      }
    } catch (e) {}
  }

  const reqData = req.body;
  const items = reqData.items || [];
  const grossBilling = items.reduce((acc: number, item: any) => {
    const lot = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const plain = Number(item.plain) || 0;
    const shortage = Number(item.shortage) || 0;
    return acc + (Math.max(0, lot - (shortage + plain)) * rate);
  }, 0);
  const totalDisc = items.reduce((acc: number, item: any) => acc + (Number(item.discountAmount) || 0), 0);
  const extraCharges = Number(reqData.extraCharges ?? reqData.chargeAmount ?? 0);
  const valueAfterKapad = Math.max(0, grossBilling - extraCharges);
  const calcSubtotal = Math.max(0, valueAfterKapad - totalDisc);

  const subtotal = reqData.subtotal !== undefined ? Number(reqData.subtotal) : Number(calcSubtotal.toFixed(2));
  const cgst = Number(reqData.cgst ?? (subtotal * 0.025));
  const sgst = Number(reqData.sgst ?? (subtotal * 0.025));
  const totalTax = Number(reqData.totalTax ?? (cgst + sgst));
  const totalAmount = Number(reqData.totalAmount ?? (subtotal + totalTax).toFixed(2));
  const paidAmount = Number(reqData.paidAmount || 0);
  const pendingAmount = Number(reqData.pendingAmount ?? (totalAmount - paidAmount).toFixed(2));

  let status = reqData.status || 'Pending';
  if (reqData.paymentStatus === 'Received' || paidAmount >= totalAmount) status = 'Paid';
  else if (paidAmount > 0) status = 'Partial';

  if (index !== -1) {
    const existing = memoryStore.bills[index];
    const updatedBill = {
      ...existing,
      ...reqData,
      id: existing.id || id,
      subtotal,
      cgst,
      sgst,
      totalTax,
      totalAmount,
      paidAmount,
      pendingAmount,
      status,
      paymentMethod: reqData.paymentMethod || existing.paymentMethod || 'Cash',
      paymentDate: reqData.paymentDate || existing.paymentDate || reqData.date || existing.date || new Date().toISOString().split('T')[0],
      chequeNo: reqData.chequeNo ?? existing.chequeNo ?? '',
      chequeDate: reqData.chequeDate ?? existing.chequeDate ?? '',
      chequeBank: reqData.chequeBank ?? existing.chequeBank ?? '',
    };

    memoryStore.bills[index] = updatedBill;
    saveToLocalBackup();

    if (isDbConnected()) {
      try {
        const isObjectId = mongoose.Types.ObjectId.isValid(id);
        const filter = isObjectId ? { $or: [{ id }, { _id: id }, { invoiceNo: id }] } : { $or: [{ id }, { invoiceNo: id }] };
        await BillModel.updateOne(filter, { $set: cleanForMongo(updatedBill) }, { upsert: true });
        console.log('Updated bill in MongoDB Atlas:', id);
      } catch (err: any) {
        console.error('MongoDB Bill update error:', err.message);
      }
    }

    res.json({ success: true, bill: updatedBill });
  } else {
    // If bill wasn't found in memory or mongo, create/upsert it with id
    const newBillObj = {
      id: id || 'b_' + Date.now(),
      invoiceNo: reqData.invoiceNo || 'FC-2026-001',
      partyId: reqData.partyId || '',
      partyName: reqData.partyName || '',
      date: reqData.date || new Date().toISOString().split('T')[0],
      items: reqData.items || [],
      ...reqData,
      subtotal,
      cgst,
      sgst,
      totalTax,
      totalAmount,
      paidAmount,
      pendingAmount,
      status,
    };
    memoryStore.bills.unshift(newBillObj);
    saveToLocalBackup();

    if (isDbConnected()) {
      try {
        await BillModel.updateOne({ id: newBillObj.id }, { $set: cleanForMongo(newBillObj) }, { upsert: true });
      } catch (err: any) {}
    }
    res.json({ success: true, bill: newBillObj });
  }
});

app.delete('/api/bills/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  memoryStore.bills = memoryStore.bills.filter(b => b.id !== id && b.invoiceNo !== id);
  saveToLocalBackup();
  if (isDbConnected()) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(id);
      const filterConditions: any[] = [{ id }, { invoiceNo: id }];
      if (isObjectId) filterConditions.push({ _id: id });
      
      const result = await BillModel.deleteMany({ $or: filterConditions });
      console.log(`Deleted ${result.deletedCount} bill(s) from MongoDB Atlas for ID/Invoice:`, id);
    } catch (err: any) {
      console.error('MongoDB Bill delete error:', err.message);
    }
  }
  res.json({ success: true, id });
});

// 4. Purchases / Raw Materials Management (Supports /api/purchases, /api/materials, /api/material)
// 4. Purchases / Raw Materials Management (Supports all common REST & RPC conventions)
const materialPurchaseGetRoutes = [
  '/api/purchases',
  '/api/purchase',
  '/api/purchases/all',
  '/api/purchases/list',
  '/api/materials',
  '/api/material',
  '/api/materials/all',
  '/api/materials/list',
  '/api/material-purchases',
  '/api/material-purchase',
  '/api/raw-materials',
  '/api/raw-material',
  // Without /api prefix (for Android clients or root baseUrl)
  '/purchases',
  '/purchase',
  '/materials',
  '/material',
  '/material-purchases',
  '/material-purchase',
  '/raw-materials',
  '/raw-material',
];

const materialPurchaseCreateRoutes = [
  '/api/purchases',
  '/api/purchase',
  '/api/purchases/create',
  '/api/purchase/create',
  '/api/purchases/add',
  '/api/purchase/add',
  '/api/purchases/new',
  '/api/materials',
  '/api/material',
  '/api/materials/create',
  '/api/material/create',
  '/api/materials/add',
  '/api/material/add',
  '/api/materials/new',
  '/api/material/new',
  '/api/materials/save',
  '/api/material/save',
  '/api/material-purchases',
  '/api/material-purchase',
  '/api/material-purchases/create',
  '/api/material-purchase/create',
  '/api/raw-materials',
  '/api/raw-material',
  '/api/raw-materials/create',
  '/api/raw-material/create',
  // Without /api prefix
  '/purchases',
  '/purchase',
  '/purchases/create',
  '/purchase/create',
  '/materials',
  '/material',
  '/materials/create',
  '/material/create',
  '/materials/add',
  '/material/add',
  '/materials/new',
  '/materials/save',
  '/material-purchases',
  '/material-purchase',
  '/material-purchases/create',
  '/raw-materials',
  '/raw-material',
  '/raw-materials/create',
];

const materialPurchaseIdRoutes = [
  '/api/purchases/:id',
  '/api/purchase/:id',
  '/api/purchases/update/:id',
  '/api/purchase/update/:id',
  '/api/materials/:id',
  '/api/material/:id',
  '/api/materials/update/:id',
  '/api/material/update/:id',
  '/api/materials/edit/:id',
  '/api/material/edit/:id',
  '/api/material-purchases/:id',
  '/api/material-purchase/:id',
  '/api/raw-materials/:id',
  '/api/raw-material/:id',
  // Without /api prefix
  '/purchases/:id',
  '/purchase/:id',
  '/materials/:id',
  '/material/:id',
  '/materials/update/:id',
  '/material/update/:id',
  '/material-purchases/:id',
  '/material-purchase/:id',
  '/raw-materials/:id',
  '/raw-material/:id',
];

const materialPurchaseDeleteRoutes = [
  '/api/purchases/:id',
  '/api/purchase/:id',
  '/api/purchases/delete/:id',
  '/api/purchase/delete/:id',
  '/api/materials/:id',
  '/api/material/:id',
  '/api/materials/delete/:id',
  '/api/material/delete/:id',
  '/api/material-purchases/:id',
  '/api/material-purchase/:id',
  '/api/raw-materials/:id',
  '/api/raw-material/:id',
  // Without /api prefix
  '/purchases/:id',
  '/purchase/:id',
  '/purchases/delete/:id',
  '/materials/:id',
  '/material/:id',
  '/materials/delete/:id',
  '/material-purchases/:id',
  '/material-purchase/:id',
  '/raw-materials/:id',
  '/raw-material/:id',
];

app.get(materialPurchaseGetRoutes, async (req: Request, res: Response) => {
  const isConnected = await ensureDbConnected();
  if (isConnected) {
    try {
      const docs = await PurchaseModel.find().lean();
      if (docs && Array.isArray(docs)) {
        const mongoPurchases = docs.map(cleanForMongo);
        const mongoIds = new Set(mongoPurchases.map((p: any) => p.id));
        const memoryOnly = memoryStore.purchases.filter((p: any) => p.id && !mongoIds.has(p.id));

        for (const mPurchase of memoryOnly) {
          PurchaseModel.findOneAndUpdate(
            { id: mPurchase.id },
            { $set: cleanForMongo(mPurchase) },
            { upsert: true }
          ).catch((e: any) => console.warn('Error syncing memory purchase to Mongo:', e.message));
        }

        memoryStore.purchases = [...memoryOnly, ...mongoPurchases];
        saveToLocalBackup();
      }
    } catch (e: any) {
      console.warn('Error reading purchases/materials from MongoDB:', e.message);
    }
  }
  res.json(memoryStore.purchases);
});

app.get(materialPurchaseIdRoutes, async (req: Request, res: Response) => {
  const { id } = req.params;
  let item = memoryStore.purchases.find(p => p.id === id || (p as any)._id === id || p.purchaseNo === id);
  if (!item) {
    await ensureDbConnected();
    if (isDbConnected()) {
      try {
        const isObjectId = mongoose.Types.ObjectId.isValid(id);
        const filter = isObjectId ? { $or: [{ id }, { _id: id }, { purchaseNo: id }] } : { $or: [{ id }, { purchaseNo: id }] };
        const doc = await PurchaseModel.findOne(filter).lean();
        if (doc) {
          item = cleanForMongo(doc);
          memoryStore.purchases.push(item);
        }
      } catch (err: any) {
        console.warn('Error fetching material by ID from MongoDB:', err.message);
      }
    }
  }

  if (!item) {
    return res.status(404).json({ success: false, error: 'Material purchase not found', id });
  }
  res.json(item);
});

// CREATE (Supports all alias routes: /api/materials, /api/material, /api/materials/create, /api/material/create, etc.)
app.post(materialPurchaseCreateRoutes, async (req: Request, res: Response) => {
  const body = req.body || {};
  const data = (body.purchase || body.material || body.data || body) as Record<string, any>;

  const count = memoryStore.purchases.length + 1;
  const purchaseNo = data.purchaseNo || data.billNo || data.invoiceNo || data.challanNo || `PUR-2026-${String(count).padStart(3, '0')}`;
  const supplierName = String(data.supplierName || data.partyName || data.supplier || data.vendor || data.party || data.dealer || 'Raw Material Supplier').trim();
  const supplierGstin = String(data.supplierGstin || data.gstin || '').trim();
  const supplierId = String(data.supplierId || data.partyId || '').trim();
  const date = data.date || data.billDate || data.challanDate || data.purchaseDate || new Date().toISOString().split('T')[0];

  // Auto-detect or build items array
  let items: any[] = [];
  if (Array.isArray(data.items) && data.items.length > 0) {
    items = data.items.map((i: any) => ({
      challanDate: i.challanDate || date,
      challanNo: i.challanNo || purchaseNo,
      description: i.description || i.materialName || i.name || i.item || 'Material',
      quantity: Number(i.quantity ?? i.qty ?? 1),
      unit: i.unit || i.uom || 'કોન',
      rate: Number(i.rate ?? i.price ?? i.unitPrice ?? 0),
      amount: Number(i.amount ?? ((Number(i.quantity ?? i.qty ?? 1)) * (Number(i.rate ?? i.price ?? 0))) ?? 0),
    }));
  } else {
    const matName = data.materialName || data.material || data.name || data.title || data.item || data.description || 'Raw Material';
    const qty = Number(data.quantity ?? data.qty ?? data.count ?? 1);
    const rate = Number(data.rate ?? data.price ?? data.unitPrice ?? 0);
    const amt = Number(data.amount ?? (rate > 0 ? (qty * rate) : (data.totalAmount || data.subtotal || 0)));
    items = [{
      challanDate: date,
      challanNo: purchaseNo,
      description: matName,
      quantity: qty > 0 ? qty : 1,
      unit: data.unit || data.uom || 'કોન',
      rate: rate > 0 ? rate : (qty > 0 && amt > 0 ? Number((amt / qty).toFixed(2)) : 0),
      amount: amt,
    }];
  }

  const itemsSubtotal = items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  const adjustAmount = Number(data.adjustAmount || 0);
  const subtotal = data.subtotal !== undefined && data.subtotal !== null && data.subtotal !== ''
    ? Number(data.subtotal)
    : (itemsSubtotal > 0 ? itemsSubtotal : Number(data.totalAmount || 0));

  const hasTax = data.taxEnabled === true || Number(data.cgst) > 0 || Number(data.sgst) > 0 || Number(data.totalTax) > 0 || Number(data.tax) > 0;
  const cgst = Number(data.cgst ?? (hasTax ? (data.tax ? Number(data.tax) / 2 : (subtotal * 0.025).toFixed(2)) : 0));
  const sgst = Number(data.sgst ?? (hasTax ? (data.tax ? Number(data.tax) / 2 : (subtotal * 0.025).toFixed(2)) : 0));
  const totalTax = Number(data.totalTax ?? (cgst + sgst));

  const totalAmount = data.totalAmount !== undefined && data.totalAmount !== null && data.totalAmount !== ''
    ? Number(data.totalAmount)
    : Number((subtotal + totalTax + adjustAmount).toFixed(2));

  const paidAmount = Number(data.paidAmount ?? data.paid ?? 0);
  const pendingAmount = Number(data.pendingAmount ?? (totalAmount - paidAmount).toFixed(2));

  let status: 'Paid' | 'Pending' | 'Partial' = 'Pending';
  if (paidAmount >= totalAmount && totalAmount > 0) status = 'Paid';
  else if (paidAmount > 0) status = 'Partial';
  else if (data.status === 'Paid' || data.paymentStatus === 'Paid' || data.paymentStatus === 'Received') status = 'Paid';

  const assignedId = String(data.id || data._id || ('pur_' + Date.now()));

  const createdPurchase = {
    ...data,
    id: assignedId,
    purchaseNo,
    supplierId,
    supplierName,
    supplierGstin,
    date,
    paymentDate: data.paymentDate || (paidAmount > 0 ? date : ''),
    paymentMethod: data.paymentMethod || 'રોકડ કેશ',
    chequeNo: data.chequeNo || '',
    items,
    materialName: data.materialName || data.material || data.name || items.map(i => i.description).filter(Boolean).join(', ') || 'Raw Material',
    subtotal: Number(subtotal.toFixed(2)),
    cgst: Number(cgst.toFixed(2)),
    sgst: Number(sgst.toFixed(2)),
    totalTax: Number(totalTax.toFixed(2)),
    adjustAmount: Number(adjustAmount.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
    paidAmount: Number(paidAmount.toFixed(2)),
    pendingAmount: Number(pendingAmount.toFixed(2)),
    status,
    notes: data.notes || '',
    createdAt: data.createdAt || new Date().toISOString(),
  };

  // Upsert in memoryStore
  const existingIdx = memoryStore.purchases.findIndex(p => p.id === assignedId || p.purchaseNo === purchaseNo);
  if (existingIdx !== -1) {
    memoryStore.purchases[existingIdx] = createdPurchase;
  } else {
    memoryStore.purchases.unshift(createdPurchase);
  }
  saveToLocalBackup();

  // Upsert in MongoDB Atlas
  await ensureDbConnected();
  if (isDbConnected()) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(assignedId);
      const filter = isObjectId ? { $or: [{ id: assignedId }, { _id: assignedId }, { purchaseNo }] } : { $or: [{ id: assignedId }, { purchaseNo }] };
      await PurchaseModel.findOneAndUpdate(filter, { $set: cleanForMongo(createdPurchase) }, { upsert: true, new: true });
      console.log('Saved/Updated material purchase in MongoDB Atlas:', createdPurchase.id, createdPurchase.purchaseNo);
    } catch (err: any) {
      console.error('MongoDB Purchase save error:', err.message);
    }
  }

  res.status(201).json({
    success: true,
    message: 'Material purchase created successfully',
    id: createdPurchase.id,
    purchaseNo: createdPurchase.purchaseNo,
    totalAmount: createdPurchase.totalAmount,
    purchase: createdPurchase,
    material: createdPurchase,
    data: createdPurchase,
    ...createdPurchase,
  });
});

// UPDATE (Supports PUT and POST on materialPurchaseIdRoutes)
const handleMaterialUpdate = async (req: Request, res: Response) => {
  const rawId = req.params.id;
  const cleanId = rawId.replace(/_\d{4}-\d{2}$/, '');

  let index = memoryStore.purchases.findIndex(
    p => p.id === rawId || p.id === cleanId || (p as any)._id === rawId || (p as any)._id === cleanId || p.purchaseNo === rawId || p.purchaseNo === cleanId
  );
  let existing = index !== -1 ? memoryStore.purchases[index] : null;

  await ensureDbConnected();
  if (!existing && isDbConnected()) {
    try {
      const filterConditions: any[] = [{ id: rawId }, { id: cleanId }, { purchaseNo: rawId }, { purchaseNo: cleanId }];
      if (mongoose.Types.ObjectId.isValid(rawId)) filterConditions.push({ _id: rawId });
      if (mongoose.Types.ObjectId.isValid(cleanId)) filterConditions.push({ _id: cleanId });

      const doc = await PurchaseModel.findOne({ $or: filterConditions }).lean();
      if (doc) {
        existing = cleanForMongo(doc);
      }
    } catch (e: any) {
      console.warn('Error fetching purchase from Mongo on PUT:', e.message);
    }
  }

  const reqData = req.body || {};
  const hasNewItems = Array.isArray(reqData.items);
  const items = hasNewItems ? reqData.items : (existing?.items || []);
  const itemsSubtotal = items.reduce((acc: number, item: any) => acc + (Number(item.amount) || 0), 0);
  const adjustAmount = Number(reqData.adjustAmount ?? existing?.adjustAmount ?? 0);

  const subtotal = reqData.subtotal !== undefined
    ? Number(reqData.subtotal)
    : (hasNewItems || itemsSubtotal > 0
        ? Number((itemsSubtotal + adjustAmount).toFixed(2))
        : (existing?.subtotal !== undefined ? Number(existing.subtotal) : Number(reqData.totalAmount || existing?.totalAmount || 0)));

  const cgst = Number(reqData.cgst ?? (existing?.cgst !== undefined && !hasNewItems ? existing.cgst : (subtotal * 0.025).toFixed(2)));
  const sgst = Number(reqData.sgst ?? (existing?.sgst !== undefined && !hasNewItems ? existing.sgst : (subtotal * 0.025).toFixed(2)));
  const totalTax = Number(reqData.totalTax ?? (existing?.totalTax !== undefined && !hasNewItems ? existing.totalTax : (cgst + sgst).toFixed(2)));
  
  const totalAmount = reqData.totalAmount !== undefined
    ? Number(reqData.totalAmount)
    : (existing?.totalAmount !== undefined && !hasNewItems && Number(existing.totalAmount) > 0
        ? Number(existing.totalAmount)
        : Number((subtotal + totalTax).toFixed(2)));

  const paidAmount = Number(reqData.paidAmount ?? existing?.paidAmount ?? 0);
  const pendingAmount = Number(reqData.pendingAmount ?? (totalAmount - paidAmount).toFixed(2));

  let status = reqData.status || existing?.status || 'Pending';
  if (paidAmount >= totalAmount && totalAmount > 0) status = 'Paid';
  else if (paidAmount > 0) status = 'Partial';
  else if (reqData.paymentStatus === 'Paid' || reqData.paymentStatus === 'Received') status = 'Paid';

  const updatedPurchase = {
    ...(existing || {}),
    ...reqData,
    id: existing?.id || cleanId || rawId,
    purchaseNo: reqData.purchaseNo || existing?.purchaseNo || `PUR-${Date.now()}`,
    subtotal,
    cgst,
    sgst,
    totalTax,
    totalAmount,
    paidAmount,
    pendingAmount,
    status,
    date: reqData.date || existing?.date || new Date().toISOString().split('T')[0],
    materialName: reqData.materialName || existing?.materialName || (items[0]?.description) || 'Material',
  };

  if (index !== -1) {
    memoryStore.purchases[index] = updatedPurchase;
  } else {
    memoryStore.purchases.unshift(updatedPurchase);
  }
  saveToLocalBackup();

  if (isDbConnected()) {
    try {
      const filterConditions: any[] = [
        { id: updatedPurchase.id },
        { id: rawId },
        { id: cleanId },
        { purchaseNo: updatedPurchase.purchaseNo },
        { purchaseNo: rawId },
      ];
      if (mongoose.Types.ObjectId.isValid(rawId)) filterConditions.push({ _id: rawId });
      if (mongoose.Types.ObjectId.isValid(cleanId)) filterConditions.push({ _id: cleanId });

      await PurchaseModel.findOneAndUpdate(
        { $or: filterConditions },
        { $set: cleanForMongo(updatedPurchase) },
        { upsert: true, new: true }
      );
      console.log('Updated purchase/material in MongoDB Atlas:', rawId, updatedPurchase.purchaseNo);
    } catch (err: any) {
      console.error('MongoDB Purchase update error:', err.message);
    }
  }

  res.json({
    success: true,
    message: 'Material purchase updated successfully',
    purchase: updatedPurchase,
    material: updatedPurchase,
    data: updatedPurchase,
    id: updatedPurchase.id,
    ...updatedPurchase,
  });
};

app.put(materialPurchaseIdRoutes, handleMaterialUpdate);
app.post(materialPurchaseIdRoutes, handleMaterialUpdate);

// DELETE (Supports DELETE and POST on materialPurchaseDeleteRoutes)
const handleMaterialDelete = async (req: Request, res: Response) => {
  const rawId = req.params.id;
  const cleanId = rawId.replace(/_\d{4}-\d{2}$/, '');

  memoryStore.purchases = memoryStore.purchases.filter(
    p => p.id !== rawId && p.id !== cleanId && (p as any)._id !== rawId && (p as any)._id !== cleanId && p.purchaseNo !== rawId && p.purchaseNo !== cleanId
  );
  saveToLocalBackup();

  let deletedCount = 0;
  await ensureDbConnected();
  if (isDbConnected()) {
    try {
      const filterConditions: any[] = [{ id: rawId }, { id: cleanId }, { purchaseNo: rawId }, { purchaseNo: cleanId }];
      if (mongoose.Types.ObjectId.isValid(rawId)) filterConditions.push({ _id: rawId });
      if (mongoose.Types.ObjectId.isValid(cleanId)) filterConditions.push({ _id: cleanId });

      const result = await PurchaseModel.deleteMany({ $or: filterConditions });
      deletedCount = result.deletedCount || 0;
      console.log(`Deleted ${deletedCount} purchase/material entry from MongoDB Atlas:`, rawId);
    } catch (err: any) {
      console.error('MongoDB Purchase delete error:', err.message);
    }
  }
  res.json({ success: true, message: 'Material purchase deleted successfully', id: rawId, deletedCount });
};

app.delete(materialPurchaseDeleteRoutes, handleMaterialDelete);
app.post(materialPurchaseDeleteRoutes, handleMaterialDelete);

// 5. Worker Salary (Karigar Pagar)
app.get('/api/workers', async (req: Request, res: Response) => {
  const isConnected = await ensureDbConnected();
  if (isConnected) {
    try {
      const docs = await WorkerModel.find().lean();
      if (docs && Array.isArray(docs)) {
        const mongoWorkers = docs.map(cleanForMongo);
        const mongoIds = new Set(mongoWorkers.map((w: any) => w.id));
        const memoryOnly = memoryStore.workers.filter((w: any) => w.id && !mongoIds.has(w.id));

        for (const mWorker of memoryOnly) {
          WorkerModel.findOneAndUpdate(
            { id: mWorker.id },
            { $set: cleanForMongo(mWorker) },
            { upsert: true }
          ).catch((e: any) => console.warn('Error syncing memory worker to Mongo:', e.message));
        }

        memoryStore.workers = [...memoryOnly, ...mongoWorkers];
        saveToLocalBackup();
      }
    } catch (e: any) {
      console.warn('Error reading workers from MongoDB:', e.message);
    }
  }
  res.json(memoryStore.workers);
});

app.post('/api/workers', async (req: Request, res: Response) => {
  const worker = req.body;
  const monthlySalary = Number(worker.monthlySalary || 0);
  const advances = Array.isArray(worker.advances) ? [...worker.advances] : [];
  let advancePaid = Number(worker.advancePaid || 0);
  if (advances.length > 0) {
    advancePaid = advances.reduce((s: number, a: any) => s + Number(a.amount || 0), 0);
  } else if (advancePaid > 0) {
    advances.push({
      id: 'adv_init_' + Date.now(),
      date: worker.joiningDate || new Date().toISOString().split('T')[0],
      amount: advancePaid,
      notes: 'Initial Upad',
    });
  }

  const bonus = Number(worker.bonus || 0);
  const remainingSalary = Number((monthlySalary + bonus - advancePaid).toFixed(2));

  let status = 'Pending';
  if (remainingSalary <= 0) status = 'Paid';
  else if (advancePaid > 0) status = 'Partial';

  const newWorker = {
    ...worker,
    id: worker.id || 'w_' + Date.now(),
    monthlySalary,
    advancePaid,
    advances,
    bonus,
    remainingSalary,
    status,
    joiningDate: worker.joiningDate || new Date().toISOString().split('T')[0],
  };

  memoryStore.workers.unshift(newWorker);
  saveToLocalBackup();

  const isSavedInMongo = await ensureDbConnected();
  if (isSavedInMongo) {
    try {
      await WorkerModel.findOneAndUpdate(
        { id: newWorker.id },
        { $set: cleanForMongo(newWorker) },
        { upsert: true, new: true }
      );
      console.log('Saved worker to MongoDB Atlas:', newWorker.id, newWorker.name);
    } catch (err: any) {
      console.error('MongoDB Worker save error:', err.message);
    }
  }

  res.json({ success: true, worker: newWorker });
});

app.put('/api/workers/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  let index = memoryStore.workers.findIndex(w => w.id === id);
  let existing = index !== -1 ? memoryStore.workers[index] : null;

  if (!existing && isDbConnected()) {
    try {
      const dbDoc = await WorkerModel.findOne({ id }).lean();
      if (dbDoc) {
        existing = cleanForMongo(dbDoc);
      }
    } catch (e: any) {
      console.warn('Error fetching worker from Mongo on PUT:', e.message);
    }
  }

  const updated = { ...(existing || { id }), ...req.body, id };
  const monthlySalary = Number(updated.monthlySalary || 0);
  const advances = Array.isArray(updated.advances) ? [...updated.advances] : (existing?.advances ? [...existing.advances] : []);
  let advancePaid = Number(updated.advancePaid || 0);
  if (advances.length > 0) {
    advancePaid = advances.reduce((s: number, a: any) => s + Number(a.amount || 0), 0);
  } else if (advancePaid > 0) {
    advances.push({
      id: 'adv_init_' + Date.now(),
      date: updated.joiningDate || new Date().toISOString().split('T')[0],
      amount: advancePaid,
      notes: 'Initial Upad',
    });
  }

  const bonus = Number(updated.bonus || 0);
  const remainingSalary = Number((monthlySalary + bonus - advancePaid).toFixed(2));

  let status = 'Pending';
  if (remainingSalary <= 0) status = 'Paid';
  else if (advancePaid > 0) status = 'Partial';

  const updatedWorker = {
    ...updated,
    id: updated.id || id,
    monthlySalary,
    advancePaid,
    advances,
    bonus,
    remainingSalary,
    status,
  };

  if (index !== -1) {
    memoryStore.workers[index] = updatedWorker;
  } else {
    memoryStore.workers.unshift(updatedWorker);
  }
  saveToLocalBackup();

  const isSavedInMongo = await ensureDbConnected();
  if (isSavedInMongo) {
    try {
      await WorkerModel.findOneAndUpdate(
        { id: updatedWorker.id || id },
        { $set: cleanForMongo(updatedWorker) },
        { upsert: true, new: true }
      );
      console.log('Updated worker in MongoDB Atlas:', updatedWorker.id, updatedWorker.name);
    } catch (err: any) {
      console.error('MongoDB Worker update error:', err.message);
    }
  }

  res.json({ success: true, worker: updatedWorker });
});

app.delete('/api/workers/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  memoryStore.workers = memoryStore.workers.filter(w => w.id !== id);
  saveToLocalBackup();
  if (isDbConnected()) {
    try {
      const result = await WorkerModel.deleteOne({ id });
      console.log(`Deleted ${result.deletedCount} worker(s) from MongoDB Atlas:`, id);
    } catch (err: any) {
      console.error('MongoDB Worker delete error:', err.message);
    }
  }
  res.json({ success: true, id });
});

// 6. Parties Management (Customer / Supplier)
app.get('/api/parties', async (req: Request, res: Response) => {
  const isConnected = await ensureDbConnected();
  if (isConnected) {
    try {
      const docs = await PartyModel.find().lean();
      if (docs && Array.isArray(docs)) {
        const mongoParties = docs.map(cleanForMongo);
        const mongoIds = new Set(mongoParties.map((p: any) => p.id));
        const memoryOnly = memoryStore.parties.filter((p: any) => p.id && !mongoIds.has(p.id));

        for (const mParty of memoryOnly) {
          PartyModel.findOneAndUpdate(
            { id: mParty.id },
            { $set: cleanForMongo(mParty) },
            { upsert: true }
          ).catch((e: any) => console.warn('Error syncing memory party to Mongo:', e.message));
        }

        memoryStore.parties = [...memoryOnly, ...mongoParties];
        saveToLocalBackup();
      }
    } catch (e: any) {
      console.warn('Error reading parties from MongoDB:', e.message);
    }
  }

  const bills = memoryStore.bills;
  const purchases = memoryStore.purchases;

  const enrichedParties = memoryStore.parties.map((p: any) => {
    const rawType = String(p.type || '');
    const isMaterial = rawType === 'Material Party' || rawType === 'Supplier';

    if (isMaterial) {
      const partyPurchases = purchases.filter(
        (pur: any) => pur.supplierId === p.id || (p.name && String(pur.supplierName || '').trim().toLowerCase() === String(p.name).trim().toLowerCase())
      );
      const totalAmount = Number((partyPurchases.reduce((acc: number, pur: any) => acc + (Number(pur.totalAmount) || 0), 0) + (Number(p.openingBalance) || 0)).toFixed(2));
      const receivedAmount = Number(partyPurchases.reduce((acc: number, pur: any) => acc + (Number(pur.paidAmount) || 0), 0).toFixed(2));
      const pendingAmount = Number((totalAmount - receivedAmount).toFixed(2));
      return { ...p, totalAmount, receivedAmount, pendingAmount };
    } else {
      const partyBills = bills.filter(
        (b: any) => b.partyId === p.id || (p.name && String(b.partyName || '').trim().toLowerCase() === String(p.name).trim().toLowerCase())
      );
      const totalAmount = Number((partyBills.reduce((acc: number, b: any) => acc + (Number(b.totalAmount) || 0), 0) + (Number(p.openingBalance) || 0)).toFixed(2));
      const receivedAmount = Number(partyBills.reduce((acc: number, b: any) => acc + (Number(b.paidAmount) || 0), 0).toFixed(2));
      const pendingAmount = Number((totalAmount - receivedAmount).toFixed(2));
      return { ...p, totalAmount, receivedAmount, pendingAmount };
    }
  });

  res.json(enrichedParties);
});

app.post('/api/parties', async (req: Request, res: Response) => {
  const party = req.body;
  const newParty = {
    ...party,
    id: 'p_' + Date.now(),
    createdAt: new Date().toISOString().split('T')[0],
  };
  memoryStore.parties.unshift(newParty);

  await ensureDbConnected();
  if (isDbConnected()) {
    try {
      await PartyModel.updateOne({ id: newParty.id }, { $set: cleanForMongo(newParty) }, { upsert: true });
      console.log('Saved party to MongoDB Atlas:', newParty.id);
    } catch (err: any) {
      console.error('MongoDB Party save error:', err.message);
    }
  }

  res.json({ success: true, party: newParty });
});

app.put('/api/parties/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  await ensureDbConnected();

  let index = memoryStore.parties.findIndex(p => p.id === id || (p as any)._id === id);
  let existing = index !== -1 ? memoryStore.parties[index] : null;

  if (!existing && isDbConnected()) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(id);
      const filter = isObjectId ? { $or: [{ id }, { _id: id }] } : { id };
      const doc = await PartyModel.findOne(filter).lean();
      if (doc) existing = cleanForMongo(doc);
    } catch (e: any) {
      console.warn('Error fetching party from Mongo on PUT:', e.message);
    }
  }

  const updated = { ...(existing || {}), ...req.body, id: existing?.id || req.body.id || id };

  if (index !== -1) {
    memoryStore.parties[index] = updated;
  } else {
    memoryStore.parties.unshift(updated);
  }
  saveToLocalBackup();

  if (isDbConnected()) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(id);
      const filterConditions: any[] = [{ id: updated.id }, { id }];
      if (isObjectId) filterConditions.push({ _id: id });

      await PartyModel.findOneAndUpdate(
        { $or: filterConditions },
        { $set: cleanForMongo(updated) },
        { upsert: true, new: true }
      );
      console.log('Updated party in MongoDB Atlas:', id, updated.name);
    } catch (err: any) {
      console.error('MongoDB Party update error:', err.message);
    }
  }

  res.json({ success: true, party: updated });
});

app.delete('/api/parties/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  memoryStore.parties = memoryStore.parties.filter(p => p.id !== id && (p as any)._id !== id);
  saveToLocalBackup();

  let deletedCount = 0;
  await ensureDbConnected();
  if (isDbConnected()) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(id);
      const filterConditions: any[] = [{ id }];
      if (isObjectId) filterConditions.push({ _id: id });

      const result = await PartyModel.deleteMany({ $or: filterConditions });
      deletedCount = result.deletedCount || 0;
      console.log(`Deleted ${deletedCount} party/parties from MongoDB Atlas:`, id);
    } catch (err: any) {
      console.error('MongoDB Party delete error:', err.message);
    }
  }
  res.json({ success: true, id, deletedCount });
});

// 7. Payment Management
app.get('/api/payments', async (req: Request, res: Response) => {
  const isConnected = await ensureDbConnected();
  if (isConnected) {
    try {
      const docs = await PaymentModel.find().lean();
      if (docs && Array.isArray(docs)) {
        const mongoPayments = docs.map(cleanForMongo);
        const mongoIds = new Set(mongoPayments.map((p: any) => p.id));
        const memoryOnly = memoryStore.payments.filter((p: any) => p.id && !mongoIds.has(p.id));

        for (const mPayment of memoryOnly) {
          PaymentModel.findOneAndUpdate(
            { id: mPayment.id },
            { $set: cleanForMongo(mPayment) },
            { upsert: true }
          ).catch((e: any) => console.warn('Error syncing memory payment to Mongo:', e.message));
        }

        memoryStore.payments = [...memoryOnly, ...mongoPayments];
        saveToLocalBackup();
      }
    } catch (e: any) {
      console.warn('Error reading payments from MongoDB:', e.message);
    }
  }
  res.json(memoryStore.payments);
});

app.post('/api/payments', async (req: Request, res: Response) => {
  const payment = req.body;
  const newPayment = {
    ...payment,
    id: 'pay_' + Date.now(),
    date: payment.date || new Date().toISOString().split('T')[0],
  };
  memoryStore.payments.unshift(newPayment);

  await ensureDbConnected();
  if (isDbConnected()) {
    try {
      await PaymentModel.updateOne({ id: newPayment.id }, { $set: cleanForMongo(newPayment) }, { upsert: true });
      console.log('Saved payment to MongoDB Atlas:', newPayment.id);
    } catch (err: any) {
      console.error('MongoDB Payment save error:', err.message);
    }
  }

  res.json({ success: true, payment: newPayment });
});

app.delete('/api/payments/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  memoryStore.payments = memoryStore.payments.filter(p => p.id !== id);
  saveToLocalBackup();
  if (isDbConnected()) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(id);
      const filterConditions: any[] = [{ id }];
      if (isObjectId) filterConditions.push({ _id: id });

      const result = await PaymentModel.deleteMany({ $or: filterConditions });
      console.log(`Deleted ${result.deletedCount} payment(s) from MongoDB Atlas:`, id);
    } catch (err: any) {
      console.error('MongoDB Payment delete error:', err.message);
    }
  }
  res.json({ success: true, id });
});

app.put('/api/payments/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const payment = req.body;
  const updatedPayment = { ...payment, id };
  memoryStore.payments = memoryStore.payments.map((p) => (p.id === id ? updatedPayment : p));
  saveToLocalBackup();

  await ensureDbConnected();
  if (isDbConnected()) {
    try {
      await PaymentModel.updateOne({ id }, { $set: cleanForMongo(updatedPayment) }, { upsert: true });
    } catch (err: any) {
      console.error('MongoDB Payment update error:', err.message);
    }
  }

  res.json({ success: true, payment: updatedPayment });
});

// 7B. Transaction Category Management (CRUD)
app.get('/api/categories', async (req: Request, res: Response) => {
  const isConnected = await ensureDbConnected();
  if (isConnected) {
    try {
      const docs = await CategoryModel.find().lean();
      if (docs && Array.isArray(docs)) {
        const mongoCategories = docs.map(cleanForMongo);
        const mongoIds = new Set(mongoCategories.map((c: any) => c.id));
        const memoryOnly = (memoryStore.categories || []).filter((c: any) => c.id && !mongoIds.has(c.id));

        for (const mCategory of memoryOnly) {
          CategoryModel.findOneAndUpdate(
            { id: mCategory.id },
            { $set: cleanForMongo(mCategory) },
            { upsert: true }
          ).catch((e: any) => console.warn('Error syncing memory category to Mongo:', e.message));
        }

        memoryStore.categories = [...memoryOnly, ...mongoCategories];
        saveToLocalBackup();
      }
    } catch (e: any) {
      console.warn('Error reading categories from MongoDB:', e.message);
    }
  }
  res.json(memoryStore.categories || []);
});

app.post('/api/categories', async (req: Request, res: Response) => {
  const category = req.body;
  const newCategory = {
    ...category,
    id: category.id || 'cat_' + Date.now(),
    createdAt: category.createdAt || new Date().toISOString().split('T')[0],
  };
  if (!memoryStore.categories) memoryStore.categories = [];
  memoryStore.categories.push(newCategory);
  saveToLocalBackup();

  await ensureDbConnected();
  if (isDbConnected()) {
    try {
      await CategoryModel.updateOne({ id: newCategory.id }, { $set: cleanForMongo(newCategory) }, { upsert: true });
    } catch (err: any) {
      console.error('MongoDB Category save error:', err.message);
    }
  }

  res.json({ success: true, category: newCategory });
});

app.put('/api/categories/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const category = req.body;
  const updatedCategory = { ...category, id };

  if (!memoryStore.categories) memoryStore.categories = [];
  memoryStore.categories = memoryStore.categories.map((c: any) => (c.id === id ? updatedCategory : c));
  saveToLocalBackup();

  await ensureDbConnected();
  if (isDbConnected()) {
    try {
      await CategoryModel.updateOne({ id }, { $set: cleanForMongo(updatedCategory) }, { upsert: true });
    } catch (err: any) {
      console.error('MongoDB Category update error:', err.message);
    }
  }

  res.json({ success: true, category: updatedCategory });
});

app.delete('/api/categories/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!memoryStore.categories) memoryStore.categories = [];
  memoryStore.categories = memoryStore.categories.filter((c: any) => c.id !== id);
  saveToLocalBackup();

  if (isDbConnected()) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(id);
      const filterConditions: any[] = [{ id }];
      if (isObjectId) filterConditions.push({ _id: id });

      const result = await CategoryModel.deleteMany({ $or: filterConditions });
      console.log(`Deleted ${result.deletedCount} category(ies) from MongoDB:`, id);
    } catch (err: any) {
      console.error('MongoDB Category delete error:', err.message);
    }
  }
  res.json({ success: true, id });
});

// 8. App Users Management (Mobile App Registration Requests)
app.get('/api/app-users', async (req: Request, res: Response) => {
  const dbReady = await ensureDbConnected();
  if (dbReady) {
    try {
      const docs = await AppUserModel.find().lean();
      memoryStore.appUsers = docs ? docs.map(cleanForMongo) : [];
      saveToLocalBackup();
    } catch (e: any) {
      console.warn('Error reading appUsers from MongoDB:', e.message);
    }
  }
  res.json(memoryStore.appUsers || []);
});

// Register App User from Mobile App or Web
app.post(['/api/app-users/register', '/api/app-users'], async (req: Request, res: Response) => {
  const rawMobile = req.body.mobileNumber || req.body.mobile || req.body.phone || req.body.phoneNumber || req.body.mobile_number || '';
  const mobileNumber = String(rawMobile).trim();

  if (!mobileNumber) {
    return res.status(400).json({ success: false, error: 'મોબાઈલ નંબર જરૂરી છે (Mobile number is required)' });
  }

  const fullName = req.body.fullName || req.body.name || req.body.userName || req.body.user_name || 'નવો એપ યુઝર';
  const password = req.body.password || req.body.pass || '1234';
  const linkedPartyId = req.body.linkedPartyId || '';
  const linkedPartyName = req.body.linkedPartyName || '';
  const notes = req.body.notes || 'Registered from Mobile App';

  const dbReady = await ensureDbConnected();
  if (dbReady) {
    try {
      const docs = await AppUserModel.find().lean();
      if (docs && docs.length > 0) {
        memoryStore.appUsers = docs.map(cleanForMongo);
      }
    } catch (e: any) {}
  }

  // Normalize mobile number comparison (strip spaces and +91 prefix for match check)
  const norm = (num: string) => String(num || '').replace(/[\s\-\+]/g, '').replace(/^91/, '');
  const targetNorm = norm(mobileNumber);

  // Check if user already exists
  const existingUserIndex = (memoryStore.appUsers || []).findIndex((u: any) => norm(u.mobileNumber) === targetNorm);

  let targetUser: any;

  if (existingUserIndex >= 0) {
    const existing = memoryStore.appUsers[existingUserIndex];
    targetUser = {
      ...existing,
      fullName: fullName || existing.fullName,
      mobileNumber: mobileNumber || existing.mobileNumber,
      password: password || existing.password,
      status: 'Approved',
      requestedAt: new Date().toISOString().split('T')[0],
      approvedAt: new Date().toISOString().split('T')[0],
      notes: notes || existing.notes,
    };
    memoryStore.appUsers[existingUserIndex] = targetUser;
  } else {
    // Create new app user (active immediately)
    targetUser = {
      id: 'au_' + Date.now(),
      fullName,
      mobileNumber,
      password,
      status: 'Approved',
      linkedPartyId,
      linkedPartyName,
      requestedAt: new Date().toISOString().split('T')[0],
      approvedAt: new Date().toISOString().split('T')[0],
      notes: notes || 'Created in App Users',
    };
    if (!memoryStore.appUsers) memoryStore.appUsers = [];
    memoryStore.appUsers.unshift(targetUser);
  }

  saveToLocalBackup();

  const isSavedInMongo = await ensureDbConnected();
  if (isSavedInMongo) {
    try {
      const savedDoc = await AppUserModel.findOneAndUpdate(
        { $or: [{ id: targetUser.id }, { mobileNumber: targetUser.mobileNumber }] },
        { $set: cleanForMongo(targetUser) },
        { upsert: true, new: true, runValidators: false }
      );
      console.log('Saved AppUser registration request to MongoDB Atlas appusers:', targetUser.id, targetUser.fullName, savedDoc ? savedDoc._id : '');
    } catch (err: any) {
      console.error('MongoDB AppUser save error:', err.message);
    }
  } else {
    console.warn('MongoDB Atlas not connected, stored in memory fallback only:', targetUser.id);
  }

  res.json({
    success: true,
    message: 'એપ યુઝર એકાઉન્ટ સફળતાપૂર્વક તૈયાર થઈ ગયું છે. તમે હવે લોગિન કરી શકો છો.',
    appUser: targetUser,
  });
});

// Mobile App Login
app.post('/api/app-users/login', async (req: Request, res: Response) => {
  const { mobileNumber, password } = req.body;

  if (!mobileNumber || !password) {
    return res.status(400).json({ success: false, message: 'મોબાઈલ નંબર અને પાસવર્ડ દાખલ કરો' });
  }

  const dbReady = await ensureDbConnected();
  if (dbReady) {
    try {
      const docs = await AppUserModel.find().lean();
      if (docs) {
        memoryStore.appUsers = docs.map(cleanForMongo);
      }
    } catch (e: any) {}
  }

  // Normalize mobile number comparison (strip spaces, hyphens, pluses, and +91 prefix)
  const norm = (num: string) => String(num || '').replace(/[\s\-\+]/g, '').replace(/^91/, '');
  const targetNorm = norm(mobileNumber);

  const user = (memoryStore.appUsers || []).find((u: any) => norm(u.mobileNumber) === targetNorm);

  if (!user) {
    return res.status(404).json({ success: false, message: 'મોબાઈલ નંબર નોંધાયેલ નથી. કૃપા કરીને એડમિનનો સંપર્ક કરો.' });
  }

  if (String(user.password || '').trim() !== String(password || '').trim()) {
    return res.status(401).json({ success: false, message: 'ખોટો પાસવર્ડ! કૃપા કરીને ફરી પ્રયાસ કરો.' });
  }

  res.json({
    success: true,
    status: user.status || 'Approved',
    message: 'લોગિન સફળ થયું!',
    user,
  });
});

// Update Status (Approve / Decline)
app.put('/api/app-users/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, linkedPartyId, linkedPartyName, notes } = req.body;

  const userIndex = (memoryStore.appUsers || []).findIndex((u: any) => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const existing = memoryStore.appUsers[userIndex];
  const updated = {
    ...existing,
    status: status || existing.status,
    linkedPartyId: linkedPartyId !== undefined ? linkedPartyId : existing.linkedPartyId,
    linkedPartyName: linkedPartyName !== undefined ? linkedPartyName : existing.linkedPartyName,
    notes: notes !== undefined ? notes : existing.notes,
    approvedAt: status === 'Approved' ? new Date().toISOString().split('T')[0] : existing.approvedAt,
  };

  memoryStore.appUsers[userIndex] = updated;
  saveToLocalBackup();

  const isDbReady = await ensureDbConnected();
  if (isDbReady) {
    try {
      await AppUserModel.findOneAndUpdate({ id }, { $set: cleanForMongo(updated) }, { upsert: true, new: true });
      console.log('Updated AppUser status in MongoDB appusers collection:', id);
    } catch (err: any) {
      console.error('Error updating AppUser status in MongoDB:', err.message);
    }
  }

  res.json({ success: true, appUser: updated });
});

// Edit App User
app.put('/api/app-users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const userIndex = (memoryStore.appUsers || []).findIndex((u: any) => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const updated = {
    ...memoryStore.appUsers[userIndex],
    ...req.body,
    id,
  };

  memoryStore.appUsers[userIndex] = updated;
  saveToLocalBackup();

  const isDbReady = await ensureDbConnected();
  if (isDbReady) {
    try {
      await AppUserModel.findOneAndUpdate({ id }, { $set: cleanForMongo(updated) }, { upsert: true, new: true });
      console.log('Updated AppUser in MongoDB appusers collection:', id);
    } catch (err: any) {
      console.error('Error updating AppUser in MongoDB:', err.message);
    }
  }

  res.json({ success: true, appUser: updated });
});

// Delete App User
app.delete('/api/app-users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  memoryStore.appUsers = (memoryStore.appUsers || []).filter((u: any) => u.id !== id);
  saveToLocalBackup();

  const isDbReady = await ensureDbConnected();
  if (isDbReady) {
    try {
      await AppUserModel.deleteMany({ id });
      console.log('Deleted AppUser from MongoDB appusers collection:', id);
    } catch (err: any) {
      console.error('Error deleting AppUser from MongoDB:', err.message);
    }
  }

  res.json({ success: true, id });
});

// 8. DB Connection Status & Diagnostics API
app.get('/api/db/status', (req: Request, res: Response) => {
  const maskedUri = currentMongoUri.replace(/mongodb\+srv:\/\/([^:]+):([^@]+)@/, 'mongodb+srv://$1:****@');
  res.json({
    connected: isDbConnected(),
    readyState: mongoose.connection.readyState,
    uri: maskedUri,
    lastError: lastMongoError,
    counts: {
      bills: memoryStore.bills.length,
      purchases: memoryStore.purchases.length,
      workers: memoryStore.workers.length,
      parties: memoryStore.parties.length,
      payments: memoryStore.payments.length,
    },
  });
});

app.post('/api/db/connect', async (req: Request, res: Response) => {
  let { uri } = req.body;
  if (uri && typeof uri === 'string' && uri.trim().length > 0) {
    let targetUri = uri.trim();
    // If client sent back a masked URI containing ****, restore the real password from currentMongoUri or MONGODB_URI
    if (targetUri.includes(':****@')) {
      const currentPasswordMatch = currentMongoUri.match(/mongodb\+srv:\/\/[^:]+:([^@]+)@/) || MONGODB_URI.match(/mongodb\+srv:\/\/[^:]+:([^@]+)@/);
      if (currentPasswordMatch && currentPasswordMatch[1]) {
        targetUri = targetUri.replace(':****@', `:${currentPasswordMatch[1]}@`);
      }
    }
    currentMongoUri = targetUri;
  } else {
    currentMongoUri = MONGODB_URI;
  }

  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(currentMongoUri, { dbName: 'feni_creation', serverSelectionTimeoutMS: 10000 });
    isMongoConnected = true;
    lastMongoError = null;
    saveMongoConfig(currentMongoUri);
    await syncWithMongo();
    res.json({
      success: true,
      connected: true,
      message: 'Successfully connected to MongoDB Cloud Atlas and synchronized all data!',
    });
  } catch (err: any) {
    isMongoConnected = false;
    lastMongoError = err.message;
    res.json({
      success: false,
      connected: false,
      error: err.message,
      message: 'Failed to connect to MongoDB Atlas. Please check connection string or whitelist 0.0.0.0/0 in MongoDB Atlas Network Access.',
    });
  }
});

app.post('/api/db/sync', async (req: Request, res: Response) => {
  if (!isDbConnected()) {
    return res.status(400).json({ success: false, error: 'MongoDB is currently disconnected.' });
  }
  try {
    await syncWithMongo();
    res.json({ success: true, message: 'All MongoDB data successfully fetched!' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Full Data Backup Export Endpoint
app.get(['/api/db/export', '/api/db/backup'], (req: Request, res: Response) => {
  const backupData = {
    exportDate: new Date().toISOString(),
    version: '2.0.0',
    settings: memoryStore.settings,
    parties: memoryStore.parties,
    bills: memoryStore.bills,
    purchases: memoryStore.purchases,
    workers: memoryStore.workers,
    payments: memoryStore.payments,
    appUsers: memoryStore.appUsers,
  };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="feni_creation_backup_${new Date().toISOString().split('T')[0]}.json"`);
  res.json(backupData);
});

// Full Data & Code Restore Endpoint
app.post('/api/db/restore', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const data = payload.data || payload;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid backup file format' });
    }

    if (data.settings) memoryStore.settings = cleanForMongo(data.settings);
    if (Array.isArray(data.parties)) memoryStore.parties = data.parties.map(cleanForMongo);
    if (Array.isArray(data.bills)) memoryStore.bills = data.bills.map(cleanForMongo);
    if (Array.isArray(data.purchases)) memoryStore.purchases = data.purchases.map(cleanForMongo);
    if (Array.isArray(data.workers)) memoryStore.workers = data.workers.map(cleanForMongo);
    if (Array.isArray(data.payments)) memoryStore.payments = data.payments.map(cleanForMongo);
    if (Array.isArray(data.appUsers)) memoryStore.appUsers = data.appUsers.map(cleanForMongo);

    saveToLocalBackup();

    if (isDbConnected()) {
      try {
        if (data.settings) await SettingsModel.updateOne({}, { $set: cleanForMongo(data.settings) }, { upsert: true });
        
        if (Array.isArray(data.parties)) {
          for (const item of data.parties) {
            if (item.id) await PartyModel.updateOne({ id: item.id }, { $set: cleanForMongo(item) }, { upsert: true });
          }
        }
        if (Array.isArray(data.bills)) {
          for (const item of data.bills) {
            if (item.id) await BillModel.updateOne({ id: item.id }, { $set: cleanForMongo(item) }, { upsert: true });
          }
        }
        if (Array.isArray(data.purchases)) {
          for (const item of data.purchases) {
            if (item.id) await PurchaseModel.updateOne({ id: item.id }, { $set: cleanForMongo(item) }, { upsert: true });
          }
        }
        if (Array.isArray(data.workers)) {
          for (const item of data.workers) {
            if (item.id) await WorkerModel.updateOne({ id: item.id }, { $set: cleanForMongo(item) }, { upsert: true });
          }
        }
        if (Array.isArray(data.payments)) {
          for (const item of data.payments) {
            if (item.id) await PaymentModel.updateOne({ id: item.id }, { $set: cleanForMongo(item) }, { upsert: true });
          }
        }
        if (Array.isArray(data.appUsers)) {
          for (const item of data.appUsers) {
            if (item.id) await AppUserModel.updateOne({ id: item.id }, { $set: cleanForMongo(item) }, { upsert: true });
          }
        }
      } catch (dbErr: any) {
        console.warn('Restore Mongo sync warning:', dbErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Data & Delivery Records Restore Completed Successfully!',
      counts: {
        bills: memoryStore.bills.length,
        purchases: memoryStore.purchases.length,
        workers: memoryStore.workers.length,
        parties: memoryStore.parties.length,
        payments: memoryStore.payments.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Settings
app.get('/api/settings', async (req: Request, res: Response) => {
  if (isDbConnected()) {
    try {
      const dbSettings = await SettingsModel.findOne().lean();
      if (dbSettings) {
        memoryStore.settings = cleanForMongo(dbSettings);
      }
    } catch (e: any) {
      console.warn('Error reading settings from MongoDB:', e.message);
    }
  }
  res.json(memoryStore.settings);
});

app.put('/api/settings', async (req: Request, res: Response) => {
  memoryStore.settings = { ...memoryStore.settings, ...req.body };
  if (isDbConnected()) {
    try {
      await SettingsModel.updateOne({ id: 'settings_main' }, { $set: cleanForMongo(memoryStore.settings) }, { upsert: true });
      console.log('Updated settings in MongoDB Atlas');
    } catch (err: any) {
      console.error('MongoDB Settings update error:', err.message);
    }
  }
  res.json({ success: true, settings: memoryStore.settings });
});

// Explicit 404 JSON handler for unhandled /api routes (prevents Vite returning HTML for API calls)
app.use('/api', (req: Request, res: Response) => {
  res.status(404).json({ success: false, error: `API route ${req.method} ${req.originalUrl} not found` });
});

// Global Express Error Handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Express Internal Server Error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({
    success: false,
    error: err?.message || 'Internal Server Error',
  });
});

// VITE SERVER OR STATIC BUILD HANDLING
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
