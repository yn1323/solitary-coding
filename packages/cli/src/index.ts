import { parseArgs } from 'node:util';
import { initCommand } from './commands/init.js';
import { startCommand } from './commands/start.js';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  strict: false,
  options: {
    project: { type: 'string', short: 'p' },
    port: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean', short: 'v' },
  },
});

const command = positionals[0];

if (values.version) {
  // Read version from package.json at build time (bundled by tsup)
  console.log('0.0.1');
  process.exit(0);
}

if (values.help || !command) {
  console.log('Usage: solitary-coding <command> [options]');
  console.log('');
  console.log('Commands:');
  console.log('  init   Initialize solitary-coding in the current project');
  console.log('  start  Start the solitary-coding server and dashboard');
  console.log('');
  console.log('Options:');
  console.log('  -p, --project <path>  Target project directory (default: cwd)');
  console.log('  --port <number>       Override server port');
  console.log('  -v, --version         Show version');
  console.log('  -h, --help            Show help');
  console.log('');
  console.log('Examples:');
  console.log('  npx solitary-coding init');
  console.log('  npx solitary-coding start');
  console.log('  npx solitary-coding start --project /path/to/my-project');
  console.log('  npx solitary-coding start --port 5000');
  process.exit(command ? 1 : 0);
}

const projectDir = values.project as string | undefined;
const portOverride = values.port ? Number(values.port) : undefined;

switch (command) {
  case 'init':
    await initCommand(projectDir);
    break;
  case 'start':
    await startCommand(projectDir, portOverride);
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.error('Run `solitary-coding --help` for usage information.');
    process.exit(1);
}
