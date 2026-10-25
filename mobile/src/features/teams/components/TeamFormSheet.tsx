import { useState } from 'react';
import type { TeamSummary } from '@xiehe/api-contracts/generated';
import { normalizeTeamForm } from '@xiehe/access-core';
import { useMutation } from '@/shared/hooks/useMutation';
import { Button, ChoiceSheet, ErrorState, Field } from '@/shared/ui';
import type { TeamsGateway } from '@/features/teams/application/ports';

export function TeamFormSheet({
  gateway,
  team,
  onClose,
  onSaved,
}: {
  gateway: TeamsGateway;
  team?: TeamSummary;
  onClose: () => void;
  onSaved: (id: number) => void;
}) {
  const [form, setForm] = useState({
    name: team?.name ?? '',
    description: team?.description ?? '',
    hospital: team?.hospital ?? '',
    department: team?.department ?? '',
    maxMembers: String(team?.max_members ?? 50),
  });
  const mutation = useMutation();
  const submit = () =>
    mutation.run(
      async () => {
        const result = normalizeTeamForm(form, team ? 'edit' : 'create');
        if (!result.valid || result.value.name.length < 2)
          throw new Error('团队名称至少 2 个字');
        const maximum = Number(form.maxMembers);
        if (!Number.isInteger(maximum) || maximum < 1 || maximum > 500)
          throw new Error('成员上限应为 1–500 的整数');
        return team
          ? gateway.update(team.id, result.value)
          : gateway.create(result.value);
      },
      value => onSaved(value.id)
    );
  return (
    <ChoiceSheet
      open
      title={team ? '编辑团队' : '创建团队'}
      dismissible={!mutation.busy}
      onClose={() => {
        if (!mutation.busy) onClose();
      }}
    >
      {(
        [
          ['name', '团队名称', 120],
          ['hospital', '医院', 120],
          ['department', '科室', 120],
          ['description', '团队说明', 1000],
          ['maxMembers', '成员上限', 3],
        ] as const
      ).map(([key, label, limit]) => (
        <Field
          key={key}
          label={label}
          maxLength={limit}
          value={form[key]}
          multiline={key === 'description'}
          keyboardType={key === 'maxMembers' ? 'number-pad' : 'default'}
          editable={!mutation.busy}
          onChangeText={value =>
            setForm(current => ({ ...current, [key]: value }))
          }
        />
      ))}
      {!!mutation.error && <ErrorState message={mutation.error} />}
      <Button
        title="保存团队"
        loading={mutation.busy}
        onPress={() => void submit()}
      />
    </ChoiceSheet>
  );
}
