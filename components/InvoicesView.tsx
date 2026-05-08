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
  onUpdateInvoice?: (updatedInvoice: Invoice) => void;
  onDeleteInvoice?: (id: string) => void;
  departments?: any[];
}

const ITEMS_PER_PAGE = 10;

const InvoicesView: React.FC<InvoicesViewProps> = ({ 
    invoices, 
    processReturn, 
    sendReturnRequest, 
    currentUser, 
    shopName, 
    shopAddress,
    onUpdateInvoice,
    onDeleteInvoice,
    departments = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minTotal, setMinTotal] = useState('');
  const [maxTotal, setMaxTotal] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const [invoiceToPrint, setInvoiceToPrint] = useState<Invoice | null>(null);
  const [invoiceToReturn, setInvoiceToReturn] = useState<Invoice | null>(null);
  const [invoiceToRequestReturn, setInvoiceToRequestReturn] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editForm, setEditForm] = useState({ total: 0, notes: '', departmentId: '' });

  const sortedInvoices = useMemo(() => {
    return [...invoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    return sortedInvoices.filter(inv => {
      const matchesSearch = inv.id.includes(searchTerm) || inv.customerInfo?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || inv.type === filterType;
      
      let matchesDate = true;
      if (startDate) {
          matchesDate = matchesDate && new Date(inv.date) >= new Date(startDate);
      }
      if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && new Date(inv.date) <= end;
      }

      let matchesTotal = true;
      if (minTotal !== '') {
          matchesTotal = matchesTotal && inv.total >= parseFloat(minTotal);
      }
      if (maxTotal !== '') {
          matchesTotal = matchesTotal && inv.total <= parseFloat(maxTotal);
      }

      return matchesSearch && matchesType && matchesDate && matchesTotal;
    });
  }, [sortedInvoices, searchTerm, filterType, startDate, endDate, minTotal, maxTotal]);
  
  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInvoices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredInvoices, currentPage]);

  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);

  const handleProcessReturn = (originalInvoiceId: string, returnItems: any[]) => {
    processReturn(originalInvoiceId, returnItems);
    setInvoiceToReturn(null);
  };
  
  const handleSendReturnRequest = (originalInvoice: Invoice, returnItems: any[]) => {
    sendReturnRequest(originalInvoice, returnItems);
    setInvoiceToRequestReturn(null);
  };

  const handleExport = () => {
    const formattedData = filteredInvoices.map(inv => ({
        'رقم الفاتورة': inv.id.substring(0,8),
        'التاريخ': new Date(inv.date).toLocaleDateString('ar-EG'),
        'العميل': inv.customerInfo?.name || '-',
        'النوع': getInvoiceTypeStyle(inv.type).label,
        'الإجمالي': inv.total.toLocaleString(),
        'الحالة': inv.status
    }));
    exportToExcel(formattedData, 'الفواتير');
  };

  const getInvoiceTypeStyle = (type: Invoice['type']) => {
    const styles: Record<Invoice['type'], {label: string, className: string}> = {
        sale: { label: 'بيع', className: 'bg-green-100 text-green-800'},
        return: { label: 'إرجاع', className: 'bg-red-100 text-red-800'},
        delivery: { label: 'توصيل', className: 'bg-sky-100 text-sky-800'},
        reservation: { label: 'حجز', className: 'bg-indigo-100 text-indigo-800'},
        dine_in: { label: 'صالة', className: 'bg-teal-100 text-teal-800'},
        takeaway: { label: 'سفري', className: 'bg-amber-100 text-amber-800'}
    };
    return styles[type] || {label: type, className: 'bg-slate-100 text-slate-800'};
  }

  const clearFilters = () => {
      setSearchTerm('');
      setFilterType('all');
      setStartDate('');
      setEndDate('');
      setMinTotal('');
      setMaxTotal('');
      setCurrentPage(1);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-600">receipt_long</span>
                    سجل الفواتير
                </h2>
                <p className="text-sm text-slate-500 mt-1">عرض وتصفح جميع الفواتير الصادرة والواردة.</p>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                    className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
                >
                    <span className="material-symbols-outlined">filter_list</span>
                    تصفية متقدمة
                    <span className={`material-symbols-outlined transition-transform ${isFilterExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                <button 
                    onClick={handleExport}
                    className="flex items-center gap-2 text-white bg-green-600 px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                    <span className="material-symbols-outlined">file_download</span>
                    تصدير إكسل
                </button>
            </div>
        </div>

        <div className={`bg-slate-50 p-6 border-b border-slate-200 transition-all duration-300 ${isFilterExpanded ? 'block' : 'hidden'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">بحث</label>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input
                            type="text"
                            placeholder="رقم الفاتورة أو العميل..."
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">النوع</label>
                    <select 
                        value={filterType} 
                        onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }} 
                        className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                    >
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
                    <label className="block text-xs font-semibold text-slate-500 mb-1">من تاريخ</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
                        className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">إلى تاريخ</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
                        className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">الحد الأدنى للإجمالي</label>
                    <input
                        type="number"
                        placeholder="0.00"
                        value={minTotal}
                        onChange={e => { setMinTotal(e.target.value); setCurrentPage(1); }}
                        className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">الحد الأقصى للإجمالي</label>
                    <input
                        type="number"
                        placeholder="1000.00"
                        value={maxTotal}
                        onChange={e => { setMaxTotal(e.target.value); setCurrentPage(1); }}
                        className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>
                <div className="md:col-span-2 flex items-end justify-end">
                    <button 
                        onClick={clearFilters}
                        className="text-slate-500 hover:text-slate-800 text-sm font-medium px-4 py-2 transition-colors"
                    >
                        مسح التصفية
                    </button>
                </div>
            </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto text-right">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-4 px-6">رقم الفاتورة</th>
                <th className="py-4 px-6">التاريخ</th>
                <th className="py-4 px-6">العميل</th>
                <th className="py-4 px-6 text-center">النوع</th>
                <th className="py-4 px-6">الإجمالي</th>
                <th className="py-4 px-6 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 text-sm divide-y divide-slate-100">
              {paginatedInvoices.map((invoice) => {
                  const typeStyle = getInvoiceTypeStyle(invoice.type);
                  return (
                    <tr key={invoice.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="py-4 px-6 font-mono text-xs text-slate-500">{invoice.id.substring(0, 8)}</td>
                        <td className="py-4 px-6">
                            <div className="flex flex-col">
                                <span className="font-medium">{new Date(invoice.date).toLocaleDateString('ar-EG')}</span>
                                <span className="text-xs text-slate-400">{new Date(invoice.date).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                        </td>
                        <td className="py-4 px-6 font-medium">{invoice.customerInfo?.name || '-'}</td>
                        <td className="py-4 px-6 text-center">
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${typeStyle.className}`}>
                                {typeStyle.label}
                            </span>
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-800">{invoice.total.toLocaleString()}</td>
                        <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                                <button onClick={() => setInvoiceToPrint(invoice)} className="p-2 rounded-lg text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all" title="طباعة">
                                    <span className="material-symbols-outlined text-xl">print</span>
                                </button>
                                {currentUser.role === 'admin' && (
                                    <>
                                        <button 
                                            onClick={() => {
                                                setEditingInvoice(invoice);
                                                setEditForm({
                                                    total: invoice.total,
                                                    notes: invoice.notes || '',
                                                    departmentId: invoice.items[0]?.departmentId || ''
                                                });
                                            }} 
                                            className="p-2 rounded-lg text-slate-400 hover:bg-white hover:text-blue-600 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all" 
                                            title="تعديل"
                                        >
                                            <span className="material-symbols-outlined text-xl">edit</span>
                                        </button>
                                        <button 
                                            onClick={() => onDeleteInvoice && onDeleteInvoice(invoice.id)} 
                                            className="p-2 rounded-lg text-slate-400 hover:bg-white hover:text-red-500 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all" 
                                            title="حذف"
                                        >
                                            <span className="material-symbols-outlined text-xl">delete</span>
                                        </button>
                                    </>
                                )}
                                {(invoice.type === 'sale' || invoice.type === 'dine_in' || invoice.type === 'takeaway') && (
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
                  )
              })}
            </tbody>
          </table>
          {filteredInvoices.length === 0 && (
              <div className="text-center py-16 px-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4">
                      <span className="material-symbols-outlined text-3xl">search_off</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-700 mb-1">لا توجد فواتير</h3>
                  <p className="text-slate-500">لم يتم العثور على فواتير تطابق معايير البحث الحالية.</p>
              </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50">
             <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={ITEMS_PER_PAGE}
              totalItems={filteredInvoices.length}
            />
        </div>
      </div>

      {invoiceToPrint && <PrintInvoice invoice={invoiceToPrint} onClose={() => setInvoiceToPrint(null)} shopName={shopName} shopAddress={shopAddress} />}
      {invoiceToReturn && <ReturnModal invoice={invoiceToReturn} onClose={() => setInvoiceToReturn(null)} onProcessReturn={handleProcessReturn} />}
      {invoiceToRequestReturn && <RequestReturnModal invoice={invoiceToRequestReturn} onClose={() => setInvoiceToRequestReturn(null)} onSendRequest={handleSendReturnRequest} />}
      
      {/* Edit Invoice Modal */}
      {editingInvoice && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                              <span className="material-symbols-outlined">edit_note</span>
                          </div>
                          <div>
                              <h3 className="font-bold text-slate-800">تعديل بيانات الفاتورة</h3>
                              <p className="text-xs text-slate-400">الفاتورة رقم: {editingInvoice.id.substring(0,8)}</p>
                          </div>
                      </div>
                      <button onClick={() => setEditingInvoice(null)} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-colors">
                          <span className="material-symbols-outlined">close</span>
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">المبلغ الإجمالي</label>
                          <input 
                              type="number" 
                              value={editForm.total}
                              onChange={e => setEditForm({...editForm, total: parseFloat(e.target.value) || 0})}
                              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                          />
                      </div>
                      
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">القسم / التصنيف</label>
                          <select 
                              value={editForm.departmentId}
                              onChange={e => setEditForm({...editForm, departmentId: e.target.value})}
                              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
                          >
                              <option value="">عام</option>
                              {departments.map(d => (
                                  <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                          </select>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">ملاحظات</label>
                          <textarea 
                              value={editForm.notes}
                              onChange={e => setEditForm({...editForm, notes: e.target.value})}
                              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none"
                              placeholder="أضف ملاحظاتك هنا..."
                          />
                      </div>

                      <div className="bg-amber-50 rounded-xl p-4 flex gap-3 text-amber-700">
                          <span className="material-symbols-outlined">warning</span>
                          <p className="text-xs font-medium leading-relaxed">
                              تنبيه: تعديل بيانات الفاتورة سيؤثر بشكل مباشر على التقارير المالية والتحليلية. يرجى التأكد من صحة البيانات المدخلة.
                          </p>
                      </div>
                  </div>

                      <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                      <button 
                          onClick={() => {
                              if (!onUpdateInvoice) return;
                              
                              const dept = departments.find(d => d.id === editForm.departmentId);
                              
                              // Recalculate profit if we changed the total, assuming fixed cost ratio or manual entry
                              // For returns, profit is different, but for sales, if total changes, profit usually changes by same amount
                              const diff = editForm.total - editingInvoice.total;
                              const updatedProfit = editingInvoice.totalProfit + diff;

                              const updated: Invoice = {
                                  ...editingInvoice,
                                  total: editForm.total,
                                  totalProfit: updatedProfit,
                                  notes: editForm.notes,
                                  items: editingInvoice.items.map((item, idx) => {
                                      // If it's a manual sale or single item sale, update its dept
                                      if (idx === 0) {
                                          return {
                                              ...item,
                                              departmentId: editForm.departmentId,
                                              departmentName: dept?.name || 'عام',
                                              lineTotal: editingInvoice.items.length === 1 ? editForm.total : item.lineTotal
                                          };
                                      }
                                      return item;
                                  })
                              };
                              onUpdateInvoice(updated);
                              setEditingInvoice(null);
                          }}
                          className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                      >
                          حفظ التعديلات
                      </button>
                      <button 
                          onClick={() => setEditingInvoice(null)}
                          className="flex-1 bg-white text-slate-600 border border-slate-200 font-bold py-3 rounded-xl hover:bg-slate-50 transition-all"
                      >
                          إلغاء
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default InvoicesView;