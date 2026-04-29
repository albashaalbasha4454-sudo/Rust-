import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Product, InvoiceItem, Customer, OrderType, ModifierGroup, Shift } from '../types';
import Modal from './Modal';
import DeliveryOrderModal from './DeliveryOrderModal';
import ReservationModal from './ReservationModal';

interface POSViewProps {
  products: Product[];
  modifierGroups: ModifierGroup[];
  customers: Customer[];
  activeShift?: Shift | null;
  openShift?: () => void;
  onCompleteSale: (items: InvoiceItem[], customerInfo?: any) => void;
  onCreateDeliveryOrder: (cart: InvoiceItem[], customerInfo: any, deliveryFee: number, source: any) => void;
  onCreateReservation: (cart: InvoiceItem[], customerInfo: any) => void;
}

const POSView: React.FC<POSViewProps> = ({ 
  products, 
  modifierGroups,
  customers, 
  activeShift,
  openShift,
  onCompleteSale, 
  onCreateDeliveryOrder, 
  onCreateReservation 
}) => {
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

  // Focus search input on mount and after adding to cart
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category || 'غير مصنف'));
    return ['الكل', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = products.filter(p => p.isAvailable !== false);
    if (selectedCategory !== 'الكل') {
      filtered = filtered.filter(p => (p.category || 'غير مصنف') === selectedCategory);
    }
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
          (p.name.toLowerCase().includes(lowerSearchTerm) || 
           p.barcode?.toLowerCase() === lowerSearchTerm ||
           p.description?.toLowerCase().includes(lowerSearchTerm)) 
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

  const [productToCustomize, setProductToCustomize] = useState<Product | null>(null);

  const addToCart = (product: Product, selectedModifiers: InvoiceItem['modifiers'] = []) => {
    // If product has modifiers defined in its modifierGroupIds, and no selection was provided yet
    if (product.modifierGroupIds && product.modifierGroupIds.length > 0 && selectedModifiers.length === 0) {
      setProductToCustomize(product);
      return;
    }

    const basePrice = product.salePrice ?? product.price;
    const modifierTotal = selectedModifiers.reduce((sum, m) => sum + m.priceDelta, 0);
    const finalItemPrice = basePrice + modifierTotal;
    const discountAmount = product.discountPercent ? (basePrice * (product.discountPercent / 100)) : 0;
    
    setCart(prev => {
        // Compare items with same modifiers
        const existingItemIndex = prev.findIndex(item => 
          item.productId === product.id && 
          JSON.stringify(item.modifiers || []) === JSON.stringify(selectedModifiers)
        );

        if (existingItemIndex > -1) {
            const newCart = [...prev];
            const item = newCart[existingItemIndex];
            const newQty = (item.quantity || 0) + 1;
            newCart[existingItemIndex] = {
                ...item,
                quantity: newQty,
                lineTotal: (item.price - (item.discount || 0)) * newQty
            };
            return newCart;
        } else {
            return [...prev, {
                productId: product.id,
                productName: product.name,
                price: finalItemPrice,
                cost: product.cost,
                quantity: 1,
                discount: discountAmount,
                modifiers: selectedModifiers,
                lineTotal: finalItemPrice - discountAmount
            }];
        }
    });

    setSearchTerm('');
    searchInputRef.current?.focus();
  };

  const handleCustomizationComplete = (modifiers: InvoiceItem['modifiers']) => {
    if (productToCustomize) {
      addToCart(productToCustomize, modifiers);
      setProductToCustomize(null);
    }
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateCartItem = (index: number, updates: Partial<InvoiceItem>) => {
    setCart(cart.map((item, i) => {
        if (i === index) {
            const newItem = { ...item, ...updates };
            if (updates.quantity !== undefined || updates.price !== undefined || updates.discount !== undefined) {
                newItem.lineTotal = (newItem.price - (newItem.discount || 0)) * (newItem.quantity || 1);
            }
            return newItem;
        }
        return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.lineTotal || 0), 0);

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

  // Handle barcode typing
  const handleBarcodeSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const found = products.find(p => p.barcode === searchTerm && p.isAvailable !== false);
      if (found) {
        addToCart(found);
        setSearchTerm('');
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 sm:p-6 lg:h-[calc(100vh-76px)] overflow-hidden">
      {/* Product Selection Area */}
      <div className="lg:w-3/5 xl:w-2/3 bg-white shadow-lg rounded-2xl flex flex-col overflow-hidden border border-slate-100 h-[60vh] lg:h-full">
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-800">قائمة الطعام</h3>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-1">اختر الأصناف أو امسح الباركود.</p>
            </div>
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute top-1/2 -translate-y-1/2 right-3 text-slate-400">search</span>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="اسم الصنف أو الباركود..."
                value={searchTerm}
                onKeyDown={handleBarcodeSearch}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 ps-10 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
              />
            </div>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-50/30">
          <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map(p => {
              const price = p.salePrice ?? p.price;
              const hasDiscount = !!p.discountPercent;
              const finalPrice = hasDiscount ? price * (1 - p.discountPercent! / 100) : price;

              return (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  role="button"
                  tabIndex={0}
                  className="group relative flex flex-col bg-white border border-slate-200 rounded-[2rem] p-4 text-right hover:shadow-2xl hover:border-indigo-200 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                >
                  <div className="flex-1">
                    <div className="aspect-square w-full mb-4 rounded-3xl bg-slate-50 border border-slate-100 overflow-hidden relative shadow-inner">
                        {p.image ? (
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-200">
                              <span className="material-symbols-outlined text-4xl">restaurant</span>
                            </div>
                        )}
                        {hasDiscount && (
                           <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] sm:text-xs px-2.5 py-1 rounded-full font-black shadow-lg">
                              -{p.discountPercent}%
                           </div>
                        )}
                    </div>
                    
                    <div className="px-1">
                      <div className="flex justify-between items-center mb-1">
                          <span className="text-indigo-600 font-black text-lg">
                              {finalPrice.toFixed(2)}
                          </span>
                      </div>
                      <h4 className="font-black text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2 text-sm sm:text-base leading-tight mb-1">{p.name}</h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1 h-3">{p.description || p.category}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                     <div className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white shadow-sm">
                        <span className="material-symbols-outlined font-bold">add</span>
                     </div>
                     <span className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">إضافة</span>
                  </div>
                </div>
              );
            })}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-20 text-center">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <span className="material-symbols-outlined text-5xl text-slate-200">search_off</span>
                  </div>
                  <p className="text-lg font-bold text-slate-400">لا توجد نتائج مطابقة لبحثك</p>
                  <p className="text-xs text-slate-300 mt-1">جرب كلمات أخرى أو امسح الباركود</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart Area */}
      <div className="lg:w-2/5 xl:w-[420px] bg-white shadow-2xl rounded-3xl flex flex-col overflow-hidden border border-slate-100 h-[70vh] lg:h-full">
        <div className="p-6 border-b border-slate-100 flex-shrink-0 bg-white">
          <div className="flex justify-between items-center mb-6">
            <div className="text-right">
              <h3 className="text-2xl font-black text-slate-800">السلة</h3>
              <p className="text-xs text-slate-400 font-medium">الطلب الحالي رقم {Date.now().toString().slice(-4)}</p>
            </div>
            <div className="flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-2xl shadow-sm border border-orange-200">
               <span className="material-symbols-outlined text-sm">shopping_basket</span>
               <span className="text-sm font-black">{cart.length} أصناف</span>
            </div>
          </div>
          
          {/* Customer Selection */}
          <div className="relative">
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-5 bg-amber-50 rounded-[2rem] border border-amber-200 shadow-sm transition-all animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-amber-200">
                    {selectedCustomer.name[0]}
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900 leading-none mb-1">{selectedCustomer.name}</p>
                    <p className="text-xs text-slate-500 font-medium">{selectedCustomer.phone}</p>
                    {selectedCustomer.totalSpent !== undefined && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] bg-white/50 w-fit px-2 py-0.5 rounded-full border border-amber-100 text-amber-700 font-bold">
                            رصيد الطلبات: {selectedCustomer.totalSpent.toFixed(2)}
                        </div>
                    )}
                  </div>
                </div>
                <button 
                    onClick={() => setSelectedCustomer(null)} 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-red-100 hover:text-red-500 transition-all border border-transparent hover:border-red-200"
                    title="إزالة العميل"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
            ) : (
              <div className="relative">
                <button 
                  onClick={() => setShowCustomerSearch(!showCustomerSearch)}
                  className="w-full flex items-center justify-between p-5 bg-slate-50 rounded-[2rem] border border-slate-200 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all group"
                >
                  <div className="flex items-center gap-4 text-base font-black">
                    <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">person_add</span>
                    {customerSearch || 'ربط عميل بالطلب...'}
                  </div>
                  <span className={`material-symbols-outlined text-slate-400 transition-transform ${showCustomerSearch ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                
                {showCustomerSearch && (
                  <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[2rem] shadow-2xl border border-slate-100 z-50 max-h-80 overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-200">
                    <div className="p-5 border-b border-slate-50 bg-white">
                      <div className="relative">
                          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                          <input 
                            autoFocus
                            type="text"
                            placeholder="ابحث بالاسم أو الهاتف..."
                            className="w-full p-4 pr-11 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                          />
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-60 custom-scrollbar">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map(c => (
                          <button
                            key={c.id}
                            onClick={() => { setSelectedCustomer(c); setShowCustomerSearch(false); setCustomerSearch(''); }}
                            className="w-full p-5 text-right hover:bg-slate-50 flex items-center justify-between group transition-colors border-b border-slate-50 last:border-0"
                          >
                            <div>
                              <p className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{c.name}</p>
                              <p className="text-xs text-slate-500 font-medium">{c.phone}</p>
                            </div>
                            <span className="material-symbols-outlined text-indigo-100 group-hover:text-indigo-600 transition-all transform scale-0 group-hover:scale-100">check_circle</span>
                          </button>
                        ))
                      ) : (
                        <div className="p-10 text-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                              <span className="material-symbols-outlined text-3xl text-slate-200">person_off</span>
                          </div>
                          <p className="text-sm font-bold text-slate-400 mb-6">لا يوجد عميل بهذا الاسم أو الرقم</p>
                          <button 
                            onClick={() => {
                              const newCust: any = { id: `temp-${Date.now()}`, name: customerSearch || 'عميل سريع', phone: customerSearch.match(/\d+/) ? customerSearch : '', address: '', totalSpent: 0, totalOrders: 0 };
                              setSelectedCustomer(newCust);
                              setShowCustomerSearch(false);
                              setCustomerSearch('');
                            }}
                            className="w-full bg-indigo-600 text-white px-6 py-4 rounded-2xl text-sm font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                            <span className="material-symbols-outlined">add</span>
                            إنشاء ملف سريع للعميل
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-100/30 space-y-5">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 animate-in fade-in duration-700">
                <div className="w-28 h-28 rounded-[3rem] bg-white shadow-xl shadow-slate-200/50 flex items-center justify-center mb-8 border border-slate-50">
                    <span className="material-symbols-outlined text-6xl text-slate-100">shopping_cart</span>
                </div>
                <h4 className="font-black text-slate-400 text-lg">السلة فارغة</h4>
                <p className="text-xs mt-2 text-slate-300 font-medium">ابدأ بإضافة الأصناف للطلب</p>
            </div>
          ) : (
            cart.map((item, index) => (
              <div key={`${item.productId}-${index}`} className="group relative p-5 bg-white border border-slate-200 rounded-[2rem] shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 animate-in slide-in-from-left-3">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <h5 className="font-black text-slate-900 text-lg mb-1 leading-tight">{item.productName}</h5>
                            
                            {item.modifiers && item.modifiers.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {item.modifiers.map((m, mi) => (
                                  <span key={mi} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-200 font-bold">
                                    + {m.name}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center gap-3">
                                <span className="text-xl font-black text-indigo-600">{(item.lineTotal || 0).toFixed(2)} <small className="text-[10px] font-medium opacity-70">ريال</small></span>
                                {item.discount ? (
                                    <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-full font-black flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[12px]">local_offer</span>
                                        خصم: {(item.discount * (item.quantity || 1)).toFixed(2)}
                                    </span>
                                ) : null}
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-3">
                            <button 
                                onClick={() => removeFromCart(index)} 
                                className="w-10 h-10 rounded-2xl bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-red-500 hover:text-white border border-red-100 hover:shadow-lg shadow-red-200"
                                title="حذف الصنف"
                            >
                                <span className="material-symbols-outlined text-xl">delete</span>
                            </button>
                            
                            <div className="flex flex-col items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
                              <button 
                                onClick={() => updateCartItem(index, { quantity: (item.quantity || 1) + 1 })}
                                className="w-10 h-10 bg-white text-indigo-600 rounded-xl flex items-center justify-center border border-slate-100 hover:bg-indigo-600 hover:text-white hover:shadow-md transition-all shadow-sm"
                              >
                                 <span className="material-symbols-outlined text-lg font-black">add</span>
                              </button>
                              <span className="w-10 h-10 flex items-center justify-center text-lg font-black text-slate-800">{item.quantity || 1}</span>
                              <button 
                                onClick={() => updateCartItem(index, { quantity: Math.max(1, (item.quantity || 1) - 1) })}
                                className="w-10 h-10 bg-white text-slate-500 rounded-xl flex items-center justify-center border border-slate-100 hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"
                              >
                                 <span className="material-symbols-outlined text-lg font-black">remove</span>
                              </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-3">
                        <span className="material-symbols-outlined text-slate-300 text-lg">notes</span>
                        <input 
                            type="text" 
                            placeholder="أي ملاحظات خاصة بهذا الصنف؟" 
                            value={item.notes || ''} 
                            onChange={e => updateCartItem(index, { notes: e.target.value })}
                            className="flex-1 text-xs bg-slate-50 px-3 py-2 rounded-xl text-slate-600 outline-none border border-transparent focus:border-indigo-100 focus:bg-white transition-all placeholder:text-slate-300"
                        />
                    </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-white">
          <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-indigo-600 text-xl font-bold">sticky_note_2</span>
                <span className="text-sm font-black text-slate-700">ملاحظات الطلب العامة:</span>
              </div>
              <textarea 
                placeholder="مثلاً: بدون بصل، صوص خارجي، ملاحظات السائق..." 
                value={orderNotes} 
                onChange={e => setOrderNotes(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all min-h-[70px] resize-none placeholder:text-slate-300"
              />
          </div>

          <div className="flex justify-between items-center mb-10 px-2 group cursor-pointer" onClick={() => {/* Toggle details maybe */}}>
            <span className="text-slate-500 font-extrabold text-lg">المبلغ الإجمالي</span>
            <div className="text-right flex flex-col items-end">
              <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-bold mb-1">صافي الحساب</span>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-indigo-600 tracking-tighter drop-shadow-sm">{cartTotal.toFixed(2)}</span>
                <span className="text-sm font-black text-indigo-400">ريال</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleCompleteSale('dine_in')} 
                  disabled={cart.length === 0} 
                  className="h-16 bg-emerald-600 text-white font-black rounded-3xl hover:bg-emerald-700 disabled:opacity-50 transition-all flex flex-col items-center justify-center gap-0.5 shadow-xl shadow-emerald-600/20 active:scale-95"
                >
                    <span className="material-symbols-outlined">restaurant</span>
                    <span className="text-xs">طلب صالة</span>
                </button>
                <button 
                  onClick={() => handleCompleteSale('takeaway')} 
                  disabled={cart.length === 0} 
                  className="h-16 bg-orange-500 text-white font-black rounded-3xl hover:bg-orange-600 disabled:opacity-50 transition-all flex flex-col items-center justify-center gap-0.5 shadow-xl shadow-orange-500/20 active:scale-95"
                >
                    <span className="material-symbols-outlined">shopping_bag</span>
                    <span className="text-xs">سفري</span>
                </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                 <button 
                  onClick={() => setIsReservationModalOpen(true)} 
                  disabled={cart.length === 0} 
                  className="h-14 bg-indigo-50 text-indigo-600 font-black rounded-3xl hover:bg-indigo-100 disabled:opacity-50 transition-all flex flex-col items-center justify-center gap-0.5"
                >
                    <span className="material-symbols-outlined text-xl">event_note</span>
                    <span className="text-[10px]">حجز مسبق</span>
                </button>
                <button 
                  onClick={() => setIsDeliveryModalOpen(true)} 
                  disabled={cart.length === 0} 
                  className="h-14 bg-sky-50 text-sky-600 font-black rounded-3xl hover:bg-sky-100 disabled:opacity-50 transition-all flex flex-col items-center justify-center gap-0.5"
                >
                    <span className="material-symbols-outlined text-xl">local_shipping</span>
                    <span className="text-[10px]">توصيل منازل</span>
                </button>
            </div>

            <button 
                onClick={() => { if(window.confirm('هل أنت متأكد من إفراغ السلة؟')) setCart([]); }} 
                disabled={cart.length === 0} 
                className="w-full h-8 text-slate-300 font-bold hover:text-red-500 transition-colors flex items-center justify-center gap-2 text-[10px]"
            >
                <span className="material-symbols-outlined text-sm">delete_sweep</span>
                إفراغ السلة
            </button>
          </div>
        </div>
      </div>
       {isDeliveryModalOpen && <DeliveryOrderModal cart={cart} customers={customers} onClose={() => setIsDeliveryModalOpen(false)} onConfirm={handleCreateDeliveryOrder} />}
       {isReservationModalOpen && <ReservationModal cart={cart} customers={customers} onClose={() => setIsReservationModalOpen(false)} onConfirm={handleCreateReservation} />}
      {productToCustomize && (
        <ModifierSelectorModal
          product={productToCustomize}
          modifierGroups={modifierGroups.filter(g => productToCustomize.modifierGroupIds.includes(g.id))}
          onClose={() => setProductToCustomize(null)}
          onConfirm={handleCustomizationComplete}
        />
      )}
    </div>
  );
};

const ModifierSelectorModal: React.FC<{
  product: Product;
  modifierGroups: ModifierGroup[];
  onClose: () => void;
  onConfirm: (modifiers: InvoiceItem['modifiers']) => void;
}> = ({ product, modifierGroups, onClose, onConfirm }) => {
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  const handleToggleOption = (groupId: string, optionId: string, maxSelect: number) => {
    setSelections(prev => {
      const current = prev[groupId] || [];
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter(id => id !== optionId) };
      }
      if (maxSelect === 1) {
        return { ...prev, [groupId]: [optionId] };
      }
      if (current.length < maxSelect) {
        return { ...prev, [groupId]: [...current, optionId] };
      }
      return prev;
    });
  };

  const handleConfirm = () => {
    const finalModifiers: InvoiceItem['modifiers'] = [];
    modifierGroups.forEach(group => {
      const selectedIds = selections[group.id] || [];
      selectedIds.forEach(id => {
        const option = group.options.find(o => o.id === id);
        if (option) {
          finalModifiers.push({
            groupId: group.id,
            optionId: option.id,
            name: option.name,
            priceDelta: option.priceDelta
          });
        }
      });
    });
    onConfirm(finalModifiers);
  };

  const isSelectionValid = modifierGroups.every(group => {
    const selectedCount = (selections[group.id] || []).length;
    return selectedCount >= group.minSelect && selectedCount <= group.maxSelect;
  });

  return (
    <Modal isOpen={true} onClose={onClose} title={`تخصيص: ${product.name}`} size="lg">
      <div className="space-y-8 p-1">
        {modifierGroups.map(group => (
          <div key={group.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="font-black text-slate-800 text-lg">{group.name}</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">
                  {group.minSelect > 0 ? `إلزامي (اختر ${group.minSelect})` : `اختياري (بحد أقصى ${group.maxSelect})`}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black ${(selections[group.id]?.length || 0) >= group.minSelect ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                تم اختيار {selections[group.id]?.length || 0}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {group.options.map(option => (
                <button
                  key={option.id}
                  onClick={() => handleToggleOption(group.id, option.id, group.maxSelect)}
                  className={`p-4 rounded-2xl border-2 text-right transition-all flex flex-col justify-between h-24 ${selections[group.id]?.includes(option.id) ? 'border-indigo-600 bg-indigo-50 ring-4 ring-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-200'}`}
                >
                  <span className={`text-sm font-black ${selections[group.id]?.includes(option.id) ? 'text-indigo-700' : 'text-slate-700'}`}>{option.name}</span>
                  {option.priceDelta !== 0 && (
                    <span className="text-xs font-black text-indigo-500">
                      +{option.priceDelta.toFixed(2)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-colors">إلغاء</button>
          <button
            onClick={handleConfirm}
            disabled={!isSelectionValid}
            className={`flex-[2] py-4 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95 ${isSelectionValid ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-slate-300 cursor-not-allowed shadow-none'}`}
          >
            إضافة للسلة
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default POSView;
