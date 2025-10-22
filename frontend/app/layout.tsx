import './globals.css';
import { ReactNode } from 'react';
import { Poppins, JetBrains_Mono } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';

const poppins = Poppins({ 
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata = { 
  title: 'On-Chain Analysis Agent', 
  description: 'Advanced blockchain analysis and cryptocurrency insights powered by AI' 
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn(poppins.variable, jetbrainsMono.variable, "dark")} suppressHydrationWarning> 
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        poppins.variable,
        jetbrainsMono.variable
      )}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
