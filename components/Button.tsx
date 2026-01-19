import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className, 
  isLoading, 
  disabled, 
  ...props 
}) => {
  return (
    <button
      disabled={disabled || isLoading}
      className={clsx(
        'relative flex items-center justify-center px-6 py-3 rounded-xl font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
        {
          'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/30': variant === 'primary',
          'bg-slate-200 text-slate-800 hover:bg-slate-300': variant === 'secondary',
          'bg-red-500 text-white hover:bg-red-600': variant === 'danger',
        },
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 className="w-5 h-5 animate-spin absolute left-4" />}
      <span className={clsx({ 'opacity-0': isLoading })}>{children}</span>
    </button>
  );
};
