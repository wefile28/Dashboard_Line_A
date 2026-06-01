// ============================================
// API Client — Dashboard + LINE Notification
// ============================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── TypeScript Interfaces ──

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
}

export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  title: string;
  amount: number;
  category: string | Category;
  category_id?: number;
  date: string;
  note?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TransactionCreate {
  type: 'income' | 'expense';
  title: string;
  amount: number;
  category: string;
  date: string;
  note?: string;
}

export interface DailySummary {
  date: string;
  income: number;
  expense: number;
  profit: number;
}

export interface MonthlySummary {
  month: number;
  year: number;
  income: number;
  expense: number;
  profit: number;
}

export interface CategorySummary {
  category: string;
  total: number;
  percentage: number;
  color?: string;
}

export interface DashboardSummary {
  today_income: number;
  today_expense: number;
  today_profit: number;
  yesterday_income: number;
  yesterday_expense: number;
  yesterday_profit: number;
  income_change: number;
  expense_change: number;
  profit_change: number;
  weekly_data: DailySummary[];
  monthly_data: MonthlySummary[];
  expense_by_category: CategorySummary[];
  recent_transactions: Transaction[];
}

export interface Notification {
  id: number;
  type: 'income' | 'expense' | 'system' | 'daily_summary';
  message: string;
  amount?: number;
  is_read: boolean;
  created_at: string;
}



export interface ShopSettings {
  shop_name: string;
  logo_url?: string;
  line_token?: string;
  line_connected: boolean;
  promptpay_id?: string;
  promptpay_name?: string;
  shortage_items?: string;
  [key: string]: any;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ReportSummary {
  total_income: number;
  total_expense: number;
  net_profit: number;
  data: DailySummary[] | MonthlySummary[];
}

// ── Error Class ──

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// ── Generic Fetch Wrapper & Auth Helpers ──

function handle401() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
    window.location.href = '/login?session_expired=true';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let token = '';
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('token') || '';
  }

  const url = `${API_BASE}${endpoint}`;
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      if (response.status === 401) {
        handle401();
        throw new ApiError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 401);
      }
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new ApiError(error.detail || `HTTP ${response.status}`, response.status);
    }
    if (response.status === 204) return {} as T;
    return response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 0);
  }
}

// ── Dashboard API ──

export async function getDashboardSummary(params?: {
  start_date?: string;
  end_date?: string;
}): Promise<DashboardSummary> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        query.set(key, String(value));
      }
    });
  }
  const qs = query.toString();
  return request<DashboardSummary>(`/api/dashboard/summary${qs ? `?${qs}` : ''}`);
}

// ── Transaction API ──

export async function getTransactions(params?: {
  type?: string;
  category?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResponse<Transaction>> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== 'all') {
        query.set(key, String(value));
      }
    });
  }
  const qs = query.toString();
  return request<PaginatedResponse<Transaction>>(`/api/transactions${qs ? `?${qs}` : ''}`);
}

