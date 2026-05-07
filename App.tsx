import React, { useState, useMemo, useCallback, useEffect } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import useAuth from './hooks/useAuth';
import { initialUsers, initialProducts, initialCustomers, initialAccounts, initialDepartments } from './initialData';

import type { Product, Department, Modifier, Invoice, InvoiceItem, User, Expense, ReturnRequest, Customer, FinancialAccount, FinancialTransaction, OrderType, OrderStatus, PaymentStatus, Budget, TillCloseout, ActivityLog } from './types';

import DepartmentsView from './components/DepartmentsView';
import ActivityLogView from './components/ActivityLogView';
import LoginView from './components/LoginView';
import Header from './components/Header';
import { Logo } from './components/Logo';
import POSView from './components/POSView';
import ProductsView from './components/ProductsView';
import DashboardView from './components/DashboardView';
import SettingsView from './components/SettingsView';
import UsersView from './components/UsersView';
import ReturnRequestsView from './components/ReturnRequestsView';
import ExpensesView from './components/ExpensesView';
import AIChatAssistant from './components/AIChatAssistant';
import CustomersView from './components/CustomersView';
import FinanceView from './components/FinanceView';
import OrdersView from './components/OrdersView';
import InvoicesView from './components/InvoicesView';
import CloseTillModal from './components/CloseTillModal';
import PrintInvoice from './PrintInvoice';
import TillCloseoutsView from './components/TillCloseoutsView';
import CashierToolsView from './components/CashierToolsView';
import ReportsView from './components/ReportsView';
import FinancialSummaryView from './components/FinancialSummaryView';


const simpleHash = (password: string, salt: string) => `hashed_${password}_with_${salt}`;

