import React, { useState, useMemo } from 'react';
import type { Expense, FinancialAccount, Department } from '../types';
import Modal from './Modal';
import InputField from './common/InputField';
import Pagination from './common/Pagination';

interface ExpensesViewProps {
  expenses: Expense[];
  accounts: FinancialAccount[];
  departments: Department[];
  addExpense: (expense: Omit<Expense, 'id'>) => void;
}

const ITEMS_PER_PAGE = 10;

const ExpensesView: React.FC<ExpensesViewProps> = ({ expenses, accounts, departments, addExpense }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const departmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach(department => map.set(department.id, department.name));
    return map;
  }, [departments]);

  const getDepartmentName = (departmentId: string) => departmentNameById.get(departmentId) || 'غير محدد';

  const expensesByDepartment = useMemo(() => {
    const rows = new Map<string, { name: string; total: number; count: number }>();
    expenses.forEach(expense => {
      const name = getDepartmentName(expense.departmentId);
      if (!rows.has(name)) rows.set(name, { name, total: 0, count: 0 });
      const row = rows.get(name)!;
      row.total += Number(expense.amount || 0);
      row.count += 1;
    });
    return Array.from(rows.values()).sort((a, b) => b.total - a.total);
  }, [expenses, departmentNameById]);
  
  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const paginatedExpenses = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedExpenses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedExpenses, currentPage]);
  const totalPages = Math.ceil(sortedExpenses.length / ITEMS_PER_PAGE);

  const handleSave = (expenseData: Omit<Expense, 'id'>) => {
    addExpense(expenseData);
    setIsModalOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="bg-white shadow-lg rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">سجل المصروفات</h2>
            <p className="text-sm text-slate-500 mt-1">كل مصروف مربوط بقسم محدد حتى تظهر المصروفات حسب القسم في التقارير.</p>
          </div>
          <button onClick={() => {
            if (departments.length === 0) {
              alert('يجب إضافة قسم أولًا قبل تسجيل المصروفات.');
              return;
            }
            setIsModalOpen(true);
          }} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
            <span className="material-symbols-outlined">add</span>
            تسجيل مصروف
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 border-b border-slate-100 bg-slate-50/60">
          {expensesByDepartment.length === 0 ? (
            <div className="md:col-span-3 text-center text-slate-500 py-4">لا توجد مصروفات مقسمة حسب الأقسام بعد.</div>
          ) : expensesByDepartment.map(row => (
            <div key={row.name} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="text-sm font-black text-slate-800">{row.name}</div>
              <div className="mt-2 text-xl font-black text-red-600">{row.total.toLocaleString('ar-SY', { maximumFractionDigits: 0 })} ل.س</div>
              <div className="mt-1 text-xs text-slate-400">{row.count} مصروف</div>
            </div>
          ))}
        </div>

        <div className="space-y-4 md:space-y-0">
          <div className="hidden md:grid md:grid-cols-6 gap-4 items-center bg-slate-50 text-slate-600 uppercase text-xs font-bold px-6 py-3">
            <div>التاريخ</div>
            <div>القسم</div>
            <div>البيان</div>
            <div>المبلغ</div>
            <div>التصنيف</div>
            <div>دُفع من</div>
          </div>

          <div className="space-y-3 md:space-y-0">
            {paginatedExpenses.map((expense) => (
              <div key={expense.id} className="md:grid md:grid-cols-6 md:gap-4 md:items-center p-4 md:px-6 md:py-3 border-b border-slate-200 hover:bg-slate-50 bg-white md:bg-transparent block rounded-lg md:rounded-none shadow-sm md:shadow-none">
                <div className="flex justify-between items-start mb-2 md:hidden">
                  <div>
                    <h3 className="font-bold text-slate-800">{expense.description}</h3>
                    <p className="text-xs text-indigo-600 font-bold mt-1">{getDepartmentName(expense.departmentId)}</p>
                  </div>
                  <span className="font-bold text-red-600">{expense.amount.toFixed(2)}</span>
                </div>

                <div className="hidden md:block text-sm">{new Date(expense.date).toLocaleDateString('ar-EG')}</div>
                <div className="hidden md:block text-sm font-bold text-indigo-700">{getDepartmentName(expense.departmentId)}</div>
                <div className="hidden md:block font-semibold text-sm">{expense.description}</div>
                <div className="hidden md:block font-bold text-red-600 text-sm">{expense.amount.toFixed(2)}</div>
                <div className="hidden md:block text-sm">{expense.category || '-'}</div>
                <div className="hidden md:block text-sm">{accounts.find(a => a.id === expense.accountId)?.name || 'غير معروف'}</div>

                <div className="grid grid-cols-2 gap-y-2 text-xs md:hidden pt-2 border-t border-slate-100">
                  <div><span className="text-slate-500">التاريخ:</span> {new Date(expense.date).toLocaleDateString('ar-EG')}</div>
                  <div><span className="text-slate-500">التصنيف:</span> {expense.category || '-'}</div>
                  <div className="col-span-2"><span className="text-slate-500">دُفع من:</span> {accounts.find(a => a.id === expense.accountId)?.name || 'غير معروف'}</div>
                </div>
              </div>
            ))}
          </div>
          {sortedExpenses.length === 0 && <p className="text-center py-8 text-slate-500">لا يوجد مصروفات لعرضها.</p>}
        </div>
        <div className="p-6 border-t border-slate-200">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={sortedExpenses.length}
          />
        </div>
      </div>
      {isModalOpen && (
        <ExpenseModal
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          accounts={accounts}
          departments={departments}
        />
      )}
    </div>
  );
};

