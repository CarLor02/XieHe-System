export interface DashboardTaskSource {
  created_at: string;
  priority: string;
}

export type DashboardTaskFilter = 'today' | 'all';

export interface DashboardTaskPage<T> {
  filteredTasks: T[];
  displayedTasks: T[];
  totalPages: number;
  currentPage: number;
  startIndex: number;
  highPriorityCount: number;
}

function getLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function paginateDashboardTasks<T extends DashboardTaskSource>(input: {
  tasks: readonly T[];
  filter: DashboardTaskFilter;
  requestedPage: number;
  pageSize: number;
  now: Date;
}): DashboardTaskPage<T> {
  const todayKey = getLocalDateKey(input.now);
  const filteredTasks =
    input.filter === 'today'
      ? input.tasks.filter(task => {
          const createdAt = new Date(task.created_at);
          return (
            !Number.isNaN(createdAt.getTime()) &&
            getLocalDateKey(createdAt) === todayKey
          );
        })
      : [...input.tasks];
  const pageSize = Math.max(1, Math.floor(input.pageSize));
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const currentPage = Math.min(
    totalPages,
    Math.max(1, Math.floor(input.requestedPage))
  );
  const startIndex = (currentPage - 1) * pageSize;
  return {
    filteredTasks,
    displayedTasks: filteredTasks.slice(startIndex, startIndex + pageSize),
    totalPages,
    currentPage,
    startIndex,
    highPriorityCount: filteredTasks.filter(task => task.priority === 'high')
      .length,
  };
}
