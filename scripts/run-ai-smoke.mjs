import { spawn } from 'node:child_process';

const env = {
  ...process.env,
  DEEPSEEK_ENDPOINT: process.env.DEEPSEEK_ENDPOINT || 'https://leaomato-openai.openai.azure.com/openai/v1/',
  DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL || 'DeepSeek-V3.2',
};

if (!env.DEEPSEEK_API_KEY) {
  console.error('DEEPSEEK_API_KEY is missing.');
  process.exit(1);
}

function runAttempt(attempt) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        './scripts/real-ai-bridge.mjs',
        'chat',
        'You are a concise helpful assistant.',
        '请用一句话回答：moondown 是什么？',
        '512',
      ],
      { env, cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] }
    );

    let out = '';
    let err = '';

    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { err += d.toString(); });

    child.on('close', (code) => {
      resolve({ code, out: out.trim(), err: err.trim(), attempt });
    });
  });
}

let lastError = null;
for (let i = 1; i <= 5; i++) {
  const r = await runAttempt(i);
  console.log(`Attempt ${i}/5`);
  if (r.code === 0 && r.out) {
    console.log('SUCCESS');
    console.log(r.out);
    process.exit(0);
  }
  lastError = r;
  console.log('FAILED', r.err || '(no stderr)');
}

console.error('All attempts failed.');
if (lastError) {
  console.error('Last error:', lastError.err || `exit=${lastError.code}`);
}
process.exit(1);
