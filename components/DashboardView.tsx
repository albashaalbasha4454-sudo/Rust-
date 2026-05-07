import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { Invoice, Product, Expense, Customer } from '../types';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const StatCard = ({ title, value, icon, colorTheme, subtext }: { title: string, value: string | number, icon: string, colorTheme: 'emerald' | 'indigo' | 'red' | 'orange', subtext?: string }) => {
    const themeStyles = {
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
        red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
        orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
    }[colorTheme];
    
    return (
        <div className={`bg-white p-6 rounded-[1.5rem] shadow-sm flex items-center gap-5 border border-slate-100 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}>
            <div className={`p-4 rounded-2xl ${themeStyles.bg} flex items-center justify-center`}>
                <span className={`material-symbols-outlined text-3xl ${themeStyles.text}`}>{icon}</span>
            </div>
            <div>
                <h3 className="text-slate-500 text-sm font-semibold">{title}</h3>
                <p className={`text-3xl font-black mt-1 ${themeStyles.text}`}>{value}</p>
                {subtext && <p className="text-xs text-slate-400 mt-1 font-medium">{subtext}</p>}
            </div>
        </div>
    );
};

const InfoListCard: React.FC<{ title: string; icon: string; children: React.ReactNode; }> = ({ title, icon, children }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col">
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-50 rounded-lg">
                <span className="material-symbols-outlined text-slate-600">{icon}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        </div>
        <div className="space-y-3 text-sm flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {children}
        </div>
    </div>
);


const DashboardView: React.FC<{
  invoices: Invoice[];
  products: Product[];
  expenses: Expense[];
  customers: Customer[];
  accounts: any[];
  departments: any[];
  onAddManualSale: (data: any) => void;
  onAddExpense: (data: any) => void;
}> = ({ invoices, products, expenses, customers, accounts, departments, onAddManualSale, onAddExpense }) => {
  const [dateRange, setDateRange] = useState<'all' | '7' | '30'>('30');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showManualSaleModal, setShowManualSaleModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (successMessage) {
        const timer = setTimeout(() => setSuccessMessage(null), 3000);
        return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const profitExpenseChartRef = useRef<HTMLCanvasElement>(null);
  const salesTrendChartRef = useRef<HTMLCanvasElement>(null);
  const expenseBreakdownChartRef = useRef<HTMLCanvasElement>(null);
  const topProductsChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstances = useRef<{ [key: string]: Chart | null }>({});

  const {
    netSales, totalExpenses, 
    pendingOrders, recentSales, dailyData,
    todayNetSales,
    expenseBreakdown, topProducts
  } = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const rangeStart = new Date();
    if (dateRange !== 'all') {
        rangeStart.setDate(today.getDate() - parseInt(dateRange));
    } else {
        rangeStart.setFullYear(1970);
    }
    rangeStart.setHours(0,0,0,0);
    
    const dateFilter = (itemDateStr: string | undefined) => {
        if (!itemDateStr) return false;
        const itemDate = new Date(itemDateStr);
        return itemDate >= rangeStart;
    };

    const isToday = (dateStr: string | undefined) => {
        if (!dateStr) return false;
        return dateStr.split('T')[0] === todayStr;
    };
    
    const completedSales = invoices.filter(inv => 
        (inv.type === 'sale' || inv.type === 'dine_in' || inv.type === 'takeaway' || ((inv.type === 'delivery' || inv.type === 'reservation') && inv.status === 'completed' && inv.paymentStatus === 'paid')) && dateFilter(inv.paidDate)
    );

    const returns = invoices.filter(inv => inv.type === 'return' && dateFilter(inv.date));
    const filteredExpenses = expenses.filter(exp => dateFilter(exp.date));

    const totalSalesValue = completedSales.reduce((sum, inv) => sum + inv.total, 0);
    const totalReturnsValue = returns.reduce((sum, inv) => sum + inv.total, 0); 
    const netSales = totalSalesValue + totalReturnsValue;

    const totalExpensesValue = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Today's metrics
    const todaySales = invoices.filter(inv => 
        (inv.type === 'sale' || inv.type === 'dine_in' || inv.type === 'takeaway' || ((inv.type === 'delivery' || inv.type === 'reservation') && inv.status === 'completed' && inv.paymentStatus === 'paid')) && isToday(inv.paidDate)
    );
    const todayReturns = invoices.filter(inv => inv.type === 'return' && isToday(inv.date));
    const todayNetSales = todaySales.reduce((sum, inv) => sum + inv.total, 0) + todayReturns.reduce((sum, inv) => sum + inv.total, 0);

    const pendingOrders = invoices.filter(inv => inv.status === 'pending' && (inv.type === 'delivery' || inv.type === 'reservation')).length;

    const recentSales = invoices
        .filter(i => i.type === 'sale' || ((i.type === 'delivery' || i.type === 'reservation') && i.status === 'completed'))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
        
    const dailyData: { [date: string]: { expense: number, sales: number } } = {};
    
    // Initialize dates for the selected range to ensure continuous lines
    if (dateRange !== 'all') {
        const days = parseInt(dateRange);
        for (let i = days; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            dailyData[dateStr] = { expense: 0, sales: 0 };
        }
    }

     [...completedSales, ...returns].forEach(inv => {
        const day = new Date(inv.date).toISOString().split('T')[0];
        if (!dailyData[day]) dailyData[day] = { expense: 0, sales: 0 };
        dailyData[day].sales += inv.total;
    });
    filteredExpenses.forEach(exp => {
        const day = new Date(exp.date).toISOString().split('T')[0];
        if (!dailyData[day]) dailyData[day] = { expense: 0, sales: 0 };
        dailyData[day].expense += exp.amount;
    });

    // Expense Breakdown
    const expenseBreakdown: { [category: string]: number } = {};
    filteredExpenses.forEach(exp => {
        expenseBreakdown[exp.category] = (expenseBreakdown[exp.category] || 0) + exp.amount;
    });

    // Top Products
    const productSales: { [id: string]: { name: string, count: number, total: number } } = {};
    completedSales.forEach(inv => {
        inv.items.forEach(item => {
            if (!productSales[item.productId]) {
                productSales[item.productId] = { name: item.productName, count: 0, total: 0 };
            }
            productSales[item.productId].count += item.quantity;
            productSales[item.productId].total += item.lineTotal;
        });
    });
    const topProducts = Object.values(productSales)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    return {
        netSales, totalExpenses: totalExpensesValue, 
        pendingOrders, recentSales,
        dailyData, todayNetSales,
        expenseBreakdown, topProducts
    };
  }, [invoices, expenses, products, dateRange]);

  const [printContent, setPrintContent] = useState<{ title: string, items: any[], type: 'sales' | 'expenses' } | null>(null);

  const handlePrint = (type: 'sales' | 'expenses') => {
      let title = "";
      let items: any[] = [];
      
      if (type === 'sales') {
          title = `تقرير المبيعات - ${dateRangeText}`;
          items = invoices.filter(inv => (inv.type === 'sale' || (inv.type === 'shipping' && inv.status === 'completed')) && (dateRange === 'all' || new Date(inv.date) >= new Date(new Date().setDate(new Date().getDate() - parseInt(dateRange)))));
      } else if (type === 'expenses') {
          title = `تقرير المصروفات - ${dateRangeText}`;
          items = expenses.filter(exp => (dateRange === 'all' || new Date(exp.date) >= new Date(new Date().setDate(new Date().getDate() - parseInt(dateRange)))));
      }

      setPrintContent({ title, items, type });
      setTimeout(() => {
          window.print();
          setPrintContent(null);
      }, 100);
  };

  useEffect(() => {
    Object.keys(chartInstances.current).forEach(key => chartInstances.current[key]?.destroy());
    
    const sortedDays = Object.keys(dailyData).sort();
    const labels = sortedDays.map(d => new Date(d).toLocaleDateString('ar-EG', {month: 'short', day: 'numeric'}));

    // Profit vs Expense Chart
    const ctxProfit = profitExpenseChartRef.current?.getContext('2d');
    if (ctxProfit) {
        chartInstances.current['profitExpense'] = new Chart(ctxProfit, {
            type: 'line',
            data: {
                labels,
                datasets: [
                {
                    label: 'إجمالي الربح',
                    data: sortedDays.map(day => dailyData[day].profit),
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 3,
                },
                {
                    label: 'المصروفات',
                    data: sortedDays.map(day => dailyData[day].expense),
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 3,
                }
                ],
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: {
                    legend: { position: 'top', labels: { font: { family: 'Cairo' } } },
                    tooltip: { titleFont: { family: 'Cairo' }, bodyFont: { family: 'Cairo' } }
                },
                scales: { 
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                    x: { grid: { display: false } }
                } 
            }
        });
    }

    // Sales Trend Chart
    const ctxSales = salesTrendChartRef.current?.getContext('2d');
    if (ctxSales) {
        chartInstances.current['salesTrend'] = new Chart(ctxSales, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'المبيعات',
                    data: sortedDays.map(day => dailyData[day].sales),
                    backgroundColor: 'rgba(99, 102, 241, 0.8)',
                    borderRadius: 4,
                }],
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { titleFont: { family: 'Cairo' }, bodyFont: { family: 'Cairo' } }
                },
                scales: { 
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                    x: { grid: { display: false } }
                } 
            }
        });
    }

    // Expense Breakdown Chart
    const ctxExpenseBreakdown = expenseBreakdownChartRef.current?.getContext('2d');
    if (ctxExpenseBreakdown) {
        const categories = Object.keys(expenseBreakdown);
        const data = Object.values(expenseBreakdown);
        chartInstances.current['expenseBreakdown'] = new Chart(ctxExpenseBreakdown, {
            type: 'doughnut',
            data: {
                labels: categories.length ? categories : ['لا يوجد مصروفات'],
                datasets: [{
                    data: data.length ? data : [1],
                    backgroundColor: data.length ? [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(249, 115, 22, 0.8)',
                        'rgba(234, 179, 8, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(139, 92, 246, 0.8)'
                    ] : ['rgba(200, 200, 200, 0.3)'],
                    borderWidth: 0,
                }],
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'right', labels: { font: { family: 'Cairo' }, usePointStyle: true, padding: 20 } },
                    tooltip: { titleFont: { family: 'Cairo' }, bodyFont: { family: 'Cairo' } }
                }
            }
        });
    }

    // Top Products Chart
    const ctxTopProducts = topProductsChartRef.current?.getContext('2d');
    if (ctxTopProducts) {
        chartInstances.current['topProducts'] = new Chart(ctxTopProducts, {
            type: 'doughnut',
            data: {
                labels: topProducts.length ? topProducts.map(p => p.name) : ['لا يوجد مبيعات'],
                datasets: [{
                    data: topProducts.length ? topProducts.map(p => p.total) : [1],
                    backgroundColor: topProducts.length ? [
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(236, 72, 153, 0.8)',
                        'rgba(14, 165, 233, 0.8)'
                    ] : ['rgba(200, 200, 200, 0.3)'],
                    borderWidth: 0,
                }],
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'right', labels: { font: { family: 'Cairo' }, usePointStyle: true, padding: 20 } },
                    tooltip: { titleFont: { family: 'Cairo' }, bodyFont: { family: 'Cairo' } }
                }
            }
        });
    }
    
    return () => {
        Object.keys(chartInstances.current).forEach(key => chartInstances.current[key]?.destroy());
    }
  }, [dailyData, expenseBreakdown, topProducts]);
  
  const dateRangeText = dateRange === 'all' ? 'كل الأوقات' : `آخر ${dateRange} يوم`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
      {successMessage && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce">
              <span className="material-symbols-outlined">check_circle</span>
              <span className="font-bold">{successMessage}</span>
          </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">لوحة التحكم</h2>
            <p className="text-slate-500 mt-2">نظرة شاملة ودقيقة على أداء مطعمك.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowManualSaleModal(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all font-bold"
                  >
                      <span className="material-symbols-outlined">add_shopping_cart</span>
                      إضافة مبيعات / غلة
                  </button>
                  <button 
                   onClick={() => setShowExpenseModal(true)}
                    className="flex items-center gap-2 bg-rose-500 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all font-bold"
                  >
                      <span className="material-symbols-outlined">payments</span>
                      إضافة مصروف
                  </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
                  <button onClick={() => setDateRange('7')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${dateRange === '7' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>آخر 7 أيام</button>
                  <button onClick={() => setDateRange('30')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${dateRange === '30' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>آخر 30 يوم</button>
                  <button onClick={() => setDateRange('all')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${dateRange === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>كل الأوقات</button>
              </div>
          </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <StatCard title="صافي المبيعات اليوم" value={`$${todayNetSales.toFixed(2)}`} icon="today" colorTheme="emerald" subtext="اليوم فقط" />
        <StatCard title="إجمالي المبيعات" value={`$${netSales.toFixed(2)}`} icon="monitoring" colorTheme="indigo" subtext={dateRangeText} />
        <StatCard title="المصروفات" value={`$${totalExpenses.toFixed(2)}`} icon="receipt_long" colorTheme="red" subtext={dateRangeText} />
        <StatCard title="طلبات قيد الانتظار" value={pendingOrders} icon="pending_actions" colorTheme="orange" subtext="توصيل وحجوزات" />
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-3 mb-8">
          <button onClick={() => handlePrint('sales')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 px-4 sm:px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md hover:bg-slate-50 transition-all text-slate-700 font-medium text-sm" title="طباعة تقرير مفصل بجميع المبيعات للفترة المختارة">
              <span className="material-symbols-outlined text-indigo-600 text-lg">print</span>
              <span className="whitespace-nowrap">طباعة المبيعات</span>
          </button>
          <button onClick={() => handlePrint('expenses')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 px-4 sm:px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md hover:bg-slate-50 transition-all text-slate-700 font-medium text-sm" title="طباعة تقرير بجميع المصروفات المسجلة للفترة المختارة">
              <span className="material-symbols-outlined text-red-600 text-lg">print</span>
              <span className="whitespace-nowrap">طباعة المصروفات</span>
          </button>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-500">bar_chart</span>
                اتجاه المبيعات ({dateRangeText})
            </h3>
            <div className="relative h-72"><canvas ref={salesTrendChartRef}></canvas></div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">pie_chart</span>
                الأصناف الأكثر مبيعاً ({dateRangeText})
            </h3>
            <div className="relative h-64"><canvas ref={topProductsChartRef}></canvas></div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-500">donut_large</span>
                توزيع المصروفات ({dateRangeText})
            </h3>
            <div className="relative h-64"><canvas ref={expenseBreakdownChartRef}></canvas></div>
          </div>
      </div>

      {/* Lists Section */}
      <div className="grid grid-cols-1 gap-6">
          <div className="h-96">
             <InfoListCard title="آخر المبيعات" icon="receipt_long">
                 {recentSales.length > 0 ? recentSales.map(inv => (
                     <div key={inv.id} className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <span className="material-symbols-outlined text-sm">shopping_bag</span>
                            </div>
                            <div>
                                <p className="font-bold text-slate-800">{inv.customerInfo?.name || "بيع مباشر"}</p>
                                <p className="text-xs text-slate-500">{new Date(inv.date).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                            </div>
                         </div>
                         <div className="text-right">
                             <span className="font-bold text-green-600 block">{inv.total.toFixed(2)}</span>
                             <span className="text-[10px] text-slate-400 font-mono">{inv.id.substring(0,8)}</span>
                         </div>
                     </div>
                 )) : <p className="text-slate-500 p-4 text-center">لا يوجد مبيعات حديثة.</p>}
             </InfoListCard>
          </div>
      </div>
      {/* Printable Area */}
      {printContent && (
          <div id="print-area" className="p-8 bg-white text-right" dir="rtl">
              <h1 className="text-2xl font-bold mb-4 text-center border-b pb-4">{printContent.title}</h1>
              <p className="mb-6 text-slate-500 text-center">تاريخ التقرير: {new Date().toLocaleString('ar-EG')}</p>
              
              <table className="w-full border-collapse border border-slate-300">
                  <thead>
                      <tr className="bg-slate-100">
                          <th className="border border-slate-300 p-2">التاريخ</th>
                          <th className="border border-slate-300 p-2">البيان / الوصف</th>
                          <th className="border border-slate-300 p-2">المبلغ</th>
                      </tr>
                  </thead>
                  <tbody>
                      {printContent.items.map((item, idx) => (
                          <tr key={idx}>
                              <td className="border border-slate-300 p-2">{new Date(item.date).toLocaleDateString()}</td>
                              <td className="border border-slate-300 p-2">
                                  {printContent.type === 'expenses' ? item.description : (item.customerInfo?.name || "طلب مباشر")}
                              </td>
                              <td className="border border-slate-300 p-2">{(item.total ?? item.amount ?? 0).toFixed(2)}</td>
                          </tr>
                      ))}
                  </tbody>
                  <tfoot>
                      <tr className="font-bold bg-slate-50">
                          <td colSpan={2} className="border border-slate-300 p-2 text-left">الإجمالي:</td>
                          <td className="border border-slate-300 p-2">
                              {printContent.items.reduce((sum, i) => sum + (i.total ?? i.amount ?? 0), 0).toFixed(2)}
                          </td>
                      </tr>
                  </tfoot>
              </table>
          </div>
      )}
      {/* Render Modals */}
      {showExpenseModal && (
          <ExpenseFormModal 
            onClose={() => setShowExpenseModal(false)} 
            onSave={(data) => {
                onAddExpense(data);
                setShowExpenseModal(false);
                setSuccessMessage("تم حفظ المصروف بنجاح");
            }} 
            departments={departments}
            accounts={accounts}
          />
      )}

      {showManualSaleModal && (
          <ManualSaleModal 
            onClose={() => setShowManualSaleModal(false)} 
            onSave={(data) => {
                onAddManualSale(data);
                setShowManualSaleModal(false);
                setSuccessMessage("تم حفظ المبيعات بنجاح");
            }} 
            departments={departments}
          />
      )}
    </div>
  );
};

const ExpenseFormModal = ({ onClose, onSave, departments, accounts }: any) => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        departmentId: '',
        description: '',
        amount: '',
        accountId: 'cash-default',
        status: 'completed',
        notes: '',
        category: 'مصروفات عامة'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.departmentId || !formData.amount || !formData.description) {
            alert("برجاء ملء جميع الحقول الإلزامية");
            return;
        }
        onSave({
            ...formData,
            amount: parseFloat(formData.amount)
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleIn">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
                    <h3 className="text-xl font-bold text-indigo-900">إضافة مصروف جديد</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-700">التاريخ</label>
                            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-700 text-red-500">القسم *</label>
                            <select value={formData.departmentId} onChange={e => setFormData({...formData, departmentId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none bg-white" required>
                                <option value="">اختر القسم</option>
                                {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-700 text-red-500">البيان / الوصف *</label>
                        <input type="text" placeholder="مثال: فاتورة كهرباء، شراء خضروات..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-700 text-red-500">المبلغ *</label>
                            <input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-700">الحساب</label>
                            <select value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none bg-white">
                                {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-700">التصنيف</label>
                            <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-700">الحالة</label>
                            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none bg-white">
                                <option value="completed">مكتمل</option>
                                <option value="review">يحتاج مراجعة</option>
                                <option value="incomplete">غير مكتمل</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-700">الملاحظات</label>
                        <textarea rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"></textarea>
                    </div>
                    <button type="submit" className="w-full py-3 bg-rose-500 text-white rounded-xl font-bold shadow-lg shadow-rose-100 hover:bg-rose-600 transition-all mt-4">
                        حفظ المصروف
                    </button>
                </form>
            </div>
        </div>
    );
};

const ManualSaleModal = ({ onClose, onSave, departments }: any) => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        departmentId: '',
        description: '',
        amount: '',
        paymentMethod: 'cash',
        notes: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.departmentId || !formData.amount || !formData.description) {
            alert("برجاء ملء جميع الحقول الإلزامية");
            return;
        }
        onSave({
            ...formData,
            amount: parseFloat(formData.amount)
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleIn">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-green-50/50">
                    <h3 className="text-xl font-bold text-green-900">إضافة مبيعات غلة يدوية</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-700">التاريخ</label>
                            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-700 text-red-500">القسم *</label>
                            <select value={formData.departmentId} onChange={e => setFormData({...formData, departmentId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none bg-white" required>
                                <option value="">اختر القسم</option>
                                {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-700 text-red-500">البيان / الوصف *</label>
                        <input type="text" placeholder="مثال: غلة الفترة الصباحية، توريد مبيعات..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-700 text-red-500">المبلغ *</label>
                            <input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-700">طريقة الدفع</label>
                            <select value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none bg-white">
                                <option value="cash">نقدي</option>
                                <option value="card">فيزا / شبكة</option>
                                <option value="bank">تحويل بنكي</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-700">الملاحظات</label>
                        <textarea rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"></textarea>
                    </div>
                    <button type="submit" className="w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-100 hover:bg-green-700 transition-all mt-4">
                        حفظ المبيعات
                    </button>
                </form>
            </div>
        </div>
    );
};

export default DashboardView;
