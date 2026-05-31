'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, CheckCheck, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/contexts/ToastContext';
import { getNotifications, markAllRead } from '@/lib/api';
import { mockNotifications } from '@/lib/mockData';
import { formatDate, formatTime, formatCurrency, cn } from '@/lib/utils';

export default function NotificationsPage() {
  const { setUnreadCount, refreshUnread } = useApp();
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      const res = await getNotifications();
      setNotifications(res);
    } catch (err) {
      console.warn('Backend is offline, using mock notifications.', err);
      setNotifications(mockNotifications);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  async function handleMarkAllRead() {
    try {
      await markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      addToast('success', 'อ่านการแจ้งเตือนทั้งหมดแล้ว');
      refreshUnread();
    } catch (err) {
      console.warn('API error during mark all read, simulating locally for sandbox.', err);
      // Simulate
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      addToast('success', 'อ่านทั้งหมดแล้ว (Sandbox)');
    }
  }

  // Group notifications by date
  const grouped = notifications.reduce<Record<string, any[]>>((acc, n) => {
    const date = n.created_at.split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(n);
    return acc;
  }, {});

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const bubbleVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.95 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { delay: i * 0.05, duration: 0.35, ease: 'easeOut' },
    }),
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col h-[calc(100vh-180px)] min-h-[450px] bg-[#BAC5D0] rounded-2xl overflow-hidden shadow-inner border border-[#A4B3C1] p-6 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-3 items-end">
            <div className="animate-shimmer w-9 h-9 rounded-full bg-slate-200 shrink-0" />
            <div className="animate-shimmer w-52 h-14 rounded-2xl bg-slate-200" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] min-h-[500px] bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      {/* ── Chat Top Bar ── */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-line-green" />
          <span className="text-sm font-bold text-slate-700 font-prompt">
            {unreadCount > 0 ? `มีข้อความใหม่ ${unreadCount} รายการ` : 'การแจ้งเตือนทั้งหมด'}
          </span>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-line-green hover:text-line-green-dark hover:bg-emerald-50">
            <CheckCheck size={15} />
            อ่านทั้งหมด
          </Button>
        )}
      </div>

      {/* ── LINE PC Chat Window ── */}
      <div className="flex-1 bg-[#BAC5D0] overflow-y-auto px-6 py-5 space-y-5 shadow-inner">
        {notifications.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <BellOff size={48} className="stroke-1 mb-2 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-700 font-prompt">ยังไม่มีข้อความแจ้งเตือน</h3>
            <p className="text-xs text-slate-400 font-prompt mt-1">
              เมื่อมีการทำธุรกรรมผ่านระบบ แจ้งเตือน LINE จะปรากฏขึ้นที่นี่
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, items]) => {
            let bubbleIndex = 0;
            return (
              <React.Fragment key={date}>
                {/* Date Separator Pill */}
                <div className="flex justify-center my-6">
                  <span className="bg-slate-900/10 text-white text-[10px] font-bold px-3 py-1 rounded-full font-prompt select-none">
                    {formatDate(date)}
                  </span>
                </div>

                {items.map((notif) => {
                  const idx = bubbleIndex++;
                  const isIncome = notif.type === 'income';

                  return (
                    <motion.div
                      key={notif.id}
                      className="flex items-start gap-2.5 max-w-[85%] relative group"
                      custom={idx}
                      initial="hidden"
                      animate="visible"
                      variants={bubbleVariants}
                    >
                      {/* LINE Avatar Badge */}
                      <div className="w-9 h-9 bg-line-green text-white font-bold text-[9px] font-inter rounded-full flex items-center justify-center shadow-sm shrink-0 border border-emerald-400 select-none">
                        LINE
                      </div>

                      {/* Chat Speech Bubble */}
                      <div className="flex items-end gap-1.5 min-w-0">
                        <div
                          className={cn(
                            'p-3.5 rounded-2xl text-xs font-prompt shadow-xs break-words whitespace-pre-line leading-relaxed max-w-lg',
                            isIncome
                              ? 'bg-line-green text-white rounded-tl-sm'
                              : 'bg-white text-slate-800 rounded-tl-sm border border-slate-200'
                          )}
                        >
                          <p>{notif.message}</p>
                          {notif.amount && (
                            <p className={cn(
                              'text-sm font-bold font-inter mt-1.5 num',
                              isIncome ? 'text-yellow-200' : 'text-rose-500'
                            )}>
                              {formatCurrency(notif.amount)}
                            </p>
                          )}
                        </div>

                        {/* Timestamp label */}
                        <span className="text-[9px] text-slate-500 font-inter shrink-0 mb-0.5 select-none">
                          {formatTime(notif.created_at)}
                        </span>
                      </div>

                      {/* Unread Indicator Badge */}
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#BAC5D0] shrink-0 self-center ml-1" />
                      )}
                    </motion.div>
                  );
                })}
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}
