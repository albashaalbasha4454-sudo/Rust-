import React, { useMemo, useState } from 'react';
import type { Product, Modifier, Customer, InvoiceItem, Department } from '../types';
import { buildDepartmentsFromProducts, canonicalSectionName, normalizeProductSection } from '../utils/departmentRules';

interface POSViewProps {
  products: Product[];
  modifiers: Modifier[];
  customers: Customer[];
  onCompleteSale: (items: InvoiceItem[], customerInfo?: any) => void;
  onCreateDeliveryOrder: (cart: InvoiceItem[], customerInfo: any, deliveryFee: number, source: any) => void;
  onCreateReservation: (cart: InvoiceItem[], customerInfo: any) => void;
}

const POSView: React.FC<POSViewProps> = ({ products, onCompleteSale }) => {
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [activeTab, setActiveTab] = useState<'menu' | 'cart'>('menu');

  const departments = useMemo<Department[]>(() => buildDepartmentsFromProducts([], products), [products]);
  const normalizedProducts = useMemo(() => products.map(product => normalizeProductSection(product, departments)), [products, departments]);

  const categories = useMemo(() => {
    const values = new Set(normalizedProducts.map(product => canonicalSectionName(product.category || product.departmentName || 'عام')));
    return ['الكل', ...Array.from(values)];
  }, [normalizedProducts]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return normalizedProducts.filter(product => {
      const category = canonicalSectionName(product.category || product.departmentName || 'عام');
      const matchesCategory = selectedCategory === 'الكل' || category === selectedCategory;
      const matchesSearch = !term || product.name.toLowerCase().includes(term) || (product.description || '').toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [normalizedProducts, selectedCategory, searchTerm]);

  const defaultDepartment = departments[0] || {
    id: 'dept-misc',
    name: 'عام',
    status: 'active' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const recalculateItem = (item: InvoiceItem): InvoiceItem => {
    const extraPrice = item.extraPrice || 0;
    const unitPrice = item.basePrice + item.modifiersTotal + extraPrice;
    return {
      ...item,
      unitPrice,
      lineTotal: unitPrice * item.quantity
    };
  };

  const updateCartItem = (index: number, updates: Partial<InvoiceItem>) => {
    setCart(current => current.map((item, itemIndex) => itemIndex === index ? recalculateItem({ ...item, ...updates }) : item));
  };

  const addProductToCart = (product: Product) => {
    const normalizedProduct = normalizeProductSection(product, departments);
    const price = normalizedProduct.salePrice ?? normalizedProduct.price;
    const needsPrice = normalizedProduct.reviewStatus === 'needs_price' || !Number.isFinite(price) || price <= 0;

    const item: InvoiceItem = {
      productId: needsPrice ? `needs-price-${normalizedProduct.id}` : normalizedProduct.id,
      productName: normalizedProduct.name,
      departmentId: normalizedProduct.departmentId || defaultDepartment.id,
      departmentName: normalizedProduct.departmentName || defaultDepartment.name,
      quantity: 1,
      basePrice: needsPrice ? 0 : price,
      originalPrice: normalizedProduct.salePrice ? normalizedProduct.price : undefined,
      offerPrice: normalizedProduct.salePrice,
      modifiers: [],
      modifiersTotal: 0,
      unitPrice: needsPrice ? 0 : price,
      lineTotal: needsPrice ? 0 : price,
      itemNotes: '',
      extraPrice: 0
    };

    setCart(current => [...current, item]);
    if (window.innerWidth < 1024) setActiveTab('cart');
  };

  const addCustomItem = () => {
    const item: InvoiceItem = {
      productId: `custom-${Date.now()}`,
      productName: '',
      departmentId: defaultDepartment.id,
      departmentName: defaultDepartment.name,
      quantity: 1,
      basePrice: 0,
      modifiers: [],
      modifiersTotal: 0,
      unitPrice: 0,
      lineTotal: 0,
      itemNotes: '',
      extraPrice: 0
    };

    setCart(current => [...current, item]);
    if (window.innerWidth < 1024) setActiveTab('cart');
  };

  const removeFromCart = (index: number) => {
    setCart(current => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);

  const completeSale = () => {
    if (cart.length === 0) return;

    const invalidItem = cart.find(item => item.productId.startsWith('custom-') && (!item.productName.trim() || !item.departmentId || item.basePrice <= 0));
    if (invalidItem) {
      alert('أكمل اسم الصنف المخصص والسعر واختر قسم الربح قبل إتمام البيع.');
      return;
    }

    onCompleteSale(cart.map(item => ({ ...item })));
    setCart([]);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden bg-slate-50 border-t border-slate-100">
      <div className="lg:hidden flex bg-white border-b border-slate-200 sticky top-0 z-30 shrink-0 shadow-sm">
        <button onClick={() => setActiveTab('menu')} className={`flex-1 py-3 text-xs font-bold ${activeTab === 'menu' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}>القائمة</button>
        <button onClick={() => setActiveTab('cart')} className={`flex-1 py-3 text-xs font-bold ${activeTab === 'cart' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}>السلة {cart.length > 0 ? `(${cart.length})` : ''}</button>
      </div>

      <section className={`flex-1 flex-col min-w-0 ${activeTab === 'menu' ? 'flex' : 'hidden lg:flex'}`}>
        <div className="bg-white border-b border-slate-200 p-4 sm:p-6 shadow-sm z-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">نقطة البيع</h3>
              <p className="text-xs text-slate-500">الأصناف مصنفة حسب التصنيف، والصنف المخصص يحدد قسم الربح.</p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <input
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="ابحث عن صنف..."
                className="flex-1 md:w-80 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
              <button onClick={addCustomItem} className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 font-black text-xs shrink-0">
                + صنف مخصص
              </button>
            </div>
          </div>

          <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border ${selectedCategory === category ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addProductToCart(product)}
                className="group bg-white border border-slate-200 rounded-2xl p-3 text-right hover:shadow-xl hover:border-indigo-200 transition-all active:scale-95"
              >
                <div className="aspect-square w-full mb-3 rounded-xl bg-slate-50 overflow-hidden flex items-center justify-center">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="material-symbols-outlined text-slate-300 text-4xl">restaurant_menu</span>
                  )}
                </div>
                <h4 className="font-black text-slate-900 text-sm line-clamp-2">{product.name}</h4>
                <p className="text-[10px] text-slate-400 mt-1">{product.departmentName || product.category || 'عام'}</p>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-indigo-600 font-black text-base">{(product.salePrice ?? product.price).toFixed(2)}</span>
                  <span className="text-xs text-slate-300">+</span>
                </div>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-400 text-sm">لا توجد أصناف مطابقة.</div>
            )}
          </div>
        </div>
      </section>

      <aside className={`lg:w-[28rem] flex-col bg-white border-l border-slate-200 shadow-2xl z-40 ${activeTab === 'cart' ? 'fixed inset-0 lg:relative flex' : 'hidden lg:flex'}`}>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900">سلة الطلبات</h3>
          {cart.length > 0 && <button onClick={() => setCart([])} className="text-red-500 text-xs font-bold">تصفير</button>}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
          {cart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">السلة فارغة</div>
          ) : cart.map((item, index) => {
            const isCustom = item.productId.startsWith('custom-') || item.productId.startsWith('needs-price-');
            return (
              <div key={`${item.productId}-${index}`} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    {isCustom ? (
                      <>
                        <input
                          value={item.productName}
                          onChange={event => updateCartItem(index, { productName: event.target.value })}
                          placeholder="اسم الصنف المخصص"
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none"
                        />
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 mb-1">مرابح هذا الصنف تحسب على أي قسم؟</label>
                          <select
                            value={item.departmentId || ''}
                            onChange={event => {
                              const department = departments.find(dept => dept.id === event.target.value);
                              updateCartItem(index, {
                                departmentId: department?.id || 'dept-misc',
                                departmentName: department?.name || 'عام'
                              });
                            }}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                          >
                            <option value="">اختر قسم الربح</option>
                            {departments.map(department => (
                              <option key={department.id} value={department.id}>{department.name}</option>
                            ))}
                          </select>
                        </div>
                        <input
                          type="number"
                          value={item.basePrice || ''}
                          onChange={event => updateCartItem(index, { basePrice: parseFloat(event.target.value) || 0 })}
                          placeholder="سعر الوحدة"
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-indigo-600 outline-none"
                        />
                      </>
                    ) : (
                      <>
                        <h4 className="font-black text-slate-900 text-sm">{item.productName}</h4>
                        <p className="text-[10px] text-slate-400">{item.departmentName}</p>
                        <p className="text-xs text-indigo-600 font-black">{item.unitPrice.toFixed(2)}</p>
                      </>
                    )}
                  </div>
                  <button onClick={() => removeFromCart(index)} className="text-red-400 text-xs font-bold self-start">حذف</button>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => updateCartItem(index, { quantity: Math.max(1, item.quantity - 1) })} className="w-9 h-9 bg-slate-100 rounded-lg">-</button>
                  <span className="w-10 text-center font-black">{item.quantity}</span>
                  <button onClick={() => updateCartItem(index, { quantity: item.quantity + 1 })} className="w-9 h-9 bg-slate-100 rounded-lg">+</button>
                  <input
                    value={item.itemNotes || ''}
                    onChange={event => updateCartItem(index, { itemNotes: event.target.value })}
                    placeholder="ملاحظة"
                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-400">الإجمالي</span>
                  <span className="font-black text-indigo-600">{item.lineTotal.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-200 bg-white space-y-3">
          <div className="flex items-center justify-between bg-slate-900 text-white rounded-2xl p-4">
            <span className="font-bold">الإجمالي</span>
            <span className="font-black text-xl">{cartTotal.toFixed(2)}</span>
          </div>
          <button onClick={completeSale} disabled={cart.length === 0} className="w-full bg-emerald-600 disabled:bg-slate-300 text-white py-3 rounded-xl font-black">
            إتمام البيع
          </button>
          <button onClick={() => setActiveTab('menu')} className="lg:hidden w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold">العودة للقائمة</button>
        </div>
      </aside>
    </div>
  );
};

export default POSView;
