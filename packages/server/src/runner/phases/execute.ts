import type { ClaudeCli, ClaudeResult } from '../claude.js';

export async function executeTask(
  executionPrompt: string,
  claude: ClaudeCli,
): Promise<ClaudeResult> {
  return claude.execute(executionPrompt);
}
