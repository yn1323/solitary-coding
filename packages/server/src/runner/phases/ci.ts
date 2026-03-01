import { execSync } from 'node:child_process';
import type { Config, CiStep } from '@solitary-coding/shared';
import type { ClaudeCli } from '../claude.js';

export async function detectCiSteps(
  config: Config,
  claude: ClaudeCli,
): Promise<CiStep[]> {
  // If config has explicit steps, use those
  if (config.ci.steps && config.ci.steps.length > 0) {
    return config.ci.steps;
  }

  // Otherwise, ask Claude to detect them
  const prompt = `Analyze this repository and determine the appropriate CI steps
(typecheck, lint, test, build). For each step, provide the exact command.
Only include steps that are actually configured in this project.

Respond with ONLY a JSON array, no other text:
[{ "name": "typecheck", "command": "npx tsc --noEmit" }, ...]`;

  const result = await claude.print(prompt);

  try {
    const match = result.stdout.match(/\[[\s\S]*\]/);
    if (!match) return [];
    return JSON.parse(match[0]) as CiStep[];
  } catch {
    return [];
  }
}

export async function runCi(
  steps: CiStep[],
  projectRoot: string,
): Promise<{ success: boolean; failedStep?: string; error?: string }> {
  for (const step of steps) {
    try {
      execSync(step.command, {
        cwd: projectRoot,
        encoding: 'utf-8',
        timeout: 120_000,
        stdio: 'pipe',
      });
    } catch (err) {
      const error = err as { stderr?: string; message?: string };
      return {
        success: false,
        failedStep: step.name,
        error: error.stderr || error.message || 'Unknown CI error',
      };
    }
  }
  return { success: true };
}
