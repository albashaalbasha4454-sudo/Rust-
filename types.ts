export interface Product {
  id: string;
  name: string;
  departmentId?: string;
  departmentName?: string;
  category?: string;
  description?: string;
  barcode?: string;
  price: number;
  salePrice?: number;
  costPrice?: number;
  discountPercent?: number;
  type?: 'product' | 'service';
  status: 'available' | 'unavailable';
  image?: string;
  imageUrl?: string;
  notes?: string;
  reviewStatus?: 'ok' | 'needs_price';
  createdAt?: string;
  updatedAt?: string;
}

export interface Modifier {
  id: string;
  parentProductId: string;
  name: string;
  priceDelta: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  managerName?: string;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  departmentId: string;
  departmentName: string;
  quantity: number;
  basePrice: number;
  originalPrice?: number;
  offerPrice?: number;
  modifiers: {
    modifierId: string;
    modifierName: string;
    priceDelta: number;
  }[];
  modifiersTotal: number;
  unitPrice: number; // basePrice + modifiersTotal + extraPrice
  lineTotal: number; // unitPrice * quantity
  itemNotes?: string;
  extraPrice?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  email?: string;
  notes?: string;
}

export interface User {
  id:string;
  username: string;
  passwordHash: string;
  salt: string;
  role: 'admin' | 'cashier';
}

export type OrderType = 'sale' | 'return' | 'delivery' | 'reservation' | 'dine_in' | 'takeaway';
export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'delivered';
export type PaymentStatus = 'paid' | 'unpaid' | 'partial';

export interface Invoice {
  id: string;
  date: string; // ISO string
  paidDate?: string; // ISO string, set when payment is completed
  items: InvoiceItem[];
  total: number;
  type: OrderType;
  customerInfo?: {
    id?: string | null;
    name: string;
    phone: string;
    address?: string;
  };
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  source?: 'in-store' | 'facebook' | 'instagram' | 'whatsapp' | 'other';
  deliveryFee?: number;
  processedBy?: string;
  notes?: string;
}


export interface Expense {
  id: string;
  date: string; // ISO string
  description: string;
  amount: number;
  category?: string;
  accountId: string; // The account it was paid from
  departmentId: string;
  status?: 'completed' | 'review' | 'incomplete';
  notes?: string;
}

export interface ReturnRequest {
  id: string;
  requestDate: string; // ISO string
  originalInvoiceId: string;
  requestedBy: string; // username
  status: 'pending' | 'approved' | 'rejected';
  items: InvoiceItem[];
  processedBy?: string; // username
  processedDate?: string; // ISO string
}

export interface FinancialAccount {
    id: string;
    name:string;
    type: 'cash' | 'bank' | 'other';
    userId?: string;
}

export type FinancialTransactionType = 
    'sale_income' 
    | 'expense' 
    | 'capital_deposit' 
    | 'return_refund'
    | 'transfer'
    | 'expense_reversal';

export interface FinancialTransaction {
    id: string;
    date: string;
    description: string;
    amount: number; // Always positive
    type: FinancialTransactionType;
    fromAccountId?: string; // Source of funds (for expense, withdrawal, transfer)
    toAccountId?: string; // Destination of funds (for income, deposit, transfer)
    relatedInvoiceId?: string;
    category?: string;
}

export interface Budget {
    id: string;
    name: string;
    targetAmount: number;
}

export interface TillCloseout {
  id: string;
  date: string; // ISO string for the closing time
  closedByUserId: string;
  closedByUsername: string;
  forDate: string; // ISO string YYYY-MM-DD
  totalSales: number;
  totalReturns: number; // Positive number representing refund amount
  netCashExpected: number;
  countedCash: number;
  difference: number;
  notes?: string;
  invoiceIds: string[];
}

export interface ActivityLog {
    id: string;
    userId: string;
    username: string;
    action: string;
    timestamp: string;
    details: string;
    metaData?: string;
}
