import React, { useState, useEffect, useCallback } from 'react';

const RESET_VERSION_KEY = 'data_reset_items_prices_only_2026_05_07';
const LEGACY_BACKUP_KEY = 'legacy_full_backup_before_reset';

const OPERATIONAL_KEYS_TO_CLEAR = [
  'invoices',
  'expenses',
  'returnRequests',
  'customers',
  'financialAccounts',
  'financialTransactions',
  'budgets',
  'tillCloseouts',
  'activityLog',
  'modifiers',
  'auto_backup_snapshot'
];

const sanitizeProductsForFreshStart = (products: unknown) => {
  if (!Array.isArray(products)) return products;

  return products
    .filter((product: any) => product && typeof product.name === 'string' && product.name.trim())
    .map((product: any, index: number) => {
      const rawPrice = typeof product.price === 'string' ? parseFloat(product.price) : Number(product.price || 0);
      const price = Number.isFinite(rawPrice) ? rawPrice : 0;
      const departmentName = product.departmentName || product.category || 'عام';

      return {
        id: product.id || `prod-clean-${index + 1}`,
        name: product.name.trim(),
        departmentId: product.departmentId || 'dept-misc',
        departmentName,
        category: departmentName,
        price,
        status: product.status === 'unavailable' ? 'unavailable' : 'available',
        reviewStatus: price > 0 ? 'ok' : 'needs_price',
        createdAt: product.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });
};

const normalizeFinancialTransactions = (transactions: unknown) => {
  if (!Array.isArray(transactions)) return transactions;

  const seen = new Set<string>();

  return transactions
    .filter((tx: any) => {
      if (!tx || typeof tx !== 'object') return false;
      const amount = Number(tx.amount);
      if (!Number.isFinite(amount) || amount <= 0) return false;

      // Do not affect balances with pending expenses.
      if (tx.type === 'expense' && typeof tx.description === 'string' && tx.description.includes('معلق')) {
        return false;
      }

      const uniqueKey = [
        tx.type || '',
        amount,
        tx.relatedInvoiceId || '',
        tx.fromAccountId || '',
        tx.toAccountId || '',
        tx.description || ''
      ].join('|');

      if (seen.has(uniqueKey)) return false;
      seen.add(uniqueKey);
      return true;
    })
    .map((tx: any, index: number) => ({
      ...tx,
      id: tx.id || `tx-clean-${index + 1}`,
      amount: Number(tx.amount),
      date: tx.date || new Date().toISOString()
    }));
};

const normalizeInvoices = (invoices: unknown) => {
  if (!Array.isArray(invoices)) return invoices;

  return invoices.map((invoice: any) => {
    if (!invoice || typeof invoice !== 'object') return invoice;
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    const itemsTotal = items.reduce((sum: number, item: any) => sum + Number(item?.lineTotal || 0), 0);
    const deliveryFee = Number(invoice.deliveryFee || 0);
    const total = Number.isFinite(Number(invoice.total)) ? Number(invoice.total) : itemsTotal + deliveryFee;

    return {
      ...invoice,
      items,
      total,
      paidDate: invoice.paymentStatus === 'paid' ? (invoice.paidDate || invoice.date || new Date().toISOString()) : invoice.paidDate
    };
  });
};

const normalizeStoredValue = (key: string, value: unknown) => {
  if (key === 'products') return sanitizeProductsForFreshStart(value);
  if (key === 'financialTransactions') return normalizeFinancialTransactions(value);
  if (key === 'invoices') return normalizeInvoices(value);
  return value;
};

const runOneTimeFreshStartReset = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (window.localStorage.getItem(RESET_VERSION_KEY) === 'done') return;

  try {
    const backup: Record<string, unknown> = {
      createdAt: new Date().toISOString(),
      reason: 'Fresh start: keep only products and prices, archive old operational data.'
    };

    const keysToBackup = [
      'products',
      'departments',
      'modifiers',
      'invoices',
      'expenses',
      'returnRequests',
      'customers',
      'financialAccounts',
      'financialTransactions',
      'budgets',
      'tillCloseouts',
      'activityLog',
      'shopName',
      'shopAddress'
    ];

    keysToBackup.forEach((key) => {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        try {
          backup[key] = JSON.parse(raw);
        } catch {
          backup[key] = raw;
        }
      }
    });

    window.localStorage.setItem(LEGACY_BACKUP_KEY, JSON.stringify(backup));

    const rawProducts = window.localStorage.getItem('products');
    if (rawProducts) {
      try {
        const products = JSON.parse(rawProducts);
        window.localStorage.setItem('products', JSON.stringify(sanitizeProductsForFreshStart(products)));
      } catch {
        window.localStorage.removeItem('products');
      }
    }

    OPERATIONAL_KEYS_TO_CLEAR.forEach((key) => window.localStorage.removeItem(key));
    window.localStorage.setItem(RESET_VERSION_KEY, 'done');
  } catch (error) {
    console.error('Fresh start reset failed:', error);
  }
};

runOneTimeFreshStartReset();

function useLocalStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      const parsedValue = item ? JSON.parse(item) : initialValue;
      const normalizedValue = normalizeStoredValue(key, parsedValue) as T;

      if (item && normalizedValue !== parsedValue) {
        window.localStorage.setItem(key, JSON.stringify(normalizedValue));
      }

      return normalizedValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = useCallback<React.Dispatch<React.SetStateAction<T>>>((value) => {
    try {
      setStoredValue((currentValue) => {
        const valueToStore = value instanceof Function ? value(currentValue) : value;
        const normalizedValue = normalizeStoredValue(key, valueToStore) as T;
        window.localStorage.setItem(key, JSON.stringify(normalizedValue));
        return normalizedValue;
      });
    } catch (error) {
      console.error(error);
    }
  }, [key]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        try {
          const parsedValue = e.newValue ? JSON.parse(e.newValue) : initialValue;
          setStoredValue(normalizeStoredValue(key, parsedValue) as T);
        } catch (error) {
          console.error(error);
          setStoredValue(initialValue);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);

  return [storedValue, setValue];
}

export default useLocalStorage;
