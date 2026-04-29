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
  const [selectedProductForModifiers, setSelectedProductForModifiers] = useState<Product | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<{name: string, price: number}[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
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

  const addToCart = (product: Product, overrides?: {modifiers?: {name: string, price: number}[]}) => {
    if (product.availableModifiers && product.availableModifiers.length > 0 && !overrides) {
        setSelectedProductForModifiers(product);
        setSelectedModifiers([]);
        return;
    }

    const basePrice = product.salePrice ?? product.price;
    const discountAmount = product.discountPercent ? (basePrice * (product.discountPercent / 100)) : 0;
    
    setCart([...cart, {
      productId: product.id,
      productName: product.name,
      price: basePrice,
      discount: discountAmount,
      modifiers: overrides?.modifiers,
    }]);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateCartItem = (index: number, updates: Partial<InvoiceItem>) => {
    setCart(cart.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const cartTotal = cart.reduce((sum, item) => {
    const modTotal = item.modifiers?.reduce((mSum, m) => mSum + m.price, 0) || 0;
    return sum + (item.price - (item.discount || 0)) + modTotal;
  }, 0);

  const handleCompleteSale = (type: OrderType = 'sale') => {
    if (cart.length === 0) return;
    onCompleteSale(cart.map(item => ({...item})), { 
      customerInfo: selectedCustomer ? { name: selectedCustomer.name, phone: selectedCustomer.phone, address: selectedCustomer.address } : undefined,
      notes: orderNotes,
      type,
      paymentMethod
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
                className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-300 ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 transform scale-105' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-indigo-300'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
            {filteredProducts.map(p => {
              return (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addToCart(p); } }}
                  className="group relative flex flex-col bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 text-right hover:shadow-xl hover:border-indigo-400 transition-all duration-200 cursor-pointer select-none active:scale-95"
                >
                  <div className="flex-1">
                    <div className="aspect-square w-full mb-3 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center relative group-hover:scale-[1.02] transition-transform duration-300">
                        {p.image ? (
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            <span className="material-symbols-outlined text-slate-200 text-3xl">restaurant_menu</span>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="bg-white text-indigo-600 rounded-full w-10 h-10 flex items-center justify-center shadow-lg transform scale-50 group-hover:scale-100 transition-all duration-300">
                                <span className="material-symbols-outlined text-xl">add_shopping_cart</span>
                            </div>
                        </div>
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
                     <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">متاح</span>
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
      <div className="lg:w-2/5 xl:w-[30%] bg-slate-50 shadow-inner rounded-3xl flex flex-col overflow-hidden border-2 border-slate-200 border-dashed h-[70vh] lg:h-full relative">
        <div className="absolute top-0 left-8 right-8 h-4 bg-white shadow-sm rounded-b-xl z-10"></div>
        <div className="p-6 border-b-2 border-slate-200 border-dashed flex-shrink-0 bg-white">
          <div className="flex justify-between items-center mb-4 mt-2">
            <h3 className="text-xl font-bold text-slate-800 font-mono tracking-tight text-center w-full">تذكرة الطلب</h3>
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

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3 bg-[#fdfdfd]">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300">
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-4xl">receipt_long</span>
                </div>
                <p className="font-bold">التذكرة فارغة</p>
                <p className="text-xs mt-1">ابدأ بإضافة الأصناف</p>
            </div>
          ) : (
            cart.map((item, index) => (
              <div key={`${item.productId}-${index}`} className="group p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 transition-all shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <p className="font-bold text-slate-800 text-sm">{item.productName}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-indigo-600 font-bold font-mono">{(item.price - (item.discount || 0)).toFixed(2)}</p>
                                {item.discount ? (
                                    <p className="text-[9px] text-orange-500 font-bold bg-orange-50 px-1 rounded">خصم: {item.discount.toFixed(2)}</p>
                                ) : null}
                            </div>
                            {item.modifiers && item.modifiers.length > 0 && (
                                <div className="mt-1 space-y-0.5">
                                    {item.modifiers.map((mod, midx) => (
                                        <p key={midx} className="text-xs text-slate-500 flex justify-between">
                                            <span>+ {mod.name}</span>
                                            <span className="font-mono text-indigo-400">{(mod.price).toFixed(2)}</span>
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button onClick={() => removeFromCart(index)} className="text-slate-300 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded-lg">
                            <span className="material-symbols-outlined text-base">close</span>
                        </button>
                    </div>
                
                <div className="mt-2 text-xs">
                    <input 
                        type="text" 
                        placeholder="إضافة ملاحظات (بدون بصل، استواء كامل...)" 
                        value={item.notes || ''} 
                        onChange={e => updateCartItem(index, { notes: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-slate-600 outline-none focus:border-indigo-300 placeholder:text-slate-400"
                    />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t-2 border-slate-200 border-dashed bg-white flex-shrink-0 rounded-b-3xl">
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

          <div className="mb-4 bg-slate-50 p-2 rounded-xl flex gap-2 border border-slate-200">
            <button 
                onClick={() => setPaymentMethod('cash')}
                className={`flex-1 py-2 px-4 font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${paymentMethod === 'cash' ? 'bg-white shadow-sm text-indigo-600 border border-slate-200' : 'text-slate-500 hover:bg-slate-100'}`}
            >
                <span className="material-symbols-outlined text-lg">payments</span>
                كاش
            </button>
            <button 
                onClick={() => setPaymentMethod('card')}
                className={`flex-1 py-2 px-4 font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${paymentMethod === 'card' ? 'bg-white shadow-sm text-indigo-600 border border-slate-200' : 'text-slate-500 hover:bg-slate-100'}`}
            >
                <span className="material-symbols-outlined text-lg">credit_card</span>
                بطاقة
            </button>
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
       
       {selectedProductForModifiers && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
               <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                   <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                       <div>
                           <h3 className="font-bold text-xl text-slate-800">تخصيص {selectedProductForModifiers.name}</h3>
                           <p className="text-sm text-slate-500 mt-1">أضف التعديلات المطلوبة (اختياري)</p>
                       </div>
                       <button onClick={() => setSelectedProductForModifiers(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-all">
                           <span className="material-symbols-outlined">close</span>
                       </button>
                   </div>
                   <div className="p-6 flex-1 overflow-y-auto">
                       <div className="space-y-3">
                           {selectedProductForModifiers.availableModifiers?.map((mod, i) => {
                               const isSelected = selectedModifiers.some(s => s.name === mod.name);
                               return (
                                   <div 
                                       key={i}
                                       onClick={() => {
                                           if (isSelected) {
                                               setSelectedModifiers(selectedModifiers.filter(s => s.name !== mod.name));
                                           } else {
                                               setSelectedModifiers([...selectedModifiers, mod]);
                                           }
                                       }}
                                       className={`cursor-pointer p-4 rounded-xl border-2 flex justify-between items-center transition-all ${isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-indigo-200'}`}
                                   >
                                       <div className="flex items-center gap-3">
                                           <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                               {isSelected && <span className="material-symbols-outlined text-white text-sm">check</span>}
                                           </div>
                                           <span className="font-bold text-slate-700">{mod.name}</span>
                                       </div>
                                       <span className={`font-bold ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`}>+{mod.price.toFixed(2)}</span>
                                   </div>
                               );
                           })}
                       </div>
                   </div>
                   <div className="p-6 border-t border-slate-100 bg-white space-y-3">
                       <div className="flex justify-between items-center mb-2 px-2">
                           <span className="font-bold text-slate-500">الإجمالي بعد الإضافات:</span>
                           <span className="font-bold text-2xl text-indigo-600">
                               {((selectedProductForModifiers.salePrice ?? selectedProductForModifiers.price) + selectedModifiers.reduce((s, m) => s + m.price, 0)).toFixed(2)}
                           </span>
                       </div>
                       <button 
                           onClick={() => {
                               addToCart(selectedProductForModifiers, { modifiers: selectedModifiers });
                               setSelectedProductForModifiers(null);
                           }}
                           className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/30"
                       >
                           إضافة إلى السلة
                       </button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

export default POSView;