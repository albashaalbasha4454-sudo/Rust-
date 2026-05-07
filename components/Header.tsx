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
  const firstLetter = currentUser.username?.charAt(0)?.toUpperCase() || 'U';

  return (
    <header className="bg-white/85 backdrop-blur-md shadow-sm min-h-16 flex items-center justify-between gap-2 px-3 sm:px-6 z-10 sticky top-0 flex-shrink-0 border-b border-slate-100 overflow-x-hidden">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          onClick={toggleSidebar}
          className="md:hidden shrink-0 p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
          aria-label="فتح القائمة"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="flex items-center gap-2 md:hidden min-w-0">
          <Logo className="h-8 w-8" />
          <h1 className="text-base sm:text-xl font-bold bg-gradient-to-l from-indigo-600 to-indigo-800 bg-clip-text text-transparent truncate">
            مطابخ الشرق
          </h1>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5 sm:gap-3 min-w-0">
        {currentUser.role === 'admin' && (
          <button
            onClick={() => setIsHelpModalOpen(true)}
            className="shrink-0 flex items-center gap-1 sm:gap-2 text-indigo-600 hover:text-indigo-800 p-2 rounded-xl hover:bg-indigo-50 transition-all font-semibold text-sm"
            title="دليل استخدام النظام"
          >
            <span className="material-symbols-outlined text-[20px]">help</span>
            <span className="hidden lg:inline">مساعدة</span>
          </button>
        )}

        {(currentUser.role === 'cashier' || currentUser.role === 'admin') && (
          <button
            onClick={onOpenCloseTillModal}
            className="shrink-0 flex items-center gap-1 sm:gap-2 text-slate-600 hover:text-emerald-600 p-2 rounded-xl hover:bg-emerald-50 transition-all font-semibold text-sm"
            title="تقرير إغلاق الصندوق اليومي"
          >
            <span className="material-symbols-outlined text-[20px]">receipt_long</span>
            <span className="hidden lg:inline">إغلاق الصندوق</span>
          </button>
        )}

        <div className="h-8 w-px bg-slate-200 hidden sm:block mx-1"></div>

        <div className="flex items-center gap-2 border border-slate-100 p-1 sm:pe-3 rounded-full bg-slate-50 min-w-0 max-w-[44vw] sm:max-w-none">
          <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border border-indigo-200">
            {firstLetter}
          </div>
          <div className="hidden sm:block text-right leading-none min-w-0">
            <p className="font-bold text-slate-800 text-sm truncate max-w-32">{currentUser.username}</p>
            <p className="text-[10px] text-slate-500 font-medium truncate">{currentUser.role === 'admin' ? 'مدير النظام' : 'كاشير'}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="shrink-0 flex items-center justify-center w-10 h-10 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-all"
          title="تسجيل الخروج"
          aria-label="تسجيل الخروج"
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
      </div>

      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
    </header>
  );
};

export default Header;
