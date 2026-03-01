import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createDb } from './index';
import { tasks } from '@solitary-coding/shared/db/schema';
import { eq } from 'drizzle-orm';

describe('createDb', () => {
  const tmpDir = path.join(os.tmpdir(), 'solitary-coding-test');
  const dbPath = path.join(tmpDir, 'test.sqlite');

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('creates database file and tables', () => {
    const db = createDb(dbPath);
    expect(fs.existsSync(dbPath)).toBe(true);
    expect(db).toBeDefined();
  });

  it('can insert and query tasks', async () => {
    const db = createDb(dbPath);
    const now = new Date();

    const [inserted] = await db
      .insert(tasks)
      .values({
        type: 'bug',
        title: 'Test bug',
        description: 'A test bug description',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    expect(inserted.id).toBe(1);
    expect(inserted.type).toBe('bug');
    expect(inserted.title).toBe('Test bug');
    expect(inserted.status).toBe('pending');
    expect(inserted.priority).toBe(0);

    const [found] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, 1));

    expect(found.title).toBe('Test bug');
  });

  it('can update task status', async () => {
    const db = createDb(dbPath);
    const now = new Date();

    await db.insert(tasks).values({
      type: 'story',
      title: 'Test story',
      createdAt: now,
      updatedAt: now,
    });

    await db
      .update(tasks)
      .set({ status: 'executing', updatedAt: new Date() })
      .where(eq(tasks.id, 1));

    const [updated] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, 1));

    expect(updated.status).toBe('executing');
  });

  it('can delete pending tasks', async () => {
    const db = createDb(dbPath);
    const now = new Date();

    await db.insert(tasks).values({
      type: 'bug',
      title: 'To delete',
      createdAt: now,
      updatedAt: now,
    });

    await db.delete(tasks).where(eq(tasks.id, 1));

    const results = await db.select().from(tasks);
    expect(results).toHaveLength(0);
  });
});
