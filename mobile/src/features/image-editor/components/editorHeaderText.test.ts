import { describe, expect, it } from 'vitest';
import { getEditorHeaderText } from './editorHeaderText';

const source = {
  patient_name: ' 张三 ',
  patient_identifier: ' P001 ',
  patient_gender: 'MALE',
  patient_age: 41,
  description: ' 正位X光片 ',
  file_type: 'PNG' as const,
};

describe('editor header information', () => {
  it('shows the patient, exam, business identifier, gender and age in order', () => {
    expect(getEditorHeaderText(source)).toEqual({
      title: '张三 - 正位X光片',
      summary: '患者ID:P001 · 男 · 41岁',
    });
  });

  it('uses explicit placeholders instead of internal database identifiers', () => {
    const missing = {
      ...source,
      id: 42,
      patient_id: 99,
      patient_name: ' ',
      patient_identifier: null,
      patient_gender: 'UNKNOWN',
      patient_age: null,
    };
    expect(getEditorHeaderText(missing)).toEqual({
      title: '患者不详 - 正位X光片',
      summary: '患者ID:患者ID不详 · 性别不详 · 年龄不详',
    });
  });

  it('keeps age zero and normalizes gender codes', () => {
    expect(
      getEditorHeaderText({
        ...source,
        patient_age: 0,
        patient_gender: ' female ',
      }).summary
    ).toBe('患者ID:P001 · 女 · 0岁');
  });

  it.each([-1, 3.5])('does not display an invalid age %s', patient_age => {
    expect(getEditorHeaderText({ ...source, patient_age }).summary).toBe(
      '患者ID:P001 · 男 · 年龄不详'
    );
  });

  it('falls back to the image modality when no exam description is available', () => {
    expect(getEditorHeaderText({ ...source, description: ' ' }).title).toBe(
      '张三 - PNG'
    );
  });
});
