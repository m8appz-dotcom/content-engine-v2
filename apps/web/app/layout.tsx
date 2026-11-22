import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Content Engine v2', description: 'Evidence-first short-form content engine for M8 Apps' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><head><link href="https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined" rel="stylesheet" /></head><body>{children}</body></html>;
}
