import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { Invoice, Product, Expense } from '../types';
import { Chart, registerables } from 'chart.js';
import InputField from './common/InputField';
import { exportToExcel } from '../lib/excelExport';

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
}> = ({ invoices, products, expenses }) => {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today);

  const salesByCategoryChartRef = useRef<HTMLCanvasElement>(null);
  const topProductsChartRef = useRef<HTMLCanvasElement>(null);
  const profitExpenseChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstances = useRef<{ [key: string]: Chart | null }>({});

  const handleExportProductAnalysis = () => {
    const data = productBreakdown.map(p => ({
        'اسم الصنف': p.name,
        'عدد الفواتير': p.appearances,
        'الكمية المباعة': p.soldQty,
        'الكمية المرتجعة': p.returnedQty,
        'صافي الكمية': p.netQty,
        'إجمالي المبيعات': p.totalSales,
        'إجمالي المرتجعات': p.totalReturns,
        'صافي الإيراد': p.netRevenue,
        'التكلفة التقريبية': p.totalCost,
        'صافي الربح': p.netProfit
    }));
    exportToExcel(data, `تحليل_مبيعات_الأصناف_${startDate}_إلى_${endDate}`);
  };

  const filteredData = useMemo(() => {
    const start = startDate ? new Date(startDate) : new Date('1970-01-01');
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999); // Include the whole end day

    const salesInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.paidDate || inv.date);
        const isRevenueType = (inv.type === 'sale' || inv.type === 'dine_in' || inv.type === 'takeaway' || inv.type === 'return' || ((inv.type === 'delivery' || inv.type === 'reservation') && inv.status === 'completed' && inv.paymentStatus === 'paid'));
        return isRevenueType && invDate >= start && invDate <= end;
    });
    
    const filteredExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= start && expDate <= end;
    });

    return { salesInvoices, filteredExpenses };
  }, [invoices, expenses, startDate, endDate]);


  const reportStats = useMemo(() => {
    const { salesInvoices, filteredExpenses } = filteredData;
    
    let grossRevenue = 0;
    let totalReturns = 0;
    
    salesInvoices.forEach(inv => {
        if (inv.type === 'return') {
            totalReturns += Math.abs(inv.total);
        } else {
            grossRevenue += inv.total;
        }
    });

    const netRevenue = grossRevenue - totalReturns;
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    // Note: totalProfit calculation depends on inv.totalProfit which might be 0/undefined if not set by system
    const totalProfit = salesInvoices.reduce((sum, inv) => sum + (inv.totalProfit || 0), 0);
    const netProfit = totalProfit - totalExpenses;

    return { grossRevenue, totalReturns, netRevenue, totalExpenses, netProfit };
  }, [filteredData]);

  const productBreakdown = useMemo(() => {
    const { salesInvoices } = filteredData;
    const map: {
        [productId: string]: {
            name: string;
            soldQty: number;
            returnedQty: number;
            totalSales: number;
            totalReturns: number;
            appearances: number;
            totalCost: number;
        };
    } = {};

    salesInvoices.forEach((inv) => {
        const isReturn = inv.type === 'return';
        const distinctInvoicesForProduct = new Set<string>();
        
        inv.items.forEach((item) => {
            if (!map[item.productId]) {
                const productInfo = products.find(prod => prod.id === item.productId);
                map[item.productId] = {
                    name: item.productName,
                    soldQty: 0,
                    returnedQty: 0,
                    totalSales: 0,
                    totalReturns: 0,
                    appearances: 0,
                    totalCost: 0,
                };
            }

            const qty = item.quantity || 1;
            const itemTotal = (item.price - (item.discount || 0)) * qty;
            const itemCost = (item.cost || 0) * qty;

            if (isReturn) {
                map[item.productId].returnedQty += qty;
                map[item.productId].totalReturns += itemTotal;
                map[item.productId].totalCost -= itemCost;
            } else {
                map[item.productId].soldQty += qty;
                map[item.productId].totalSales += itemTotal;
                map[item.productId].totalCost += itemCost;
                map[item.productId].appearances += 1;
            }
        });
    });

    return Object.entries(map)
        .map(([id, p]) => ({
            id,
            ...p,
            netQty: p.soldQty - p.returnedQty,
            netRevenue: p.totalSales - p.totalReturns,
            netProfit: (p.totalSales - p.totalReturns) - p.totalCost
        }))
        .sort((a, b) => b.netRevenue - a.netRevenue);
  }, [filteredData, products]);

  // Cleanup effect
  useEffect(() => {
    return () => {
        Object.keys(chartInstances.current).forEach(key => chartInstances.current[key]?.destroy());
    }
  }, []);

  // Update charts effect
  useEffect(() => {
    Object.keys(chartInstances.current).forEach(key => chartInstances.current[key]?.destroy());
    const { salesInvoices, filteredExpenses } = filteredData;

    // --- Chart 1: Sales by Category ---
    const salesByCategoryCtx = salesByCategoryChartRef.current?.getContext('2d');
    if (salesByCategoryCtx) {
        const categorySales: { [key: string]: number } = {};
        
        productBreakdown.forEach(p => {
            const productInfo = products.find(prod => prod.id === p.id);
            const category = productInfo?.category || 'غير مصنف';
            categorySales[category] = (categorySales[category] || 0) + p.netRevenue;
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

    // --- Chart 2: Top Selling Products (Net Sales) ---
    const topProductsCtx = topProductsChartRef.current?.getContext('2d');
    if (topProductsCtx) {
        const topN = productBreakdown.slice(0, 5);

        chartInstances.current.topProducts = new Chart(topProductsCtx, {
            type: 'bar',
            data: {
                labels: topN.map(p => p.name),
                datasets: [{
                    label: 'صافي الإيرادات',
                    data: topN.map(p => p.netRevenue),
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
            dailyData[day].profit += inv.totalProfit || 0;
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


  return (
    <div className="p-4 sm:p-6">
      <div className="bg-white shadow-lg rounded-xl p-6 mb-6 text-right">
        <div className="flex justify-between items-center mb-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">التقارير الرسومية</h2>
                <p className="text-sm text-slate-500 mt-1">تحليل مرئي لأداء المطعم. اختر فترة زمنية لعرض البيانات.</p>
            </div>
            <button 
                onClick={handleExportProductAnalysis}
                className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm shadow-md"
            >
                <span className="material-symbols-outlined text-sm">download</span>
                تصدير لـ Excel
            </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t pt-4">
            <InputField id="startDate" label="من تاريخ" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <InputField id="endDate" label="إلى تاريخ" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-6">
        <StatCard title="إجمالي المبيعات" value={reportStats.grossRevenue.toFixed(2)} icon="payments" valueClassName="text-indigo-600" />
        <StatCard title="إجمالي المرتجعات" value={reportStats.totalReturns.toFixed(2)} icon="undo" valueClassName="text-red-400" />
        <StatCard title="صافي الإيرادات" value={reportStats.netRevenue.toFixed(2)} icon="account_balance_wallet" valueClassName="text-emerald-600" />
        <StatCard title="إجمالي المصروفات" value={reportStats.totalExpenses.toFixed(2)} icon="receipt" valueClassName="text-red-500" />
        <StatCard title="صافي الربح" value={reportStats.netProfit.toFixed(2)} icon="trending_up" valueClassName={reportStats.netProfit > 0 ? 'text-green-600' : 'text-red-600'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="الأصناف الأكثر مبيعاً (صافي الإيرادات)">
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

      <div className="bg-white shadow-lg rounded-xl p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-4">تفاصيل مبيعات المنتجات</h3>
        <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                        <th className="p-3 text-right">اسم الصنف</th>
                        <th className="p-3">عدد الفواتير</th>
                        <th className="p-3">المباع</th>
                        <th className="p-3">المرتجع</th>
                        <th className="p-3">صافي الكمية</th>
                        <th className="p-3">إجمالي المبيعات</th>
                        <th className="p-3">إجمالي المرتجعات</th>
                        <th className="p-3 text-indigo-600">صافي الإيراد</th>
                        <th className="p-3">التكلفة التقريبية</th>
                        <th className="p-3 text-emerald-600">صافي الربح</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-center">
                    {productBreakdown.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-medium text-slate-800 text-right">{p.name}</td>
                            <td className="p-3">{p.appearances}</td>
                            <td className="p-3">{p.soldQty}</td>
                            <td className="p-3 text-red-500">{p.returnedQty}</td>
                            <td className="p-3 font-bold">{p.netQty}</td>
                            <td className="p-3 text-green-600">{p.totalSales.toFixed(2)}</td>
                            <td className="p-3 text-red-600">{p.totalReturns.toFixed(2)}</td>
                            <td className="p-3 font-bold text-indigo-600">{p.netRevenue.toFixed(2)}</td>
                            <td className="p-3 text-slate-500">{p.totalCost.toFixed(2)}</td>
                            <td className="p-3 font-bold text-emerald-600">{p.netProfit.toFixed(2)}</td>
                        </tr>
                    ))}
                    {productBreakdown.length === 0 && (
                        <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400">لا توجد بيانات متاحة للفترة المختارة.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;