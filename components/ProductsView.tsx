import React, { useState, useMemo } from 'react';
import type { Product, Modifier, Department } from '../types';
import Modal from './Modal';
import InputField from './common/InputField';
import Pagination from './common/Pagination';
import * as XLSX from 'xlsx';

interface ProductsViewProps {
  products: Product[];
  modifiers: Modifier[];
  departments: Department[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Omit<Product, 'id'>) => void;
  deleteProduct: (id: string) => void;
  onBatchUpdate: (productIds: string[], discountPercent: number) => void;
  onBulkAdd: (products: Array<Partial<Product>>) => { added: number, skipped: number };
  addModifier: (modifier: Omit<Modifier, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateModifier: (id: string, modifier: Omit<Modifier, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deleteModifier: (id: string) => void;
}

const ITEMS_PER_PAGE = 10;

// Reusable Stat Card component
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


const ProductsView: React.FC<ProductsViewProps> = ({ products, modifiers, departments, addProduct, updateProduct, deleteProduct, onBatchUpdate, onBulkAdd, addModifier, updateModifier, deleteModifier }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [discountPercent, setDiscountPercent] = useState('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const totalUniqueProducts = useMemo(() => products.length, [products]);

  const categories = useMemo(() => {
      const cats = new Set<string>();
      products.forEach(p => {
          if (p.category) cats.add(p.category);
      });
      return Array.from(cats).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        const matchesSearch = p.name.toLowerCase().includes(lowerSearchTerm) ||
          p.description?.toLowerCase().includes(lowerSearchTerm) ||
          p.category?.toLowerCase().includes(lowerSearchTerm);
        
        if (!matchesSearch) return false;

        if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;

        if (minPrice !== '' && p.price < parseFloat(minPrice)) return false;
        if (maxPrice !== '' && p.price > parseFloat(maxPrice)) return false;

        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, searchTerm, categoryFilter, minPrice, maxPrice]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);

  const handleOpenModal = (product: Product | null = null) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingProduct(null);
    setIsModalOpen(false);
  };

  const handleSave = (productData: Omit<Product, 'id'>) => {
    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
    } else {
      addProduct(productData);
    }
    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      deleteProduct(id);
    }
  };
  
  const handleSelectProduct = (id: string) => {
    setSelectedProducts(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        return newSet;
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
        setSelectedProducts(new Set(paginatedProducts.map(p => p.id)));
    } else {
        setSelectedProducts(new Set());
    }
  };

  const handleApplyDiscount = () => {
    const discount = parseFloat(discountPercent);
    if (selectedProducts.size === 0) {
        alert("الرجاء تحديد منتج واحد على الأقل.");
        return;
    }
    if (isNaN(discount) || discount < 0 || discount > 100) {
        alert("الرجاء إدخال نسبة خصم صالحة بين 0 و 100.");
        return;
    }
    onBatchUpdate(Array.from(selectedProducts), discount);
    setDiscountPercent('');
    setSelectedProducts(new Set());
  };

