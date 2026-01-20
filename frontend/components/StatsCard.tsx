'use client';

import Link from 'next/link';

interface StatsCardProps {
  title: string;
  value: number;
  change?: number;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
  href?: string; // 可选的链接地址
}

export default function StatsCard({ title, value, icon, color, href }: StatsCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };

  // 安全地格式化数值，处理 undefined 和 null
  const formattedValue = (value ?? 0).toLocaleString();

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          {href ? (
            <Link href={href} className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">
              {formattedValue}
            </Link>
          ) : (
            <p className="text-2xl font-bold text-gray-900">{formattedValue}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          <i className={`${icon} w-6 h-6 flex items-center justify-center text-white`}></i>
        </div>
      </div>
    </div>
  );
}
