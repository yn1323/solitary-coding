import path from 'node:path';
import { parseArgs } from 'node:util';
import { initCommand } from './commands/init.js';
import { startCommand } from './commands/start.js';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  strict: false,
  options: {
    dir: { type: 'string' },
  },
});

const command = positionals[0];
const targetDir = values.dir
  ? path.resolve(values.dir as string)
  : undefined;

switch (command) {
  case 'init':
    await initCommand(targetDir);
    break;
  case 'start':
    await startCommand(targetDir);
    break;
  default:
    console.log('Usage: solitary-coding <init|start> [--dir <path>]');
    console.log('');
    console.log('Commands:');
    console.log('  init   Initialize solitary-coding in the current project');
    console.log('  start  Start the solitary-coding server and dashboard');
    console.log('');
    console.log('Options:');
    console.log('  --dir  Target project directory (default: current directory)');
    process.exit(command ? 1 : 0);
}
