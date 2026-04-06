import React, { useState, useMemo } from 'react';
import type { Customer } from '../types';
import Modal from './Modal';
import InputField from './common/InputField';
import Pagination from './common/Pagination';

interface CustomersViewProps {
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id'>) => void;
  updateCustomer: (id: string, customer: Omit<Customer, 'id'>) => void;
  deleteCustomer: (id: string) => void;
}

const ITEMS_PER_PAGE = 10;

const CustomersView: React.FC<CustomersViewProps> = ({ customers, addCustomer, updateCustomer, deleteCustomer }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm)
    ).sort((a,b) => a.name.localeCompare(b.name));
  }, [customers, searchTerm]);

  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredCustomers, currentPage]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  
  const handleOpenModal = (customer: Customer | null = null) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingCustomer(null);
    setIsModalOpen(false);
  };

  const handleSave = (customerData: Omit<Customer, 'id'>) => {
    if (editingCustomer) {
      updateCustomer(editingCustomer.id, customerData);
    } else {
      addCustomer(customerData);
    }
    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا العميل؟')) {
      deleteCustomer(id);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">العملاء</h2>
      <div className="bg-white shadow-md rounded-lg p-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
          <input
            type="text"
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full md:w-1/3 p-2 border border-gray-300 rounded-md"
          />
          <button onClick={() => handleOpenModal()} className="w-full md:w-auto bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700">
            + إضافة عميل جديد
          </button>
        </div>

        <div className="space-y-4 md:space-y-0">
            {/* Desktop Header */}
            <div className="hidden md:grid md:grid-cols-5 gap-4 items-center bg-gray-100 text-gray-600 uppercase text-xs font-bold px-6 py-3 rounded-t-lg">
                <div>الاسم</div>
                <div>الهاتف</div>
                <div>العنوان</div>
                <div>البريد الإلكتروني</div>
                <div className="text-center">الإجراءات</div>
            </div>

            {/* Customers List / Cards */}
            <div className="space-y-3 md:space-y-0">
            {paginatedCustomers.map((customer) => (
                <div key={customer.id} className={`
                    md:grid md:grid-cols-5 md:gap-4 md:items-center
                    p-4 md:px-6 md:py-3 border-b border-gray-200 
                    hover:bg-gray-50 bg-white md:bg-transparent
                    block rounded-lg md:rounded-none shadow-sm md:shadow-none
                `}>
                    {/* Mobile Header */}
                    <div className="flex justify-between items-start mb-2 md:hidden">
                        <h3 className="font-bold text-gray-800">{customer.name}</h3>
                        <div className="flex gap-2">
                            <button onClick={() => handleOpenModal(customer)} className="text-blue-600 hover:text-blue-800"><span className="material-symbols-outlined text-lg">edit</span></button>
                            <button onClick={() => handleDelete(customer.id)} className="text-red-600 hover:text-red-800"><span className="material-symbols-outlined text-lg">delete</span></button>
                        </div>
                    </div>

                    {/* Desktop Data Cells */}
                    <div className="hidden md:block font-semibold text-sm">{customer.name}</div>
                    <div className="hidden md:block text-sm">{customer.phone}</div>
                    <div className="hidden md:block text-sm truncate">{customer.address || '-'}</div>
                    <div className="hidden md:block text-sm truncate">{customer.email || '-'}</div>
                    <div className="hidden md:flex justify-center gap-4">
                        <button onClick={() => handleOpenModal(customer)} className="text-blue-600 hover:text-blue-800 font-semibold">تعديل</button>
                        <button onClick={() => handleDelete(customer.id)} className="text-red-600 hover:text-red-800 font-semibold">حذف</button>
                    </div>

                    {/* Mobile Grid Data */}
                    <div className="grid grid-cols-1 gap-y-1 text-xs md:hidden pt-2 border-t border-gray-100">
                        <div><span className="text-gray-500">الهاتف:</span> {customer.phone}</div>
                        <div><span className="text-gray-500">العنوان:</span> {customer.address || '-'}</div>
                        <div><span className="text-gray-500">البريد:</span> {customer.email || '-'}</div>
                    </div>
                </div>
            ))}
            </div>
            {filteredCustomers.length === 0 && <p className="text-center py-8 text-gray-500">لا يوجد عملاء لعرضهم.</p>}
        </div>
         <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={ITEMS_PER_PAGE}
          totalItems={filteredCustomers.length}
        />
      </div>
      {isModalOpen && (
        <CustomerModal
          customer={editingCustomer}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// CustomerModal component (kept in the same file for simplicity)
const CustomerModal: React.FC<{
  customer: Customer | null;
  onClose: () => void;
  onSave: (customer: Omit<Customer, 'id'>) => void;
}> = ({ customer, onClose, onSave }) => {
  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [notes, setNotes] = useState(customer?.notes || '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('الاسم ورقم الهاتف حقول إلزامية.');
      return;
    }
    onSave({ name, phone, address, email, notes });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={customer ? 'تعديل عميل' : 'إضافة عميل جديد'}>
      <form onSubmit={handleSubmit}>
        <InputField id="name" label="الاسم" value={name} onChange={(e) => setName(e.target.value)} />
        <InputField id="phone" label="الهاتف" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
        <InputField id="address" label="العنوان" value={address} onChange={(e) => setAddress(e.target.value)} />
        <InputField id="email" label="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        <div className="mb-4">
          <label htmlFor="notes" className="block text-gray-700 text-sm font-bold mb-2">ملاحظات</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        {error && <p className="text-red-500 text-xs mb-4">{error}</p>}
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="bg-gray-500 text-white font-bold py-2 px-4 rounded hover:bg-gray-600">إلغاء</button>
          <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700">حفظ</button>
        </div>
      </form>
    </Modal>
  );
};

export default CustomersView;
