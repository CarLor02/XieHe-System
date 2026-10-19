import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Platform, Pressable, Text, View } from 'react-native';
import { EXAM_TYPES } from '@xiehe/imaging-core';
import {
  Button,
  Card,
  Choice,
  ChoiceSheet,
  Content,
  Header,
  Icon,
  Notice,
  Screen,
  SectionTitle,
} from '../../../shared/ui';
import { colors, layout } from '../../../shared/theme';
import { PatientPicker } from '../../patients/selection';
import { useImageUpload } from '../application/useImageUpload';
import { formatFileSize } from '../domain/presentation';
import { TeamPicker } from './TeamPicker';

export function ImageUploadScreen() {
  const params = useLocalSearchParams<{
    patientId?: string;
    patientName?: string;
  }>();
  const [patient, setPatient] = useState<{ id: number; name: string } | null>(
    () =>
      params.patientId
        ? {
            id: Number(params.patientId),
            name: params.patientName || `患者 ${params.patientId}`,
          }
        : null
  );
  const [examType, setExamType] = useState('');
  const [teams, setTeams] = useState<{ id: number; name: string }[]>([]);
  const [sheet, setSheet] = useState<'patient' | 'team' | null>(null);
  const upload = useImageUpload();
  return (
    <Screen>
      <Header
        title="上传影像"
        subtitle="选择检查影像并完善归属信息"
        back={!upload.busy}
      />
      <Content>
        <Card style={{ gap: 18 }}>
          <View style={{ alignItems: 'center', gap: 12, paddingVertical: 22 }}>
            <View
              style={{
                height: 70,
                width: 70,
                borderRadius: 23,
                backgroundColor: colors.primaryLight,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon
                name={
                  upload.file
                    ? 'document-attach-outline'
                    : 'cloud-upload-outline'
                }
                size={34}
              />
            </View>
            <Text style={layout.heading}>
              {upload.file?.name || '添加检查影像'}
            </Text>
            <Text style={layout.muted}>
              {upload.file
                ? formatFileSize(upload.file.size)
                : 'PNG / JPEG / TIFF / DICOM · 最大 100 MB'}
            </Text>
          </View>
          <Button
            title={upload.file ? '重新选择文件' : '从文件中选择'}
            icon="folder-open-outline"
            onPress={() => void upload.pick('file')}
            disabled={upload.busy}
          />
          {Platform.OS !== 'web' && (
            <View style={layout.row}>
              <View style={layout.flex}>
                <Button
                  title="相册"
                  variant="secondary"
                  icon="images-outline"
                  onPress={() => void upload.pick('gallery')}
                  disabled={upload.busy}
                />
              </View>
              <View style={layout.flex}>
                <Button
                  title="拍照"
                  variant="secondary"
                  icon="camera-outline"
                  onPress={() => void upload.pick('camera')}
                  disabled={upload.busy}
                />
              </View>
            </View>
          )}
        </Card>
        <Card style={{ gap: 14 }}>
          <SectionTitle title="检查类型 *" />
          {EXAM_TYPES.map(type => (
            <Choice
              key={type}
              title={type}
              selected={type === examType}
              onPress={() => {
                if (!upload.busy) setExamType(type);
              }}
            />
          ))}
        </Card>
        <Card style={{ gap: 16 }}>
          <SectionTitle title="归属信息" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="关联患者"
            disabled={upload.busy}
            style={layout.between}
            onPress={() => setSheet('patient')}
          >
            <View style={{ gap: 6 }}>
              <Text style={layout.body}>关联患者</Text>
              <Text style={layout.muted}>{patient?.name || '未关联患者'}</Text>
            </View>
            <Icon name="chevron-forward" color={colors.faint} size={18} />
          </Pressable>
          <View style={layout.divider} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="选择所属团队"
            disabled={upload.busy}
            style={layout.between}
            onPress={() => setSheet('team')}
          >
            <View style={[layout.flex, { gap: 6 }]}>
              <Text style={layout.body}>所属团队</Text>
              <Text style={layout.muted}>
                {teams.map(team => team.name).join('、') || '未分配团队'}
              </Text>
            </View>
            <Icon name="chevron-forward" color={colors.faint} size={18} />
          </Pressable>
        </Card>
        {upload.busy && (
          <Card style={{ gap: 12 }}>
            <Text style={layout.body}>
              {upload.progress < 99
                ? `正在上传 ${upload.progress}%`
                : '文件已发送，正在等待服务端确认…'}
            </Text>
            <View
              style={{
                height: 7,
                backgroundColor: colors.primaryLight,
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${upload.progress}%`,
                  backgroundColor: colors.primary,
                  borderRadius: 4,
                }}
              />
            </View>
          </Card>
        )}
        {!!upload.error && (
          <Text
            accessibilityRole="alert"
            style={{ color: colors.danger, lineHeight: 22 }}
          >
            {upload.error}
          </Text>
        )}
        <Notice>
          拍照会生成普通照片，不能替代原始医学影像。上传期间请保持应用在前台。
        </Notice>
        <Button
          title="开始上传"
          icon="cloud-upload-outline"
          loading={upload.busy}
          disabled={!upload.file}
          onPress={() =>
            void upload.upload(
              patient?.id ?? null,
              examType,
              teams.map(team => team.id)
            )
          }
        />
      </Content>
      <ChoiceSheet
        title="关联患者"
        open={sheet === 'patient'}
        onClose={() => setSheet(null)}
      >
        {sheet === 'patient' && (
          <>
            <Button
              title="取消关联"
              variant="ghost"
              compact
              onPress={() => {
                setPatient(null);
                setSheet(null);
              }}
            />
            <PatientPicker
              selectedId={patient?.id}
              onSelect={value => {
                setPatient(value);
                setSheet(null);
              }}
            />
          </>
        )}
      </ChoiceSheet>
      <ChoiceSheet
        title="选择所属团队（可多选）"
        open={sheet === 'team'}
        onClose={() => setSheet(null)}
      >
        {sheet === 'team' && (
          <>
            <TeamPicker
              selected={teams}
              onToggle={team =>
                setTeams(current =>
                  current.some(item => item.id === team.id)
                    ? current.filter(item => item.id !== team.id)
                    : [...current, team]
                )
              }
            />
            <Button title="完成选择" onPress={() => setSheet(null)} />
          </>
        )}
      </ChoiceSheet>
    </Screen>
  );
}
