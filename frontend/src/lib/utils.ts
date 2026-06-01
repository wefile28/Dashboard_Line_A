// ============================================
// Utility Functions — Dashboard + LINE
// ============================================

/**
 * Format number as Thai Baht currency
 */
export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return `฿${formatted}`;
}

/**
 * Format number with commas (no currency symbol)
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('th-TH').format(num);
}

/**
 * Thai month abbreviations
 */
const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_DAYS = [
  'อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'
];

/**
 * Format Thai month abbreviation (1-indexed)
 */
export function formatThaiMonth(month: number): string {
  return THAI_MONTHS_SHORT[month - 1] || '';
}

/**
 * Format Thai month full name (1-indexed)
 */
export function formatThaiMonthFull(month: number): string {
  return THAI_MONTHS_FULL[month - 1] || '';
}

/**
 * Convert CE year to Buddhist Era year
 */
function toBuddhistYear(year: number): number {
  return year + 543;
}

/**
 * Format date string to Thai short date: "30 พ.ค. 2569"
 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const month = THAI_MONTHS_SHORT[d.getMonth()];
  const year = toBuddhistYear(d.getFullYear());
  return `${day} ${month} ${year}`;
}

/**
 * Format date string to Thai long date: "วันศุกร์ที่ 30 พฤษภาคม 2569"
 */
export function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dayName = THAI_DAYS[d.getDay()];
  const day = d.getDate();
  const month = THAI_MONTHS_FULL[d.getMonth()];
  const year = toBuddhistYear(d.getFullYear());
  return `วัน${dayName}ที่ ${day} ${month} ${year}`;
}

/**
 * Format datetime string: "30 พ.ค. 2569 10:30"
 */
export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const month = THAI_MONTHS_SHORT[d.getMonth()];
  const year = toBuddhistYear(d.getFullYear());
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${year} ${hours}:${minutes}`;
}

/**
 * Format time only: "10:30"
 */
export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format percentage with sign
 */
export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * ClassNames merger utility
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get current Thai formatted date/time for header display
 */
export function getCurrentThaiDateTime(): string {
  const now = new Date();
  const dayName = THAI_DAYS[now.getDay()];
  const day = now.getDate();
  const month = THAI_MONTHS_FULL[now.getMonth()];
  const year = toBuddhistYear(now.getFullYear());
  return `วัน${dayName}ที่ ${day} ${month} ${year}`;
}

/**
 * Relative time in Thai: "5 นาทีที่แล้ว"
 */
export function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diff < 60) return 'เมื่อสักครู่';
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} วันที่แล้ว`;
  return formatDate(dateStr);
}

/**
 * Category color mapping
 */
const CATEGORY_COLORS: Record<string, string> = {
  'อาหารและเครื่องดื่ม': '#FF6B6B',
  'ค่าเช่า': '#845EC2',
  'เงินเดือน': '#4D8076',
  'ค่าน้ำค่าไฟ': '#FF9671',
  'การตลาด': '#FFC75F',
  'วัตถุดิบ': '#F9F871',
  'ขนส่ง': '#D65DB1',
  'อื่นๆ': '#9CA3AF',
  'ขายสินค้า': '#00C9A7',
  'บริการ': '#0089BA',
  'ค่าจ้าง': '#C34A36',
  'อุปกรณ์': '#FF8066',
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || '#6B7280';
}

/**
 * Chart colors palette
 */
export const CHART_COLORS = [
  '#FF6B6B', '#845EC2', '#00C9A7', '#FFC75F',
  '#F9F871', '#FF9671', '#D65DB1', '#0089BA',
  '#C34A36', '#FF8066', '#4D8076', '#B0A8B9'
];

/**
 * Short day names for charts
 */
export const THAI_DAY_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
