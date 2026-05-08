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
  departments: any[];
}> = ({ invoices, products, expenses, departments }) => {
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
        const isCompletedOrder = (inv.type === 'sale' || inv.type === 'dine_in' || inv.type === 'takeaway' || inv.type === 'return' || ((inv.type === 'delivery' || inv.type === 'reservation') && inv.status === 'completed' && inv.paymentStatus === 'paid'));
        return isCompletedOrder && invDate >= start && invDate <= end;
    });
    
    const filteredExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= start && expDate <= end;
    });

    return { salesInvoices, filteredExpenses };
  }, [invoices, expenses, startDate, endDate]);

  const departmentStats = useMemo(() => {
      const { salesInvoices, filteredExpenses } = filteredData;
      const stats: { [key: string]: { name: string, sales: number, profit: number, expense: number } } = {};
      
      // Initialize with all departments from props to ensure 0-val rows exist
      departments.forEach(dept => {
          stats[dept.name] = { name: dept.name, sales: 0, profit: 0, expense: 0 };
      });

      // Also ensure "عام" exists
      if (!stats['عام']) stats['عام'] = { name: 'عام', sales: 0, profit: 0, expense: 0 };

      // Sales and Profit per department
      salesInvoices.forEach(inv => {
          inv.items.forEach(item => {
              const deptName = item.departmentName || 'عام';
              if (!stats[deptName]) stats[deptName] = { name: deptName, sales: 0, profit: 0, expense: 0 };
              stats[deptName].sales += item.lineTotal;
              
              const cost = (item.costPrice || 0) * item.quantity;
              const profit = item.lineTotal - cost;
              stats[deptName].profit += profit;
          });
          
          if (inv.deliveryFee && inv.deliveryFee > 0) {
              const targetDept = 'عام'; // Delivery fee is attributed to General
              if (!stats[targetDept]) stats[targetDept] = { name: targetDept, sales: 0, profit: 0, expense: 0 };
              stats[targetDept].sales += inv.deliveryFee;
              stats[targetDept].profit += inv.deliveryFee;
          }
      });

      // Expenses per department
      filteredExpenses.forEach(exp => {
          const dept = departments.find(d => d.id === exp.departmentId);
          const deptName = dept?.name || exp.category || 'عام';
          if (!stats[deptName]) stats[deptName] = { name: deptName, sales: 0, profit: 0, expense: 0 };
          stats[deptName].expense += exp.amount;
      });

      return Object.values(stats);
  }, [filteredData, departments]);

  const reportStats = useMemo(() => {
    const { salesInvoices, filteredExpenses } = filteredData;
    const totalRevenue = salesInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalProfit = salesInvoices.reduce((sum, inv) => sum + (inv.totalProfit || 0), 0);
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalProfit - totalExpenses;
    return { totalRevenue, totalProfit, totalExpenses, netProfit };
  }, [filteredData]);

  const handlePrintReport = () => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const content = `
          <div dir="rtl" style="font-family: Arial, sans-serif; padding: 40px;">
              <h1 style="text-align: center; color: #1e293b;">تقرير المبيعات والمصروفات التفصيلي</h1>
              <p style="text-align: center; color: #64748b;">الفترة من: ${startDate} إلى: ${endDate}</p>
              
              <div style="margin: 30px 0; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                  <h2 style="border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">ملخص عام</h2>
                  <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                      <tr><td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">إجمالي الإيرادات</td><td style="text-align: left; font-weight: bold;">${reportStats.totalRevenue.toLocaleString()}</td></tr>
                      <tr><td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">إجمالي الأرباح (قبل المصاريف)</td><td style="text-align: left; font-weight: bold;">${reportStats.totalProfit.toLocaleString()}</td></tr>
                      <tr><td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">إجمالي المصروفات</td><td style="text-align: left; font-weight: bold; color: #ef4444;">${reportStats.totalExpenses.toLocaleString()}</td></tr>
                      <tr><td style="padding: 10px; font-weight: bold; font-size: 20px;">صافي الربح</td><td style="text-align: left; font-weight: bold; font-size: 20px; color: ${reportStats.netProfit >= 0 ? '#10b981' : '#ef4444'}">${reportStats.netProfit.toLocaleString()}</td></tr>
                  </table>
              </div>

              <h2 style="margin-top: 40px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">تحليل الأقسام</h2>
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                  <thead>
                      <tr style="background-color: #f8fafc;">
                          <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: right;">القسم</th>
                          <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">المبيعات</th>
                          <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">المصاريف</th>
                          <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">إجمالي الربح</th>
                          <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">صافي ربح القسم</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${departmentStats.map(stat => `
                          <tr>
                              <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: right;">${stat.name}</td>
                              <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">${stat.sales.toLocaleString()}</td>
                              <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: left; color: #ef4444;">${stat.expense.toLocaleString()}</td>
                              <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: left; color: #10b981;">${stat.profit.toLocaleString()}</td>
                              <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: left; font-weight: bold; color: ${(stat.profit - stat.expense) >= 0 ? '#10b981' : '#ef4444'}">${(stat.profit - stat.expense).toLocaleString()}</td>
                          </tr>
                      `).join('')}
                  </tbody>
              </table>
              
              <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8;">
                  تم استخراج هذا التقرير بتاريخ: ${new Date().toLocaleString('ar-EG')}
              </div>
          </div>
      `;

      printWindow.document.write(`<html><head><title>تقرير مفصل</title></head><body>${content}</body></html>`);
      printWindow.document.close();
      printWindow.print();
  };

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
                const itemTotal = item.lineTotal;
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
                const itemTotal = item.lineTotal;
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
    <div className="p-4 sm:p-6 pb-20">
      <div className="bg-white shadow-lg rounded-xl p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">التقارير التحليلية</h2>
            <p className="text-sm text-slate-500 mt-1">تحليل مفصل للأداء والأقسام والمصاريف.</p>
        </div>
        <button 
            onClick={handlePrintReport}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-200"
        >
            <span className="material-symbols-outlined">print</span>
            <span>طباعة تقرير تفصيلي</span>
        </button>
      </div>

      <div className="bg-white shadow-lg rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField id="startDate" label="من تاريخ" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <InputField id="endDate" label="إلى تاريخ" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard title="إجمالي الإيرادات" value={reportStats.totalRevenue.toLocaleString()} icon="payments" valueClassName="text-indigo-600" />
        <StatCard title="إجمالي الربح" value={reportStats.totalProfit.toLocaleString()} icon="account_balance_wallet" valueClassName="text-sky-600" />
        <StatCard title="إجمالي المصروفات" value={reportStats.totalExpenses.toLocaleString()} icon="receipt" valueClassName="text-red-500" />
        <StatCard title="صافي الربح" value={reportStats.netProfit.toLocaleString()} icon="trending_up" valueClassName={reportStats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'} />
      </div>

      {/* New Section: Department Analysis Table */}
      <div className="bg-white shadow-lg rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
            <h3 className="text-xl font-bold text-slate-800 border-r-4 border-indigo-600 pr-3">تحليل الأقسام</h3>
            <p className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                الفترة: <span className="text-indigo-600">{startDate}</span> إلى <span className="text-indigo-600">{endDate}</span>
            </p>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-right">
                <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4 rounded-r-xl">القسم</th>
                        <th className="px-6 py-4">المبيعات</th>
                        <th className="px-6 py-4">المصاريف</th>
                        <th className="px-6 py-4">إجمالي الربح</th>
                        <th className="px-6 py-4 rounded-l-xl">صافي ربح القسم</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {departmentStats.map((stat, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4 font-bold text-slate-700">{stat.name}</td>
                            <td className="px-6 py-4 font-mono text-indigo-600 font-bold">{stat.sales.toLocaleString()}</td>
                            <td className="px-6 py-4 font-mono text-red-500">{stat.expense.toLocaleString()}</td>
                            <td className="px-6 py-4 font-mono text-emerald-600">{stat.profit.toLocaleString()}</td>
                            <td className={`px-6 py-4 font-mono font-black ${(stat.profit - stat.expense) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                {(stat.profit - stat.expense).toLocaleString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* Item Profit Analysis Table */}
      <div className="bg-white shadow-lg rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
            <h3 className="text-xl font-bold text-slate-800 border-r-4 border-indigo-600 pr-3">تحليل أرباح الأصناف</h3>
            <p className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                الفترة: <span className="text-indigo-600">{startDate}</span> إلى <span className="text-indigo-600">{endDate}</span>
            </p>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-right">
                <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4 rounded-r-xl">الصنف</th>
                        <th className="px-6 py-4 text-center">الكمية المباعة</th>
                        <th className="px-6 py-4 text-left">إجمالي المبيعات</th>
                        <th className="px-6 py-4 text-left">إجمالي التكلفة</th>
                        <th className="px-6 py-4 text-left rounded-l-xl">إجمالي الربح</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {(() => {
                        const productStats: { [key: string]: { name: string, qty: number, sales: number, cost: number } } = {};
                        filteredData.salesInvoices.forEach(inv => {
                            inv.items.forEach(item => {
                                if (!productStats[item.productId]) {
                                    productStats[item.productId] = { name: item.productName, qty: 0, sales: 0, cost: 0 };
                                }
                                productStats[item.productId].qty += item.quantity;
                                productStats[item.productId].sales += item.lineTotal;
                                productStats[item.productId].cost += (item.costPrice || 0) * item.quantity;
                            });
                        });
                        return Object.values(productStats).sort((a, b) => b.sales - a.sales).map((stat, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-3 font-bold text-slate-700">{stat.name}</td>
                                <td className="px-6 py-3 text-center font-mono">{stat.qty}</td>
                                <td className="px-6 py-3 text-left font-mono text-indigo-600 font-bold">{stat.sales.toLocaleString()}</td>
                                <td className="px-6 py-3 text-left font-mono text-slate-500">{stat.cost.toLocaleString()}</td>
                                <td className={`px-6 py-3 text-left font-mono font-black ${stat.sales - stat.cost >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {(stat.sales - stat.cost).toLocaleString()}
                                </td>
                            </tr>
                        ));
                    })()}
                </tbody>
            </table>
        </div>
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