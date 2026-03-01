import { execSync } from 'node:child_process';

export class GitOps {
  constructor(private projectRoot: string) {}

  private run(cmd: string): string {
    return execSync(cmd, { cwd: this.projectRoot, encoding: 'utf-8' }).trim();
  }

  checkoutDefault(branch: string) {
    this.run(`git checkout ${branch}`);
    this.run('git pull');
  }

  createBranch(name: string) {
    this.run(`git checkout -b ${name}`);
  }

  merge(branch: string, defaultBranch: string) {
    this.run(`git checkout ${defaultBranch}`);
    this.run(`git merge ${branch}`);
    this.run('git push');
  }

  getCurrentBranch(): string {
    return this.run('git rev-parse --abbrev-ref HEAD');
  }

  hasUncommittedChanges(): boolean {
    const status = this.run('git status --porcelain');
    return status.length > 0;
  }
}
