import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');
const distPlayground = resolve(root, 'playground-dist');

const REAL_AI_ENABLED = String(process.env.MOONDOWN_AI_REAL || '').toLowerCase() === 'true';

const DEEPSEEK_ENDPOINT = process.env.DEEPSEEK_ENDPOINT || 'https://leaomato-openai.openai.azure.com/openai/v1/';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'DeepSeek-V3.2';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

const realAIClient = REAL_AI_ENABLED && DEEPSEEK_API_KEY
  ? new OpenAI({
      baseURL: DEEPSEEK_ENDPOINT,
      apiKey: DEEPSEEK_API_KEY,
    })
  : null;

function runBuild() {
  const result = spawnSync(process.execPath, [resolve(root, 'scripts/build-playground.mjs')], {
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runBuild();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  const url = req.url?.split('?')[0] || '/';

  if (url === '/__ai_stream' && req.method === 'POST') {
    if (!REAL_AI_ENABLED) {
      sendJson(res, 400, { error: 'Real AI is disabled. Set MOONDOWN_AI_REAL=true.' });
      return;
    }
    if (!realAIClient) {
      sendJson(res, 500, { error: 'Real AI client unavailable. Check DEEPSEEK_API_KEY.' });
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { systemPrompt = 'You are a helpful assistant.', userPrompt = 'Hello' } = JSON.parse(body || '{}');

        const stream = await realAIClient.chat.completions.create({
          model: DEEPSEEK_MODEL,
          messages: [
            { role: 'system', content: String(systemPrompt) },
            { role: 'user', content: String(userPrompt) },
          ],
          temperature: 0.8,
          stream: true,
        });

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        for await (const chunk of stream) {
          const piece = chunk.choices?.[0]?.delta?.content;
          if (piece) {
            res.write(piece);
          }
        }
        res.end();
      } catch (error) {
        sendJson(res, 500, { error: String(error) });
      }
    });

    return;
  }

  let filePath = url === '/' ? '/index.html' : url;
  filePath = filePath.replace(/\.\.+/g, '');
  const abs = resolve(distPlayground, `.${filePath}`);

  if (!abs.startsWith(distPlayground) || !existsSync(abs)) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }

  const ext = extname(abs);
  const type = mimeTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', type);

  if (ext === '.html' && REAL_AI_ENABLED) {
    const html = readFileSync(abs, 'utf8').replace(
      '</body>',
      '<script>window.__MOONDOWN_REAL_AI__ = true;</script></body>'
    );
    res.end(html);
    return;
  }

  res.end(readFileSync(abs));
});

const port = Number(process.env.PORT || 5174);
server.on('error', (error) => {
  if (error && error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Start the playground with a different port, for example: PORT=${port + 1} pnpm dev`);
    process.exit(1);
  }

  console.error('Failed to start Moondown playground server:', error);
  process.exit(1);
});

server.listen(port, () => {
  console.log(`Moondown playground ready: http://localhost:${port}`);
  console.log(`Real AI mode: ${REAL_AI_ENABLED ? 'ON' : 'OFF'}`);
});
