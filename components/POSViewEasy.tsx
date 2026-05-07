import React, { useMemo, useState } from 'react';
import type { Customer, InvoiceItem, Modifier, OrderType, Product } from '../types';
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

type ProductGroup = {
  name: string;
  products: Product[];
};

const formatMoney = (value: number) => value.toLocaleString('ar-SY', { maximumFractionDigits: 0 });

const getDepartmentName = (product: Product) => product.departmentName || product.category || 'عام';

const POSViewEasy: React.FC<POSViewProps> = ({ products, modifiers, customers, onCompleteSale, onCreateDeliveryOrder, onCreateReservation }) => {
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('الكل');
  const [activeTab, setActiveTab] = useState<'menu' | 'cart'>('menu');
  const [addingProduct, setAddingProduct] = useState<Product | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<Modifier[]>([]);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const departments = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach(product => {
      const name = getDepartmentName(product);
      counts.set(name, (counts.get(name) || 0) + 1);
    });

    return [
      { name: 'الكل', count: products.length },
      ...Array.from(counts.entries()).map(([name, count]) => ({ name, count }))
    ];
  }, [products]);

  const groupedProducts = useMemo<ProductGroup[]>(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filtered = products.filter(product => {
      const departmentName = getDepartmentName(product);
      const matchesDepartment = selectedDepartment === 'الكل' || departmentName === selectedDepartment;
      const matchesSearch = !normalizedSearch || product.name.toLowerCase().includes(normalizedSearch) || (product.description || '').toLowerCase().includes(normalizedSearch);
      return matchesDepartment && matchesSearch;
    });

    const groups = new Map<string, Product[]>();
    filtered.forEach(product => {
      const departmentName = getDepartmentName(product);
      if (!groups.has(departmentName)) groups.set(departmentName, []);
      groups.get(departmentName)!.push(product);
    });

    return Array.from(groups.entries()).map(([name, items]) => ({
      name,
      products: items.sort((a, b) => a.name.localeCompare(b.name, 'ar'))
    }));
  }, [products, searchTerm, selectedDepartment]);

  const productModifiers = useMemo(() => {
    if (!addingProduct) return [];
    return modifiers.filter(modifier => modifier.parentProductId === addingProduct.id && modifier.status === 'active');
  }, [addingProduct, modifiers]);

  const cartTotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);

  const toInvoiceItem = (product: Product, selected: Modifier[] = []): InvoiceItem => {
    const basePrice = product.salePrice ?? product.price ?? 0;
    const modifiersTotal = selected.reduce((sum, modifier) => sum + modifier.priceDelta, 0);
    const unitPrice = basePrice + modifiersTotal;

    return {
      productId: product.price === 0 || product.reviewStatus === 'needs_price' ? `needs-price-${product.id}` : product.id,
      productName: product.name,
      departmentId: product.departmentId || 'dept-misc',
      departmentName: getDepartmentName(product),
      quantity: 1,
      basePrice,
      modifiers: selected.map(modifier => ({
        modifierId: modifier.id,
        modifierName: modifier.name,
        priceDelta: modifier.priceDelta
      })),
      modifiersTotal,
      unitPrice,
      lineTotal: unitPrice
    };
  };

  const addToCart = (product: Product) => {
    const activeModifiers = modifiers.filter(modifier => modifier.parentProductId === product.id && modifier.status === 'active');
    if (activeModifiers.length > 0 && product.price > 0 && product.reviewStatus !== 'needs_price') {
      setAddingProduct(product);
      setSelectedModifiers([]);
      return;
    }

    setCart(previous => [...previous, toInvoiceItem(product)]);
    if (window.innerWidth < 1024) setActiveTab('cart');
  };

  const confirmAddWithModifiers = () => {
    if (!addingProduct) return;
    setCart(previous => [...previous, toInvoiceItem(addingProduct, selectedModifiers)]);
    setAddingProduct(null);
    setSelectedModifiers([]);
    if (window.innerWidth < 1024) setActiveTab('cart');
  };

  const addCustomItem = () => {
    const item: InvoiceItem = {
      productId: `custom-${Date.now()}`,
      productName: '',
      departmentId: 'dept-misc',
      departmentName: 'عام',
      quantity: 1,
      basePrice: 0,
      modifiers: [],
      modifiersTotal: 0,
      unitPrice: 0,
      lineTotal: 0,
      itemNotes: '',
      extraPrice: 0
    };
    setCart(previous => [...previous, item]);
    if (window.innerWidth < 1024) setActiveTab('cart');
  };

  const updateCartItem = (index: number, updates: Partial<InvoiceItem>) => {
    setCart(previous => previous.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const updated = { ...item, ...updates };
      const extraPrice = updated.extraPrice || 0;
      updated.unitPrice = updated.basePrice + updated.modifiersTotal + extraPrice;
      updated.lineTotal = updated.unitPrice * updated.quantity;
      return updated;
    }));
  };

  const removeFromCart = (index: number) => {
    setCart(previous => previous.filter((_, itemIndex) => itemIndex !== index));
  };

  const completeSale = (type: OrderType = 'sale') => {
    if (cart.length === 0) return;
    onCompleteSale(cart.map(item => ({ ...item })), {
      customerInfo: selectedCustomer ? {
        name: selectedCustomer.name,
        phone: selectedCustomer.phone,
        address: selectedCustomer.address
      } : undefined,
      notes: orderNotes,
      type
    });
    setCart([]);
    setOrderNotes('');
    setSelectedCustomer(null);
  };

  const handleCreateDeliveryOrder = (customerInfo: any, deliveryFee: number, source: any) => {
    onCreateDeliveryOrder(cart, customerInfo, deliveryFee, source);
    setCart([]);
    setOrderNotes('');
    setSelectedCustomer(null);
    setIsDeliveryModalOpen(false);
  };

  const handleCreateReservation = (customerInfo: any) => {
    onCreateReservation(cart, customerInfo);
    setCart([]);
    setOrderNotes('');
    setSelectedCustomer(null);
    setIsReservationModalOpen(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden bg-slate-50 border-t border-slate-100">
      <div className="lg:hidden grid grid-cols-2 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <button onClick={() => setActiveTab('menu')} className={`py-3 text-xs font-black border-b-2 ${activeTab === 'menu' ? 'border-indigo-600 text-indigo-700 bg-indigo-50' : 'border-transparent text-slate-400'}`}>الأقسام والأصناف</button>
        <button onClick={() => setActiveTab('cart')} className={`py-3 text-xs font-black border-b-2 ${activeTab === 'cart' ? 'border-indigo-600 text-indigo-700 bg-indigo-50' : 'border-transparent text-slate-400'}`}>السلة ({cart.length})</button>
      </div>

      <section className={`${activeTab === 'menu' ? 'flex' : 'hidden lg:flex'} flex-1 min-w-0 flex-col bg-slate-50`}>
        <div className="bg-white border-b border-slate-200 p-4 sm:p-5 space-y-4 shadow-sm z-20">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">نقطة البيع</h2>
              <p className="text-xs text-slate-500 mt-1">اختر القسم، ثم اضغط على الصنف لإضافته مباشرة إلى السلة.</p>
            </div>
            <div className="flex gap-2 w-full xl:w-auto">
              <div className="relative flex-1 xl:w-96">
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                <input
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  placeholder="بحث سريع عن صنف..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pr-10 pl-4 text-sm font-bold outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <button onClick={addCustomItem} className="shrink-0 rounded-2xl bg-indigo-600 px-4 py-3 text-xs sm:text-sm font-black text-white shadow-lg shadow-indigo-100 active:scale-95">
                + صنف خاص
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {departments.map(department => (
              <button
                key={department.name}
                onClick={() => setSelectedDepartment(department.name)}
                className={`shrink-0 rounded-2xl border px-4 py-3 text-right transition-all ${selectedDepartment === department.name ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'}`}
              >
                <div className="text-sm font-black whitespace-nowrap">{department.name}</div>
                <div className={`text-[10px] mt-1 ${selectedDepartment === department.name ? 'text-indigo-100' : 'text-slate-400'}`}>{department.count} صنف</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-5">
          {groupedProducts.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center text-slate-400">
              <div>
                <span className="material-symbols-outlined text-5xl mb-2">search_off</span>
                <p className="font-black text-slate-600">لا توجد أصناف مطابقة</p>
                <button onClick={() => { setSearchTerm(''); setSelectedDepartment('الكل'); }} className="mt-3 text-indigo-600 font-black text-sm">عرض كل الأصناف</button>
              </div>
            </div>
          ) : groupedProducts.map(group => (
            <div key={group.name} className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">{group.name}</h3>
                  <p className="text-xs text-slate-400">كل صنف ظاهر لوحده لسهولة الاختيار</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">{group.products.length}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                {group.products.map(product => {
                  const price = product.salePrice ?? product.price ?? 0;
                  const needsPrice = product.price === 0 || product.reviewStatus === 'needs_price';
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="group text-right rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-300 hover:shadow-lg transition-all p-3 active:scale-[0.98]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          <span className="material-symbols-outlined">restaurant</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-black text-slate-900 leading-snug line-clamp-2">{product.name}</div>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className={`text-xs font-black ${needsPrice ? 'text-amber-600' : 'text-indigo-700'}`}>{needsPrice ? 'حدد السعر' : `${formatMoney(price)} ل.س`}</span>
                            <span className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600">
                              <span className="material-symbols-outlined text-lg">add</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <aside className={`${activeTab === 'cart' ? 'flex fixed inset-0 lg:relative' : 'hidden lg:flex'} lg:w-[430px] bg-white border-r lg:border-r-0 lg:border-l border-slate-200 flex-col z-40 shadow-2xl lg:shadow-none`}>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900">سلة الطلب</h3>
            <p className="text-xs text-slate-400">{cart.length} صنف</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('menu')} className="lg:hidden rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600">رجوع</button>
            {cart.length > 0 && <button onClick={() => window.confirm('إفراغ السلة؟') && setCart([])} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600">تصفير</button>}
          </div>
        </div>

        <div className="p-4 border-b border-slate-100">
          <select
            value={selectedCustomer?.id || ''}
            onChange={event => {
              const customer = customers.find(item => item.id === event.target.value) || null;
              setSelectedCustomer(customer);
            }}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold outline-none focus:border-indigo-400"
          >
            <option value="">عميل مباشر / بدون اسم</option>
            {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name} - {customer.phone}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-slate-50/40">
          {cart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center text-slate-400">
              <div>
                <span className="material-symbols-outlined text-5xl mb-2">receipt_long</span>
                <p className="font-black">السلة فارغة</p>
                <p className="text-xs mt-1">اضغط على أي صنف من الأقسام لإضافته</p>
              </div>
            </div>
          ) : cart.map((item, index) => (
            <div key={`${item.productId}-${index}`} className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <button onClick={() => removeFromCart(index)} className="absolute top-2 left-2 w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-base">close</span>
              </button>

              <div className="pl-9">
                {item.productId.startsWith('custom-') || item.productId.startsWith('needs-price-') ? (
                  <input
                    value={item.productName}
                    onChange={event => updateCartItem(index, { productName: event.target.value })}
                    placeholder="اسم الصنف"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black outline-none focus:border-indigo-400"
                  />
                ) : (
                  <h4 className="font-black text-slate-900 leading-snug">{item.productName}</h4>
                )}
                {item.modifiers.length > 0 && <p className="mt-1 text-[10px] text-slate-400">{item.modifiers.map(modifier => modifier.modifierName).join(' + ')}</p>}
              </div>

              <div className="mt-3 grid grid-cols-[auto_1fr] gap-3 items-center">
                <div className="flex items-center rounded-xl bg-slate-100 p-1">
                  <button onClick={() => updateCartItem(index, { quantity: Math.max(1, item.quantity - 1) })} className="w-9 h-9 rounded-lg bg-white border border-slate-200 font-black">-</button>
                  <span className="w-10 text-center font-black">{item.quantity}</span>
                  <button onClick={() => updateCartItem(index, { quantity: item.quantity + 1 })} className="w-9 h-9 rounded-lg bg-white border border-slate-200 font-black">+</button>
                </div>
                <input
                  type="number"
                  value={item.basePrice || ''}
                  onChange={event => updateCartItem(index, { basePrice: parseFloat(event.target.value) || 0 })}
                  placeholder="السعر"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-indigo-700 outline-none focus:border-indigo-400"
                />
              </div>

              <input
                value={item.itemNotes || ''}
                onChange={event => updateCartItem(index, { itemNotes: event.target.value })}
                placeholder="ملاحظة للصنف"
                className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-indigo-400"
              />

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-400 font-bold">الإجمالي</span>
                <span className="text-lg font-black text-slate-900">{formatMoney(item.lineTotal)} ل.س</span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200 bg-white space-y-3">
          <textarea
            value={orderNotes}
            onChange={event => setOrderNotes(event.target.value)}
            placeholder="ملاحظات الطلب بالكامل"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-indigo-400"
            rows={2}
          />

          <div className="flex items-center justify-between rounded-2xl bg-slate-900 text-white p-4">
            <span className="font-black">الإجمالي</span>
            <span className="text-2xl font-black">{formatMoney(cartTotal)} ل.س</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button disabled={cart.length === 0} onClick={() => completeSale('sale')} className="col-span-2 rounded-2xl bg-indigo-600 py-3 text-sm font-black text-white disabled:bg-slate-300">إتمام بيع مباشر</button>
            <button disabled={cart.length === 0} onClick={() => completeSale('takeaway')} className="rounded-2xl bg-emerald-600 py-3 text-xs font-black text-white disabled:bg-slate-300">سفري</button>
            <button disabled={cart.length === 0} onClick={() => completeSale('dine_in')} className="rounded-2xl bg-amber-600 py-3 text-xs font-black text-white disabled:bg-slate-300">صالة</button>
            <button disabled={cart.length === 0} onClick={() => setIsDeliveryModalOpen(true)} className="rounded-2xl border border-slate-200 py-3 text-xs font-black text-slate-700 disabled:text-slate-300">توصيل</button>
            <button disabled={cart.length === 0} onClick={() => setIsReservationModalOpen(true)} className="rounded-2xl border border-slate-200 py-3 text-xs font-black text-slate-700 disabled:text-slate-300">حجز</button>
          </div>
        </div>
      </aside>

      {addingProduct && (
        <Modal isOpen={true} onClose={() => setAddingProduct(null)} title={`إضافات ${addingProduct.name}`}>
          <div className="space-y-3">
            {productModifiers.map(modifier => {
              const checked = selectedModifiers.some(item => item.id === modifier.id);
              return (
                <label key={modifier.id} className={`flex items-center justify-between rounded-2xl border p-3 cursor-pointer ${checked ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}>
                  <div>
                    <div className="font-black text-slate-900">{modifier.name}</div>
                    <div className="text-xs text-slate-500">+ {formatMoney(modifier.priceDelta)} ل.س</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setSelectedModifiers(previous => checked ? previous.filter(item => item.id !== modifier.id) : [...previous, modifier])}
                    className="w-5 h-5"
                  />
                </label>
              );
            })}
            <div className="flex gap-2 pt-4">
              <button onClick={() => setAddingProduct(null)} className="flex-1 rounded-2xl border border-slate-200 py-3 font-black text-slate-600">إلغاء</button>
              <button onClick={confirmAddWithModifiers} className="flex-1 rounded-2xl bg-indigo-600 py-3 font-black text-white">إضافة للسلة</button>
            </div>
          </div>
        </Modal>
      )}

      {isDeliveryModalOpen && <DeliveryOrderModal cart={cart} customers={customers} onClose={() => setIsDeliveryModalOpen(false)} onConfirm={handleCreateDeliveryOrder} />}
      {isReservationModalOpen && <ReservationModal cart={cart} customers={customers} onClose={() => setIsReservationModalOpen(false)} onConfirm={handleCreateReservation} />}
    </div>
  );
};

export default POSViewEasy;
