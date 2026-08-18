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

const officialDbeMathUrl = 'https://www.education.gov.za/Portals/0/CD/National%20Curriculum%20Statements%20and%20Vocational/CAPS%20SP%20%20MATHEMATICS%20GR%207-9.pdf?ver=2015-01-27-160141-373';
const dbeMathFixture = `Department of Basic Education CAPS Senior Phase Mathematics Grades 7 to 9. Grade 7 fractions include comparing, ordering, adding, subtracting, multiplying and dividing common fractions. Learners must develop number sense, use correct mathematical language, and show calculation methods. ${'Fractions are taught through conceptual understanding, representations, and problem solving. '.repeat(20)}`;

test('CAPS generation retrieves an official DBE source online and shows its link only beneath the result', async ({ page }) => {
  await page.addInitScript((settings) => {
    localStorage.setItem('aiProviderSettings', JSON.stringify(settings));
  }, openRouterSettings);

  await page.route('**/api/curriculum-source?*', async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get('grade')).toBe('Grade 7');
    expect(url.searchParams.get('subject')).toBe('Mathematics (Senior Phase)');

    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      headers: {
        'X-Curriculum-Source-Name': 'DBE CAPS Senior Phase - Mathematics',
        'X-Curriculum-Source-Filename': 'dbe-caps-source.txt',
        'X-Curriculum-Source-Url': officialDbeMathUrl,
      },
      body: dbeMathFixture,
    });
  });

  await page.route('https://openrouter.ai/api/v1/chat/completions', async (route) => {
    const request = route.request().postDataJSON() as { messages?: Array<{ role: string; content: string }> };
    const systemPrompt = request.messages?.find(message => message.role === 'system')?.content || '';
    expect(systemPrompt).toContain('Authoritative South African Curriculum Source');
    expect(systemPrompt).toContain('Department of Basic Education');
    expect(systemPrompt).toContain(officialDbeMathUrl);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{
          message: {
            content: JSON.stringify({
              questions: [{
                question: 'Calculate 1/2 + 1/4.',
                answer: '3/4',
                curriculum: 'CAPS',
                grade: 'Grade 7',
                subject: 'Mathematics (Senior Phase)',
                standard: 'Grade 7 Mathematics — Fractions',
              }],
            }),
          },
        }],
      }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'TEST GEN' }).click();
  await expect(page.getByText('The official source is retrieved online')).toBeVisible();
  await expect(page.getByText('You do not need to download or upload a curriculum document.')).toBeVisible();

  await page.locator('input[name="topic"]').fill('Fractions');
  await page.locator('textarea[name="questionTypes"]').fill('One short-answer question.');
  await page.getByRole('button', { name: /Generate Test/i }).click();

  await expect(page.getByText('Review & Commit Questions')).toBeVisible();
  await expect(page.getByText('Official source used')).toBeVisible();
  await expect(page.getByRole('link', { name: 'DBE CAPS Senior Phase - Mathematics' })).toHaveAttribute('href', officialDbeMathUrl);
  await expect(page.getByText('Source-grounded: DBE')).toHaveCount(0);
});
