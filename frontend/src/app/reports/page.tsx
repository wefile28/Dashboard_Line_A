'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Download, TrendingUp, TrendingDown, Calendar, FileDown, Printer, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';
import { getReport, exportCSV, ReportSummary } from '@/lib/api';
import { getMockReport } from '@/lib/mockData';
import { formatCurrency, formatDate, formatThaiMonth, cn, downloadBlob } from '@/lib/utils';

const periods = [
  { value: 'day', label: 'วัน' },
  { value: 'week', label: 'สัปดาห์' },
  { value: 'month', label: 'เดือน' },
  { value: 'year', label: 'ปี' },
];

function ReportTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl border border-slate-100 shadow-lg text-xs leading-relaxed">
      <div className="font-bold text-slate-500 mb-2 font-prompt">{label}</div>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-3 py-0.5 justify-between">
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
            <span>{entry.name === 'income' ? 'รายรับ' : 'รายจ่าย'}</span>
          </div>
          <span className="num font-bold text-slate-800 ml-4">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const { addToast } = useToast();
  const [period, setPeriod] = useState('week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = {
          period,
          start_date: startDate ? startDate : undefined,
          end_date: endDate ? endDate : undefined,
        };
        const res = await getReport(params);
        setReport(res);
      } catch (err) {
        console.warn('Backend is offline, loading mock report summary.', err);
        setReport(getMockReport(period));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [period, startDate, endDate]);

  async function handleExport() {
    setExporting(true);
    try {
      const params = {
        start_date: startDate ? startDate : undefined,
        end_date: endDate ? endDate : undefined,
      };
      const blob = await exportCSV(params);
      downloadBlob(blob, `รายงานบัญชี_UDash_${period || 'custom'}_${new Date().toISOString().split('T')[0]}.csv`);
      addToast('success', 'ดาวน์โหลด CSV สำเร็จ');
    } catch (err) {
      console.warn('API error, simulating local CSV export fallback.', err);
      // Simulate
      await new Promise(r => setTimeout(r, 800));
      const csvContent = '\uFEFFวันที่,รายรับ,รายจ่าย,กำไรสุทธิ\n' +
        (report?.data.map((d: any) => {
          const lbl = 'date' in d ? d.date : `เดือนที่ ${d.month}`;
          return `${lbl},${d.income},${d.expense},${d.profit}`;
        }).join('\n') || '');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `รายงานบัญชี_UDash_${period || 'custom'}_${new Date().toISOString().split('T')[0]}_sandbox.csv`);
      addToast('success', 'ดาวน์โหลด CSV สำเร็จ (Sandbox)');
    } finally {
      setExporting(false);
    }
  }

  // Map charts info
  const chartData = report?.data.map((d: any) => {
    if ('date' in d) {
      const parts = d.date.split('-');
      return {
        label: `${parseInt(parts[2])}/${parseInt(parts[1])}`,
        income: d.income,
        expense: d.expense,
      };
    } else {
      return {
        label: formatThaiMonth(d.month),
        income: d.income,
        expense: d.expense,
      };
    }
  }) || [];

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.08, duration: 0.4 },
    }),
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* 🖨️ Print-Only Elegant Header Letterhead */}
      <div className="hidden print:block border-b-2 border-slate-300 pb-5 mb-8 font-prompt">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">รายงานสรุปผลการดำเนินงานทางบัญชี U-Dash Pro</h1>
            <p className="text-xs text-slate-500 mt-1">เอกสารแสดงรายรับ รายจ่าย และผลกำไรสุทธิอย่างเป็นทางการสำหรับร้านค้า</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 uppercase tracking-wider num font-inter">
              U-DASH MASTER PRO REPORT
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-6 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
          <div>
            <span className="font-semibold text-slate-800">ช่วงเวลาสรุป:</span> {
              period === 'day' ? 'รายวัน' : period === 'week' ? 'รายสัปดาห์ (7 วันล่าสุด)' : period === 'month' ? 'รายเดือน' : period === 'year' ? 'รายปี' : 'กำหนดช่วงเวลาเอง'
            } {startDate && `(${startDate}`} {endDate && `ถึง ${endDate})`}
          </div>
          <div className="text-right">
            <span className="font-semibold text-slate-800">วันที่พิมพ์เอกสาร:</span> {new Date().toLocaleDateString('th-TH')} | <span className="font-semibold text-slate-800">สถานะระบบ:</span> ยืนยันข้อมูลถูกต้อง (Verified)
          </div>
        </div>
      </div>

      {/* ── Period & Range Selector Bar ── */}
      <div className="bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        {/* Period Pills */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1 shrink-0 self-start md:self-auto">
          {periods.map(p => (
            <button
              key={p.value}
              className={cn(
                'px-4 py-2 text-xs font-semibold rounded-lg font-prompt transition-all cursor-pointer',
                period === p.value
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              )}
              onClick={() => { setPeriod(p.value); setStartDate(''); setEndDate(''); }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date range fields */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 shrink-0">
            <Calendar size={16} />
          </span>
          <input
            type="date"
            value={startDate}
            onChange={e => { setStartDate(e.target.value); setPeriod(''); }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary transition-all outline-none rounded-xl text-xs font-prompt"
          />
          <span className="text-[10px] text-slate-400 font-semibold font-prompt">ถึง</span>
          <input
            type="date"
            value={endDate}
            onChange={e => { setEndDate(e.target.value); setPeriod(''); }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary transition-all outline-none rounded-xl text-xs font-prompt"
          />
        </div>
      </div>

      {/* ── Summary Stats cards ── */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              label: 'รายรับรวมสุทธิ',
              amount: report.total_income,
              type: 'income',
              colors: 'border-l-4 border-income bg-white text-emerald-600',
              trend: 'เงินไหลเข้าสะสมช่วงเวลา'
            },
            {
              label: 'รายจ่ายรวมสุทธิ',
              amount: report.total_expense,
              type: 'expense',
              colors: 'border-l-4 border-expense bg-white text-rose-500',
              trend: 'ต้นทุนและรายจ่ายช่วงเวลา'
            },
            {
              label: 'ผลกำไรส่วนต่าง',
              amount: report.net_profit,
              type: 'profit',
              colors: report.net_profit >= 0 ? 'border-l-4 border-profit bg-white text-blue-600' : 'border-l-4 border-expense bg-white text-rose-500',
              trend: report.net_profit >= 0 ? 'กำไรเติบโตเป็นบวก' : 'ขาดทุนสะสมในรอบนี้'
            },
          ].map((card, i) => (
            <motion.div
              key={card.type}
              className={`rounded-2xl p-6 shadow-xs ${card.colors} flex flex-col justify-between`}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <div className="space-y-1">
                <span className="text-slate-400 text-xs font-medium font-prompt">{card.label}</span>
                <div className="text-2xl font-bold font-inter num tracking-tight">
                  {formatCurrency(card.amount)}
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-prompt border-t border-slate-100 pt-3 mt-4">
                {card.type === 'profit' && report.net_profit >= 0 ? (
                  <TrendingUp size={12} className="text-emerald-500" />
                ) : card.type === 'profit' ? (
                  <TrendingDown size={12} className="text-rose-500" />
                ) : card.type === 'income' ? (
                  <TrendingUp size={12} className="text-emerald-500" />
                ) : (
                  <TrendingDown size={12} className="text-rose-500" />
                )}
                <span>{card.trend}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Comparison Chart ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs"
      >
        <h3 className="text-sm md:text-base font-bold text-slate-800 font-prompt mb-6 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-primary rounded-full" />
          แผนภูมิมิติเปรียบเทียบรายรับและรายจ่าย
        </h3>
        
        <div className="h-[320px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={6} margin={{ left: -10, right: 10, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} stroke="#E2E8F0" />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} stroke="#E2E8F0" tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ReportTooltip />} />
                <Legend formatter={(value) => (value === 'income' ? 'รายรับ (Income)' : 'รายจ่าย (Expense)')} />
                <Bar dataKey="income" name="income" fill="#00C853" radius={[5, 5, 0, 0]} />
                <Bar dataKey="expense" name="expense" fill="#FF5252" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm font-prompt">
              ไม่มีข้อมูลในช่วงเวลาดังกล่าวสำหรับการพล็อตกราฟ
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Financial Ledger Table Breakdown ── */}
      {report && report.data && report.data.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors"
        >
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 font-prompt flex items-center gap-2">
              <Receipt size={18} className="text-primary dark:text-[#2979FF]" />
              ตารางจำแนกรายละเอียดบัญชีรายวัน / รายเดือน (Financial Ledger)
            </h3>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold px-2.5 py-1 rounded-md font-prompt">
              {report.data.length} รายการสรุป
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase font-prompt">
                  <th className="px-6 py-3.5">วันที่ / รอบการบัญชี</th>
                  <th className="px-6 py-3.5 text-right">รายรับสะสม (Revenue)</th>
                  <th className="px-6 py-3.5 text-right">รายจ่ายสะสม (Expense)</th>
                  <th className="px-6 py-3.5 text-right">กำไรสุทธิ (Net Profit)</th>
                  <th className="px-6 py-3.5 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-prompt">
                {report.data.map((item: any, idx: number) => {
                  const dateLabel = 'date' in item 
                    ? formatDate(item.date) 
                    : `${formatThaiMonth(item.month)} ${item.year + 543}`;
                  const isProfit = item.profit >= 0;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">{dateLabel}</td>
                      <td className="px-6 py-4 text-right text-emerald-600 dark:text-emerald-400 font-bold font-inter num">
                        +{formatCurrency(item.income)}
                      </td>
                      <td className="px-6 py-4 text-right text-rose-500 dark:text-rose-400 font-bold font-inter num">
                        -{formatCurrency(item.expense)}
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-right font-extrabold font-inter num text-base",
                        isProfit ? "text-blue-600 dark:text-blue-400" : "text-rose-500 dark:text-rose-400"
                      )}>
                        {isProfit ? '+' : ''}{formatCurrency(item.profit)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold select-none",
                          isProfit 
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" 
                            : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                        )}>
                          {isProfit ? '🟢 กำไร' : '🔴 ขาดทุนสะสม'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ── CSV & PDF Export action block ── */}
      <div className="flex justify-end gap-3 no-print">
        <Button
          variant="outline"
          onClick={() => window.print()}
          className="flex items-center gap-2 shadow-xs bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-prompt"
        >
          <Printer size={16} />
          <span>พิมพ์รายงาน (PDF)</span>
        </Button>

        <Button
          variant="primary"
          onClick={handleExport}
          loading={exporting}
          className="flex items-center gap-2 shadow-xs font-prompt"
        >
          <FileDown size={16} />
          <span>ดาวน์โหลดรายงานสรุป (.CSV)</span>
        </Button>
      </div>
    </div>
  );
}
