import React from 'react';
import type { ActivityLog } from '../types';

interface ActivityLogViewProps {
    logs: ActivityLog[];
}

const ActivityLogView: React.FC<ActivityLogViewProps> = ({ logs }) => {
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">إدارة الحركات (سجل النشاط)</h1>
            <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-bold">
                        <tr>
                            <th className="p-4">التاريخ والوقت</th>
                            <th className="p-4">المستخدم</th>
                            <th className="p-4">الإجراء</th>
                            <th className="p-4">التفاصيل</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {logs.map(log => (
                            <tr key={log.id}>
                                <td className="p-4 text-xs font-mono">{new Date(log.timestamp).toLocaleString('ar-EG')}</td>
                                <td className="p-4">{log.username}</td>
                                <td className="p-4 font-bold text-indigo-700">{log.action}</td>
                                <td className="p-4 text-slate-600 text-sm">{log.details}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ActivityLogView;
