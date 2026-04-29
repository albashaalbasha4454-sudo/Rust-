export type UserRole = 'admin' | 'cashier';

export interface ModifierOption {
  id: string;
  name: string;
  priceDelta: number;
  costDelta?: number;
  isActive: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  productIds: string[];
  minSelect: number;
  maxSelect: number;
  options: ModifierOption[];
}

export interface Product {
  id: string;
  name: string;
  type: 'product' | 'service';
  description?: string;
  category?: string;
  barcode?: string; // Added barcode
  price: number;
  cost?: number; // Added cost
  salePrice?: number;
  discountPercent?: number;
  image?: string;
  isAvailable: boolean; // Added isAvailable
  modifierGroupIds: string[]; // Added modifierGroupIds
  notes?: string; // Added notes
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  price: number;
  cost?: number; // Added cost
  quantity: number;
  discount?: number;
  notes?: string;
  modifiers?: {
    groupId: string;
    optionId: string;
    name: string;
    priceDelta: number;
  }[];
  lineTotal: number; // Added lineTotal
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  email?: string;
  notes?: string;
  createdAt?: string;
  lastOrderAt?: string;
  totalOrders?: number;
  totalSpent?: number;
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
}

export type OrderType = 'sale' | 'return' | 'delivery' | 'reservation' | 'dine_in' | 'takeaway';
export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'delivered';
export type PaymentStatus = 'paid' | 'unpaid' | 'partial';

export interface ReturnRequest {
  id: string;
  requestDate: string;
  originalInvoiceId: string;
  requestedBy: string;
  status: 'pending' | 'approved' | 'rejected';
  items: InvoiceItem[];
  processedBy?: string;
  processedDate?: string;
}

export interface TillCloseout {
  id: string;
  date: string;
  closedByUserId: string;
  closedByUsername: string;
  forDate: string;
  totalSales: number;
  totalReturns: number;
  netCashExpected: number;
  countedCash: number;
  difference: number;
  notes?: string;
  invoiceIds?: string[];
}
export type PaymentMethod = 'cash' | 'card' | 'mixed' | 'credit';

export interface PaymentEntry {
  id: string;
  invoiceId?: string;
  shiftId?: string;
  deviceId: string;
  method: 'cash' | 'card' | 'credit';
  amount: number;
  date: string;
  userId: string;
  username: string;
  userRole: UserRole;
}

export interface Invoice {
  id: string;
  date: string;
  paidDate?: string;
  items: InvoiceItem[];
  subtotal: number; // Added subtotal
  discount: number; // Changed to mandatory
  tax: number; // Added tax
  total: number;
  totalProfit?: number; // Added totalProfit
  type: OrderType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  payments?: PaymentEntry[];
  customerInfo?: {
    id?: string | null;
    name: string;
    phone: string;
    address?: string;
  };
  source?: 'in-store' | 'facebook' | 'instagram' | 'whatsapp' | 'other';
  deliveryFee?: number;
  userId: string;
  username: string;
  userRole: UserRole;
  deviceId: string;
  shiftId?: string; // Optional
  saleSource?: 'admin_direct' | 'cashier_shift' | 'admin_shift'; // Optional
  notes?: string;
  processedBy?: string; // Added processedBy
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  userId: string;
  username: string;
  userRole: UserRole;
  shiftId?: string;
  deviceId: string;
  paymentMethod: 'cash' | 'card';
  affectsCash: boolean;
  status: 'active' | 'reversed';
  reversedBy?: string;
  reversedAt?: string;
  reversalReason?: string;
  accountId: string;
}

export interface Shift {
  id: string;
  number: string;
  startTime: string; // Changed from openedAt to startTime to keep consistency with existing logic if any
  endTime?: string;
  userId: string;
  username: string;
  deviceId: string;
  status: 'open' | 'closed';
  openingCash: number;
  cashSales: number;
  cardSales: number;
  creditSales: number;
  cashReturns: number;
  cashExpenses: number;
  expectedCash: number;
  actualCash?: number;
  difference?: number;
  closingNotes?: string;
  configVersion: string;
}

export interface AuditLog {
  id: string;
  date: string;
  userId: string;
  username: string;
  userRole: UserRole;
  deviceId: string;
  action:
    | 'OPEN_SHIFT'
    | 'CLOSE_SHIFT'
    | 'CREATE_INVOICE'
    | 'CREATE_RETURN'
    | 'CREATE_EXPENSE'
    | 'REVERSE_EXPENSE'
    | 'IMPORT_SHIFT'
    | 'IMPORT_ADMIN_CONFIG'
    | 'EXPORT_SHIFT'
    | 'EXPORT_ADMIN_CONFIG'
    | 'CHANGE_PRODUCT_PRICE'
    | 'MODIFY_PRODUCT'
    | 'LOGIN';
  entityType: 'shift' | 'invoice' | 'expense' | 'product' | 'config' | 'import' | 'user';
  entityId: string;
  description: string;
}

export interface ImportedShiftRecord {
  shiftId: string;
  sourceDeviceId: string;
  cashierUsername: string;
  importedAt: string;
  importedBy: string;
  fileExportVersion: string;
  invoiceCount: number;
  expenseCount: number;
  totalSales: number;
  totalExpenses: number;
  difference: number;
}

export interface AdminConfigExport {
  fileType: 'admin_config';
  configVersion: string;
  exportDate: string;
  adminUserId: string;
  adminName: string;
  sourceDeviceId: string;
  products: Product[];
  categories: string[];
  modifierGroups: ModifierGroup[];
  paymentSettings?: any;
  permissions?: any;
}

export interface ShiftExportFile {
  fileType: 'cashier_shift';
  exportVersion: string;
  exportDate: string;
  sourceDeviceId: string;
  configVersion: string;
  shift: Shift;
  invoices: Invoice[];
  payments: PaymentEntry[];
  expenses: Expense[];
  productSalesSummary: {
    productId: string;
    productName: string;
    netQty: number;
    netRevenue: number;
  }[];
}

export interface FinancialAccount {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'other';
  userId?: string;
}


export type FinancialTransactionType =
  | 'sale_income'
  | 'expense'
  | 'capital_deposit'
  | 'return_refund'
  | 'transfer'
  | 'expense_reversal';

export interface FinancialTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: FinancialTransactionType;
  fromAccountId?: string;
  toAccountId?: string;
  relatedInvoiceId?: string;
  category?: string;
}

export interface Budget {
  id: string;
  name: string;
  targetAmount: number;
}
