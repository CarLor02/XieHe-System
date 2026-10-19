import { useCallback } from 'react';
import { useWorkspace } from '../../../application/AppProvider';
import { useResource } from '../../../shared/hooks/useResource';

export function useDashboard() {
  const { services, user } = useWorkspace();
  const stats = useResource(
    useCallback(() => services.dashboard.getStats(), [services])
  );
  const tasks = useResource(
    useCallback(
      () =>
        services.imaging.list({
          page: 1,
          page_size: 5,
          file_status: 'UPLOADED',
        }),
      [services]
    )
  );
  const activities = useResource(
    useCallback(() => services.dashboard.getRecentActivities(), [services])
  );
  const refresh = () => {
    void stats.reload();
    void tasks.reload();
    void activities.reload();
  };
  return { user, stats, tasks, activities, refresh };
}
