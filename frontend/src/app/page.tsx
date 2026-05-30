'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUp, TrendingDown, ArrowRight,
  Wallet, CreditCard, PiggyBank, Receipt
} from 'lucide-react';
import { getDashboardSummary, DashboardSummary } from '@/lib/api';
import { mockDashboard } from '@/lib/mockData';
import {
  formatCurrency, formatDate, formatThaiMonth, formatPercent,
  getCategoryColor, cn
} from '@/lib/utils';
import { DashboardSkeleton } from '@/components/ui/LoadingSkeleton';

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
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await getDashboardSummary();
        setData(res);
      } catch (err) {
        console.warn('Backend is offline, using mock dashboard data.', err);
        setData(mockDashboard);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !data) {
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
      bgLight: 'bg-emerald-50 text-emerald-600',
      sparkData: data.weekly_data.map(d => ({ v: d.income })),
    },
    {
      label: 'รายจ่ายวันนี้',
      amount: data.today_expense,
      change: data.expense_change,
      icon: <CreditCard size={24} />,
      type: 'expense' as const,
      color: '#FF5252',
      bgLight: 'bg-rose-50 text-rose-600',
      sparkData: data.weekly_data.map(d => ({ v: d.expense })),
    },
    {
      label: 'กำไรสุทธิวันนี้',
      amount: data.today_profit,
      change: data.profit_change,
      icon: <PiggyBank size={24} />,
      type: 'profit' as const,
      color: '#2979FF',
      bgLight: 'bg-blue-50 text-blue-600',
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
      {/* ── Summary Grid Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {summaryCards.map((card) => (
          <motion.div
            key={card.type}
            variants={cardVariants}
            className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col relative overflow-hidden group min-h-[170px]"
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
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-rose-50 text-rose-600'
                )}
              >
                {card.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {formatPercent(card.change)}
              </span>
            </div>

            {/* Middle label & amount */}
            <div className="space-y-1 z-10">
              <div className="text-slate-400 text-xs font-medium font-prompt">{card.label}</div>
              <div className="text-2xl font-bold text-slate-800 tracking-tight font-inter num">
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
          className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm"
        >
          <h3 className="text-sm md:text-base font-bold text-slate-800 font-prompt mb-6 flex items-center gap-2">
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
          className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm"
        >
          <h3 className="text-sm md:text-base font-bold text-slate-800 font-prompt mb-6 flex items-center gap-2">
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
          className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm lg:col-span-2"
        >
          <h3 className="text-sm md:text-base font-bold text-slate-800 font-prompt mb-6 flex items-center gap-2">
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
                <div key={i} className="flex items-center gap-3 p-3 border border-slate-50 hover:bg-slate-50 rounded-xl transition-all">
                  <span className="w-3.5 h-3.5 rounded-lg shrink-0" style={{ background: item.color }} />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-semibold text-slate-700 font-prompt truncate">{item.name}</span>
                    <span className="text-[10px] text-slate-400 font-inter num mt-0.5">
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
        className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="text-sm md:text-base font-bold text-slate-800 font-prompt flex items-center gap-2">
            <Receipt size={18} className="text-primary" />
            รายการล่าสุด 5 รายการ
          </h3>
          <Link
            href="/transactions"
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark transition-colors font-prompt cursor-pointer select-none"
          >
            ดูรายการทั้งหมด <ArrowRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {data.recent_transactions.length > 0 ? (
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-left">
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase font-prompt">วันที่</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase font-prompt">ชื่อรายการ</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase font-prompt">หมวดหมู่</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase font-prompt text-right">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {data.recent_transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 font-prompt whitespace-nowrap">{formatDate(tx.date)}</td>
                    <td className="px-6 py-4 text-slate-800 font-semibold font-prompt whitespace-nowrap">{tx.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 text-slate-600 rounded-full text-xs font-prompt">
                        <span className="w-2 h-2 rounded-full" style={{ background: getCategoryColor(tx.category) }} />
                        {tx.category}
                      </span>
                    </td>
                    <td className={cn(
                      'px-6 py-4 text-right font-bold font-inter num whitespace-nowrap text-base',
                      tx.type === 'income' ? 'text-emerald-600' : 'text-rose-500'
                    )}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 font-prompt">
              <Receipt size={40} className="stroke-1 mb-2 text-slate-300" />
              <span>ยังไม่มีรายการในประวัติ</span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
