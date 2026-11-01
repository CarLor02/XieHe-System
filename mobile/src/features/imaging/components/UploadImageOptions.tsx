import { useState } from 'react';
import { Image } from 'expo-image';
import { Modal, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  IconButton,
  Notice,
  SectionTitle,
  SelectionList,
} from '@/shared/ui';
import { colors, layout, spacing } from '@/shared/theme';
import type { ImageUploadEntry } from '@/features/imaging/domain/uploadEntry';
import type { ImageUploadSession } from '@/features/imaging/application/ImageUploadSession';
import { TeamPicker } from './TeamPicker';
import { examTypeOptions } from './imageSelectionOptions';

interface UploadImageOptionsProps {
  entry: ImageUploadEntry;
  remaining: number;
  busy: boolean;
  error: string;
  session: ImageUploadSession;
}

export function UploadImageOptions(props: UploadImageOptionsProps) {
  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={() => {
        if (!props.busy) props.session.closeEditor();
      }}
    >
      {/* 连续调整只重置表单，避免 iOS 同时关闭旧 Modal 和呈现新 Modal。 */}
      <UploadImageOptionsContent key={props.entry.id} {...props} />
    </Modal>
  );
}

function UploadImageOptionsContent({
  entry,
  remaining,
  busy,
  error,
  session,
}: UploadImageOptionsProps) {
  const [teamsOpen, setTeamsOpen] = useState(false);
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <View
        style={[
          layout.between,
          { padding: spacing.md, backgroundColor: colors.card },
        ]}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={layout.heading}>调整影像</Text>
          <Text numberOfLines={1} style={layout.muted}>
            {entry.originalFile.name}
          </Text>
        </View>
        <IconButton
          name="close"
          label="关闭调整"
          disabled={busy}
          onPress={session.closeEditor}
        />
      </View>
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
      >
        <Image
          source={{ uri: entry.file.uri }}
          contentFit="contain"
          style={{
            width: '100%',
            height: 250,
            borderRadius: 12,
            backgroundColor: colors.inverseSurface,
          }}
        />
        <Notice>默认屏幕左侧对应患者左侧以计算角度正负</Notice>
        <View style={layout.row}>
          <View style={layout.flex}>
            <Button
              title="左右翻转"
              icon="swap-horizontal-outline"
              variant="secondary"
              disabled={busy}
              onPress={() => void session.editPixels('flip')}
            />
          </View>
          <View style={layout.flex}>
            <Button
              title="裁剪影像"
              icon="crop-outline"
              variant="secondary"
              disabled={busy}
              onPress={() => void session.editPixels('crop')}
            />
          </View>
        </View>
        {(entry.flipped || entry.cropped) && (
          <Button
            title="恢复原图"
            variant="ghost"
            compact
            disabled={busy}
            onPress={session.resetImage}
          />
        )}
        <SectionTitle title="检查类型" />
        <SelectionList
          accessibilityLabel="影像检查类型"
          options={examTypeOptions}
          value={entry.examType}
          onChange={session.setExamType}
          disabled={busy}
        />
        <SectionTitle title="所属团队" />
        <Text style={layout.muted}>
          {entry.teams.map(team => team.name).join('、') || '未分配团队'}
        </Text>
        <Button
          title={teamsOpen ? '收起团队选择' : '选择所属团队'}
          variant="secondary"
          disabled={busy}
          onPress={() => setTeamsOpen(value => !value)}
        />
        {teamsOpen && (
          <TeamPicker
            selected={entry.teams}
            onToggle={team =>
              session.setTeams(
                entry.teams.some(item => item.id === team.id)
                  ? entry.teams.filter(item => item.id !== team.id)
                  : [...entry.teams, team]
              )
            }
          />
        )}
        {!!error && (
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>
            {error}
          </Text>
        )}
      </ScrollView>
      <View style={{ padding: spacing.md, backgroundColor: colors.card }}>
        <Button
          title={
            busy
              ? '正在处理影像…'
              : remaining
                ? `确认，下一张（剩余 ${remaining} 张）`
                : '确认'
          }
          loading={busy}
          onPress={session.closeEditor}
        />
      </View>
    </View>
  );
}
