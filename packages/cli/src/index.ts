import { parseArgs } from 'node:util';
import { initCommand } from './commands/init.js';
import { startCommand } from './commands/start.js';

const { positionals } = parseArgs({
  allowPositionals: true,
  strict: false,
});

const command = positionals[0];

switch (command) {
  case 'init':
    await initCommand();
    break;
  case 'start':
    await startCommand();
    break;
  default:
    console.log('Usage: solitary-coding <init|start>');
    console.log('');
    console.log('Commands:');
    console.log('  init   Initialize solitary-coding in the current project');
    console.log('  start  Start the solitary-coding server and dashboard');
    process.exit(command ? 1 : 0);
}
