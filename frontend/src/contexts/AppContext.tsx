'use client';

// ============================================
// App Context — Global State (shop name, categories, auth, etc.)
// ============================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSettings, getCategories, getUnreadCount, getMe, Category, ShopSettings } from '@/lib/api';
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
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isAdmin: boolean;
  setIsAdmin: (admin: boolean) => void;
  userRole: 'owner' | 'employee' | null;
  setUserRole: (role: 'owner' | 'employee' | null) => void;
  storeId: string | null;
  setStoreId: (id: string | null) => void;
  login: (token: string) => void;
  logout: () => void;
  refreshSettings: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshUnread: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
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
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isAdmin, setIsAdmin] = useState(false);

  // Sync theme and sidebarCollapsed from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const collapsed = localStorage.getItem('sidebar_collapsed') === 'true';
      setSidebarCollapsedState(collapsed);

      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light';
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', nextTheme);
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const setSidebarCollapsed = (collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar_collapsed', String(collapsed));
    }
  };

  const [userRole, setUserRole] = useState<'owner' | 'employee' | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);

  const refreshUserProfile = useCallback(async () => {
    try {
      const profile = await getMe();
      setUserRole(profile.role);
      setStoreId(profile.store_id);
      setIsAdmin(profile.role === 'owner');
    } catch (e) {
      console.warn('Failed to load user profile, using mock default.', e);
      setUserRole('owner');
      setStoreId('brewlab');
      setIsAdmin(true);
    }
  }, []);

  // Check login state on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        refreshUserProfile();
      } else {
        setIsAdmin(false);
        setUserRole(null);
        setStoreId(null);
      }
    }
  }, [refreshUserProfile]);

  const login = (token: string) => {
    localStorage.setItem('token', token);
    refreshUserProfile();
  };

  const logout = () => {
    localStorage.removeItem('token');
    // Clear the token cookie by setting its max-age to 0 (expired)
    document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
    setIsAdmin(false);
    setUserRole(null);
    setStoreId(null);
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
      sidebarCollapsed,
      setSidebarCollapsed,
      theme,
      toggleTheme,
      isAdmin,
      setIsAdmin,
      userRole,
      setUserRole,
      storeId,
      setStoreId,
      login,
      logout,
      refreshSettings,
      refreshCategories,
      refreshUnread,
      refreshUserProfile,
    }}>
      {children}
    </AppContext.Provider>
  );
}
