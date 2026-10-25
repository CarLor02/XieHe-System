import { Drawer } from 'vaul';
import { layout } from '@/shared/theme';

// Expo 的兼容入口未提供 Web 弹层标题，使用同一个 Vaul 上下文补齐读屏名称。
export function SheetTitle({ title }: { title: string }) {
  return (
    <>
      <Drawer.Title style={{ ...layout.heading, margin: 0, flex: 1 }}>
        {title}
      </Drawer.Title>
      <Drawer.Description
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clipPath: 'inset(50%)',
        }}
      >
        面板内容可滚动查看。
      </Drawer.Description>
    </>
  );
}
