import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { layout } from '../../theme';
import { Content } from '../content';

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
