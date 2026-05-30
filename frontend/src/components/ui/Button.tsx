'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'success' | 'danger' | 'ghost' | 'outline' | 'outlineDanger' | 'line';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  iconOnly?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  iconOnly = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  // Styles configuration
  const baseStyle = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 cursor-pointer select-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 font-prompt';
  
  const variants = {
    primary: 'bg-primary hover:bg-primary-dark text-white shadow-sm hover:shadow-md shadow-primary/10',
    success: 'bg-income hover:bg-income-dark text-white shadow-sm hover:shadow-md shadow-income/10',
    danger: 'bg-expense hover:bg-expense-dark text-white shadow-sm hover:shadow-md shadow-expense/10',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900',
    outline: 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900',
    outlineDanger: 'border border-red-200 bg-white hover:bg-red-50 text-red-600 hover:text-red-700',
    line: 'bg-line-green hover:bg-line-green-dark text-white shadow-sm hover:shadow-md shadow-line-green/10',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 h-8',
    md: 'text-sm px-4 py-2.5 gap-2 h-10',
    lg: 'text-base px-6 py-3.5 gap-2.5 h-12',
  };

  const fullWidthStyle = fullWidth ? 'w-full flex' : '';
  const iconOnlyStyle = iconOnly ? 'p-0 w-10 h-10' : '';

  return (
    <button
      className={cn(
        baseStyle,
        variants[variant],
        sizes[size],
        fullWidthStyle,
        iconOnlyStyle,
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} className="animate-spin shrink-0" />
      ) : null}
      {children}
    </button>
  );
}
