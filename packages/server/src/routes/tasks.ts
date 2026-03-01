import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { tasks } from '@solitary-coding/shared/db/schema';
import type { ServerContext } from '../server.js';

const app = new Hono<{ Variables: { ctx: ServerContext } }>();

// GET /tasks
app.get('/tasks', async (c) => {
  const { db } = c.get('ctx');
  const allTasks = await db.select().from(tasks).orderBy(asc(tasks.priority));
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
