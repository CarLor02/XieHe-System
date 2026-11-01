import { Content, EmptyState, Header, Screen } from '@/shared/ui';

export function MessagesScreen() {
  return (
    <Screen>
      <Header title="消息通知" back />
      <Content
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
      >
        <EmptyState title="暂无消息" icon="notifications-outline" />
      </Content>
    </Screen>
  );
}
