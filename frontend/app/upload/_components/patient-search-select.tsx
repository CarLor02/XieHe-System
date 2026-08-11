'use client';

import { useCallback, useState } from 'react';

import EntitySearchSelect, {
  type EntitySearchSelectLoadParams,
} from '@/components/common/EntitySearchSelect';
import { getPatients, type Patient } from '@/services/patientServices';
import { getPatientSearchDisplay } from '@xiehe/patient-core';

const PAGE_SIZE = 10;

interface PatientSearchSelectProps {
  value: string;
  onChange: (patientId: string) => void;
  contentClassName?: string;
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
      mapOption={getPatientSearchDisplay}
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
