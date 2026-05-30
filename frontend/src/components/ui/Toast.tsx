'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

const icons = {
  success: <CheckCircle size={20} className="text-emerald-500 shrink-0" />,
  error: <XCircle size={20} className="text-red-500 shrink-0" />,
  info: <Info size={20} className="text-sky-500 shrink-0" />,
  warning: <AlertTriangle size={20} className="text-amber-500 shrink-0" />,
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  const themes = {
    success: 'border-l-4 border-emerald-500 bg-emerald-50/50',
    error: 'border-l-4 border-red-500 bg-red-50/50',
    info: 'border-l-4 border-sky-500 bg-sky-50/50',
    warning: 'border-l-4 border-amber-500 bg-amber-50/50',
  };

  return (
    <div className="fixed top-6 right-6 z-[999] flex flex-col gap-3 pointer-events-none max-w-md w-full px-4 sm:px-0">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className={`pointer-events-auto bg-white rounded-xl shadow-lg border border-slate-100 p-4 flex items-start gap-3 w-full ${themes[toast.type]}`}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            layout
          >
            {/* Toast Icon */}
            <span className="mt-0.5">{icons[toast.type]}</span>

            {/* Message */}
            <span className="flex-1 text-sm font-medium text-slate-700 font-prompt">
              {toast.message}
            </span>

            {/* Close Button */}
            <button
              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer shrink-0 mt-0.5"
              onClick={() => removeToast(toast.id)}
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
