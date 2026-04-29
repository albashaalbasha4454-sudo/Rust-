import React, { useState, useMemo, useRef } from 'react';
import type { Product, InvoiceItem, Customer, OrderType } from '../types';
import DeliveryOrderModal from './DeliveryOrderModal';
import ReservationModal from './ReservationModal';


interface POSViewProps {
  products: Product[];
  customers: Customer[];
  onCompleteSale: (items: InvoiceItem[], customerInfo?: any) => void;
  onCreateDeliveryOrder: (cart: InvoiceItem[], customerInfo: any, deliveryFee: number, source: any) => void;
  onCreateReservation: (cart: InvoiceItem[], customerInfo: any) => void;
}

const POSView: React.FC<POSViewProps> = ({ products, customers, onCompleteSale, onCreateDeliveryOrder, onCreateReservation }) => {
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category || 'غير مصنف'));
    return ['الكل', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedCategory !== 'الكل') {
      filtered = filtered.filter(p => (p.category || 'غير مصنف') === selectedCategory);
    }
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
          (p.name.toLowerCase().includes(lowerSearchTerm) || p.description?.toLowerCase().includes(lowerSearchTerm)) 
      );
    }
    return filtered;
  }, [products, searchTerm, selectedCategory]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 5);
    const lowerSearch = customerSearch.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(lowerSearch) || 
      c.phone.includes(customerSearch)
    ).slice(0, 10);
  }, [customers, customerSearch]);

  const addToCart = (product: Product) => {
    const basePrice = product.salePrice ?? product.price;
    const discountAmount = product.discountPercent ? (basePrice * (product.discountPercent / 100)) : 0;
    
    setCart([...cart, {
      productId: product.id,
      productName: product.name,
      price: basePrice,
      discount: discountAmount,
    }]);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateCartItem = (index: number, updates: Partial<InvoiceItem>) => {
    setCart(cart.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price - (item.discount || 0)), 0);

  const handleCompleteSale = (type: OrderType = 'sale') => {
    if (cart.length === 0) return;
    onCompleteSale(cart.map(item => ({...item})), { 
      customerInfo: selectedCustomer ? { name: selectedCustomer.name, phone: selectedCustomer.phone, address: selectedCustomer.address } : undefined,
      notes: orderNotes,
      type
    });
    setCart([]);
    setSelectedCustomer(null);
    setOrderNotes('');
  };

  const handleCreateDeliveryOrder = (customerInfo: any, deliveryFee: number, source: any) => {
      onCreateDeliveryOrder(cart, customerInfo, deliveryFee, source);
      setIsDeliveryModalOpen(false);
      setCart([]);
      setSelectedCustomer(null);
      setOrderNotes('');
  }
  
  const handleCreateReservation = (customerInfo: any) => {
      onCreateReservation(cart, customerInfo);
      setIsReservationModalOpen(false);
      setCart([]);
      setSelectedCustomer(null);
      setOrderNotes('');
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 sm:p-6 lg:h-[calc(100vh-76px)] overflow-hidden">
      {/* Product Selection Area */}
      <div className="lg:w-3/5 xl:w-2/3 bg-white shadow-lg rounded-2xl flex flex-col overflow-hidden border border-slate-100 h-[60vh] lg:h-full">
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-800">قائمة الطعام</h3>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-1">اختر الأصناف لإضافتها إلى سلة الطلبات.</p>
            </div>
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute top-1/2 -translate-y-1/2 right-3 text-slate-400 text-sm">search</span>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="بحث سريع..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 ps-10 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filteredProducts.map(p => {
              return (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addToCart(p); } }}
                  className="group relative flex flex-col bg-white border border-slate-100 rounded-2xl p-3 sm:p-4 text-right hover:shadow-xl hover:border-indigo-100 transition-all duration-300 cursor-pointer"
                >
                  <div className="flex-1">
                    <div className="aspect-video w-full mb-3 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center">
                        {p.image ? (
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            <span className="material-symbols-outlined text-slate-200 text-3xl">image</span>
                        )}
                    </div>
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                            <span className="text-indigo-600 font-bold text-base sm:text-lg">
                                {p.discountPercent 
                                    ? ((p.salePrice ?? p.price) * (1 - p.discountPercent / 100)).toFixed(2) 
                                    : (p.salePrice ?? p.price).toFixed(2)}
                            </span>
                            {p.discountPercent && (
                                <span className="text-[10px] text-orange-500 line-through font-medium">
                                    {(p.salePrice ?? p.price).toFixed(2)}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                            {p.discountPercent && <span className="bg-orange-500 text-white text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-md font-bold">-{p.discountPercent}%</span>}
                        </div>
                    </div>
                    <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2 text-sm sm:text-base">{p.name}</h4>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1 line-clamp-1">{p.description || p.category}</p>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                     <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white">
                        <span className="material-symbols-outlined text-sm">add</span>
                     </div>
                     <span className="text-[9px] sm:text-[10px] font-bold text-green-500">متوفر</span>
                  </div>
                </div>
              );
            })}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-12 sm:py-20 text-center text-slate-400">
                  <span className="material-symbols-outlined text-5xl sm:text-6xl mb-4">search_off</span>
                  <p className="text-base sm:text-lg">لا توجد نتائج مطابقة</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart Area */}
      <div className="lg:w-2/5 xl:w-1/3 bg-white shadow-lg rounded-2xl flex flex-col overflow-hidden border border-slate-100 h-[70vh] lg:h-full">
        <div className="p-6 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-slate-800">سلة الطلبات</h3>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold">
              {cart.length} أصناف
            </span>
          </div>
          
          {/* Customer Selection */}
          <div className="relative">
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xs font-bold">
                    {selectedCustomer.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{selectedCustomer.name}</p>
                    <p className="text-[10px] text-slate-500">{selectedCustomer.phone}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            ) : (
              <div className="relative">
                <button 
                  onClick={() => setShowCustomerSearch(!showCustomerSearch)}
                  className="w-full flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 text-slate-500 hover:border-indigo-300 transition-all"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span className="material-symbols-outlined text-indigo-500">person_add</span>
                    {customerSearch || 'اختيار عميل...'}
                  </div>
                  <span className="material-symbols-outlined text-slate-400">expand_more</span>
                </button>
                
                {showCustomerSearch && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 max-h-60 overflow-y-auto overflow-x-hidden">
                    <div className="p-3 border-b border-slate-50 sticky top-0 bg-white">
                      <input 
                        autoFocus
                        type="text"
                        placeholder="بحث عن عميل..."
                        className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                      />
                    </div>
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedCustomer(c); setShowCustomerSearch(false); setCustomerSearch(''); }}
                          className="w-full p-4 text-right hover:bg-indigo-50 flex items-center justify-between group transition-colors"
                        >
                          <div>
                            <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600">{c.name}</p>
                            <p className="text-[10px] text-slate-500">{c.phone}</p>
                          </div>
                          <span className="material-symbols-outlined text-slate-200 group-hover:text-indigo-600">check_circle</span>
                        </button>
                      ))
                    ) : (
                      <div className="p-6 text-center">
                        <p className="text-xs text-slate-400 mb-3">لم يتم العثور على نتائج</p>
                        <button 
                          onClick={() => {
                            const newCust: any = { id: `temp-${Date.now()}`, name: customerSearch || 'عميل جديد', phone: customerSearch.match(/\d+/) ? customerSearch : '', address: '', totalPurchases: 0, lastPurchaseDate: '' };
                            setSelectedCustomer(newCust);
                            setShowCustomerSearch(false);
                            setCustomerSearch('');
                          }}
                          className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all"
                        >
                          + إضافة كعميل جديد
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300">
                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-4xl">shopping_cart_off</span>
                </div>
                <p className="font-bold">السلة فارغة</p>
                <p className="text-xs mt-1">ابدأ بإضافة الأصناف من القائمة</p>
            </div>
          ) : (
            cart.map((item, index) => (
              <div key={`${item.productId}-${index}`} className="group p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="font-bold text-slate-800">{item.productName}</p>
                            <div className="flex flex-col">
                                <p className="text-[10px] text-indigo-600 font-bold">{(item.price - (item.discount || 0)).toFixed(2)}</p>
                                {item.discount ? (
                                    <p className="text-[8px] text-orange-500 font-bold">خصم: {item.discount.toFixed(2)}</p>
                                ) : null}
                            </div>
                        </div>
                        <button onClick={() => removeFromCart(index)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                    </div>
                
                <div className="mt-3 pt-3 border-t border-slate-50">
                    <input 
                        type="text" 
                        placeholder="إضافة ملاحظات للصنف..." 
                        value={item.notes || ''} 
                        onChange={e => updateCartItem(index, { notes: e.target.value })}
                        className="w-full text-[10px] bg-transparent text-slate-500 outline-none placeholder:text-slate-300"
                    />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
          <div className="mb-4">
              <textarea 
                placeholder="ملاحظات عامة على الطلب..." 
                value={orderNotes} 
                onChange={e => setOrderNotes(e.target.value)}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                rows={2}
              />
          </div>

          <div className="flex justify-between items-end mb-6">
            <span className="text-slate-500 font-bold">الإجمالي النهائي:</span>
            <span className="text-4xl font-black text-indigo-600">{cartTotal.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleCompleteSale('dine_in')} 
                  disabled={cart.length === 0} 
                  className="bg-emerald-600 text-white font-bold py-3 px-4 rounded-2xl hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                  title="إتمام الطلب لعملاء الصالة (الأكل داخل المطعم)"
                >
                    <span className="material-symbols-outlined">restaurant</span>
                    صالة
                </button>
                <button 
                  onClick={() => handleCompleteSale('takeaway')} 
                  disabled={cart.length === 0} 
                  className="bg-amber-600 text-white font-bold py-3 px-4 rounded-2xl hover:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-100"
                  title="إتمام الطلب كطلب سفري (تغليف خارجي)"
                >
                    <span className="material-symbols-outlined">shopping_bag</span>
                    سفري
                </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
                 <button 
                  onClick={() => setIsReservationModalOpen(true)} 
                  disabled={cart.length === 0} 
                  className="bg-indigo-100 text-indigo-700 font-bold py-3 px-4 rounded-2xl hover:bg-indigo-200 disabled:bg-slate-100 disabled:text-slate-300 transition-all flex items-center justify-center gap-2"
                  title="إنشاء حجز مسبق لطاولة أو موعد"
                >
                    <span className="material-symbols-outlined">event_available</span>
                    حجز
                </button>
                <button 
                  onClick={() => setIsDeliveryModalOpen(true)} 
                  disabled={cart.length === 0} 
                  className="bg-sky-100 text-sky-700 font-bold py-3 px-4 rounded-2xl hover:bg-sky-200 disabled:bg-slate-100 disabled:text-slate-300 transition-all flex items-center justify-center gap-2"
                  title="إنشاء طلب توصيل للمنازل مع تحديد رسوم التوصيل"
                >
                    <span className="material-symbols-outlined">local_shipping</span>
                    توصيل
                </button>
            </div>

            <button 
                onClick={() => { if(window.confirm('هل أنت متأكد من إفراغ السلة؟')) setCart([]); }} 
                disabled={cart.length === 0} 
                className="w-full text-slate-400 font-bold py-2 hover:text-red-500 transition-colors flex items-center justify-center gap-2 text-xs"
            >
                <span className="material-symbols-outlined text-sm">delete_sweep</span>
                إفراغ السلة بالكامل
            </button>
          </div>
        </div>
      </div>
       {isDeliveryModalOpen && <DeliveryOrderModal cart={cart} customers={customers} onClose={() => setIsDeliveryModalOpen(false)} onConfirm={handleCreateDeliveryOrder} />}
       {isReservationModalOpen && <ReservationModal cart={cart} customers={customers} onClose={() => setIsReservationModalOpen(false)} onConfirm={handleCreateReservation} />}
    </div>
  );
};

export default POSView;