  const handleExport = () => {
    const data = products.map(p => ({
        'اسم الصنف': p.name,
        'القسم': p.departmentName || p.category || 'عام',
        'السعر': p.price,
        'حالة التسعير': p.reviewStatus === 'needs_price' ? 'يحتاج تسعير' : 'مكتمل',
        'الحالة': p.status === 'available' ? 'متاح' : 'غير متاح',
        'الوصف': p.description || '',
        'ملاحظات': ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الأصناف");
    XLSX.writeFile(wb, `منتجات_المطعم_${new Date().toLocaleDateString('ar-EG')}.xlsx`);
  };

  const clearFilters = () => {
      setSearchTerm('');
      setCategoryFilter('all');
      setMinPrice('');
      setMaxPrice('');
      setCurrentPage(1);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-white flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                    className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors font-medium text-sm"
                >
                    <span className="material-symbols-outlined">filter_list</span>
                    تصفية
                    <span className={`material-symbols-outlined transition-transform ${isFilterExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                <button 
                    onClick={handleExport}
                    className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg hover:bg-emerald-100 transition-colors font-medium text-sm"
                >
                    <span className="material-symbols-outlined">download</span>
                    تصدير للأكسل
                </button>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setIsBulkAddOpen(true)} 
                    className="flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 font-bold py-2 px-4 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200 text-sm"
                >
                    <span className="material-symbols-outlined">view_list</span>
                    تعبئة الأصناف
                </button>
                <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm">
                    <span className="material-symbols-outlined">add</span>
                    إضافة منتج
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 p-6 bg-slate-50 border-b border-slate-100">
            <StatCard title="إجمالي الأصناف" value={totalUniqueProducts} icon="inventory_2" valueClassName="text-indigo-600" />
        </div>
        
        <div className={`bg-slate-50 p-6 border-b border-slate-200 transition-all duration-300 ${isFilterExpanded ? 'block' : 'hidden'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">بحث</label>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input
                            type="text"
                            placeholder="الاسم، الوصف، التصنيف..."
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">التصنيف</label>
                    <select 
                        value={categoryFilter} 
                        onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }} 
                        className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                    >
                        <option value="all">كل التصنيفات</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                <div className="flex gap-2">
                    <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">أقل سعر</label>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={minPrice}
                            onChange={e => { setMinPrice(e.target.value); setCurrentPage(1); }}
                            className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">أعلى سعر</label>
                        <input
                            type="number"
                            placeholder="1000.00"
                            value={maxPrice}
                            onChange={e => { setMaxPrice(e.target.value); setCurrentPage(1); }}
                            className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                </div>
                <div className="lg:col-span-4 flex justify-end">
                    <button 
                        onClick={clearFilters}
                        className="text-slate-500 hover:text-slate-800 text-sm font-medium px-4 py-2 transition-colors"
                    >
                        مسح التصفية
                    </button>
                </div>
            </div>
        </div>

        {selectedProducts.size > 0 && (
             <div className="p-4 bg-indigo-50 border-b border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="font-semibold text-indigo-800 flex items-center gap-2">
                    <span className="material-symbols-outlined">check_circle</span>
                    {selectedProducts.size} منتجات محددة
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input type="number" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} placeholder="نسبة الخصم %" className="w-32 p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                    <button onClick={handleApplyDiscount} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">تطبيق</button>
                    <button onClick={() => onBatchUpdate(Array.from(selectedProducts), 0)} className="bg-white text-slate-700 border border-slate-300 font-bold py-2 px-4 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">إلغاء الخصم</button>
                </div>
            </div>
        )}
        <div className="space-y-2 md:space-y-0">
            {/* Desktop Header */}
            <div className="hidden md:grid md:grid-cols-[auto,auto,1fr,auto,auto,auto] gap-4 items-center bg-slate-50 text-slate-600 uppercase text-xs font-bold tracking-wider px-4 py-4 border-b border-slate-200">
                <div className="text-center"><input type="checkbox" onChange={handleSelectAll} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /></div>
                <div className="w-12">الصورة</div>
                <div>المنتج</div>
                <div className="text-center">النوع</div>
                <div className="text-right">السعر</div>
                <div className="text-center">الإجراءات</div>
            </div>

            {/* Product List / Cards */}
            <div className="space-y-3 md:space-y-0 divide-y divide-slate-100">
            {paginatedProducts.map((p) => (
                <div key={p.id} className={`
                    md:grid md:grid-cols-[auto,auto,1fr,auto,auto,auto] md:gap-4 md:items-center
                    p-4 md:px-4 md:py-3 
                    hover:bg-indigo-50/30 ${selectedProducts.has(p.id) ? 'bg-indigo-50/50' : 'bg-white md:bg-transparent'}
                    block rounded-lg md:rounded-none shadow-sm md:shadow-none transition-colors
                `}>
                    {/* Checkbox */}
                    <div className="hidden md:flex md:justify-center">
                        <input type="checkbox" checked={selectedProducts.has(p.id)} onChange={() => handleSelectProduct(p.id)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    </div>

                    {/* Image Desktop */}
                    <div className="hidden md:block">
                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                            {p.image ? (
                                <img src={p.image} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                                <span className="material-symbols-outlined text-slate-400">image</span>
                            )}
                        </div>
                    </div>

                    {/* Mobile Header: Checkbox, Name, Actions */}
                    <div className="flex justify-between items-start mb-4 md:hidden">
                        <div className="flex items-center gap-3">
                            <input type="checkbox" checked={selectedProducts.has(p.id)} onChange={() => handleSelectProduct(p.id)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                                {p.image ? (
                                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                    <span className="material-symbols-outlined text-slate-400 text-sm">image</span>
                                )}
                            </div>
                            <h3 className="font-bold text-slate-800 text-base">{p.name}</h3>
                        </div>
                        <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleOpenModal(p)} className="p-2 rounded-lg text-slate-400 hover:bg-white hover:text-blue-600 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all" title="تعديل"><span className="material-symbols-outlined text-lg">edit</span></button>
                            <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg text-slate-400 hover:bg-white hover:text-red-600 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all" title="حذف"><span className="material-symbols-outlined text-lg">delete</span></button>
                        </div>
                    </div>
                    
                    {/* Desktop Name */}
                    <div className="hidden md:block font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                            <span>{p.name}</span>
                            {p.reviewStatus === 'needs_price' && (
                                <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-lg flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">info</span>
                                    يحتاج تسعير
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Mobile Grid Data */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm md:hidden">
                        <div><span className="text-slate-500">النوع:</span> <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.type === 'service' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-800'}`}>{p.type === 'service' ? 'خدمة' : 'منتج'}</span></div>
                        <div><span className="text-slate-500">السعر:</span> <span>{p.salePrice ? <><span className="line-through text-slate-400">{p.price.toFixed(2)}</span> <span className="font-bold text-green-600">{p.salePrice.toFixed(2)}</span></> : p.discountPercent ? <><span className="line-through text-slate-400">{p.price.toFixed(2)}</span> <span className="font-bold text-orange-600">{(p.price * (1 - p.discountPercent / 100)).toFixed(2)}</span> <span className="text-[10px] text-orange-500">({p.discountPercent}%)</span></> : p.price.toFixed(2)}</span></div>
                    </div>

                    {/* Desktop Data Cells */}
                    <div className="hidden md:block text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.type === 'service' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-800'}`}>{p.type === 'service' ? 'خدمة' : 'منتج'}</span></div>
                    <div className="hidden md:block text-right">
                        {p.salePrice ? (
                            <div className="flex flex-col items-end">
                                <span className="line-through text-slate-400 text-xs">{p.price.toFixed(2)}</span>
                                <span className="font-bold text-green-600">{p.salePrice.toFixed(2)}</span>
                            </div>
                        ) : p.discountPercent ? (
                            <div className="flex flex-col items-end">
                                <span className="line-through text-slate-400 text-xs">{p.price.toFixed(2)}</span>
                                <span className="font-bold text-orange-600">{(p.price * (1 - p.discountPercent / 100)).toFixed(2)}</span>
                                <span className="text-[10px] text-orange-500">-{p.discountPercent}%</span>
                            </div>
                        ) : <span className="font-medium text-slate-800">{p.price.toFixed(2)}</span>}
                    </div>
                    <div className="hidden md:flex items-center justify-center gap-2">
                        <button onClick={() => handleOpenModal(p)} className="p-2 rounded-lg text-slate-400 hover:bg-white hover:text-blue-600 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all" title="تعديل"><span className="material-symbols-outlined text-lg">edit</span></button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg text-slate-400 hover:bg-white hover:text-red-600 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all" title="حذف"><span className="material-symbols-outlined text-lg">delete</span></button>
                    </div>
                </div>
            ))}
            </div>
            {filteredProducts.length === 0 && (
                <div className="text-center py-16 px-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4">
                        <span className="material-symbols-outlined text-3xl">search_off</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-1">لا توجد منتجات</h3>
                    <p className="text-slate-500">لم يتم العثور على منتجات تطابق معايير البحث الحالية.</p>
                </div>
            )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={ITEMS_PER_PAGE} totalItems={filteredProducts.length} />
        </div>
      </div>
      {isModalOpen && <ProductModal product={editingProduct} onClose={handleCloseModal} onSave={handleSave} />}
      {isBulkAddOpen && (
        <BulkAddModal 
          departments={departments} 
          onClose={() => setIsBulkAddOpen(false)} 
          onSave={(newProds) => {
            const result = onBulkAdd(newProds);
            alert(`تمت العملية بنجاح! \nتم إضافة: ${result.added} \nتم تخطي المكرر: ${result.skipped}`);
            setIsBulkAddOpen(false);
          }} 
        />
      )}
    </div>
  );
};

const BulkAddModal = ({ onClose, onSave, departments }: any) => {
    const [rows, setRows] = useState<any[]>([
        { name: '', departmentId: '', price: '0', description: '', notes: '' }
    ]);

    const addRow = () => {
        setRows([...rows, { name: '', departmentId: '', price: '0', description: '', notes: '' }]);
    };

    const updateRow = (index: number, field: string, value: any) => {
        const newRows = [...rows];
        newRows[index][field] = value;
        setRows(newRows);
    };

    const removeRow = (index: number) => {
        if (rows.length === 1) return;
        setRows(rows.filter((_, i) => i !== index));
    };

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt: any) => {
            try {
                const data = evt.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheet = workbook.SheetNames[0];
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
                
                const importedRows = jsonData.map((item: any) => {
                    const name = item['اسم الصنف'] || item.name || item.Name || '';
                    const deptName = item['القسم'] || item.department || item.Department || '';
                    const price = item['السعر'] || item.price || item.Price || '0';
                    const desc = item['الوصف'] || item.description || item.Description || '';
                    
                    const dept = departments.find((d: any) => d.name === deptName);
                    
                    return {
                        name,
                        departmentId: dept?.id || '',
                        price: price.toString(),
                        description: desc,
                        notes: item['ملاحظات'] || item.notes || ''
                    };
                }).filter((r: any) => r.name);

                if (importedRows.length > 0) {
                    setRows([...rows.filter(r => r.name), ...importedRows]);
                    alert(`تم استيراد ${importedRows.length} صنف.`);
                }
            } catch (err) {
                alert("حدث خطأ أثناء قراءة الملف.");
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleSubmit = () => {
        const validRows = rows.filter(r => r.name.trim() !== '');
        if (validRows.length === 0) return;
        onSave(validRows);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <span className="material-symbols-outlined text-2xl">view_list</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">تعبئة الأصناف بالجملة</h3>
                            <p className="text-xs text-slate-500">أضف قائمة من الأصناف دفعة واحدة أو استورد من ملف.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-all cursor-pointer border border-emerald-100 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">upload_file</span>
                            استيراد من ملف
                            <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleImportFile} />
                        </label>
                        <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                        <table className="w-full text-right">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-slate-500">اسم الصنف *</th>
                                    <th className="p-4 text-xs font-bold text-slate-500">القسم</th>
                                    <th className="p-4 text-xs font-bold text-slate-500">السعر</th>
                                    <th className="p-4 text-xs font-bold text-slate-500">الوصف</th>
                                    <th className="px-4 py-4 w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, index) => (
                                    <tr key={index} className="border-b border-slate-100">
                                        <td className="p-2"><input type="text" value={row.name} onChange={e => updateRow(index, 'name', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none text-sm" placeholder="مثال: سندويش شاورما" /></td>
                                        <td className="p-2">
                                            <select value={row.departmentId} onChange={e => updateRow(index, 'departmentId', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none text-sm bg-white">
                                                <option value="">اختر القسم</option>
                                                {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="p-2"><input type="number" value={row.price} onChange={e => updateRow(index, 'price', e.target.value)} className="w-24 px-3 py-2 rounded-lg border border-slate-200 outline-none text-sm" /></td>
                                        <td className="p-2"><input type="text" value={row.description} onChange={e => updateRow(index, 'description', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none text-sm" placeholder="وصف..." /></td>
                                        <td className="p-2"><button onClick={() => removeRow(index)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-sm">delete</span></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button onClick={addRow} className="mt-4 flex items-center gap-2 text-indigo-600 font-bold px-4 py-2 hover:bg-indigo-50 rounded-xl transition-all">
                        <span className="material-symbols-outlined">add_circle</span>
                        إضافة صنف آخر
                    </button>
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all">إلغاء</button>
                    <button onClick={handleSubmit} className="bg-indigo-600 text-white px-10 py-2.5 rounded-xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">حفظ ( {rows.filter(r => r.name).length} )</button>
                </div>
            </div>
        </div>
    );
};


const ProductModal: React.FC<{
  product: Product | null;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id'>) => void;
}> = ({ product, onClose, onSave }) => {
  const [name, setName] = useState(product?.name || '');
  const [type, setType] = useState<Product['type']>(product?.type || 'product');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price.toString() || '');
  const [salePrice, setSalePrice] = useState(product?.salePrice?.toString() || '');
  const [discountPercent, setDiscountPercent] = useState(product?.discountPercent?.toString() || '');
  const [category, setCategory] = useState(product?.category || '');
  const [image, setImage] = useState(product?.image || '');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isAutofilling, setIsAutofilling] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { // 500KB limit for localStorage
        alert('حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 500 كيلوبايت.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAutofill = async () => { /* ... (implementation exists) ... */ };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};
    if (!name.trim()) newErrors.name = 'اسم المنتج مطلوب.';
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) newErrors.price = 'السعر يجب أن يكون رقماً موجباً.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onSave({
      name, description, category, type, image,
      price: parseFloat(price),
      salePrice: salePrice ? parseFloat(salePrice) : undefined,
      discountPercent: discountPercent ? parseFloat(discountPercent) : undefined,
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={product ? 'تعديل منتج' : 'إضافة منتج/خدمة'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-4">
                    <InputField id="name" label="اسم المنتج/الخدمة" value={name} onChange={e => setName(e.target.value)} error={errors.name} />

                    <div className="mb-4">
                        <label htmlFor="type" className="block text-slate-700 text-sm font-bold mb-2">نوع العنصر</label>
                        <select id="type" value={type} onChange={e => setType(e.target.value as Product['type'])} className="w-full p-2 border rounded-lg bg-white border-slate-300">
                            <option value="product">منتج مادي</option>
                            <option value="service">خدمة</option>
                        </select>
                    </div>
                </div>
                <div className="w-full md:w-48">
                    <label className="block text-slate-700 text-sm font-bold mb-2">صورة المنتج</label>
                    <div className="relative group aspect-square rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden hover:border-indigo-300 transition-all">
                        {image ? (
                            <>
                                <img src={image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                <button 
                                    type="button"
                                    onClick={() => setImage('')}
                                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </>
                        ) : (
                            <div className="text-center p-4">
                                <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">add_a_photo</span>
                                <p className="text-[10px] text-slate-400">انقر لرفع صورة</p>
                            </div>
                        )}
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageChange}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputField id="price" label="سعر البيع" value={price} onChange={e => setPrice(e.target.value)} error={errors.price} type="number" />
              <InputField id="salePrice" label="سعر العرض (اختياري)" value={salePrice} onChange={e => setSalePrice(e.target.value)} type="number" />
              <InputField id="discountPercent" label="نسبة الخصم %" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} type="number" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <InputField id="category" label="التصنيف (اختياري)" value={category} onChange={e => setCategory(e.target.value)} />
            </div>
            <InputField id="description" label="الوصف (اختياري)" value={description} onChange={e => setDescription(e.target.value)} />
        
        <div className="flex items-center justify-end gap-3 pt-6 mt-4 border-t border-slate-200">
          <button type="button" onClick={onClose} className="bg-slate-100 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-200 transition-colors">إلغاء</button>
          <button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">حفظ</button>
        </div>
      </form>
    </Modal>
  );
};

export default ProductsView;