import type { User, Product, Customer, FinancialAccount, ModifierGroup } from './types';

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

const createInitialModifierGroups = (): ModifierGroup[] => {
    return [
        {
            id: 'mod-1',
            name: 'إضافات الشاورما',
            productIds: ['prod-1'],
            minSelect: 0,
            maxSelect: 3,
            options: [
                { id: 'opt-1', name: 'ثوم زيادة', priceDelta: 0, isActive: true },
                { id: 'opt-2', name: 'شطة خفيفة', priceDelta: 0, isActive: true },
                { id: 'opt-3', name: 'بدون مخلل', priceDelta: 0, isActive: true },
                { id: 'opt-4', name: 'جبنة شيدر', priceDelta: 5.00, isActive: true },
            ]
        },
        {
            id: 'mod-2',
            name: 'درجة الاستواء',
            productIds: ['prod-2'],
            minSelect: 1,
            maxSelect: 1,
            options: [
                { id: 'opt-5', name: 'مستوي جيداً', priceDelta: 0, isActive: true },
                { id: 'opt-6', name: 'نص استواء', priceDelta: 0, isActive: true },
            ]
        }
    ];
};

const createInitialProducts = (): Product[] => {
    return [
        { id: 'prod-1', name: 'شاورما دجاج (وجبة)', type: 'product', category: 'وجبات رئيسية', price: 85.00, cost: 45.00, isAvailable: true, modifierGroupIds: ['mod-1'], notes: 'تقدم مع بطاطس ومخلل' },
        { id: 'prod-2', name: 'مشويات مشكلة (كجم)', type: 'product', category: 'وجبات رئيسية', price: 320.00, cost: 210.00, isAvailable: true, modifierGroupIds: ['mod-2'] },
        { id: 'prod-3', name: 'كبة مقلية (حبة)', type: 'product', category: 'مقبلات', price: 12.00, cost: 6.00, isAvailable: true, modifierGroupIds: [] },
        { id: 'prod-4', name: 'أرز (طبق)', type: 'product', category: 'مقبلات', price: 25.00, cost: 10.00, isAvailable: true, modifierGroupIds: [] },
        { id: 'prod-5', name: 'كنافة نابلسية', type: 'product', category: 'حلويات', price: 45.00, cost: 20.00, isAvailable: true, modifierGroupIds: [] },
        { id: 'prod-6', name: 'عصير برتقال فريش', type: 'product', category: 'مشروبات', price: 35.00, cost: 12.00, isAvailable: true, modifierGroupIds: [] },
        { id: 'prod-7', name: 'بيبسي (علبة)', type: 'product', category: 'مشروبات', price: 15.00, cost: 10.00, isAvailable: true, modifierGroupIds: [] },
        { id: 'prod-8', name: 'خدمة توصيل', type: 'service', category: 'خدمات', price: 20.00, cost: 0, isAvailable: true, modifierGroupIds: [] },
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
export const initialModifierGroups = createInitialModifierGroups();
