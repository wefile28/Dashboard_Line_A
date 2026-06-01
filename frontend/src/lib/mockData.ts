// ============================================
// Mock / Demo Data — Used when API is unavailable
// ============================================

import type {
  DashboardSummary,
  Transaction,
  Notification,
  Category,
  ShopSettings,
  PaginatedResponse,
  ReportSummary,
} from './api';

const today = new Date();
function dateStr(daysAgo: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}
function dateTimeStr(daysAgo: number, hours: number = 10, minutes: number = 30): string {
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

export const mockTransactions: Transaction[] = [
  { id: 1, type: 'income', title: 'ขายกาแฟ', amount: 4500, category: 'ขายสินค้า', date: dateStr(0), note: 'ยอดขายวันนี้', created_at: dateTimeStr(0, 9, 0) },
  { id: 2, type: 'expense', title: 'ซื้อเมล็ดกาแฟ', amount: 2800, category: 'วัตถุดิบ', date: dateStr(0), note: 'Arabica 5 กก.', created_at: dateTimeStr(0, 8, 30) },
  { id: 3, type: 'income', title: 'ขายเค้ก', amount: 1800, category: 'ขายสินค้า', date: dateStr(0), note: '', created_at: dateTimeStr(0, 11, 0) },
  { id: 4, type: 'expense', title: 'ค่าไฟฟ้า', amount: 3200, category: 'ค่าน้ำค่าไฟ', date: dateStr(1), note: 'เดือน พ.ค.', created_at: dateTimeStr(1, 10, 0) },
  { id: 5, type: 'income', title: 'ขายสินค้าออนไลน์', amount: 8500, category: 'ขายสินค้า', date: dateStr(1), note: 'Shopee + Lazada', created_at: dateTimeStr(1, 14, 0) },
  { id: 6, type: 'expense', title: 'เงินเดือนพนักงาน', amount: 15000, category: 'เงินเดือน', date: dateStr(1), note: 'พนักงาน 1 คน', created_at: dateTimeStr(1, 9, 0) },
  { id: 7, type: 'income', title: 'บริการจัดเลี้ยง', amount: 12000, category: 'บริการ', date: dateStr(2), note: 'งานเลี้ยงบริษัท', created_at: dateTimeStr(2, 16, 0) },
  { id: 8, type: 'expense', title: 'ค่าเช่าร้าน', amount: 8000, category: 'ค่าเช่า', date: dateStr(2), note: 'เดือน พ.ค.', created_at: dateTimeStr(2, 10, 0) },
  { id: 9, type: 'income', title: 'ขายเครื่องดื่ม', amount: 3200, category: 'ขายสินค้า', date: dateStr(3), note: '', created_at: dateTimeStr(3, 12, 0) },
  { id: 10, type: 'expense', title: 'ค่าโฆษณา Facebook', amount: 1500, category: 'การตลาด', date: dateStr(3), note: 'Boost post', created_at: dateTimeStr(3, 11, 0) },
  { id: 11, type: 'income', title: 'ขายสินค้าหน้าร้าน', amount: 5600, category: 'ขายสินค้า', date: dateStr(4), note: '', created_at: dateTimeStr(4, 17, 0) },
  { id: 12, type: 'expense', title: 'ซื้อแก้วพลาสติก', amount: 800, category: 'วัตถุดิบ', date: dateStr(4), note: '500 ใบ', created_at: dateTimeStr(4, 9, 30) },
  { id: 13, type: 'income', title: 'ขายขนมปัง', amount: 2400, category: 'ขายสินค้า', date: dateStr(5), note: '', created_at: dateTimeStr(5, 15, 0) },
  { id: 14, type: 'expense', title: 'ค่าขนส่ง', amount: 650, category: 'ขนส่ง', date: dateStr(5), note: 'ส่งวัตถุดิบ', created_at: dateTimeStr(5, 10, 0) },
  { id: 15, type: 'income', title: 'ค่าบริการ', amount: 6000, category: 'บริการ', date: dateStr(6), note: '', created_at: dateTimeStr(6, 13, 0) },
];

export const mockDashboard: DashboardSummary = {
  today_income: 6300,
  today_expense: 2800,
  today_profit: 3500,
  yesterday_income: 8500,
  yesterday_expense: 18200,
  yesterday_profit: -9700,
  income_change: -25.9,
  expense_change: -84.6,
  profit_change: 136.1,
  weekly_data: [
    { date: dateStr(6), income: 6000, expense: 2200, profit: 3800 },
    { date: dateStr(5), income: 2400, expense: 650, profit: 1750 },
    { date: dateStr(4), income: 5600, expense: 800, profit: 4800 },
    { date: dateStr(3), income: 3200, expense: 1500, profit: 1700 },
    { date: dateStr(2), income: 12000, expense: 8000, profit: 4000 },
    { date: dateStr(1), income: 8500, expense: 18200, profit: -9700 },
    { date: dateStr(0), income: 6300, expense: 2800, profit: 3500 },
  ],
  monthly_data: [
    { month: 1, year: 2026, income: 85000, expense: 62000, profit: 23000 },
    { month: 2, year: 2026, income: 92000, expense: 58000, profit: 34000 },
    { month: 3, year: 2026, income: 78000, expense: 65000, profit: 13000 },
    { month: 4, year: 2026, income: 105000, expense: 72000, profit: 33000 },
    { month: 5, year: 2026, income: 44000, expense: 34150, profit: 9850 },
    { month: 6, year: 2026, income: 0, expense: 0, profit: 0 },
    { month: 7, year: 2026, income: 0, expense: 0, profit: 0 },
    { month: 8, year: 2026, income: 0, expense: 0, profit: 0 },
    { month: 9, year: 2026, income: 0, expense: 0, profit: 0 },
    { month: 10, year: 2026, income: 0, expense: 0, profit: 0 },
    { month: 11, year: 2026, income: 0, expense: 0, profit: 0 },
    { month: 12, year: 2026, income: 0, expense: 0, profit: 0 },
  ],
  expense_by_category: [
    { category: 'เงินเดือน', total: 15000, percentage: 43.9, color: '#4D8076' },
    { category: 'ค่าเช่า', total: 8000, percentage: 23.4, color: '#845EC2' },
    { category: 'ค่าน้ำค่าไฟ', total: 3200, percentage: 9.4, color: '#FF9671' },
    { category: 'วัตถุดิบ', total: 3600, percentage: 10.5, color: '#F9F871' },
    { category: 'การตลาด', total: 1500, percentage: 4.4, color: '#FFC75F' },
    { category: 'ขนส่ง', total: 650, percentage: 1.9, color: '#D65DB1' },
    { category: 'อื่นๆ', total: 2200, percentage: 6.4, color: '#9CA3AF' },
  ],
  recent_transactions: [],
};
mockDashboard.recent_transactions = mockTransactions.slice(0, 5);

export const mockNotifications: Notification[] = [
  { id: 1, type: 'income', message: '💰 รายรับใหม่: ขายกาแฟ ฿4,500', amount: 4500, is_read: false, created_at: dateTimeStr(0, 9, 5) },
  { id: 2, type: 'expense', message: '💸 รายจ่าย: ซื้อเมล็ดกาแฟ ฿2,800', amount: 2800, is_read: false, created_at: dateTimeStr(0, 8, 35) },
  { id: 3, type: 'income', message: '💰 รายรับใหม่: ขายเค้ก ฿1,800', amount: 1800, is_read: false, created_at: dateTimeStr(0, 11, 5) },
  { id: 4, type: 'daily_summary', message: '📊 สรุปรายวัน: รายรับ ฿8,500 | รายจ่าย ฿18,200 | กำไร -฿9,700', is_read: true, created_at: dateTimeStr(1, 23, 59) },
  { id: 5, type: 'expense', message: '💸 รายจ่าย: ค่าไฟฟ้า ฿3,200', amount: 3200, is_read: true, created_at: dateTimeStr(1, 10, 5) },
  { id: 6, type: 'income', message: '💰 รายรับใหม่: ขายสินค้าออนไลน์ ฿8,500', amount: 8500, is_read: true, created_at: dateTimeStr(1, 14, 5) },
  { id: 7, type: 'system', message: '🔔 LINE Notify เชื่อมต่อสำเร็จ', is_read: true, created_at: dateTimeStr(3, 10, 0) },
  { id: 8, type: 'daily_summary', message: '📊 สรุปรายวัน: รายรับ ฿5,600 | รายจ่าย ฿800 | กำไร ฿4,800', is_read: true, created_at: dateTimeStr(4, 23, 59) },
  { id: 9, type: 'income', message: '💰 รายรับใหม่: บริการจัดเลี้ยง ฿12,000', amount: 12000, is_read: true, created_at: dateTimeStr(2, 16, 5) },
  { id: 10, type: 'expense', message: '💸 รายจ่าย: ค่าเช่าร้าน ฿8,000', amount: 8000, is_read: true, created_at: dateTimeStr(2, 10, 5) },
];

export const mockCategories: Category[] = [
  { id: 1, name: 'ขายสินค้า', type: 'income', color: '#00C9A7' },
  { id: 2, name: 'บริการ', type: 'income', color: '#0089BA' },
  { id: 3, name: 'อื่นๆ', type: 'income', color: '#9CA3AF' },
  { id: 4, name: 'วัตถุดิบ', type: 'expense', color: '#F9F871' },
  { id: 5, name: 'เงินเดือน', type: 'expense', color: '#4D8076' },
  { id: 6, name: 'ค่าเช่า', type: 'expense', color: '#845EC2' },
  { id: 7, name: 'ค่าน้ำค่าไฟ', type: 'expense', color: '#FF9671' },
  { id: 8, name: 'การตลาด', type: 'expense', color: '#FFC75F' },
  { id: 9, name: 'ขนส่ง', type: 'expense', color: '#D65DB1' },
  { id: 10, name: 'อุปกรณ์', type: 'expense', color: '#FF8066' },
  { id: 11, name: 'อื่นๆ', type: 'expense', color: '#9CA3AF' },
];

export const mockSettings: ShopSettings = {
  shop_name: 'ร้านกาแฟ BrewLab',
  logo_url: '',
  line_token: '',
  line_connected: false,
};

export function getMockPaginatedTransactions(
  page: number = 1,
  perPage: number = 10,
  type?: string,
  search?: string,
  category?: string
): PaginatedResponse<Transaction> {
  let filtered = [...mockTransactions];
  if (type && type !== 'all') filtered = filtered.filter(t => t.type === type);
  
  if (category && category !== 'all') {
    filtered = filtered.filter(t => {
      const catName = typeof t.category === 'object' && t.category ? t.category.name : t.category;
      return catName === category;
    });
  }
  
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(t => {
      const catName = typeof t.category === 'object' && t.category ? t.category.name : t.category || '';
      return (
        t.title.toLowerCase().includes(q) ||
        catName.toLowerCase().includes(q) ||
        (t.note && t.note.toLowerCase().includes(q))
      );
    });
  }
  const total = filtered.length;
  const totalPages = Math.ceil(total / perPage);
  const start = (page - 1) * perPage;
  const items = filtered.slice(start, start + perPage);
  return { items, total, page, per_page: perPage, total_pages: totalPages };
}

export function getMockReport(period: string): ReportSummary {
  if (period === 'day') {
    return {
      total_income: 6300,
      total_expense: 2800,
      net_profit: 3500,
      data: mockDashboard.weekly_data.slice(-1),
    };
  }
  if (period === 'week') {
    const data = mockDashboard.weekly_data;
    return {
      total_income: data.reduce((s, d) => s + d.income, 0),
      total_expense: data.reduce((s, d) => s + d.expense, 0),
      net_profit: data.reduce((s, d) => s + d.profit, 0),
      data,
    };
  }
  if (period === 'year') {
    const data = mockDashboard.monthly_data;
    return {
      total_income: data.reduce((s, d) => s + d.income, 0),
      total_expense: data.reduce((s, d) => s + d.expense, 0),
      net_profit: data.reduce((s, d) => s + d.profit, 0),
      data,
    };
  }
  // month
  const data = mockDashboard.monthly_data.filter(d => d.month === (today.getMonth() + 1));
  return {
    total_income: data.reduce((s, d) => s + d.income, 0),
    total_expense: data.reduce((s, d) => s + d.expense, 0),
    net_profit: data.reduce((s, d) => s + d.profit, 0),
    data: mockDashboard.weekly_data,
  };
}
