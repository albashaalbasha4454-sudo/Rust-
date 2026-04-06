import React, { useState } from 'react';
import { Logo } from './Logo';

interface LoginViewProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError('الرجاء إدخال اسم المستخدم وكلمة المرور.');
      return;
    }
    setIsLoading(true);
    const success = await onLogin(username, password);
    if (!success) {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة.');
    }
    // Note: Do not reset loading on success as the component will unmount.
    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-dark-950 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-700 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-sm p-8 space-y-8 bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl animate-[slide-up_0.5s_ease-out] z-10 border border-white/20">
        <div className="text-center">
            <div className="flex justify-center mb-6">
                <Logo className="h-24 w-24 shadow-2xl border-4 border-brand-50" />
            </div>
            <h1 className="text-3xl font-black text-dark-900">مطابخ الشرق</h1>
            <p className="text-dark-500 mt-2 text-sm">سجل الدخول للمتابعة إلى النظام</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative group">
            <span className="material-symbols-outlined absolute top-1/2 right-4 -translate-y-1/2 text-dark-400 group-focus-within:text-brand-600 transition-colors pointer-events-none text-xl">
              person
            </span>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-5 py-4 pr-12 text-dark-800 bg-dark-50 border border-dark-100 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all outline-none text-sm"
              placeholder="اسم المستخدم"
              required
              disabled={isLoading}
            />
          </div>
          <div className="relative group">
             <span className="material-symbols-outlined absolute top-1/2 right-4 -translate-y-1/2 text-dark-400 group-focus-within:text-brand-600 transition-colors pointer-events-none text-xl">
              lock
            </span>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 pr-12 text-dark-800 bg-dark-50 border border-dark-100 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all outline-none text-sm"
              placeholder="كلمة المرور"
              required
              disabled={isLoading}
            />
          </div>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs text-center font-bold border border-red-100 animate-shake">
                {error}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-4 font-black text-white bg-brand-600 rounded-2xl hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/20 transition-all duration-300 flex items-center justify-center disabled:bg-brand-400 shadow-xl shadow-brand-500/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
                'تسجيل الدخول'
            )}
          </button>
        </form>
      </div>
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      `}</style>
    </div>
  );
};

export default LoginView;
