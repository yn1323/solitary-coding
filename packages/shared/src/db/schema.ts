import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type', { enum: ['bug', 'story'] }).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  status: text('status', {
    enum: [
      'pending',
      'prioritizing',
      'discussing',
      'planned',
      'executing',
      'testing',
      'completed',
      'failed',
      'stopped',
    ],
  })
    .notNull()
    .default('pending'),
  priority: integer('priority').notNull().default(0),
  retryCount: integer('retry_count').notNull().default(0),
  branchName: text('branch_name'),
  discussion: text('discussion'),
  plan: text('plan'),
  result: text('result'),
  executionPrompt: text('execution_prompt'),
  ciSteps: text('ci_steps', { mode: 'json' }).$type<
    { name: string; command: string }[]
  >(),
  startedAt: integer('started_at', { mode: 'timestamp_ms' }),
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const executionLogs = sqliteTable('execution_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id')
    .notNull()
    .references(() => tasks.id),
  phase: text('phase', {
    enum: ['prioritize', 'discuss', 'plan', 'execute', 'ci', 'fix'],
  }).notNull(),
  input: text('input'),
  output: text('output'),
  exitCode: integer('exit_code'),
  durationMs: integer('duration_ms'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const systemState = sqliteTable('system_state', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
