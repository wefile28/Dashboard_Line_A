'use client';

// ============================================
// App Context — Global State (shop name, categories, auth, etc.)
// ============================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSettings, getCategories, getUnreadCount, Category, ShopSettings } from '@/lib/api';
import { mockSettings, mockCategories } from '@/lib/mockData';

interface AppContextValue {
  shopName: string;
  setShopName: (name: string) => void;
  settings: ShopSettings;
  setSettings: (s: ShopSettings) => void;
  categories: Category[];
  setCategories: (c: Category[]) => void;
  unreadCount: number;
  setUnreadCount: (n: number) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isAdmin: boolean;
  setIsAdmin: (admin: boolean) => void;
  login: (token: string) => void;
  logout: () => void;
  refreshSettings: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshUnread: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<ShopSettings>(mockSettings);
  const [shopName, setShopName] = useState(mockSettings.shop_name);
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check login state on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      setIsAdmin(!!token);
    }
  }, []);

  const login = (token: string) => {
    localStorage.setItem('token', token);
    setIsAdmin(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    // Clear the token cookie by setting its max-age to 0 (expired)
    document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
    setIsAdmin(false);
  };

  const setSettings = useCallback((newSettings: ShopSettings) => {
    setSettingsState(newSettings);
    setShopName(newSettings.shop_name);
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (e) {
      console.warn('Failed to load settings from API, using mock settings.', e);
      setSettings(mockSettings);
    }
  }, [setSettings]);

  const refreshCategories = useCallback(async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (e) {
      console.warn('Failed to load categories from API, using mock categories.', e);
      setCategories(mockCategories);
    }
  }, []);

  const refreshUnread = useCallback(async () => {
    try {
      const { count } = await getUnreadCount();
      setUnreadCount(count);
    } catch (e) {
      console.warn('Failed to load unread count from API, using mock default.', e);
      setUnreadCount(3);
    }
  }, []);

  // Fetch initial data
  useEffect(() => {
    refreshSettings();
    refreshCategories();
    refreshUnread();
  }, [refreshSettings, refreshCategories, refreshUnread]);

  return (
    <AppContext.Provider value={{
      shopName,
      setShopName,
      settings,
      setSettings,
      categories,
      setCategories,
      unreadCount,
      setUnreadCount,
      sidebarOpen,
      setSidebarOpen,
      isAdmin,
      setIsAdmin,
      login,
      logout,
      refreshSettings,
      refreshCategories,
      refreshUnread,
    }}>
      {children}
    </AppContext.Provider>
  );
}
