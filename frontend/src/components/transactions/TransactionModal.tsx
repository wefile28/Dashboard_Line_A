'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';
import { useApp } from '@/contexts/AppContext';
import { getTodayString, cn } from '@/lib/utils';
import { createTransaction, updateTransaction, Transaction, TransactionCreate } from '@/lib/api';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editTransaction?: Transaction | null;
}

const defaultForm: TransactionCreate = {
  type: 'income',
  title: '',
  amount: 0,
  category: '',
  date: getTodayString(),
  note: '',
};

export function TransactionModal({ isOpen, onClose, onSuccess, editTransaction }: TransactionModalProps) {
  const { addToast } = useToast();
  const { categories: allCategories } = useApp();
  const [form, setForm] = useState<TransactionCreate>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editTransaction) {
      setForm({
        type: editTransaction.type,
        title: editTransaction.title,
        amount: editTransaction.amount,
        category: typeof editTransaction.category === 'object' && editTransaction.category
          ? editTransaction.category.name
          : editTransaction.category || '',
        date: editTransaction.date,
        note: editTransaction.note || '',
      });
    } else {
      setForm({ ...defaultForm, date: getTodayString() });
    }
    setErrors({});
  }, [editTransaction, isOpen]);

  const categories = allCategories.filter(c => c.type === form.type);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'กรุณาระบุชื่อรายการ';
    if (!form.amount || form.amount <= 0) errs.amount = 'กรุณาระบุจำนวนเงิน';
    if (!form.category) errs.category = 'กรุณาเลือกหมวดหมู่';
    if (!form.date) errs.date = 'กรุณาเลือกวันที่';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      if (editTransaction) {
        await updateTransaction(editTransaction.id, form);
      } else {
        await createTransaction(form);
      }
      addToast('success', editTransaction ? 'แก้ไขรายการสำเร็จ' : 'เพิ่มรายการสำเร็จ');
      onSuccess();
    } catch (err: any) {
      console.warn('API error, simulating transaction success for demo mode.', err);
      const disableSandbox = process.env.NEXT_PUBLIC_DISABLE_SANDBOX === 'true';
      if (disableSandbox || (err.status && err.status !== 0)) {
        addToast('error', err.message || 'เกิดข้อผิดพลาดในการทำรายการ');
        return;
      }
      // Fallback behavior for mockup sandbox
      await new Promise(r => setTimeout(r, 600));
      addToast('success', editTransaction ? 'แก้ไขรายการสำเร็จ (Sandbox)' : 'เพิ่มรายการสำเร็จ (Sandbox)');
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editTransaction ? 'แก้ไขรายการบัญชี' : 'บันทึกรายการใหม่'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button
            variant={form.type === 'income' ? 'success' : 'danger'}
            loading={loading}
            onClick={handleSubmit}
          >
            บันทึกรายการ
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Giant Segmented Toggle Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1">
          <button
            type="button"
            className={cn(
              'flex-1 text-center py-3 text-sm font-semibold rounded-lg font-prompt transition-all cursor-pointer',
              form.type === 'income'
                ? 'bg-income text-white shadow-md shadow-income/20'
                : 'text-slate-500 hover:text-slate-700'
            )}
            onClick={() => setForm(f => ({ ...f, type: 'income', category: '' }))}
          >
            รายรับ (Income)
          </button>
          <button
            type="button"
            className={cn(
              'flex-1 text-center py-3 text-sm font-semibold rounded-lg font-prompt transition-all cursor-pointer',
              form.type === 'expense'
                ? 'bg-expense text-white shadow-md shadow-expense/20'
                : 'text-slate-500 hover:text-slate-700'
            )}
            onClick={() => setForm(f => ({ ...f, type: 'expense', category: '' }))}
          >
            รายจ่าย (Expense)
          </button>
        </div>

        {/* Title input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 block font-prompt">
            ชื่อรายการ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="เช่น ยอดขายกาแฟสด, ค่าวัตถุดิบนมสด, ค่าน้ำค่านม"
            className={cn(
              'w-full px-4 py-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-4 transition-all outline-none text-sm font-prompt',
              errors.title
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                : 'border-slate-200 focus:border-primary focus:ring-primary/10'
            )}
          />
          {errors.title && <span className="text-xs text-red-500 font-prompt block">{errors.title}</span>}
        </div>

        {/* Amount & Date Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 block font-prompt">
              จำนวนเงิน (฿) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.amount || ''}
              onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
              placeholder="0.00"
              min="0"
              step="0.01"
              className={cn(
                'w-full px-4 py-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-4 transition-all outline-none text-sm font-inter num font-bold',
                errors.amount
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                  : 'border-slate-200 focus:border-primary focus:ring-primary/10'
              )}
            />
            {errors.amount && <span className="text-xs text-red-500 font-prompt block">{errors.amount}</span>}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 block font-prompt">
              วันที่ทำรายการ <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className={cn(
                'w-full px-4 py-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-4 transition-all outline-none text-sm font-prompt',
                errors.date
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                  : 'border-slate-200 focus:border-primary focus:ring-primary/10'
              )}
            />
            {errors.date && <span className="text-xs text-red-500 font-prompt block">{errors.date}</span>}
          </div>
        </div>

        {/* Category Dropdown */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 block font-prompt">
            หมวดหมู่ <span className="text-red-500">*</span>
          </label>
          <select
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className={cn(
              'w-full px-4 py-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-4 transition-all outline-none text-sm font-prompt',
              errors.category
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                : 'border-slate-200 focus:border-primary focus:ring-primary/10'
            )}
          >
            <option value="">เลือกหมวดหมู่รายการ</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
          {errors.category && <span className="text-xs text-red-500 font-prompt block">{errors.category}</span>}
        </div>

        {/* Note textarea */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 block font-prompt">หมายเหตุ (ถ้ามี)</label>
          <textarea
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            placeholder="คำอธิบายเพิ่มเติมหรือรายละเอียดรายการ..."
            rows={3}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-sm font-prompt"
          />
        </div>
      </form>
    </Modal>
  );
}
