import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from '@jest/globals';

function readViewerFile(relativePath: string) {
  return readFileSync(
    join(process.cwd(), 'app/imaging/features/image-viewer', relativePath),
    'utf8'
  );
}

describe('image viewer responsive layout', () => {
  it('stacks the canvas and toolbar before desktop width', () => {
    const page = readViewerFile('ImageViewerPage.tsx');
    const toolbar = readViewerFile(
      'features/toolbar/components/AnnotationToolbar.tsx'
    );

    expect(page).toContain('flex-1 flex min-h-0 flex-col overflow-hidden md:flex-row');
    expect(toolbar).toContain('w-full');
    expect(toolbar).toContain('md:w-80');
    expect(toolbar).not.toContain('className="w-80 bg-gray-800');
  });

  it('lets header actions wrap instead of forcing a single row', () => {
    const header = readViewerFile('features/study/components/StudyHeader.tsx');

    expect(header).toContain('flex flex-col gap-3 lg:flex-row');
    expect(header).toContain('flex flex-wrap items-center');
  });

  it('keeps floating canvas panels inside narrow viewports', () => {
    const resultsPanel = readViewerFile(
      'features/annotation-canvas/panels/MeasurementResultsPanel.tsx'
    );
    const controlsPanel = readViewerFile(
      'features/annotation-canvas/panels/CanvasControlsPanel.tsx'
    );

    expect(resultsPanel).toContain('left-2 right-2 top-2');
    expect(resultsPanel).toContain('sm:w-[500px]');
    expect(controlsPanel).toContain('bottom-2 right-2');
    expect(controlsPanel).not.toContain('min-w-max');
  });
});
