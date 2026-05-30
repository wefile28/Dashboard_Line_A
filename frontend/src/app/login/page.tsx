'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/contexts/ToastContext';
import { Lock, Mail, Loader2, Coffee } from 'lucide-react';
import { loginUser } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useApp();
  const { addToast } = useToast();

  const [email, setEmail] = useState('admin@udash.com');
  const [password, setPassword] = useState('udash2026');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('error', 'กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    setLoading(true);

    try {
      // Connect to real backend
      const res = await loginUser(email, password);
      
      // Save token in cookie so middleware can read it on the server
      document.cookie = `token=${res.access_token}; path=/; max-age=86400; SameSite=Lax`;
      
      // Call AppContext login to sync states
      login(res.access_token);

      addToast('success', 'เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับสู่ U-Dash');
      router.push('/');
    } catch (err: any) {
      console.warn('API login failed, using fallback or showing error.', err);
      
      // If server is not running or other error, let's check credentials locally for smooth local testing
      if (email === 'admin@udash.com' && password === 'udash2026') {
        const fakeToken = 'mock-jwt-token-' + btoa(JSON.stringify({ email, role: 'admin' }));
        document.cookie = `token=${fakeToken}; path=/; max-age=86400; SameSite=Lax`;
        login(fakeToken);
        addToast('success', 'เข้าสู่ระบบสำเร็จ! (Sandbox Fallback)');
        router.push('/');
      } else {
        addToast('error', err.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-slate-50 to-slate-200 p-4">
      {/* Background Decorative Blobs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-income/10 rounded-full blur-3xl -z-10 animate-pulse" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
      >
        <div className="p-8">
          {/* Logo Section */}
          <div className="flex flex-col items-center justify-center text-center mb-8">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20 mb-4">
              <Coffee size={28} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">U-Dash Master</h2>
            <p className="text-slate-400 text-sm mt-1">กรุณาเข้าสู่ระบบเพื่อจัดการร้านค้าของคุณ</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 block">อีเมล</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Mail size={18} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@brewlab.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-600 block">รหัสผ่าน</label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  required
                />
              </div>
            </div>

            {/* Hint */}
            <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed font-prompt">
              💡 <span className="font-semibold text-slate-600">บัญชีทดสอบ:</span> admin@udash.com / udash2026
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-primary hover:bg-primary-dark text-white font-medium rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed text-base font-prompt"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                'เข้าสู่ระบบ'
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
