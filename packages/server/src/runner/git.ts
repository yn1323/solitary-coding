import { execFileSync } from 'node:child_process';

export class GitOps {
  constructor(private projectRoot: string) {}

  private run(args: string[]): string {
    return execFileSync('git', args, {
      cwd: this.projectRoot,
      encoding: 'utf-8',
    }).trim();
  }

  checkoutDefault(branch: string) {
    this.run(['checkout', branch]);
    this.run(['pull']);
  }

  createBranch(name: string) {
    this.run(['checkout', '-b', name]);
  }

  merge(branch: string, defaultBranch: string) {
    this.run(['checkout', defaultBranch]);
    this.run(['merge', branch]);
    this.run(['push']);
  }

  getCurrentBranch(): string {
    return this.run(['rev-parse', '--abbrev-ref', 'HEAD']);
  }

  hasUncommittedChanges(): boolean {
    const status = this.run(['status', '--porcelain']);
    return status.length > 0;
  }
}
