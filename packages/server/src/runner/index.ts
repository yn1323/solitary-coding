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

export class TaskRunner {
  private timer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private isPaused = false;
  private currentTaskId: number | null = null;
  private currentPhase: string | null = null;
  private cancelRequested = false;
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
    // Fire-and-forget: don't block the HTTP response
    this.tick().catch((err) =>
      console.error('Manual trigger failed:', err),
    );
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
      currentPhase: this.currentPhase,
      timerActive: this.timer !== null,
    };
  }

  async cancelCurrentTask(): Promise<boolean> {
    if (!this.isRunning || this.currentTaskId === null) {
      return false;
    }

    this.cancelRequested = true;
    this.claude.abort();

    await this.db
      .update(tasks)
      .set({
        status: 'stopped',
        errorMessage: 'Cancelled by user',
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, this.currentTaskId));

    return true;
  }

  private async tick() {
    if (this.isPaused || this.isRunning) return;
    this.isRunning = true;
    try {
      await this.processNextTask();
    } finally {
      this.isRunning = false;
      this.currentTaskId = null;
      this.currentPhase = null;
      this.cancelRequested = false;
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
    this.currentPhase = 'prioritizing';
    await prioritizeTasks(pendingTasks, completedTasks, this.claude, this.db);

    // Re-fetch pending tasks after prioritization to get correct order
    const [topTask] = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.status, 'pending'))
      .orderBy(asc(tasks.priority))
      .limit(1);

    if (!topTask) return;
    this.currentTaskId = topTask.id;

    try {
      // Phase 2: Discuss
      this.currentPhase = 'discussing';
      await this.updateStatus(topTask.id, 'discussing');
      const discussion = await discussTask(
        topTask,
        this.claude,
        this.projectRoot,
      );
      await this.db
        .update(tasks)
        .set({ discussion, updatedAt: new Date() })
        .where(eq(tasks.id, topTask.id));
      await this.logPhase(topTask.id, 'discuss', '', discussion);

      // Phase 3: Plan
      this.currentPhase = 'planning';
      await this.updateStatus(topTask.id, 'planned');
      const { plan, executionPrompt } = await planTask(
        topTask,
        discussion,
        this.claude,
      );
      await this.db
        .update(tasks)
        .set({ plan, executionPrompt, updatedAt: new Date() })
        .where(eq(tasks.id, topTask.id));
      await this.logPhase(topTask.id, 'plan', '', plan);

      // Phase 4: Git branch + Execute
      this.currentPhase = 'executing';
      await this.updateStatus(topTask.id, 'executing');
      const branchName = `task/${String(topTask.id).padStart(3, '0')}`;
      this.git.checkoutDefault(this.config.git.defaultBranch);
      this.git.createBranch(branchName);
      const startTime = Date.now();
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
      this.currentPhase = 'testing';
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
        // Only fail the current task, leave other pending tasks alone
        await this.db
          .update(tasks)
          .set({
            status: 'failed',
            errorMessage: `CI failed after ${totalRetries} retries (max: ${this.config.ci.maxRetries})`,
            updatedAt: new Date(),
          })
          .where(eq(tasks.id, topTask.id));
        return;
      }

      // Phase 6: Merge
      this.currentPhase = 'merging';
      await mergeTask(branchName, this.git, this.config, this.claude);

      // Complete
      await this.updateStatus(topTask.id, 'completed');
      await this.db
        .update(tasks)
        .set({ completedAt: new Date(), updatedAt: new Date() })
        .where(eq(tasks.id, topTask.id));

      // Build enriched result
      const totalDurationMs = Date.now() - startTime;
      const totalDurationMin = (totalDurationMs / 60000).toFixed(1);
      const resultContent = [
        `# Task ${topTask.id}: ${topTask.title}`,
        '',
        `**Status:** Completed`,
        `**Branch:** ${branchName}`,
        `**Total Duration:** ${totalDurationMin} minutes`,
        `**CI Retries:** ${totalRetries}`,
        '',
        '## Execution Output',
        '',
        '```',
        execResult.stdout.slice(0, 10000),
        '```',
        '',
        ...(ciSteps.length > 0
          ? ['## CI Steps', '', ...ciSteps.map((step) => `- **${step.name}:** \`${step.command}\``)]
          : []),
      ].join('\n');

      await this.db
        .update(tasks)
        .set({ result: resultContent, updatedAt: new Date() })
        .where(eq(tasks.id, topTask.id));
    } catch (err) {
      if (this.cancelRequested) {
        // Task was cancelled, status already set to 'stopped'
        return;
      }
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Task ${topTask.id} failed:`, errorMessage);
      await this.db
        .update(tasks)
        .set({
          status: 'failed',
          errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, topTask.id));
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

  private async logPhase(
    taskId: number,
    phase: string,
    input: string,
    output: string,
    exitCode?: number,
    durationMs?: number,
  ) {
    // Cap stored text to prevent DB bloat
    const MAX_LOG_SIZE = 50_000;
    await this.db.insert(executionLogs).values({
      taskId,
      phase: phase as 'prioritize' | 'discuss' | 'plan' | 'execute' | 'ci' | 'fix',
      input: input.length > MAX_LOG_SIZE ? input.slice(0, MAX_LOG_SIZE) + '\n...(truncated)' : input,
      output: output.length > MAX_LOG_SIZE ? output.slice(0, MAX_LOG_SIZE) + '\n...(truncated)' : output,
      exitCode: exitCode ?? null,
      durationMs: durationMs ?? null,
      createdAt: new Date(),
    });
  }
}
