import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { summarizeUploadQueue } from '@xiehe/upload-core';
import {
  Button,
  Card,
  ChoiceSheet,
  Content,
  Header,
  Icon,
  Notice,
  Screen,
  SectionTitle,
} from '@/shared/ui';
import { useImageCropper } from '@/shared/ui/image-cropper';
import { colors, layout } from '@/shared/theme';
import { PatientPicker } from '@/features/patients/selection';
import { useImageUpload } from '@/features/imaging/application/useImageUpload';
import { UploadImageList } from './UploadImageList';
import { UploadImageOptions } from './UploadImageOptions';

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
  const [patientOpen, setPatientOpen] = useState(false);
  const cropper = useImageCropper();
  const upload = useImageUpload(cropper);
  const { session, entries, busy } = upload;
  const activeEntry = entries.find(
    entry => entry.id === upload.options.activeFileId
  );
  const summary = summarizeUploadQueue(entries);
  return (
    <Screen>
      <Header
        title="上传影像"
        subtitle="选择检查影像并完善归属信息"
        back={!busy}
      />
      <Content>
        <Card style={{ gap: 16 }}>
          <SectionTitle title="关联患者 *" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="关联患者"
            disabled={busy}
            style={layout.between}
            onPress={() => setPatientOpen(true)}
          >
            <Text style={patient ? layout.body : layout.muted}>
              {patient?.name || '请选择患者'}
            </Text>
            <Icon name="chevron-forward" color={colors.faint} size={18} />
          </Pressable>
        </Card>
        <Card style={{ gap: 16 }}>
          <SectionTitle title="添加检查影像" />
          <Text style={layout.muted}>
            支持 JPG、PNG · 单张最大 100 MB · 可多选
          </Text>
          <View style={layout.row}>
            <View style={layout.flex}>
              <Button
                title="从文件中选择"
                onPress={() => void session.pick('file')}
                disabled={busy}
              />
            </View>
            <View style={layout.flex}>
              <Button
                title="相册"
                variant="secondary"
                onPress={() => void session.pick('gallery')}
                disabled={busy}
              />
            </View>
          </View>
          {upload.activity === 'picking' && (
            <Text style={layout.muted}>正在读取影像…</Text>
          )}
        </Card>
        <UploadImageList
          entries={entries}
          busy={busy}
          onEdit={session.openEditor}
          onRemove={session.remove}
          onClear={session.clear}
          onRetry={id => void session.upload(patient?.id ?? null, id)}
        />
        {!!upload.error && (
          <Text
            accessibilityRole="alert"
            style={{ color: colors.danger, lineHeight: 22 }}
          >
            {upload.error}
          </Text>
        )}
        {entries.length > 0 && (
          <Notice>
            共 {summary.totalCount} 张，已完成 {summary.completedCount} 张
            {summary.failedCount ? `，失败 ${summary.failedCount} 张` : ''}
          </Notice>
        )}
        {summary.allCompleted ? (
          <Button
            title="完成，返回影像中心"
            icon="checkmark-outline"
            onPress={() => router.replace('/images')}
          />
        ) : (
          <Button
            title={
              upload.activity === 'uploading'
                ? `正在上传（${summary.completedCount}/${summary.totalCount}）`
                : summary.failedCount
                  ? '上传未完成的影像'
                  : '开始上传'
            }
            icon="cloud-upload-outline"
            loading={upload.activity === 'uploading'}
            disabled={busy || !entries.length || !patient || !!activeEntry}
            onPress={() => void session.upload(patient?.id ?? null)}
          />
        )}
      </Content>
      <ChoiceSheet
        title="关联患者"
        open={patientOpen}
        onClose={() => setPatientOpen(false)}
      >
        {patientOpen && (
          <PatientPicker
            selectedId={patient?.id}
            onSelect={value => {
              setPatient(value);
              setPatientOpen(false);
            }}
          />
        )}
      </ChoiceSheet>
      {activeEntry && (
        <UploadImageOptions
          entry={activeEntry}
          remaining={upload.options.queuedFileIds.length}
          busy={upload.activity === 'editing'}
          error={upload.error}
          session={session}
        />
      )}
      {cropper.element}
    </Screen>
  );
}
