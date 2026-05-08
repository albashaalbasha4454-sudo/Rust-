import React, { useMemo, useState } from 'react';
import type { Product, Modifier, InvoiceItem, Customer, OrderType, Department } from '../types';
import DeliveryOrderModal from './DeliveryOrderModal';
import ReservationModal from './ReservationModal';
import { buildDepartmentsFromProducts, canonicalSectionName, normalizeProductSection } from '../utils/departmentRules';

interface POSViewFinalProps {
  products: Product[];
  modifiers: Modifier[];
  customers: Customer[];
  departments: Department[];
  onCompleteSale: (items: InvoiceItem[], customerInfo?: any) => void;
  onCreateDeliveryOrder: (cart: InvoiceItem[], customerInfo: any, deliveryFee: number, source: any) => void;
  onCreateReservation: (cart: InvoiceItem[], customerInfo: any) => void;
}

const POSViewFinal: React.FC<POSViewFinalProps> = ({ products, modifiers, customers, departments, onCompleteSale, onCreateDeliveryOrder, onCreateReservation }) => {
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'menu' | 'cart'>('menu');
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);

  const normalizedProducts = useMemo(() => products.map(product => normalizeProductSection(product, departments)), [products, departments]);
  const dynamicDepartments = useMemo(() => buildDepartmentsFromProducts(departments, normalizedProducts).filter(dept => dept.status !== 'inactive'), [departments, normalizedProducts]);
  const defaultDepartment = dynamicDepartments[0] || { id: 'dept-misc', name: 'عام', status: 'active' as const, createdAt: '', updatedAt: '' };

  const categories = useMemo(() => {
    const names = new Set(normalizedProducts.map(product => canonicalSectionName(product.category || product.departmentName || 'عام')));
    return ['الكل', ...Array.from(names)];
  }, [normalizedProducts]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return normalizedProducts.filter(product => {
      const category = canonicalSectionName(product.category || product.departmentName || 'عام');
      const byCategory = selectedCategory === 'الكل' || category === selectedCategory;
      const bySearch = !term || product.name.toLowerCase().includes(term) || (product.description || '').toLowerCase().includes(term);
      return byCategory && bySearch;
    });
  }, [normalizedProducts, selectedCategory, searchTerm]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 5);
    const term = customerSearch.toLowerCase();
    return customers.filter(customer => customer.name.toLowerCase().includes(term) || customer.phone.includes(customerSearch)).slice(0, 10);
  }, [customers, customerSearch]);

  const updateCartItem = (index: number, updates: Partial<InvoiceItem>) => {
    setCart(current => current.map((item, i) => {
      if (i !== index) return item;
      const next = { ...item, ...updates };
      const extraPrice = next.extraPrice || 0;
      next.unitPrice = next.basePrice + next.modifiersTotal + extraPrice;
      next.lineTotal = next.unitPrice * next.quantity;
      return next;
    }));
  };

  const addProductToCart = (product: Product) => {
    const normalized = normalizeProductSection(product, departments);
    const basePrice = normalized.salePrice ?? normalized.price;
    const item: InvoiceItem = {
      productId: normalized.reviewStatus === 'needs_price' || normalized.price === 0 ? `needs-price-${normalized.id}` : normalized.id,
      productName: normalized.name,
      departmentId: normalized.departmentId,
      departmentName: normalized.departmentName,
      quantity: 1,
      basePrice: normalized.reviewStatus === 'needs_price' || normalized.price === 0 ? 0 : basePrice,
      modifiers: [],
      modifiersTotal: 0,
      unitPrice: normalized.reviewStatus === 'needs_price' || normalized.price === 0 ? 0 : basePrice,
      lineTotal: normalized.reviewStatus === 'needs_price' || normalized.price === 0 ? 0 : basePrice
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

  const removeFromCart = (index: number) => setCart(current => current.filter((_, i) => i !== index));
  const cartTotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);

  const completeSale = (type: OrderType = 'sale') => {
    if (cart.length === 0) return;
    const incompleteCustom = cart.find(item => item.productId.startsWith('custom-') && (!item.productName.trim() || !item.departmentId));
    if (incompleteCustom) {
      alert('أكمل اسم الصنف المخصص واختر قسم الربح قبل إتمام البيع.');
      return;
    }
    onCompleteSale(cart.map(item => ({ ...item })), {
      customerInfo: selectedCustomer ? { name: selectedCustomer.name, phone: selectedCustomer.phone, address: selectedCustomer.address } : undefined,
      notes: orderNotes,
      type
    });
    setCart([]);
    setSelectedCustomer(null);
    setOrderNotes('');
  };

  const createDeliveryOrder = (customerInfo: any, deliveryFee: number, source: any) => {
    onCreateDeliveryOrder(cart, customerInfo, deliveryFee, source);
    setIsDeliveryModalOpen(false);
    setCart([]);
    setSelectedCustomer(null);
    setOrderNotes('');
  };

  const createReservation = (customerInfo: any) => {
    onCreateReservation(cart, customerInfo);
    setIsReservationModalOpen(false);
    setCart([]);
    setSelectedCustomer(null);
    setOrderNotes('');
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden bg-slate-50 border-t border-slate-100">
      <div className="lg:hidden flex bg-white border-b border-slate-200 sticky top-0 z-30 shrink-0 shadow-sm">
        <button onClick={() => setActiveTab('menu')} className={`flex-1 py-3 text-xs font-bold ${activeTab === 'menu' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}>القائمة</button>
        <button onClick={() => setActiveTab('cart')} className={`flex-1 py-3 text-xs font-bold ${activeTab === 'cart' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}>السلة {cart.length > 0 ? `(${cart.length})` : ''}</button>
      </div>

      <div className={`flex-1 flex-col min-w-0 ${activeTab === 'menu' ? 'flex' : 'hidden lg:flex'}`}>
        <div className="bg-white border-b border-slate-200 p-4 sm:p-6 shadow-sm z-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">نظام المبيعات السريع</h3>
              <p className="text-xs text-slate-500">كل صنف يحفظ قسمه، والصنف المخصص يسأل عن قسم الربح.</p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="ابحث عن صنف..." className="flex-1 md:w-80 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500" />
              <button onClick={addCustomItem} className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 font-black text-xs shrink-0">+ صنف مخصص</button>
            </div>
          </div>
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
            {categories.map(category => (
              <button key={category} onClick={() => setSelectedCategory(category)} className={`px-5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border ${selectedCategory === category ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>{category}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredProducts.map(product => (
              <button key={product.id} onClick={() => addProductToCart(product)} className="group bg-white border border-slate-200 rounded-2xl p-3 text-right hover:shadow-xl hover:border-indigo-200 transition-all active:scale-95">
                <div className="aspect-square w-full mb-3 rounded-xl bg-slate-50 overflow-hidden flex items-center justify-center">
                  {product.image ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <span className="material-symbols-outlined text-slate-300 text-4xl">restaurant_menu</span>}
                </div>
                <h4 className="font-black text-slate-900 text-sm line-clamp-2">{product.name}</h4>
                <p className="text-[10px] text-slate-400 mt-1">{product.departmentName || product.category}</p>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-indigo-600 font-black text-base">{(product.salePrice ?? product.price).toFixed(2)}</span>
                  <span className="text-xs text-slate-300">+</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`lg:w-[28rem] flex-col bg-white border-l border-slate-200 shadow-2xl z-40 ${activeTab === 'cart' ? 'fixed inset-0 lg:relative flex' : 'hidden lg:flex'}`}>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900">سلة الطلبات</h3>
          {cart.length > 0 && <button onClick={() => setCart([])} className="text-red-500 text-xs font-bold">تصفير</button>}
        </div>

        <div className="p-4 border-b border-slate-100">
          {selectedCustomer ? (
            <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
              <span className="text-sm font-bold">{selectedCustomer.name}</span>
              <button onClick={() => setSelectedCustomer(null)} className="text-red-500 text-xs">إزالة</button>
            </div>
          ) : (
            <div className="relative">
              <button onClick={() => setShowCustomerSearch(!showCustomerSearch)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500 text-right">اختيار العميل اختياري</button>
              {showCustomerSearch && (
                <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <input autoFocus value={customerSearch} onChange={event => setCustomerSearch(event.target.value)} placeholder="ابحث بالاسم أو الرقم" className="w-full p-3 bg-slate-50 border-b border-slate-100 text-sm outline-none" />
                  <div className="max-h-56 overflow-y-auto">
                    {filteredCustomers.map(customer => (
                      <button key={customer.id} onClick={() => { setSelectedCustomer(customer); setShowCustomerSearch(false); setCustomerSearch(''); }} className="w-full p-3 text-right text-sm hover:bg-indigo-50 border-b border-slate-50">
                        <b>{customer.name}</b><br /><span className="text-xs text-slate-400">{customer.phone}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
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
                        <input value={item.productName} onChange={event => updateCartItem(index, { productName: event.target.value })} placeholder="اسم الصنف المخصص" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none" />
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 mb-1">مرابح هذا الصنف تحسب على أي قسم؟</label>
                          <select value={item.departmentId || ''} onChange={event => {
                            const dept = dynamicDepartments.find(department => department.id === event.target.value);
                            updateCartItem(index, { departmentId: dept?.id || 'dept-misc', departmentName: dept?.name || 'عام' });
                          }} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none">
                            <option value="">اختر قسم الربح</option>
                            {dynamicDepartments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
                          </select>
                        </div>
                        <input type="number" value={item.basePrice || ''} onChange={event => updateCartItem(index, { basePrice: parseFloat(event.target.value) || 0 })} placeholder="سعر الوحدة" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-indigo-600 outline-none" />
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
                  <input value={item.itemNotes || ''} onChange={event => updateCartItem(index, { itemNotes: event.target.value })} placeholder="ملاحظة" className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none" />
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
          <textarea value={orderNotes} onChange={event => setOrderNotes(event.target.value)} placeholder="ملاحظات الطلب" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none h-20" />
          <div className="flex items-center justify-between bg-slate-900 text-white rounded-2xl p-4">
            <span className="font-bold">الإجمالي</span>
            <span className="font-black text-xl">{cartTotal.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => completeSale('sale')} disabled={cart.length === 0} className="col-span-2 bg-emerald-600 disabled:bg-slate-300 text-white py-3 rounded-xl font-black">إتمام البيع</button>
            <button onClick={() => setIsDeliveryModalOpen(true)} disabled={cart.length === 0} className="bg-blue-600 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold text-xs">توصيل</button>
            <button onClick={() => setIsReservationModalOpen(true)} disabled={cart.length === 0} className="bg-purple-600 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold text-xs">حجز</button>
          </div>
          <button onClick={() => setActiveTab('menu')} className="lg:hidden w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold">العودة للقائمة</button>
        </div>
      </div>

      <DeliveryOrderModal isOpen={isDeliveryModalOpen} onClose={() => setIsDeliveryModalOpen(false)} onSubmit={createDeliveryOrder} customers={customers} />
      <ReservationModal isOpen={isReservationModalOpen} onClose={() => setIsReservationModalOpen(false)} onSubmit={createReservation} customers={customers} />
    </div>
  );
};

export default POSViewFinal;
