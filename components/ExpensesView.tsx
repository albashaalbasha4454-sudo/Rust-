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
  updateExpense?: (expense: Expense) => void;
  deleteExpense?: (id: string) => void;
}

const ITEMS_PER_PAGE = 10;

const ExpensesView: React.FC<ExpensesViewProps> = ({ expenses, accounts, departments, addExpense, updateExpense, deleteExpense }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const filteredExpenses = useMemo(() => {
    let filtered = expenses;
    
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(exp => 
            exp.description.toLowerCase().includes(term) ||
            (exp.category && exp.category.toLowerCase().includes(term)) ||
            (accounts.find(a => a.id === exp.accountId)?.name.toLowerCase().includes(term))
        );
    }
    
    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0,0,0,0);
        filtered = filtered.filter(exp => new Date(exp.date) >= start);
    }
    
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23,59,59,999);
        filtered = filtered.filter(exp => new Date(exp.date) <= end);
    }
    
    return filtered;
  }, [expenses, searchTerm, accounts, startDate, endDate]);

  const sortedExpenses = useMemo(() => {
    return [...filteredExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredExpenses]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const paginatedExpenses = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedExpenses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedExpenses, currentPage]);
  const totalPages = Math.ceil(sortedExpenses.length / ITEMS_PER_PAGE);

  const handleSave = (expenseData: Omit<Expense, 'id'>) => {
    if (editingExpense && updateExpense) {
        updateExpense({ ...expenseData, id: editingExpense.id } as Expense);
    } else {
        addExpense(expenseData);
    }
    setIsModalOpen(false);
    setEditingExpense(null);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="bg-white shadow-lg rounded-xl">
        <div className="p-6 border-b border-slate-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">سجل المصروفات</h2>
                  <p className="text-sm text-slate-500 mt-1">عرض وتصفح جميع المصروفات المسجلة.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                        <span className="text-[10px] font-bold text-slate-400">من</span>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none outline-none text-xs font-bold text-slate-700" />
                        <span className="text-[10px] font-bold text-slate-400 border-r border-slate-200 h-4 mx-1"></span>
                        <span className="text-[10px] font-bold text-slate-400">إلى</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none outline-none text-xs font-bold text-slate-700" />
                    </div>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input 
                            type="text" 
                            placeholder="بحث في المصروفات..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl py-2 pr-10 pl-4 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all w-full sm:w-64"
                        />
                    </div>
                    <button onClick={() => {
                        if (departments.length === 0) {
                            alert("يجب إضافة قسم أولًا قبل تسجيل المصروفات.");
                            return;
                        }
                        setIsModalOpen(true);
                    }} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                       <span className="material-symbols-outlined">add</span>
                       تسجيل مصروف
                    </button>
                </div>
            </div>
        </div>
        <div className="space-y-4 md:space-y-0">
            {/* Desktop Header */}
            <div className="hidden md:grid md:grid-cols-6 gap-4 items-center bg-slate-50 text-slate-600 uppercase text-xs font-bold px-6 py-3 rounded-t-lg">
                <div>التاريخ</div>
                <div>البيان</div>
                <div>المبلغ</div>
                <div>التصنيف</div>
                <div>دُفع من</div>
                <div className="text-left">الإجراءات</div>
            </div>

            {/* Expenses List / Cards */}
            <div className="space-y-3 md:space-y-0">
            {paginatedExpenses.map((expense) => (
                <div key={expense.id} className={`
                    md:grid md:grid-cols-6 md:gap-4 md:items-center
                    p-4 md:px-6 md:py-3 border-b border-slate-200 
                    hover:bg-slate-50 bg-white md:bg-transparent
                    block rounded-lg md:rounded-none shadow-sm md:shadow-none
                `}>
                    {/* Mobile Header */}
                    <div className="flex justify-between items-start mb-2 md:hidden">
                        <div className="flex flex-col">
                            <h3 className="font-bold text-slate-800">{expense.description}</h3>
                            <span className="text-[10px] text-slate-400">#{expense.id.slice(-6)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-red-600">{expense.amount.toLocaleString()}</span>
                            <div className="flex gap-1">
                                <button onClick={() => handleEdit(expense)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                                    <span className="material-symbols-outlined text-sm">edit</span>
                                </button>
                                <button onClick={() => deleteExpense && deleteExpense(expense.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg">
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Data Cells */}
                    <div className="hidden md:block text-sm">{new Date(expense.date).toLocaleDateString('ar-EG')}</div>
                    <div className="hidden md:block font-semibold text-sm">{expense.description}</div>
                    <div className="hidden md:block font-bold text-red-600 text-sm">{expense.amount.toLocaleString()}</div>
                    <div className="hidden md:block text-sm">{expense.category || '-'}</div>
                    <div className="hidden md:block text-sm">{accounts.find(a => a.id === expense.accountId)?.name || 'غير معروف'}</div>
                    <div className="hidden md:flex justify-end gap-2">
                        <button 
                            onClick={() => handleEdit(expense)} 
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="تعديل"
                        >
                            <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button 
                            onClick={() => deleteExpense && deleteExpense(expense.id)} 
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="حذف"
                        >
                            <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                    </div>

                    {/* Mobile Grid Data */}
                    <div className="grid grid-cols-2 gap-y-2 text-xs md:hidden pt-2 border-t border-slate-100">
                        <div><span className="text-slate-500 font-medium">التاريخ:</span> {new Date(expense.date).toLocaleDateString('ar-EG')}</div>
                        <div><span className="text-slate-500 font-medium">التصنيف:</span> {expense.category || '-'}</div>
                        <div className="col-span-2"><span className="text-slate-500 font-medium">دُفع من:</span> {accounts.find(a => a.id === expense.accountId)?.name || 'غير معروف'}</div>
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
          onClose={() => {
              setIsModalOpen(false);
              setEditingExpense(null);
          }}
          onSave={handleSave}
          accounts={accounts}
          departments={departments}
          expense={editingExpense || undefined}
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
  expense?: Expense;
}> = ({ onClose, onSave, accounts, departments, expense }) => {
  const [description, setDescription] = useState(expense?.description || '');
  const [amount, setAmount] = useState(expense?.amount.toString() || '');
  const [category, setCategory] = useState(expense?.category || '');
  const [accountId, setAccountId] = useState(expense?.accountId || accounts.find(a => a.type === 'cash')?.id || '');
  const [departmentId, setDepartmentId] = useState(expense?.departmentId || departments[0]?.id || '');
  const [date, setDate] = useState((expense?.date ? new Date(expense.date) : new Date()).toISOString().split('T')[0]);
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
    
    onSave({ description, amount: parseFloat(amount), category, date: new Date(date).toISOString(), accountId, departmentId });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={expense ? 'تعديل مصروف' : 'إضافة مصروف جديد'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField id="description" label="البيان" value={description} onChange={(e) => setDescription(e.target.value)} error={errors.description}/>
        <InputField id="amount" label="المبلغ" value={amount} onChange={(e) => setAmount(e.target.value)} type="number" error={errors.amount}/>
        <InputField id="category" label="التصنيف (اختياري)" value={category} onChange={(e) => setCategory(e.target.value)} />
        <div>
            <label htmlFor="departmentId" className="block text-slate-700 text-sm font-bold mb-2">القسم</label>
            <select id="departmentId" value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="w-full p-2 border rounded-lg border-slate-300">
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