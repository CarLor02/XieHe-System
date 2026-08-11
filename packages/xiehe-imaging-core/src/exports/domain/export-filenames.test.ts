import { describe, expect, it } from 'vitest';
import {
  buildLabelMeExportPath,
  buildTrainingLabelFilename,
} from './export-filenames';

describe('export filenames', () => {
  it('always nests LabelMe files under the patient identifier', () => {
    expect(
      buildLabelMeExportPath(
        { id: 1, original_filename: 'spine.jpg', patient_identifier: 'P001' },
        'spine.json'
      )
    ).toBe('P001/spine.json');
  });

  it('builds a matching normalized training label name', () => {
    expect(
      buildTrainingLabelFilename({ id: 1, original_filename: 'spine.jpg' })
    ).toBe('spine_label.json');
  });
});
