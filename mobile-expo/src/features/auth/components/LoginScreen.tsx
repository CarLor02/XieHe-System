import { useState } from 'react';
import { getApiErrorMessage } from '@xiehe/api-client';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../../application/AppProvider';
import { Button, Card, Field, Icon, Notice } from '../../../shared/ui';
import { colors, layout } from '../../../shared/theme';

export function LoginScreen() {
  const app = useApp();
  const insets = useSafeAreaInsets();
  const [server, setServer] = useState(app.defaultServerUrl);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showServer, setShowServer] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async () => {
    setError('');
    try {
      await app.login(server, username, password);
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  };

  return (
    <LinearGradient
      colors={['#F3EEFF', '#FAF8FF', '#F5F2FF']}
      style={layout.flex}
    >
      <StatusBar style="dark" />
      <View style={styles.orb} />
      <View style={[styles.orb, styles.bottomOrb]} />
      <KeyboardAvoidingView
        style={layout.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 42, paddingBottom: insets.bottom + 28 },
          ]}
        >
          <View style={styles.brand}>
            <LinearGradient colors={['#9B5AF5', '#6D28D9']} style={styles.logo}>
              <Icon name="medical" color="#FFF" size={42} />
            </LinearGradient>
            <Text style={styles.brandTitle}>协和脊柱影像</Text>
            <Text style={layout.muted}>让影像与诊疗，随时相连</Text>
          </View>
          <Card style={styles.form}>
            <View>
              <Text style={styles.welcome}>欢迎回来</Text>
              <Text style={[layout.muted, { marginTop: 6 }]}>
                使用现有账号登录，继续今天的工作
              </Text>
            </View>
            <Field
              label="账号"
              value={username}
              onChangeText={setUsername}
              placeholder="请输入用户名或邮箱"
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              editable={!app.busy}
            />
            <View style={{ gap: 8 }}>
              <Field
                label="密码"
                value={password}
                onChangeText={setPassword}
                placeholder="请输入密码"
                secureTextEntry={!showPassword}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={() => void submit()}
                editable={!app.busy}
              />
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: showPassword }}
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
              >
                <Icon
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={16}
                  color={colors.muted}
                />
                <Text style={layout.muted}>
                  {showPassword ? '隐藏密码' : '显示密码'}
                </Text>
              </Pressable>
            </View>
            {!!(error || app.startupError) && (
              <Text
                accessibilityRole="alert"
                style={{ color: colors.danger, fontSize: 13, lineHeight: 20 }}
              >
                {error || app.startupError}
              </Text>
            )}
            <Button
              title="登录"
              icon="arrow-forward"
              onPress={() => void submit()}
              loading={app.busy}
            />
            <Text style={[layout.muted, { textAlign: 'center', fontSize: 11 }]}>
              与 Web 端使用同一账号 · 安全保存登录状态
            </Text>
          </Card>
          <View style={{ gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="连接设置"
              onPress={() => setShowServer(!showServer)}
              style={styles.connection}
            >
              <Icon name="server-outline" size={14} color={colors.muted} />
              <Text style={styles.serverText}>
                {showServer
                  ? '收起连接设置'
                  : server.replace(/^https?:\/\//, '')}
              </Text>
              <Icon
                name={showServer ? 'chevron-up' : 'chevron-down'}
                size={13}
                color={colors.muted}
              />
            </Pressable>
            {showServer && (
              <Card style={{ gap: 14 }}>
                <Field
                  label="后端服务器"
                  value={server}
                  onChangeText={setServer}
                  placeholder="https://xiehe.stellarmesh.cn"
                  keyboardType="url"
                  editable={!app.busy}
                />
                <Notice>默认连接协和统一 API。切换服务器需要重新登录。</Notice>
              </Card>
            )}
          </View>
          <Text style={styles.footer}>XIEHE · SPINE IMAGING</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: 26,
    gap: 24,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  brand: { alignItems: 'center', gap: 12, marginBottom: 8 },
  logo: {
    height: 78,
    width: 78,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    marginBottom: 8,
    boxShadow: '0 10px 26px rgba(124,58,237,0.22)',
  },
  brandTitle: {
    fontSize: 27,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 1,
  },
  welcome: { fontSize: 23, fontWeight: '700', color: colors.text },
  form: {
    padding: 24,
    gap: 22,
    borderColor: '#FFF',
    backgroundColor: '#FFFFFFED',
    borderRadius: 26,
  },
  passwordToggle: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingVertical: 4,
  },
  connection: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    paddingVertical: 5,
  },
  serverText: { color: colors.muted, fontSize: 11 },
  footer: {
    color: '#A9A0BB',
    fontSize: 10,
    letterSpacing: 2,
    textAlign: 'center',
  },
  orb: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#E9DCFC55',
    position: 'absolute',
    top: -80,
    left: -120,
  },
  bottomOrb: {
    top: undefined,
    left: undefined,
    bottom: -120,
    right: -100,
    backgroundColor: '#E9D5FF60',
    width: 340,
    height: 340,
    borderRadius: 170,
  },
});
