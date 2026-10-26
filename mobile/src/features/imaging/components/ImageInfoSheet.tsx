import { useState } from 'react';
import type { ImageFileDetail } from '@xiehe/api-contracts';
import { Button, ChoiceSheet, InfoRow, Notice } from '@/shared/ui';
import {
  formatDate,
  formatFileSize,
  imageStatusLabel,
} from '@/features/imaging/domain/presentation';
import { ImageMetadataSheet } from './ImageMetadataSheet';
import { AnnotationHistorySheet } from './AnnotationHistorySheet';

export function ImageInfoSheet({
  image,
  metadataEditable,
  onClose,
  onSaved,
}: {
  image: ImageFileDetail;
  metadataEditable: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [action, setAction] = useState<'rename' | 'info' | 'history' | null>(
    null
  );
  if (action === 'rename' || action === 'info') {
    return (
      <ImageMetadataSheet
        image={image}
        mode={action}
        onClose={() => setAction(null)}
        onSaved={onSaved}
      />
    );
  }
  if (action === 'history') {
    return (
      <AnnotationHistorySheet
        imageId={image.id}
        onClose={() => setAction(null)}
      />
    );
  }
  return (
    <ChoiceSheet open title="影像信息" onClose={onClose}>
      <InfoRow
        label="患者"
        value={image.patient_name || image.patient_identifier}
      />
      <InfoRow label="检查类型" value={image.description} />
      <InfoRow label="处理状态" value={imageStatusLabel(image.status)} />
      <InfoRow label="文件名" value={image.original_filename} />
      <InfoRow label="文件大小" value={formatFileSize(image.file_size)} />
      <InfoRow label="上传时间" value={formatDate(image.created_at)} />
      <InfoRow
        label="所属团队"
        value={image.team_names?.join('、') || '未分配团队'}
      />
      {!metadataEditable && (
        // 检查类型修改后需要重新加载编辑会话，不能覆盖仍未保存的标注草稿。
        <Notice>请先保存标注或撤销修改，再编辑影像信息。</Notice>
      )}
      <Button
        title="编辑影像信息"
        variant="secondary"
        icon="options-outline"
        disabled={!metadataEditable}
        onPress={() => setAction('info')}
      />
      <Button
        title="重命名文件"
        variant="secondary"
        disabled={!metadataEditable}
        onPress={() => setAction('rename')}
      />
      <Button
        title="标注保存历史"
        variant="secondary"
        icon="time-outline"
        onPress={() => setAction('history')}
      />
    </ChoiceSheet>
  );
}
