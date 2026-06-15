import { render, screen } from '@testing-library/react';
import { expect, it, jest } from '@jest/globals';

import StudyHeader from './StudyHeader';

function renderHeader() {
  return render(
    <StudyHeader
      imageData={{
        id: 'image-1',
        patientName: '张三',
        patientId: 'P001',
        examType: '正位X光片',
      }}
      saveMessage=""
      measurementsLength={1}
      isSaving={false}
      canExportJson={false}
      canUseKeypointTools={true}
      isAIDetecting={false}
      isAIMeasuring={false}
      hasVertebraeLayer={true}
      showVertebraeLayer={true}
      onToggleVertebraeLayer={jest.fn()}
      onSave={jest.fn()}
      onExportJson={jest.fn()}
      onImportJson={jest.fn()}
      onAIMeasure={jest.fn()}
      onGenerateReport={jest.fn()}
    />
  );
}

it('shows the detection-layer keyboard shortcut in the tooltip', () => {
  renderHeader();

  expect(screen.getByRole('button', { name: /检测层/ }).getAttribute('title')).toContain(
    '切换快捷键:Shift+D'
  );
});
