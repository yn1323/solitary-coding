import type { Config } from '@solitary-coding/shared';
import type { DbType } from '../db/index.js';
import { ClaudeCli } from './claude.js';
import { GitOps } from './git.js';
import { prioritizeTasks } from './phases/prioritize.js';
import { discussTask } from './phases/discuss.js';
import { planTask } from './phases/plan.js';
import { executeTask } from './phases/execute.js';
import { detectCiSteps, runCi } from './phases/ci.js';
import { mergeTask } from './phases/merge.js';
import { eq, asc, desc } from 'drizzle-orm';
import { tasks, executionLogs } from '@solitary-coding/shared/db/schema';
import fs from 'node:fs';
import path from 'node:path';

export class TaskRunner {
  private timer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private isPaused = false;
  private currentTaskId: number | null = null;
  private claude: ClaudeCli;
  private git: GitOps;

  constructor(
    private db: DbType,
    private config: Config,
    private projectRoot: string,
  ) {
    this.claude = new ClaudeCli(config, projectRoot);
    this.git = new GitOps(projectRoot);
  }

  startTimer() {
    const intervalMs = this.config.timer.intervalMinutes * 60 * 1000;
    this.timer = setInterval(() => this.tick(), intervalMs);
    console.log(
      `Timer started: checking every ${this.config.timer.intervalMinutes} minutes`,
    );
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async triggerManually() {
    if (this.isRunning) throw new Error('Already running');
    await this.tick();
  }

  togglePause(): boolean {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      currentTaskId: this.currentTaskId,
      timerActive: this.timer !== null,
    };
  }

  private async tick() {
    if (this.isPaused || this.isRunning) return;
    this.isRunning = true;
    try {
      await this.processNextTask();
    } finally {
      this.isRunning = false;
      this.currentTaskId = null;
    }
  }

  private async processNextTask() {
    // Get pending tasks
    const pendingTasks = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.status, 'pending'))
      .orderBy(asc(tasks.priority));

    if (pendingTasks.length === 0) return;

    // Get completed tasks for context
    const completedTasks = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.status, 'completed'))
      .orderBy(desc(tasks.completedAt));

    // Phase 1: Prioritize
    await this.updateStatus(pendingTasks[0].id, 'prioritizing');
    await prioritizeTasks(pendingTasks, completedTasks, this.claude, this.db);

    // Pick top priority task
    const [topTask] = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.status, 'prioritizing'))
      .orderBy(asc(tasks.priority))
      .limit(1);

    if (!topTask) return;
    this.currentTaskId = topTask.id;

    try {
      // Phase 2: Discuss
      await this.updateStatus(topTask.id, 'discussing');
      const discussion = await discussTask(
        topTask,
        this.claude,
        this.projectRoot,
      );
      await this.saveDocument(topTask.id, 'discussion', discussion);
      await this.logPhase(topTask.id, 'discuss', '', discussion);

      // Phase 3: Plan
      await this.updateStatus(topTask.id, 'planned');
      const { plan, executionPrompt } = await planTask(
        topTask,
        discussion,
        this.claude,
      );
      await this.saveDocument(topTask.id, 'plan', plan);
      await this.db
        .update(tasks)
        .set({ plan, executionPrompt, updatedAt: new Date() })
        .where(eq(tasks.id, topTask.id));
      await this.logPhase(topTask.id, 'plan', '', plan);

      // Phase 4: Git branch + Execute
      await this.updateStatus(topTask.id, 'executing');
      const branchName = `task/${String(topTask.id).padStart(3, '0')}`;
      this.git.checkoutDefault(this.config.git.defaultBranch);
      this.git.createBranch(branchName);
      await this.db
        .update(tasks)
        .set({ branchName, startedAt: new Date(), updatedAt: new Date() })
        .where(eq(tasks.id, topTask.id));

      const execResult = await executeTask(executionPrompt, this.claude);
      await this.logPhase(
        topTask.id,
        'execute',
        executionPrompt,
        execResult.stdout,
        execResult.exitCode,
        execResult.durationMs,
      );

      // Phase 5: CI with retry loop
      await this.updateStatus(topTask.id, 'testing');
      const ciSteps = await detectCiSteps(this.config, this.claude);
      await this.db
        .update(tasks)
        .set({ ciSteps, updatedAt: new Date() })
        .where(eq(tasks.id, topTask.id));

      let ciSuccess = false;
      let totalRetries = 0;

      while (!ciSuccess && totalRetries < this.config.ci.maxRetries) {
        const ciResult = await runCi(ciSteps, this.projectRoot);
        if (ciResult.success) {
          ciSuccess = true;
        } else {
          totalRetries++;
          await this.db
            .update(tasks)
            .set({ retryCount: totalRetries, updatedAt: new Date() })
            .where(eq(tasks.id, topTask.id));

          const fixPrompt = `CI step "${ciResult.failedStep}" failed with error:\n${ciResult.error}\n\nPlease fix the issue.`;
          const fixResult = await this.claude.execute(fixPrompt);
          await this.logPhase(
            topTask.id,
            'fix',
            fixPrompt,
            fixResult.stdout,
            fixResult.exitCode,
            fixResult.durationMs,
          );
        }
      }

      if (!ciSuccess) {
        await this.updateStatus(topTask.id, 'stopped');
        // Stop subsequent pending tasks
        await this.db
          .update(tasks)
          .set({ status: 'stopped', updatedAt: new Date() })
          .where(eq(tasks.status, 'pending'));
        return;
      }

      // Phase 6: Merge
      await mergeTask(branchName, this.git, this.config, this.claude);

      // Complete
      await this.updateStatus(topTask.id, 'completed');
      await this.db
        .update(tasks)
        .set({ completedAt: new Date(), updatedAt: new Date() })
        .where(eq(tasks.id, topTask.id));

      // Save result document
      const resultContent = `# Task ${topTask.id}: ${topTask.title}\n\nStatus: Completed\nBranch: ${branchName}\n`;
      await this.saveDocument(topTask.id, 'result', resultContent);
      await this.db
        .update(tasks)
        .set({ result: resultContent, updatedAt: new Date() })
        .where(eq(tasks.id, topTask.id));
    } catch (err) {
      console.error(`Task ${topTask.id} failed:`, err);
      await this.updateStatus(topTask.id, 'failed');
    }
  }

  private async updateStatus(
    taskId: number,
    status: typeof tasks.$inferInsert.status,
  ) {
    await this.db
      .update(tasks)
      .set({ status, updatedAt: new Date() })
      .where(eq(tasks.id, taskId));
  }

  private async saveDocument(
    taskId: number,
    filename: string,
    content: string,
  ) {
    const dir = path.join(
      this.projectRoot,
      '.solitary-coding',
      'docs',
      `task-${String(taskId).padStart(3, '0')}`,
    );
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${filename}.md`), content, 'utf-8');
  }

  private async logPhase(
    taskId: number,
    phase: string,
    input: string,
    output: string,
    exitCode?: number,
    durationMs?: number,
  ) {
    await this.db.insert(executionLogs).values({
      taskId,
      phase: phase as 'prioritize' | 'discuss' | 'plan' | 'execute' | 'ci' | 'fix',
      input,
      output,
      exitCode: exitCode ?? null,
      durationMs: durationMs ?? null,
      createdAt: new Date(),
    });
  }
}
