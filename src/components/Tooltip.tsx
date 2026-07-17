import React, { ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export default function Tooltip({ content, children, position = 'top', className = '' }: TooltipProps) {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  if (!content) return <>{children}</>;

  return (
    <div className={`relative group inline-block ${className}`}>
      {children}
      <div className={`absolute ${positionClasses[position]} w-max px-2.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded shadow-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-[110] scale-95 group-hover:scale-100`}>
        {content}
        {/* Flechita del tooltip (opcional, pero se ve bien) */}
        <div className={`absolute w-2 h-2 bg-slate-800 transform rotate-45 ${
          position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' :
          position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' :
          position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' :
          'left-[-4px] top-1/2 -translate-y-1/2'
        }`}></div>
      </div>
    </div>
  );
}
