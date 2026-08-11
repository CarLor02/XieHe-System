import { describe, expectTypeOf, it } from 'vitest';
import type {
  ImageFileDetail,
  LoginResponse,
  PatientListResult,
  RefreshTokenResponse,
  TeamSummary,
} from '../src';

describe('HTTP v1 contracts', () => {
  it('preserves the authenticated session wire shape', () => {
    expectTypeOf<LoginResponse['access_token']>().toEqualTypeOf<string>();
    expectTypeOf<RefreshTokenResponse['tokens']>().toMatchTypeOf<
      | { access_token?: string; refresh_token?: string }
      | undefined
    >();
  });

  it('keeps compatibility fields optional at the transport boundary', () => {
    expectTypeOf<TeamSummary['my_role']>().toMatchTypeOf<
      'ADMIN' | 'MEMBER' | null | undefined
    >();
    expectTypeOf<ImageFileDetail['annotation']>().toMatchTypeOf<
      Record<string, unknown> | null
    >();
    expectTypeOf<PatientListResult['items']>().toEqualTypeOf<
      import('../src').Patient[]
    >();
  });
});
