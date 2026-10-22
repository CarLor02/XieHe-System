import type { XieheApiSdk } from '@xiehe/api-sdk';
export type ReportsGateway = Pick<
  XieheApiSdk['reports'],
  'list' | 'get' | 'create' | 'update' | 'delete'
>;
