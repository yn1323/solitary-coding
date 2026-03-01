import type { Config } from '@solitary-coding/shared';
import type { ClaudeCli } from '../claude.js';
import type { GitOps } from '../git.js';

export async function mergeTask(
  branchName: string,
  git: GitOps,
  config: Config,
  claude: ClaudeCli,
): Promise<void> {
  try {
    git.merge(branchName, config.git.defaultBranch);
  } catch {
    // Merge conflict -- ask Claude to resolve
    const fixResult = await claude.execute(
      'There is a merge conflict. Please resolve it and commit the resolution.',
    );
    if (fixResult.exitCode !== 0) {
      throw new Error('Failed to resolve merge conflict');
    }
    git.merge(branchName, config.git.defaultBranch);
  }
}
