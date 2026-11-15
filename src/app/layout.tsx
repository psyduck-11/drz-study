import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Living Wiki - Kho Tri Thức Học Tập Cá Nhân',
  description: 'Hệ tri thức học tập cá nhân tổng hợp tài liệu PDF và hình ảnh theo quy tắc không-phá-hủy (Anti-Truncation).',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
