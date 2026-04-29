import React, { useState, useMemo } from 'react';
import type { AuditLog } from '../types';
import Pagination from './common/Pagination';
import { exportToExcel } from '../lib/excelExport';

interface AuditLogViewProps {
  logs: AuditLog[];
}

const ITEMS_PER_PAGE = 20;

const AuditLogView: React.FC<AuditLogViewProps> = ({ logs }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => 
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [logs, searchTerm]);

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);

  const handleExportExcel = () => {
    const data = filteredLogs.map(log => ({
        'التاريخ': new Date(log.timestamp).toLocaleString('ar-EG'),
        'المستخدم': log.username,
        'الإجراء': log.action,
        'النوع': log.entityType,
        'الوصف': log.description,
        'الجهاز': log.deviceId
    }));
    exportToExcel(data, `سجل_النشاط_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-600">history</span>
                    سجل النشاط (الرقابة)
                </h2>
                <p className="text-sm text-slate-500 mt-1">تتبع جميع العمليات الحساسة التي تمت في النظام.</p>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg hover:bg-emerald-100 transition-colors font-medium border border-emerald-200 text-sm"
                >
                    <span className="material-symbols-outlined text-sm">description</span>
                    تصدير لـ Excel
                </button>
            </div>
        </div>

        <div className="p-4 bg-slate-50 border-b border-slate-200">
            <div className="relative max-w-md">
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input
                    type="text"
                    placeholder="بحث في الوصف، المستخدم، أو الإجراء..."
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
                />
            </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto text-right">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-4 px-6">الوقت والتاريخ</th>
                <th className="py-4 px-6">المستخدم</th>
                <th className="py-4 px-6">الإجراء</th>
                <th className="py-4 px-6">الوصف</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 text-sm divide-y divide-slate-100">
              {paginatedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-4 px-6">
                        <div className="flex flex-col">
                            <span className="font-medium text-[11px]">{new Date(log.timestamp).toLocaleDateString('ar-EG')}</span>
                            <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString('ar-EG')}</span>
                        </div>
                    </td>
                    <td className="py-4 px-6 font-bold">{log.username}</td>
                    <td className="py-4 px-6">
                        <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-mono">{log.action}</span>
                    </td>
                    <td className="py-4 px-6 text-slate-600">{log.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLogs.length === 0 && (
              <div className="text-center py-16">
                  <p className="text-slate-400">لا توجد سجلات تطابق البحث.</p>
              </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50">
             <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={ITEMS_PER_PAGE}
              totalItems={filteredLogs.length}
            />
        </div>
      </div>
    </div>
  );
};

export default AuditLogView;
