import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
import { colors, gradients } from '@/shared/theme';

vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: unknown) => styles },
}));

const require = createRequire(
  new URL('../../../app.config.js', import.meta.url)
);

function luminance(hex: string) {
  const channels = [1, 3, 5].map(start => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(a: string, b: string) {
  const light = Math.max(luminance(a), luminance(b));
  const dark = Math.min(luminance(a), luminance(b));
  return (light + 0.05) / (dark + 0.05);
}

describe('static brand theme', () => {
  it('uses the requested primary color in both the app and resolved splash config', () => {
    // 用 Node 直接读取配置，防止构建入口意外依赖 React Native 或主题运行时。
    const configure = require('./app.config.js');
    const { expo } = require('./app.json');
    const resolved = configure({ config: expo });
    const splash = resolved.plugins.find(
      (plugin: unknown) =>
        Array.isArray(plugin) && plugin[0] === 'expo-splash-screen'
    );

    expect(colors.primary).toBe('#123208');
    expect(splash[1]).toMatchObject({
      backgroundColor: colors.primary,
      image: './assets/images/splash-icon.png',
      imageWidth: 76,
    });
    expect(resolved.android.package).toBe(expo.android.package);
    expect(resolved.plugins).toContain('expo-secure-store');
  });

  it('keeps primary text and brand surfaces readable', () => {
    expect(contrast(colors.primary, colors.card)).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(colors.primary, colors.primaryLight)
    ).toBeGreaterThanOrEqual(4.5);
    for (const background of [...gradients.brand, ...gradients.header]) {
      expect(contrast(colors.onPrimary, background)).toBeGreaterThanOrEqual(
        4.5
      );
    }
  });
});
