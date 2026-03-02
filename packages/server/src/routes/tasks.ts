import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { tasks } from '@solitary-coding/shared/db/schema';
import type { ServerContext } from '../server.js';

const app = new Hono<{ Variables: { ctx: ServerContext } }>();

// GET /tasks (lightweight list — excludes large text fields)
app.get('/tasks', async (c) => {
  const { db } = c.get('ctx');
  const allTasks = await db
    .select({
      id: tasks.id,
      type: tasks.type,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      retryCount: tasks.retryCount,
      branchName: tasks.branchName,
      errorMessage: tasks.errorMessage,
      startedAt: tasks.startedAt,
      completedAt: tasks.completedAt,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .orderBy(asc(tasks.priority));
  return c.json(allTasks);
});

// POST /tasks
app.post(
  '/tasks',
  zValidator(
    'json',
    z.object({
      type: z.enum(['bug', 'story']),
      title: z.string().min(1),
      description: z.string().default(''),
    }),
  ),
  async (c) => {
    const { db } = c.get('ctx');
    const body = c.req.valid('json');
    const now = new Date();
    const [task] = await db
      .insert(tasks)
      .values({ ...body, createdAt: now, updatedAt: now })
      .returning();
    return c.json(task, 201);
  },
);

// GET /tasks/:id
app.get('/tasks/:id', async (c) => {
  const { db } = c.get('ctx');
  const id = Number(c.req.param('id'));
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
  if (!task) return c.json({ error: 'Not found' }, 404);
  return c.json(task);
});

// PATCH /tasks/:id
app.patch(
  '/tasks/:id',
  zValidator(
    'json',
    z.object({
      type: z.enum(['bug', 'story']).optional(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      priority: z.number().optional(),
    }),
  ),
  async (c) => {
    const { db } = c.get('ctx');
    const id = Number(c.req.param('id'));
    const [existing] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!existing) return c.json({ error: 'Not found' }, 404);
    if (existing.status !== 'pending') {
      return c.json({ error: 'Can only edit pending tasks' }, 400);
    }
    const body = c.req.valid('json');
    const [updated] = await db
      .update(tasks)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return c.json(updated);
  },
);

// DELETE /tasks/:id
app.delete('/tasks/:id', async (c) => {
  const { db } = c.get('ctx');
  const id = Number(c.req.param('id'));
  const [existing] = await db.select().from(tasks).where(eq(tasks.id, id));
  if (!existing) return c.json({ error: 'Not found' }, 404);
  if (existing.status !== 'pending') {
    return c.json({ error: 'Can only delete pending tasks' }, 400);
  }
  await db.delete(tasks).where(eq(tasks.id, id));
  return c.json({ ok: true });
});

// POST /tasks/:id/cancel
app.post('/tasks/:id/cancel', async (c) => {
  const { runner } = c.get('ctx');
  const id = Number(c.req.param('id'));
  const status = runner.getStatus();
  if (status.currentTaskId !== id) {
    return c.json({ error: 'Task is not currently running' }, 400);
  }
  const cancelled = await runner.cancelCurrentTask();
  if (!cancelled) {
    return c.json({ error: 'Failed to cancel task' }, 500);
  }
  return c.json({ ok: true });
});

// GET /tasks/:id/documents
app.get('/tasks/:id/documents', async (c) => {
  const { db } = c.get('ctx');
  const id = Number(c.req.param('id'));
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
  if (!task) return c.json({ error: 'Not found' }, 404);
  return c.json({
    discussion: task.discussion,
    plan: task.plan,
    result: task.result,
  });
});

export { app as taskRoutes };
