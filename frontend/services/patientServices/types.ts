import { PaginatedResult } from '@/lib/api/types';

export interface Patient {
  id: number;
  patient_id: string;
  name: string;
  gender: string;
  birth_date?: string | null;
  age?: number | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  id_card?: string | null;
  insurance_number?: string | null;
  medical_history?: string | null;
  status?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PatientCreateRequest {
  patient_id: string;
  name: string;
  gender: string;
  birth_date?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  id_card?: string | null;
  insurance_number?: string | null;
}

export interface PatientUpdateRequest {
  name?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  id_card?: string | null;
  insurance_number?: string | null;
}

export interface PatientListFilters {
  page?: number;
  page_size?: number;
  search?: string;
  gender?: string;
  age_min?: number;
  age_max?: number;
  status?: string;
  has_images?: boolean;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export type PatientListResult = PaginatedResult<Patient>;

export interface DeletePatientResult {
  message: string;
}
