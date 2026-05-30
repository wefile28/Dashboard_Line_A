'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  BarChart3,
  Bell,
  Settings,
  Coffee,
  X,
  LogOut,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

const navItems = [
  { href: '/', label: 'ภาพรวม', icon: LayoutDashboard },
  { href: '/transactions', label: 'รายรับ-รายจ่าย', icon: Receipt },
  { href: '/reports', label: 'รายงาน', icon: BarChart3 },
  { href: '/notifications', label: 'แจ้งเตือน LINE', icon: Bell, hasBadge: true },
  { href: '/settings', label: 'ตั้งค่า', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { shopName, unreadCount, sidebarOpen, setSidebarOpen, logout } = useApp();

  const handleLogout = () => {
    // Delete the token cookie
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    logout();
    window.location.href = '/login';
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-gradient-to-b from-[#0D47A1] to-[#1A237E] text-slate-100 flex flex-col z-50 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-18 flex items-center justify-between px-6 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-white shadow-md">
              <Coffee size={18} />
            </div>
            <div>
              <div className="font-bold text-sm leading-tight truncate max-w-[130px] font-prompt">{shopName}</div>
              <div className="text-[10px] text-white/60 tracking-wider uppercase font-inter">U-Dash Master</div>
            </div>
          </div>
          {/* Close button for mobile */}
          <button
            className="md:hidden p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group relative font-prompt ${
                  isActive
                    ? 'bg-white/15 text-white font-medium shadow-md shadow-black/5 border-l-4 border-emerald-400'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                    <Icon size={18} />
                  </span>
                  <span className="text-sm font-prompt">{item.label}</span>
                </div>
                {item.hasBadge && unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 px-1.5 items-center justify-center text-[10px] font-semibold text-white bg-emerald-500 rounded-full animate-bounce font-inter">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10 space-y-3 shrink-0">
          {/* Logout Action */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-300 hover:bg-red-500/10 hover:text-red-300 transition-all text-sm font-prompt text-left cursor-pointer"
          >
            <LogOut size={16} />
            <span>ออกจากระบบ</span>
          </button>
          
          <div className="flex justify-between items-center px-2 text-[10px] text-white/40 font-inter">
            <span>U-Dash Master template</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
