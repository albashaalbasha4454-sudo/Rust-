import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { Invoice, Product, Expense } from '../types';
import { initialDepartments } from '../initialData';
import { Chart, registerables } from 'chart.js';
import InputField from './common/InputField';

Chart.register(...registerables);

const money = (value: number) => value.toLocaleString('ar-SY', { maximumFractionDigits: 0 });

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

  const departmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    initialDepartments.forEach(department => map.set(department.id, department.name));
    products.forEach(product => {
      if (product.departmentId && product.departmentName) map.set(product.departmentId, product.departmentName);
    });
    return map;
  }, [products]);

  const getExpenseDepartmentName = (expense: Expense) => {
    if (!expense.departmentId) return 'غير محدد';
    return departmentNameById.get(expense.departmentId) || expense.departmentId || 'غير محدد';
  };

  const filteredData = useMemo(() => {
    const start = startDate ? new Date(startDate) : new Date('1970-01-01');
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const salesInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.paidDate || inv.date);
      const isCompletedOrder = (
        inv.type === 'sale' ||
        inv.type === 'dine_in' ||
        inv.type === 'takeaway' ||
        ((inv.type === 'delivery' || inv.type === 'reservation') && inv.status === 'completed' && inv.paymentStatus === 'paid')
      );
      return isCompletedOrder && invDate >= start && invDate <= end;
    });

    const filteredExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate >= start && expDate <= end;
    });

    return { salesInvoices, filteredExpenses };
  }, [invoices, expenses, startDate, endDate]);

  const departmentBreakdown = useMemo(() => {
    const rows = new Map<string, { department: string; sales: number; expenses: number; net: number; itemsCount: number; expensesCount: number }>();
    const ensure = (department: string) => {
      if (!rows.has(department)) rows.set(department, { department, sales: 0, expenses: 0, net: 0, itemsCount: 0, expensesCount: 0 });
      return rows.get(department)!;
    };

    filteredData.salesInvoices.forEach(invoice => {
      invoice.items.forEach(item => {
        const product = products.find(p => p.id === item.productId || `needs-price-${p.id}` === item.productId);
        const department = item.departmentName || product?.departmentName || product?.category || 'غير مصنف';
        const row = ensure(department);
        row.sales += Number(item.lineTotal || 0);
        row.itemsCount += Number(item.quantity || 0);
      });
    });

    filteredData.filteredExpenses.forEach(expense => {
      const row = ensure(getExpenseDepartmentName(expense));
      row.expenses += Number(expense.amount || 0);
      row.expensesCount += 1;
    });

    return Array.from(rows.values())
      .map(row => ({ ...row, net: row.sales - row.expenses }))
      .sort((a, b) => b.sales - a.sales || b.expenses - a.expenses);
  }, [filteredData, products, departmentNameById]);

  const reportStats = useMemo(() => {
    const { salesInvoices, filteredExpenses } = filteredData;
    const totalRevenue = salesInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
    const totalProfit = salesInvoices.reduce((sum, inv: any) => sum + Number(inv.totalProfit || inv.total || 0), 0);
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    return { totalRevenue, totalProfit, totalExpenses, netProfit };
  }, [filteredData]);

  useEffect(() => {
    return () => {
      Object.keys(chartInstances.current).forEach(key => chartInstances.current[key]?.destroy());
    };
  }, []);

  useEffect(() => {
    Object.keys(chartInstances.current).forEach(key => chartInstances.current[key]?.destroy());
    const { salesInvoices, filteredExpenses } = filteredData;

    const salesByCategoryCtx = salesByCategoryChartRef.current?.getContext('2d');
    if (salesByCategoryCtx) {
      const categorySales: { [key: string]: number } = {};
      salesInvoices.forEach(inv => {
        inv.items.forEach(item => {
          const product = products.find(p => p.id === item.productId || `needs-price-${p.id}` === item.productId);
          const category = item.departmentName || product?.departmentName || product?.category || 'غير مصنف';
          categorySales[category] = (categorySales[category] || 0) + Number(item.lineTotal || 0);
        });
      });

      chartInstances.current.salesByCategory = new Chart(salesByCategoryCtx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(categorySales),
          datasets: [{
            label: 'المبيعات حسب القسم',
            data: Object.values(categorySales),
            backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#6b7280', '#14b8a6', '#a855f7'],
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }

    const topProductsCtx = topProductsChartRef.current?.getContext('2d');
    if (topProductsCtx) {
      const productSales: { [key: string]: { name: string; total: number } } = {};
      salesInvoices.forEach(inv => {
        inv.items.forEach(item => {
          if (!productSales[item.productId]) productSales[item.productId] = { name: item.productName, total: 0 };
          productSales[item.productId].total += Number(item.lineTotal || 0);
        });
      });
      const topProducts = Object.values(productSales).sort((a, b) => b.total - a.total).slice(0, 5);

      chartInstances.current.topProducts = new Chart(topProductsCtx, {
        type: 'bar',
        data: {
          labels: topProducts.map(p => p.name),
          datasets: [{ label: 'إجمالي الإيرادات', data: topProducts.map(p => p.total), backgroundColor: '#3b82f6' }]
        },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' }
      });
    }

    const profitExpenseCtx = profitExpenseChartRef.current?.getContext('2d');
    if (profitExpenseCtx) {
      const dailyData: { [date: string]: { sales: number; expense: number } } = {};
      salesInvoices.forEach(inv => {
        const day = new Date(inv.paidDate || inv.date).toISOString().split('T')[0];
        if (!dailyData[day]) dailyData[day] = { sales: 0, expense: 0 };
        dailyData[day].sales += Number(inv.total || 0);
      });
      filteredExpenses.forEach(exp => {
        const day = new Date(exp.date).toISOString().split('T')[0];
        if (!dailyData[day]) dailyData[day] = { sales: 0, expense: 0 };
        dailyData[day].expense += Number(exp.amount || 0);
      });

      const sortedDays = Object.keys(dailyData).sort();

      chartInstances.current.profitExpense = new Chart(profitExpenseCtx, {
        type: 'line',
        data: {
          labels: sortedDays.map(d => new Date(d).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })),
          datasets: [
            { label: 'المبيعات', data: sortedDays.map(day => dailyData[day].sales), borderColor: '#10b981', tension: 0.1 },
            { label: 'المصروفات', data: sortedDays.map(day => dailyData[day].expense), borderColor: '#ef4444', tension: 0.1 }
          ],
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
  }, [filteredData, products]);

  return (
    <div className="p-4 sm:p-6">
      <div className="bg-white shadow-lg rounded-xl p-6 mb-6">
        <h2 className="text-2xl font-bold text-slate-800">التقارير المالية</h2>
        <p className="text-sm text-slate-500 mt-1">مبيع كل قسم ومصروف كل قسم وصافي كل قسم خلال الفترة المحددة.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t pt-4">
          <InputField id="startDate" label="من تاريخ" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <InputField id="endDate" label="إلى تاريخ" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard title="إجمالي المبيعات" value={`${money(reportStats.totalRevenue)} ل.س`} icon="payments" valueClassName="text-indigo-600" />
        <StatCard title="إجمالي المصروفات" value={`${money(reportStats.totalExpenses)} ل.س`} icon="receipt" valueClassName="text-red-500" />
        <StatCard title="الصافي" value={`${money(reportStats.netProfit)} ل.س`} icon="trending_up" valueClassName={reportStats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'} />
        <StatCard title="عدد الأقسام" value={departmentBreakdown.length} icon="category" valueClassName="text-sky-600" />
      </div>

      <div className="bg-white shadow-lg rounded-xl overflow-hidden mb-6">
        <div className="p-5 border-b border-slate-200">
          <h3 className="text-xl font-black text-slate-800">مبيع ومصروف كل قسم على حدة</h3>
          <p className="text-xs text-slate-500 mt-1">الصافي = مبيعات القسم - مصروفات القسم</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right">
            <thead className="bg-slate-50 text-slate-500 text-xs font-black">
              <tr>
                <th className="p-3">القسم</th>
                <th className="p-3">مبيعات القسم</th>
                <th className="p-3">مصروف القسم</th>
                <th className="p-3">الصافي</th>
                <th className="p-3">عدد الأصناف المباعة</th>
                <th className="p-3">عدد المصروفات</th>
              </tr>
            </thead>
            <tbody>
              {departmentBreakdown.map(row => (
                <tr key={row.department} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-3 font-black text-slate-800">{row.department}</td>
                  <td className="p-3 font-bold text-green-700">{money(row.sales)} ل.س</td>
                  <td className="p-3 font-bold text-red-600">{money(row.expenses)} ل.س</td>
                  <td className={`p-3 font-black ${row.net >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>{money(row.net)} ل.س</td>
                  <td className="p-3 text-slate-600">{row.itemsCount}</td>
                  <td className="p-3 text-slate-600">{row.expensesCount}</td>
                </tr>
              ))}
              {departmentBreakdown.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">لا توجد مبيعات أو مصروفات في هذه الفترة.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="الأصناف الأكثر مبيعاً حسب الإيرادات">
          <canvas ref={topProductsChartRef}></canvas>
        </ChartCard>
        <ChartCard title="المبيعات حسب القسم">
          <canvas ref={salesByCategoryChartRef}></canvas>
        </ChartCard>
        <div className="lg:col-span-2">
          <ChartCard title="المبيعات والمصروفات اليومية">
            <canvas ref={profitExpenseChartRef}></canvas>
          </ChartCard>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
