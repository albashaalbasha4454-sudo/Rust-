import React from 'react';
import type { Department, InvoiceItem } from '../../types';

interface DepartmentProfitSelectorProps {
  item: InvoiceItem;
  departments: Department[];
  onChange: (updates: Partial<InvoiceItem>) => void;
}

const DepartmentProfitSelector: React.FC<DepartmentProfitSelectorProps> = ({ item, departments, onChange }) => {
  const activeDepartments = departments.filter(department => department.status !== 'inactive');

  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-black text-slate-500">
        مرابح هذا الصنف تحسب على أي قسم؟
      </label>
      <select
        value={item.departmentId || ''}
        onChange={(event) => {
          const selectedDepartment = activeDepartments.find(department => department.id === event.target.value);
          onChange({
            departmentId: selectedDepartment?.id || 'dept-misc',
            departmentName: selectedDepartment?.name || 'عام'
          });
        }}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-400 transition-all"
      >
        <option value="">اختر قسم الربح</option>
        {activeDepartments.map(department => (
          <option key={department.id} value={department.id}>
            {department.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DepartmentProfitSelector;
