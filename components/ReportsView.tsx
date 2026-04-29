import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { Invoice, Product, Expense } from '../types';
import { Chart, registerables } from 'chart.js';
import InputField from './common/InputField';

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

  const filteredData = useMemo(() => {
    const start = startDate ? new Date(startDate) : new Date('1970-01-01');
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999); // Include the whole end day

    const salesInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.paidDate || inv.date);
        const isCompletedOrder = (inv.type === 'sale' || inv.type === 'dine_in' || inv.type === 'takeaway' || ((inv.type === 'delivery' || inv.type === 'reservation') && inv.status === 'completed' && inv.paymentStatus === 'paid'));
        return isCompletedOrder && invDate >= start && invDate <= end;
    });
    
    const filteredExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= start && expDate <= end;
    });

    return { salesInvoices, filteredExpenses };
  }, [invoices, expenses, startDate, endDate]);


  const reportStats = useMemo(() => {
    const { salesInvoices, filteredExpenses } = filteredData;
    const totalRevenue = salesInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalProfit = salesInvoices.reduce((sum, inv) => sum + (inv.totalProfit || 0), 0);
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalProfit - totalExpenses;
    return { totalRevenue, totalProfit, totalExpenses, netProfit };
  }, [filteredData]);

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
      <div className="bg-white shadow-lg rounded-xl p-6 mb-6">
        <h2 className="text-2xl font-bold text-slate-800">التقارير الرسومية</h2>
        <p className="text-sm text-slate-500 mt-1">تحليل مرئي لأداء المطعم. اختر فترة زمنية لعرض البيانات.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t pt-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
    </div>
  );
};

export default ReportsView;