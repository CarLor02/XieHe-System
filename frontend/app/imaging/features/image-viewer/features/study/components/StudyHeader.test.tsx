import { render, screen } from '@testing-library/react';
import { expect, it, jest } from '@jest/globals';

import StudyHeader from './StudyHeader';

type HeaderDataOverrides = {
  patientName?: string;
  patientIdentifier?: string | null;
  patientGender?: string | null;
  patientAge?: number | null;
};

function renderHeader(overrides: HeaderDataOverrides = {}) {
  return render(
    <StudyHeader
      imageData={{
        patientName: '张三',
        patientIdentifier: 'P001',
        patientGender: 'MALE',
        patientAge: 41,
        examType: '正位X光片',
        ...overrides,
      }}
      saveMessage=""
      isSaving={false}
      canUseKeypointTools={true}
      isAIDetecting={false}
      isAIMeasuring={false}
      hasVertebraeLayer={true}
      showVertebraeLayer={true}
      onToggleVertebraeLayer={jest.fn()}
      onSave={jest.fn()}
      onAIMeasure={jest.fn()}
      onGenerateReport={jest.fn()}
    />
  );
}

it('shows the patient business identifier and demographics without database ids', () => {
  renderHeader();

  expect(
    screen.getByText('患者:张三 · 患者ID:P001 · 男 · 41岁')
  ).toBeTruthy();
  expect(screen.queryByText(/影像ID:/)).not.toBeTruthy();
});

it('uses consistent placeholders when optional patient fields are missing', () => {
  renderHeader({
    patientName: '',
    patientIdentifier: null,
    patientGender: 'UNKNOWN',
    patientAge: null,
  });

  expect(
    screen.getByText(
      '患者:患者不详 · 患者ID:患者ID不详 · 性别不详 · 年龄不详'
    )
  ).toBeTruthy();
});

it('shows age zero instead of treating it as missing', () => {
  renderHeader({
    patientGender: 'FEMALE',
    patientAge: 0,
  });

  expect(
    screen.getByText('患者:张三 · 患者ID:P001 · 女 · 0岁')
  ).toBeTruthy();
});

it('shows the detection-layer keyboard shortcut in the tooltip', () => {
  renderHeader();

  expect(screen.getByRole('button', { name: /检测层/ }).getAttribute('title')).toContain(
    '切换快捷键:Shift+D'
  );
});

it('does not render JSON import or export actions in the study header', () => {
  renderHeader();

  expect(screen.queryByText('导入JSON')).not.toBeTruthy();
  expect(screen.queryByText('导出JSON')).not.toBeTruthy();
});
