import React, { useState, useMemo } from 'react';
import type { Product, ModifierGroup } from '../types';
import Modal from './Modal';
import InputField from './common/InputField';
import Pagination from './common/Pagination';

interface ProductsViewProps {
  products: Product[];
  modifierGroups: ModifierGroup[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Omit<Product, 'id'>) => void;
  deleteProduct: (id: string) => void;
  onBatchUpdate: (productIds: string[], discountPercent: number) => void;
}

const ITEMS_PER_PAGE = 10;

const StatCard = ({ title, value, icon, valueClassName }: { title: string; value: string | number; icon: string; valueClassName?: string }) => (
    <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4 border border-slate-100 transition-all hover:shadow-md">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${valueClassName} bg-opacity-10`}>
            <span className={`material-symbols-outlined text-2xl ${valueClassName}`}>{icon}</span>
        </div>
        <div>
            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-wider">{title}</h3>
            <p className={`text-xl font-black ${valueClassName?.replace('bg-', 'text-') || 'text-slate-800'}`}>{value}</p>
        </div>
    </div>
);

const ProductsView: React.FC<ProductsViewProps> = ({ 
  products, 
  modifierGroups,
  addProduct, 
  updateProduct, 
  deleteProduct, 
  onBatchUpdate 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [discountPercent, setDiscountPercent] = useState('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const stats = useMemo(() => {
    return {
      total: products.length,
      available: products.filter(p => p.isAvailable !== false).length,
      unavailable: products.filter(p => p.isAvailable === false).length,
    };
  }, [products]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => { if (p.category) cats.add(p.category); });
    return Array.from(cats).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        const lowerSearch = searchTerm.toLowerCase();
        const matchesSearch = p.name.toLowerCase().includes(lowerSearch) ||
          p.barcode?.toLowerCase().includes(lowerSearch) ||
          p.category?.toLowerCase().includes(lowerSearch);
        
        if (!matchesSearch) return false;
        if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
        if (minPrice !== '' && p.price < parseFloat(minPrice)) return false;
        if (maxPrice !== '' && p.price > parseFloat(maxPrice)) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, searchTerm, categoryFilter, minPrice, maxPrice]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
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
    if (window.confirm('هل أنت متأكد من حذف هذا المنتج نهائياً؟')) {
      deleteProduct(id);
    }
  };
  
  const handleSelectProduct = (id: string) => {
    setSelectedProducts(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedProducts(new Set(paginatedProducts.map(p => p.id)));
    else setSelectedProducts(new Set());
  };

  const handleApplyDiscount = () => {
    const discount = parseFloat(discountPercent);
    if (selectedProducts.size === 0) return;
    if (isNaN(discount) || discount < 0 || discount > 100) {
        alert("الرجاء إدخال نسبة خصم صحيحة (0-100)");
        return;
    }
    onBatchUpdate(Array.from(selectedProducts), discount);
    setDiscountPercent('');
    setSelectedProducts(new Set());
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800">الأصناف والوجبات</h2>
          <p className="text-slate-400 text-sm mt-1">إدارة قائمة الطعام والمنتجات والخدمات.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="w-full sm:w-auto flex items-center justify-center gap-3 bg-indigo-600 text-white font-black py-4 px-8 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
            <span className="material-symbols-outlined">add_circle</span>
            إضافة صنف جديد
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <StatCard title="إجمالي الأصناف" value={stats.total} icon="restaurant_menu" valueClassName="bg-indigo-600 text-indigo-600" />
          <StatCard title="أصناف متوفرة" value={stats.available} icon="check_circle" valueClassName="bg-emerald-600 text-emerald-600" />
          <StatCard title="غير متوفرة" value={stats.unavailable} icon="block" valueClassName="bg-red-600 text-red-600" />
      </div>

      <div className="bg-white shadow-sm border border-slate-200 rounded-[2rem] overflow-hidden">
        {/* Toolbar */}
        <div className="p-6 border-b border-slate-100 bg-white flex flex-col md:flex-row justify-between lg:items-center gap-4">
            <div className="flex flex-1 items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                    <input
                        type="text"
                        placeholder="ابحث بالاسم أو الباركود أو التصنيف..."
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-4 pr-12 py-3 bg-slate-50 border-transparent rounded-[1.25rem] focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
                    />
                </div>
                <button 
                    onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-[1.25rem] font-bold text-sm transition-all ${isFilterExpanded ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >
                    <span className="material-symbols-outlined">tune</span>
                    الفلاتر
                </button>
            </div>
        </div>
        
        {/* Expanded Filters */}
        {isFilterExpanded && (
            <div className="bg-slate-50 p-6 border-b border-slate-100 animate-in slide-in-from-top duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">التصنيف</label>
                        <select 
                            value={categoryFilter} 
                            onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }} 
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 transition-all outline-none font-bold text-slate-700"
                        >
                            <option value="all">كل التصنيفات</option>
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">أقل سعر</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={minPrice}
                                onChange={e => { setMinPrice(e.target.value); setCurrentPage(1); }}
                                className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">أعلى سعر</label>
                            <input
                                type="number"
                                placeholder="1000.00"
                                value={maxPrice}
                                onChange={e => { setMaxPrice(e.target.value); setCurrentPage(1); }}
                                className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex items-end">
                        <button onClick={() => { setSearchTerm(''); setCategoryFilter('all'); setMinPrice(''); setMaxPrice(''); }} className="w-full p-3 text-slate-400 hover:text-red-500 font-bold transition-colors">إعادة تعيين الكل</button>
                    </div>
                </div>
            </div>
        )}

        {/* Batch Actions */}
        {selectedProducts.size > 0 && (
             <div className="p-4 bg-indigo-600 text-white flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-300">
                <span className="font-black flex items-center gap-2">
                    <span className="material-symbols-outlined">inventory</span>
                    تم تحديد {selectedProducts.size} صنف
                </span>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <input 
                        type="number" 
                        value={discountPercent} 
                        onChange={e => setDiscountPercent(e.target.value)} 
                        placeholder="نسبة الخصم %" 
                        className="w-28 p-2 rounded-xl border-none outline-none text-slate-900 font-bold text-sm" 
                    />
                    <button onClick={handleApplyDiscount} className="bg-white text-indigo-600 font-black py-2 px-6 rounded-xl hover:bg-slate-100 transition-all shadow-lg active:scale-95">تطبيق</button>
                    <button onClick={() => onBatchUpdate(Array.from(selectedProducts), 0)} className="bg-indigo-700 text-white font-black py-2 px-4 rounded-xl hover:bg-indigo-800 transition-all border border-indigo-500/30">إزالة الخصومات</button>
                    <button onClick={() => setSelectedProducts(new Set())} className="text-white/70 hover:text-white"><span className="material-symbols-outlined">close</span></button>
                </div>
            </div>
        )}

        <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-4 w-12 text-center"><input type="checkbox" onChange={handleSelectAll} className="rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500" /></th>
                        <th className="p-4 w-16">الصنف</th>
                        <th className="p-4">الاسم والتصنيف</th>
                        <th className="p-4">السعر والتكلفة</th>
                        <th className="p-4 text-center">الحالة</th>
                        <th className="p-4 text-center">الإجراءات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {paginatedProducts.map(p => {
                        const finalPrice = p.discountPercent ? p.price * (1 - p.discountPercent/100) : p.price;
                        const profit = (p.salePrice || finalPrice) - (p.cost || 0);

                        return (
                            <tr key={p.id} className={`hover:bg-slate-50/50 transition-colors ${selectedProducts.has(p.id) ? 'bg-indigo-50/50' : ''}`}>
                                <td className="p-4 text-center">
                                    <input type="checkbox" checked={selectedProducts.has(p.id)} onChange={() => handleSelectProduct(p.id)} className="rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                </td>
                                <td className="p-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 overflow-hidden shadow-sm">
                                        {p.image ? <img src={p.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <div className="w-full h-full flex items-center justify-center text-slate-200"><span className="material-symbols-outlined">image</span></div>}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="font-black text-slate-800 text-sm leading-tight">{p.name}</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[12px]">folder</span> {p.category || 'غير مصنف'}
                                        {p.barcode && <span className="bg-slate-100 px-1.5 rounded flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">barcode</span> {p.barcode}</span>}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <span className="font-black text-indigo-600">{finalPrice.toFixed(2)}</span>
                                        {p.discountPercent && <span className="text-[9px] bg-red-50 text-red-500 px-1 rounded font-bold">-{p.discountPercent}%</span>}
                                    </div>
                                    {p.cost !== undefined && (
                                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                            <span>التكلفة: {p.cost.toFixed(2)}</span>
                                            <span className={`font-bold ${profit > 0 ? 'text-emerald-500' : 'text-red-500'}`}>الربح: {profit.toFixed(2)}</span>
                                        </div>
                                    )}
                                </td>
                                <td className="p-4 text-center">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${p.isAvailable !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {p.isAvailable !== false ? 'متوفر' : 'غير متوفر'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => handleOpenModal(p)} className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center" title="تعديل"><span className="material-symbols-outlined text-lg">edit</span></button>
                                        <button onClick={() => handleDelete(p.id)} className="w-8 h-8 rounded-xl bg-red-50 text-red-500 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center" title="حذف"><span className="material-symbols-outlined text-lg">delete</span></button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>

        {filteredProducts.length === 0 && (
            <div className="p-20 text-center text-slate-300">
                <span className="material-symbols-outlined text-6xl mb-4">inventory_2</span>
                <p className="font-black">لا توجد سجلات مطابقة</p>
            </div>
        )}

        <div className="p-6 border-t border-slate-50 bg-slate-50/30">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={ITEMS_PER_PAGE} totalItems={filteredProducts.length} />
        </div>
      </div>
      {isModalOpen && <ProductModal product={editingProduct} modifierGroups={modifierGroups} onClose={handleCloseModal} onSave={handleSave} />}
    </div>
  );
};

const ProductModal: React.FC<{
  product: Product | null;
  modifierGroups: ModifierGroup[];
  onClose: () => void;
  onSave: (product: Omit<Product, 'id'>) => void;
}> = ({ product, modifierGroups, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    type: product?.type || 'product' as const,
    description: product?.description || '',
    category: product?.category || '',
    barcode: product?.barcode || '',
    price: product?.price.toString() || '',
    cost: product?.cost?.toString() || '0',
    salePrice: product?.salePrice?.toString() || '',
    discountPercent: product?.discountPercent?.toString() || '',
    image: product?.image || '',
    isAvailable: product?.isAvailable ?? true,
    modifierGroupIds: product?.modifierGroupIds || [],
    notes: product?.notes || ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) return alert('الصورة كبيرة جداً (الحد الأقصى 500 ك.ب)');
      const reader = new FileReader();
      reader.onloadend = () => setFormData(p => ({ ...p, image: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return setErrors({ name: 'الاسم مطلوب' });
    const priceVal = parseFloat(formData.price);
    if (isNaN(priceVal) || priceVal < 0) return setErrors({ price: 'السعر غير صالح' });
    
    onSave({
      ...formData,
      price: priceVal,
      cost: parseFloat(formData.cost) || 0,
      salePrice: formData.salePrice ? parseFloat(formData.salePrice) : undefined,
      discountPercent: formData.discountPercent ? parseFloat(formData.discountPercent) : undefined,
    } as Omit<Product, 'id'>);
  };

  const toggleGroup = (groupId: string) => {
    setFormData(prev => ({
        ...prev,
        modifierGroupIds: prev.modifierGroupIds.includes(groupId) 
            ? prev.modifierGroupIds.filter(id => id !== groupId)
            : [...prev.modifierGroupIds, groupId]
    }));
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={product ? 'تعديل الصنف' : 'إضافة صنف جديد'} size="2xl">
      <form onSubmit={handleSubmit} className="p-2">
            <div className="flex flex-col lg:flex-row gap-8 mb-8">
                {/* Image Upload Area */}
                <div className="w-full lg:w-56 shrink-0">
                    <div className="relative group aspect-square rounded-[2rem] bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden hover:border-indigo-300 hover:bg-slate-100/50 transition-all cursor-pointer">
                        {formData.image ? (
                            <>
                                <img src={formData.image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="material-symbols-outlined text-white text-3xl">add_a_photo</span>
                                </div>
                                <button type="button" onClick={(e) => { e.stopPropagation(); setFormData(p=>({...p, image:''})); }} className="absolute top-4 right-4 w-8 h-8 bg-white/90 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg flex items-center justify-center">
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </>
                        ) : (
                            <div className="text-center p-6">
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-3">
                                    <span className="material-symbols-outlined text-slate-200 text-3xl">restaurant</span>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">اختر صورة الصنف</p>
                            </div>
                        )}
                        <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                    
                    <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" checked={formData.isAvailable} onChange={e => setFormData(p=>({...p, isAvailable: e.target.checked}))} className="rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                        <span className="text-sm font-black text-slate-700 transition-colors group-hover:text-emerald-700">متوفر للبيع حالياً</span>
                      </label>
                    </div>
                </div>

                {/* Main Information */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <InputField id="name" label="اسم الصنف (الوجبة)" value={formData.name} onChange={e => setFormData(p=>({...p, name: e.target.value}))} error={errors.name} placeholder="مثال: مندي دجاج، قهوة عربية..." />
                    </div>
                    <InputField id="category" label="التصنيف" value={formData.category} onChange={e => setFormData(p=>({...p, category: e.target.value}))} placeholder="بيتزا، مشروبات، إلخ" icon="folder" />
                    <InputField id="barcode" label="الباركود (اختياري)" value={formData.barcode} onChange={e => setFormData(p=>({...p, barcode: e.target.value}))} placeholder="امسح الباركود هنا" icon="barcode" />
                    
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">مجموعات الإضافة (Modifiers)</label>
                        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 min-h-[50px]">
                            {modifierGroups.map(g => (
                                <button
                                    key={g.id}
                                    type="button"
                                    onClick={() => toggleGroup(g.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${formData.modifierGroupIds.includes(g.id) ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-100' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                                >
                                    {g.name}
                                </button>
                            ))}
                            {modifierGroups.length === 0 && <span className="text-[10px] text-slate-400 italic">لا توجد مجموعات إضافات معرفة</span>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 mb-8">
                <h4 className="text-xs font-black text-slate-800 mb-4 px-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-600 text-lg">payments</span>
                    التسعير والتكاليف
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <InputField id="price" label="سعر البيع" value={formData.price} onChange={e => setFormData(p=>({...p, price: e.target.value}))} error={errors.price} type="number" step="0.01" />
                    <InputField id="cost" label="التكلفة (غير مطلوب)" value={formData.cost} onChange={e => setFormData(p=>({...p, cost: e.target.value}))} type="number" step="0.01" />
                    <InputField id="salePrice" label="سعر خاص" value={formData.salePrice} onChange={e => setFormData(p=>({...p, salePrice: e.target.value}))} type="number" step="0.01" />
                    <InputField id="discountPercent" label="نسبة خصم %" value={formData.discountPercent} onChange={e => setFormData(p=>({...p, discountPercent: e.target.value}))} type="number" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-8">
                <InputField id="description" label="وصف الصنف" value={formData.description} onChange={e => setFormData(p=>({...p, description: e.target.value}))} placeholder="مكونات الوجبة أو معلومات إضافية..." />
            </div>
        
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={onClose} className="px-6 py-3 font-black text-slate-500 hover:text-slate-800 transition-colors">إلغاء</button>
                <button type="submit" className="px-8 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95">حفظ التغييرات</button>
            </div>
      </form>
    </Modal>
  );
};

export default ProductsView;