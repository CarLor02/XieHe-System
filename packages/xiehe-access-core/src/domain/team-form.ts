export type TeamFormMode = 'create' | 'edit';

export interface TeamFormValues {
  name: string;
  description: string;
  hospital: string;
  department: string;
  maxMembers: string;
}

export interface NormalizedTeamForm {
  name: string;
  description?: string;
  hospital?: string;
  department?: string;
  max_members?: number;
}

export type TeamFormValidationResult =
  | { valid: false; code: 'missing-name' }
  | { valid: true; value: NormalizedTeamForm };

export function normalizeTeamForm(
  form: TeamFormValues,
  mode: TeamFormMode
): TeamFormValidationResult {
  const name = form.name.trim();
  if (!name) return { valid: false, code: 'missing-name' };

  const maxMembers = Number(form.maxMembers);
  const optionalText = (value: string) =>
    value.trim() || (mode === 'edit' ? '' : undefined);
  return {
    valid: true,
    value: {
      name,
      description: optionalText(form.description),
      hospital: optionalText(form.hospital),
      department: optionalText(form.department),
      max_members: Number.isNaN(maxMembers) ? undefined : maxMembers,
    },
  };
}
