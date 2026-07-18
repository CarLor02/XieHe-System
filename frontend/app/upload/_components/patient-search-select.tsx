'use client';

import { useCallback, useState } from 'react';

import EntitySearchSelect, {
  type EntitySearchSelectLoadParams,
} from '@/components/common/EntitySearchSelect';
import { getPatients, type Patient } from '@/services/patientServices';

const PAGE_SIZE = 10;

interface PatientSearchSelectProps {
  value: string;
  onChange: (patientId: string) => void;
  contentClassName?: string;
}

function formatPhone(patient: Patient) {
  return patient.phone?.trim() || '未提供';
}

function formatGender(patient: Patient) {
  return patient.gender?.trim() || '未知';
}

function formatAge(patient: Patient) {
  return patient.age !== null && patient.age !== undefined
    ? `${patient.age}岁`
    : '未知';
}

export default function PatientSearchSelect({
  value,
  onChange,
  contentClassName,
}: PatientSearchSelectProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const loadPatients = useCallback(
    ({ page, pageSize, search }: EntitySearchSelectLoadParams) =>
      getPatients({
        page,
        page_size: pageSize,
        ...(search ? { search } : {}),
      }),
    []
  );

  return (
    <EntitySearchSelect
      value={value}
      selectedItem={selectedPatient}
      placeholder="请选择患者"
      searchPlaceholder="搜索患者姓名或手机号"
      pageSize={PAGE_SIZE}
      emptyText="暂无患者"
      loadOptions={loadPatients}
      getOptionValue={patient => String(patient.id)}
      mapOption={patient => ({
        primary: patient.name,
        secondary: `手机号：${formatPhone(patient)}`,
        meta: [formatGender(patient), formatAge(patient)],
      })}
      contentClassName={contentClassName}
      onChange={(patientId, patient) => {
        setSelectedPatient(patient);
        onChange(patientId);
      }}
      testIds={{
        primary: 'patient-option-primary',
        name: 'patient-option-name',
        secondary: 'patient-option-phone',
      }}
    />
  );
}
