import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const processes = [
  {
    name: 'api',
    command: process.execPath,
    args: ['server.js'],
  },
  {
    name: 'web',
    command: npmCommand,
    args: ['run', 'dev:web'],
  },
];

let shuttingDown = false;
const children = processes.map(({ name, command, args }) => {
  const child = spawn(command, args, {
    cwd: rootDir,
    env: process.env,
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.error(`[${name}] exited with ${reason}; stopping dev servers.`);
    stopChildren();
    process.exit(code ?? (signal ? 1 : 0));
  });

  child.on('error', (error) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.error(`[${name}] failed to start:`, error);
    stopChildren();
    process.exit(1);
  });

  return child;
});

function stopChildren() {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    stopChildren();
  });
}
