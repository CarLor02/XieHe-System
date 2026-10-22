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
  Notice,
  Screen,
} from '../../../shared/ui';
import { colors } from '../../../shared/theme';

export function PasswordScreen() {
  const { services } = useWorkspace();
  const { logout } = useApp();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [changed, setChanged] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setError('');
    if (!current) {
      setError('请输入当前密码');
      return;
    }
    if (next.length < 6 || next.length > 128) {
      setError('新密码长度须为 6 至 128 位');
      return;
    }
    if (next !== confirm) {
      setError('两次输入的新密码不一致');
      return;
    }
    setBusy(true);
    try {
      if (!changed) {
        await services.profile.changePassword({
          current_password: current,
          new_password: next,
          confirm_password: confirm,
        });
        setChanged(true);
        setCurrent('');
        setNext('');
        setConfirm('');
      }
      await logout();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Header title="修改密码" subtitle="修改后请使用新密码重新登录" back />
      <FormContent>
        <Card style={{ gap: 22 }}>
          <Field
            label="当前密码"
            value={current}
            onChangeText={setCurrent}
            secureTextEntry
            editable={!busy && !changed}
            autoComplete="current-password"
          />
          <Field
            label="新密码"
            value={next}
            onChangeText={setNext}
            secureTextEntry
            editable={!busy && !changed}
            autoComplete="new-password"
          />
          <Field
            label="确认新密码"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            editable={!busy && !changed}
            autoComplete="new-password"
          />
        </Card>
        <Notice>密码修改会同步影响 Web 端登录。</Notice>
        {!!error && (
          <Text
            accessibilityRole="alert"
            style={{ color: colors.danger, lineHeight: 22 }}
          >
            {error}
          </Text>
        )}
        {changed && <Notice>密码已修改，请退出后重新登录。</Notice>}
        <Button
          title={changed ? '退出并重新登录' : '确认修改'}
          icon="lock-closed-outline"
          loading={busy}
          onPress={() => {
            if (changed)
              void logout().catch(cause => setError(getApiErrorMessage(cause)));
            else void submit();
          }}
        />
      </FormContent>
    </Screen>
  );
}
