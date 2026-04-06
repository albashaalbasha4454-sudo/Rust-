import React, { useMemo } from 'react';
import type { Invoice, Expense, FinancialTransaction } from '../types';

const StatCard = ({ title, value, icon, valueClassName, subtext }: { title: string, value: string | number, icon: string, valueClassName?: string, subtext?: string }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg flex items-center gap-4 border border-slate-200">
        <div className={`p-3 rounded-full ${valueClassName} bg-opacity-10`}>
            <span className={`material-symbols-outlined text-4xl ${valueClassName}`}>{icon}</span>
        </div>
        <div>
            <h3 className="text-slate-600 text-md">{title}</h3>
            <p className={`text-2xl font-bold ${valueClassName || 'text-slate-800'}`}>{value}</p>
            {subtext && <p className="text-sm text-slate-400">{subtext}</p>}
        </div>
    </div>
);

const FinancialSummaryView: React.FC<{
  invoices: Invoice[];
  expenses: Expense[];
  transactions: FinancialTransaction[];
  accountBalances: Map<string, number>;
}> = ({ invoices, expenses, transactions, accountBalances }) => {

    const financialData = useMemo(() => {
        // Income Statement
        const completedSales = invoices.filter(inv => (inv.type === 'sale' || (inv.type === 'shipping' && inv.status === 'completed')) && inv.paymentStatus === 'paid');
        const returns = invoices.filter(inv => inv.type === 'return');
        
        const totalRevenue = completedSales.reduce((sum, inv) => sum + inv.total, 0);
        const totalReturnsValue = Math.abs(returns.reduce((sum, inv) => sum + inv.total, 0)); // total is negative
        
        const cogs = completedSales.reduce((sum, inv) => sum + (inv.totalCost || 0), 0);
        const grossProfit = totalRevenue - totalReturnsValue - cogs;

        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const netProfit = grossProfit - totalExpenses;

        // Statement of Capital
        const capitalDeposits = transactions.filter(tx => tx.type === 'capital_deposit').reduce((sum, tx) => sum + tx.amount, 0);
        const profitWithdrawals = transactions.filter(tx => tx.type === 'profit_withdrawal').reduce((sum, tx) => sum + tx.amount, 0);
        const ownerEquity = capitalDeposits - profitWithdrawals;

        // Financial Position
        let totalCashAndBank = 0;
        accountBalances.forEach((balance) => {
            totalCashAndBank += balance;
        });
        
        return {
            totalRevenue, totalReturnsValue, cogs,
            grossProfit, totalExpenses, netProfit,
            capitalDeposits, profitWithdrawals, ownerEquity,
            totalCashAndBank
        };

    }, [invoices, expenses, transactions, accountBalances]);

  return (
    <div className="p-4 sm:p-6 bg-slate-100">
      <div className="mb-6">
         <h2 className="text-3xl font-bold text-slate-800">الملخص المالي الشامل</h2>
         <p className="text-sm text-slate-500 mt-1">نظرة عامة على الأداء المالي للمطعم منذ بداية التسجيل.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
              <div className="bg-white shadow-xl rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4 border-b pb-3">
                      <span className="material-symbols-outlined text-indigo-600 text-3xl">account_balance</span>
                      <h3 className="text-2xl font-bold text-slate-800">قائمة الأرباح والخسائر</h3>
                  </div>
                  <div className="space-y-3 text-lg">
                      <div className="flex justify-between items-center p-2 rounded-md hover:bg-slate-50"><span>إجمالي الإيرادات (من المبيعات)</span> <span className="font-bold text-green-600">{financialData.totalRevenue.toFixed(2)}</span></div>
                      <div className="flex justify-between items-center p-2 rounded-md hover:bg-slate-50"><span>(-) إجمالي المرتجعات</span> <span className="font-bold text-red-600">{financialData.totalReturnsValue.toFixed(2)}</span></div>
                      <div className="flex justify-between items-center p-2 rounded-md hover:bg-slate-50"><span>(-) تكلفة البضاعة المباعة</span> <span className="font-bold text-red-600">{financialData.cogs.toFixed(2)}</span></div>
                      <hr/>
                      <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg"><strong>مجمل الربح</strong> <strong className="font-extrabold text-indigo-700">{financialData.grossProfit.toFixed(2)}</strong></div>
                      <div className="flex justify-between items-center p-2 rounded-md hover:bg-slate-50"><span>(-) إجمالي المصروفات</span> <span className="font-bold text-red-600">{financialData.totalExpenses.toFixed(2)}</span></div>
                      <hr/>
                      <div className={`flex justify-between items-center p-4 rounded-lg ${financialData.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                          <strong className="text-xl">صافي الربح</strong> 
                          <strong className={`font-extrabold text-2xl ${financialData.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{financialData.netProfit.toFixed(2)}</strong>
                      </div>
                  </div>
              </div>

               <div className="bg-white shadow-xl rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4 border-b pb-3">
                      <span className="material-symbols-outlined text-orange-600 text-3xl">foundation</span>
                      <h3 className="text-2xl font-bold text-slate-800">قائمة رأس المال (حقوق الملكية)</h3>
                  </div>
                  <div className="space-y-3 text-lg">
                      <div className="flex justify-between items-center p-2 rounded-md hover:bg-slate-50"><span>(+) إيداعات رأس المال</span> <span className="font-bold text-green-600">{financialData.capitalDeposits.toFixed(2)}</span></div>
                      <div className="flex justify-between items-center p-2 rounded-md hover:bg-slate-50"><span>(-) مسحوبات الأرباح</span> <span className="font-bold text-red-600">{financialData.profitWithdrawals.toFixed(2)}</span></div>
                      <hr/>
                      <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                        <strong>حقوق الملكية (تقديري)</strong> 
                        <strong className="font-extrabold text-orange-700 text-xl">{financialData.ownerEquity.toFixed(2)}</strong>
                      </div>
                  </div>
              </div>
          </div>

          <div className="xl:col-span-1 space-y-6">
              <div className="bg-white shadow-xl rounded-xl p-6 sticky top-6">
                   <div className="flex items-center gap-3 mb-4 border-b pb-3">
                      <span className="material-symbols-outlined text-sky-600 text-3xl">summarize</span>
                      <h3 className="text-2xl font-bold text-slate-800">ملخص المركز المالي</h3>
                  </div>
                  <div className="space-y-6">
                      <StatCard title="إجمالي النقدية" subtext="في جميع الخزائن والبنوك" value={financialData.totalCashAndBank.toFixed(2)} icon="wallet" valueClassName="text-green-600" />
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default FinancialSummaryView;