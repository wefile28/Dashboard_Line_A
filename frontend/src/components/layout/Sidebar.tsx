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
  ChevronLeft,
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
  const { shopName, unreadCount, sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed, logout } = useApp();

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
        className={`fixed top-0 bottom-0 left-0 bg-gradient-to-b from-[#0D47A1] to-[#1A237E] text-slate-100 flex flex-col z-50 transition-all duration-300 ease-in-out md:translate-x-0 ${
          sidebarCollapsed ? 'w-64 md:w-20' : 'w-64'
        } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Toggle Collapse/Expand Button (Desktop Only) */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden md:flex absolute top-5 -right-3.5 w-7 h-7 bg-white text-[#0D47A1] border border-slate-200 rounded-full items-center justify-center hover:bg-slate-50 hover:text-[#1A237E] shadow-[0_2px_8px_rgba(0,0,0,0.15)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-all duration-300 z-50 cursor-pointer active:scale-90"
          aria-label="Toggle Sidebar Collapse"
        >
          <span className={`transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : 'rotate-0'}`}>
            <ChevronLeft size={14} strokeWidth={3} />
          </span>
        </button>

        {/* Sidebar Header */}
        <div className={`h-18 flex items-center justify-between border-b border-white/10 shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'px-4 md:px-5 justify-center' : 'px-6'}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0">
              <Coffee size={18} />
            </div>
            {!sidebarCollapsed && (
              <div className="transition-opacity duration-300 font-prompt">
                <div className="font-bold text-sm leading-tight truncate max-w-[130px]">{shopName}</div>
                <div className="text-[10px] text-white/60 tracking-wider uppercase font-inter">U-Dash Master</div>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="md:hidden transition-opacity duration-300 font-prompt">
                <div className="font-bold text-sm leading-tight truncate max-w-[130px]">{shopName}</div>
                <div className="text-[10px] text-white/60 tracking-wider uppercase font-inter">U-Dash Master</div>
              </div>
            )}
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
        <nav className={`flex-1 space-y-1.5 transition-all duration-300 ${sidebarCollapsed ? 'px-4 py-6 md:px-2 md:py-6 md:overflow-visible' : 'px-4 py-6 overflow-y-auto'}`}>
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
                className={`flex items-center rounded-xl transition-all duration-200 group relative font-prompt ${
                  isActive
                    ? 'bg-white/15 text-white font-medium shadow-md shadow-black/5 border-l-4 border-emerald-400'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                } ${sidebarCollapsed ? 'px-4 py-3 md:px-0 md:justify-center' : 'px-4 py-3 justify-between'}`}
              >
                <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'md:gap-0' : ''}`}>
                  <span className={`transition-transform duration-200 shrink-0 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                    <Icon size={18} />
                  </span>
                  <span className={`text-sm font-prompt transition-all duration-300 ${sidebarCollapsed ? 'md:hidden md:opacity-0 md:w-0' : 'opacity-100 w-auto'}`}>{item.label}</span>
                </div>
                
                {item.hasBadge && unreadCount > 0 && (
                  <span className={`flex h-5 min-w-5 px-1.5 items-center justify-center text-[10px] font-semibold text-white bg-emerald-500 rounded-full animate-bounce font-inter shrink-0 ${sidebarCollapsed ? 'md:absolute md:top-1 md:right-1 md:h-2 md:min-w-2 md:w-2 md:p-0 md:animate-pulse' : ''}`}>
                    {sidebarCollapsed ? (
                      <span className="md:hidden">{unreadCount}</span>
                    ) : unreadCount}
                  </span>
                )}

                {/* CSS Tooltip on Desktop Collapsed State */}
                {sidebarCollapsed && (
                  <span className="hidden md:block absolute left-full ml-4 px-2.5 py-1.5 bg-slate-900/95 text-white text-xs rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none shadow-lg border border-white/10 font-prompt">
                    {item.label}
                    {item.hasBadge && unreadCount > 0 && ` (${unreadCount})`}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className={`border-t border-white/10 shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'p-4 md:p-2 space-y-3' : 'p-4 space-y-3'}`}>
          {/* Logout Action */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 rounded-xl text-slate-300 hover:bg-red-500/10 hover:text-red-300 transition-all text-sm font-prompt text-left cursor-pointer group relative ${sidebarCollapsed ? 'px-4 py-2.5 md:px-0 md:justify-center' : 'px-4 py-2.5'}`}
          >
            <LogOut size={16} className="shrink-0" />
            <span className={`transition-all duration-300 ${sidebarCollapsed ? 'md:hidden md:opacity-0 md:w-0' : 'opacity-100 w-auto'}`}>ออกจากระบบ</span>
            
            {/* CSS Tooltip for Logout */}
            {sidebarCollapsed && (
              <span className="hidden md:block absolute left-full ml-4 px-2.5 py-1.5 bg-red-900/95 text-red-100 text-xs rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none shadow-lg border border-red-500/20 font-prompt">
                ออกจากระบบ
              </span>
            )}
          </button>
          
          <div className={`flex justify-between items-center px-2 text-[10px] text-white/40 font-inter ${sidebarCollapsed ? 'md:justify-center' : ''}`}>
            <span className={`${sidebarCollapsed ? 'md:hidden' : ''}`}>U-Dash Master template</span>
            <span>{sidebarCollapsed ? 'v1.0' : 'v1.0.0'}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
