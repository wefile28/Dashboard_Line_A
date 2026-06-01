import type { Metadata } from 'next';
import './globals.css';
import { ClientLayout } from './ClientLayout';

export const metadata: Metadata = {
  title: 'U-Dash Pro — ระบบจัดการบัญชีและหลังบ้านร้านค้าอัจฉริยะ',
  description: 'ระบบสรุปยอดขาย กำไร และรายจ่าย พร้อมแจ้งเตือนผ่าน LINE อัตโนมัติในกระเป๋ามือถือคุณ',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
