import type { ReactNode } from 'react';
import AppShell from '@/components/layout/AppShell';

interface ImagingFrameProps {
  children: ReactNode;
}

export default function ImagingFrame({ children }: ImagingFrameProps) {
  return <AppShell>{children}</AppShell>;
}