const App: React.FC = () => {
    // --- STATE MANAGEMENT ---
    const [users, setUsers] = useLocalStorage<User[]>('users', initialUsers);
    const { currentUser, login: authLogin, logout: authLogout } = useAuth(users);

    const logActivity = (action: string, details: string, metaData?: string) => {
        // We need to pass the user details if not yet logged in (for login action)
        // or get from currentUser for other actions.
        setActivityLog(prev => [{
            id: `log-${Date.now()}`,
            userId: currentUser?.id || 'system',
            username: currentUser?.username || 'system',
            action,
            timestamp: new Date().toISOString(),
            details,
            metaData
        }, ...prev]);
    };

    const login = async (username: string, password: string) => {
        const success = await authLogin(username, password);
        if (success) {
            logActivity('login', `تم تسجيل دخول المستخدم: ${username}`);
        }
        return success;
    };

    const logout = () => {
        logActivity('logout', `تم تسجيل خروج المستخدم: ${currentUser?.username || 'غير معروف'}`);
        authLogout();
    };

    const [products, setProducts] = useLocalStorage<Product[]>('products', initialProducts);
    const [modifiers, setModifiers] = useLocalStorage<Modifier[]>('modifiers', []);
    const [departments, setDepartments] = useLocalStorage<Department[]>('departments', initialDepartments);

    // Migration to replace old products with new ones
    useEffect(() => {
        const hasOldProducts = products.some(p => p.id === 'prod-1' || p.id === 'prod-8');
        const isVerySmall = products.length > 0 && products.length <= 8;
        if (hasOldProducts || isVerySmall) {
            setProducts(initialProducts);
            setDepartments(initialDepartments);
        }
    }, [products.length]);
    const [activityLog, setActivityLog] = useLocalStorage<ActivityLog[]>('activityLog', []);
    const [invoices, setInvoices] = useLocalStorage<Invoice[]>('invoices', []);
    const [expenses, setExpenses] = useLocalStorage<Expense[]>('expenses', []);
    const [returnRequests, setReturnRequests] = useLocalStorage<ReturnRequest[]>('returnRequests', []);
    const [customers, setCustomers] = useLocalStorage<Customer[]>('customers', initialCustomers);
    const [accounts, setAccounts] = useLocalStorage<FinancialAccount[]>('financialAccounts', initialAccounts);
    const [transactions, setTransactions] = useLocalStorage<FinancialTransaction[]>('financialTransactions', []);
    const [budgets, setBudgets] = useLocalStorage<Budget[]>('budgets', []);
    const [tillCloseouts, setTillCloseouts] = useLocalStorage<TillCloseout[]>('tillCloseouts', []);
    
    const [currentView, setCurrentView] = useState(currentUser?.role === 'admin' ? 'dashboard' : 'pos');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [shopName] = useLocalStorage<string>('shopName', 'مطابخ الشرق');
    const [shopAddress] = useLocalStorage<string>('shopAddress', 'شارع النصر، القاهرة - هاتف: 01012345678');
    const [isCloseTillModalOpen, setIsCloseTillModalOpen] = useState(false);
    const [invoiceToPrint, setInvoiceToPrint] = useState<Invoice | null>(null);
    
    // --- AUTO-BACKUP SYSTEM ---
    useEffect(() => {
        const backupData = () => {
            try {
                const snapshot = {
                    users, products, invoices, expenses, returnRequests,
                    customers,
                    accounts, transactions, budgets, tillCloseouts,
                    timestamp: new Date().toISOString()
                };
                localStorage.setItem('auto_backup_snapshot', JSON.stringify(snapshot));
            } catch (e) {
                console.error('Auto-backup failed:', e);
            }
        };

        const interval = setInterval(backupData, 5 * 60 * 1000); // Every 5 minutes
        return () => clearInterval(interval);
    }, [users, products, invoices, expenses, returnRequests, customers, accounts, transactions, budgets, tillCloseouts]);

    // --- COMPUTED VALUES ---
    const accountBalances = useMemo(() => {
        const balances = new Map<string, number>();
        accounts.forEach(acc => balances.set(acc.id, 0));
        transactions.forEach(tx => {
            if (tx.fromAccountId) {
                balances.set(tx.fromAccountId, (balances.get(tx.fromAccountId) || 0) - tx.amount);
            }
            if (tx.toAccountId) {
                balances.set(tx.toAccountId, (balances.get(tx.toAccountId) || 0) + tx.amount);
            }
        });
        return balances;
    }, [accounts, transactions]);

    // --- CENTRALIZED HANDLERS ---
    const addFinancialTransaction = useCallback((tx: Omit<FinancialTransaction, 'id' | 'date'>) => {
        const newTransaction: FinancialTransaction = {
            id: `tx-${Date.now()}`,
            date: new Date().toISOString(),
            ...tx
        };
        setTransactions(prev => [...prev, newTransaction]);
    }, [setTransactions]);

    // --- DEPARTMENT HANDLERS ---
    const addDepartment = (dept: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>) => {
        setDepartments(prev => [...prev, {...dept, id: `dept-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()}]);
        logActivity('أضافة قسم', `تم إضافة قسم جديد: ${dept.name}`);
    };
    const updateDepartment = (id: string, dept: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>) => {
        setDepartments(prev => prev.map(d => d.id === id ? {...d, ...dept, updatedAt: new Date().toISOString()} : d));
        logActivity('تعديل قسم', `تم تعديل القسم: ${dept.name}`);
    };
    const deleteDepartment = (id: string) => {
        setDepartments(prev => prev.filter(d => d.id !== id));
    };
    
    // Modifier Handlers
    const addModifier = (modifier: Omit<Modifier, 'id' | 'createdAt' | 'updatedAt'>) => {
        setModifiers(prev => [...prev, {...modifier, id: `mod-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()}]);
    };
    const updateModifier = (id: string, modifier: Omit<Modifier, 'id' | 'createdAt' | 'updatedAt'>) => {
        setModifiers(prev => prev.map(m => m.id === id ? {...m, ...modifier, updatedAt: new Date().toISOString()} : m));
    };
    const deleteModifier = (id: string) => {
        setModifiers(prev => prev.filter(m => m.id !== id));
    };

    const addProduct = (product: Omit<Product, 'id'>) => {
        const newProduct = { ...product, id: `prod-${Date.now()}` };
        setProducts(prev => [...prev, newProduct]);
        logActivity('إضافة صنف', `تم إضافة صنف جديد: ${newProduct.name}`);
        return newProduct;
    };

    const bulkAddProducts = (newProducts: Array<Partial<Product>>) => {
        let addedCount = 0;
        let skippedCount = 0;

        setProducts(prev => {
            const updated = [...prev];
            newProducts.forEach(pInput => {
                if (!pInput.name) return;

                const name = pInput.name.trim();
                const departmentId = pInput.departmentId || 'misc';
                const departmentName = pInput.departmentName || 'عام';

                // Check for duplicates
                const exists = updated.find(p => p.name === name && p.departmentId === departmentId);
                if (exists) {
                    skippedCount++;
                    return;
                }

                const price = typeof pInput.price === 'string' ? parseFloat(pInput.price) : (pInput.price || 0);

                const product: Product = {
                    id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name,
                    departmentId,
                    departmentName,
                    price: price,
                    category: pInput.category || departmentName,
                    description: pInput.description || '',
                    status: (pInput.status as any) || 'available',
                    reviewStatus: price > 0 ? 'ok' : 'needs_price',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                updated.push(product);
                addedCount++;
            });
            return updated;
        });

        logActivity('إضافة أصناف بالجملة', `تم إضافة ${addedCount} صنف جديد وتخطي ${skippedCount} مكرر.`);
        return { added: addedCount, skipped: skippedCount };
    };
    const updateProduct = (id: string, updatedProduct: Omit<Product, 'id'>) => {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updatedProduct, id } : p));
    };
    const deleteProduct = (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
        setProducts(prev => prev.filter(p => p.id !== id));
    };
    
    const updatePricesBatch = (operation: 'multiply' | 'divide', factor: number) => {
        if (isNaN(factor) || factor <= 0) {
            alert("المعامل يجب أن يكون رقمًا موجبًا.");
            return;
        }
        setProducts(prev => prev.map(p => ({
            ...p,
            price: operation === 'multiply' ? p.price * factor : p.price / factor,
            costPrice: p.costPrice ? (operation === 'multiply' ? p.costPrice * factor : p.costPrice / factor) : undefined
        })));
        alert("تم تحديث الأسعار بنجاح.");
    };

    const batchUpdateProducts = (productIds: string[], discountPercent: number) => {
        if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
            alert("الرجاء إدخال نسبة خصم صالحة بين 0 و 100.");
            return;
        }
        const factor = 1 - (discountPercent / 100);
        setProducts(prev => prev.map(p => {
            if (productIds.includes(p.id)) {
                // Set salePrice to null or undefined if discount is 0 to remove it
                const newSalePrice = discountPercent === 0 ? undefined : parseFloat((p.price * factor).toFixed(2));
                return {
                    ...p,
                    salePrice: newSalePrice
                };
            }
            return p;
        }));
        alert(`تم تطبيق خصم ${discountPercent}% على ${productIds.length} منتج.`);
    };


    // Orders (Sales, Delivery, Reservations)
    const createOrder = (type: OrderType, items: InvoiceItem[], customerInfo?: Invoice['customerInfo'], deliveryFee: number = 0, source?: Invoice['source'], notes?: string) => {
        if (!currentUser) throw new Error("No user is logged in.");

        const total = items.reduce((sum, item) => sum + item.lineTotal, 0) + deliveryFee;
        
        const isImmediate = type === 'sale';
        const isRestaurantOrder = type === 'dine_in' || type === 'takeaway';

        const newOrder: Invoice = {
            id: `${type.slice(0,3)}-${Date.now()}`,
            date: new Date().toISOString(),
            type,
            items: items.map(item => ({...item})),
            total,
            customerInfo,
            deliveryFee,
            source,
            notes,
            status: (isImmediate) ? 'completed' : 'pending',
            paymentStatus: (isImmediate || isRestaurantOrder) ? 'paid' : 'unpaid',
            processedBy: currentUser.username,
        };
        
        setInvoices(prev => [...prev, newOrder]);
        
        // Save customer if new

        if (isImmediate || isRestaurantOrder) { // Quick sale or restaurant order is paid immediately
            const targetAccountId = 'cash-default';

            addFinancialTransaction({
                description: `إيراد من فاتورة ${type === 'dine_in' ? 'صالة' : type === 'takeaway' ? 'سفري' : 'بيع'} رقم ${newOrder.id.substring(0,8)} (بواسطة ${currentUser.username})`,
                amount: newOrder.total,
                type: 'sale_income',
                toAccountId: targetAccountId,
                relatedInvoiceId: newOrder.id
            });
            newOrder.paidDate = new Date().toISOString();
        }
        return newOrder;
    };

    const onCompleteSale = (items: InvoiceItem[], options?: { customerInfo?: Invoice['customerInfo'], notes?: string, type?: OrderType }) => {
        if (!window.confirm('هل أنت متأكد من إتمام عملية البيع؟')) return;
        const order = createOrder(options?.type || 'sale', items, options?.customerInfo, 0, undefined, options?.notes);
        if (order) setInvoiceToPrint(order);
    };

    const onCreateDeliveryOrder = (cart: InvoiceItem[], customerInfo: any, deliveryFee: number, source: any) => {
        if (!window.confirm('هل أنت متأكد من إنشاء طلب التوصيل؟')) return;
        const order = createOrder('delivery', cart, customerInfo, deliveryFee, source);
        if (order) setInvoiceToPrint(order);
    };

    const onCreateReservation = (cart: InvoiceItem[], customerInfo: any) => {
        if (!window.confirm('هل أنت متأكد من إنشاء هذا الحجز؟')) return;
        const order = createOrder('reservation', cart, customerInfo);
        if (order) setInvoiceToPrint(order);
    };

    const updateOrderStatus = (orderId: string, status: OrderStatus, paymentStatus?: PaymentStatus) => {
        if (!window.confirm(`هل أنت متأكد من تغيير حالة الطلب إلى "${status}"؟`)) return;
        setInvoices(prev => prev.map(inv => {
            if (inv.id === orderId) {
                const wasCancelled = inv.status !== 'cancelled' && status === 'cancelled';
                const wasCompleted = inv.status !== 'completed' && status === 'completed';
                const wasDelivered = inv.status !== 'delivered' && status === 'delivered';
                
                if (wasCancelled) {
                    // No action needed
                }
                
                const updatedInvoice = { ...inv, status };
                if (paymentStatus) {
                    updatedInvoice.paymentStatus = paymentStatus;
                    if(paymentStatus === 'paid' && !inv.paidDate) {
                        updatedInvoice.paidDate = new Date().toISOString();
                         addFinancialTransaction({
                            description: `تحصيل فاتورة ${inv.type} رقم ${inv.id.substring(0,8)} (بواسطة ${inv.processedBy || 'غير معروف'})`,
                            amount: inv.total,
                            type: 'sale_income',
                            toAccountId: 'cash-default',
                            relatedInvoiceId: inv.id
                        });
                    }
                }
                return updatedInvoice;
            }
            return inv;
        }));
    };
    
    const onConvertToSale = (reservation: Invoice) => {
        if (!currentUser) return;
        if (!window.confirm(`هل أنت متأكد من تحويل الحجز رقم ${reservation.id.substring(0,8)} إلى عملية بيع؟ سيتم تحصيل مبلغ ${reservation.total}.`)) return;
        setInvoices(prev => prev.map(inv => inv.id === reservation.id ? { ...inv, type: 'sale', status: 'completed', paymentStatus: 'paid', paidDate: new Date().toISOString(), processedBy: currentUser.username } : inv));
        
        const targetAccountId = 'cash-default';
        
        addFinancialTransaction({
            description: `إيراد من تحويل الحجز ${reservation.id.substring(0,8)} (بواسطة ${currentUser.username})`,
            amount: reservation.total,
            type: 'sale_income',
            toAccountId: targetAccountId,
            relatedInvoiceId: reservation.id
        });
    };

    // Returns
    const processReturn = (originalInvoiceId: string, returnItems: InvoiceItem[]) => {
        if (!currentUser) return;
        if (!window.confirm('هل أنت متأكد من إتمام عملية الإرجاع؟ سيتم استرداد المبلغ.')) return;
        const total = returnItems.reduce((sum, item) => sum + item.lineTotal, 0);
        const newReturnInvoice: Invoice = {
            id: `ret-${Date.now()}`,
            date: new Date().toISOString(),
            type: 'return',
            items: returnItems,
            total: -total,
            status: 'completed',
            paymentStatus: 'paid', // Refund is considered a 'paid' transaction
            processedBy: currentUser.username,
        };
        setInvoices(prev => [...prev, newReturnInvoice]);
        
        const sourceAccountId = 'cash-default';

        addFinancialTransaction({
            description: `مرتجع من فاتورة ${originalInvoiceId.substring(0, 8)} (بواسطة ${currentUser.username})`,
            amount: total,
            type: 'return_refund',
            fromAccountId: sourceAccountId,
            relatedInvoiceId: newReturnInvoice.id,
            category: 'مرتجعات'
        });
    };

    const sendReturnRequest = (originalInvoice: Invoice, returnItems: InvoiceItem[]) => {
        if (!currentUser) return;
        const newRequest: ReturnRequest = {
            id: `req-ret-${Date.now()}`,
            requestDate: new Date().toISOString(),
            originalInvoiceId: originalInvoice.id,
            requestedBy: currentUser.username,
            status: 'pending',
            items: returnItems,
        };
        setReturnRequests(prev => [...prev, newRequest]);
        alert('تم إرسال طلب الإرجاع للمراجعة.');
    };

    const approveRequest = (requestId: string) => {
        if (!currentUser) return;
        if (!window.confirm('هل أنت متأكد من الموافقة على طلب الإرجاع؟ سيتم معالجة العملية مالياً وفي المخزون.')) return;
        const request = returnRequests.find(r => r.id === requestId);
        if (request && request.status === 'pending') {
            processReturn(request.originalInvoiceId, request.items);
            setReturnRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'approved', processedBy: currentUser.username, processedDate: new Date().toISOString() } : r));
        }
    };

    const rejectRequest = (requestId: string) => {
        if (!currentUser) return;
        if (!window.confirm('هل أنت متأكد من رفض طلب الإرجاع؟')) return;
        setReturnRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected', processedBy: currentUser.username, processedDate: new Date().toISOString() } : r));
    };

    const addTillCloseout = (data: Omit<TillCloseout, 'id'>) => {
        setTillCloseouts(prev => [...prev, { ...data, id: `closeout-${Date.now()}` }]);
    };

    // Expenses
    const addExpense = (expenseData: Omit<Expense, 'id'>) => {
        const newExpense: Expense = { ...expenseData, id: `exp-${Date.now()}` };
        setExpenses(prev => [...prev, newExpense]);
        
        // Treasury transaction
        addFinancialTransaction({
            description: `مصروف: ${newExpense.description} (${newExpense.status === 'completed' ? 'مكتمل' : 'معلق'})`,
            amount: newExpense.amount,
            type: 'expense',
            fromAccountId: newExpense.accountId,
            category: newExpense.category
        });

        logActivity('تسجيل مصروف', `تم تسجيل مصروف بقيمة ${newExpense.amount} - البيان: ${newExpense.description}`);
        return newExpense;
    };

    const addManualSale = (saleData: { 
        date: string, 
        amount: number, 
        departmentId: string, 
        description: string, 
        paymentMethod: string,
        notes?: string 
    }) => {
        if (!currentUser) return;
        
        const dept = departments.find(d => d.id === saleData.departmentId);
        
        const newInvoice: Invoice = {
            id: `man-${Date.now()}`,
            date: saleData.date,
            paidDate: saleData.date,
            type: 'sale',
            status: 'completed',
            paymentStatus: 'paid',
            total: saleData.amount,
            processedBy: currentUser.username,
            notes: saleData.notes,
            items: [{
                productId: 'manual-sale',
                productName: saleData.description,
                departmentId: saleData.departmentId,
                departmentName: dept?.name || 'غير محدد',
                quantity: 1,
                basePrice: saleData.amount,
                modifiers: [],
                modifiersTotal: 0,
                unitPrice: saleData.amount,
                lineTotal: saleData.amount
            }]
        };

        setInvoices(prev => [...prev, newInvoice]);

        // Treasury transaction
        addFinancialTransaction({
            description: `إيراد مبيعات يدوية/غلة: ${saleData.description}`,
            amount: saleData.amount,
            type: 'sale_income',
            toAccountId: 'cash-default', // Always to main till by default as per request
            relatedInvoiceId: newInvoice.id,
            category: 'مبيعات'
        });

        logActivity('تسجيل مبيعات يدوية', `تم تسجيل غلة بقيمة ${saleData.amount} لقسم ${dept?.name || 'غير محدد'}`);
        return newInvoice;
    };

    const deleteExpense = (id: string) => {
        const expenseToDelete = expenses.find(e => e.id === id);
        if (expenseToDelete) {
            if (!window.confirm('هل أنت متأكد من إلغاء هذا المصروف؟ سيتم استرداد المبلغ للحساب.')) return;
            setExpenses(prev => prev.filter(e => e.id !== id));
            addFinancialTransaction({
                description: `إلغاء المصروف: ${expenseToDelete.description}`,
                amount: expenseToDelete.amount,
                type: 'expense_reversal',
                toAccountId: expenseToDelete.accountId,
                category: expenseToDelete.category
            });
        }
    };

    // Financial Accounts
    const onSaveAccount = (data: Omit<FinancialAccount, 'id'>) => {
        setAccounts(prev => [...prev, {...data, id: `acc-${Date.now()}`}]);
    };
    
    // FIX: Implement missing user management functions.
    const addUser = (userData: Omit<User, 'id' | 'passwordHash' | 'salt'> & { password: string }): User => {
        const salt = `salt_${Date.now()}_${Math.random()}`;
        const newUser: User = {
            id: `user-${Date.now()}`,
            username: userData.username,
            role: userData.role,
            salt,
            passwordHash: simpleHash(userData.password, salt)
        };
        setUsers(prev => [...prev, newUser]);
        return newUser;
    };

    const updateUser = (id: string, userData: Partial<Omit<User, 'id' | 'passwordHash' | 'salt'>> & { password?: string }) => {
        setUsers(prev => prev.map(u => {
            if (u.id === id) {
                const updatedUser: User = { ...u };
                if (userData.username) updatedUser.username = userData.username;
                if (userData.role) updatedUser.role = userData.role;

                if (userData.password) {
                    const newSalt = `salt_${Date.now()}_${Math.random()}`;
                    updatedUser.salt = newSalt;
                    updatedUser.passwordHash = simpleHash(userData.password, newSalt);
                }
                return updatedUser;
            }
            return u;
        }));
    };

    const deleteUser = (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
        setUsers(prev => prev.filter(u => u.id !== id));
    };

    // Other
    const addCustomer = (customer: Omit<Customer, 'id'>) => { const newCust = {id: `cust-${Date.now()}`, ...customer}; setCustomers(c => [...c, newCust]); return newCust; };
    const updateCustomer = (id: string, customer: Omit<Customer, 'id'>) => { setCustomers(c => c.map(cu => cu.id === id ? {id, ...customer} : cu)) };
    const deleteCustomer = (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا العميل؟')) return;
        setCustomers(c => c.filter(cu => cu.id !== id));
    };

    // --- RENDER LOGIC ---
    if (!currentUser) {
        return <LoginView onLogin={login} />;
    }

    const views: { [key: string]: {element: React.ReactNode, label: string, icon: string, roles: Array<'admin' | 'cashier'>} } = {
        dashboard: { element: <DashboardView invoices={invoices} expenses={expenses} products={products} customers={customers} accounts={accounts} departments={departments} onAddManualSale={addManualSale} onAddExpense={addExpense} />, label: "لوحة التحكم", icon: "dashboard", roles: ['admin'] },
        reports: { element: <ReportsView invoices={invoices} products={products} expenses={expenses} />, label: "التقارير", icon: "analytics", roles: ['admin'] },
        financialSummary: { element: <FinancialSummaryView invoices={invoices} expenses={expenses} transactions={transactions} accountBalances={accountBalances} />, label: "الملخص المالي", icon: "summarize", roles: ['admin'] },
        pos: { element: <POSView products={products} customers={customers} modifiers={modifiers} onCompleteSale={onCompleteSale} onCreateDeliveryOrder={onCreateDeliveryOrder} onCreateReservation={onCreateReservation} />, label: "نقطة البيع", icon: "point_of_sale", roles: ['admin', 'cashier'] },
        orders: { element: <OrdersView invoices={invoices} users={users} onUpdateStatus={updateOrderStatus} onConvertToSale={onConvertToSale} processReturn={processReturn} sendReturnRequest={sendReturnRequest} currentUser={currentUser} shopName={shopName} shopAddress={shopAddress} />, label: "الطلبات", icon: "receipt_long", roles: ['admin', 'cashier'] },
        invoices: { element: <InvoicesView invoices={invoices} processReturn={processReturn} sendReturnRequest={sendReturnRequest} currentUser={currentUser} shopName={shopName} shopAddress={shopAddress} />, label: "الفواتير", icon: "receipt", roles: ['admin', 'cashier'] },
        departments: { element: <DepartmentsView departments={departments} addDepartment={addDepartment} updateDepartment={updateDepartment} deleteDepartment={deleteDepartment} />, label: "الأقسام", icon: "category", roles: ['admin'] },
        products: { element: <ProductsView products={products} addProduct={addProduct} updateProduct={updateProduct} deleteProduct={deleteProduct} onBatchUpdate={batchUpdateProducts} onBulkAdd={bulkAddProducts} departments={departments} modifiers={modifiers} addModifier={addModifier} updateModifier={updateModifier} deleteModifier={deleteModifier} />, label: "الأصناف", icon: "inventory_2", roles: ['admin'] },
        returnRequests: { element: <ReturnRequestsView requests={returnRequests} approveRequest={approveRequest} rejectRequest={rejectRequest} />, label: "طلبات الإرجاع", icon: "rule", roles: ['admin'] },
        expenses: { element: <ExpensesView expenses={expenses} addExpense={addExpense} accounts={accounts} departments={departments} />, label: "المصروفات", icon: "payments", roles: ['admin', 'cashier'] },
        customers: { element: <CustomersView customers={customers} addCustomer={addCustomer} updateCustomer={updateCustomer} deleteCustomer={deleteCustomer} />, label: "العملاء", icon: "groups", roles: ['admin'] },
        finance: { element: <FinanceView accounts={accounts} accountBalances={accountBalances} transactions={transactions} budgets={budgets} onSaveAccount={onSaveAccount} onSaveTransaction={addFinancialTransaction} onSaveBudget={(b) => setBudgets(p=>[...p, {...b, id: `budget-${Date.now()}`}])} />, label: "الخزينة", icon: "account_balance", roles: ['admin'] },
        tillCloseouts: { element: <TillCloseoutsView tillCloseouts={tillCloseouts} />, label: "تقارير الصناديق", icon: "archive", roles: ['admin'] },
        users: { element: <UsersView users={users} addUser={addUser} updateUser={updateUser} deleteUser={deleteUser} currentUser={currentUser} />, label: "المستخدمون", icon: "manage_accounts", roles: ['admin'] },
        activityLog: { element: <ActivityLogView logs={activityLog} />, label: "سجل النشاط", icon: "history", roles: ['admin'] },
        cashierTools: { element: <CashierToolsView currentUser={currentUser} />, label: "إدارة البيانات", icon: "database", roles: ['cashier'] },
        settings: { element: <SettingsView onUpdatePrices={updatePricesBatch} />, label: "الإعدادات", icon: "settings", roles: ['admin'] },
    };

    const SidebarLink: React.FC<{viewKey: string}> = ({viewKey}) => {
        const view = views[viewKey];
        if (!view || !view.roles.includes(currentUser.role)) return null;
        return (
            <button onClick={() => { setCurrentView(viewKey); setIsSidebarOpen(false); }} className={`w-full text-right flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${currentView === viewKey ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 font-bold scale-[1.02]' : 'hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 font-medium'}`}>
                <span className="material-symbols-outlined">{view.icon}</span>
                <span>{view.label}</span>
            </button>
        );
    };
    
    const adminSidebarOrder = ['dashboard', 'reports', 'financialSummary', 'pos', 'orders', 'invoices', 'departments', 'returnRequests', 'products', 'expenses', 'customers', 'finance', 'tillCloseouts', 'users', 'activityLog', 'settings'];
    const cashierSidebarOrder = ['pos', 'orders', 'invoices', 'cashierTools'];

    const sidebarOrder = currentUser.role === 'admin' ? adminSidebarOrder : cashierSidebarOrder;


    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans" dir="rtl">
            <aside className={`bg-white border-l border-slate-100 h-full transform ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out w-64 fixed md:static right-0 z-40 md:flex-shrink-0 shadow-2xl md:shadow-none`}>
                 <div className="p-6 flex items-center justify-between border-b border-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 text-white p-1.5 rounded-xl shadow-inner">
                             <Logo className="h-6 w-6" />
                        </div>
                        <h2 className="text-xl font-bold bg-gradient-to-l from-indigo-600 to-indigo-800 bg-clip-text text-transparent">مطابخ الشرق</h2>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-500 hover:text-indigo-600 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100%-80px)] custom-scrollbar">
                    {sidebarOrder.map(key => <SidebarLink key={key} viewKey={key} />)}
                </nav>
            </aside>
             {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden transition-opacity"></div>}

            <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    currentUser={currentUser} 
                    onLogout={logout} 
                    toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    onOpenCloseTillModal={() => setIsCloseTillModalOpen(true)}
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-dark-50">
                    {views[currentView]?.element || views[currentUser.role === 'admin' ? 'dashboard' : 'pos'].element}
                </main>
            </div>
            {invoiceToPrint && <PrintInvoice invoice={invoiceToPrint} onClose={() => setInvoiceToPrint(null)} shopName={shopName} shopAddress={shopAddress} />}
            {currentUser.role === 'admin' && 
                <AIChatAssistant 
                    products={products}
                    invoices={invoices}
                    expenses={expenses}
                    customers={customers}
                    addProduct={addProduct}
                    updateProduct={updateProduct}
                    deleteProduct={deleteProduct}
                    addExpense={(exp) => addExpense({...exp, accountId: 'cash-default'})}
                    deleteExpense={deleteExpense}
                    addCustomer={addCustomer}
                    updateCustomer={updateCustomer}
                    deleteCustomer={deleteCustomer}
                    onCompleteSale={onCompleteSale}
                />
            }
            {isCloseTillModalOpen && currentUser && (
                <CloseTillModal
                    invoices={invoices}
                    users={users}
                    currentUser={currentUser}
                    onClose={() => setIsCloseTillModalOpen(false)}
                    onConfirmCloseout={addTillCloseout}
                />
            )}
        </div>
    );
};

export default App;