import React, { useState, useMemo, useRef } from 'react';
import type { Product, Modifier, InvoiceItem, Customer, OrderType } from '../types';
import DeliveryOrderModal from './DeliveryOrderModal';
import ReservationModal from './ReservationModal';
import Modal from './Modal';


interface POSViewProps {
  products: Product[];
  modifiers: Modifier[];
  customers: Customer[];
  onCompleteSale: (items: InvoiceItem[], customerInfo?: any) => void;
  onCreateDeliveryOrder: (cart: InvoiceItem[], customerInfo: any, deliveryFee: number, source: any) => void;
  onCreateReservation: (cart: InvoiceItem[], customerInfo: any) => void;
}

const POSView: React.FC<POSViewProps> = ({ products, modifiers, customers, onCompleteSale, onCreateDeliveryOrder, onCreateReservation }) => {
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'menu' | 'cart'>('menu');
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

  const [addingProduct, setAddingProduct] = useState<Product | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<Modifier[]>([]);

  const productModifiers = useMemo(() => {
      if (!addingProduct) return [];
      return modifiers.filter(m => m.parentProductId === addingProduct.id && m.status === 'active');
  }, [addingProduct, modifiers]);

  const addToCart = (product: Product) => {
    // If product needs review or price is 0, add as "semi-custom" (editable in cart)
    if (product.reviewStatus === 'needs_price' || product.price === 0) {
        setCart([...cart, {
            productId: `needs-price-${product.id}`,
            productName: product.name,
            departmentId: product.departmentId,
            departmentName: product.departmentName,
            quantity: 1,
            basePrice: 0,
            modifiers: [],
            modifiersTotal: 0,
            unitPrice: 0,
            lineTotal: 0
        }]);
        if (window.innerWidth < 1024) setActiveTab('cart');
        return;
    }

    const applicableModifiers = modifiers.filter(m => m.parentProductId === product.id && m.status === 'active');
    if (applicableModifiers.length > 0) {
        setAddingProduct(product);
        setSelectedModifiers([]);
        return;
    }
    
    const basePrice = product.salePrice ?? product.price;
    setCart([...cart, {
      productId: product.id,
      productName: product.name,
      departmentId: product.departmentId,
      departmentName: product.departmentName,
      quantity: 1,
      basePrice: basePrice,
      modifiers: [],
      modifiersTotal: 0,
      unitPrice: basePrice,
      lineTotal: basePrice
    }]);
  };
  
const confirmAddToCart = () => {
    if (!addingProduct) return;
    const basePrice = addingProduct.salePrice ?? addingProduct.price;
    const modifiersTotal = selectedModifiers.reduce((sum, m) => sum + m.priceDelta, 0);
    const unitPrice = basePrice + modifiersTotal;
    
    setCart([...cart, {
        productId: addingProduct.id,
        productName: addingProduct.name,
        departmentId: addingProduct.departmentId,
        departmentName: addingProduct.departmentName,
        quantity: 1,
        basePrice: basePrice,
        modifiers: selectedModifiers.map(m => ({ modifierId: m.id, modifierName: m.name, priceDelta: m.priceDelta })),
        modifiersTotal,
        unitPrice,
        lineTotal: unitPrice
    }]);
    setAddingProduct(null);
    setSelectedModifiers([]);
};

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateCartItem = (index: number, updates: Partial<InvoiceItem>) => {
    setCart(cart.map((item, i) => {
      if (i === index) {
        const newItem = { ...item, ...updates };
        // Recalculate prices if extraPrice or basePrice or modifiersTotal changed
        const extraPrice = newItem.extraPrice || 0;
        newItem.unitPrice = newItem.basePrice + newItem.modifiersTotal + extraPrice;
        newItem.lineTotal = newItem.unitPrice * newItem.quantity;
        return newItem;
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);

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
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden bg-slate-50 relative border-t border-slate-100">
      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex bg-white border-b border-slate-200 sticky top-0 z-30 shrink-0 shadow-sm">
        <button 
          onClick={() => setActiveTab('menu')}
          className={`flex-1 py-3 text-xs font-bold flex flex-col items-center justify-center gap-1 border-b-2 transition-all ${activeTab === 'menu' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' : 'border-transparent text-slate-400'}`}
        >
          <span className="material-symbols-outlined text-xl">restaurant_menu</span>
          القائمة
        </button>
        <button 
          onClick={() => setActiveTab('cart')}
          className={`flex-1 py-3 text-xs font-bold flex flex-col items-center justify-center gap-1 border-b-2 transition-all relative ${activeTab === 'cart' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' : 'border-transparent text-slate-400'}`}
        >
          <div className="relative">
            <span className="material-symbols-outlined text-xl">receipt_long</span>
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full border border-white font-bold">
                {cart.length}
              </span>
            )}
          </div>
          السلة
        </button>
      </div>

      {/* Product Selection Area */}
      <div className={`flex-1 flex flex-col min-w-0 ${activeTab === 'menu' ? 'flex' : 'hidden lg:flex'}`}>
        <div className="bg-white border-b border-slate-200 p-4 sm:p-6 shadow-sm z-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                <span className="material-symbols-outlined text-2xl">local_mall</span>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">نظام المبيعات السريع</h3>
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium">اختر الأصناف لبدء طلب جديد</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <span className="material-symbols-outlined absolute top-1/2 -translate-y-1/2 right-3 text-slate-400 text-sm">search</span>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="ابحث عن صنف أو كود..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2.5 ps-10 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                />
              </div>
              <button 
                onClick={() => {
                  const customId = `custom-${Date.now()}`;
                  setCart([...cart, {
                    productId: customId,
                    productName: '',
                    departmentId: 'misc',
                    departmentName: 'عام',
                    quantity: 1,
                    basePrice: 0,
                    modifiers: [],
                    modifiersTotal: 0,
                    unitPrice: 0,
                    lineTotal: 0,
                    itemNotes: '',
                    extraPrice: 0
                  }]);
                  if (window.innerWidth < 1024) setActiveTab('cart');
                }}
                className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex items-center gap-2 group shrink-0 active:scale-95"
                title="إضافة صنف مخصص"
              >
                <span className="material-symbols-outlined text-lg group-hover:rotate-90 transition-transform">add_circle</span>
                <span className="hidden sm:inline text-xs font-black uppercase tracking-wider">صنف مخصص</span>
              </button>
            </div>
          </div>
          
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-300 border ${selectedCategory === cat ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100 transform -translate-y-0.5' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-50/30">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredProducts.map(p => (
              <div
                key={p.id}
                onClick={() => addToCart(p)}
                className="group relative flex flex-col bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 text-right hover:shadow-2xl hover:border-indigo-200 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1 active:scale-95"
              >
                <div className="relative aspect-square w-full mb-3 rounded-xl bg-slate-50 overflow-hidden flex items-center justify-center">
                    {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                    ) : (
                        <span className="material-symbols-outlined text-slate-300 text-4xl">restaurant_menu</span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end pb-4 px-2">
                        <span className="text-white text-[10px] font-bold mb-2 translate-y-4 group-hover:translate-y-0 transition-transform">إضافة للطلب</span>
                        <div className="bg-white text-indigo-600 rounded-full w-10 h-10 flex items-center justify-center shadow-2xl transform scale-50 group-hover:scale-100 transition-all">
                            <span className="material-symbols-outlined text-xl">add_shopping_cart</span>
                        </div>
                    </div>
                    {p.discountPercent && (
                      <div className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
                        -{p.discountPercent}%
                      </div>
                    )}
                    {p.reviewStatus === 'needs_price' && (
                      <div className="absolute top-2 right-2 bg-amber-500 text-white text-[8px] px-2 py-0.5 rounded-full font-bold shadow-sm flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[10px]">request_quote</span>
                        يحتاج تسعير
                      </div>
                    )}
                </div>
                
                <div className="flex flex-col flex-1">
                  <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 text-sm leading-tight">{p.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 font-medium">{p.description || p.category}</p>
                  
                  <div className="mt-auto pt-3 flex items-center justify-between border-t border-slate-50 mt-3">
                    <div className="flex flex-col">
                        <span className="text-indigo-600 font-black text-base">
                            {p.discountPercent 
                                ? ((p.salePrice ?? p.price) * (1 - p.discountPercent / 100)).toFixed(2) 
                                : (p.salePrice ?? p.price).toFixed(2)}
                        </span>
                        {p.discountPercent && (
                            <span className="text-[10px] text-slate-300 line-through">
                                {(p.salePrice ?? p.price).toFixed(2)}
                            </span>
                        )}
                    </div>
                    <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                      <span className="material-symbols-outlined text-sm">add</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
                </div>
                <h4 className="text-lg font-bold text-slate-800">لم نجد ما تبحث عنه</h4>
                <p className="text-sm text-slate-500 mt-1">جرب كلمات بحث أخرى أو صنف آخر</p>
                <button 
                  onClick={() => { setSearchTerm(''); setSelectedCategory('الكل'); }}
                  className="mt-4 text-indigo-600 font-bold text-sm hover:underline"
                >
                  عرض جميع الأصناف
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart Area */}
      <div className={`lg:w-96 xl:w-112 flex flex-col bg-white border-l border-slate-200 shadow-2xl z-40 transition-transform duration-300 ${activeTab === 'cart' ? 'fixed inset-0 lg:relative lg:translate-x-0' : 'hidden lg:flex'}`}>
        {/* Cart Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex-shrink-0 bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
               <span className="material-symbols-outlined text-slate-400">shopping_cart_checkout</span>
               <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider">سلة الطلبات</h3>
            </div>
            {cart.length > 0 && (
              <button 
                onClick={() => { if(window.confirm('هل أنت متأكد من إفراغ السلة؟')) setCart([]); }}
                className="text-red-500 hover:text-red-700 transition-colors p-2 hover:bg-red-50 rounded-xl flex items-center gap-1 text-[10px] font-bold"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                تصفير
              </button>
            )}
          </div>
          
          {/* Customer Section */}
          <div className="relative group">
            {selectedCustomer ? (
              <div className="relative animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-indigo-100">
                      {selectedCustomer.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{selectedCustomer.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{selectedCustomer.phone}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all">
                    <span className="material-symbols-outlined text-sm font-bold">close</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <button 
                  onClick={() => setShowCustomerSearch(!showCustomerSearch)}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-400 hover:bg-white hover:border-indigo-300 hover:text-indigo-600 transition-all group"
                >
                  <div className="flex items-center gap-3 text-sm font-bold">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center group-hover:border-indigo-200 group-hover:bg-indigo-50 transition-all">
                      <span className="material-symbols-outlined text-lg">person_add</span>
                    </div>
                    اختيار العميل (اختياري)
                  </div>
                  <span className={`material-symbols-outlined transition-transform duration-300 ${showCustomerSearch ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                
                {showCustomerSearch && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in zoom-in-95 duration-200 origin-top">
                    <div className="p-3 bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                      <input 
                        autoFocus
                        type="text"
                        placeholder="ابحث بالاسم أو الرقم..."
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400 transition-all"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto no-scrollbar">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map(c => (
                          <button
                            key={c.id}
                            onClick={() => { setSelectedCustomer(c); setShowCustomerSearch(false); setCustomerSearch(''); }}
                            className="w-full p-4 text-right hover:bg-indigo-50 flex items-center justify-between group transition-colors border-b border-slate-50 last:border-0"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                                {c.name[0]}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{c.name}</p>
                                <p className="text-[10px] text-slate-400 font-medium">{c.phone}</p>
                              </div>
                            </div>
                            <span className="material-symbols-outlined text-slate-200 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all">check_circle</span>
                          </button>
                        ))
                      ) : (
                        <div className="p-6 text-center">
                          <p className="text-xs text-slate-400 mb-4">لا يوجد عملاء بهذا الاسم</p>
                          <button 
                            onClick={() => {
                              const newCust: any = { id: `temp-${Date.now()}`, name: customerSearch || 'عميل جديد', phone: customerSearch.match(/\d+/) ? customerSearch : '', address: '', totalPurchases: 0, lastPurchaseDate: '' };
                              setSelectedCustomer(newCust);
                              setShowCustomerSearch(false);
                              setCustomerSearch('');
                            }}
                            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                          >
                            + تسجيل كعميل جديد
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

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-4 bg-slate-50/20">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 opacity-60">
                <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-6 border-4 border-white shadow-inner">
                    <span className="material-symbols-outlined text-5xl">receipt_long</span>
                </div>
                <h4 className="font-black text-slate-400 uppercase tracking-widest text-sm mb-1">تذكرة فارغة</h4>
                <p className="text-[10px] font-bold text-slate-400">يرجى إضافة أصناف من القائمة للبدء</p>
                
                <button 
                   onClick={() => setActiveTab('menu')}
                   className="mt-8 lg:hidden bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-indigo-100 active:scale-95 transition-all"
                >
                  العودة للقائمة
                </button>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item, index) => (
                <div 
                  key={`${item.productId}-${index}`} 
                  className="group relative bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all animate-in slide-in-from-right-4 duration-300 overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0 pr-1">
                      {item.productId.startsWith('custom-') || item.productId.startsWith('needs-price-') ? (
                        <div className="space-y-2">
                           <input 
                              type="text" 
                              placeholder="اسم الصنف المخصص..." 
                              value={item.productName} 
                              onChange={e => updateCartItem(index, { productName: e.target.value })}
                              className="w-full font-bold text-slate-900 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-indigo-400 transition-all"
                           />
                           <div className="flex items-center gap-2">
                              {item.productId.startsWith('needs-price-') && (
                                <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-lg flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">info</span>
                                    بانتظار السعر
                                </span>
                              )}
                              <span className="text-[10px] font-bold text-slate-400">سعر الوحدة:</span>
                              <input 
                                  type="number" 
                                  placeholder="0.00" 
                                  value={item.basePrice || ''} 
                                  onChange={e => updateCartItem(index, { basePrice: parseFloat(e.target.value) || 0 })}
                                  className="w-28 text-sm text-indigo-600 font-black bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:bg-white focus:border-indigo-400 transition-all font-mono"
                              />
                           </div>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                           <h4 className="font-black text-slate-900 text-sm leading-tight truncate">{item.productName}</h4>
                           {item.modifiers.length > 0 && (
                             <p className="text-[10px] text-slate-400 mt-1 font-medium bg-slate-50 px-2 py-0.5 rounded-lg w-fit">
                                {item.modifiers.map(m => m.modifierName).join(' + ')}
                             </p>
                           )}
                           <p className="text-xs text-indigo-600 font-black font-mono mt-1">{item.unitPrice.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => removeFromCart(index)} 
                      className="text-slate-300 hover:text-red-500 transition-all p-2 hover:bg-red-50 rounded-xl group/del"
                    >
                      <span className="material-symbols-outlined text-lg group-hover/del:scale-110">close</span>
                    </button>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-3 mt-4 pt-4 border-t border-slate-50">
                    {/* Quantity Controls */}
                    <div className="flex items-center bg-slate-100 rounded-xl p-1 shrink-0 w-full sm:w-auto">
                        <button 
                          onClick={() => updateCartItem(index, { quantity: Math.max(1, item.quantity - 1) })}
                          className="w-9 h-9 flex items-center justify-center bg-white rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-red-500 transition-all active:scale-90"
                        >
                          <span className="material-symbols-outlined text-lg font-bold">remove</span>
                        </button>
                        <div className="w-12 text-center text-base font-black text-slate-900 font-mono">
                          {item.quantity}
                        </div>
                        <button 
                          onClick={() => updateCartItem(index, { quantity: item.quantity + 1 })}
                          className="w-9 h-9 flex items-center justify-center bg-white rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-emerald-500 transition-all active:scale-90"
                        >
                          <span className="material-symbols-outlined text-lg font-bold">add</span>
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col gap-2 w-full">
                       <div className="relative">
                          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs">notes</span>
                          <input 
                            type="text" 
                            placeholder="ملاحظات الصنف (مثلاً: بدون مخلل...)" 
                            value={item.itemNotes || ''} 
                            onChange={e => updateCartItem(index, { itemNotes: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-8 text-[10px] font-medium text-slate-600 outline-none focus:bg-white focus:border-indigo-400 transition-all placeholder:text-slate-300"
                          />
                       </div>
                       <div className="relative group/extra">
                          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-xs">add_card</span>
                          <input 
                              type="number" 
                              placeholder="مبلغ إضافي..." 
                              value={item.extraPrice || ''} 
                              onChange={e => updateCartItem(index, { extraPrice: parseFloat(e.target.value) || 0 })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-10 py-2 text-[10px] font-black text-emerald-600 outline-none focus:bg-white focus:border-emerald-400 transition-all font-mono"
                          />
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 bg-emerald-50 text-emerald-600 text-[8px] px-1.5 py-0.5 rounded font-black">السعر+</div>
                       </div>
                    </div>
                  </div>
                  
                  {/* Item Total Ribbon */}
                  <div className="absolute top-0 left-0 bg-indigo-50 border-br border-indigo-100 px-3 py-1 rounded-br-2xl">
                    <span className="text-xs font-black text-indigo-600 font-mono tracking-tighter">
                      {(item.lineTotal).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Area */}
        <div className="p-4 sm:p-6 border-t border-slate-200 bg-white flex-shrink-0 lg:shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
          <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-slate-400 text-sm">notes</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ملاحظات الطلب العامة</span>
              </div>
              <textarea 
                placeholder="اترك ملاحظة هنا للشيف أو عامل التوصيل..." 
                value={orderNotes} 
                onChange={e => setOrderNotes(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium resize-none"
                rows={2}
              />
          </div>

          <div className="flex flex-col gap-1 mb-8">
            <div className="flex justify-between items-center px-1">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">المجموع الفرعي</span>
               <span className="text-sm font-bold text-slate-500 font-mono">{(cartTotal * 1).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center mt-2 px-1">
              <span className="text-sm font-black text-slate-900">المبلغ المستحق</span>
              <div className="flex flex-col items-end">
                <span className="text-3xl font-black text-indigo-600 font-mono tracking-tighter">
                  {cartTotal.toFixed(2)}
                </span>
                <div className="h-1 w-20 bg-indigo-100 rounded-full mt-1"></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleCompleteSale('dine_in')} 
                  disabled={cart.length === 0} 
                  className="relative group bg-emerald-600 text-white font-black py-4 px-4 rounded-2xl hover:bg-emerald-700 disabled:opacity-50 disabled:grayscale transition-all flex flex-col items-center justify-center gap-1 shadow-xl shadow-emerald-100 overflow-hidden active:scale-95"
                >
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                    <span className="material-symbols-outlined text-2xl">restaurant</span>
                    <span className="text-xs uppercase tracking-widest">تذكرة صالة</span>
                </button>
                <button 
                  onClick={() => handleCompleteSale('takeaway')} 
                  disabled={cart.length === 0} 
                  className="relative group bg-amber-600 text-white font-black py-4 px-4 rounded-2xl hover:bg-amber-700 disabled:opacity-50 disabled:grayscale transition-all flex flex-col items-center justify-center gap-1 shadow-xl shadow-amber-100 overflow-hidden active:scale-95"
                >
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                    <span className="material-symbols-outlined text-2xl">shopping_bag</span>
                    <span className="text-xs uppercase tracking-widest">طلب سفري</span>
                </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                 <button 
                  onClick={() => setIsReservationModalOpen(true)} 
                  disabled={cart.length === 0} 
                  className="bg-indigo-50 text-indigo-700 font-bold py-3.5 px-4 rounded-2xl hover:bg-indigo-100 disabled:opacity-30 transition-all flex items-center justify-center gap-2 text-xs border border-indigo-100"
                >
                    <span className="material-symbols-outlined text-lg">event_available</span>
                    جدولة حجز
                </button>
                <button 
                  onClick={() => setIsDeliveryModalOpen(true)} 
                  disabled={cart.length === 0} 
                  className="bg-sky-50 text-sky-700 font-bold py-3.5 px-4 rounded-2xl hover:bg-sky-100 disabled:opacity-30 transition-all flex items-center justify-center gap-2 text-xs border border-sky-100"
                >
                    <span className="material-symbols-outlined text-lg">local_shipping</span>
                    توصيل منزلي
                </button>
            </div>
          </div>
        </div>
      </div>
       {isDeliveryModalOpen && <DeliveryOrderModal cart={cart} customers={customers} onClose={() => setIsDeliveryModalOpen(false)} onConfirm={handleCreateDeliveryOrder} />}
       {isReservationModalOpen && <ReservationModal cart={cart} customers={customers} onClose={() => setIsReservationModalOpen(false)} onConfirm={handleCreateReservation} />}
       {addingProduct && (
           <Modal isOpen={true} onClose={() => setAddingProduct(null)} title={`إضافات لـ ${addingProduct.name}`} size="sm">
               <div className="space-y-3">
                   {productModifiers.map(m => (
                       <label key={m.id} className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                           <div className="flex items-center gap-2">
                               <input type="checkbox" checked={selectedModifiers.includes(m)} onChange={(e) => {
                                   if (e.target.checked) setSelectedModifiers([...selectedModifiers, m]);
                                   else setSelectedModifiers(selectedModifiers.filter(sm => sm.id !== m.id));
                               }} />
                               <span>{m.name}</span>
                           </div>
                           <span className="font-bold text-sm text-indigo-600">+{m.priceDelta}</span>
                       </label>
                   ))}
                   <button onClick={confirmAddToCart} className="w-full bg-indigo-600 text-white p-3 rounded-lg font-bold">إضافة للسلة</button>
               </div>
           </Modal>
       )}
    </div>
  );
};

export default POSView;