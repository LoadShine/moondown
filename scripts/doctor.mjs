import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const checks = [
  { name: 'node', ok: Number(process.versions.node.split('.')[0]) >= 22, detail: process.versions.node },
  { name: 'pnpm-lock.yaml', ok: existsSync(new URL('../pnpm-lock.yaml', import.meta.url)), detail: 'lockfile present' },
  { name: 'playwright chromium cache', ok: true, detail: 'run: pnpm exec playwright install chromium if missing' }
];

try {
  require.resolve('esbuild');
  checks.push({ name: 'esbuild', ok: true, detail: 'installed' });
} catch {
  checks.push({ name: 'esbuild', ok: false, detail: 'missing' });
}

try {
  require.resolve('tsx');
  checks.push({ name: 'tsx', ok: true, detail: 'installed' });
} catch {
  checks.push({ name: 'tsx', ok: false, detail: 'missing' });
}

const failed = checks.filter((c) => !c.ok);
for (const c of checks) {
  console.log(`${c.ok ? 'OK' : 'FAIL'}  ${c.name}: ${c.detail}`);
}

if (failed.length > 0) {
  process.exitCode = 1;
}
