import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Kebab Gyros Greek & Italian | Nashville', description: 'Fresh gyros, plates, sandwiches, pasta and salads at 389 Murfreesboro Pike in Nashville.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
