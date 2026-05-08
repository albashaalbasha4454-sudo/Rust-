import React, { useMemo, useState } from 'react';
import type { Department, Product } from '../types';
import Modal from './Modal';
import InputField from './common/InputField';

interface DepartmentsViewProps {
  departments: Department[];
  addDepartment: (dept: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateDepartment: (id: string, dept: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deleteDepartment: (id: string) => void;
}

const STORAGE_NAMESPACES = [
  'fresh_start_2026_05_07_v8',
  'fresh_start_2026_05_07_v7',
  'fresh_start_2026_05_07_v6',
  'fresh_start_2026_05_07_v5'
];

const normalizeName = (value: unknown) => String(value || '').trim().replace(/\s+/g, ' ');

const ORIENTAL_NAMES = ['اوزي', 'أوزي', 'مندي', 'رز بخاري', 'فريكة', 'يالنجي', 'كبة', 'حراق', 'صحن فرنسي', 'قمحية', 'فتوش', 'تبولة', 'باشا', 'ششبرك', 'شوربة عدس', 'مسخن'];
const FALAFEL_NAMES = ['فلافل', 'فول', 'حمص', 'فتة', 'بيض', 'بدوة', 'مخللات', 'ساندويش بطاطا'];
const GRILL_NAMES = ['كباب لحم', 'كباب جاج', 'كباب دجاج', 'شيش', 'جناحات', 'وردات', 'دبوس'];
const WESTERN_NAMES = ['ماريا', 'فاهيتا', 'فرانشيسكو', 'كاري', 'مكسيكي', 'برجر', 'تشيز', 'سودة'];
const OVEN_NAMES = ['بيتزا', 'لحمة', 'جبنه', 'جبنة', 'زعتر', 'محمرة', 'مرتديلا', 'سبانخ', 'كيري', 'شوكولا', 'زيتون', 'سنفورة', 'سجق', 'توشكا'];
const TAGINE_NAMES = ['فخارة', 'ملوخية'];
const MEAL_NAMES = ['حبة دجاج', 'ربع حبة دجاج'];

const includesAny = (name: string, words: string[]) => words.some(word => name.includes(normalizeName(word)));

const inferDepartmentName = (product: Product) => {
  const written = normalizeName(product.departmentName || product.category);
  const name = normalizeName(product.name);

  if (written && written !== 'عام' && written !== 'غير مصنف') return written;
  if (includesAny(name, ORIENTAL_NAMES)) return 'قسم الشرقي';
  if (includesAny(name, FALAFEL_NAMES)) return 'قسم الفلافل';
  if (includesAny(name, GRILL_NAMES)) return 'قسم المشويات';
  if (includesAny(name, WESTERN_NAMES)) return 'قسم الغربي';
  if (includesAny(name, OVEN_NAMES)) return 'الفرن';
  if (includesAny(name, TAGINE_NAMES)) return 'طواجن';
  if (includesAny(name, MEAL_NAMES)) return 'وجبات';
  return 'عام';
};

const readStoredProducts = (): Product[] => {
  if (typeof window === 'undefined') return [];

  const candidateKeys = [
    ...STORAGE_NAMESPACES.map(namespace => `${namespace}:products`),
    'products'
  ];

  for (const key of candidateKeys) {
    try {
      const rawProducts = window.localStorage.getItem(key);
      const parsedProducts = rawProducts ? JSON.parse(rawProducts) : [];
      if (Array.isArray(parsedProducts) && parsedProducts.length > 0) return parsedProducts;
    } catch {
      // Continue with next key.
    }
  }

  return [];
};

const DepartmentsView: React.FC<DepartmentsViewProps> = ({ departments, addDepartment, updateDepartment, deleteDepartment }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const productsByDepartment = useMemo(() => {
    const products = readStoredProducts();
    const counts = new Map<string, number>();

    products.forEach((product) => {
      const inferredDepartmentName = inferDepartmentName(product);
      const matchedDepartment = departments.find((department) => {
        return department.id === product.departmentId || normalizeName(department.name) === inferredDepartmentName;
      });

      const departmentId = matchedDepartment?.id || product.departmentId || 'dept-misc';
      counts.set(departmentId, (counts.get(departmentId) || 0) + 1);
    });

    return counts;
  }, [departments]);

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

  const handleDelete = (dept: Department) => {
    const productCount = productsByDepartment.get(dept.id) || 0;

    if (productCount > 0) {
      alert(`لا يمكن حذف قسم "${dept.name}" لأنه يحتوي على ${productCount} صنف. انقل الأصناف إلى قسم آخر أو عدّلها أولًا، أو عطّل القسم بدل حذفه.`);
      return;
    }

    if (!window.confirm(`هل تريد حذف قسم "${dept.name}" نهائيًا؟`)) return;
    deleteDepartment(dept.id);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">إدارة الأقسام</h1>
          <p className="text-sm text-slate-500 mt-1">كل قسم يعرض عدد الأصناف المرتبطة به فعليًا.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white py-2.5 px-5 rounded-xl font-bold hover:bg-indigo-700 shadow-sm">
          + إضافة قسم جديد
        </button>
      </div>

      {departments.length === 0 ? (
        <div className="bg-white p-8 rounded-xl text-center border border-slate-200">
          <p className="text-slate-500">لا توجد أقسام بعد. أضف أول قسم للبدء.</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right">
              <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-bold">
                <tr>
                  <th className="p-4">القسم</th>
                  <th className="p-4">المسؤول</th>
                  <th className="p-4">عدد الأصناف</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map(dept => {
                  const productCount = productsByDepartment.get(dept.id) || 0;
                  return (
                    <tr key={dept.id} className="hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-800">{dept.name}</td>
                      <td className="p-4 text-slate-600">{dept.managerName || '-'}</td>
                      <td className="p-4 text-slate-700 font-bold">{productCount}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-black ${dept.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {dept.status === 'active' ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleOpenModal(dept)} className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs">
                            تعديل
                          </button>
                          <button onClick={() => handleDelete(dept)} className="px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-bold text-xs">
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('اسم القسم مطلوب');
      return;
    }

    const duplicate = departments.some((d) => {
      if (department && d.id === department.id) return false;
      return d.name.trim() === trimmedName && d.status === 'active';
    });

    if (duplicate) {
      setError('هذا القسم النشط موجود مسبقاً.');
      return;
    }

    onSave({ name: trimmedName, managerName: managerName.trim(), status, notes: notes.trim() });
  };
  
  return (
    <Modal isOpen={true} onClose={onClose} title={department ? 'تعديل قسم' : 'إضافة قسم'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField id="name" label="اسم القسم" value={name} onChange={e => { setName(e.target.value); setError(''); }} />
        <InputField id="manager" label="المسؤول (اختياري)" value={managerName} onChange={e => setManagerName(e.target.value)} />
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">الحالة</label>
          <select value={status} onChange={e => setStatus(e.target.value as Department['status'])} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
            <option value="active">نشط</option>
            <option value="inactive">معطل</option>
          </select>
        </div>
        <InputField id="notes" label="ملاحظات (اختياري)" value={notes} onChange={e => setNotes(e.target.value)} />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold hover:bg-slate-200">إلغاء</button>
          <button type="submit" className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700">حفظ</button>
        </div>
      </form>
    </Modal>
  );
};

export default DepartmentsView;
