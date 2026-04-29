import React from 'react';
import type { ReturnRequest } from '../types';
import { exportToExcel } from '../lib/excelExport';

interface ReturnRequestsViewProps {
  requests: ReturnRequest[];
  approveRequest: (requestId: string) => void;
  rejectRequest: (requestId: string) => void;
}

const ReturnRequestsView: React.FC<ReturnRequestsViewProps> = ({ requests, approveRequest, rejectRequest }) => {

  const getStatusBadge = (status: ReturnRequest['status']) => {
// ... existing switch ...
  };

  const handleExportExcel = () => {
    const data = requests.map(req => ({
        'تاريخ الطلب': new Date(req.requestDate).toLocaleString('ar-EG'),
        'رقم الفاتورة الأصلية': req.originalInvoiceId,
        'مقدم الطلب': req.requestedBy,
        'الحالة': req.status === 'pending' ? 'معلق' : (req.status === 'approved' ? 'مقبول' : 'مرفوض'),
        'معالج بواسطة': req.processedBy || '-',
        'تاريخ المعالجة': req.processedDate ? new Date(req.processedDate).toLocaleString('ar-EG') : '-'
    }));
    exportToExcel(data, `طلبات_الإرجاع_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800">طلبات الإرجاع</h2>
        <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg hover:bg-emerald-100 transition-colors font-medium border border-emerald-200"
        >
            <span className="material-symbols-outlined text-lg">description</span>
            تصدير لـ Excel
        </button>
      </div>
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-auto text-right">
            <thead className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
              <tr>
                <th className="py-3 px-6">تاريخ الطلب</th>
                <th className="py-3 px-6">رقم الفاتورة الأصلية</th>
                <th className="py-3 px-6">مقدم الطلب</th>
                <th className="py-3 px-6">الحالة</th>
                <th className="py-3 px-6 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm font-light">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6">
                    لا يوجد طلبات إرجاع لعرضها.
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-6">{new Date(request.requestDate).toLocaleString('ar-EG')}</td>
                    <td className="py-3 px-6 font-mono text-xs">{request.originalInvoiceId.substring(0, 8)}</td>
                    <td className="py-3 px-6">{request.requestedBy}</td>
                    <td className="py-3 px-6">{getStatusBadge(request.status)}</td>
                    <td className="py-3 px-6 text-center">
                      {request.status === 'pending' ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => approveRequest(request.id)}
                            className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold hover:bg-green-600"
                          >
                            قبول
                          </button>
                          <button
                            onClick={() => rejectRequest(request.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold hover:bg-red-600"
                          >
                            رفض
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs">
                          {`تمت المعالجة بواسطة ${request.processedBy} في ${new Date(request.processedDate!).toLocaleDateString('ar-EG')}`}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReturnRequestsView;
