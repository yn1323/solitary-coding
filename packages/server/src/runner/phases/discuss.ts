import type { ClaudeCli } from '../claude.js';

interface TaskLike {
  id: number;
  type: string;
  title: string;
  description: string;
}

export async function discussTask(
  task: TaskLike,
  claude: ClaudeCli,
  projectRoot: string,
): Promise<string> {
  const prompt = `You are a meta-cognitive AI facilitator. For the following task, you will:
1. Analyze the task and the repository structure
2. Dynamically choose 2-3 expert personas most relevant to this task
   (e.g., "Security Architect", "UX Engineer", "Performance Engineer")
3. Simulate a structured discussion between these personas
4. Arrive at a consensus on the implementation approach

Task: ${task.title}
Type: ${task.type}
Description: ${task.description}

Repository root: ${projectRoot}

Produce the full discussion as markdown, ending with a "## Consensus" section
that summarizes the agreed-upon implementation approach.`;

  const result = await claude.print(prompt);
  return result.stdout;
}
