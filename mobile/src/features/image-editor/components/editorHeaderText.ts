import type { ImageFileResponse } from '@xiehe/api-contracts/generated';

type HeaderSource = Pick<
  ImageFileResponse,
  | 'patient_name'
  | 'patient_identifier'
  | 'patient_gender'
  | 'patient_age'
  | 'description'
  | 'file_type'
>;

const genderLabels: Record<string, string> = {
  MALE: '男',
  FEMALE: '女',
  OTHER: '其他',
  男: '男',
  女: '女',
  其他: '其他',
};

export function getEditorHeaderText(image: HeaderSource | null) {
  const patientName = image
    ? image.patient_name?.trim() || '患者不详'
    : '加载中...';
  const examType = image
    ? image.description?.trim() || image.file_type
    : '加载中...';
  // 展示业务患者编号，不能用数据库 patient_id 或影像编号补齐。
  const identifier = image?.patient_identifier?.trim() || '患者ID不详';
  const gender =
    genderLabels[image?.patient_gender?.trim().toUpperCase() || ''] ||
    '性别不详';
  const age = image?.patient_age;
  const ageLabel =
    age !== undefined && age !== null && Number.isInteger(age) && age >= 0
      ? `${age}岁`
      : '年龄不详';
  return {
    title: `${patientName} - ${examType}`,
    summary: [`患者ID:${identifier}`, gender, ageLabel].join(' · '),
  };
}
