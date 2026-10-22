import { useState } from 'react';
import type { ImageFileDetail } from '@xiehe/api-contracts';
import {
  splitImageFilename,
  validateImageBasename,
} from '@xiehe/imaging-core/image-files';
import { useMutation } from '../../../shared/hooks/useMutation';
import type { MobileServices } from '../../../application/services';

export function useImageMetadata(
  image: ImageFileDetail,
  gateway: Pick<MobileServices['imaging'], 'rename' | 'updateInfo'>,
  onSaved: () => void
) {
  const filename = splitImageFilename(image.original_filename);
  const [basename, setBasename] = useState(filename.basename);
  const [examType, setExamType] = useState(image.description ?? '');
  const [teams, setTeams] = useState(
    (image.team_ids ?? []).map((id, index) => ({
      id,
      name: image.team_names?.[index] ?? `团队 ${id}`,
    }))
  );
  const mutation = useMutation();
  return {
    basename,
    setBasename,
    extension: filename.extension,
    examType,
    setExamType,
    teams,
    setTeams,
    mutation,
    rename: () =>
      mutation.run(
        async () => {
          const error = validateImageBasename(basename, filename.extension);
          if (error) throw new Error(error);
          return gateway.rename(image.id, basename.trim());
        },
        onSaved,
        '文件名已更新'
      ),
    saveInfo: () =>
      mutation.run(
        async () => {
          if (!examType) throw new Error('请选择检查类型');
          return gateway.updateInfo(image.id, {
            description: examType,
            team_ids: teams.map(team => team.id),
          });
        },
        onSaved,
        '影像信息已保存'
      ),
  };
}
