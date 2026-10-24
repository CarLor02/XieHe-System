import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useWorkspace } from '@/application/AppProvider';
import { Card, Content, Header, InfoRow, Notice, Screen } from '@/shared/ui';

export function SettingsScreen() {
  const { serverUrl } = useWorkspace();
  return (
    <Screen>
      <Header title="连接与版本" back />
      <Content>
        <Card>
          <InfoRow label="应用" value="协和脊柱影像" />
          <InfoRow
            label="版本"
            value={Constants.expoConfig?.version || '1.0.0'}
          />
          <InfoRow label="运行平台" value={Platform.OS} />
          <InfoRow label="后端服务器" value={serverUrl} />
        </Card>
        <Notice>
          登录状态在手机端安全保存。需要连接其他服务器时，请退出后在登录页调整连接设置。
        </Notice>
      </Content>
    </Screen>
  );
}
