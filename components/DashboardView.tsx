import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { Invoice, Product, Expense, Customer } from '../types';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const StatCard = ({ title, value, icon, valueClassName, subtext }: { title: string, value: string | number, icon: string, valueClassName?: string, subtext?: string }) => {
    const colorClass = valueClassName?.replace('text-', '') || 'slate-600';
    
    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm flex items-center gap-4 border border-slate-100 hover:shadow-md transition-shadow">
            <div className={`p-4 rounded-xl bg-${colorClass} bg-opacity-10`}>
                <span className={`material-symbols-outlined text-3xl text-${colorClass}`}>{icon}</span>
            </div>
            <div>
                <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
                <p className={`text-2xl font-bold text-${colorClass}`}>{value}</p>
                {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
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
}> = ({ invoices, products, expenses, customers }) => {
  const [dateRange, setDateRange] = useState<'all' | '7' | '30'>('30');

  const profitExpenseChartRef = useRef<HTMLCanvasElement>(null);
  const salesTrendChartRef = useRef<HTMLCanvasElement>(null);
  const expenseBreakdownChartRef = useRef<HTMLCanvasElement>(null);
  const topProductsChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstances = useRef<{ [key: string]: Chart | null }>({});

  const {
    netSales, grossProfit, totalExpenses, netProfit, 
    pendingOrders, recentSales, dailyData,
    todayNetSales, todayProfit,
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

    const cogs = completedSales.reduce((sum, inv) => sum + (inv.totalCost || 0), 0);
    const grossProfit = netSales - cogs;
    
    const totalExpensesValue = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = grossProfit - totalExpensesValue;

    // Today's metrics
    const todaySales = invoices.filter(inv => 
        (inv.type === 'sale' || inv.type === 'dine_in' || inv.type === 'takeaway' || ((inv.type === 'delivery' || inv.type === 'reservation') && inv.status === 'completed' && inv.paymentStatus === 'paid')) && isToday(inv.paidDate)
    );
    const todayReturns = invoices.filter(inv => inv.type === 'return' && isToday(inv.date));
    const todayNetSales = todaySales.reduce((sum, inv) => sum + inv.total, 0) + todayReturns.reduce((sum, inv) => sum + inv.total, 0);
    const todayProfit = todaySales.reduce((sum, inv) => sum + (inv.totalProfit || 0), 0) + todayReturns.reduce((sum, inv) => sum + (inv.totalProfit || 0), 0);

    const pendingOrders = invoices.filter(inv => inv.status === 'pending' && (inv.type === 'delivery' || inv.type === 'reservation')).length;

    const recentSales = invoices
        .filter(i => i.type === 'sale' || ((i.type === 'delivery' || i.type === 'reservation') && i.status === 'completed'))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
        
    const dailyData: { [date: string]: { profit: number, expense: number, sales: number } } = {};
    
    // Initialize dates for the selected range to ensure continuous lines
    if (dateRange !== 'all') {
        const days = parseInt(dateRange);
        for (let i = days; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            dailyData[dateStr] = { profit: 0, expense: 0, sales: 0 };
        }
    }

     [...completedSales, ...returns].forEach(inv => {
        const day = new Date(inv.date).toISOString().split('T')[0];
        if (!dailyData[day]) dailyData[day] = { profit: 0, expense: 0, sales: 0 };
        dailyData[day].profit += inv.totalProfit || 0;
        dailyData[day].sales += inv.total;
    });
    filteredExpenses.forEach(exp => {
        const day = new Date(exp.date).toISOString().split('T')[0];
        if (!dailyData[day]) dailyData[day] = { profit: 0, expense: 0, sales: 0 };
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
            productSales[item.productId].count += 1;
            productSales[item.productId].total += (item.price - (item.discount || 0));
        });
    });
    const topProducts = Object.values(productSales)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    return {
        netSales, grossProfit, totalExpenses: totalExpensesValue, netProfit, 
        pendingOrders, recentSales,
        dailyData, todayNetSales, todayProfit,
        expenseBreakdown, topProducts
    };
  }, [invoices, expenses, products, dateRange]);

  const [printContent, setPrintContent] = useState<{ title: string, items: any[], type: 'sales' | 'profit' | 'expenses' } | null>(null);

  const handlePrint = (type: 'sales' | 'profit' | 'expenses') => {
      let title = "";
      let items: any[] = [];
      
      if (type === 'sales') {
          title = `تقرير المبيعات - ${dateRangeText}`;
          items = invoices.filter(inv => (inv.type === 'sale' || (inv.type === 'shipping' && inv.status === 'completed')) && (dateRange === 'all' || new Date(inv.date) >= new Date(new Date().setDate(new Date().getDate() - parseInt(dateRange)))));
      } else if (type === 'profit') {
          title = `تقرير الأرباح اليومي - ${new Date().toLocaleDateString()}`;
          items = invoices.filter(inv => (inv.type === 'sale' || (inv.type === 'shipping' && inv.status === 'completed')) && inv.date.split('T')[0] === new Date().toISOString().split('T')[0]);
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">لوحة التحكم</h2>
            <p className="text-slate-500 mt-2">نظرة شاملة ودقيقة على أداء مطعمك.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
              <button onClick={() => setDateRange('7')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${dateRange === '7' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>آخر 7 أيام</button>
              <button onClick={() => setDateRange('30')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${dateRange === '30' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>آخر 30 يوم</button>
              <button onClick={() => setDateRange('all')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${dateRange === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>كل الأوقات</button>
          </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <StatCard title="صافي مبيعات اليوم" value={`${todayNetSales.toFixed(2)}`} icon="today" valueClassName="text-emerald-600" subtext="اليوم فقط" />
        <StatCard title="ربح اليوم" value={`${todayProfit.toFixed(2)}`} icon="payments" valueClassName="text-green-600" subtext="اليوم فقط" />
        <StatCard title="صافي المبيعات" value={`${netSales.toFixed(2)}`} icon="monitoring" valueClassName="text-indigo-600" subtext={dateRangeText} />
        <StatCard title="إجمالي الربح" value={`${grossProfit.toFixed(2)}`} icon="account_balance" valueClassName="text-sky-600" subtext={dateRangeText} />
        <StatCard title="المصروفات" value={`${totalExpenses.toFixed(2)}`} icon="receipt_long" valueClassName="text-red-500" subtext={dateRangeText} />
        <StatCard title="صافي الربح" value={`${netProfit.toFixed(2)}`} icon="trending_up" valueClassName={netProfit >= 0 ? 'text-green-600' : 'text-red-600'} subtext={dateRangeText}/>
        <StatCard title="طلبات قيد الانتظار" value={pendingOrders} icon="pending_actions" valueClassName="text-orange-600" subtext="توصيل وحجوزات" />
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-3 mb-8">
          <button onClick={() => handlePrint('sales')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 px-4 sm:px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md hover:bg-slate-50 transition-all text-slate-700 font-medium text-sm" title="طباعة تقرير مفصل بجميع المبيعات للفترة المختارة">
              <span className="material-symbols-outlined text-indigo-600 text-lg">print</span>
              <span className="whitespace-nowrap">طباعة المبيعات</span>
          </button>
          <button onClick={() => handlePrint('profit')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 px-4 sm:px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md hover:bg-slate-50 transition-all text-slate-700 font-medium text-sm" title="طباعة تقرير الأرباح الصافية لليوم الحالي">
              <span className="material-symbols-outlined text-green-600 text-lg">print</span>
              <span className="whitespace-nowrap">طباعة الربح اليومي</span>
          </button>
          <button onClick={() => handlePrint('expenses')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 px-4 sm:px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md hover:bg-slate-50 transition-all text-slate-700 font-medium text-sm" title="طباعة تقرير بجميع المصروفات المسجلة للفترة المختارة">
              <span className="material-symbols-outlined text-red-600 text-lg">print</span>
              <span className="whitespace-nowrap">طباعة المصروفات</span>
          </button>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-500">bar_chart</span>
                اتجاه المبيعات ({dateRangeText})
            </h3>
            <div className="relative h-72"><canvas ref={salesTrendChartRef}></canvas></div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-green-500">stacked_line_chart</span>
                الأرباح والمصروفات ({dateRangeText})
            </h3>
            <div className="relative h-72"><canvas ref={profitExpenseChartRef}></canvas></div>
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
                          {printContent.type === 'profit' && <th className="border border-slate-300 p-2">الربح</th>}
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
                              {printContent.type === 'profit' && <td className="border border-slate-300 p-2">{item.totalProfit?.toFixed(2)}</td>}
                          </tr>
                      ))}
                  </tbody>
                  <tfoot>
                      <tr className="font-bold bg-slate-50">
                          <td colSpan={2} className="border border-slate-300 p-2 text-left">الإجمالي:</td>
                          <td className="border border-slate-300 p-2">
                              {printContent.items.reduce((sum, i) => sum + (i.total ?? i.amount ?? 0), 0).toFixed(2)}
                          </td>
                          {printContent.type === 'profit' && (
                              <td className="border border-slate-300 p-2">
                                  {printContent.items.reduce((sum, i) => sum + (i.totalProfit || 0), 0).toFixed(2)}
                              </td>
                          )}
                      </tr>
                  </tfoot>
              </table>
          </div>
      )}
    </div>
  );
};

export default DashboardView;
