import type { HttpClient } from '@xiehe/api-client';
import { normalizeLegacyPagination } from '@xiehe/api-client/contracts';
import type {
  BatchEmailRequest,
  CreateModelRequest,
  DashboardActivity,
  DashboardOverview,
  DashboardStats,
  DashboardSystemMetrics,
  DashboardTask,
  DeleteModelResult,
  EmailSendRequest,
  ModelConfiguration,
  ModelItem,
  ModelListQuery,
  ModelStats,
  NotificationActionResult,
  NotificationBroadcastRequest,
  NotificationMessage,
  NotificationMessageQuery,
  NotificationMessageStats,
  NotificationSettings,
  PermissionRole,
  PermissionRoleListQuery,
  SystemStats,
  UserPermissionDetail,
} from '@xiehe/api-contracts';
import { compactQuery } from '../shared/query';

export function createOperationsClient(client: HttpClient) {
  return {
    dashboard: {
      getStats: () => client.get<DashboardStats>('/api/v1/dashboard/stats'),
      getOverview: () =>
        client.get<DashboardOverview>('/api/v1/dashboard/overview'),
      getSystemMetrics: () =>
        client.get<DashboardSystemMetrics>(
          '/api/v1/dashboard/system-metrics'
        ),
      async getTasks() {
        const data = await client.get<
          { tasks?: DashboardTask[] } | DashboardTask[]
        >('/api/v1/dashboard/tasks');
        return Array.isArray(data) ? data : data.tasks || [];
      },
      async getRecentActivities() {
        const data = await client.get<
          | { items?: DashboardActivity[]; activities?: DashboardActivity[] }
          | DashboardActivity[]
        >('/api/v1/dashboard/recent-activities');
        return Array.isArray(data)
          ? data
          : data.items || data.activities || [];
      },
    },
    models: {
      async list(query: ModelListQuery = {}) {
        return normalizeLegacyPagination<ModelItem>(
          await client.get<unknown>('/api/v1/models/', {
            params: compactQuery({ ...query }),
          })
        );
      },
      getStats: () => client.get<ModelStats>('/api/v1/models/stats'),
      create: (request: CreateModelRequest) =>
        client.post<ModelItem, CreateModelRequest>('/api/v1/models/', request),
      activate: (modelId: string) =>
        client.post<void>(`/api/v1/models/${modelId}/activate`),
      delete: (modelId: string) =>
        client.delete<DeleteModelResult>(`/api/v1/models/${modelId}`),
      getConfiguration: () =>
        client.get<ModelConfiguration>('/api/v1/models/configuration'),
      updateConfiguration: (request: ModelConfiguration) =>
        client.put<ModelConfiguration, ModelConfiguration>(
          '/api/v1/models/configuration',
          request
        ),
    },
    notifications: {
      async listMessages(query: NotificationMessageQuery = {}) {
        const data = await client.get<unknown>(
          '/api/v1/notifications/messages',
          { params: compactQuery({ ...query }) }
        );
        return normalizeLegacyPagination<NotificationMessage>(data).items;
      },
      getMessageStats: () =>
        client.get<NotificationMessageStats>(
          '/api/v1/notifications/messages/stats'
        ),
      markRead: (messageId: number) =>
        client.put<NotificationActionResult>(
          `/api/v1/notifications/messages/${messageId}/read`
        ),
      deleteMessage: (messageId: number) =>
        client.delete<NotificationActionResult>(
          `/api/v1/notifications/messages/${messageId}`
        ),
      getSettings: () =>
        client.get<NotificationSettings>('/api/v1/notifications/settings'),
      updateSettings: (request: NotificationSettings) =>
        client.put<NotificationSettings, NotificationSettings>(
          '/api/v1/notifications/settings',
          request
        ),
      broadcast: (request: NotificationBroadcastRequest) =>
        client.post<NotificationActionResult, NotificationBroadcastRequest>(
          '/api/v1/notifications/broadcast',
          request
        ),
      sendEmail: (request: EmailSendRequest) =>
        client.post<NotificationActionResult, EmailSendRequest>(
          '/api/v1/notifications/email/send',
          request
        ),
      sendBatchEmail: (request: BatchEmailRequest) =>
        client.post<NotificationActionResult, BatchEmailRequest>(
          '/api/v1/notifications/email/batch',
          request
        ),
      testEmail: (request: EmailSendRequest) =>
        client.post<NotificationActionResult, EmailSendRequest>(
          '/api/v1/notifications/email/test',
          request
        ),
    },
    permissions: {
      async listRoles(query: PermissionRoleListQuery = {}) {
        return normalizeLegacyPagination<PermissionRole>(
          await client.get<unknown>('/api/v1/permissions/roles', {
            params: compactQuery({ ...query }),
          })
        );
      },
      getUser: (userId: string) =>
        client.get<UserPermissionDetail>(
          `/api/v1/permissions/users/${userId}/permissions`
        ),
    },
    system: {
      getStats: () => client.get<SystemStats>('/api/v1/system/stats'),
    },
  };
}
