import type { ClaudeCli } from '../claude.js';

interface TaskLike {
  id: number;
  type: string;
  title: string;
  description: string;
}

export async function planTask(
  task: TaskLike,
  discussion: string,
  claude: ClaudeCli,
): Promise<{ plan: string; executionPrompt: string }> {
  const prompt = `Based on this discussion and consensus, generate two things:

1. A detailed implementation plan (markdown)
2. An execution prompt that will be given to Claude Code to actually implement the changes.
   The execution prompt should be comprehensive, specific, and self-contained.
   It should include all necessary context so Claude Code can implement without further input.

Task: ${task.title}
Type: ${task.type}
Description: ${task.description}

Discussion & Consensus:
${discussion}

Respond in this exact format (use these exact headings):

## Plan
[implementation plan here]

## Execution Prompt
[the prompt to give to Claude Code for actual implementation]`;

  const result = await claude.print(prompt);

  // Parse the two sections
  const planMatch = result.stdout.match(
    /## Plan\s*\n([\s\S]*?)(?=## Execution Prompt)/,
  );
  const promptMatch = result.stdout.match(
    /## Execution Prompt\s*\n([\s\S]*?)$/,
  );

  return {
    plan: planMatch?.[1]?.trim() ?? result.stdout,
    executionPrompt: promptMatch?.[1]?.trim() ?? result.stdout,
  };
}
