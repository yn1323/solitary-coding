import { spawn, type ChildProcess } from 'node:child_process';
import type { Config } from '@solitary-coding/shared';

export interface ClaudeResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export class ClaudeCli {
  private currentProcess: ChildProcess | null = null;

  constructor(
    private config: Config,
    private projectRoot: string,
  ) {}

  /** Run Claude Code in --print mode (non-interactive, read-only). */
  async print(prompt: string): Promise<ClaudeResult> {
    return this.exec(['--print', prompt]);
  }

  /** Run Claude Code in interactive mode with --yes flag. */
  async execute(prompt: string): Promise<ClaudeResult> {
    return this.exec(['--yes', '--dangerously-skip-permissions', prompt]);
  }

  /** Abort the currently running process, if any. */
  abort(): boolean {
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
      this.currentProcess = null;
      return true;
    }
    return false;
  }

  private exec(args: string[]): Promise<ClaudeResult> {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      const proc = spawn('claude', args, {
        cwd: this.projectRoot,
        timeout: this.config.claude.timeout,
        shell: true,
        env: { ...process.env },
      });

      this.currentProcess = proc;

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        this.currentProcess = null;
        resolve({
          stdout,
          stderr,
          exitCode: code ?? 1,
          durationMs: Date.now() - startTime,
        });
      });

      proc.on('error', (err) => {
        this.currentProcess = null;
        reject(new Error(`Claude Code CLI error: ${err.message}`));
      });
    });
  }

  static async isInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('claude', ['--version'], { shell: true });
      proc.on('close', (code) => resolve(code === 0));
      proc.on('error', () => resolve(false));
    });
  }
}
