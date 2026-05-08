import React, { useState, useEffect, useCallback } from 'react';

const STORAGE_NAMESPACE = 'fresh_start_2026_05_07_v5';

const getStorageKey = (key: string) => `${STORAGE_NAMESPACE}:${key}`;

const normalizeNumber = (value: unknown): number => {
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeName = (value: unknown) => String(value || '').trim().replace(/\s+/g, ' ');

const readStoredArray = (key: string): any[] => {
  if (typeof window === 'undefined' || !window.localStorage) return [];

  try {
    const raw = window.localStorage.getItem(getStorageKey(key));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const resolveDepartment = (product: any) => {
  const departments = readStoredArray('departments');
  const rawDepartmentId = normalizeName(product.departmentId);
  const rawDepartmentName = normalizeName(product.departmentName || product.category || 'عام') || 'عام';

  const byId = departments.find((department) => normalizeName(department.id) === rawDepartmentId);
  if (byId) return { departmentId: byId.id, departmentName: byId.name };

  const byName = departments.find((department) => normalizeName(department.name) === rawDepartmentName);
  if (byName) return { departmentId: byName.id, departmentName: byName.name };

  const general = departments.find((department) => normalizeName(department.name) === 'عام' || department.id === 'dept-misc');
  if (general) return { departmentId: general.id, departmentName: general.name };

  return {
    departmentId: rawDepartmentId && rawDepartmentId !== 'misc' ? rawDepartmentId : 'dept-misc',
    departmentName: rawDepartmentName
  };
};

const syncProductDepartmentNames = (departments: unknown) => {
  if (!Array.isArray(departments) || typeof window === 'undefined' || !window.localStorage) return;

  const productsKey = getStorageKey('products');
  const rawProducts = window.localStorage.getItem(productsKey);
  if (!rawProducts) return;

  try {
    const products = JSON.parse(rawProducts);
    if (!Array.isArray(products)) return;

    const updatedProducts = products.map((product: any) => {
      const department = departments.find((dept: any) => dept.id === product.departmentId);
      if (!department) return product;

      return {
        ...product,
        departmentName: department.name,
        category: department.name,
        updatedAt: new Date().toISOString()
      };
    });

    window.localStorage.setItem(productsKey, JSON.stringify(normalizeProducts(updatedProducts)));
  } catch (error) {
    console.error('Department sync failed:', error);
  }
};

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

      const resolvedDepartment = resolveDepartment(product);

      return {
        ...product,
        id: product.id || `prod-${index + 1}`,
        name: normalizeName(product.name),
        departmentId: resolvedDepartment.departmentId,
        departmentName: resolvedDepartment.departmentName,
        category: resolvedDepartment.departmentName,
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

        if (key === 'departments') {
          syncProductDepartmentNames(normalizedValue);
        }

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
