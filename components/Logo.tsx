import React, { useState } from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = 'h-10 w-10' }) => {
  const [hasImageError, setHasImageError] = useState(false);
  const logoSrc = `${import.meta.env.BASE_URL}imges/logo.jpg`;

  return (
    <div
      className={`${className} shrink-0 bg-white rounded-2xl flex items-center justify-center shadow-lg overflow-hidden border border-brand-100`}
      aria-label="شعار مطابخ الشرق"
    >
      {!hasImageError ? (
        <img
          src={logoSrc}
          alt="مطابخ الشرق"
          className="w-full h-full object-contain p-1"
          loading="eager"
          decoding="async"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 text-brand-800 font-black text-center leading-tight p-2">
          <span className="text-[0.65em]">مطابخ<br />الشرق</span>
        </div>
      )}
    </div>
  );
};
