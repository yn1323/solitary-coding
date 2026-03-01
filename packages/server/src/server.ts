import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createDb } from './db/index.js';
import { TaskRunner } from './runner/index.js';
import { taskRoutes } from './routes/tasks.js';
import { systemRoutes } from './routes/system.js';
import { logRoutes } from './routes/logs.js';
import type { Config } from '@solitary-coding/shared';

export interface ServerContext {
  db: ReturnType<typeof createDb>;
  runner: TaskRunner;
  config: Config;
  projectRoot: string;
}

/**
 * Resolve the directory containing the built client files.
 * When installed via npm, the client files are at `<pkg>/client/`.
 * During development, they are at `<root>/packages/client/dist/`.
 */
function resolveClientDir(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));

  // npm package layout: <pkg>/dist/index.js → <pkg>/client/
  const npmClientDir = path.resolve(currentDir, '..', 'client');
  if (fs.existsSync(path.join(npmClientDir, 'index.html'))) {
    return npmClientDir;
  }

  // Development layout: <root>/packages/server/dist/ → <root>/packages/client/dist/
  const devClientDir = path.resolve(currentDir, '..', '..', 'client', 'dist');
  if (fs.existsSync(path.join(devClientDir, 'index.html'))) {
    return devClientDir;
  }

  // Fallback: relative to cwd (original behavior)
  return path.resolve('packages', 'client', 'dist');
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
  };
  return mimeTypes[ext] ?? 'application/octet-stream';
}

export function createServer(config: Config, projectRoot: string) {
  const dbPath = path.join(projectRoot, '.solitary-coding', 'db.sqlite');
  const db = createDb(dbPath);
  const runner = new TaskRunner(db, config, projectRoot);

  const clientDir = resolveClientDir();

  const app = new Hono<{ Variables: { ctx: ServerContext } }>();

  app.use('*', async (c, next) => {
    c.set('ctx', { db, runner, config, projectRoot });
    await next();
  });

  app.use('/api/*', cors());
  app.route('/api', taskRoutes);
  app.route('/api', systemRoutes);
  app.route('/api', logRoutes);

  // Serve client static files from the resolved absolute path
  app.get('/*', async (c) => {
    const urlPath = new URL(c.req.url).pathname;
    const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '');
    let filePath = path.join(clientDir, safePath);

    // If no file found or directory, fall back to index.html (SPA)
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(clientDir, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      return c.text('Not Found', 404);
    }

    const content = fs.readFileSync(filePath);
    return c.body(content, 200, {
      'Content-Type': getMimeType(filePath),
    });
  });

  return { app, runner, db };
}
