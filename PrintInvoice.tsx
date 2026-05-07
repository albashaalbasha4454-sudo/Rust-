import React, { useEffect } from 'react';
import type { Invoice } from './types';
import { Logo } from './components/Logo';

interface PrintInvoiceProps {
  invoice: Invoice;
  onClose: () => void;
  shopName: string;
  shopAddress: string;
}

const PrintInvoice: React.FC<PrintInvoiceProps> = ({ invoice, onClose, shopName }) => {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  const subtotal = invoice.items.reduce((sum, item) => sum + item.lineTotal, 0);

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 p-3 sm:p-8 overflow-y-auto print:p-0 print:bg-white">
      <div className="w-full max-w-4xl mx-auto bg-white shadow-lg p-4 sm:p-8 lg:p-12 relative print:shadow-none print:p-0">
        <div id="print-area" className="text-right w-full max-w-full overflow-hidden" dir="rtl">
          <div className="flex flex-col items-center mb-6 sm:mb-8 border-b-2 border-dark-800 pb-6 sm:pb-8">
            <Logo className="h-24 w-28 sm:h-32 sm:w-40 print:h-28 print:w-36" />
            <div className="text-center mt-4">
              <h1 className="text-3xl sm:text-4xl font-black text-dark-800">مطابخ الشرق</h1>
              <p className="text-brand-600 font-medium tracking-widest uppercase text-xs sm:text-sm">East Food Restaurant</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8 sm:mb-10 bg-dark-50 p-4 sm:p-6 rounded-xl border border-dark-100">
            <div className="text-right min-w-0">
              <h2 className="text-3xl sm:text-5xl font-black text-dark-200 uppercase tracking-widest mb-4 break-words">INVOICE</h2>
              <div className="space-y-2 text-sm sm:text-base">
                <p>
                  <span className="text-dark-400 ml-2">رقم الفاتورة:</span>
                  <span className="font-mono font-bold text-dark-800 text-base sm:text-lg break-all">#{invoice.id.substring(0, 8).toUpperCase()}</span>
                </p>
              </div>
            </div>
            <div className="text-right sm:text-left space-y-1 text-sm shrink-0">
              <p><span className="text-dark-400 ml-2">التاريخ:</span> <span className="font-bold text-dark-800">{new Date(invoice.date).toLocaleDateString('ar-EG')}</span></p>
              <p><span className="text-dark-400 ml-2">الوقت:</span> <span className="font-bold text-dark-800">{new Date(invoice.date).toLocaleTimeString('ar-EG')}</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10 mb-8 sm:mb-10">
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-3 border-b border-dark-100 pb-1">معلومات العميل</h3>
              {invoice.customerInfo ? (
                <div className="space-y-1 min-w-0">
                  <p className="font-bold text-lg text-dark-800 break-words">{invoice.customerInfo.name}</p>
                  <p className="text-dark-600 text-sm break-words">{invoice.customerInfo.phone}</p>
                  {invoice.customerInfo.address && <p className="text-dark-600 text-xs break-words">{invoice.customerInfo.address}</p>}
                </div>
              ) : (
                <p className="text-dark-600">طلب مباشر</p>
              )}
            </div>
            <div className="text-right sm:text-left min-w-0">
              <h3 className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-3 border-b border-dark-100 pb-1 sm:text-left">من</h3>
              <div className="space-y-1 min-w-0">
                <p className="font-bold text-lg text-dark-800 break-words">{shopName}</p>
              </div>
            </div>
          </div>

          <div className="mb-8 sm:mb-10 overflow-x-auto print:overflow-visible">
            <table className="w-full min-w-[560px] print:min-w-0 text-right border-collapse">
              <thead>
                <tr className="bg-dark-800 text-white">
                  <th className="p-3 text-sm font-bold rounded-tr-lg">الصنف</th>
                  <th className="p-3 text-sm font-bold text-left whitespace-nowrap">السعر</th>
                  <th className="p-3 text-sm font-bold text-center whitespace-nowrap">الكمية</th>
                  <th className="p-3 text-sm font-bold text-left rounded-tl-lg whitespace-nowrap">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => {
                  const hasOfferPrice = typeof item.originalPrice === 'number' && typeof item.offerPrice === 'number' && item.originalPrice > item.offerPrice;
                  return (
                    <tr key={`${item.productId}-${index}`} className={`border-b border-dark-100 ${index % 2 === 0 ? 'bg-white' : 'bg-dark-50/50'} page-break-inside-avoid text-sm`}>
                      <td className="p-3 align-top min-w-0">
                        <span className="font-bold text-dark-800 break-words">{item.productName}</span>
                        {hasOfferPrice && (
                          <div className="text-[10px] text-emerald-600 mt-1 font-bold">سعر عرض</div>
                        )}
                        {item.modifiers && item.modifiers.length > 0 && (
                          <div className="text-[10px] text-dark-500 mt-1 break-words">
                            الإضافات: {item.modifiers.map(m => m.modifierName).join(', ')}
                          </div>
                        )}
                        {item.itemNotes && (
                          <div className="text-[10px] text-indigo-600 mt-1 italic break-words">
                            ملاحظة: {item.itemNotes}
                          </div>
                        )}
                        {item.extraPrice ? (
                          <div className="text-[10px] text-emerald-600 mt-1">
                            زيادة سعر: {item.extraPrice.toFixed(2)}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-3 text-left text-dark-700 align-top whitespace-nowrap">
                        {hasOfferPrice ? (
                          <div className="flex flex-col items-end leading-tight">
                            <span className="line-through text-dark-300 text-xs">{item.originalPrice!.toFixed(2)}</span>
                            <span className="font-black text-emerald-700">{item.offerPrice!.toFixed(2)}</span>
                          </div>
                        ) : (
                          item.unitPrice.toFixed(2)
                        )}
                      </td>
                      <td className="p-3 text-center text-dark-700 align-top whitespace-nowrap">{item.quantity}</td>
                      <td className="p-3 text-left font-bold text-dark-800 align-top whitespace-nowrap">{item.lineTotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-start gap-6 sm:gap-10">
            <div className="flex-1 min-w-0">
              <div className="bg-dark-50 p-4 sm:p-6 rounded-2xl border border-dark-100">
                <h4 className="text-xs font-black text-dark-400 uppercase tracking-widest mb-4 border-b border-dark-200 pb-2">ملاحظات الطلب</h4>
                <p className="text-xs text-dark-800 leading-relaxed break-words">
                  {invoice.notes || 'شكراً لزيارتكم مطابخ الشرق. نتمنى لكم وجبة شهية!'}
                </p>
              </div>
            </div>
            <div className="w-full sm:w-64 space-y-2 shrink-0">
              <div className="flex justify-between text-sm p-2">
                <span className="text-dark-500">المجموع الفرعي:</span>
                <span className="font-medium text-dark-800">{subtotal.toFixed(2)}</span>
              </div>
              {invoice.deliveryFee ? (
                <div className="flex justify-between text-sm p-2">
                  <span className="text-dark-500">رسوم التوصيل:</span>
                  <span className="font-medium text-dark-800">{invoice.deliveryFee.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 text-xl font-black p-3 bg-dark-800 text-white rounded-lg shadow-md">
                <span>الإجمالي:</span>
                <span className="whitespace-nowrap">{invoice.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mt-12 sm:mt-20 text-center border-t border-dark-100 pt-6">
            <p className="text-dark-400 text-xs">تم إنشاء هذه الفاتورة بواسطة نظام مطابخ الشرق</p>
          </div>
        </div>

        <div className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 print:hidden flex flex-col sm:flex-row gap-2 sm:gap-4 bg-white/90 backdrop-blur-md p-3 sm:p-4 rounded-2xl shadow-2xl border border-white/20 z-50 w-[calc(100%-1.5rem)] sm:w-auto">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 bg-dark-800 text-white px-6 sm:px-8 py-3 rounded-xl font-bold hover:bg-dark-900 transition-all active:scale-95 shadow-lg"
          >
            <span className="material-symbols-outlined">print</span>
            طباعة الفاتورة
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center gap-2 bg-white text-dark-600 px-6 sm:px-8 py-3 rounded-xl font-bold border border-dark-200 hover:bg-dark-50 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">close</span>
            إغلاق
          </button>
        </div>
      </div>
      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .page-break-inside-avoid { page-break-inside: avoid; break-inside: avoid; }
          #print-area { overflow: visible !important; }
          @page { margin: 1.2cm; }
        }
      `}</style>
    </div>
  );
};

export default PrintInvoice;
