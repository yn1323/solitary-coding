import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import { executionLogs } from '@solitary-coding/shared/db/schema';
import type { ServerContext } from '../server.js';

const app = new Hono<{ Variables: { ctx: ServerContext } }>();

// GET /logs/:taskId
app.get('/logs/:taskId', async (c) => {
  const { db } = c.get('ctx');
  const taskId = Number(c.req.param('taskId'));
  const logs = await db
    .select()
    .from(executionLogs)
    .where(eq(executionLogs.taskId, taskId))
    .orderBy(desc(executionLogs.createdAt));
  return c.json(logs);
});

export { app as logRoutes };
