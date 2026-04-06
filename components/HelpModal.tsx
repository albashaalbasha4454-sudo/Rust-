
import React from 'react';
import Modal from './Modal';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const guideItems = [
    {
      title: "نقطة البيع (POS)",
      description: "هنا يمكنك اختيار الأصناف وإضافتها للسلة. يمكنك إتمام الطلب كـ 'صالة'، 'سفري'، 'توصيل' أو 'حجز'.",
      icon: "point_of_sale"
    },
    {
      title: "إدارة الطلبات",
      description: "عرض جميع الطلبات الحالية وتغيير حالتها (مثلاً من 'قيد الانتظار' إلى 'تم التوصيل'). يمكنك أيضاً طباعة الفواتير من هنا.",
      icon: "receipt_long"
    },
    {
      title: "المخزون والمشتريات",
      description: "إضافة منتجات جديدة، تحديث الكميات، وإدارة الموردين وعمليات الشراء.",
      icon: "inventory_2"
    },
    {
      title: "الخزينة والمالية",
      description: "مراقبة الحسابات البنكية، النقدية، وتسجيل التحويلات بين الحسابات.",
      icon: "account_balance"
    },
    {
      title: "المصروفات",
      description: "تسجيل أي مبالغ يتم دفعها (مثل الإيجار، الرواتب، فواتير الكهرباء) لخصمها من الأرباح.",
      icon: "payments"
    }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="دليل استخدام النظام">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto p-2" dir="rtl">
        <p className="text-slate-600 border-b pb-4">مرحباً بك! هذا دليل سريع لمساعدتك في فهم وظائف النظام الأساسية:</p>
        
        <div className="grid gap-6">
          {guideItems.map((item, index) => (
            <div key={index} className="flex gap-4 items-start p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-colors">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-2xl">{item.icon}</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 mb-1">{item.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-indigo-600 text-white p-6 rounded-2xl mt-8 shadow-lg shadow-indigo-100">
          <h4 className="font-bold mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined">lightbulb</span>
            نصيحة سريعة
          </h4>
          <p className="text-sm opacity-90 leading-relaxed">
            يمكنك دائماً تمرير الفأرة فوق أي أيقونة أو زر لرؤية شرح مختصر لوظيفته (Tooltip). إذا واجهت أي مشكلة، تواصل مع المدير التقني على الرقم: <span className="font-bold underline">0940392619</span>
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default HelpModal;
