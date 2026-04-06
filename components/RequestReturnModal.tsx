import React, { useState } from 'react';
import type { Invoice, InvoiceItem } from '../types';

interface RequestReturnModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSendRequest: (originalInvoice: Invoice, returnItems: InvoiceItem[]) => void;
}

const RequestReturnModal: React.FC<RequestReturnModalProps> = ({ invoice, onClose, onSendRequest }) => {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setSelectedIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const returnItems: InvoiceItem[] = invoice.items.filter((_, index) => selectedIndices.includes(index));

    if (returnItems.length === 0) {
      alert('الرجاء تحديد صنف واحد على الأقل لطلب الإرجاع.');
      return;
    }

    onSendRequest(invoice, returnItems);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-xl font-bold text-gray-800">
            طلب إرجاع من فاتورة <span className="font-mono text-sm">{invoice.id.substring(0, 8)}</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            <p className="text-sm text-gray-600 mb-4">حدد الأصناف التي تريد طلب إرجاعها. سيقوم المدير بمراجعة الطلب.</p>
            <div className="space-y-2">
                {invoice.items.map((item, index) => (
                    <div 
                        key={`${item.productId}-${index}`} 
                        className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-colors ${selectedIndices.includes(index) ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                        onClick={() => toggleItem(index)}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedIndices.includes(index) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'}`}>
                                {selectedIndices.includes(index) && <span className="material-symbols-outlined text-xs">check</span>}
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 text-sm">{item.productName}</p>
                                <p className="text-[10px] text-slate-500">{(item.price - (item.discount || 0)).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
            <button type="button" onClick={onClose} className="bg-gray-500 text-white font-bold py-2 px-4 rounded hover:bg-gray-600">
              إلغاء
            </button>
            <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700">
              إرسال الطلب
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestReturnModal;
