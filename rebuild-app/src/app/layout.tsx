import type { Metadata } from 'next';
import { Manrope, Sora } from 'next/font/google';
import '@/app/globals.css';
import { Providers } from '@/components/shell/providers';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-body' });
const sora = Sora({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  title: 'SocialButterflie Rebuild',
  description: 'Dark cinematic social operations platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${sora.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

