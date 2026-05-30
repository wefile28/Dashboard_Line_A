'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, Bell, Menu } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { getCurrentThaiDateTime } from '@/lib/utils';
import { TransactionModal } from '@/components/transactions/TransactionModal';

const pageTitles: Record<string, string> = {
  '/': 'ภาพรวมร้านค้า',
  '/transactions': 'จัดการรายรับ - รายจ่าย',
  '/reports': 'รายงานสรุปผล',
  '/notifications': 'ประวัติแจ้งเตือน LINE',
  '/settings': 'ตั้งค่าระบบ',
};

export function Header() {
  const pathname = usePathname();
  const { unreadCount, setSidebarOpen } = useApp();
  const [modalOpen, setModalOpen] = useState(false);

  const title = pageTitles[pathname] || 'หน้าหลัก';
  const dateStr = getCurrentThaiDateTime();

  return (
    <>
      <header className="h-18 bg-white border-b border-slate-200/80 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 shrink-0">
        {/* Left Side: Mobile Hamburger & Page Title */}
        <div className="flex items-center gap-3">
          <button
            className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
            onClick={() => setSidebarOpen(true)}
            aria-label="Toggle Sidebar"
          >
            <Menu size={22} />
          </button>
          
          <div className="flex flex-col">
            <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight font-prompt leading-tight">{title}</h1>
            <span className="hidden sm:inline-block text-[11px] text-slate-400 font-prompt mt-0.5">{dateStr}</span>
          </div>
        </div>

        {/* Right Side: Quick Add Button & Notifications */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Quick Add Button */}
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white font-medium px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all text-sm font-prompt cursor-pointer select-none active:scale-[0.98]"
          >
            <Plus size={16} />
            <span className="hidden xs:inline">เพิ่มรายการ</span>
          </button>

          {/* Notifications Bell */}
          <Link
            href="/notifications"
            className="relative p-2.5 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all cursor-pointer flex items-center justify-center border border-slate-100"
          >
            <Bell size={20} className={unreadCount > 0 ? 'animate-pulse' : ''} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white animate-pulse font-inter">
                {unreadCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Quick Add Modal */}
      {modalOpen && (
        <TransactionModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