const ExpenseModal: React.FC<{
  onClose: () => void;
  onSave: (expense: Omit<Expense, 'id'>) => void;
  accounts: FinancialAccount[];
  departments: Department[];
}> = ({ onClose, onSave, accounts, departments }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState(accounts.find(a => a.type === 'cash')?.id || '');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};
    if (!description.trim()) newErrors.description = 'البيان مطلوب.';
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) newErrors.amount = 'المبلغ يجب أن يكون رقماً موجباً.';
    if (!accountId) newErrors.accountId = 'يجب تحديد حساب الدفع.';
    if (!departmentId) newErrors.departmentId = 'يجب تحديد القسم.';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onSave({
      description: description.trim(),
      amount: numAmount,
      category: category.trim(),
      date: new Date(date).toISOString(),
      accountId,
      departmentId,
      status: 'completed'
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="إضافة مصروف جديد">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField id="description" label="البيان" value={description} onChange={(e) => setDescription(e.target.value)} error={errors.description}/>
        <InputField id="amount" label="المبلغ" value={amount} onChange={(e) => setAmount(e.target.value)} type="number" error={errors.amount}/>
        <InputField id="category" label="التصنيف (اختياري)" value={category} onChange={(e) => setCategory(e.target.value)} />
        <div>
          <label htmlFor="departmentId" className="block text-slate-700 text-sm font-bold mb-2">القسم المسؤول عن المصروف</label>
          <select id="departmentId" value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="w-full p-2 border rounded-lg border-slate-300 bg-white">
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {errors.departmentId && <p className="text-red-500 text-xs italic mt-1">{errors.departmentId}</p>}
        </div>
        <div>
          <label htmlFor="accountId" className="block text-slate-700 text-sm font-bold mb-2">الدفع من حساب</label>
          <select id="accountId" value={accountId} onChange={e => setAccountId(e.target.value)} className={`w-full p-2 border rounded-lg bg-white ${errors.accountId ? 'border-red-500' : 'border-slate-300'}`}>
            <option value="">-- اختر --</option>
            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
          {errors.accountId && <p className="text-red-500 text-xs italic mt-1">{errors.accountId}</p>}
        </div>
        <InputField id="date" label="التاريخ" value={date} onChange={(e) => setDate(e.target.value)} type="date" />
        <div className="flex items-center justify-end gap-3 pt-6 mt-4 border-t border-slate-200">
          <button type="button" onClick={onClose} className="bg-slate-100 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-200 transition-colors">إلغاء</button>
          <button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">حفظ المصروف</button>
        </div>
      </form>
    </Modal>
  );
};

export default ExpensesView;
