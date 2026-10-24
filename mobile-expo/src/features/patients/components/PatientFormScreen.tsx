import { useCallback, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { getApiErrorMessage } from '@xiehe/api-client';
import { generatePatientIdentifier } from '@xiehe/patient-core';
import type { Patient } from '@xiehe/api-contracts';
import { Text, View } from 'react-native';
import { useWorkspace } from '@/application/AppProvider';
import { useResource } from '@/shared/hooks/useResource';
import {
  Button,
  Card,
  ErrorState,
  Field,
  FormContent,
  Header,
  LoadingState,
  Screen,
  SelectionList,
} from '@/shared/ui';
import { colors, layout } from '@/shared/theme';
import {
  toPatientRequest,
  type PatientFormValue,
} from '@/features/patients/domain/patientForm';
import { genderOptions } from './patientSelectionOptions';

function PatientForm({ patient }: { patient?: Patient }) {
  const { services } = useWorkspace();
  const [form, setForm] = useState<PatientFormValue>(() => ({
    patient_id:
      patient?.patient_id ??
      generatePatientIdentifier(new Date(), Math.random()),
    name: patient?.name ?? '',
    gender: patient?.gender ?? '',
    birth_date: patient?.birth_date ?? '',
    phone: patient?.phone ?? '',
    email: patient?.email ?? '',
    address: patient?.address ?? '',
    id_card: patient?.id_card ?? '',
    insurance_number: patient?.insurance_number ?? '',
    emergency_contact_name: patient?.emergency_contact_name ?? '',
    emergency_contact_phone: patient?.emergency_contact_phone ?? '',
  }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const change = (key: keyof PatientFormValue, value: string) =>
    setForm(current => ({ ...current, [key]: value }));
  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const request = toPatientRequest(form);
      const { patient_id: identifier, ...changes } = request;
      const saved = patient
        ? await services.patients.update(patient.id, changes)
        : await services.patients.create({
            ...changes,
            patient_id: identifier,
          });
      router.replace({ pathname: '/patients/[id]', params: { id: saved.id } });
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <FormContent>
      <Card style={{ gap: 22 }}>
        <Field
          label="患者姓名 *"
          value={form.name}
          onChangeText={value => change('name', value)}
          placeholder="请输入姓名"
          editable={!busy}
        />
        <Field
          label="患者编号 *"
          value={form.patient_id}
          onChangeText={value => change('patient_id', value)}
          editable={!patient && !busy}
        />
        <View>
          <Text style={layout.label}>性别 *</Text>
          <SelectionList
            accessibilityLabel="性别"
            options={genderOptions}
            value={form.gender}
            onChange={value => change('gender', value)}
            disabled={busy}
            style={{ gap: 8 }}
          />
        </View>
        <Field
          label="出生日期"
          value={form.birth_date}
          onChangeText={value => change('birth_date', value)}
          placeholder="YYYY-MM-DD，例如 1990-01-15"
          keyboardType="numbers-and-punctuation"
          editable={!busy}
        />
        <Field
          label="手机号"
          value={form.phone}
          onChangeText={value => change('phone', value)}
          placeholder="请输入联系电话"
          keyboardType="phone-pad"
          editable={!busy}
        />
        <Field
          label="邮箱"
          value={form.email}
          onChangeText={value => change('email', value)}
          placeholder="选填"
          keyboardType="email-address"
          editable={!busy}
        />
        <Field
          label="联系地址"
          value={form.address}
          onChangeText={value => change('address', value)}
          placeholder="选填"
          multiline
          editable={!busy}
        />
        {(
          [
            ['id_card', '身份证号', 18],
            ['insurance_number', '医保号', 50],
            ['emergency_contact_name', '紧急联系人', 100],
            ['emergency_contact_phone', '紧急联系电话', 20],
          ] as const
        ).map(([key, label, maxLength]) => (
          <Field
            key={key}
            label={label}
            value={form[key] ?? ''}
            onChangeText={value => change(key, value)}
            maxLength={maxLength}
            editable={!busy}
          />
        ))}
      </Card>
      {!!error && (
        <Text
          accessibilityRole="alert"
          style={{ color: colors.danger, lineHeight: 21 }}
        >
          {error}
        </Text>
      )}
      <Button
        title={patient ? '保存修改' : '建立患者档案'}
        icon="checkmark-outline"
        loading={busy}
        onPress={() => void submit()}
      />
    </FormContent>
  );
}

export function PatientFormScreen({ editing = false }: { editing?: boolean }) {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { services } = useWorkspace();
  const load = useCallback(
    () =>
      editing ? services.patients.get(Number(id)) : Promise.resolve(undefined),
    [editing, services, id]
  );
  const resource = useResource(load);
  return (
    <Screen>
      <Header
        title={editing ? '编辑患者' : '新增患者'}
        subtitle="完善患者的基本资料"
        back
      />
      {editing && resource.loading ? (
        <LoadingState />
      ) : resource.error ? (
        <ErrorState
          message={resource.error}
          onRetry={() => void resource.reload()}
        />
      ) : (
        <PatientForm key={id ?? 'new'} patient={resource.data} />
      )}
    </Screen>
  );
}
