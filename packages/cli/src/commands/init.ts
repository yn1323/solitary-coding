import fs from 'node:fs';
import path from 'node:path';
import { ClaudeCli } from '@solitary-coding/server/runner/claude';

const CONFIG_TEMPLATE = `import { defineConfig } from '@solitary-coding/shared';

export default defineConfig({
  port: 4000,
  timer: {
    intervalMinutes: 10,
  },
  git: {
    defaultBranch: 'main',
  },
  ci: {
    maxRetries: 5,
    // steps: [
    //   { name: 'typecheck', command: 'npx tsc --noEmit' },
    //   { name: 'lint', command: 'npm run lint' },
    //   { name: 'test', command: 'npm test' },
    //   { name: 'build', command: 'npm run build' },
    // ],
  },
  claude: {
    timeout: 300000,
  },
});
`;

export async function initCommand(targetDir?: string) {
  const cwd = targetDir ?? process.cwd();

  console.log('Initializing solitary-coding...\n');

  // 1. Check if claude CLI is available
  const claudeInstalled = await ClaudeCli.isInstalled();
  if (!claudeInstalled) {
    console.error(
      'Error: Claude Code CLI is not installed or not in PATH.',
    );
    console.error(
      'Install it with: npm install -g @anthropic-ai/claude-code',
    );
    process.exit(1);
  }
  console.log('✓ Claude Code CLI detected');

  // 2. Create config file
  const configPath = path.join(cwd, 'solitary-coding.config.ts');
  if (fs.existsSync(configPath)) {
    console.log('✓ Config file already exists');
  } else {
    fs.writeFileSync(configPath, CONFIG_TEMPLATE, 'utf-8');
    console.log('✓ Created solitary-coding.config.ts');
  }

  // 3. Create directories
  const dirs = [
    path.join(cwd, '.solitary-coding'),
    path.join(cwd, '.solitary-coding', 'docs'),
    path.join(cwd, '.solitary-coding', 'logs'),
  ];
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
  console.log('✓ Created .solitary-coding/ directory structure');

  // 4. Add .gitkeep files
  for (const sub of ['docs', 'logs']) {
    const gitkeep = path.join(cwd, '.solitary-coding', sub, '.gitkeep');
    if (!fs.existsSync(gitkeep)) {
      fs.writeFileSync(gitkeep, '', 'utf-8');
    }
  }

  // 5. Check .gitignore
  const gitignorePath = path.join(cwd, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    const additions: string[] = [];
    if (!content.includes('.solitary-coding/db.sqlite')) {
      additions.push('.solitary-coding/db.sqlite');
    }
    if (!content.includes('.solitary-coding/logs/')) {
      additions.push('.solitary-coding/logs/');
    }
    if (additions.length > 0) {
      console.log('\nConsider adding these to your .gitignore:');
      additions.forEach((a) => console.log(`  ${a}`));
    }
  }

  console.log('\nDone! Run `npx solitary-coding start` to launch the dashboard.\n');
}
