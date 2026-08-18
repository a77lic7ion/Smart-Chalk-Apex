import { test, expect } from '@playwright/test';

const openRouterSettings = {
  provider: 'openRouter',
  geminiApiKey: '',
  openAIKey: '',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3',
  providerApiKeys: { openRouter: 'playwright-test-key' },
  providerEndpoints: { openRouter: 'https://openrouter.ai/api/v1' },
  selectedModels: { openRouter: 'qwen/qwen3-4b:free' },
  customProviderName: '',
  customEndpoint: '',
  customApiKey: '',
};

test('CAPS generation requires and uses an imported official DBE curriculum source', async ({ page }) => {
  await page.addInitScript((settings) => {
    localStorage.setItem('aiProviderSettings', JSON.stringify(settings));
  }, openRouterSettings);

  await page.route('https://openrouter.ai/api/v1/chat/completions', async (route) => {
    const request = route.request().postDataJSON() as { messages?: Array<{ role: string; content: string }> };
    const systemPrompt = request.messages?.find(message => message.role === 'system')?.content || '';
    expect(systemPrompt).toContain('Authoritative South African Curriculum Source');
    expect(systemPrompt).toContain('Department of Basic Education');

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{
          message: {
            content: JSON.stringify({
              questions: [{
                question: 'State one function of chlorophyll in photosynthesis.',
                answer: 'Chlorophyll absorbs light energy for photosynthesis.',
                curriculum: 'CAPS',
                grade: 'Grade 10',
                subject: 'Life Sciences (FET)',
                standard: 'CAPS Life Sciences',
              }],
            }),
          },
        }],
      }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'TEST GEN' }).click();
  await page.locator('select[name="grade"]').selectOption('Grade 10');
  await page.locator('select[name="subject"]').selectOption('Life Sciences (FET)');
  await page.getByRole('button', { name: 'Manage sources' }).click();
  await page.getByRole('button', { name: 'Import DBE CAPS source' }).click();
  await page.locator('input[type="file"]').setInputFiles('/home/ubuntu/Smart-Chalk-Apex/e2e/fixtures/dbe_caps_fet_life_sciences_photosynthesis.txt');
  await expect(page.getByText('DBE source imported for Grade 10 Life Sciences (FET).')).toBeVisible({ timeout: 30000 });

  await page.locator('input[name="topic"]').fill('Photosynthesis');
  await page.locator('textarea[name="questionTypes"]').fill('One short-answer question.');
  await page.getByRole('button', { name: /Generate Test/i }).click();

  await expect(page.getByText('Review & Commit Questions')).toBeVisible();
  await expect(page.getByText('Source-grounded: DBE')).toBeVisible();
});
