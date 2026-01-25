import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/supabase/auth-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sterling Long - Developer & Game Creator',
  description: 'Personal portfolio and arcade of games',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