export async function createTransaction(data: TransactionCreate): Promise<Transaction> {
  return request<Transaction>('/api/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTransaction(id: number, data: TransactionCreate): Promise<Transaction> {
  return request<Transaction>(`/api/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTransaction(id: number): Promise<void> {
  return request<void>(`/api/transactions/${id}`, { method: 'DELETE' });
}

// ── Reports API ──

export async function getReport(params?: {
  period?: string;
  start_date?: string;
  end_date?: string;
}): Promise<ReportSummary> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        query.set(key, String(value));
      }
    });
  }
  const qs = query.toString();
  return request<ReportSummary>(`/api/reports${qs ? `?${qs}` : ''}`);
}

export async function exportCSV(params?: {
  period?: string;
  start_date?: string;
  end_date?: string;
}): Promise<Blob> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        query.set(key, String(value));
      }
    });
  }
  const qs = query.toString();
  const url = `${API_BASE}/api/reports/export${qs ? `?${qs}` : ''}`;
  
  let token = '';
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('token') || '';
  }

  const response = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  });
  if (!response.ok) throw new ApiError('ดาวน์โหลดไม่สำเร็จ', response.status);
  return response.blob();
}

// ── Notifications API ──

export async function getNotifications(): Promise<Notification[]> {
  return request<Notification[]>('/api/notifications');
}

export async function markAllRead(): Promise<void> {
  return request<void>('/api/notifications/read-all', { method: 'PUT' });
}

export async function getUnreadCount(): Promise<{ count: number }> {
  return request<{ count: number }>('/api/notifications/unread-count');
}

// ── Categories API ──

export async function getCategories(type?: string): Promise<Category[]> {
  const qs = type && type !== 'all' ? `?type=${type}` : '';
  return request<Category[]>(`/api/categories${qs}`);
}

export async function createCategory(data: Omit<Category, 'id'>): Promise<Category> {
  return request<Category>('/api/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCategory(id: number, data: Partial<Category>): Promise<Category> {
  return request<Category>(`/api/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCategory(id: number): Promise<void> {
  return request<void>(`/api/categories/${id}`, { method: 'DELETE' });
}

// ── Settings API ──

export async function getSettings(): Promise<ShopSettings> {
  return request<ShopSettings>('/api/settings');
}

export async function updateSettings(data: Partial<ShopSettings>): Promise<ShopSettings> {
  return request<ShopSettings>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function testLineNotify(): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>('/api/settings/test-line', {
    method: 'POST',
  });
}

export async function resetData(): Promise<{ message: string }> {
  return request<{ message: string }>('/api/settings/reset', {
    method: 'POST',
  });
}

export async function sendDailySummary(): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>('/api/settings/line/daily-summary', {
    method: 'POST',
  });
}

// ── Authentication API ──

export async function loginUser(email: string, password: string): Promise<{ access_token: string }> {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  const url = `${API_BASE}/api/auth/login`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'เข้าสู่ระบบล้มเหลว' }));
    throw new ApiError(error.detail || `HTTP ${response.status}`, response.status);
  }

  return response.json();
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  let token = '';
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('token') || '';
  }
  
  const url = `${API_BASE}/api/auth/change-password`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'เปลี่ยนรหัสผ่านล้มเหลว' }));
    throw new ApiError(error.detail || `HTTP ${response.status}`, response.status);
  }

  return response.json();
}

// ── Database Backup & Restore API ──

export async function downloadBackup(): Promise<Blob> {
  const url = `${API_BASE}/api/settings/backup`;
  let token = '';
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('token') || '';
  }
  const response = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  });
  if (!response.ok) {
    if (response.status === 401) {
      handle401();
    }
    const error = await response.json().catch(() => ({ detail: 'ดาวน์โหลดไฟล์สำรองไม่สำเร็จ' }));
    throw new ApiError(error.detail || `HTTP ${response.status}`, response.status);
  }
  return response.blob();
}

export async function restoreBackup(file: File): Promise<{ success: boolean; message: string }> {
  const url = `${API_BASE}/api/settings/restore`;
  let token = '';
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('token') || '';
  }
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 401) {
      handle401();
    }
    const error = await response.json().catch(() => ({ detail: 'กู้คืนฐานข้อมูลไม่สำเร็จ' }));
    throw new ApiError(error.detail || `HTTP ${response.status}`, response.status);
  }

  return response.json();
}

export async function sendShortageAlert(items: string[]): Promise<{ success: boolean; message: string }> {
  const url = `${API_BASE}/api/settings/line/shortage`;
  let token = '';
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('token') || '';
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ items }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      handle401();
    }
    const error = await response.json().catch(() => ({ detail: 'ส่งแจ้งเตือนวัตถุดิบหมดล้มเหลว' }));
    throw new ApiError(error.detail || `HTTP ${response.status}`, response.status);
  }

  return response.json();
}

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  role: 'owner' | 'employee';
  store_id: string;
  is_active: boolean;
  created_at: string;
}

export async function getMe(): Promise<UserProfile> {
  return request<UserProfile>('/api/auth/me');
}


