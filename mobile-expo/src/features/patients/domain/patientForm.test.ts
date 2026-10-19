import { describe, expect, it } from 'vitest';
import { toPatientRequest, type PatientFormValue } from './patientForm';

const form: PatientFormValue = {
  patient_id: ' P001 ',
  name: ' 测试患者 ',
  gender: '男',
  birth_date: '2000-02-29',
  phone: '',
  email: '',
  address: '',
};
describe('mobile patient request', () => {
  it('retains the shared create contract and represents cleared optional fields as null', () => {
    expect(toPatientRequest(form, new Date('2026-10-19'))).toEqual({
      patient_id: 'P001',
      name: '测试患者',
      gender: '男',
      birth_date: '2000-02-29',
      phone: null,
      email: null,
      address: null,
    });
  });
  it.each(['2001-02-29', '2026-02-30', '2027-01-01', '2000-2-1'])(
    'rejects an invalid or future birth date: %s',
    birth_date => {
      expect(() =>
        toPatientRequest({ ...form, birth_date }, new Date('2026-10-19'))
      ).toThrow();
    }
  );
});
