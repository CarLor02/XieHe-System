import { useState } from 'react';
import { Image } from 'expo-image';
import { useApp, useWorkspace } from '@/application/AppProvider';
import { useMutation } from '@/shared/hooks/useMutation';
import { pickAvatar } from '@/infrastructure/files/pickAvatar';
import {
  Button,
  Card,
  ChoiceSheet,
  ErrorState,
  Icon,
  Notice,
} from '@/shared/ui';

export function AvatarEditor() {
  const { services, user } = useWorkspace();
  const { updateUser } = useApp();
  const mutation = useMutation();
  const [remove, setRemove] = useState(false);
  return (
    <Card style={{ gap: 12, alignItems: 'center' }}>
      {user.avatar_url ? (
        <Image
          source={{ uri: user.avatar_url }}
          style={{ width: 80, height: 80, borderRadius: 20 }}
          cachePolicy="memory"
        />
      ) : (
        <Icon name="person-circle-outline" size={80} />
      )}
      <Button
        title="更换头像"
        loading={mutation.busy}
        onPress={() =>
          void mutation.run(
            async () => {
              const file = await pickAvatar();
              return file ? services.profile.uploadAvatar(file) : null;
            },
            value => {
              if (value) updateUser(value);
            },
            ''
          )
        }
      />
      {!!user.avatar_url && (
        <Button
          title="移除头像"
          variant="secondary"
          disabled={mutation.busy}
          onPress={() => setRemove(true)}
        />
      )}
      {!!mutation.error && <ErrorState message={mutation.error} />}
      {!!mutation.message && <Notice>{mutation.message}</Notice>}
      <ChoiceSheet
        open={remove}
        title="移除当前头像？"
        dismissible={!mutation.busy}
        onClose={() => {
          if (!mutation.busy) setRemove(false);
        }}
      >
        <Button
          title="确认移除"
          variant="danger"
          loading={mutation.busy}
          onPress={() =>
            void mutation.run(
              services.profile.removeAvatar,
              value => {
                updateUser(value);
                setRemove(false);
              },
              '头像已移除'
            )
          }
        />
      </ChoiceSheet>
    </Card>
  );
}
