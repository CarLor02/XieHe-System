export interface PatientDisplaySource {
  name: string;
  phone?: string | null;
  gender?: string | null;
  age?: number | null;
}

export function getPatientSearchDisplay(patient: PatientDisplaySource) {
  return {
    primary: patient.name,
    secondary: `手机号：${patient.phone?.trim() || '未提供'}`,
    meta: [
      patient.gender?.trim() || '未知',
      patient.age === null || patient.age === undefined
        ? '未知'
        : `${patient.age}岁`,
    ],
  };
}
