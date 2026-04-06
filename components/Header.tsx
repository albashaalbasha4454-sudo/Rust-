
import React, { useState } from 'react';
import type { User } from '../types';
import { Logo } from './Logo';
import HelpModal from './HelpModal';

interface HeaderProps {
  currentUser: User;
  onLogout: () => void;
  toggleSidebar: () => void;
  onOpenCloseTillModal: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, toggleSidebar, onOpenCloseTillModal }) => {
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  return (
    <header className="bg-white shadow-md h-16 flex items-center justify-between px-6 z-10 sticky top-0 flex-shrink-0">
        <div className="flex items-center gap-4">
            <button onClick={toggleSidebar} className="md:hidden p-2 rounded-full hover:bg-gray-100">
                <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="flex items-center gap-2">
                <Logo className="h-10 w-10" />
                <h1 className="text-xl font-bold text-gray-800 hidden sm:block">مطابخ الشرق</h1>
            </div>
        </div>
        <div className="flex items-center gap-4">
            {currentUser.role === 'admin' && (
                <button 
                    onClick={() => setIsHelpModalOpen(true)} 
                    className="flex items-center gap-2 text-brand-600 hover:text-brand-800 p-2 rounded-lg hover:bg-brand-50 transition-colors"
                    title="دليل استخدام النظام"
                >
                    <span className="material-symbols-outlined">help</span>
                    <span className="hidden sm:inline">مساعدة</span>
                </button>
            )}
            {(currentUser.role === 'cashier' || currentUser.role === 'admin') && (
                <button 
                    onClick={onOpenCloseTillModal} 
                    className="flex items-center gap-2 text-dark-600 hover:text-brand-600 p-2 rounded-lg hover:bg-brand-50 transition-colors"
                    title="تقرير إغلاق الصندوق اليومي"
                >
                    <span className="material-symbols-outlined">receipt_long</span>
                    <span className="hidden sm:inline">إغلاق الصندوق</span>
                </button>
            )}
            <div className="text-right">
                <p className="font-semibold text-dark-700">{currentUser.username}</p>
                <p className="text-xs text-dark-500">{currentUser.role === 'admin' ? 'مدير' : 'كاشير'}</p>
            </div>
            <button onClick={onLogout} className="flex items-center gap-2 text-dark-600 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors">
                <span className="material-symbols-outlined">logout</span>
                <span className="hidden sm:inline">تسجيل الخروج</span>
            </button>
        </div>
        <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
    </header>
  );
};

export default Header;