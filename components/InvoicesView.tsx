import React, { useState, useMemo } from 'react';
import type { Invoice, User } from '../types';
import PrintInvoice from '../PrintInvoice';
import ReturnModal from './ReturnModal';
import RequestReturnModal from './RequestReturnModal';
import Pagination from './common/Pagination';
import { exportToExcel } from '../utils/exportUtils';

interface InvoicesViewProps {
  invoices: Invoice[];
  processReturn: (originalInvoiceId: string, returnItems: any[]) => void;
  sendReturnRequest: (originalInvoice: Invoice, returnItems: any[]) => void;
  currentUser: User;
  shopName: string;
  shopAddress: string;
}

const ITEMS_PER_PAGE = 10;

const money = (value: number) => value.toLocaleString('ar-SY', { maximumFractionDigits: 0 });
const safeNumber = (value: unknown) => {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const getInvoiceTypeStyle = (type: Invoice['type']) => {
  const styles: Record<Invoice['type'], { label: string; className: string }> = {
    sale: { label: 'بيع', className: 'bg-green-100 text-green-800' },
    return: { label: 'إرجاع', className: 'bg-red-100 text-red-800' },
    delivery: { label: 'توصيل', className: 'bg-sky-100 text-sky-800' },
    reservation: { label: 'حجز', className: 'bg-indigo-100 text-indigo-800' },
    dine_in: { label: 'صالة', className: 'bg-teal-100 text-teal-800' },
    takeaway: { label: 'سفري', className: 'bg-amber-100 text-amber-800' }
  };
  return styles[type] || { label: String(type || 'غير محدد'), className: 'bg-slate-100 text-slate-800' };
};

const getPaymentStatusLabel = (status: Invoice['paymentStatus']) => {
  if (status === 'paid') return { label: 'مدفوعة', className: 'bg-emerald-100 text-emerald-700' };
  if (status === 'partial') return { label: 'جزئي', className: 'bg-amber-100 text-amber-700' };
  return { label: 'غير مدفوعة', className: 'bg-red-100 text-red-700' };
};

const getOrderStatusLabel = (status: Invoice['status']) => {
  const labels: Record<string, string> = {
    pending: 'قيد الانتظار',
    confirmed: 'مؤكد',
    completed: 'مكتمل',
    cancelled: 'ملغي',
    delivered: 'مسلّم'
  };
  return labels[status] || status || 'غير محدد';
};

const InvoicesView: React.FC<InvoicesViewProps> = ({ invoices, processReturn, sendReturnRequest, currentUser, shopName, shopAddress }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minTotal, setMinTotal] = useState('');
  const [maxTotal, setMaxTotal] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const [invoiceToPrint, setInvoiceToPrint] = useState<Invoice | null>(null);
  const [invoiceToReturn, setInvoiceToReturn] = useState<Invoice | null>(null);
  const [invoiceToRequestReturn, setInvoiceToRequestReturn] = useState<Invoice | null>(null);

  const normalizedInvoices = useMemo(() => {
    return invoices
      .filter(Boolean)
      .map(invoice => {
        const items = Array.isArray(invoice.items) ? invoice.items : [];
        const itemsTotal = items.reduce((sum, item) => sum + safeNumber(item?.lineTotal), 0);
        const deliveryFee = safeNumber(invoice.deliveryFee);
        const total = Number.isFinite(Number(invoice.total)) ? Number(invoice.total) : itemsTotal + deliveryFee;
        return { ...invoice, items, total };
      })
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const min = minTotal === '' ? null : Number(minTotal);
    const max = maxTotal === '' ? null : Number(maxTotal);

    return normalizedInvoices.filter(invoice => {
      const customerName = invoice.customerInfo?.name || '';
      const customerPhone = invoice.customerInfo?.phone || '';
      const itemsText = invoice.items.map(item => `${item.productName || ''} ${item.departmentName || ''} ${item.itemNotes || ''}`).join(' ');
      const searchableText = [
        invoice.id,
        invoice.id?.substring(0, 8),
        customerName,
        customerPhone,
        invoice.processedBy,
        invoice.notes,
        getInvoiceTypeStyle(invoice.type).label,
        getOrderStatusLabel(invoice.status),
        itemsText
      ].join(' ').toLowerCase();

      const matchesSearch = !query || searchableText.includes(query);
      const matchesType = filterType === 'all' || invoice.type === filterType;
      const matchesPayment = filterPaymentStatus === 'all' || invoice.paymentStatus === filterPaymentStatus;

      let matchesDate = true;
      const invoiceDate = new Date(invoice.date || 0);
      if (startDate) matchesDate = matchesDate && invoiceDate >= new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && invoiceDate <= end;
      }

      let matchesTotal = true;
      if (min !== null && Number.isFinite(min)) matchesTotal = matchesTotal && invoice.total >= min;
      if (max !== null && Number.isFinite(max)) matchesTotal = matchesTotal && invoice.total <= max;

      return matchesSearch && matchesType && matchesPayment && matchesDate && matchesTotal;
    });
  }, [normalizedInvoices, searchTerm, filterType, filterPaymentStatus, startDate, endDate, minTotal, maxTotal]);

  const totals = useMemo(() => {
    const salesTotal = filteredInvoices
      .filter(invoice => invoice.type !== 'return' && invoice.status !== 'cancelled')
      .reduce((sum, invoice) => sum + safeNumber(invoice.total), 0);
    const returnsTotal = filteredInvoices
      .filter(invoice => invoice.type === 'return')
      .reduce((sum, invoice) => sum + Math.abs(safeNumber(invoice.total)), 0);
    const cancelledCount = filteredInvoices.filter(invoice => invoice.status === 'cancelled').length;
    return { salesTotal, returnsTotal, netTotal: salesTotal - returnsTotal, cancelledCount };
  }, [filteredInvoices]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE));
  const paginatedInvoices = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredInvoices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredInvoices, currentPage, totalPages]);

  const handleProcessReturn = (originalInvoiceId: string, returnItems: any[]) => {
    if (!returnItems || returnItems.length === 0) {
      alert('لا توجد أصناف للإرجاع.');
      return;
    }
    processReturn(originalInvoiceId, returnItems);
    setInvoiceToReturn(null);
  };

  const handleSendReturnRequest = (originalInvoice: Invoice, returnItems: any[]) => {
    if (!returnItems || returnItems.length === 0) {
      alert('لا توجد أصناف لطلب الإرجاع.');
      return;
    }
    sendReturnRequest(originalInvoice, returnItems);
    setInvoiceToRequestReturn(null);
  };

  const handleExport = () => {
    const formattedData = filteredInvoices.map(invoice => ({
      'رقم الفاتورة': invoice.id?.substring(0, 8) || '-',
      'التاريخ': invoice.date ? new Date(invoice.date).toLocaleDateString('ar-EG') : '-',
      'الوقت': invoice.date ? new Date(invoice.date).toLocaleTimeString('ar-EG') : '-',
      'العميل': invoice.customerInfo?.name || 'طلب مباشر',
      'الهاتف': invoice.customerInfo?.phone || '-',
      'النوع': getInvoiceTypeStyle(invoice.type).label,
      'حالة الطلب': getOrderStatusLabel(invoice.status),
      'حالة الدفع': getPaymentStatusLabel(invoice.paymentStatus).label,
      'عدد الأصناف': invoice.items.length,
      'الإجمالي': safeNumber(invoice.total),
      'المستخدم': invoice.processedBy || '-'
    }));
    exportToExcel(formattedData, 'الفواتير');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterPaymentStatus('all');
    setStartDate('');
    setEndDate('');
    setMinTotal('');
    setMaxTotal('');
    setCurrentPage(1);
  };

  const canReturnInvoice = (invoice: Invoice) => {
    return ['sale', 'dine_in', 'takeaway'].includes(invoice.type) && invoice.status !== 'cancelled' && invoice.items.length > 0;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-white flex flex-col xl:flex-row xl:justify-between xl:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-600">receipt_long</span>
              سجل الفواتير
            </h2>
            <p className="text-sm text-slate-500 mt-1">بحث، طباعة، تصدير، وإرجاع الفواتير بشكل مستقر.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className="flex items-center justify-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors font-bold"
            >
              <span className="material-symbols-outlined">filter_list</span>
              تصفية متقدمة
              <span className={`material-symbols-outlined transition-transform ${isFilterExpanded ? 'rotate-180' : ''}`}>expand_more</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 text-white bg-green-600 px-4 py-2 rounded-xl hover:bg-green-700 transition-colors font-bold"
            >
              <span className="material-symbols-outlined">file_download</span>
              تصدير إكسل
            </button>
          </div>
        </div>

        <div className="p-5 bg-slate-50 border-b border-slate-200 space-y-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              type="text"
              placeholder="بحث سريع: رقم الفاتورة، العميل، الهاتف، الصنف، القسم، المستخدم..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-bold"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="text-xs text-slate-400 font-bold">عدد الفواتير</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{filteredInvoices.length}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="text-xs text-slate-400 font-bold">إجمالي المبيعات</div>
              <div className="text-2xl font-black text-green-700 mt-1">{money(totals.salesTotal)} ل.س</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="text-xs text-slate-400 font-bold">إجمالي المرتجعات</div>
              <div className="text-2xl font-black text-red-600 mt-1">{money(totals.returnsTotal)} ل.س</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="text-xs text-slate-400 font-bold">الصافي</div>
              <div className={`text-2xl font-black mt-1 ${totals.netTotal >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>{money(totals.netTotal)} ل.س</div>
            </div>
          </div>
        </div>

        <div className={`bg-slate-50 p-5 border-b border-slate-200 transition-all duration-300 ${isFilterExpanded ? 'block' : 'hidden'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">النوع</label>
              <select value={filterType} onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }} className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white">
                <option value="all">كل الأنواع</option>
                <option value="sale">بيع</option>
                <option value="dine_in">صالة</option>
                <option value="takeaway">سفري</option>
                <option value="return">إرجاع</option>
                <option value="delivery">توصيل</option>
                <option value="reservation">حجز</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">حالة الدفع</label>
              <select value={filterPaymentStatus} onChange={e => { setFilterPaymentStatus(e.target.value); setCurrentPage(1); }} className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white">
                <option value="all">كل الحالات</option>
                <option value="paid">مدفوعة</option>
                <option value="unpaid">غير مدفوعة</option>
                <option value="partial">جزئي</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">من تاريخ</label>
              <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }} className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">إلى تاريخ</label>
              <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }} className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">أقل إجمالي</label>
              <input type="number" value={minTotal} onChange={e => { setMinTotal(e.target.value); setCurrentPage(1); }} className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">أعلى إجمالي</label>
              <input type="number" value={maxTotal} onChange={e => { setMaxTotal(e.target.value); setCurrentPage(1); }} className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
            </div>
            <div className="md:col-span-2 flex items-end justify-end">
              <button onClick={clearFilters} className="text-slate-500 hover:text-slate-800 text-sm font-bold px-4 py-2 transition-colors">
                مسح التصفية
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] table-auto text-right">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-4 px-5">رقم الفاتورة</th>
                <th className="py-4 px-5">التاريخ</th>
                <th className="py-4 px-5">العميل</th>
                <th className="py-4 px-5">الأصناف</th>
                <th className="py-4 px-5 text-center">النوع</th>
                <th className="py-4 px-5 text-center">الدفع</th>
                <th className="py-4 px-5">الإجمالي</th>
                <th className="py-4 px-5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 text-sm divide-y divide-slate-100">
              {paginatedInvoices.map(invoice => {
                const typeStyle = getInvoiceTypeStyle(invoice.type);
                const paymentStyle = getPaymentStatusLabel(invoice.paymentStatus);
                const itemsPreview = invoice.items.slice(0, 2).map(item => item.productName).filter(Boolean).join('، ');
                return (
                  <tr key={invoice.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="py-4 px-5 font-mono text-xs text-slate-500 whitespace-nowrap">#{invoice.id?.substring(0, 8) || '-'}</td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium">{invoice.date ? new Date(invoice.date).toLocaleDateString('ar-EG') : '-'}</span>
                        <span className="text-xs text-slate-400">{invoice.date ? new Date(invoice.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 font-medium">
                      <div>{invoice.customerInfo?.name || 'طلب مباشر'}</div>
                      {invoice.customerInfo?.phone && <div className="text-xs text-slate-400 mt-1">{invoice.customerInfo.phone}</div>}
                    </td>
                    <td className="py-4 px-5 max-w-[260px]">
                      <div className="font-bold text-slate-700 truncate">{itemsPreview || '-'}</div>
                      <div className="text-xs text-slate-400 mt-1">{invoice.items.length} صنف • {getOrderStatusLabel(invoice.status)}</div>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${typeStyle.className}`}>{typeStyle.label}</span>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${paymentStyle.className}`}>{paymentStyle.label}</span>
                    </td>
                    <td className={`py-4 px-5 font-black whitespace-nowrap ${invoice.type === 'return' ? 'text-red-600' : 'text-slate-900'}`}>{money(safeNumber(invoice.total))} ل.س</td>
                    <td className="py-4 px-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setInvoiceToPrint(invoice)} className="p-2 rounded-lg text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all" title="طباعة">
                          <span className="material-symbols-outlined text-xl">print</span>
                        </button>
                        {canReturnInvoice(invoice) && (
                          currentUser.role === 'admin' ? (
                            <button onClick={() => setInvoiceToReturn(invoice)} className="p-2 rounded-lg text-slate-400 hover:bg-white hover:text-red-600 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all" title="إرجاع">
                              <span className="material-symbols-outlined text-xl">assignment_return</span>
                            </button>
                          ) : (
                            <button onClick={() => setInvoiceToRequestReturn(invoice)} className="p-2 rounded-lg text-slate-400 hover:bg-white hover:text-orange-600 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all" title="طلب إرجاع">
                              <span className="material-symbols-outlined text-xl">forward_to_inbox</span>
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredInvoices.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4">
                <span className="material-symbols-outlined text-3xl">search_off</span>
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-1">لا توجد فواتير</h3>
              <p className="text-slate-500">لم يتم العثور على فواتير تطابق البحث أو التصفية الحالية.</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <Pagination currentPage={Math.min(currentPage, totalPages)} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={ITEMS_PER_PAGE} totalItems={filteredInvoices.length} />
        </div>
      </div>

      {invoiceToPrint && <PrintInvoice invoice={invoiceToPrint} onClose={() => setInvoiceToPrint(null)} shopName={shopName} shopAddress={shopAddress} />}
      {invoiceToReturn && <ReturnModal invoice={invoiceToReturn} onClose={() => setInvoiceToReturn(null)} onProcessReturn={handleProcessReturn} />}
      {invoiceToRequestReturn && <RequestReturnModal invoice={invoiceToRequestReturn} onClose={() => setInvoiceToRequestReturn(null)} onSendRequest={handleSendReturnRequest} />}
    </div>
  );
};

export default InvoicesView;
