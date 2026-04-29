export interface Product {
  id: string;
  name: string;
  type: 'product' | 'service';
  description?: string;
  category?: string;
  price: number;
  salePrice?: number;
  discountPercent?: number;
  cost?: number;
  image?: string;
  availableModifiers?: {name: string, price: number}[];
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  price: number;
  cost?: number;
  discount?: number;
  notes?: string;
  modifiers?: {name: string, price: number}[];
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
  paymentMethod?: 'cash' | 'card';
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
  notes?: string;
  processedBy?: string; // The cashier/admin who added it
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
  totalCashSales?: number;
  totalCardSales?: number;
  totalExpenses?: number;
  netCashExpected: number;
  countedCash: number;
  difference: number;
  notes?: string;
  invoiceIds: string[];
}