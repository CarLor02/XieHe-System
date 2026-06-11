import { render, screen } from '@testing-library/react';
import { expect, it, jest } from '@jest/globals';

import ModelCard from './ModelCard';

it('keeps model status badges in normal flow so they do not cover the title', () => {
  render(
    <ModelCard
      model={{
        id: 'model-1',
        title: '脊柱侧面分析模型v2',
        icon: 'side',
        status: 'ready',
        view_type: 'side',
        isActive: true,
        is_system_default: true,
        accuracy: '99%',
        lastUpdated: '2026/2/8',
        category: 'side',
      }}
      onActivateClick={jest.fn()}
    />
  );

  expect(screen.getByText('系统默认')).toBeTruthy();
  expect(screen.getAllByText('当前使用中').length).toBeGreaterThan(0);

  const badgeGroup = screen.getByText('系统默认').closest('div');
  expect(badgeGroup?.className).not.toContain('absolute');
  expect(badgeGroup?.className).toContain('flex-wrap');
});
