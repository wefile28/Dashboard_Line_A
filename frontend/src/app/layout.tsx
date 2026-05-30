import type { Metadata } from 'next';
import './globals.css';
import { ClientLayout } from './ClientLayout';

export const metadata: Metadata = {
  title: 'Dashboard — ระบบจัดการรายรับรายจ่าย',
  description: 'ระบบจัดการรายรับรายจ่ายพร้อมแจ้งเตือนผ่าน LINE',
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
