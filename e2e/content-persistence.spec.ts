import { test, expect } from '@playwright/test';

const testName = 'Playwright Persistence Test';

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

test('saved test persists in My Content across reloads', async ({ page }) => {
  await page.addInitScript((settings) => {
    localStorage.setItem('aiProviderSettings', JSON.stringify(settings));
  }, openRouterSettings);

  await page.route('https://openrouter.ai/api/v1/chat/completions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{
          message: {
            content: JSON.stringify({
              questions: [{
                question: 'What process do plants use to convert light energy into chemical energy?',
                answer: 'Photosynthesis.',
                curriculum: 'CAPS',
                grade: 'Grade 8',
                subject: 'Natural Sciences',
                standard: 'Grade 8 - Natural Sciences - Photosynthesis',
              }],
            }),
          },
        }],
      }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'TEST GEN' }).click();

  await page.locator('input[name="topic"]').fill('Photosynthesis');
  await page.locator('textarea[name="questionTypes"]').fill('One short-answer question.');
  await page.getByRole('button', { name: /Generate Test/i }).click();

  await expect(page.getByText('Review & Commit Questions')).toBeVisible();
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('prompt');
    await dialog.accept(testName);
  });
  await page.getByRole('button', { name: 'Save Test & Commit' }).click();
  await expect(page.getByRole('status')).toContainText(testName);

  await page.getByRole('button', { name: 'MY CONTENT' }).click();
  await expect(page.getByRole('heading', { name: 'My Content' })).toBeVisible();
  await expect(page.getByText(testName)).toBeVisible();
  const savedTestCard = page.getByText(testName).locator('xpath=../..');
  await savedTestCard.getByTitle('Load Content').click();
  await expect(page.getByText('Review & Commit Questions')).toBeVisible();
  await expect(page.getByText('What process do plants use to convert light energy into chemical energy?')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'MY CONTENT' }).click();
  await expect(page.getByText(testName)).toBeVisible();
  const reloadedTestCard = page.getByText(testName).locator('xpath=../..');
  await reloadedTestCard.getByTitle('Load Content').click();
  await expect(page.getByText('Review & Commit Questions')).toBeVisible();
  await expect(page.getByText('What process do plants use to convert light energy into chemical energy?')).toBeVisible();
});
