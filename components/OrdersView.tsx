import React, { useState, useMemo } from 'react';
import type { Invoice, OrderStatus, OrderType, PaymentStatus, User } from '../types';
import PrintInvoice from '../PrintInvoice';
import ReturnModal from './ReturnModal';
import RequestReturnModal from './RequestReturnModal';
import Pagination from './common/Pagination';

interface OrdersViewProps {
  invoices: Invoice[];
  users: User[];
  onUpdateStatus: (orderId: string, status: OrderStatus, paymentStatus?: PaymentStatus) => void;
  onConvertToSale: (reservation: Invoice) => void;
  processReturn: (originalInvoiceId: string, returnItems: any[]) => void;
  sendReturnRequest: (originalInvoice: Invoice, returnItems: any[]) => void;
  currentUser: User;
  shopName: string;
  shopAddress: string;
}

const ITEMS_PER_PAGE = 15;

const OrdersView: React.FC<OrdersViewProps> = ({ invoices, users, onUpdateStatus, onConvertToSale, processReturn, sendReturnRequest, currentUser, shopName, shopAddress }) => {
  const [filters, setFilters] = useState({ type: 'all', status: 'all', payment: 'all', search: '', user: 'all' });
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [invoiceToPrint, setInvoiceToPrint] = useState<Invoice | null>(null);
  const [invoiceToReturn, setInvoiceToReturn] = useState<Invoice | null>(null);
  const [invoiceToRequestReturn, setInvoiceToRequestReturn] = useState<Invoice | null>(null);


  const salesByItem = useMemo(() => {
    const map: Record<string, {
      name: string;
      quantity: number;
      total: number;
    }> = {};

    invoices.forEach(inv => {
      // Ignore returns or cancelled
      if (inv.status === 'cancelled' || inv.type === 'return') return;

      inv.items.forEach(item => {
        if (!map[item.productName]) {
          map[item.productName] = {
            name: item.productName,
            quantity: 0,
            total: 0
          };
        }

        // Increment by quantity
        map[item.productName].quantity += item.quantity;
        map[item.productName].total += item.lineTotal;
      });
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    return invoices
      .filter(inv => {
        const { type, status, payment, search, user } = filters;
        if (type !== 'all' && inv.type !== type) return false;
        if (status !== 'all' && inv.status !== status) return false;
        if (payment !== 'all' && inv.paymentStatus !== payment) return false;
        if (user !== 'all' && inv.processedBy !== user) return false;
        if (search && !(inv.id.includes(search) || inv.customerInfo?.name.toLowerCase().includes(search.toLowerCase()) || inv.customerInfo?.phone.includes(search))) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, filters]);

  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInvoices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredInvoices, currentPage]);

  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    setCurrentPage(1);
  };

  const handleProcessReturn = (originalInvoiceId: string, returnItems: any[]) => {
    processReturn(originalInvoiceId, returnItems);
    setInvoiceToReturn(null);
  };
  
  const handleSendReturnRequest = (originalInvoice: Invoice, returnItems: any[]) => {
    sendReturnRequest(originalInvoice, returnItems);
    setInvoiceToRequestReturn(null);
  };

  const typeMap: Record<OrderType, { label: string, className: string }> = {
    sale: { label: 'بيع سريع', className: 'bg-green-100 text-green-800' },
    delivery: { label: 'توصيل', className: 'bg-sky-100 text-sky-800' },
    reservation: { label: 'حجز', className: 'bg-indigo-100 text-indigo-800' },
    return: { label: 'مرتجع', className: 'bg-red-100 text-red-800' },
    dine_in: { label: 'صالة', className: 'bg-teal-100 text-teal-800' },
    takeaway: { label: 'سفري', className: 'bg-amber-100 text-amber-800' },
  };
  
  const statusMap: Record<OrderStatus, { label: string, className: string }> = {
    pending: { label: 'قيد الانتظار', className: 'bg-yellow-100 text-yellow-800' },
    confirmed: { label: 'تم التأكيد', className: 'bg-blue-100 text-blue-800' },
    delivered: { label: 'تم التوصيل', className: 'bg-sky-100 text-sky-800' },
    completed: { label: 'مكتمل', className: 'bg-green-100 text-green-800' },
    cancelled: { label: 'ملغي', className: 'bg-gray-100 text-gray-800' },
  };

  const paymentMap: Record<PaymentStatus, { label: string, className: string }> = {
    paid: { label: 'مدفوع', className: 'bg-green-100 text-green-800' },
    unpaid: { label: 'غير مدفوع', className: 'bg-red-100 text-red-800' },
    partial: { label: 'جزئي', className: 'bg-orange-100 text-orange-800' },
  };
  
  const Badge: React.FC<{ data: { label: string, className: string } }> = ({ data }) => (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${data.className}`}>{data.label}</span>
  );

  return (
    <div className="p-4 sm:p-6">
      <div className="bg-white shadow-lg rounded-xl">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800">إدارة الطلبات</h2>
          <p className="text-sm text-slate-500 mt-1">عرض وتصفح جميع أنواع الطلبات من مكان واحد.</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <input type="text" placeholder="ابحث بالرقم، اسم العميل، أو الهاتف..." value={filters.search} onChange={e => handleFilterChange('search', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg lg:col-span-2" />
          <select value={filters.type} onChange={e => handleFilterChange('type', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
            <option value="all">كل الأنواع</option>
            <option value="sale">بيع سريع</option>
            <option value="dine_in">صالة</option>
            <option value="takeaway">سفري</option>
            <option value="delivery">توصيل</option>
            <option value="reservation">حجز</option>
            <option value="return">مرتجع</option>
          </select>
          <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
             <option value="all">كل الحالات</option>
             <option value="pending">قيد الانتظار</option>
             <option value="confirmed">تم التأكيد</option>
             <option value="delivered">تم التوصيل</option>
             <option value="completed">مكتمل</option>
             <option value="cancelled">ملغي</option>
          </select>
           <select value={filters.payment} onChange={e => handleFilterChange('payment', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
             <option value="all">كل حالات الدفع</option>
             <option value="paid">مدفوع</option>
             <option value="unpaid">غير مدفوع</option>
             <option value="partial">جزئي</option>
          </select>
          {currentUser.role === 'admin' && (
             <select value={filters.user} onChange={e => handleFilterChange('user', e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                <option value="all">كل الموظفين</option>
                {users.map(user => <option key={user.id} value={user.username}>{user.username}</option>)}
             </select>
          )}
        </div>

        {/* Sales by Item Table */}
        <div className="p-6 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-4">
             <span className="material-symbols-outlined text-indigo-500">point_of_sale</span>
             <h3 className="text-lg font-bold text-slate-800">تقرير المبيعات حسب الصنف</h3>
          </div>
          <div className="overflow-auto max-h-96 bg-white rounded-xl shadow-sm border border-slate-100 custom-scrollbar">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="p-4 font-semibold uppercase text-xs">الصنف</th>
                  <th className="p-4 font-semibold uppercase text-xs">الكمية المباعة</th>
                  <th className="p-4 font-semibold uppercase text-xs">إجمالي المبيعات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {salesByItem.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-400">لا توجد مبيعات للعرض.</td>
                  </tr>
                ) : (
                  salesByItem.map((item, index) => (
                    <tr key={item.name} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium text-slate-700 flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">{index + 1}</div>
                          {item.name}
                      </td>
                      <td className="p-4 text-slate-600">{item.quantity}</td>
                      <td className="p-4 font-bold text-emerald-600">
                        ${item.total.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4 md:space-y-0">
            {/* Desktop Header */}
            <div className="hidden md:grid md:grid-cols-[1fr,1.5fr,1.5fr,1fr,1fr,1fr,1fr,1fr,1.5fr] gap-4 items-center bg-slate-50 text-slate-600 uppercase text-xs font-bold px-4 py-3 rounded-t-lg">
                <div>الطلب</div>
                <div>التاريخ</div>
                <div>العميل</div>
                <div>الإجمالي</div>
                <div>الموظف</div>
                <div className="text-center">النوع</div>
                <div className="text-center">الحالة</div>
                <div className="text-center">الدفع</div>
                <div className="text-center">الإجراءات</div>
            </div>

            {/* Orders List / Cards */}
            <div className="space-y-3 md:space-y-0">
            {paginatedInvoices.map((inv) => (
                <React.Fragment key={inv.id}>
                    <div className={`
                        md:grid md:grid-cols-[1fr,1.5fr,1.5fr,1fr,1fr,1fr,1fr,1fr,1.5fr] md:gap-4 md:items-center
                        p-4 md:px-4 md:py-3 border-b border-slate-200 
                        hover:bg-slate-50 bg-white md:bg-transparent
                        block rounded-lg md:rounded-none shadow-sm md:shadow-none
                    `}>
                        {/* Mobile Header */}
                        <div className="flex justify-between items-start mb-3 md:hidden">
                            <div>
                                <p className="font-mono text-xs text-slate-500">{inv.id.substring(0, 12)}</p>
                                <h3 className="font-bold text-slate-800">{inv.customerInfo?.name || 'بيع مباشر'}</h3>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <Badge data={statusMap[inv.status]} />
                                <Badge data={paymentMap[inv.paymentStatus]} />
                            </div>
                        </div>

                        {/* Desktop Data Cells */}
                        <div className="hidden md:block font-mono text-[10px]">{inv.id.substring(0, 12)}</div>
                        <div className="hidden md:block text-xs">{new Date(inv.date).toLocaleString('ar-EG')}</div>
                        <div className="hidden md:block text-xs truncate">{inv.customerInfo?.name || '-'}</div>
                        <div className="hidden md:block font-bold text-sm">{inv.total.toFixed(2)}</div>
                        <div className="hidden md:block text-xs">{inv.processedBy || '-'}</div>
                        <div className="hidden md:block text-center"><Badge data={typeMap[inv.type]} /></div>
                        <div className="hidden md:block text-center"><Badge data={statusMap[inv.status]} /></div>
                        <div className="hidden md:block text-center"><Badge data={paymentMap[inv.paymentStatus]} /></div>

                        {/* Mobile Grid Data */}
                        <div className="grid grid-cols-2 gap-y-2 text-xs md:hidden mb-4 border-t border-slate-100 pt-3">
                            <div><span className="text-slate-500">التاريخ:</span> {new Date(inv.date).toLocaleDateString('ar-EG')}</div>
                            <div><span className="text-slate-500">الإجمالي:</span> <span className="font-bold">{inv.total.toFixed(2)}</span></div>
                            <div><span className="text-slate-500">النوع:</span> <Badge data={typeMap[inv.type]} /></div>
                            <div><span className="text-slate-500">الموظف:</span> {inv.processedBy || '-'}</div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-center md:justify-center gap-1 border-t border-slate-100 pt-2 md:border-0 md:pt-0">
                            <button onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors" title="عرض تفاصيل الطلب والأصناف"><span className="material-symbols-outlined text-lg">info</span></button>
                            <button onClick={() => setInvoiceToPrint(inv)} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-green-600 transition-colors" title="طباعة فاتورة الطلب"><span className="material-symbols-outlined text-lg">print</span></button>
                            
                            {(inv.type === 'sale' || inv.type === 'dine_in' || inv.type === 'takeaway' || (inv.type === 'delivery' && inv.status === 'completed')) && (
                                currentUser.role === 'admin' ? (
                                    <button onClick={() => setInvoiceToReturn(inv)} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors" title="إجراء عملية إرجاع (مرتجع)">
                                        <span className="material-symbols-outlined text-lg">assignment_return</span>
                                    </button>
                                ) : (
                                    <button onClick={() => setInvoiceToRequestReturn(inv)} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-orange-600 transition-colors" title="إرسال طلب إرجاع للمدير">
                                        <span className="material-symbols-outlined text-lg">forward_to_inbox</span>
                                    </button>
                                )
                            )}

                            {inv.type === 'reservation' && inv.status === 'pending' && (
                                <button onClick={() => onUpdateStatus(inv.id, 'confirmed')} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors" title="تأكيد الحجز">
                                    <span className="material-symbols-outlined text-lg">event_available</span>
                                </button>
                            )}
                            
                            {(inv.type === 'dine_in' || inv.type === 'takeaway') && inv.status === 'pending' && (
                                <button onClick={() => onUpdateStatus(inv.id, 'completed')} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-green-600 transition-colors" title="إتمام الطلب (تم التسليم للعميل)">
                                    <span className="material-symbols-outlined text-lg">check_circle</span>
                                </button>
                            )}

                            {(inv.type === 'delivery' || (inv.type === 'reservation' && inv.status === 'confirmed')) && (inv.status === 'pending' || inv.status === 'confirmed') && (
                                <button onClick={() => onUpdateStatus(inv.id, 'delivered')} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-sky-600 transition-colors" title="تغيير الحالة إلى تم التوصيل">
                                    <span className="material-symbols-outlined text-lg">local_shipping</span>
                                </button>
                            )}

                            {inv.status === 'delivered' && (
                                <button onClick={() => onUpdateStatus(inv.id, 'completed', 'paid')} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-green-600 transition-colors" title="إتمام الطلب وتحصيل المبلغ">
                                    <span className="material-symbols-outlined text-lg">task_alt</span>
                                </button>
                            )}

                            {inv.type === 'reservation' && (inv.status === 'pending' || inv.status === 'confirmed') && (
                                <button onClick={() => onConvertToSale(inv)} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-green-600 transition-colors" title="تحويل الحجز إلى فاتورة بيع فعلي">
                                    <span className="material-symbols-outlined text-lg">storefront</span>
                                </button>
                            )}
                            
                            {(inv.status === 'pending' || inv.status === 'confirmed') && (
                                <button onClick={() => onUpdateStatus(inv.id, 'cancelled')} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors" title="إلغاء الطلب">
                                    <span className="material-symbols-outlined text-lg">cancel</span>
                                </button>
                            )}
                        </div>
                    </div>
                    {expandedId === inv.id && (
                        <div className="bg-slate-50 p-4 text-xs border-b border-slate-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <p><strong>الهاتف:</strong> {inv.customerInfo?.phone}</p>
                                    <p><strong>العنوان:</strong> {inv.customerInfo?.address}</p>
                                    <p><strong>مصدر الطلب:</strong> {inv.source}</p>
                                    <p><strong>رسوم التوصيل:</strong> {inv.deliveryFee?.toFixed(2) || '0.00'}</p>
                                    {inv.notes && <p className="text-indigo-600"><strong>ملاحظات:</strong> {inv.notes}</p>}
                                </div>
                                <div>
                                    <h4 className="font-bold mb-1">الأصناف:</h4>
                                    <ul className="list-disc list-inside space-y-1">
                                        {inv.items.map(item => (
                                            <li key={item.productId}>
                                                {item.productName}
                                                {item.itemNotes && <span className="text-indigo-500 text-[10px] mr-2 italic">[{item.itemNotes}]</span>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </React.Fragment>
            ))}
            </div>
            {filteredInvoices.length === 0 && <p className="text-center py-8 text-slate-500">لا يوجد طلبات تطابق الفلترة.</p>}
        </div>
        <div className="p-6 border-t border-slate-200">
             <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={ITEMS_PER_PAGE} totalItems={filteredInvoices.length} />
        </div>
      </div>

      {invoiceToPrint && <PrintInvoice invoice={invoiceToPrint} onClose={() => setInvoiceToPrint(null)} shopName={shopName} shopAddress={shopAddress} />}
      {invoiceToReturn && <ReturnModal invoice={invoiceToReturn} onClose={() => setInvoiceToReturn(null)} onProcessReturn={handleProcessReturn} />}
      {invoiceToRequestReturn && <RequestReturnModal invoice={invoiceToRequestReturn} onClose={() => setInvoiceToRequestReturn(null)} onSendRequest={handleSendReturnRequest} />}
    </div>
  );
};

export default OrdersView;