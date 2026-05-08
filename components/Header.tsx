
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
    <header className="bg-white/80 backdrop-blur-md shadow-sm h-16 flex items-center justify-between px-6 z-10 sticky top-0 flex-shrink-0 border-b border-slate-100">
        <div className="flex items-center gap-4">
            <button onClick={toggleSidebar} className="md:hidden p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
                <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="flex items-center gap-3 md:hidden">
                <div className="bg-indigo-600 text-white p-1.5 rounded-xl shadow-inner">
                    <Logo className="h-6 w-6" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-l from-indigo-600 to-indigo-800 bg-clip-text text-transparent">مطابخ الشرق</h1>
            </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
            {currentUser.role === 'admin' && (
                <button 
                    onClick={() => setIsHelpModalOpen(true)} 
                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 p-2 rounded-xl hover:bg-indigo-50 transition-all font-semibold text-sm"
                    title="دليل استخدام النظام"
                >
                    <span className="material-symbols-outlined text-[20px]">help</span>
                    <span className="hidden sm:inline">مساعدة</span>
                </button>
            )}
            {(currentUser.role === 'cashier' || currentUser.role === 'admin') && (
                <button 
                    onClick={onOpenCloseTillModal} 
                    className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 p-2 rounded-xl hover:bg-emerald-50 transition-all font-semibold text-sm"
                    title="تقرير إغلاق الصندوق اليومي"
                >
                    <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                    <span className="hidden sm:inline">إغلاق الصندوق</span>
                </button>
            )}
            <div className="h-8 w-px bg-slate-200 hidden sm:block mx-2"></div>
            <div className="flex items-center gap-3 border border-slate-100 p-1.5 pe-4 rounded-full bg-slate-50">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border border-indigo-200">
                    {currentUser.username[0].toUpperCase()}
                </div>
                <div className="text-right leading-none">
                    <p className="font-bold text-slate-800 text-sm">{currentUser.username}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{currentUser.role === 'admin' ? 'مدير النظام' : 'كاشير'}</p>
                </div>
            </div>
            <button onClick={onLogout} className="flex items-center justify-center w-10 h-10 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-all ml-1" title="تسجيل الخروج">
                <span className="material-symbols-outlined">logout</span>
            </button>
        </div>
        <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
    </header>
  );
};

export default Header;