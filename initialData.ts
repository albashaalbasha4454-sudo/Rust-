import type { User, Product, Customer, FinancialAccount } from './types';

// Hashing function for demonstration.
const simpleHash = (password: string, salt: string) => `hashed_${password}_with_${salt}`;

const createInitialUsers = (): User[] => {
    // USE STATIC SALTS FOR PRE-DEFINED USERS
    const adminSalt = 'static_salt_for_admin_user_123';
    const cashierSalt = 'static_salt_for_cashier_user_456';
    return [
        { id: 'user-1', username: 'admin', passwordHash: simpleHash('albasha.123', adminSalt), salt: adminSalt, role: 'admin' },
        { id: 'user-2', username: 'cashier', passwordHash: simpleHash('123', cashierSalt), salt: cashierSalt, role: 'cashier' },
    ];
};

const createInitialProducts = (): Product[] => {
    return [
        { id: 'prod-1', name: 'شاورما دجاج (وجبة)', type: 'product', category: 'وجبات رئيسية', price: 0 },
        { id: 'prod-2', name: 'مشويات مشكلة (كجم)', type: 'product', category: 'وجبات رئيسية', price: 0 },
        { id: 'prod-3', name: 'كبة مقلية (حبة)', type: 'product', category: 'مقبلات', price: 0 },
        { id: 'prod-4', name: 'أرز (طبق)', type: 'product', category: 'مقبلات', price: 0 },
        { id: 'prod-5', name: 'كنافة نابلسية', type: 'product', category: 'حلويات', price: 0 },
        { id: 'prod-6', name: 'عصير برتقال فريش', type: 'product', category: 'مشروبات', price: 0 },
        { id: 'prod-7', name: 'بيبسي (علبة)', type: 'product', category: 'مشروبات', price: 0 },
        { id: 'prod-8', name: 'خدمة توصيل', type: 'service', category: 'خدمات', price: 0 },
    ];
};

const createInitialCustomers = (): Customer[] => {
    return [
        { id: 'cust-1', name: 'عميل نقدي', phone: '0000000000', address: '', email: '', notes: 'عميل افتراضي' },
    ];
};

const createInitialAccounts = (): FinancialAccount[] => {
    return [
        { id: 'cash-default', name: 'الخزينة الرئيسية', type: 'cash' },
        { id: 'bank-default', name: 'الحساب البنكي', type: 'bank' },
    ];
}


export const initialUsers = createInitialUsers();
export const initialProducts = createInitialProducts();
export const initialCustomers = createInitialCustomers();
export const initialAccounts = createInitialAccounts();
