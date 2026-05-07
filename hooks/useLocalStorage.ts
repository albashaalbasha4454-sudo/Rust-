import React, { useState, useEffect, useCallback } from 'react';

const STORAGE_NAMESPACE = 'fresh_start_2026_05_07_v5';

const getStorageKey = (key: string) => `${STORAGE_NAMESPACE}:${key}`;

const normalizeNumber = (value: unknown): number => {
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeName = (value: unknown) => String(value || '').trim().replace(/\s+/g, ' ');

const normalizeProducts = (products: unknown) => {
  if (!Array.isArray(products)) return products;

  return products
    .filter((product: any) => product && normalizeName(product.name))
    .map((product: any, index: number) => {
      const price = normalizeNumber(product.price);
      const offerCandidates = [
        product.salePrice,
        product.offerPrice,
        product.customPrice,
        product.customSalePrice,
        product.manualPrice,
        product.specialPrice,
        product.discountedPrice,
        product.priceAfterOffer,
        product['سعر العرض'],
        product['السعر المخصص']
      ];
      const offerPrice = offerCandidates
        .map(normalizeNumber)
        .find((value) => value > 0 && value < price);

      const departmentName = normalizeName(product.departmentName || product.category || 'عام') || 'عام';
      const departmentId = normalizeName(product.departmentId) || 'dept-misc';

      return {
        ...product,
        id: product.id || `prod-${index + 1}`,
        name: normalizeName(product.name),
        departmentId,
        departmentName,
        category: departmentName,
        price,
        salePrice: offerPrice,
        status: product.status === 'unavailable' ? 'unavailable' : 'available',
        reviewStatus: price > 0 ? 'ok' : 'needs_price',
        createdAt: product.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });
};

const normalizeInvoices = (invoices: unknown) => {
  if (!Array.isArray(invoices)) return invoices;

  return invoices.map((invoice: any) => {
    if (!invoice || typeof invoice !== 'object') return invoice;
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    const itemsTotal = items.reduce((sum: number, item: any) => sum + normalizeNumber(item?.lineTotal), 0);
    const deliveryFee = normalizeNumber(invoice.deliveryFee);
    const total = Number.isFinite(Number(invoice.total)) ? Number(invoice.total) : itemsTotal + deliveryFee;

    return { ...invoice, items, total };
  });
};

const normalizeStoredValue = (key: string, value: unknown) => {
  if (key === 'products') return normalizeProducts(value);
  if (key === 'invoices') return normalizeInvoices(value);
  return value;
};

function useLocalStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const storageKey = getStorageKey(key);

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(storageKey);
      const parsedValue = item ? JSON.parse(item) : initialValue;
      const normalizedValue = normalizeStoredValue(key, parsedValue) as T;

      if (!item) {
        window.localStorage.setItem(storageKey, JSON.stringify(normalizedValue));
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
        window.localStorage.setItem(storageKey, JSON.stringify(normalizedValue));
        return normalizedValue;
      });
    } catch (error) {
      console.error(error);
    }
  }, [key, storageKey]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === storageKey) {
        try {
          const parsedValue = event.newValue ? JSON.parse(event.newValue) : initialValue;
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
  }, [key, storageKey, initialValue]);

  return [storedValue, setValue];
}

export default useLocalStorage;
