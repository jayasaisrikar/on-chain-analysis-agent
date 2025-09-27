import './globals.css';
import './highlight.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Crypto Analysis Agent',
  description: 'Interactive multi-agent crypto analysis'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gradient-to-b from-[#06070a] via-[#0b0f17] to-[#0e121b] text-slate-100 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
