export interface BillItem {
  id: string;
  challanDate?: string;
  deliveryDate?: string;
  deliveryLocation?: string;
  deliveryNotes?: string;
  challanNo?: string;
  designNo?: string;
  description: string;
  hsnCode?: string;
  quantity: number;
  unit: string;
  rate: number;
  plain?: number;
  shortage?: number;
  discountPercent?: number;
  discountAmount?: number;
  amount: number;
  total?: number;
  stitches?: number;
}

export interface Bill {
  id: string;
  billNo?: string;
  challanNo?: string;
  invoiceNo: string;
  partyId: string;
  partyName: string;
  partyGstin?: string;
  partyMobile?: string;
  partyAddress?: string;
  partyContactPerson?: string;
  date: string;
  dueDate?: string;
  deliveryDate?: string;
  deliveryLocation?: string;
  transportName?: string;
  deliveryPerson?: string;
  deliveryStatus?: 'Pending' | 'In Transit' | 'Delivered' | 'Returned' | string;
  deliveryNotes?: string;
  items: BillItem[];
  subtotal: number;
  billingAmount?: number;
  cgst: number; // 2.5%
  sgst: number; // 2.5%
  totalTax: number; // 5.0%
  tax?: number;
  taxRate?: number;
  totalAmount: number;
  totalDiscount?: number;
  discount?: number;
  discountPercent?: number;
  discountAmount?: number;
  paidAmount: number;
  receivedAmount?: number;
  pendingAmount: number;
  status: 'Paid' | 'Pending' | 'Received' | 'Partial';
  notes?: string;
  extraCharges?: number;
  chargeAmount?: number;
  roundOff?: number;
  paymentMethod?: string;
  paymentStatus?: 'Paid' | 'Pending' | 'Received' | 'Partial' | string;
  paymentDate?: string;
  chequeNo?: string;
  chequeDate?: string;
  chequeBank?: string;
  isWorking?: boolean;
  createdAt?: string;
}

export interface PurchaseItem {
  id?: string;
  challanDate?: string;
  challanNo?: string;
  description: string;
  quantity: number;
  unit?: string;
  rate: number;
  amount: number;
  total?: number;
}

export interface Purchase {
  id: string;
  purchaseNo: string;
  supplierId: string;
  supplierName: string;
  supplierGstin?: string;
  date: string;
  materialName?: string;
  items: PurchaseItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  totalTax?: number;
  taxRate?: number;
  adjustAmount?: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: 'Paid' | 'Pending' | 'Partial';
  paymentStatus?: 'Paid' | 'Pending' | 'Received' | 'Partial' | string;
  notes?: string;
  paymentDate?: string;
  chequeNo?: string;
  paymentMethod?: string;
  createdAt?: string;
}

export interface AdvanceEntry {
  id: string;
  date: string; // e.g. '2026-05-10'
  amount: number; // e.g. 2000
  notes?: string; // e.g. 'Cash' or 'UPI'
  reason?: string;
}

export interface Worker {
  id: string;
  name: string;
  gujaratiName?: string;
  mobile: string;
  role: string;
  monthlySalary: number;
  advancePaid: number;
  advances?: AdvanceEntry[];
  bonus: number;
  otherAmount?: number; // Adjustment amount (+ or -) e.g. -100 or 100
  notes?: string; // Note / Remarks e.g. "Tea/Snacks deduction", "Overtime"
  paidSalaryAmount?: number;
  paymentMethod?: string;
  days?: number;
  remainingSalary: number;
  status: 'Paid' | 'Pending' | 'Partial' | 'Active';
  joiningDate: string;
}

export interface Party {
  id: string;
  name: string;
  contactPerson?: string;
  type: 'Textile Party' | 'Material Party';
  mobile: string;
  gstin?: string;
  address?: string;
  openingBalance?: number;
  totalAmount?: number;
  pendingAmount?: number;
  receivedAmount?: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  date: string;
  partyId: string;
  partyName: string;
  type: 'Received' | 'Paid';
  refInvoiceNo?: string;
  amount: number;
  paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
  notes?: string;
  createdAt?: string;
}

export interface CompanySettings {
  name?: string;
  mobile?: string;
  companyName: string;
  tagline: string;
  gstin: string;
  email: string;
  phone: string;
  address: string;
  bankName: string;
  accountNo: string;
  ifscCode: string;
  hsnCode?: string;
  termsAndConditions?: string;
  logoUrl?: string;
  gujaratiSupport?: boolean;
}

export interface ChartDataPoint {
  month: string;
  sales: number;
  purchase: number;
  salary: number;
}

export interface Activity {
  id: string;
  type: string;
  ref: string;
  party: string;
  amount: number;
  date: string;
  status: string;
}

export interface DashboardStats {
  totalSales: number;
  totalReceived?: number;
  totalPurchase: number;
  totalWorkerSalary: number;
  pendingPayment: number;
  monthlyIncome: number;
  chartData: ChartDataPoint[];
  recentActivities: Activity[];
  isMongoConnected: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Staff';
}

export interface AppUser {
  id: string;
  fullName: string;
  mobileNumber: string;
  password?: string;
  status: 'Pending' | 'Approved' | 'Declined';
  linkedPartyId?: string;
  linkedPartyName?: string;
  requestedAt: string;
  approvedAt?: string;
  notes?: string;
}
