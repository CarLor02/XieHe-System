import { createElement, type ComponentType, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { colors, radii, sizes } from '@/shared/theme';
import { FilterChip } from '@/shared/ui/filter-chip';
import { ButtonSurface as AndroidButton } from './ButtonSurface.android';
import { ButtonSurface as IOSButton } from './ButtonSurface.ios';
import type { ButtonSurfaceProps } from './types';

const native = vi.hoisted(() => ({
  platform: { OS: 'android' },
  fontLoaded: true,
  views: [] as { kind: string; props: Record<string, unknown> }[],
}));

vi.mock('react-native', async () => {
  const { createElement, Fragment } = await import('react');
  return {
    Platform: native.platform,
    StyleSheet: { create: (styles: unknown) => styles },
    View: (props: Record<string, unknown>) => {
      native.views.push({ kind: 'RNFrame', props });
      return createElement(Fragment, null, props.children as ReactNode);
    },
    Text: () => {
      throw new Error('原生按钮不能渲染 RN 文字');
    },
  };
});
vi.mock('@/shared/ui/button-surface', () => ({
  ButtonSurface: (props: ButtonSurfaceProps) =>
    createElement(
      native.platform.OS === 'android' ? AndroidButton : IOSButton,
      props
    ),
}));
vi.mock('expo-font', () => ({ useFonts: () => [native.fontLoaded, null] }));
vi.mock('@expo/vector-icons', () => ({
  Ionicons: {
    font: { ionicons: 1 },
    glyphMap: { add: 43, 'arrow-back': '←', 'filter-outline': 'F' },
    getFontFamily: () => 'ionicons',
  },
}));

vi.mock('@expo/ui/jetpack-compose', async () => {
  const { createElement, Fragment } = await import('react');
  const view = (kind: string) => (props: Record<string, unknown>) => {
    native.views.push({ kind, props });
    return createElement(Fragment, null, props.children as ReactNode);
  };
  return {
    ...Object.fromEntries(
      [
        'Host',
        'TextButton',
        'IconButton',
        'Row',
        'Text',
        'CircularProgressIndicator',
      ].map(kind => [kind, view(kind)])
    ),
    Shape: {
      Circle: (props: Record<string, unknown>) => ({
        type: 'circle',
        ...props,
      }),
      RoundedCorner: (props: Record<string, unknown>) => ({
        type: 'roundedCorner',
        ...props,
      }),
    },
    // 原生按钮必须在同一个布局/触控树内完成；这个约束防止再次引入混合标签。
    RNHostView: () => {
      throw new Error('原生按钮内不能嵌套 RNHostView');
    },
  };
});
vi.mock('@expo/ui/jetpack-compose/modifiers', () =>
  Object.fromEntries(
    ['alpha', 'defaultMinSize', 'fillMaxWidth', 'semantics', 'size'].map(
      kind => [kind, (...values: unknown[]) => ({ kind, values })]
    )
  )
);
vi.mock('@expo/ui/swift-ui', async () => {
  const { createElement, Fragment } = await import('react');
  const view = (kind: string) => (props: Record<string, unknown>) => {
    native.views.push({ kind, props });
    return createElement(Fragment, null, props.children as ReactNode);
  };
  return {
    ...Object.fromEntries(
      ['Host', 'Button', 'HStack', 'Text', 'ProgressView'].map(kind => [
        kind,
        view(kind),
      ])
    ),
    RNHostView: () => {
      throw new Error('原生按钮内不能嵌套 RNHostView');
    },
  };
});
vi.mock('@expo/ui/swift-ui/modifiers', () => ({
  ...Object.fromEntries(
    [
      'accessibilityElement',
      'accessibilityAddTraits',
      'accessibilityHidden',
      'accessibilityLabel',
      'accessibilityValue',
      'background',
      'buttonStyle',
      'contentShape',
      'disabled',
      'font',
      'foregroundStyle',
      'frame',
      'opacity',
      'padding',
      'tint',
    ].map(kind => [kind, (...values: unknown[]) => ({ kind, values })])
  ),
  shapes: { roundedRectangle: (props: Record<string, unknown>) => props },
}));

function webOnlyLabel(): never {
  throw new Error('原生按钮不能渲染 Web/RN 标签');
}

function renderButton(
  Surface: ComponentType<ButtonSurfaceProps>,
  overrides: Partial<ButtonSurfaceProps> = {}
) {
  const onPress = vi.fn();
  const props: ButtonSurfaceProps = {
    label: '下一页',
    size: 'compact',
    disabled: false,
    onPress,
    backgroundColor: '#F3EDFF',
    foregroundColor: '#7C3AED',
    children: createElement(webOnlyLabel),
    ...overrides,
  };
  renderToStaticMarkup(createElement(Surface, props));
  const control = native.views.find(view =>
    ['TextButton', 'IconButton', 'Button'].includes(view.kind)
  );
  expect(control).toBeDefined();
  return { onPress, props: control!.props };
}

describe.each([
  ['android', AndroidButton],
  ['ios', IOSButton],
] as const)('%s native button contract', (platform, Surface) => {
  beforeEach(() => {
    native.platform.OS = platform;
    native.fontLoaded = true;
    native.views.length = 0;
  });

  it('keeps a compact pagination label native and forwards its action once', () => {
    const { onPress, props } = renderButton(Surface);
    expect(
      native.views.some(
        view => view.kind === 'Text' && view.props.children === '下一页'
      )
    ).toBe(true);
    (
      (props.onClick as (() => void) | undefined) ??
      (props.onPress as () => void)
    )();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each([{ disabled: true }, { disabled: true, busy: true }])(
    'does not expose a native press action when blocked: %j',
    state => {
      const { onPress, props } = renderButton(Surface, state);
      expect(props.onClick ?? props.onPress).toBeUndefined();
      expect(onPress).not.toHaveBeenCalled();
      if (state.busy) {
        expect(
          native.views.some(view =>
            ['CircularProgressIndicator', 'ProgressView'].includes(view.kind)
          )
        ).toBe(true);
        expect(
          native.views.some(
            view => view.kind === 'Text' && view.props.children === '下一页'
          )
        ).toBe(true);
      }
    }
  );

  it('renders an icon-only header action as a native font glyph with a fixed host size', () => {
    renderButton(Surface, { label: '新增患者', size: 'icon', icon: 'add' });
    expect(
      native.views.some(
        view => view.kind === 'Text' && view.props.children === '+'
      )
    ).toBe(true);
    expect(
      native.views.find(view => view.kind === 'Host')?.props.style
    ).toMatchObject({
      width: sizes.iconButton,
      height: sizes.iconButton,
      flexShrink: 0,
    });
  });

  if (platform === 'android') {
    it.each(['add', 'arrow-back'] as const)(
      'uses a full-size circular clipping outline for the %s header action',
      icon => {
        const { props } = renderButton(Surface, {
          size: 'icon',
          icon,
          backgroundColor: '#FFFFFF25',
          foregroundColor: '#FFFFFF',
        });
        // Expo UI Android 的 Circle 原生默认半径为 0，会将背景和字形一起裁掉。
        expect(props.shape).toMatchObject({ type: 'circle', radius: 1 });
        expect(props.colors).toMatchObject({
          containerColor: '#FFFFFF25',
          contentColor: '#FFFFFF',
        });
      }
    );
  }

  it('waits for the icon font and renders the glyph when it becomes available', () => {
    native.fontLoaded = false;
    renderButton(Surface, { size: 'icon', icon: 'add' });
    expect(native.views.some(view => view.kind === 'Text')).toBe(false);
    native.views.length = 0;
    native.fontLoaded = true;
    renderButton(Surface, { size: 'icon', icon: 'add' });
    expect(
      native.views.some(
        view => view.kind === 'Text' && view.props.children === '+'
      )
    ).toBe(true);
  });

  it.each([false, true])(
    'keeps the public filter chip controlled and opens its selector once (active=%s)',
    active => {
      const onPress = vi.fn();
      const title = active ? '性别: 女' : '性别: 全部';
      renderToStaticMarkup(
        createElement(FilterChip, {
          title,
          icon: 'filter-outline',
          active,
          onPress,
        })
      );
      const control = native.views.find(view =>
        ['TextButton', 'Button'].includes(view.kind)
      );
      expect(control).toBeDefined();
      expect(
        native.views.some(
          view => view.kind === 'Text' && view.props.children === title
        )
      ).toBe(true);
      expect(
        native.views.some(
          view => view.kind === 'Text' && view.props.children === 'F'
        )
      ).toBe(true);

      // 边框/阴影只有一个外层；原生按钮负责全部点击，未嵌套 RN 标签或另一个点击目标。
      const frames = native.views.filter(view => view.kind === 'RNFrame');
      expect(frames).toHaveLength(1);
      expect(
        Object.assign({}, ...(frames[0].props.style as object[]))
      ).toMatchObject({
        backgroundColor: active ? colors.primary : colors.card,
        borderColor: active ? colors.primary : colors.border,
        borderRadius: radii.pill,
      });

      const nativeModifiers = control!.props.modifiers as {
        kind: string;
        values: unknown[];
      }[];
      if (platform === 'android') {
        expect(control!.props.shape).toMatchObject({
          cornerRadii: {
            topStart: radii.pill,
            topEnd: radii.pill,
            bottomStart: radii.pill,
            bottomEnd: radii.pill,
          },
        });
        expect(control!.props.colors).toMatchObject({
          containerColor: active ? colors.primary : colors.card,
          contentColor: active ? colors.onPrimary : colors.muted,
        });
        expect(
          nativeModifiers.find(modifier => modifier.kind === 'semantics')
            ?.values
        ).toEqual([
          { contentDescription: active ? `${title}，已筛选` : title },
        ]);
      } else {
        expect(
          nativeModifiers.some(
            modifier =>
              modifier.kind === 'accessibilityAddTraits' &&
              (modifier.values[0] as string[]).includes('isSelected')
          )
        ).toBe(active);
      }

      const press = (control!.props.onClick ??
        control!.props.onPress) as () => void;
      press();
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(
        native.views.some(
          view => view.kind === 'Text' && view.props.children === title
        )
      ).toBe(true);
    }
  );
});
