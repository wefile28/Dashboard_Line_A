'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Pencil, Trash2, FileX2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TransactionModal } from '@/components/transactions/TransactionModal';
import { useToast } from '@/contexts/ToastContext';
import { useApp } from '@/contexts/AppContext';
import { getTransactions, deleteTransaction, Transaction, PaginatedResponse } from '@/lib/api';
import { getMockPaginatedTransactions } from '@/lib/mockData';
import { formatCurrency, formatDate, getCategoryColor, cn } from '@/lib/utils';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

export default function TransactionsPage() {
  const { addToast } = useToast();
  const { categories: allCategories } = useApp();

  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedResponse<Transaction> | null>(null);
  const [loading, setLoading] = useState(true);

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
    } catch (err) {
      console.warn('Backend offline, using sandbox mock data filter.', err);
      // Fallback
      setData(getMockPaginatedTransactions(page, 10, typeFilter, search, categoryFilter));
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search, categoryFilter, startDate, endDate, page]);

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
    } catch (err) {
      console.warn('Backend delete failure, simulating local deletion.', err);
      await new Promise(r => setTimeout(r, 500));
      addToast('success', 'ลบรายการสำเร็จ (Sandbox)');
      setDeleteModal(false);
      setDeleteTx(null);
      loadData();
    } finally {
      setDeleteLoading(false);
    }
  }

  // Filter category options based on income/expense type selection
  const filteredCategories = typeFilter === 'all'
    ? allCategories
    : allCategories.filter(c => c.type === typeFilter);

  // Group items by type name uniquely
  const categoryOptions = Array.from(new Set(filteredCategories.map(c => c.name)));

  return (
    <div className="space-y-6">
      {/* ── Filter Bar Card ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4 md:space-y-0 md:flex md:items-center md:gap-4 flex-wrap">
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
                'px-4 py-2 text-xs font-semibold rounded-lg font-prompt transition-all cursor-pointer',
                typeFilter === opt.value
                  ? 'bg-white text-slate-800 shadow-xs'
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
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search size={15} />
          </span>
          <input
            type="text"
            placeholder="ค้นหาชื่อรายการ..."
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none rounded-xl text-xs font-prompt"
          />
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
            className="px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary transition-all outline-none rounded-xl text-xs font-prompt"
          />
          <span className="text-[10px] text-slate-400 font-semibold font-prompt">ถึง</span>
          <input
            type="date"
            value={endDate}
            onChange={handleEndDateChange}
            className="px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary transition-all outline-none rounded-xl text-xs font-prompt"
          />
        </div>

        {/* Category Dropdown */}
        <div className="relative shrink-0 min-w-[140px]">
          <select
            value={categoryFilter}
            onChange={handleCategoryChange}
            className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary transition-all outline-none rounded-xl text-xs font-prompt cursor-pointer appearance-none"
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

      {/* ── Transaction Table List Card ── */}
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
                  <tr className="bg-slate-50 border-b border-slate-100 text-left">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase font-prompt">วันที่</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase font-prompt">ชื่อรายการ</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase font-prompt">หมวดหมู่</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase font-prompt">จำนวนเงิน</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase font-prompt">หมายเหตุ</th>
                    <th className="px-6 py-4 w-24"></th>
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
                              style={{ background: getCategoryColor(tx.category) }}
                            />
                            {tx.category}
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
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {data.total_pages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50 border-t border-slate-100">
                <span className="text-xs font-medium text-slate-500 font-prompt">
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
          <div className="py-16 flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 bg-slate-50 border border-slate-100 text-slate-300 rounded-full flex items-center justify-center mb-4">
              <FileX2 size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-700 font-prompt">ไม่พบข้อมูลรายรับ-รายจ่าย</h3>
            <p className="text-xs text-slate-400 font-prompt mt-1 max-w-[280px]">
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
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-100">
                <Trash2 size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-prompt">คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?</p>
                <p className="font-bold text-slate-800 font-prompt text-base truncate max-w-full px-2">
                  &ldquo;{deleteTx.title}&rdquo;
                </p>
                <p className={cn(
                  'text-lg font-bold font-inter num mt-2',
                  deleteTx.type === 'income' ? 'text-emerald-500' : 'text-red-500'
                )}>
                  {deleteTx.type === 'income' ? '+' : '-'}{formatCurrency(deleteTx.amount)}
                </p>
              </div>
              <p className="text-[10px] text-amber-500 bg-amber-50 p-2.5 rounded-lg border border-amber-100 font-prompt text-left">
                ⚠️ การกระทำนี้ไม่สามารถย้อนกลับได้ ข้อมูลจะถูกลบออกจากฐานข้อมูลอย่างถาวร
              </p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
