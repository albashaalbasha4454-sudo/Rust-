import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { Invoice, Product, Expense, FinancialTransaction, TillCloseout, User } from '../types';
import { Chart, registerables } from 'chart.js';
import InputField from './common/InputField';
import * as XLSX from 'xlsx';

Chart.register(...registerables);

const StatCard = ({ title, value, icon, valueClassName }: { title: string; value: string | number; icon: string; valueClassName?: string }) => (
    <div className="bg-slate-50 p-4 rounded-xl shadow-sm flex items-center gap-4 border border-slate-200">
        <div className={`p-3 rounded-full ${valueClassName} bg-opacity-10`}>
            <span className={`material-symbols-outlined text-3xl ${valueClassName}`}>{icon}</span>
        </div>
        <div>
            <h3 className="text-slate-500 text-sm">{title}</h3>
            <p className={`text-xl font-bold ${valueClassName || 'text-slate-800'}`}>{value}</p>
        </div>
    </div>
);

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg h-96">
        <h3 className="text-xl font-bold text-slate-800 mb-4">{title}</h3>
        <div className="relative h-72">{children}</div>
    </div>
);


const ReportsView: React.FC<{
  invoices: Invoice[];
  products: Product[];
  expenses: Expense[];
  transactions: FinancialTransaction[];
  tillCloseouts: TillCloseout[];
  users: User[];
  accountBalances: {[key: string]: number};
}> = ({ invoices, products, expenses, transactions, tillCloseouts, users, accountBalances }) => {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today);
  const [selectedItemForReport, setSelectedItemForReport] = useState<string | null>(null);

  const salesByCategoryChartRef = useRef<HTMLCanvasElement>(null);
  const topProductsChartRef = useRef<HTMLCanvasElement>(null);
  const profitExpenseChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstances = useRef<{ [key: string]: Chart | null }>({});

  const filteredData = useMemo(() => {
    const start = startDate ? new Date(startDate) : new Date('1970-01-01');
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999); // Include the whole end day

    const salesInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.paidDate || inv.date);
        const isCompletedOrder = (inv.type === 'sale' || inv.type === 'dine_in' || inv.type === 'takeaway' || ((inv.type === 'delivery' || inv.type === 'reservation') && inv.status === 'completed' && inv.paymentStatus === 'paid'));
        const isReturn = inv.type === 'return';
        return (isCompletedOrder || isReturn) && invDate >= start && invDate <= end;
    });
    
    const filteredExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= start && expDate <= end;
    });

    // 1. itemSalesData
    const itemSalesMap: Record<string, { soldQty: number, returnedQty: number, totalSale: number, totalCost: number, itemExpenses: number }> = {};
    salesInvoices.forEach(inv => {
      const isReturn = inv.type === 'return';
      inv.items.forEach(item => {
        if (!itemSalesMap[item.productName]) {
          itemSalesMap[item.productName] = { soldQty: 0, returnedQty: 0, totalSale: 0, totalCost: 0, itemExpenses: 0 };
        }
        
        if (isReturn) {
            itemSalesMap[item.productName].returnedQty += 1;
            const itemSale = (item.price - (item.discount || 0)) + (item.modifiers?.reduce((s, m) => s + m.price, 0) || 0);
            itemSalesMap[item.productName].totalSale -= itemSale;
            const p = products.find(prod => prod.id === item.productId);
            itemSalesMap[item.productName].totalCost -= (p?.cost || item.cost || 0);
        } else {
            itemSalesMap[item.productName].soldQty += 1;
            const itemSale = (item.price - (item.discount || 0)) + (item.modifiers?.reduce((s, m) => s + m.price, 0) || 0);
            itemSalesMap[item.productName].totalSale += itemSale;
            const p = products.find(prod => prod.id === item.productId);
            itemSalesMap[item.productName].totalCost += (p?.cost || item.cost || 0);
        }
      });
    });

    filteredExpenses.forEach(exp => {
        if (exp.category && itemSalesMap[exp.category]) {
            itemSalesMap[exp.category].itemExpenses += exp.amount;
        }
    });

    const itemSalesData = Object.keys(itemSalesMap).map(name => {
      const { soldQty, returnedQty, totalSale, totalCost, itemExpenses } = itemSalesMap[name];
      const netQty = soldQty - returnedQty;
      const netProfit = totalSale - totalCost - itemExpenses;
      return {
        name,
        soldQty,
        returnedQty,
        netQty,
        totalSale,
        totalCost,
        itemExpenses,
        netProfit
      };
    }).sort((a,b) => b.totalSale - a.totalSale);

    return { salesInvoices, filteredExpenses, itemSalesData };
  }, [invoices, expenses, startDate, endDate, products]);


  const reportStats = useMemo(() => {
    const { salesInvoices, filteredExpenses } = filteredData;
    const totalRevenue = salesInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalProfit = salesInvoices.reduce((sum, inv) => {
        const cost = inv.items.reduce((c_sum, item) => {
            const p = products.find(prod => prod.id === item.productId);
            return c_sum + (p?.cost || item.cost || 0);
        }, 0);
        return sum + (inv.total - cost);
    }, 0);
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalProfit - totalExpenses;
    return { totalRevenue, totalProfit, totalExpenses, netProfit };
  }, [filteredData, products]);

  // Cleanup effect
  useEffect(() => {
    return () => {
        // FIX: Using Object.keys to iterate and destroy charts to ensure proper type inference.
        Object.keys(chartInstances.current).forEach(key => chartInstances.current[key]?.destroy());
    }
  }, []);

  // Update charts effect
  useEffect(() => {
    // FIX: Using Object.keys to iterate and destroy charts to ensure proper type inference.
    Object.keys(chartInstances.current).forEach(key => chartInstances.current[key]?.destroy());
    const { salesInvoices, filteredExpenses } = filteredData;

    // --- Chart 1: Sales by Category ---
    const salesByCategoryCtx = salesByCategoryChartRef.current?.getContext('2d');
    if (salesByCategoryCtx) {
        const categorySales: { [key: string]: number } = {};
        salesInvoices.forEach(inv => {
            inv.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                const category = product?.category || 'غير مصنف';
                const itemTotal = (item.price - (item.discount || 0));
                categorySales[category] = (categorySales[category] || 0) + itemTotal;
            });
        });
        const labels = Object.keys(categorySales);
        const data = Object.values(categorySales);

        chartInstances.current.salesByCategory = new Chart(salesByCategoryCtx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    label: 'المبيعات حسب التصنيف',
                    data,
                    backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#6b7280'],
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // --- Chart 2: Top Selling Products ---
    const topProductsCtx = topProductsChartRef.current?.getContext('2d');
    if (topProductsCtx) {
        const productSales: { [key: string]: { name: string, total: number } } = {};
        salesInvoices.forEach(inv => {
            inv.items.forEach(item => {
                const itemTotal = (item.price - (item.discount || 0));
                if (!productSales[item.productId]) {
                    productSales[item.productId] = { name: item.productName, total: 0 };
                }
                productSales[item.productId].total += itemTotal;
            });
        });
        const topProducts = Object.values(productSales).sort((a,b) => b.total - a.total).slice(0, 5);

        chartInstances.current.topProducts = new Chart(topProductsCtx, {
            type: 'bar',
            data: {
                labels: topProducts.map(p => p.name),
                datasets: [{
                    label: 'إجمالي الإيرادات',
                    data: topProducts.map(p => p.total),
                    backgroundColor: '#3b82f6',
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' }
        });
    }

    // --- Chart 3: Profit vs Expense Daily ---
    const profitExpenseCtx = profitExpenseChartRef.current?.getContext('2d');
    if(profitExpenseCtx) {
        const dailyData: { [date: string]: { profit: number, expense: number } } = {};
        salesInvoices.forEach(inv => {
            const day = new Date(inv.date).toISOString().split('T')[0];
            if (!dailyData[day]) dailyData[day] = { profit: 0, expense: 0 };
            
            const cost = inv.items.reduce((c_sum, item) => {
                const p = products.find(prod => prod.id === item.productId);
                return c_sum + (p?.cost || item.cost || 0);
            }, 0);
            
            dailyData[day].profit += (inv.total - cost);
        });
        filteredExpenses.forEach(exp => {
            const day = new Date(exp.date).toISOString().split('T')[0];
            if (!dailyData[day]) dailyData[day] = { profit: 0, expense: 0 };
            dailyData[day].expense += exp.amount;
        });

        const sortedDays = Object.keys(dailyData).sort();

        chartInstances.current.profitExpense = new Chart(profitExpenseCtx, {
            type: 'line',
            data: {
                labels: sortedDays.map(d => new Date(d).toLocaleDateString('ar-EG', {month: 'short', day: 'numeric'})),
                datasets: [
                {
                    label: 'الربح',
                    data: sortedDays.map(day => dailyData[day].profit),
                    borderColor: '#10b981',
                    tension: 0.1,
                },
                {
                    label: 'المصروفات',
                    data: sortedDays.map(day => dailyData[day].expense),
                    borderColor: '#ef4444',
                    tension: 0.1,
                }
                ],
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }


  }, [filteredData, products]);


  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const { salesInvoices, filteredExpenses, itemSalesData } = filteredData;
    
    // 1. Sales By Product (أهم ورقة)
    const salesByItemData = itemSalesData.map(item => ({
      'الصنف': item.name,
      'الكمية المباعة': item.soldQty,
      'المرتجعة': item.returnedQty,
      'الصافي': item.netQty,
      'إجمالي المبيعات': item.totalSale.toFixed(2),
      'مصروفات الصنف': item.itemExpenses.toFixed(2),
      'صافي الربح': item.netProfit.toFixed(2)
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesByItemData), "Sales By Product");

    // 2. Cashier Closing
    const start = startDate ? new Date(startDate) : new Date('1970-01-01');
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    
    const cashierClosingData = tillCloseouts.filter(c => {
         const cDate = new Date(c.forDate);
         return cDate >= start && cDate <= end;
    }).map(c => ({
      'التاريخ': new Date(c.forDate).toLocaleDateString('ar-EG'),
      'الكاشير': c.closedByUsername,
      'كاش': (c.totalCashSales || 0).toFixed(2),
      'بطاقة': (c.totalCardSales || 0).toFixed(2),
      'مصروفات': (c.totalExpenses || 0).toFixed(2),
      'المتوقع': c.netCashExpected.toFixed(2),
      'الفعلي': c.countedCash.toFixed(2),
      'الفرق': c.difference.toFixed(2),
      'ملاحظة': c.notes || '-'
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cashierClosingData), "Cashier Closing");

    // 3. Expenses
    const expensesData = filteredExpenses.map(exp => ({
      'التاريخ': new Date(exp.date).toLocaleDateString('ar-EG'),
      'الكاشير': exp.processedBy || '-',
      'البيان': exp.description,
      'التصنيف': exp.category || '',
      'المبلغ': exp.amount.toFixed(2),
      'حساب الدفع': accountBalances[exp.accountId] !== undefined ? exp.accountId : 'كاش',
      'ملاحظات شاملة': exp.notes || '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expensesData), "Expenses");

    // 4. Returns
    const returnsData = invoices.filter(inv => inv.type === 'return').filter(inv => {
        const invDate = new Date(inv.date);
        return invDate >= start && invDate <= end;
    }).map(inv => ({
        'التاريخ': new Date(inv.date).toLocaleDateString('ar-EG'),
        'رقم الفاتورة': inv.id.substring(0, 8),
        'الكاشير': inv.processedBy || '-',
        'الإجمالي': inv.total.toFixed(2)
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(returnsData), "Returns");

    // 5. Invoices By Product
    const invoicesByProductData: any[] = [];
    salesInvoices.forEach(inv => {
        inv.items.forEach(item => {
            invoicesByProductData.push({
                'التاريخ': new Date(inv.paidDate || inv.date).toLocaleDateString('ar-EG'),
                'الفاتورة': inv.id.substring(0, 8),
                'الكاشير': inv.processedBy || '-',
                'الصنف': item.productName,
                'طريقة الدفع': inv.paymentMethod === 'card' ? 'بطاقة' : 'كاش',
                'الكمية': 1,
                'السعر': item.price.toFixed(2),
                'ملاحظات': item.notes || '-'
            });
        });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoicesByProductData), "Invoices By Product");

    // 6. Daily Sales
    const dailySalesMap: Record<string, number> = {};
    salesInvoices.forEach(inv => {
        const d = new Date(inv.paidDate || inv.date).toLocaleDateString('ar-EG');
        if (!dailySalesMap[d]) dailySalesMap[d] = 0;
        dailySalesMap[d] += inv.total;
    });
    const dailySalesData = Object.keys(dailySalesMap).map(d => ({
        'التاريخ': d,
        'المبيعات': dailySalesMap[d].toFixed(2)
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailySalesData), "Daily Sales");

    // Dashboard, Purchases, Audit Log would need more data implementations
    // We export what is supported currently.

    XLSX.writeFile(wb, `Reports_${startDate}_to_${endDate}.xlsx`);
  };

  const handleExportJSON = () => {
    const start = startDate ? new Date(startDate) : new Date('1970-01-01');
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    
    const dataToExport = {
      salesInvoices: filteredData.salesInvoices,
      expenses: filteredData.filteredExpenses,
      transactions: transactions.filter(t => {
        const tD = new Date(t.date);
        return tD >= start && tD <= end;
      }),
      accountBalances
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href",     dataStr     );
    dlAnchorElem.setAttribute("download", `Reports_${startDate}_to_${endDate}.json`);
    dlAnchorElem.click();
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="bg-white shadow-lg rounded-xl p-6 mb-6 flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">التقارير الشاملة</h2>
          <p className="text-sm text-slate-500 mt-1">عروض وتحليلات شاملة للمبيعات والمصروفات، مع إمكانية التصدير بصيغة Excel أو JSON.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={handleExportJSON} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            <span className="material-symbols-outlined text-xl">data_object</span>
            تصدير JSON
          </button>
          <button onClick={handleExportExcel} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-sm shadow-emerald-600/20">
            <span className="material-symbols-outlined text-xl">table_chart</span>
            تصدير Excel احترافي
          </button>
        </div>
      </div>
      
      <div className="bg-white shadow-lg rounded-xl p-6 mb-6">
        <h3 className="font-bold text-slate-800 mb-4">فترة التقرير</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField id="startDate" label="من تاريخ" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <InputField id="endDate" label="إلى تاريخ" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard title="إجمالي الإيرادات" value={reportStats.totalRevenue.toFixed(2)} icon="payments" valueClassName="text-indigo-600" />
        <StatCard title="إجمالي الربح" value={reportStats.totalProfit.toFixed(2)} icon="account_balance_wallet" valueClassName="text-sky-600" />
        <StatCard title="إجمالي المصروفات" value={reportStats.totalExpenses.toFixed(2)} icon="receipt" valueClassName="text-red-500" />
        <StatCard title="صافي الربح" value={reportStats.netProfit.toFixed(2)} icon="trending_up" valueClassName={reportStats.netProfit > 0 ? 'text-green-600' : 'text-red-600'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="الأصناف الأكثر مبيعاً (حسب الإيرادات)">
            <canvas ref={topProductsChartRef}></canvas>
        </ChartCard>
        <ChartCard title="المبيعات حسب التصنيف">
            <canvas ref={salesByCategoryChartRef}></canvas>
        </ChartCard>
        <div className="lg:col-span-2">
            <ChartCard title="الأرباح والمصروفات اليومية">
                <canvas ref={profitExpenseChartRef}></canvas>
            </ChartCard>
        </div>
      </div>

      {/* Item Sales Report Table */}
      <div className="bg-white shadow-lg rounded-xl overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-200">
            <h3 className="font-bold text-slate-800 text-lg">تقرير مبيعات الأصناف التفصيلي</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                        <th className="p-4">اسم الصنف</th>
                        <th className="p-4">مباع</th>
                        <th className="p-4">مرتجع</th>
                        <th className="p-4">صافي الكمية</th>
                        <th className="p-4">صافي المبيعات</th>
                        <th className="p-4">مصروفات الصنف</th>
                        <th className="p-4">صافي الربح</th>
                        <th className="p-4 text-center">الإجراءات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredData.itemSalesData.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-4 font-bold text-indigo-700">{item.name}</td>
                            <td className="p-4 font-mono">{item.soldQty}</td>
                            <td className="p-4 font-mono text-red-500">{item.returnedQty}</td>
                            <td className="p-4 font-mono font-bold text-slate-800">{item.netQty}</td>
                            <td className="p-4 text-emerald-600 font-bold font-mono">{item.totalSale.toFixed(2)}</td>
                            <td className="p-4 text-red-500 font-mono">{item.itemExpenses.toFixed(2)}</td>
                            <td className={`p-4 font-bold font-mono ${item.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {item.netProfit.toFixed(2)}
                            </td>
                            <td className="p-4 text-center">
                                <button
                                    onClick={() => setSelectedItemForReport(item.name)}
                                    className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors inline-flex items-center gap-1"
                                    title="طباعة تفاصيل الفواتير"
                                >
                                    <span className="material-symbols-outlined text-sm">print</span>
                                    <span className="text-xs font-bold hidden sm:inline">تقرير مخصص</span>
                                </button>
                            </td>
                        </tr>
                    ))}
                    {filteredData.itemSalesData.length === 0 && (
                        <tr><td colSpan={8} className="p-8 text-center text-slate-500">لا توجد بيانات للفترة المحددة</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {selectedItemForReport && (
        <ItemPrintModal 
          itemName={selectedItemForReport} 
          salesInvoices={filteredData.salesInvoices} 
          onClose={() => setSelectedItemForReport(null)} 
        />
      )}
    </div>
  );
};

const ItemPrintModal: React.FC<{itemName: string, salesInvoices: Invoice[], onClose: () => void}> = ({ itemName, salesInvoices, onClose }) => {
  useEffect(() => {
      const handleKeyPress = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
              onClose();
          }
      };
      window.addEventListener('keydown', handleKeyPress);
      return () => {
          window.removeEventListener('keydown', handleKeyPress);
      };
  }, [onClose]);

  const itemRows = useMemo(() => {
      const rows: {inv: Invoice, qty: number, price: number, total: number, notes: string}[] = [];
      
      salesInvoices.forEach(inv => {
          const matchingItems = inv.items.filter(i => i.productName === itemName);
          if (matchingItems.length > 0) {
              const qty = matchingItems.length;
              // Assuming all items of the same product in one invoice have similar base pricing/notes for simplicity,
              // or better yet, if there are different notes, they might be scattered. 
              // Usually the POS adds them individually if they have modifiers, or users might just want them aggregated.
              // A better way is to list each line item that matches. But POS cart adds 1 item per entry.
              
              const total = matchingItems.reduce((s, item) => s + ((item.price - (item.discount || 0)) + (item.modifiers?.reduce((sm, m) => sm + m.price, 0) || 0)), 0);
              const isReturn = inv.type === 'return';
              const absTotal = Math.abs(total);
              
              const notes = matchingItems.map(i => i.notes).filter(Boolean).join(', ');
              const basePrice = matchingItems[0].price; // Approximate base price

              rows.push({
                  inv,
                  qty: isReturn ? -qty : qty,
                  price: basePrice,
                  total: isReturn ? -absTotal : absTotal,
                  notes
              });
          }
      });
      return rows;
  }, [salesInvoices, itemName]);

  const handlePrint = () => {
    window.print();
  };

  const totalQty = itemRows.reduce((sum, row) => sum + row.qty, 0);
  const totalValue = itemRows.reduce((sum, row) => sum + row.total, 0);

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 p-4 sm:p-8 overflow-y-auto print:p-0 print:bg-white text-right" dir="rtl">
        <div className="max-w-5xl mx-auto bg-white shadow-lg p-8 sm:p-12 relative print:shadow-none print:p-0">
            <div className="flex justify-between items-center mb-8 print:hidden">
              <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
              <button onClick={handlePrint} className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg uppercase tracking-wider hover:bg-indigo-700 font-mono">
                PRINT &nbsp; <span className="material-symbols-outlined align-middle">print</span>
              </button>
            </div>
            
            <div id="print-area">
                <div className="text-center mb-8 border-b-2 border-dark-800 pb-8">
                    <h1 className="text-3xl font-black text-dark-800 mb-2">تقرير مبيعات صنف تفصيلي</h1>
                    <h2 className="text-2xl text-indigo-700 font-bold">{itemName}</h2>
                </div>

                <div className="flex justify-between mb-8 bg-slate-50 p-4 rounded-xl">
                    <div>
                        <p className="text-sm text-slate-500">صافي الكمية</p>
                        <p className={`text-xl font-bold ${totalQty >= 0 ? '' : 'text-red-500'}`}>{totalQty}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">إجمالي الصافي</p>
                        <p className={`text-xl font-bold ${totalValue >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{totalValue.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">عدد العمليات</p>
                        <p className="text-xl font-bold">{itemRows.length}</p>
                    </div>
                </div>

                <table className="w-full text-right border-collapse text-sm">
                    <thead>
                        <tr className="bg-slate-800 text-white">
                            <th className="p-3 font-bold rounded-tr-lg">رقم الفاتورة</th>
                            <th className="p-3 font-bold">التاريخ</th>
                            <th className="p-3 font-bold">الكاشير</th>
                            <th className="p-3 font-bold">الدفع</th>
                            <th className="p-3 font-bold">الكمية</th>
                            <th className="p-3 font-bold">السعر الأساسي</th>
                            <th className="p-3 font-bold">الإجمالي</th>
                            <th className="p-3 font-bold rounded-tl-lg">ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {itemRows.map((row, idx) => (
                            <tr key={row.inv.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                <td className="p-3 font-mono">
                                    <span className={row.inv.type === 'return' ? 'text-red-500 mr-2' : ''}>
                                        {row.inv.type === 'return' ? '(مرتجع) ' : ''}
                                    </span>
                                    {row.inv.id.substring(0, 8)}
                                </td>
                                <td className="p-3">{new Date(row.inv.paidDate || row.inv.date).toLocaleString('ar-EG')}</td>
                                <td className="p-3">{row.inv.processedBy || '-'}</td>
                                <td className="p-3">{row.inv.paymentMethod === 'card' ? 'بطاقة' : 'كاش'}</td>
                                <td className={`p-3 font-mono font-bold ${row.qty < 0 ? 'text-red-500' : ''}`}>{row.qty}</td>
                                <td className="p-3 font-mono text-slate-600">{row.price.toFixed(2)}</td>
                                <td className={`p-3 font-bold font-mono ${row.total < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{row.total.toFixed(2)}</td>
                                <td className="p-3 text-slate-500 text-xs">{row.notes || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default ReportsView;