import type { PatientCreateRequest } from '@xiehe/api-contracts';

export interface PatientFormValue {
  patient_id: string;
  name: string;
  gender: string;
  birth_date: string;
  phone: string;
  email: string;
  address: string;
  id_card?: string;
  insurance_number?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}
export function toPatientRequest(
  form: PatientFormValue,
  now = new Date()
): PatientCreateRequest {
  if (!form.patient_id.trim()) throw new Error('请填写患者编号');
  if (!form.name.trim()) throw new Error('请填写患者姓名');
  if (!['男', '女', '未知'].includes(form.gender))
    throw new Error('请选择性别');
  const birthDate = form.birth_date.trim();
  if (birthDate) {
    const date = new Date(`${birthDate}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== birthDate
    )
      throw new Error('出生日期格式应为 YYYY-MM-DD，且日期须有效');
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (birthDate > today) throw new Error('出生日期不能晚于今天');
  }
  if (
    form.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
  )
    throw new Error('请输入有效的邮箱');
  return {
    patient_id: form.patient_id.trim(),
    name: form.name.trim(),
    gender: form.gender,
    birth_date: birthDate || null,
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    address: form.address.trim() || null,
    id_card: form.id_card?.trim() || null,
    insurance_number: form.insurance_number?.trim() || null,
    emergency_contact_name: form.emergency_contact_name?.trim() || null,
    emergency_contact_phone: form.emergency_contact_phone?.trim() || null,
  };
}
