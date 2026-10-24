import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { layout } from '@/shared/theme';
import { Content } from '@/shared/ui/content';

export function FormContent({ children }: PropsWithChildren) {
  return (
    <KeyboardAvoidingView
      style={layout.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Content>{children}</Content>
    </KeyboardAvoidingView>
  );
}
