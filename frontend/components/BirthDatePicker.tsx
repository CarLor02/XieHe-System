/**
 * 出生日期选择器组件
 * 提供年/月/日分开选择的方式，体验更好
 */

import { useEffect, useState } from 'react';

interface BirthDatePickerProps {
  value: string; // YYYY-MM-DD 格式
  onChange: (date: string) => void;
  required?: boolean;
  disabled?: boolean;
}

export default function BirthDatePicker({
  value,
  onChange,
  required = false,
  disabled = false,
}: BirthDatePickerProps) {
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [isInternalChange, setIsInternalChange] = useState(false);

  // 生成年份选项（1900 - 当前年份）
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i);

  // 生成月份选项
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // 生成日期选项（根据年月动态计算）
  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month, 0).getDate();
  };

  const days = (() => {
    if (!year || !month) return Array.from({ length: 31 }, (_, i) => i + 1);
    const daysInMonth = getDaysInMonth(parseInt(year), parseInt(month));
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  })();

  // 当外部值变化时，更新内部状态（仅当不是内部触发的变化时）
  useEffect(() => {
    if (isInternalChange) {
      setIsInternalChange(false);
      return;
    }

    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        const yearVal = parts[0];
        // 去掉月份和日期的前导零，以匹配下拉选项的值
        const monthVal = String(parseInt(parts[1], 10));
        const dayVal = String(parseInt(parts[2], 10));

        setYear(yearVal);
        setMonth(monthVal);
        setDay(dayVal);
      }
    } else {
      setYear('');
      setMonth('');
      setDay('');
    }
  }, [value]);

  // 当年/月/日变化时，通知外部
  useEffect(() => {
    if (year && month && day) {
      const monthStr = month.padStart(2, '0');
      const dayStr = day.padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      // 验证日期有效性
      const date = new Date(dateStr);
      if (!isNaN(date.getTime()) && dateStr !== value) {
        setIsInternalChange(true);
        onChange(dateStr);
      }
    } else if (!year && !month && !day && value !== '') {
      setIsInternalChange(true);
      onChange('');
    }
  }, [year, month, day]);

  return (
    <div className="flex space-x-2">
      {/* 年份选择 */}
      <div className="flex-1">
        <select
          value={year}
          onChange={e => setYear(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required={required}
          disabled={disabled}
        >
          <option value="">年</option>
          {years.map(y => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* 月份选择 */}
      <div className="flex-1">
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required={required}
          disabled={disabled}
        >
          <option value="">月</option>
          {months.map(m => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* 日期选择 */}
      <div className="flex-1">
        <select
          value={day}
          onChange={e => setDay(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required={required}
          disabled={disabled}
        >
          <option value="">日</option>
          {days.map(d => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

