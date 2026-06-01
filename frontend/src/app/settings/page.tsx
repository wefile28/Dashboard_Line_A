'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Store, Bell, Tag, Database,
  Send, Plus, Pencil, Trash2, Check, X, RotateCcw, Image as ImageIcon, Heart, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/contexts/AppContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import {
  getSettings, updateSettings, testLineNotify, resetData,
  getCategories, createCategory, updateCategory, deleteCategory, Category, changePassword,
  downloadBackup, restoreBackup
} from '@/lib/api';
import { mockSettings } from '@/lib/mockData';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { settings, setSettings, setShopName, categories, setCategories, refreshCategories, refreshSettings, userRole } = useApp();
  const router = useRouter();
  const { addToast } = useToast();

  useEffect(() => {
    if (userRole === 'employee') {
      router.push('/transactions');
    }
  }, [userRole, router]);

  // Shop settings
  const [shopNameInput, setShopNameInput] = useState(settings.shop_name);
  const [promptpayIdInput, setPromptpayIdInput] = useState(settings.promptpay_id || '');
  const [promptpayNameInput, setPromptpayNameInput] = useState(settings.promptpay_name || '');
  const [shortageItemsInput, setShortageItemsInput] = useState(settings.shortage_items || '');
  const [savingShop, setSavingShop] = useState(false);

  // LINE settings
  const [testingLine, setTestingLine] = useState(false);
  const [lineConnected, setLineConnected] = useState(settings.line_connected);

  // Categories Tab and inline edit states
  const [catTab, setCatTab] = useState<'income' | 'expense'>('income');
  const [editingCat, setEditingCat] = useState<number | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [newCatName, setNewCatName] = useState('');

  // Reset modal
  const [resetModal, setResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Backup & Restore states
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [restoreModal, setRestoreModal] = useState(false);

  useEffect(() => {
    setShopNameInput(settings.shop_name);
    setPromptpayIdInput(settings.promptpay_id || '');
    setPromptpayNameInput(settings.promptpay_name || '');
    setShortageItemsInput(settings.shortage_items || '');
    setLineConnected(settings.line_connected);
  }, [settings]);

  // Change Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      addToast('error', 'กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่');
      return;
    }
    if (newPassword.length < 6) {
      addToast('error', 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      addToast('success', 'เปลี่ยนรหัสผ่านสำเร็จแล้ว!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      console.warn('Change password error:', err);
      addToast('error', err.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
    } finally {
      setChangingPassword(false);
    }
  }

  // ── SQLite Backup & Restore Handlers ──
  async function handleBackupDownload() {
    setBackingUp(true);
    try {
      const blob = await downloadBackup();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `udash_backup_${new Date().toISOString().split('T')[0]}.db`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      addToast('success', 'ดาวน์โหลดไฟล์ฐานข้อมูลสำรองสำเร็จ! กรุณาเก็บไว้ในที่ปลอดภัย');
    } catch (err: any) {
      console.warn('Backup error:', err);
      addToast('error', err.message || 'สำรองข้อมูลล้มเหลว');
    } finally {
      setBackingUp(false);
    }
  }

  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.db')) {
      addToast('error', 'กรุณาอัปโหลดไฟล์ที่มีนามสกุล .db เท่านั้น');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setRestoreModal(true);
    e.target.value = '';
  }

  async function executeRestore() {
    if (!selectedFile) return;
    setRestoring(true);
    try {
      const res = await restoreBackup(selectedFile);
      if (res.success) {
        addToast('success', 'กู้คืนระบบสำเร็จแล้ว! กำลังรีโหลดระบบ...');
        setRestoreModal(false);
        setSelectedFile(null);
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        addToast('error', res.message || 'กู้คืนข้อมูลไม่สำเร็จ');
      }
    } catch (err: any) {
      console.warn('Restore error:', err);
      addToast('error', err.message || 'เกิดข้อผิดพลาดในการอัปโหลดกู้คืนข้อมูล');
    } finally {
      setRestoring(false);
    }
  }

  // ── Save Shop Settings ──
  async function handleSaveShop() {
    if (!shopNameInput.trim()) {
      addToast('error', 'กรุณาระบุชื่อร้านค้า');
      return;
    }
    
    // Front-end Validation for promptpay_id (Must be 10 or 13 digits)
    if (promptpayIdInput.trim()) {
      const cleanPP = promptpayIdInput.trim();
      if (!/^\d+$/.test(cleanPP) || (cleanPP.length !== 10 && cleanPP.length !== 13)) {
        addToast('error', 'หมายเลขพร้อมเพย์ต้องเป็นตัวเลขล้วน ความยาว 10 หลัก (เบอร์มือถือ) หรือ 13 หลัก (เลขประจำตัวประชาชน) เท่านั้น');
        return;
      }
    }

    setSavingShop(true);
    try {
      const payload = {
        shop_name: shopNameInput.trim(),
        promptpay_id: promptpayIdInput.trim(),
        promptpay_name: promptpayNameInput.trim(),
        shortage_items: shortageItemsInput.trim()
      };
      const updated = await updateSettings(payload);
      setSettings(updated as any);
      setShopName(updated.shop_name || shopNameInput);
      addToast('success', 'บันทึกข้อมูลตั้งค่าร้านค้าสำเร็จ');
      refreshSettings();
    } catch (err: any) {
      console.warn('API error saving shop settings, simulating locally.', err);
      const disableSandbox = process.env.NEXT_PUBLIC_DISABLE_SANDBOX === 'true';
      if (disableSandbox || (err.status && err.status !== 0)) {
        addToast('error', err.message || 'บันทึกข้อมูลร้านค้าล้มเหลว');
        return;
      }
      // Sandbox fallback
      const updated = {
        ...settings,
        shop_name: shopNameInput,
        promptpay_id: promptpayIdInput,
        promptpay_name: promptpayNameInput,
        shortage_items: shortageItemsInput
      };
      setSettings(updated);
      setShopName(shopNameInput);
      addToast('success', 'บันทึกข้อมูลร้านค้าสำเร็จ (Sandbox)');
    } finally {
      setSavingShop(false);
    }
  }

  // ── Test LINE Notify (No Token field shown!) ──
  async function handleTestLine() {
    setTestingLine(true);
    try {
      const res = await testLineNotify();
      if (res.success) {
        addToast('success', 'ส่งข้อความทดสอบสำเร็จ! ตรวจสอบแชท LINE');
      } else {
        addToast('error', res.message || 'ส่งทดสอบไม่สำเร็จ');
      }
    } catch (err: any) {
      console.warn('API test send error, simulating sandbox response.', err);
      const disableSandbox = process.env.NEXT_PUBLIC_DISABLE_SANDBOX === 'true';
      if (disableSandbox || (err.status && err.status !== 0)) {
        addToast('error', err.message || 'ส่งทดสอบไม่สำเร็จ');
        return;
      }
      await new Promise(r => setTimeout(r, 600));
      addToast('success', 'ส่งข้อความทดสอบสำเร็จ! (Sandbox)');
    } finally {
      setTestingLine(false);
    }
  }

  // ── Categories CRUD ──
  const filteredCats = categories.filter(c => c.type === catTab);

  function startEditCat(cat: Category) {
    setEditingCat(cat.id);
    setEditCatName(cat.name);
  }

  async function saveEditCat(cat: Category) {
    if (!editCatName.trim()) {
      addToast('error', 'กรุณากรอกชื่อหมวดหมู่');
      return;
    }
    try {
      const updated = await updateCategory(cat.id, { name: editCatName.trim(), color: cat.color });
      setCategories(categories.map(c => c.id === cat.id ? updated : c));
      setEditingCat(null);
      addToast('success', 'แก้ไขหมวดหมู่สำเร็จ');
    } catch (err: any) {
      const disableSandbox = process.env.NEXT_PUBLIC_DISABLE_SANDBOX === 'true';
      if (disableSandbox || (err.status && err.status !== 0)) {
        addToast('error', err.message || 'แก้ไขหมวดหมู่ล้มเหลว');
        return;
      }
      // Sandbox fallback
      setCategories(categories.map(c => c.id === cat.id ? { ...c, name: editCatName } : c));
      setEditingCat(null);
      addToast('success', 'แก้ไขหมวดหมู่สำเร็จ (Sandbox)');
    }
  }

  async function handleColorChange(cat: Category, newColor: string) {
    try {
      const updated = await updateCategory(cat.id, { color: newColor });
      setCategories(categories.map(c => c.id === cat.id ? updated : c));
    } catch (err) {
      setCategories(categories.map(c => c.id === cat.id ? { ...c, color: newColor } : c));
    }
  }

  async function handleDeleteCat(id: number) {
    try {
      await deleteCategory(id);
      setCategories(categories.filter(c => c.id !== id));
      addToast('success', 'ลบหมวดหมู่สำเร็จ');
    } catch (err: any) {
      const disableSandbox = process.env.NEXT_PUBLIC_DISABLE_SANDBOX === 'true';
      if (disableSandbox || (err.status && err.status !== 0)) {
        addToast('error', err.message || 'ลบหมวดหมู่ล้มเหลว');
        return;
      }
      setCategories(categories.filter(c => c.id !== id));
      addToast('success', 'ลบหมวดหมู่สำเร็จ (Sandbox)');
    }
  }

  async function handleAddCat() {
    if (!newCatName.trim()) return;
    const colors = ['#FF6B6B', '#845EC2', '#00C9A7', '#FFC75F', '#D65DB1', '#0089BA'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    try {
      const newCat = await createCategory({
        name: newCatName.trim(),
        type: catTab,
        color: randomColor
      });
      setCategories([...categories, newCat]);
      setNewCatName('');
      addToast('success', 'เพิ่มหมวดหมู่สำเร็จ');
    } catch (err: any) {
      const disableSandbox = process.env.NEXT_PUBLIC_DISABLE_SANDBOX === 'true';
      if (disableSandbox || (err.status && err.status !== 0)) {
        addToast('error', err.message || 'เพิ่มหมวดหมู่ล้มเหลว');
        return;
      }
      const newId = Math.max(...categories.map(c => c.id), 0) + 1;
      setCategories([...categories, {
        id: newId,
        name: newCatName.trim(),
        type: catTab,
        color: randomColor
      }]);
      setNewCatName('');
      addToast('success', 'เพิ่มหมวดหมู่สำเร็จ (Sandbox)');
    }
  }

  // ── Reset Database ──
  async function handleReset() {
    setResetting(true);
    try {
      await resetData();
      addToast('success', 'รีเซ็ตข้อมูลระบบสำเร็จ');
      setResetModal(false);
      refreshSettings();
      refreshCategories();
    } catch (err: any) {
      console.warn('API error resetting, simulating locally.', err);
      const disableSandbox = process.env.NEXT_PUBLIC_DISABLE_SANDBOX === 'true';
      if (disableSandbox || (err.status && err.status !== 0)) {
        addToast('error', err.message || 'รีเซ็ตข้อมูลระบบล้มเหลว');
        return;
      }
      await new Promise(r => setTimeout(r, 600));
      addToast('success', 'รีเซ็ตข้อมูลระบบสำเร็จ (Sandbox)');
      setResetModal(false);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-6 md:space-y-8 max-w-4xl mx-auto">
      {/* ── 1. Shop Info Settings Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-colors"
      >
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="w-8 h-8 bg-blue-50 dark:bg-blue-500/10 text-primary dark:text-[#2979FF] rounded-xl flex items-center justify-center">
            <Store size={18} />
          </div>
          <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 font-prompt">ข้อมูลร้านค้าทั่วไป & ระบบแจ้งชำระเงิน</h3>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block font-prompt">ชื่อร้านค้า (หรือชื่อเจ้าของ)</label>
              <input
                type="text"
                value={shopNameInput}
                onChange={e => setShopNameInput(e.target.value)}
                placeholder="ระบุชื่อร้านค้าของคุณ"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-sm font-prompt text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block font-prompt">รูปภาพโลโก้</label>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center text-slate-400 dark:text-slate-500">
                  <ImageIcon size={18} />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  disabled
                  className="file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-600 dark:file:text-slate-450 hover:file:bg-slate-200/80 file:cursor-not-allowed text-xs text-slate-450"
                />
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-prompt block mt-1">
                ⚠️ ฟังก์ชันอัปโหลดภาพโลโก้จะรองรับใน v2.0 (JPG, PNG ขนาดไม่เกิน 2MB)
              </span>
            </div>
          </div>

          <div className="border-t border-slate-150 dark:border-slate-800 pt-5 space-y-4">
            <h4 className="text-xs font-bold text-[#0D47A1] dark:text-[#2979FF] font-prompt uppercase tracking-wider flex items-center gap-1.5">
              💸 การตั้งค่ารับโอนพร้อมเพย์ (Payments settings)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block font-prompt">หมายเลขพร้อมเพย์ (PromptPay ID)</label>
                <input
                  type="text"
                  value={promptpayIdInput}
                  onChange={e => setPromptpayIdInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="เบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก"
                  maxLength={13}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-sm font-prompt text-slate-800 dark:text-slate-100 font-mono tracking-wide"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block font-prompt">ชื่อบัญชีผู้รับโอน (Account Name)</label>
                <input
                  type="text"
                  value={promptpayNameInput}
                  onChange={e => setPromptpayNameInput(e.target.value)}
                  placeholder="ชื่อ-นามสกุลจริงผู้รับโอน (เช่น นายประสิทธิ์ รักดี)"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-sm font-prompt text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-150 dark:border-slate-800 pt-5 space-y-4">
            <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 font-prompt uppercase tracking-wider">
              ⚠️ ตั้งค่ารายการวัตถุดิบเช็กลิสต์ของหมด (Inventory Checklists Preset)
            </h4>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block font-prompt">วัตถุดิบหมดบ่อย (ป้อนข้อมูลและคั่นด้วยเครื่องหมายจุลภาค ,)</label>
              <input
                type="text"
                value={shortageItemsInput}
                onChange={e => setShortageItemsInput(e.target.value)}
                placeholder="เช่น เมล็ดกาแฟ, นมสด Barista, แก้วเย็น 16oz, โกโก้พรีเมียม, หลอดกระดาษ"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-sm font-prompt text-slate-800 dark:text-slate-100"
              />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-prompt block mt-1">
                💡 วัตถุดิบข้างต้นจะปรากฏเป็นปุ่มให้แตะเลือกได้ทันทีเมื่อเปิดปุ่มเตือนของหมดหน้าร้านค้า ป้องกันการสะกดผิดบนมือถือ
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-150 dark:border-slate-800">
            <Button variant="primary" loading={savingShop} onClick={handleSaveShop}>
              บันทึกการตั้งค่าทั้งหมด
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── 2. LINE Notify Token (HIDDEN Input - Only Status & Test button!) ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden"
      >
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="w-8 h-8 bg-emerald-50 text-line-green rounded-xl flex items-center justify-center">
            <Bell size={18} />
          </div>
          <h3 className="text-sm md:text-base font-bold text-slate-800 font-prompt">การเชื่อมต่อ LINE Notify</h3>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-prompt">สถานะเซิร์ฟเวอร์ LINE Notify:</span>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${lineConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className="text-sm font-bold text-slate-700 font-prompt">
                  {lineConnected ? 'เชื่อมต่อผ่าน ENV/Server Token แล้ว' : 'ไม่มี Token ในระบบ (เซิร์ฟเวอร์ออฟไลน์)'}
                </span>
              </div>
            </div>
            
            <Button
              variant="line"
              loading={testingLine}
              onClick={handleTestLine}
              className="flex items-center gap-1.5 shrink-0"
            >
              <Send size={14} />
              <span>ทดสอบส่งข้อความ</span>
            </Button>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed font-prompt">
            ℹ️ <span className="font-semibold text-slate-500">หมายเหตุความปลอดภัย:</span> เพื่อป้องกันข้อมูลรั่วไหลจากฝั่งบราวเซอร์ Access Token ของ LINE Notify จะถูกตั้งค่าผ่านระบบตัวแปรสิ่งแวดล้อม (.env / Docker Config) ของฝั่ง Server-Side เท่านั้น จึงไม่มีการแสดงฟิลด์ข้อมูล Token บนหน้าเว็บนี้
          </p>
        </div>
      </motion.div>

      {/* ── 3. Change Password Settings Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden"
      >
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <Lock size={18} />
          </div>
          <h3 className="text-sm md:text-base font-bold text-slate-800 font-prompt">ความปลอดภัย (เปลี่ยนรหัสผ่านแอดมิน)</h3>
        </div>

        <form onSubmit={handleChangePassword} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 block font-prompt">รหัสผ่านปัจจุบัน</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="ระบุรหัสผ่านปัจจุบัน"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-sm font-prompt"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 block font-prompt">รหัสผ่านใหม่</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="ต้องมีความยาวอย่างน้อย 6 ตัวอักษร"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-sm font-prompt"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button type="submit" variant="primary" loading={changingPassword}>
              เปลี่ยนรหัสผ่าน
            </Button>
          </div>
        </form>
      </motion.div>

      {/* ── 4. Category CRUD Settings Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.4 }}
        className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <Tag size={18} />
            </div>
            <h3 className="text-sm md:text-base font-bold text-slate-800 font-prompt">ตั้งค่าหมวดหมู่</h3>
          </div>
          
          {/* Segments switch */}
          <div className="flex bg-slate-200/60 p-1 rounded-lg gap-1">
            <button
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-md font-prompt transition-all cursor-pointer',
                catTab === 'income' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
              )}
              onClick={() => setCatTab('income')}
            >
              รายรับ
            </button>
            <button
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-md font-prompt transition-all cursor-pointer',
                catTab === 'expense' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
              )}
              onClick={() => setCatTab('expense')}
            >
              รายจ่าย
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Categories Grid list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredCats.map(cat => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3.5 border border-slate-100 rounded-xl hover:bg-slate-50/50 transition-all gap-3"
              >
                {/* Color input indicator */}
                <input
                  type="color"
                  value={cat.color}
                  onChange={e => handleColorChange(cat, e.target.value)}
                  className="w-7 h-7 rounded-lg border-0 cursor-pointer overflow-hidden p-0"
                  title="คลิกเปลี่ยนสี"
                />

                {editingCat === cat.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editCatName}
                      onChange={e => setEditCatName(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-prompt focus:border-primary outline-none"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEditCat(cat);
                        if (e.key === 'Escape') setEditingCat(null);
                      }}
                    />
                    <button
                      onClick={() => saveEditCat(cat)}
                      className="p-1 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      title="บันทึก"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => setEditingCat(null)}
                      className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="ยกเลิก"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-xs font-semibold text-slate-700 font-prompt truncate">
                      {cat.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditCat(cat)}
                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                        title="แก้ไข"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteCat(cat.id)}
                        className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                        title="ลบ"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add Category row */}
          <div className="flex items-center gap-2 pt-4 border-t border-slate-100 max-w-md">
            <input
              type="text"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="เพิ่มหมวดหมู่ใหม่..."
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary transition-all outline-none text-xs font-prompt"
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddCat();
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddCat}
              className="flex items-center gap-1.5 hover:bg-slate-100 shrink-0"
            >
              <Plus size={14} />
              <span>เพิ่ม</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── 5. Disaster Recovery Console settings card ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, duration: 0.4 }}
        className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden"
      >
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="w-8 h-8 bg-blue-50 text-primary rounded-xl flex items-center justify-center">
            <Database size={18} />
          </div>
          <h3 className="text-sm md:text-base font-bold text-slate-800 font-prompt">สำรองและกู้คืนฐานข้อมูล (Disaster Recovery Console)</h3>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-xs text-slate-500 font-prompt leading-relaxed">
            ระบบ U-Dash ทำงานบนฐานข้อมูลแบบ zero-config (SQLite) คุณสามารถดาวน์โหลดข้อมูลธุรกรรมและหมวดหมู่การตั้งค่าทั้งหมดเก็บเป็นไฟล์กู้คืนฉุกเฉิน (.db) ได้ในคลิกเดียว และอัปโหลดไฟล์เก่ากลับเข้าเขียนทับเพื่อคืนค่าระบบได้ทันที
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Download Backup Button */}
            <Button
              variant="outline"
              loading={backingUp}
              onClick={handleBackupDownload}
              className="flex items-center gap-2 select-none cursor-pointer"
            >
              <Database size={15} />
              <span>ดาวน์โหลดไฟล์สำรอง (.db)</span>
            </Button>

            {/* Upload Restore Input Wrapper */}
            <div className="relative overflow-hidden inline-block w-full sm:w-auto">
              <input
                type="file"
                accept=".db"
                onChange={handleRestore}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="กู้คืนจากไฟล์ฐานข้อมูล"
              />
              <Button
                variant="primary"
                type="button"
                className="flex items-center gap-2 select-none pointer-events-none w-full justify-center"
              >
                <Plus size={15} />
                <span>กู้คืนระบบจากไฟล์สำรอง</span>
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── 4. Danger Zone settings card ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="bg-white border border-red-200 rounded-2xl shadow-xs overflow-hidden"
      >
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-red-100 bg-red-50/50">
          <div className="w-8 h-8 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
            <Database size={18} />
          </div>
          <h3 className="text-sm md:text-base font-bold text-red-800 font-prompt">Danger Zone (จัดการข้อมูล)</h3>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500 font-prompt leading-relaxed">
            หากมีข้อมูลรายการทดสอบที่ปนเปื้อน หรือต้องการรีเฟรชฐานข้อมูลระบบใหม่ทั้งหมด คุณสามารถคลิกปุ่มรีเซ็ตเพื่อนำเข้าชุดตัวเลขและหมวดหมู่ตัวอย่างเบื้องต้นกลับมา
            <strong className="text-red-500 font-semibold block mt-1">⚠️ คำเตือน: ข้อมูลรายรับ-รายจ่าย รายงาน รวมถึงประวัติการแจ้งเตือนทั้งหมดในฐานข้อมูล SQLite จะถูกลบทิ้งอย่างถาวร!</strong>
          </p>

          <div className="pt-2">
            <Button variant="outlineDanger" onClick={() => setResetModal(true)} className="flex items-center gap-1.5">
              <RotateCcw size={15} />
              <span>รีเซ็ตข้อมูลตัวอย่างทั้งหมด</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Database Reset Confirm Modal */}
      {resetModal && (
        <Modal
          isOpen={resetModal}
          onClose={() => setResetModal(false)}
          title="ต้องการรีเซ็ตฐานข้อมูลทั้งหมด?"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setResetModal(false)}>ยกเลิก</Button>
              <Button variant="danger" loading={resetting} onClick={handleReset}>
                ยืนยันการลบและเขียนใหม่
              </Button>
            </>
          }
        >
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-100 animate-bounce">
              <RotateCcw size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-800 font-prompt text-base">ระบบกำลังล้างข้อมูลทุกอย่าง</h4>
              <p className="text-xs text-slate-400 font-prompt mt-1 px-4">
                คุณแน่ใจแล้วใช่หรือไม่? ข้อมูลประวัติการเงิน หมวดหมู่ที่สร้างขึ้น และแชท LINE Notify ทั้งหมดจะสูญหายโดยสิ้นเชิง
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Database Restore Confirm Modal */}
      {restoreModal && (
        <Modal
          isOpen={restoreModal}
          onClose={() => {
            setRestoreModal(false);
            setSelectedFile(null);
          }}
          title="ต้องการกู้คืนข้อมูลระบบ?"
          size="sm"
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setRestoreModal(false);
                  setSelectedFile(null);
                }}
              >
                ยกเลิก
              </Button>
              <Button variant="primary" loading={restoring} onClick={executeRestore}>
                ยืนยันการอัปโหลดและเขียนทับ
              </Button>
            </>
          }
        >
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-blue-50 text-[#0D47A1] rounded-full flex items-center justify-center mx-auto border border-blue-100 animate-pulse">
              <Database size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-800 font-prompt text-base">ระบบจะทำการทับฐานข้อมูลเดิม</h4>
              <p className="text-xs text-slate-450 font-prompt mt-1 px-4">
                ไฟล์ฐานข้อมูลสำรองที่อัปโหลดคือ: <span className="font-semibold text-slate-600 font-mono text-[11px] block mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg">{selectedFile?.name}</span>
                <span className="block text-red-500 font-semibold mt-3">⚠️ คำเตือน: ข้อมูลการเงินทั้งหมดบนโปรแกรมในปัจจุบันจะถูกเขียนทับด้วยข้อมูลจากไฟล์นี้โดยสมบูรณ์!</span>
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
