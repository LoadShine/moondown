import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const skipRealAi = !process.env.MOONDOWN_AI_REAL;

test.describe('AI real-provider integration (optional)', () => {
  test.skip(skipRealAi, 'MOONDOWN_AI_REAL not set; skipping real provider AI test');

  test('should run real AI stream through onAIStream bridge', async ({ page }) => {
    await page.goto('/');

    const source = page.locator('#editor .cm-line').filter({ hasText: 'Try these interactions:' }).first();
    await expect(source).toBeVisible();

    const box = await source.boundingBox();
    if (!box) throw new Error('No selection box');

    await page.mouse.move(box.x + 10, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + Math.min(230, box.width - 8), box.y + box.height / 2);
    await page.mouse.up();

    const bubbleMenu = page.locator('.cm-bubble-menu');
    await expect(bubbleMenu).toBeVisible();
    await bubbleMenu.getByRole('button', { name: 'AI Polish' }).click();

    const panel = page.locator('.cm-ai-polish-panel');
    await expect(panel).toBeVisible();

    const input = panel.locator('textarea');
    await input.fill('请用更自然的中文润色');

    // If real AI is wired, we expect non-empty response after send.
    await panel.locator('.ai-polish-send-btn').click();

    const response = panel.locator('.ai-polish-response-text').last();
    await expect(response).not.toHaveText('', { timeout: 90000 });

    const output = await response.textContent();
    const reportDir = path.resolve(process.cwd(), 'test-results');
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(path.join(reportDir, 'ai-real-output.txt'), output || '', 'utf8');
  });
});
