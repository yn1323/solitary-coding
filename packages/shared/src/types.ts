export type TaskType = 'bug' | 'story';

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

export interface Task {
  id: number;
  type: TaskType;
  title: string;
  description: string;
  status: TaskStatus;
  priority: number;
  retryCount: number;
  branchName: string | null;
  discussion: string | null;
  plan: string | null;
  result: string | null;
  executionPrompt: string | null;
  ciSteps: CiStep[] | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CiStep {
  name: string;
  command: string;
}

export interface CreateTaskInput {
  type: TaskType;
  title: string;
  description: string;
}

export interface UpdateTaskInput {
  type?: TaskType;
  title?: string;
  description?: string;
  priority?: number;
}

export interface Config {
  port: number;
  timer: {
    intervalMinutes: number;
  };
  git: {
    defaultBranch: string;
  };
  ci: {
    maxRetries: number;
    steps?: CiStep[];
  };
  claude: {
    timeout: number;
  };
}
