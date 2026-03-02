import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { createDb } from './db/index.js';
import { TaskRunner } from './runner/index.js';
import { taskRoutes } from './routes/tasks.js';
import { systemRoutes } from './routes/system.js';
import { logRoutes } from './routes/logs.js';
import type { Config } from '@solitary-coding/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.resolve(__dirname, '../../client/dist');

export interface ServerContext {
  db: ReturnType<typeof createDb>;
  runner: TaskRunner;
  config: Config;
  projectRoot: string;
}

export function createServer(config: Config, projectRoot: string) {
  const dbPath = path.join(projectRoot, '.solitary-coding', 'db.sqlite');
  const db = createDb(dbPath);
  const runner = new TaskRunner(db, config, projectRoot);

  const app = new Hono<{ Variables: { ctx: ServerContext } }>();

  app.use('*', async (c, next) => {
    c.set('ctx', { db, runner, config, projectRoot });
    await next();
  });

  app.use('/api/*', cors());
  app.route('/api', taskRoutes);
  app.route('/api', systemRoutes);
  app.route('/api', logRoutes);

  // Serve client static files (resolve relative to this package, not cwd)
  app.use(
    '/*',
    serveStatic({
      root: clientDistPath,
    }),
  );
  app.use(
    '/*',
    serveStatic({
      root: clientDistPath,
      path: 'index.html',
    }),
  );

  return { app, runner, db };
}
