import { AvatarEditor } from './AvatarEditor';
import { useState } from 'react';
import { getApiErrorMessage } from '@xiehe/api-client';
import { Text } from 'react-native';
import { useApp, useWorkspace } from '../../../application/AppProvider';
import {
  Button,
  Card,
  Field,
  FormContent,
  Header,
  InfoRow,
  Notice,
  Screen,
} from '../../../shared/ui';
import { colors } from '../../../shared/theme';

export function ProfileInfoScreen() {
  const { user, services } = useWorkspace();
  const { updateUser } = useApp();
  const [name, setName] = useState(user.real_name || user.full_name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [title, setTitle] = useState(user.title || '');
  const [position, setPosition] = useState(user.position || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const save = async () => {
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await services.profile.update({
        real_name: name.trim(),
        phone: phone.trim(),
        title: title.trim(),
        position: position.trim(),
      });
      updateUser(await services.profile.get());
      setSaved(true);
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Header title="个人信息" subtitle="与 Web 端同步的账号资料" back />
      <FormContent>
        <AvatarEditor />
        <Card>
          <InfoRow label="账号" value={user.username} />
          <InfoRow label="邮箱" value={user.email} />
          <InfoRow label="部门" value={user.department} />
          <InfoRow label="工号" value={user.employee_id} />
        </Card>
        <Card style={{ gap: 20 }}>
          <Field
            label="姓名"
            value={name}
            onChangeText={value => {
              setName(value);
              setSaved(false);
            }}
            editable={!busy}
          />
          <Field
            label="手机号"
            value={phone}
            onChangeText={value => {
              setPhone(value);
              setSaved(false);
            }}
            keyboardType="phone-pad"
            editable={!busy}
          />
          <Field
            label="职称"
            value={title}
            onChangeText={value => {
              setTitle(value);
              setSaved(false);
            }}
            editable={!busy}
          />
          <Field
            label="职务"
            value={position}
            onChangeText={value => {
              setPosition(value);
              setSaved(false);
            }}
            editable={!busy}
          />
        </Card>
        {!!error && (
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>
            {error}
          </Text>
        )}
        {saved && <Notice>个人资料已保存。</Notice>}
        <Button
          title="保存资料"
          icon="checkmark-outline"
          loading={busy}
          onPress={() => void save()}
        />
      </FormContent>
    </Screen>
  );
}
