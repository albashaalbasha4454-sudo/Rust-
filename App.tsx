import React, { useState, useMemo, useCallback, useEffect } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import useAuth from './hooks/useAuth';
import { initialUsers, initialProducts, initialCustomers, initialAccounts, initialModifierGroups } from './initialData';

import type { Product, Invoice, InvoiceItem, User, Expense, ReturnRequest, Customer, FinancialAccount, FinancialTransaction, OrderType, OrderStatus, PaymentStatus, Budget, TillCloseout, Shift, AuditLog, ModifierGroup, ImportedShiftRecord, PaymentMethod } from './types';

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
import AuditLogView from './components/AuditLogView';


const simpleHash = (password: string, salt: string) => `hashed_${password}_with_${salt}`;

const App: React.FC = () => {
    // --- STATE MANAGEMENT ---
    const [users, setUsers] = useLocalStorage<User[]>('users', initialUsers);
    const { currentUser, login, logout } = useAuth(users);

    const [products, setProducts] = useLocalStorage<Product[]>('products', initialProducts);
    const [modifierGroups, setModifierGroups] = useLocalStorage<ModifierGroup[]>('modifierGroups', initialModifierGroups);
    const [invoices, setInvoices] = useLocalStorage<Invoice[]>('invoices', []);
    const [expenses, setExpenses] = useLocalStorage<Expense[]>('expenses', []);
    const [returnRequests, setReturnRequests] = useLocalStorage<ReturnRequest[]>('returnRequests', []);
    const [customers, setCustomers] = useLocalStorage<Customer[]>('customers', initialCustomers);
    const [accounts, setAccounts] = useLocalStorage<FinancialAccount[]>('financialAccounts', initialAccounts);
    const [transactions, setTransactions] = useLocalStorage<FinancialTransaction[]>('financialTransactions', []);
    const [budgets, setBudgets] = useLocalStorage<Budget[]>('budgets', []);
    const [shifts, setShifts] = useLocalStorage<Shift[]>('shifts', []);
    const [auditLogs, setAuditLogs] = useLocalStorage<AuditLog[]>('auditLogs', []);
    const [importedShifts, setImportedShifts] = useLocalStorage<ImportedShiftRecord[]>('importedShifts', []);
    const [tillCloseouts, setTillCloseouts] = useLocalStorage<TillCloseout[]>('tillCloseouts', []);
    const [configVersion, setConfigVersion] = useLocalStorage<string>('configVersion', '1.0.0');
    
    // Device ID handling
    const [deviceId] = useLocalStorage<string>('deviceId', `DEV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

    const activeShift = useMemo(() => {
        if (!currentUser) return null;
        return shifts.find(s => s.status === 'open' && s.userId === currentUser.id);
    }, [shifts, currentUser]);

    const addAuditLog = useCallback((action: AuditLog['action'], entityType: AuditLog['entityType'], entityId: string, description: string) => {
        if (!currentUser) return;
        const newLog: AuditLog = {
            id: `log-${Date.now()}`,
            date: new Date().toISOString(),
            userId: currentUser.id,
            username: currentUser.username,
            userRole: currentUser.role,
            deviceId,
            action,
            entityType,
            entityId,
            description
        };
        setAuditLogs(prev => [newLog, ...prev]);
    }, [currentUser, deviceId, setAuditLogs]);

    const openShift = (openingCash: number) => {
        if (!currentUser) return;
        const shiftNumber = `SHIFT-${new Date().toISOString().split('T')[0]}-${shifts.length + 1}`;
        const newShift: Shift = {
            id: `shift-${Date.now()}`,
            number: shiftNumber,
            startTime: new Date().toISOString(),
            userId: currentUser.id,
            username: currentUser.username,
            deviceId,
            status: 'open',
            openingCash,
            cashSales: 0,
            cardSales: 0,
            creditSales: 0,
            cashReturns: 0,
            cashExpenses: 0,
            expectedCash: openingCash,
            configVersion
        };
        setShifts(prev => [...prev, newShift]);
        addAuditLog('OPEN_SHIFT', 'shift', newShift.id, `فتح وردية جديدة برصيد: ${openingCash}`);
    };

    const closeShift = (actualCash: number, notes: string) => {
        if (!activeShift) return;
        const updatedShift: Shift = {
            ...activeShift,
            status: 'closed',
            endTime: new Date().toISOString(),
            actualCash,
            closingNotes: notes,
            difference: actualCash - (activeShift.expectedCash || 0)
        };
        setShifts(prev => prev.map(s => s.id === updatedShift.id ? updatedShift : s));
        addAuditLog('CLOSE_SHIFT', 'shift', updatedShift.id, `إغلاق الوردية بفرق: ${updatedShift.difference}`);
    };
    
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
                    accounts, transactions, budgets,
                    timestamp: new Date().toISOString()
                };
                localStorage.setItem('auto_backup_snapshot', JSON.stringify(snapshot));
            } catch (e) {
                console.error('Auto-backup failed:', e);
            }
        };

        const interval = setInterval(backupData, 5 * 60 * 1000); // Every 5 minutes
        return () => clearInterval(interval);
    }, [users, products, invoices, expenses, returnRequests, customers, accounts, transactions, budgets]);

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

    // --- CORE BUSINESS LOGIC ---
    const upsertCustomerFromInvoice = (invoice: Invoice) => {
        if (!invoice.customerInfo?.phone) return;
        
        const phone = invoice.customerInfo.phone;
        const name = invoice.customerInfo.name;
        const address = invoice.customerInfo.address;
        
        setCustomers(prev => {
            const existingIndex = prev.findIndex(c => c.phone === phone);
            if (existingIndex > -1) {
                const existing = prev[existingIndex];
                const updated = [...prev];
                updated[existingIndex] = {
                    ...existing,
                    name: name || existing.name,
                    address: address || existing.address,
                    lastOrderAt: invoice.date,
                    totalOrders: (existing.totalOrders || 0) + (invoice.type === 'return' ? 0 : 1),
                    totalSpent: (existing.totalSpent || 0) + (invoice.type === 'return' ? -invoice.total : invoice.total)
                };
                return updated;
            } else {
                const newCustomer: Customer = {
                    id: `cust-${Date.now()}`,
                    name: name || 'عميل جديد',
                    phone: phone,
                    address: address,
                    createdAt: invoice.date,
                    lastOrderAt: invoice.date,
                    totalOrders: 1,
                    totalSpent: invoice.total
                };
                return [...prev, newCustomer];
            }
        });
    };

    // Products
    const addProduct = (product: Omit<Product, 'id'>) => {
        const newProduct = { ...product, id: `prod-${Date.now()}` };
        setProducts(prev => [...prev, newProduct]);
        return newProduct;
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


    const createOrder = (type: OrderType, items: InvoiceItem[], customerInfo?: Invoice['customerInfo'], deliveryFee: number = 0, source?: Invoice['source'], notes?: string, paymentMethod: PaymentMethod = 'cash') => {
        if (!currentUser) throw new Error("No user is logged in.");

        const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
        const total = subtotal + deliveryFee;
        const totalCost = items.reduce((sum, item) => sum + (item.cost || 0) * (item.quantity || 1), 0);
        const totalProfit = type === 'return' ? - (total - totalCost) : (total - totalCost);
        
        const isImmediate = type === 'sale' || type === 'dine_in' || type === 'takeaway' || type === 'return';
        const saleSource: Invoice['saleSource'] = currentUser.role === 'admin' 
            ? 'admin_direct' 
            : 'cashier_shift';

        const newOrder: Invoice = {
            id: `${type.slice(0,3)}-${Date.now()}`,
            date: new Date().toISOString(),
            type,
            items: items.map(item => ({...item})),
            subtotal,
            discount: 0,
            tax: 0,
            total,
            totalProfit,
            customerInfo,
            deliveryFee,
            source,
            notes,
            status: 'completed',
            paymentStatus: isImmediate ? 'paid' : 'unpaid',
            paymentMethod,
            userId: currentUser.id,
            username: currentUser.username,
            userRole: currentUser.role,
            deviceId,
            saleSource
        };
        
        if (paymentMethod !== 'mixed' && paymentMethod !== 'credit') {
            newOrder.payments = [{
                id: `pay-${Date.now()}`,
                invoiceId: newOrder.id,
                deviceId,
                method: paymentMethod as 'cash' | 'card',
                amount: total,
                date: newOrder.date,
                userId: currentUser.id,
                username: currentUser.username,
                userRole: currentUser.role
            }];
        }

        setInvoices(prev => [...prev, newOrder]);
        
        // Auto-upsert customer if for delivery or has customer phone
        if (newOrder.customerInfo?.phone) {
            upsertCustomerFromInvoice(newOrder);
        }
        
        if (isImmediate) {
            const targetAccountId = 'cash-default';

            addFinancialTransaction({
                description: `إيراد من فاتورة ${type} رقم ${newOrder.id.substring(0,8)}`,
                amount: newOrder.total,
                type: type === 'return' ? 'return_refund' : 'sale_income',
                toAccountId: type === 'return' ? undefined : targetAccountId,
                fromAccountId: type === 'return' ? targetAccountId : undefined,
                relatedInvoiceId: newOrder.id
            });
            newOrder.paidDate = new Date().toISOString();
        }
        return newOrder;
    };

    const onCompleteSale = (items: InvoiceItem[], options?: { customerInfo?: Invoice['customerInfo'], notes?: string, type?: OrderType, paymentMethod?: PaymentMethod }) => {
        if (!window.confirm('هل أنت متأكد من إتمام العملية؟')) return;
        const order = createOrder(options?.type || 'sale', items, options?.customerInfo, 0, undefined, options?.notes, options?.paymentMethod || 'cash');
        if (order) {
            setInvoiceToPrint(order);
            addAuditLog(order.type === 'return' ? 'CREATE_RETURN' : 'CREATE_INVOICE', 'invoice', order.id, `إنشاء فاتورة بقيمة: ${order.total}`);
        }
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
        
        const returnOrder = createOrder('return', returnItems, undefined, 0, undefined, `مرتجع من فاتورة ${originalInvoiceId.substring(0, 8)}`);
        
        if (returnOrder) {
            const total = Math.abs(returnOrder.total);
            const sourceAccountId = 'cash-default';
            // Financial transaction is already added inside createOrder logic? 
            // Wait, createOrder in App.tsx line 297 adds income/return_refund.
            // So we don't need to add it again here.
        }
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

    const addExpense = (expenseData: Partial<Expense>) => {
        if (!currentUser) return;
        if (!window.confirm(`هل أنت متأكد من تسجيل مصروف بمبلغ ${expenseData.amount}؟`)) return;
        
        const newExpense: Expense = {
            id: `exp-${Date.now()}`,
            amount: expenseData.amount || 0,
            category: expenseData.category || 'عام',
            description: expenseData.description || '',
            date: new Date().toISOString(),
            userId: currentUser.id,
            username: currentUser.username,
            userRole: currentUser.role,
            deviceId,
            paymentMethod: expenseData.paymentMethod || 'cash',
            affectsCash: expenseData.affectsCash ?? true,
            status: 'active',
            accountId: expenseData.accountId || 'cash-default'
        };
        setExpenses(prev => [...prev, newExpense]);
        
        addFinancialTransaction({
            description: newExpense.description,
            amount: newExpense.amount,
            type: 'expense',
            fromAccountId: newExpense.accountId,
            category: newExpense.category
        });
        addAuditLog('CREATE_EXPENSE', 'expense', newExpense.id, `إضافة مصروف بقيمة: ${newExpense.amount}`);
    };

    const reverseExpense = (expenseId: string, reason: string) => {
        if (!currentUser || currentUser.role !== 'admin') return;
        setExpenses(prev => prev.map(exp => {
            if (exp.id === expenseId) {
                const reversedExp: Expense = {
                    ...exp,
                    status: 'reversed',
                    reversedBy: currentUser.username,
                    reversedAt: new Date().toISOString(),
                    reversalReason: reason
                };
                
                addFinancialTransaction({
                    description: `إلغاء المصروف: ${exp.description} بسبب ${reason}`,
                    amount: exp.amount,
                    type: 'expense_reversal',
                    toAccountId: exp.accountId,
                    category: exp.category
                });
                addAuditLog('REVERSE_EXPENSE', 'expense', exp.id, `عكس مصروف بسبب: ${reason}`);
                return reversedExp;
            }
            return exp;
        }));
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
        dashboard: { element: <DashboardView invoices={invoices} expenses={expenses} products={products} customers={customers} />, label: "لوحة التحكم", icon: "dashboard", roles: ['admin'] },
        reports: { element: <ReportsView invoices={invoices} products={products} expenses={expenses} />, label: "التقارير", icon: "analytics", roles: ['admin'] },
        financialSummary: { element: <FinancialSummaryView invoices={invoices} expenses={expenses} transactions={transactions} accountBalances={accountBalances} />, label: "الملخص المالي", icon: "summarize", roles: ['admin'] },
        pos: { element: <POSView products={products} modifierGroups={modifierGroups} customers={customers} onCompleteSale={onCompleteSale} onCreateDeliveryOrder={onCreateDeliveryOrder} onCreateReservation={onCreateReservation} activeShift={activeShift} openShift={openShift} />, label: "نقطة البيع", icon: "point_of_sale", roles: ['admin', 'cashier'] },
        orders: { element: <OrdersView invoices={invoices} users={users} onUpdateStatus={updateOrderStatus} onConvertToSale={onConvertToSale} processReturn={processReturn} sendReturnRequest={sendReturnRequest} currentUser={currentUser} shopName={shopName} shopAddress={shopAddress} />, label: "الطلبات", icon: "receipt_long", roles: ['admin', 'cashier'] },
        invoices: { element: <InvoicesView invoices={invoices} processReturn={processReturn} sendReturnRequest={sendReturnRequest} currentUser={currentUser} shopName={shopName} shopAddress={shopAddress} />, label: "الفواتير", icon: "receipt", roles: ['admin', 'cashier'] },
        products: { element: <ProductsView products={products} modifierGroups={modifierGroups} addProduct={addProduct} updateProduct={updateProduct} deleteProduct={deleteProduct} onBatchUpdate={batchUpdateProducts} />, label: "الأصناف", icon: "inventory_2", roles: ['admin'] },
        returnRequests: { element: <ReturnRequestsView requests={returnRequests} approveRequest={approveRequest} rejectRequest={rejectRequest} />, label: "طلبات الإرجاع", icon: "rule", roles: ['admin'] },
        expenses: { element: <ExpensesView expenses={expenses} accounts={accounts} addExpense={addExpense} reverseExpense={reverseExpense} isAdmin={currentUser.role === 'admin'} />, label: "المصروفات", icon: "payments", roles: ['admin', 'cashier'] },
        customers: { element: <CustomersView customers={customers} addCustomer={addCustomer} updateCustomer={updateCustomer} deleteCustomer={deleteCustomer} />, label: "العملاء", icon: "groups", roles: ['admin'] },
        finance: { element: <FinanceView 
            accounts={accounts} 
            accountBalances={accountBalances} 
            transactions={transactions} 
            budgets={budgets} 
            shifts={shifts}
            importedShifts={importedShifts}
            auditLogs={auditLogs}
            deviceId={deviceId}
            currentUser={currentUser}
            onSaveAccount={onSaveAccount} 
            onSaveTransaction={addFinancialTransaction} 
            onSaveBudget={(b) => setBudgets(p=>[...p, {...b, id: `budget-${Date.now()}`}])} 
            setInvoices={setInvoices}
            setExpenses={setExpenses}
            setShifts={setShifts}
            setImportedShifts={setImportedShifts}
            setProducts={setProducts}
            setModifierGroups={setModifierGroups}
            setConfigVersion={setConfigVersion}
        />, label: "الخزينة والبيانات", icon: "account_balance", roles: ['admin'] },
        tillCloseouts: { element: <TillCloseoutsView tillCloseouts={tillCloseouts} shifts={shifts} />, label: "أرشيف الورديات", icon: "archive", roles: ['admin'] },
        users: { element: <UsersView users={users} addUser={addUser} updateUser={updateUser} deleteUser={deleteUser} currentUser={currentUser} />, label: "المستخدمون", icon: "manage_accounts", roles: ['admin'] },
        auditLog: { element: <AuditLogView logs={auditLogs} />, label: "سجل النشاط", icon: "history", roles: ['admin'] },
        settings: { element: <SettingsView onUpdatePrices={updatePricesBatch} />, label: "الإعدادات", icon: "settings", roles: ['admin'] },
    };

    const SidebarLink: React.FC<{viewKey: string}> = ({viewKey}) => {
        const view = views[viewKey];
        if (!view || !view.roles.includes(currentUser.role)) return null;
        return (
            <button onClick={() => { setCurrentView(viewKey); setIsSidebarOpen(false); }} className={`w-full text-right flex items-center gap-4 px-4 py-3 rounded-lg transition-colors ${currentView === viewKey ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' : 'hover:bg-brand-50 text-dark-700'}`}>
                <span className="material-symbols-outlined">{view.icon}</span>
                <span>{view.label}</span>
            </button>
        );
    };
    
    const adminSidebarOrder = ['dashboard', 'reports', 'financialSummary', 'pos', 'orders', 'invoices', 'returnRequests', 'products', 'expenses', 'customers', 'finance', 'tillCloseouts', 'users', 'auditLog', 'settings'];
    const cashierSidebarOrder = ['pos', 'orders', 'invoices', 'cashierTools'];

    const sidebarOrder = currentUser.role === 'admin' ? adminSidebarOrder : cashierSidebarOrder;


    return (
        <div className="flex h-screen bg-dark-50 overflow-hidden" dir="rtl">
            <aside className={`bg-white border-l border-dark-100 h-full transform ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out w-64 fixed md:static right-0 z-30 md:flex-shrink-0 shadow-2xl md:shadow-none`}>
                 <div className="p-6 flex items-center justify-between border-b border-dark-50">
                    <div className="flex items-center gap-3">
                        <Logo className="h-10 w-10" />
                        <h2 className="text-xl font-black text-dark-900">مطابخ الشرق</h2>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-dark-500 hover:text-brand-600 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100%-80px)] custom-scrollbar">
                    {sidebarOrder.map(key => <SidebarLink key={key} viewKey={key} />)}
                </nav>
            </aside>
             {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"></div>}

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
            {isCloseTillModalOpen && currentUser && (
                <CloseTillModal
                    invoices={invoices}
                    expenses={expenses}
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