import { ReactNode } from 'react';
import { Header } from './Header';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <Header />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
