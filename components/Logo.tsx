
import React, { useState } from 'react';

export const Logo = ({ className = "h-10 w-10" }: { className?: string }) => {
  return (
    <div className={`${className} bg-white rounded-lg flex items-center justify-center shadow-lg overflow-hidden`}>
      <img 
        src="/imges/logo.jpg" 
        alt="مطابخ الشرق" 
        className="w-full h-full object-contain"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
