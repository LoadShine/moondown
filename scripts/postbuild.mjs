import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');
const distDir = resolve(root, 'dist');

if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

cpSync(resolve(root, 'src/style.css'), resolve(distDir, 'style.css'));
