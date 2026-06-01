'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Pencil, Trash2, FileX2, ChevronLeft, ChevronRight, Filter, PlusCircle, Coffee, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TransactionModal } from '@/components/transactions/TransactionModal';
import { useToast } from '@/contexts/ToastContext';
import { useApp } from '@/contexts/AppContext';
import { getTransactions, deleteTransaction, createTransaction, Transaction, PaginatedResponse } from '@/lib/api';
import { getMockPaginatedTransactions } from '@/lib/mockData';
import { formatCurrency, formatDate, getCategoryColor, cn, getTodayString } from '@/lib/utils';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

export default function TransactionsPage() {
  const { addToast } = useToast();
  const { categories: allCategories, userRole } = useApp();

  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedResponse<Transaction> | null>(null);
  const [loading, setLoading] = useState(true);

  // Quick Cashier Entry states
  const [quickAmount, setQuickAmount] = useState('');
  const [quickType, setQuickType] = useState<'income' | 'expense'>('income');
  const [quickCategory, setQuickCategory] = useState('');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);

  // Modal states
  const [editModal, setEditModal] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        type: typeFilter !== 'all' ? typeFilter : undefined,
        search: search ? search : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        start_date: startDate ? startDate : undefined,
        end_date: endDate ? endDate : undefined,
        page,
        per_page: 10,
      };

      const res = await getTransactions(params);
      setData(res);
    } catch (err: any) {
      console.warn('Backend offline, using sandbox mock data filter.', err);
      if (err.status && err.status !== 0) {
        addToast('error', err.message || 'โหลดข้อมูลล้มเหลว');
        return;
      }
      setData(getMockPaginatedTransactions(page, 10, typeFilter, search, categoryFilter));
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search, categoryFilter, startDate, endDate, page, addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page when filters change
  const handleTypeChange = (val: string) => {
    setTypeFilter(val);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoryFilter(e.target.value);
    setPage(1);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
    setPage(1);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
    setPage(1);
  };

  function handleEdit(tx: Transaction) {
    setEditTx(tx);
    setEditModal(true);
  }

  function handleDeleteClick(tx: Transaction) {
    setDeleteTx(tx);
    setDeleteModal(true);
  }

  async function handleDelete() {
    if (!deleteTx) return;
    setDeleteLoading(true);
    try {
      await deleteTransaction(deleteTx.id);
      addToast('success', 'ลบรายการสำเร็จ');
      setDeleteModal(false);
      setDeleteTx(null);
      loadData();
    } catch (err: any) {
      console.warn('Backend delete failure, simulating local deletion.', err);
      const disableSandbox = process.env.NEXT_PUBLIC_DISABLE_SANDBOX === 'true';
      if (disableSandbox || (err.status && err.status !== 0)) {
        addToast('error', err.message || 'ลบรายการล้มเหลว');
        return;
      }
      await new Promise(r => setTimeout(r, 500));
      addToast('success', 'ลบรายการสำเร็จ (Sandbox)');
      setDeleteModal(false);
      setDeleteTx(null);
      loadData();
    } finally {
      setDeleteLoading(false);
    }
  }

  // Handle Quick Entry Category select to auto-fill title
  const handleQuickCategorySelect = (catName: string) => {
    setQuickCategory(catName);
    if (!quickTitle.trim()) {
      if (catName === 'รับเงินสดหน้าร้าน') {
        setQuickTitle('ขายหน้าร้าน (เงินสด)');
      } else if (catName === 'ยอดโอน / สแกน QR') {
        setQuickTitle('ขายหน้าร้าน (โอน QR)');
      } else if (catName.includes('เดลิเวอรี่')) {
        setQuickTitle('ออเดอร์เดลิเวอรี่');
      } else if (catName.includes('ค่าวัตถุดิบ')) {
        setQuickTitle('ซื้อวัตถุดิบด่วน');
      } else if (catName.includes('ค่าจ้าง')) {
        setQuickTitle('จ่ายค่าแรงพนักงาน');
      } else if (catName.includes('ค่าน้ำ')) {
        setQuickTitle('จ่ายค่าน้ำค่าไฟ');
      } else if (catName.includes('ค่าการตลาด')) {
        setQuickTitle('ยิงแอดโปรโมทร้าน');
      } else if (catName.includes('ค่าเช่า')) {
        setQuickTitle('จ่ายค่าเช่าร้าน');
      } else {
        setQuickTitle(catName);
      }
    }
  };

  // Submit quick cashier entry
  async function handleQuickSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountFloat = parseFloat(quickAmount);
    if (!quickAmount || isNaN(amountFloat) || amountFloat <= 0) {
      addToast('error', 'กรุณาระบุจำนวนเงินคีย์ขายยอดเงินสดจริง');
      return;
    }
    if (!quickCategory) {
      addToast('error', 'กรุณาเลือกหมวดหมู่ธุรกรรม');
      return;
    }

    const titleFinal = quickTitle.trim() || `${quickType === 'income' ? 'ยอดขาย' : 'ยอดจ่าย'} - ${quickCategory}`;

    setQuickLoading(true);
    try {
      const payload = {
        type: quickType,
        title: titleFinal,
        amount: amountFloat,
        category: quickCategory,
        date: getTodayString(),
        note: quickNote.trim() || undefined,
      };

      await createTransaction(payload);
      addToast('success', 'บันทึกยอดส่งเข้า LINE เรียบร้อยแล้ว!');
      
      // Clear inputs
      setQuickAmount('');
      setQuickCategory('');
      setQuickTitle('');
      setQuickNote('');
      
      // Reload table
      loadData();
    } catch (err: any) {
      console.warn('API error during quick submit, running demo simulation:', err);
      const disableSandbox = process.env.NEXT_PUBLIC_DISABLE_SANDBOX === 'true';
      if (disableSandbox || (err.status && err.status !== 0)) {
        addToast('error', err.message || 'บันทึกข้อมูลล้มเหลว');
        return;
      }
      await new Promise(r => setTimeout(r, 600));
      addToast('success', 'บันทึกยอดเข้าระบบเรียบร้อย! (Sandbox)');
      
      setQuickAmount('');
      setQuickCategory('');
      setQuickTitle('');
      setQuickNote('');
      loadData();
    } finally {
      setQuickLoading(false);
    }
  }

  // Filter category options based on type
  const activeQuickCategories = allCategories.filter(c => c.type === quickType);
  const filteredCategories = typeFilter === 'all'
    ? allCategories
    : allCategories.filter(c => c.type === typeFilter);

  const categoryOptions = Array.from(new Set(filteredCategories.map(c => c.name)));

  return (
    <div className="space-y-6">
      
      {/* 📱 1. CASHIER QUICK DATA ENTRY PANEL */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white border border-slate-200/80 rounded-3xl p-5 md:p-6 shadow-sm font-prompt"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-50 text-primary rounded-xl flex items-center justify-center">
              <Coffee size={18} />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-bold text-slate-800 leading-tight">
                {userRole === 'employee' ? 'ระบบเครื่องคีย์ยอดหน้าร้าน (Cashier Quick-Entry)' : 'บันทึกรายการด่วนหน้าเคาน์เตอร์'}
              </h3>
              <p className="text-[10px] text-slate-400 font-normal">ป้อนยอดเงินสด/โอนเพื่อส่งแจ้งเตือน LINE หาเถ้าแก่เรียลไทม์</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#1565C0] dark:text-[#2979FF] bg-blue-50 px-2.5 py-1.5 rounded-full select-none flex items-center gap-1.5">
            <Sparkles size={11} className="animate-pulse" />
            EASY BARISTA INPUT
          </span>
        </div>

        <form onSubmit={handleQuickSubmit} className="space-y-4">
          {/* Income/Expense Toggle + Big Amount Input */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Toggle */}
            <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1 shrink-0 h-13">
              <button
                type="button"
                className={cn(
                  'flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none active:scale-95 duration-200',
                  quickType === 'income'
                    ? 'bg-income text-white shadow-md shadow-income/20'
                    : 'text-slate-500 hover:text-slate-700'
                )}
                onClick={() => {
                  setQuickType('income');
                  setQuickCategory('');
                }}
              >
                💰 รับเงินสด / โอน
              </button>
              <button
                type="button"
                className={cn(
                  'flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none active:scale-95 duration-200',
                  quickType === 'expense'
                    ? 'bg-expense text-white shadow-md shadow-expense/20'
                    : 'text-slate-500 hover:text-slate-700'
                )}
                onClick={() => {
                  setQuickType('expense');
                  setQuickCategory('');
                }}
              >
                💸 รายจ่ายหน้าร้าน
              </button>
            </div>

            {/* Giant Amount Input */}
            <div className="relative md:col-span-2">
              <input
                type="number"
                inputMode="decimal"
                value={quickAmount}
                onChange={e => setQuickAmount(e.target.value)}
                placeholder="ระบุยอดเงิน (เช่น 120)"
                min="0"
                step="0.01"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl transition-all outline-none text-2xl font-inter num font-extrabold text-slate-800 placeholder-slate-350 tracking-tight"
              />
              <span className="absolute inset-y-0 right-4 flex items-center font-bold text-slate-400 text-lg select-none">บาท (฿)</span>
            </div>
          </div>

          {/* Quick-select Categories pills */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 block">แตะเลือกหมวดหมู่รายการ <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-2">
              {activeQuickCategories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleQuickCategorySelect(cat.name)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 border hover:bg-slate-100 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer select-none active:scale-95",
                    quickCategory === cat.name
                      ? "bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
                      : "border-slate-200 text-slate-700"
                  )}
                >
                  <span className="text-sm shrink-0">{cat.icon || '☕'}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Text/Note optional inputs (Toggled cleanly for simplicity) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 block">ชื่อรายการย่อ (ทางเลือก - ออโต้จากหมวดหมู่)</label>
              <input
                type="text"
                value={quickTitle}
                onChange={e => setQuickTitle(e.target.value)}
                placeholder="เช่น ลาเต้เย็นพรีเมียม, เค้กส้ม"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary transition-all outline-none rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 block">หมายเหตุย่อ / สลิปโอน (ถ้ามี)</label>
              <input
                type="text"
                value={quickNote}
                onChange={e => setQuickNote(e.target.value)}
                placeholder="เช่น เงินสดจากเก๊ะ, กุ๊กเก๋สั่งเอง"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary transition-all outline-none rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Submit Action Button */}
          <div className="pt-2">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={quickLoading}
              className={cn(
                "w-full py-3.5 px-4 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer select-none disabled:opacity-75 disabled:cursor-not-allowed text-sm",
                quickType === 'income'
                  ? "bg-income hover:bg-emerald-600 shadow-emerald-500/10 hover:shadow-emerald-500/20"
                  : "bg-expense hover:bg-rose-600 shadow-rose-500/10 hover:shadow-rose-500/20"
              )}
            >
              <PlusCircle size={16} />
              {quickLoading ? '⏳ กำลังบันทึกธุรกรรมลงฐานข้อมูล...' : '💾 กดบันทึกยอด (ส่ง LINE เข้าเถ้าแก่เรียลไทม์)'}
            </motion.button>
          </div>
        </form>
      </motion.div>

      {/* ── 2. FILTER BAR CARD ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4 md:space-y-0 md:flex md:items-center md:gap-4 flex-wrap font-prompt">
        {/* Income/Expense Pills Selector */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1 shrink-0">
          {[
            { value: 'all', label: 'ทั้งหมด' },
            { value: 'income', label: 'รายรับ' },
            { value: 'expense', label: 'รายจ่าย' },
          ].map(opt => (
            <button
              key={opt.value}
              className={cn(
                'px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none active:scale-95 duration-200',
                typeFilter === opt.value
                  ? 'bg-white text-slate-800 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-700'
              )}
              onClick={() => handleTypeChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Text search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
            <Search size={15} />
          </span>
          <input
            type="text"
            placeholder="พิมพ์ค้นหาประวัติย้อนหลัง เช่น ชื่อสินค้า, หมายเหตุ..."
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none rounded-xl text-xs"
          />
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
            className="px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary transition-all outline-none rounded-xl text-xs"
          />
          <span className="text-[10px] text-slate-400 font-semibold">ถึง</span>
          <input
            type="date"
            value={endDate}
            onChange={handleEndDateChange}
            className="px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary transition-all outline-none rounded-xl text-xs"
          />
        </div>

        {/* Category Dropdown */}
        <div className="relative shrink-0 min-w-[140px]">
          <select
            value={categoryFilter}
            onChange={handleCategoryChange}
            className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary transition-all outline-none rounded-xl text-xs cursor-pointer appearance-none font-bold"
          >
            <option value="all">ทุกหมวดหมู่</option>
            {categoryOptions.map(catName => (
              <option key={catName} value={catName}>{catName}</option>
            ))}
          </select>
          <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 pointer-events-none">
            <Filter size={12} />
          </span>
        </div>
      </div>

      {/* ── 3. TRANSACTION HISTORY TABLE CARD ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} />
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-left font-prompt">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">วันที่ป้อน</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">รายละเอียดรายการ</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">หมวดหมู่</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">ยอดเงิน (บาท)</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">บันทึกสลิป/คีย์</th>
                    {userRole !== 'employee' && <th className="px-6 py-4 w-24"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  <AnimatePresence mode="popLayout">
                    {data.items.map((tx, idx) => (
                      <motion.tr
                        key={tx.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25, delay: idx * 0.03 }}
                        className="hover:bg-slate-50/50 transition-colors"
                        layout
                      >
                        <td className="px-6 py-4.5 text-slate-500 font-prompt whitespace-nowrap">
                          {formatDate(tx.date)}
                        </td>
                        <td className="px-6 py-4.5 text-slate-800 font-semibold font-prompt whitespace-nowrap">
                          {tx.title}
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-100 text-slate-600 rounded-full text-xs font-prompt">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
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
                          'px-6 py-4.5 font-bold font-inter num whitespace-nowrap text-base',
                          tx.type === 'income' ? 'text-emerald-600' : 'text-rose-500'
                        )}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </td>
                        <td className="px-6 py-4.5 text-slate-400 font-prompt text-xs max-w-[150px] truncate" title={tx.note}>
                          {tx.note || '-'}
                        </td>
                        
                        {/* Edit/Delete columns are dynamically hidden from employee role for Blind Mode */}
                        {userRole !== 'employee' && (
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={() => handleEdit(tx)}
                                className="p-2 hover:bg-slate-50 text-slate-500 hover:text-primary rounded-xl transition-colors cursor-pointer"
                                title="แก้ไขรายการ"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(tx)}
                                className="p-2 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl transition-colors cursor-pointer"
                                title="ลบรายการ"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        )}
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {data.total_pages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50 border-t border-slate-100 font-prompt">
                <span className="text-xs font-medium text-slate-500">
                  แสดง {(data.page - 1) * data.per_page + 1}–{Math.min(data.page * data.per_page, data.total)} จาก {data.total} รายการ
                </span>
                
                <div className="flex items-center gap-1">
                  <button
                    className="p-2 hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent rounded-xl transition-all cursor-pointer"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {Array.from({ length: data.total_pages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      className={cn(
                        'w-8 h-8 flex items-center justify-center text-xs font-bold font-inter rounded-xl transition-all cursor-pointer',
                        page === p
                          ? 'bg-primary text-white shadow-sm shadow-primary/20'
                          : 'hover:bg-white text-slate-600 border border-transparent hover:border-slate-200'
                      )}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    className="p-2 hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent rounded-xl transition-all cursor-pointer"
                    onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
                    disabled={page >= data.total_pages}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-16 flex flex-col items-center justify-center text-center p-6 font-prompt">
            <div className="w-16 h-16 bg-slate-50 border border-slate-100 text-slate-300 rounded-full flex items-center justify-center mb-4">
              <FileX2 size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-700">ไม่พบข้อมูลรายรับ-รายจ่าย</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
              ไม่มีข้อมูลที่ตรงตามตัวเลือกการค้นหาของคุณ ลองขยายตัวกรองหรือเพิ่มรายการใหม่
            </p>
          </div>
        )}
      </div>

      {/* Edit Transaction Modal */}
      {editModal && (
        <TransactionModal
          isOpen={editModal}
          onClose={() => { setEditModal(false); setEditTx(null); }}
          onSuccess={() => { setEditModal(false); setEditTx(null); loadData(); }}
          editTransaction={editTx}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <Modal
          isOpen={deleteModal}
          onClose={() => { setDeleteModal(false); setDeleteTx(null); }}
          title="ยืนยันการลบรายการบัญชี"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => { setDeleteModal(false); setDeleteTx(null); }}>
                ยกเลิก
              </Button>
              <Button variant="danger" loading={deleteLoading} onClick={handleDelete}>
                ยืนยันการลบ
              </Button>
            </>
          }
        >
          {deleteTx && (
            <div className="text-center py-4 space-y-4 font-prompt">
              <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-100">
                <Trash2 size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-400">คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?</p>
                <p className="font-bold text-slate-800 text-base truncate max-w-full px-2">
                  &ldquo;{deleteTx.title}&rdquo;
                </p>
                <p className={cn(
                  'text-lg font-bold font-inter num mt-2',
                  deleteTx.type === 'income' ? 'text-emerald-500' : 'text-red-500'
                )}>
                  {deleteTx.type === 'income' ? '+' : '-'}{formatCurrency(deleteTx.amount)}
                </p>
              </div>
              <p className="text-[10px] text-amber-500 bg-amber-50 p-2.5 rounded-lg border border-amber-100 text-left">
                ⚠️ การกระทำนี้ไม่สามารถย้อนกลับได้ ข้อมูลจะถูกลบออกจากฐานข้อมูลอย่างถาวร
              </p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
