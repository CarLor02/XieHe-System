import { useState, useRef, useCallback, ReactNode } from 'react';

type Placement = 'top' | 'bottom' | 'bottom-end' | 'left';

interface ToolTooltipProps {
  tooltip: string;
  children: ReactNode;
  placement?: Placement;
}

/**
 * 移动端长按 / 桌面端 hover 触发的 tooltip
 * tooltip 文本支持 \n 换行，第一行作为标题加粗显示
 */
export default function ToolTooltip({ tooltip, children, placement = 'top' }: ToolTooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lines = tooltip.split('\n');
  const title = lines[0];
  const desc = lines.slice(1).join('\n');

  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);

  // 长按触发（移动端）
  const handleTouchStart = useCallback(() => {
    timerRef.current = setTimeout(() => {
      show();
    }, 500);
  }, [show]);

  const handleTouchEnd = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTimeout(hide, 1800);
  }, [hide]);

  const handleTouchMove = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const positionClass =
    placement === 'top'
      ? 'bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2'
      : placement === 'bottom'
        ? 'top-[calc(100%+8px)] left-1/2 -translate-x-1/2'
        : placement === 'bottom-end'
          ? 'top-[calc(100%+8px)] right-0'
          : 'right-[calc(100%+8px)] top-1/2 -translate-y-1/2';

  const isBelow = placement === 'bottom' || placement === 'bottom-end';

  const bubble = (
    <div className="bg-gray-900/95 border border-gray-600/60 rounded-xl px-3 py-2.5 shadow-2xl backdrop-blur-sm">
      <p className="text-white text-[11px] font-semibold leading-snug mb-1">{title}</p>
      {desc && <p className="text-gray-300 text-[10px] leading-relaxed whitespace-pre-line">{desc}</p>}
    </div>
  );

  return (
    <div
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hide}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {children}

      {visible && (
        <div
          className={`absolute z-[999] pointer-events-none ${positionClass}`}
          style={{ minWidth: '180px', maxWidth: '240px' }}
        >
          {isBelow && (
            <div className={`flex ${placement === 'bottom-end' ? 'justify-end pr-3' : 'justify-center'}`}>
              <div
                className="w-0 h-0"
                style={{
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderBottom: '5px solid rgba(17,24,39,0.95)',
                }}
              />
            </div>
          )}

          {bubble}

          {!isBelow && placement !== 'left' && (
            <div className="flex justify-center">
              <div
                className="w-0 h-0"
                style={{
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '5px solid rgba(17,24,39,0.95)',
                }}
              />
            </div>
          )}

          {placement === 'left' && (
            <div
              className="absolute right-[-5px] top-1/2 -translate-y-1/2 w-0 h-0"
              style={{
                borderTop: '5px solid transparent',
                borderBottom: '5px solid transparent',
                borderLeft: '5px solid rgba(17,24,39,0.95)',
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}