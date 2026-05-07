import type { ReactNode } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

interface ImagingFrameProps {
  children: ReactNode;
}

export default function ImagingFrame({ children }: ImagingFrameProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />
      <main className="ml-64 p-6">{children}</main>
    </div>
  );
}
