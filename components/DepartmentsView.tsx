import React, { useState } from 'react';
import type { Department } from '../types';
import Modal from './Modal';
import InputField from './common/InputField';

interface DepartmentsViewProps {
  departments: Department[];
  addDepartment: (dept: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateDepartment: (id: string, dept: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deleteDepartment: (id: string) => void;
}

const DepartmentsView: React.FC<DepartmentsViewProps> = ({ departments, addDepartment, updateDepartment }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const handleOpenModal = (dept: Department | null = null) => {
    setEditingDept(dept);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingDept(null);
    setIsModalOpen(false);
  };

  const handleSave = (deptData: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingDept) {
      updateDepartment(editingDept.id, deptData);
    } else {
      addDepartment(deptData);
    }
    handleCloseModal();
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">إدارة الأقسام</h1>
        <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white py-2 px-4 rounded-lg font-bold hover:bg-indigo-700">
          + إضافة قسم
        </button>
      </div>

      {departments.length === 0 ? (
        <div className="bg-white p-8 rounded-xl text-center border border-slate-200">
          <p className="text-slate-500">لا توجد أقسام بعد. أضف أول قسم للبدء.</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-right">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-bold">
              <tr>
                <th className="p-4">القسم</th>
                <th className="p-4">المسؤول</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map(dept => (
                <tr key={dept.id}>
                  <td className="p-4 font-bold text-slate-800">{dept.name}</td>
                  <td className="p-4 text-slate-600">{dept.managerName || '-'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${dept.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {dept.status === 'active' ? 'نشط' : 'معطل'}
                    </span>
                  </td>
                  <td className="p-4">
                    <button onClick={() => handleOpenModal(dept)} className="text-indigo-600 hover:text-indigo-800 font-medium">تعديل</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <DepartmentModal department={editingDept} onClose={handleCloseModal} onSave={handleSave} departments={departments} />
      )}
    </div>
  );
};

const DepartmentModal: React.FC<{
  department: Department | null;
  onClose: () => void;
  onSave: (dept: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>) => void;
  departments: Department[];
}> = ({ department, onClose, onSave, departments }) => {
  const [name, setName] = useState(department?.name || '');
  const [managerName, setManagerName] = useState(department?.managerName || '');
  const [status, setStatus] = useState<Department['status']>(department?.status || 'active');
  const [notes, setNotes] = useState(department?.notes || '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('اسم القسم مطلوب'); return; }
    
    // Check for duplicates
    if (!department && departments.some(d => d.name === name.trim() && d.status === 'active')) {
        setError('هذا القسم النشط موجود مسبقاً.');
        return;
    }

    onSave({ name: name.trim(), managerName: managerName.trim(), status, notes: notes.trim() });
  };
  
  return (
    <Modal isOpen={true} onClose={onClose} title={department ? 'تعديل قسم' : 'إضافة قسم'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
            <InputField id="name" label="اسم القسم" value={name} onChange={e => setName(e.target.value)} />
            <InputField id="manager" label="المسؤول (اختياري)" value={managerName} onChange={e => setManagerName(e.target.value)} />
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">الحالة</label>
                <select value={status} onChange={e => setStatus(e.target.value as Department['status'])} className="w-full p-2 border border-slate-300 rounded-lg">
                    <option value="active">نشط</option>
                    <option value="inactive">معطل</option>
                </select>
            </div>
            <InputField id="notes" label="ملاحظات (اختياري)" value={notes} onChange={e => setNotes(e.target.value)} />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" className="w-full bg-indigo-600 text-white p-2 rounded-lg font-bold">حفظ</button>
        </form>
    </Modal>
  );
};

export default DepartmentsView;
