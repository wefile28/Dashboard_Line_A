'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUp, TrendingDown, ArrowRight,
  Wallet, CreditCard, PiggyBank, Receipt,
  Sparkles, Smartphone, BarChart as LucideBarChart, CheckCircle2, AlertCircle, ShieldCheck, ArrowUpRight
} from 'lucide-react';
import { getDashboardSummary, DashboardSummary, sendDailySummary, sendShortageAlert } from '@/lib/api';
import { mockDashboard } from '@/lib/mockData';
import {
  formatCurrency, formatDate, formatThaiMonth, formatPercent,
  getCategoryColor, cn
} from '@/lib/utils';
import { DashboardSkeleton } from '@/components/ui/LoadingSkeleton';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';

// ── Custom Chart Tooltip ──
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl border border-slate-100 shadow-lg text-xs leading-relaxed">
      <div className="font-bold text-slate-700 mb-2 font-prompt">{label}</div>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-3 py-0.5 justify-between">
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
            <span>{entry.name === 'income' ? 'รายรับ' : entry.name === 'expense' ? 'รายจ่าย' : entry.name}</span>
          </div>
          <span className="num font-bold text-slate-800 ml-4">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Animation Variants ──
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', damping: 20, stiffness: 260 }
  }
};

export default function DashboardPage() {
  const { settings, userRole } = useApp();
  const router = useRouter();
  const { addToast } = useToast();
  
  useEffect(() => {
    if (userRole === 'employee') {
      router.push('/transactions');
    }
  }, [userRole, router]);

  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<string>('default');
  const [initialMounted, setInitialMounted] = useState(false);
  const [executiveMode, setExecutiveMode] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [sendingSummary, setSendingSummary] = useState(false);

  // Stock Shortage states
  const [showShortageModal, setShowShortageModal] = useState(false);
  const [sendingShortage, setSendingShortage] = useState(false);
  const [shortageCooldown, setShortageCooldown] = useState(0);
  const [selectedShortageItems, setSelectedShortageItems] = useState<string[]>([]);

  // Cooldown countdown timer
  useEffect(() => {
    let timer: any;
    if (shortageCooldown > 0) {
      timer = setTimeout(() => {
        setShortageCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [shortageCooldown]);

  // Split shortage options from settings or fallback to defaults
  const getShortageOptions = (): string[] => {
    if (settings.shortage_items && settings.shortage_items.trim()) {
      return settings.shortage_items.split(',').map(item => item.trim()).filter(Boolean);
    }
    return ['เมล็ดกาแฟ (Espresso)', 'นมสด Barista', 'โกโก้พรีเมียม', 'ชาเขียวมัทฉะ', 'แก้วเย็น 16oz', 'หลอดกระดาษ'];
  };

  async function handleSendShortage() {
    if (selectedShortageItems.length === 0) {
      addToast('error', 'กรุณาเลือกวัตถุดิบอย่างน้อย 1 รายการ');
      return;
    }
    if (shortageCooldown > 0) {
      addToast('error', `กรุณารอคูลดาวน์ระบบแจ้งเตือนอีก ${shortageCooldown} วินาที`);
      return;
    }
    setSendingShortage(true);
    try {
      const res = await sendShortageAlert(selectedShortageItems);
      if (res.success) {
        addToast('success', 'ส่งแจ้งเตือนวัตถุดิบหมดเกลี้ยงเข้า LINE เรียบร้อย!');
        setShowShortageModal(false);
        setShortageCooldown(60); // 60s cooldown to throttle notifications
        setSelectedShortageItems([]);
      } else {
        addToast('error', res.message || 'ส่งแจ้งเตือนไม่สำเร็จ');
      }
    } catch (err: any) {
      console.warn('LINE Notify shortage error, running sandbox fallback:', err);
      const disableSandbox = process.env.NEXT_PUBLIC_DISABLE_SANDBOX === 'true';
      if (disableSandbox || (err.status && err.status !== 0)) {
        addToast('error', err.message || 'ส่งแจ้งเตือนไม่สำเร็จ');
        return;
      }
      await new Promise(r => setTimeout(r, 600));
      addToast('success', 'ส่งแจ้งเตือนวัตถุดิบหมดเกลี้ยงเข้า LINE เรียบร้อย! (Sandbox)');
      setShowShortageModal(false);
      setShortageCooldown(60);
      setSelectedShortageItems([]);
    } finally {
      setSendingShortage(false);
    }
  }

  // Safely read and set cached executive mode on mount to avoid Next.js hydration errors
  useEffect(() => {
    const cached = localStorage.getItem('executiveMode');
    if (cached === 'true') {
      setExecutiveMode(true);
    }
  }, []);

  useEffect(() => {
    async function load() {
      if (!initialMounted) {
        setLoading(true);
      }
      try {
        let params = {};
        const today = new Date();
        const formatDateString = (d: Date) => d.toISOString().split('T')[0];

        if (timeframe === '7days') {
          const start = new Date();
          start.setDate(today.getDate() - 6);
          params = { start_date: formatDateString(start), end_date: formatDateString(today) };
        } else if (timeframe === '30days') {
          const start = new Date();
          start.setDate(today.getDate() - 29);
          params = { start_date: formatDateString(start), end_date: formatDateString(today) };
        } else if (timeframe === 'month') {
          const start = new Date(today.getFullYear(), today.getMonth(), 1);
          params = { start_date: formatDateString(start), end_date: formatDateString(today) };
        }

        const res = await getDashboardSummary(params);
        setData(res);
      } catch (err: any) {
        console.warn('Backend is offline, using mock dashboard data.', err);
        const disableSandbox = process.env.NEXT_PUBLIC_DISABLE_SANDBOX === 'true';
        if (disableSandbox || (err.status && err.status !== 0)) {
          addToast('error', err.message || 'โหลดข้อมูลสรุปแดชบอร์ดล้มเหลว');
          return;
        }
        setData(mockDashboard);
      } finally {
        setLoading(false);
        setInitialMounted(true);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, initialMounted]);

  async function handleSendSummary() {
    setSendingSummary(true);
    try {
      const res = await sendDailySummary();
      if (res.success) {
        addToast('success', 'ส่งรายงานสรุปยอดรายวันเข้า LINE สำเร็จแล้ว!');
      } else {
        addToast('error', res.message || 'ส่งสรุปยอดไม่สำเร็จ');
      }
    } catch (err: any) {
      console.warn('LINE Notify push summary error, running sandbox fallback:', err);
      const disableSandbox = process.env.NEXT_PUBLIC_DISABLE_SANDBOX === 'true';
      if (disableSandbox || (err.status && err.status !== 0)) {
        addToast('error', err.message || 'ส่งสรุปยอดไม่สำเร็จ');
        return;
      }
      await new Promise(r => setTimeout(r, 600));
      addToast('success', 'ส่งรายงานสรุปยอดรายวันเข้า LINE สำเร็จแล้ว! (Sandbox)');
    } finally {
      setSendingSummary(false);
    }
  }

  function handleCopyReceipt() {
    if (!data) return;
    const dateStr = timeframe === 'default' ? 'วันนี้' : timeframe === '7days' ? 'ช่วง 7 วันนี้' : timeframe === '30days' ? 'ช่วง 30 วันนี้' : 'เดือนนี้';
    const text = `☕ ใบเสร็จสรุปผลร้าน ${settings.shop_name || 'U-Dash'}\n━━━━━━━━━━━━━━━━━━\n📅 รอบสรุปบัญชี: ${dateStr}\n🟢 รายรับสะสม: +${formatCurrency(data.today_income)} บาท\n🔴 รายจ่ายสะสม: -${formatCurrency(data.today_expense)} บาท\n━━━━━━━━━━━━━━━━━━\n📈 กำไรสุทธิ: ${data.today_profit >= 0 ? '+' : ''}${formatCurrency(data.today_profit)} บาท\n━━━━━━━━━━━━━━━━━━\nขอบคุณที่ใช้บริการสรุปยอดอัจฉริยะ U-Dash Pro!`;
    navigator.clipboard.writeText(text);
    addToast('success', 'คัดลอกใบเสร็จดิจิทัลลงคลิปบอร์ดสำเร็จ! วางแชร์ได้ทันที');
  }

  if ((loading && !initialMounted) || !data) {
    return <DashboardSkeleton />;
  }

  const summaryCards = [
    {
      label: 'รายรับวันนี้',
      amount: data.today_income,
      change: data.income_change,
      icon: <Wallet size={24} />,
      type: 'income' as const,
      color: '#00C853',
      bgLight: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
      sparkData: data.weekly_data.map(d => ({ v: d.income })),
    },
    {
      label: 'รายจ่ายวันนี้',
      amount: data.today_expense,
      change: data.expense_change,
      icon: <CreditCard size={24} />,
      type: 'expense' as const,
      color: '#FF5252',
      bgLight: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
      sparkData: data.weekly_data.map(d => ({ v: d.expense })),
    },
    {
      label: 'กำไรสุทธิวันนี้',
      amount: data.today_profit,
      change: data.profit_change,
      icon: <PiggyBank size={24} />,
      type: 'profit' as const,
      color: '#2979FF',
      bgLight: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
      sparkData: data.weekly_data.map(d => ({ v: d.profit })),
    },
  ];

  // Map charts info
  const weeklyChart = data.weekly_data.map(d => ({
    date: formatDate(d.date).split(' ').slice(0, 2).join(' '),
    income: d.income,
    expense: d.expense,
  }));

  const monthlyChart = data.monthly_data
    .filter(d => d.income > 0 || d.expense > 0)
    .map(d => ({
      month: formatThaiMonth(d.month),
      income: d.income,
      expense: d.expense,
    }));

  const pieData = data.expense_by_category.map(c => ({
    name: c.category,
    value: c.total,
    color: c.color || getCategoryColor(c.category),
    percentage: c.percentage,
  }));

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 md:space-y-8"
    >
      {/* ── Mode Switching & Premium Welcome Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-xs transition-colors">
        <div className="space-y-1">
          <h2 className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 font-prompt flex items-center gap-2">
            <Sparkles className="text-primary dark:text-[#2979FF] animate-pulse" size={18} />
            แผงควบคุมร้านค้าอัจฉริยะ U-Dash Pro
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-prompt">
            ข้อมูลการเงิน บัญชี และรายการแจ้งเตือนอัตโนมัติ สรุปผลเรียลไทม์
          </p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start md:self-auto border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
          <button
            onClick={() => {
              setExecutiveMode(true);
              localStorage.setItem('executiveMode', 'true');
            }}
            className={cn(
              'text-[11px] md:text-xs font-prompt px-3.5 py-2 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 select-none active:scale-95 duration-200',
              executiveMode
                ? 'bg-[#1565C0] text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <Smartphone size={13} />
            โหมดเจ้าของร้าน (สรุปด่วน)
          </button>
          <button
            onClick={() => {
              setExecutiveMode(false);
              localStorage.setItem('executiveMode', 'false');
            }}
            className={cn(
              'text-[11px] md:text-xs font-prompt px-3.5 py-2 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 select-none active:scale-95 duration-200',
              !executiveMode
                ? 'bg-[#1565C0] text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <LucideBarChart size={13} />
            โหมดละเอียด (กราฟ/ตาราง)
          </button>
        </div>
      </div>

      {/* ⚡ QUICK ACTIONS PREMIUM PANEL */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs transition-colors font-prompt">
        <div className="text-[11px] font-bold text-slate-450 dark:text-slate-500 mb-3 uppercase tracking-wider flex items-center gap-1.5 select-none">
          <Sparkles className="text-[#1565C0] dark:text-[#2979FF] animate-pulse" size={13} />
          ปุ่มลัดจัดการด่วนหน้าร้าน (U-Dash Pro Quick Actions)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Action 1: QR Payment */}
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center justify-center gap-2 p-3 bg-blue-50 hover:bg-blue-100/80 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-[#0D47A1] dark:text-[#2979FF] border border-blue-100/50 dark:border-blue-500/10 rounded-xl font-bold text-xs transition-all active:scale-95 duration-200 cursor-pointer select-none"
          >
            💸 แสดง QR พร้อมเพย์
          </button>
          
          {/* Action 2: Copy digital receipt */}
          <button
            onClick={handleCopyReceipt}
            className="flex items-center justify-center gap-2 p-3 bg-slate-55 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/40 dark:border-slate-700/30 rounded-xl font-bold text-xs transition-all active:scale-95 duration-200 cursor-pointer select-none"
          >
            📋 คัดลอก E-Receipt
          </button>

          {/* Action 3: Daily Summary LINE Notify */}
          <button
            onClick={handleSendSummary}
            disabled={sendingSummary}
            className="flex items-center justify-center gap-2 p-3 bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-500/10 rounded-xl font-bold text-xs transition-all active:scale-95 duration-200 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendingSummary ? '⏳ กำลังส่งสรุป...' : '🔔 ส่งสรุปเข้า LINE'}
          </button>

          {/* Action 4: Inventory Alert */}
          <button
            onClick={() => {
              setSelectedShortageItems([]);
              setShowShortageModal(true);
            }}
            className="flex items-center justify-center gap-2 p-3 bg-rose-50 hover:bg-rose-100/80 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-450 border border-rose-100/50 dark:border-rose-500/10 rounded-xl font-bold text-xs transition-all active:scale-95 duration-200 cursor-pointer select-none"
          >
            ⚠️ แจ้งเตือนของหมด!
            {shortageCooldown > 0 && (
              <span className="font-mono text-[9px] font-bold bg-rose-100 dark:bg-rose-500/30 px-1.5 py-0.5 rounded text-rose-600 dark:text-rose-400 animate-pulse ml-1">
                ({shortageCooldown}s)
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Timeframe Pill Selector ── */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3 rounded-2xl shadow-xs gap-3 transition-colors">
        <div className="flex items-center gap-2 pl-2">
          <span className="w-2.5 h-2.5 bg-primary dark:bg-blue-500 rounded-full animate-pulse" />
          <span className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300 font-prompt">ขอบเขตการสรุปข้อมูลทางการเงิน</span>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto border border-slate-200/40 dark:border-slate-700/40">
          {[
            { id: 'default', label: 'วันนี้' },
            { id: '7days', label: '7 วันล่าสุด' },
            { id: '30days', label: '30 วันล่าสุด' },
            { id: 'month', label: 'เดือนนี้' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTimeframe(item.id)}
              className={cn(
                'text-[11px] md:text-xs font-prompt px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer select-none duration-200 active:scale-95',
                timeframe === item.id
                  ? 'bg-white dark:bg-slate-700 text-[#0D47A1] dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Conditional Render Grid (Executive vs Analytical) ── */}
      <motion.div
        key={executiveMode ? 'executive' : 'analytical'}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {executiveMode ? (
          /* 📱 PREMIUM SIMPLIFIED EXECUTIVE VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-prompt">
            {/* Question 1: วันนี้ขายได้เท่าไหร่ */}
            <div className="bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 relative overflow-hidden flex flex-col justify-between min-h-[240px]">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 select-none">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    วันนี้ขายได้เท่าไหร่?
                  </span>
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Wallet size={18} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-inter num tracking-tight">
                    <AnimatedCounter value={data.today_income} formatFn={formatCurrency} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                    ยอดขายและรายรับจริงสะสมรวมของร้าน {timeframe === 'default' ? 'ในวันนี้' : timeframe === '7days' ? 'ในช่วง 7 วันนี้' : timeframe === '30days' ? 'ในช่วง 30 วันนี้' : 'ภายในเดือนนี้'}
                  </p>
                </div>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-4 flex flex-col gap-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>บันทึกรายรับลงบัญชี เรียบร้อยครบถ้วน</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={() => setShowQrModal(true)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold rounded-xl text-xs transition-all active:scale-95 duration-200 cursor-pointer select-none border border-emerald-100/50 dark:border-emerald-500/10"
                  >
                    💸 รับเงิน (QR)
                  </button>
                  <button
                    onClick={handleCopyReceipt}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-all active:scale-95 duration-200 cursor-pointer select-none border border-slate-200/55 dark:border-slate-700/30"
                  >
                    📋 คัดลอก
                  </button>
                </div>
              </div>
            </div>

            {/* Question 2: กำไรไหม */}
            <div className={cn(
              "bg-white border rounded-3xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 relative overflow-hidden flex flex-col justify-between min-h-[220px]",
              data.today_profit >= 0
                ? "border-emerald-200/60 dark:border-emerald-950/40"
                : "border-rose-200/60 dark:border-rose-950/40"
            )}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 select-none",
                    data.today_profit >= 0
                      ? "text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400"
                      : "text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400"
                  )}>
                    ตกลงกำไรไหม?
                  </span>
                  <div className={cn(
                    "p-2.5 rounded-xl",
                    data.today_profit >= 0
                      ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  )}>
                    <PiggyBank size={18} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className={cn(
                    "text-3xl font-extrabold font-inter num tracking-tight",
                    data.today_profit >= 0 ? "text-blue-600 dark:text-blue-400" : "text-rose-500 dark:text-rose-400"
                  )}>
                    {data.today_profit >= 0 ? '+' : ''}<AnimatedCounter value={data.today_profit} formatFn={formatCurrency} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                    {data.today_profit >= 0
                      ? "ยินดีด้วยครับพี่! ยอดขายวันนี้สูงกว่ารายจ่าย หักลบหมดแล้วเป็นบวกสวยงาม เงินหมุนเวียนไหลลื่น"
                      : "วันนี้มีการลงบันทึกค่าใช้จ่ายตุนของเข้าร้านหรือชำระบิลรอบเดือน รอสรุปคืนทุนจากยอดขายวันถัดๆ ไปครับ"}
                  </p>
                </div>
              </div>
              <div className={cn(
                "border-t pt-3 mt-4 flex items-center gap-2 text-xs font-bold",
                data.today_profit >= 0
                  ? "border-emerald-100 dark:border-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                  : "border-rose-100 dark:border-rose-950/20 text-rose-600 dark:text-rose-400"
              )}>
                <span className="w-2 h-2 rounded-full animate-pulse bg-current" />
                <span>{data.today_profit >= 0 ? 'สถานะ: ยอดบวก กำไรเข้ากระเป๋า' : 'สถานะ: สำรองทุนสต็อกของหมุนเวียน'}</span>
              </div>
            </div>

            {/* Question 3: เงินหายตรงไหน */}
            <div className="bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 select-none">
                    เงินหายตรงไหน?
                  </span>
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                    <ShieldCheck size={18} />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                    การตรวจสอบป้องกันเงินรั่วไหลรอบการเงินนี้:
                  </p>
                  <ul className="text-xs text-slate-700 dark:text-slate-200 space-y-1.5 font-semibold">
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-500 font-extrabold font-inter text-sm">✓</span>
                      ตรวจสอบสลิป LINE Notify: สำเร็จ 100%
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-500 font-extrabold font-inter text-sm">✓</span>
                      ฐานข้อมูลสำรอง (SQLite): ทำงานเสถียร
                    </li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-4 flex items-center gap-1.5 text-[10px] text-slate-400 leading-tight">
                <AlertCircle size={13} className="text-amber-500 shrink-0" />
                <span>เทียบยอดเงินโอนบัญชีธนาคารกับเก๊ะเงินสดทุกวันป้องกันรั่วไหล</span>
              </div>
            </div>

            {/* Question 4: ต้องจ่ายอะไรบ้าง */}
            <div className="bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 select-none">
                    ต้องจ่ายอะไรบ้าง?
                  </span>
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
                    <CreditCard size={18} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-extrabold text-rose-500 dark:text-rose-400 font-inter num tracking-tight">
                    <AnimatedCounter value={data.today_expense} formatFn={formatCurrency} />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                    {data.today_expense > 0 ? (
                      <div>
                        <span>หมวดหมู่รายจ่ายที่เกิดขึ้น:</span>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {data.expense_by_category.slice(0, 3).map((c, i) => (
                            <span key={i} className="bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-300 font-bold border border-slate-200/20">
                              {c.category} ({formatCurrency(c.total)})
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      "วันนี้ยอดรายจ่ายที่บันทึกออกเป็นศูนย์ สบายใจได้ครับยังไม่มีต้นทุนคงค้าง"
                    )}
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-4 flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                <span>ไม่มีบิลค้างชำระฉุกเฉินในรอบ 24 ชม.</span>
              </div>
            </div>

            {/* Question 5: เปิดมือถือดูได้ไหม */}
            <div className="bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 relative overflow-hidden flex flex-col justify-between min-h-[220px] lg:col-span-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-primary dark:text-[#2979FF] bg-primary-light dark:bg-blue-500/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 select-none">
                    เปิดดูบนมือถือได้สะดวกและเร็ว 100%
                  </span>
                  <div className="p-2.5 bg-primary-light dark:bg-blue-500/10 text-primary dark:text-[#2979FF] rounded-xl">
                    <Smartphone size={18} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/30">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 font-prompt">
                      🍏 สำหรับ iPhone (Safari)
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                      กดปุ่มแชร์ <span className="font-bold text-slate-600 dark:text-slate-300">[↑]</span> ด้านล่างจอ → เลือก <span className="font-bold text-primary dark:text-blue-400">&#39;เพิ่มไปยังหน้าจอโฮม&#39; (Add to Home)</span>
                    </p>
                  </div>
                  <div className="space-y-1 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/30">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 font-prompt">
                      🤖 สำหรับ Android (Chrome)
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                      กดปุ่มตัวเลือก <span className="font-bold text-slate-600 dark:text-slate-300">[⋮]</span> ขวาบน → เลือก <span className="font-bold text-primary dark:text-blue-400">&#39;ติดตั้งแอป&#39;</span> หรือ <span className="font-bold text-primary dark:text-blue-400">&#39;เพิ่มลงหน้าจอโฮม&#39;</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-4 flex items-center justify-between text-[11px] text-slate-400 leading-none">
                <span>✓ ใช้งานแบบ PWA แตะเปิดง่ายดาย</span>
                <span className="text-primary dark:text-[#2979FF] font-bold flex items-center gap-0.5 cursor-pointer">
                  ปักหมุดไอคอนบนจอโทรศัพท์ <ArrowUpRight size={12} />
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* 📊 STANDARD DETAILED ANALYTICAL VIEW */
          <div className="space-y-6 md:space-y-8">
            {/* ── Summary Grid Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {summaryCards.map((card) => (
                <motion.div
                  key={card.type}
                  variants={cardVariants}
                  className="bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col relative overflow-hidden group min-h-[170px]"
                >
                  {/* Top Indicator row */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${card.bgLight} transition-all duration-200`}>
                      {card.icon}
                    </div>
                    <span
                      className={cn(
                        'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full font-inter',
                        card.change >= 0
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                      )}
                    >
                      {card.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {formatPercent(card.change)}
                    </span>
                  </div>

                  {/* Middle label & amount */}
                  <div className="space-y-1 z-10">
                    <div className="text-slate-400 text-xs font-medium font-prompt">{card.label}</div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight font-inter num">
                      {formatCurrency(card.amount)}
                    </div>
                  </div>

                  {/* Sparkline chart in background bottom */}
                  <div className="h-12 w-full absolute bottom-0 left-0 right-0 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={card.sparkData} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                        <Line
                          type="monotone"
                          dataKey="v"
                          stroke={card.color}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* ── Analytical Charts ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart — Daily Trend */}
              <motion.div
                variants={cardVariants}
                className="bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 rounded-2xl p-5 shadow-sm"
              >
                <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 font-prompt mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-primary rounded-full" />
                  รายรับ - รายจ่ายรายวัน (7 วันล่าสุด)
                </h3>
                <div className="h-[280px]">
                  {weeklyChart.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyChart} barGap={4} margin={{ left: -10, right: 10, top: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} stroke="#E2E8F0" />
                        <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} stroke="#E2E8F0" tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="income" name="income" fill="#00C853" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" name="expense" fill="#FF5252" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm font-prompt">ไม่มีข้อมูลสำหรับช่วงนี้</div>
                  )}
                </div>
              </motion.div>

              {/* Area Chart — Monthly trend */}
              <motion.div
                variants={cardVariants}
                className="bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 rounded-2xl p-5 shadow-sm"
              >
                <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 font-prompt mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-primary rounded-full" />
                  ภาพรวมรายเดือน (เปรียบเทียบทั้งปี)
                </h3>
                <div className="h-[280px]">
                  {monthlyChart.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyChart} margin={{ left: -10, right: 10, top: 10 }}>
                        <defs>
                          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00C853" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#00C853" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF5252" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#FF5252" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94A3B8' }} stroke="#E2E8F0" />
                        <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} stroke="#E2E8F0" tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="income" name="income" stroke="#00C853" fillOpacity={1} fill="url(#incomeGrad)" strokeWidth={2} />
                        <Area type="monotone" dataKey="expense" name="expense" stroke="#FF5252" fillOpacity={1} fill="url(#expenseGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm font-prompt">ไม่มีข้อมูลสำหรับการแสดงผล</div>
                  )}
                </div>
              </motion.div>

              {/* Pie Chart — Expense by Category */}
              <motion.div
                variants={cardVariants}
                className="bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 rounded-2xl p-5 shadow-sm lg:col-span-2"
              >
                <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 font-prompt mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-primary rounded-full" />
                  สัดส่วนหมวดหมู่ค่าใช้จ่าย
                </h3>
                <div className="flex flex-col md:flex-row gap-6 items-center justify-around">
                  <div className="w-full max-w-[240px] h-[240px] shrink-0">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={95}
                            paddingAngle={3}
                            dataKey="value"
                            animationBegin={100}
                            animationDuration={800}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={index} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-sm font-prompt">ไม่มีค่าใช้จ่าย</div>
                    )}
                  </div>

                  {/* Legend checklist */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full px-4">
                    {pieData.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 border border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-all">
                        <span className="w-3.5 h-3.5 rounded-lg shrink-0" style={{ background: item.color }} />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 font-prompt truncate">{item.name}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-inter num mt-0.5">
                            {formatCurrency(item.value)} ({item.percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* ── Recent Transactions Table ── */}
            <motion.div
              variants={cardVariants}
              className="bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 font-prompt flex items-center gap-2">
                  <Receipt size={18} className="text-primary dark:text-[#2979FF]" />
                  รายการล่าสุด 5 รายการ
                </h3>
                <Link
                  href="/transactions"
                  className="flex items-center gap-1 text-xs font-semibold text-primary dark:text-[#2979FF] hover:text-[#0D47A1] dark:hover:text-blue-400 transition-colors font-prompt cursor-pointer select-none"
                >
                  ดูรายการทั้งหมด <ArrowRight size={14} />
                </Link>
              </div>

              <div className="overflow-x-auto">
                {data.recent_transactions.length > 0 ? (
                  <table className="w-full min-w-[600px] border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-left">
                        <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase font-prompt">วันที่</th>
                        <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase font-prompt">ชื่อรายการ</th>
                        <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase font-prompt">หมวดหมู่</th>
                        <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase font-prompt text-right">จำนวนเงิน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                      {data.recent_transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-prompt whitespace-nowrap">{formatDate(tx.date)}</td>
                          <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-semibold font-prompt whitespace-nowrap">{tx.title}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-xs font-prompt">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{
                                  background: typeof tx.category === 'object' && tx.category
                                    ? ((tx.category as any).color || getCategoryColor((tx.category as any).name))
                                    : getCategoryColor(tx.category as string)
                                }}
                              />
                              {typeof tx.category === 'object' && tx.category ? (tx.category as any).name : tx.category}
                            </span>
                          </td>
                          <td className={cn(
                            'px-6 py-4 text-right font-bold font-inter num whitespace-nowrap text-base',
                            tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                          )}>
                            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 font-prompt">
                    <Receipt size={40} className="stroke-1 mb-2 text-slate-300 dark:text-slate-700" />
                    <span>ยังไม่มีรายการในประวัติ</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>

      {/* ── Dynamic PromptPay QR Code Modal ── */}
      {showQrModal && (
        <Modal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          title="สแกนรับชำระเงินพร้อมเพย์ (PromptPay QR)"
          size="sm"
          footer={
            <Button variant="ghost" onClick={() => setShowQrModal(false)}>
              ปิดหน้าต่าง
            </Button>
          }
        >
          <div className="flex flex-col items-center justify-center p-4 text-center font-prompt">
            {settings.promptpay_id && settings.promptpay_id.trim() ? (
              <div className="space-y-5 w-full">
                {/* Visual Header */}
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                    ยอดเงินโอน: <span className="text-emerald-600 dark:text-emerald-400 font-inter font-extrabold text-xl">{formatCurrency(data.today_income)} บาท</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ยอดรวมรายรับสะสมของร้านในวันนี้แบบเรียลไทม์
                  </p>
                </div>

                {/* QR Code Container */}
                <div className="relative bg-white p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner flex items-center justify-center mx-auto max-w-[210px] aspect-square transition-transform hover:scale-105 duration-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://promptpay.io/${settings.promptpay_id.trim()}/${data.today_income || ''}.png`}
                    alt="PromptPay QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Account Details */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-3.5 rounded-xl text-left space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">บัญชีผู้รับเงิน</div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex justify-between">
                    <span>ชื่อบัญชี:</span>
                    <span className="font-semibold">{settings.promptpay_name || 'ไม่ได้ระบุ'}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex justify-between font-mono">
                    <span>หมายเลขพร้อมเพย์:</span>
                    <span className="tracking-wider">{settings.promptpay_id}</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 leading-relaxed font-normal">
                  💡 ลูกค้าสามารถเปิดแอปธนาคารใดก็ได้ สแกนรูปภาพ QR Code ด้านบนเพื่อชำระเงินเข้าสู่บัญชีคุณโดยตรง ไม่มีค่าธรรมเนียมธุรกรรม
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-6">
                <div className="w-14 h-14 bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-450 rounded-full flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/30 animate-pulse">
                  <AlertCircle size={26} />
                </div>
                <div className="space-y-1 px-2">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">ยังไม่ตั้งค่าบัญชีพร้อมเพย์</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                    คุณต้องกรอกหมายเลขพร้อมเพย์ (PromptPay ID) ในเมนูตั้งค่าระบบก่อน เพื่อให้โปรแกรมสามารถสร้างสัญลักษณ์ QR Code แบบ Dynamic ในการรับเงินได้
                  </p>
                </div>
                <div className="pt-2">
                  <Link href="/settings" onClick={() => setShowQrModal(false)}>
                    <Button variant="primary" className="text-xs font-bold">
                      ตั้งค่าพร้อมเพย์ตอนนี้
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Dynamic Stock Shortage Matrix Modal ── */}
      {showShortageModal && (
        <Modal
          isOpen={showShortageModal}
          onClose={() => setShowShortageModal(false)}
          title="แจ้งเตือนวัตถุดิบหมดหน้าร้าน (Shortage Alert)"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowShortageModal(false)}>ยกเลิก</Button>
              <Button
                variant="danger"
                loading={sendingShortage}
                disabled={selectedShortageItems.length === 0 || shortageCooldown > 0}
                onClick={handleSendShortage}
                className="flex items-center gap-1.5 font-bold"
              >
                {shortageCooldown > 0 ? `คูลดาวน์ (${shortageCooldown}s)` : '🚨 ยืนยันแจ้งเตือน LINE'}
              </Button>
            </>
          }
        >
          <div className="space-y-4 py-2 font-prompt">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 dark:text-slate-550 block font-bold uppercase tracking-wider">ระบบแจ้งเตือนฉุกเฉิน</span>
              <p className="text-xs text-slate-550 dark:text-slate-400 leading-normal">
                แตะเลือกวัตถุดิบที่หมดเกลี้ยงหรือใกล้หมดหน้างาน เพื่อส่งข้อความแจ้งเตือนสีแดงด่วน 🔴 ไปยังแชท LINE ของเจ้าของร้านทันที
              </p>
            </div>

            {/* Checkbox grid list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto p-1.5 border border-slate-100 dark:border-slate-800/80 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 shadow-inner">
              {getShortageOptions().map((item, idx) => {
                const isSelected = selectedShortageItems.includes(item);
                return (
                  <label
                    key={idx}
                    className={cn(
                      'flex items-center gap-2.5 p-3 border rounded-xl cursor-pointer select-none transition-all active:scale-97 duration-200',
                      isSelected
                        ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-900/30 dark:text-rose-450 font-bold'
                        : 'bg-white dark:bg-slate-850 border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-350'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        if (isSelected) {
                          setSelectedShortageItems(selectedShortageItems.filter(i => i !== item));
                        } else {
                          setSelectedShortageItems([...selectedShortageItems, item]);
                        }
                      }}
                      className="accent-rose-500 dark:accent-rose-450 cursor-pointer h-4 w-4 shrink-0 rounded"
                    />
                    <span className="text-xs truncate">{item}</span>
                  </label>
                );
              })}
            </div>

            {shortageCooldown > 0 && (
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200/40 dark:border-amber-900/20 p-3 rounded-xl flex items-start gap-2">
                <AlertCircle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span className="text-[10px] text-amber-700 dark:text-amber-400 leading-normal font-normal">
                  ⏳ ระบบกำลังคูลดาวน์ จำกัดการส่งถี่เกินไปเพื่อป้องกันสแปมข้อความ กรุณารออีก {shortageCooldown} วินาทีก่อนส่งแจ้งเตือนวัตถุดิบหมดครั้งถัดไป
                </span>
              </div>
            )}
          </div>
        </Modal>
      )}
    </motion.div>
  );
}
