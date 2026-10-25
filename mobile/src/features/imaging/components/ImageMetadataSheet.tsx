import { Text } from 'react-native';
import type { ImageFileDetail } from '@xiehe/api-contracts';
import { useWorkspace } from '@/application/AppProvider';
import {
  Button,
  ChoiceSheet,
  ErrorState,
  Field,
  Notice,
  SectionTitle,
  SelectionList,
} from '@/shared/ui';
import { layout } from '@/shared/theme';
import { useImageMetadata } from '@/features/imaging/application/useImageMetadata';
import { TeamPicker } from './TeamPicker';
import { examTypeOptions } from './imageSelectionOptions';

export function ImageMetadataSheet({
  image,
  mode,
  onClose,
  onSaved,
}: {
  image: ImageFileDetail;
  mode: 'rename' | 'info';
  onClose: () => void;
  onSaved: () => void;
}) {
  const { services } = useWorkspace();
  const form = useImageMetadata(image, services.imaging, onSaved);
  return (
    <ChoiceSheet
      open
      title={mode === 'rename' ? '重命名影像' : '编辑影像信息'}
      dismissible={!form.mutation.busy}
      onClose={() => {
        if (!form.mutation.busy) onClose();
      }}
    >
      {mode === 'rename' ? (
        <>
          <Field
            label="文件名"
            value={form.basename}
            onChangeText={form.setBasename}
            editable={!form.mutation.busy}
          />
          <Text style={layout.muted}>保留原始扩展名 {form.extension}</Text>
        </>
      ) : (
        <>
          <SectionTitle title="检查类型" />
          <SelectionList
            accessibilityLabel="检查类型"
            options={examTypeOptions}
            value={form.examType}
            onChange={form.setExamType}
            disabled={form.mutation.busy}
          />
          <Notice>
            变更检查类型会影响测量工具和点位解释，请先确认当前影像的实际检查类型。
          </Notice>
          <SectionTitle title="所属团队" />
          <Text style={layout.muted}>
            {form.teams.map(team => team.name).join('、') || '未分配团队'}
          </Text>
          <TeamPicker
            selected={form.teams}
            onToggle={team => {
              if (!form.mutation.busy)
                form.setTeams(teams =>
                  teams.some(item => item.id === team.id)
                    ? teams.filter(item => item.id !== team.id)
                    : [...teams, team]
                );
            }}
          />
        </>
      )}
      {!!form.mutation.error && <ErrorState message={form.mutation.error} />}
      <Button
        title="保存修改"
        loading={form.mutation.busy}
        onPress={() =>
          void (mode === 'rename' ? form.rename() : form.saveInfo())
        }
      />
    </ChoiceSheet>
  );
}
