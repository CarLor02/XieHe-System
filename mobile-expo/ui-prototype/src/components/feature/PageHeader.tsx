import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  children?: ReactNode;
  roundedBottom?: boolean;
}

export default function PageHeader({
  title,
  subtitle,
  onBack,
  right,
  children,
  roundedBottom,
}: PageHeaderProps) {
  return (
    <div
      className={`sticky top-0 z-10 bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600 px-4 pt-12 pb-6 flex-shrink-0 ${
        roundedBottom ? 'rounded-b-[2rem]' : ''
      }`}
    >
      <div className={`flex items-center justify-between ${children ? 'mb-4' : ''}`}>
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full text-white"
            >
              <i className="ri-arrow-left-line text-lg"></i>
            </button>
          )}
          <div>
            <h1 className="text-white text-xl font-bold">{title}</h1>
            {subtitle && <p className="text-violet-100 text-xs mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}