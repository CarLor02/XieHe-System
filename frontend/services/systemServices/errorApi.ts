import { createErrorApi } from '@xiehe/api-sdk/api/errorApi';
import { http } from '@/infrastructure/http/clients';

export const { requestGetErrorStats, requestClearErrorLogs } =
  createErrorApi(http);
