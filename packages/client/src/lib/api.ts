const BASE_URL = '/api';

async function fetchJson<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `API error: ${res.status}`,
    );
  }
  return res.json();
}

export type TaskStatus =
  | 'pending'
  | 'prioritizing'
  | 'discussing'
  | 'planned'
  | 'executing'
  | 'testing'
  | 'completed'
  | 'failed'
  | 'stopped';

/** Lightweight task returned by GET /tasks (excludes large text fields) */
export interface Task {
  id: number;
  type: 'bug' | 'story';
  title: string;
  description: string;
  status: TaskStatus;
  priority: number;
  retryCount: number;
  branchName: string | null;
  errorMessage: string | null;
  startedAt: number | null;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateTaskInput {
  type: 'bug' | 'story';
  title: string;
  description: string;
}

export interface UpdateTaskInput {
  type?: 'bug' | 'story';
  title?: string;
  description?: string;
  priority?: number;
}

export interface SystemStatus {
  isRunning: boolean;
  isPaused: boolean;
  currentTaskId: number | null;
  currentPhase: string | null;
  timerActive: boolean;
}

export interface TaskDocuments {
  discussion: string | null;
  plan: string | null;
  result: string | null;
}

/** Lightweight log entry returned by GET /logs/:taskId (excludes input/output) */
export interface ExecutionLogSummary {
  id: number;
  taskId: number;
  phase: string;
  exitCode: number | null;
  durationMs: number | null;
  createdAt: number;
}

/** Full log entry returned by GET /logs/:taskId/:logId */
export interface ExecutionLog extends ExecutionLogSummary {
  input: string | null;
  output: string | null;
}

export const api = {
  tasks: {
    list: () => fetchJson<Task[]>('/tasks'),
    get: (id: number) => fetchJson<Task>(`/tasks/${id}`),
    create: (data: CreateTaskInput) =>
      fetchJson<Task>('/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: UpdateTaskInput) =>
      fetchJson<Task>(`/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      fetchJson<{ ok: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),
    cancel: (id: number) =>
      fetchJson<{ ok: boolean }>(`/tasks/${id}/cancel`, { method: 'POST' }),
    documents: (id: number) =>
      fetchJson<TaskDocuments>(`/tasks/${id}/documents`),
  },
  system: {
    status: () => fetchJson<SystemStatus>('/status'),
    trigger: () => fetchJson<{ ok: boolean }>('/trigger', { method: 'POST' }),
    pause: () =>
      fetchJson<{ paused: boolean }>('/pause', { method: 'POST' }),
  },
  logs: {
    byTask: (taskId: number) =>
      fetchJson<ExecutionLogSummary[]>(`/logs/${taskId}`),
    detail: (taskId: number, logId: number) =>
      fetchJson<ExecutionLog>(`/logs/${taskId}/${logId}`),
  },
};
