import { eq } from 'drizzle-orm';
import { tasks } from '@solitary-coding/shared/db/schema';
import type { ClaudeCli } from '../claude.js';
import type { DbType } from '../../db/index.js';

interface TaskLike {
  id: number;
  type: string;
  title: string;
  description: string;
}

export async function prioritizeTasks(
  pendingTasks: TaskLike[],
  completedTasks: TaskLike[],
  claude: ClaudeCli,
  db: DbType,
): Promise<void> {
  if (pendingTasks.length <= 1) return;

  const prompt = `You are a project manager. Given these pending tasks and completed task history,
sort the pending tasks by optimal execution order considering dependencies, importance, and
logical sequencing.

Pending tasks:
${pendingTasks.map((t) => `- [${t.id}] (${t.type}) ${t.title}: ${t.description}`).join('\n')}

Completed tasks:
${completedTasks.map((t) => `- [${t.id}] (${t.type}) ${t.title}`).join('\n')}

Respond with ONLY a JSON array of task IDs in optimal order, e.g. [1, 3, 2]`;

  const result = await claude.print(prompt);

  try {
    // Extract JSON array from response
    const match = result.stdout.match(/\[[\d,\s]+\]/);
    if (!match) {
      console.warn('Prioritize: could not parse task order from Claude response');
      return;
    }

    const orderedIds: number[] = JSON.parse(match[0]);

    // Update priority for each task
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(tasks)
        .set({ priority: i, updatedAt: new Date() })
        .where(eq(tasks.id, orderedIds[i]));
    }
  } catch (err) {
    console.error('Prioritize: failed to reorder tasks:', err);
  }
}
