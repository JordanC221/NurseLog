import { test, expect } from '@playwright/test';
import path from 'node:path';

test('desktop and mobile clinical and study review workflow', async ({ page }) => {
  const email = `review-${Date.now()}@example.test`;
  const password = 'fictional-review-password-2026';
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/register');
  await expect(page.getByRole('button', { name: /Continue with Google/ })).toBeDisabled();
  await expect(page.getByText('Google sign-in is not configured for this independent version.')).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByTestId('development-verification-token')).toBeVisible();
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: /Continue with Google/ })).toBeDisabled();

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: 'Log a Skill', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.goto('/log');
  await page.getByPlaceholder('Skill name').fill('Fictional medication reconciliation');
  await page.getByRole('button', { name: /Continue to Signoff/ }).click();
  await page.getByPlaceholder('Nurse name').fill('Casey Example, RN');
  const canvas = page.locator('canvas');
  const bounds = await canvas.boundingBox();
  await page.mouse.move(bounds.x + 30, bounds.y + 40);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 90, bounds.y + 70, { steps: 4 });
  await page.mouse.up();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText('Entry Saved')).toBeVisible();
  const signedSkill = await page.evaluate(async () => {
    const response = await fetch('/api/entities/SkillLog?limit=100');
    const records = await response.json();
    return records.find((item) => item.skill_name === 'Fictional medication reconciliation');
  });
  expect(signedSkill?.is_signed).toBe(true);
  const lockedUpdate = await page.evaluate(async (id) => {
    const response = await fetch(`/api/entities/SkillLog/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'attempted change' }),
    });
    return response.status;
  }, signedSkill.id);
  expect(lockedUpdate).toBe(409);

  await page.getByRole('button', { name: 'Hours & Timer', exact: true }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByText('Active', { exact: true })).toBeVisible();
  const overlappingTimerStatus = await page.evaluate(async () => {
    const response = await fetch('/api/entities/HoursSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_time: new Date().toISOString(), rotation_type: 'med-surg', is_active: true }),
    });
    return response.status;
  });
  expect(overlappingTimerStatus).toBe(400);
  await page.reload();
  await expect(page.getByText('Active', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Stop & Save' }).click();
  await expect(page.getByText('Inactive', { exact: true })).toBeVisible();

  await page.goto('/study/materials');
  await page.getByPlaceholder('Title (optional)').fill('Fictional upload review');
  await page.locator('input[type=file]').setInputFiles(path.join(process.cwd(), 'test/fixtures/fictional-medication.pdf'));
  await page.getByRole('button', { name: 'Add to my library' }).click();
  await expect(page.getByText('Fictional upload review')).toBeVisible();
  await page.getByRole('button', { name: 'Generate study set' }).click();
  await expect(page.getByText(/AI generation is unavailable/)).toBeVisible();

  const set = await page.evaluate(async () => {
    const response = await fetch('/api/entities/StudySet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Fictional browser review set', description: 'test only', source_type: 'test' }),
    });
    return response.json();
  });
  await page.evaluate(async (setId) => {
    const post = (entity, data) => fetch(`/api/entities/${entity}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    await post('Flashcard', { set_id: setId, front: 'What should be checked first?', back: 'Verify identity with two identifiers.', topic: 'Safety' });
    await post('ExamQuestion', { set_id: setId, question: 'Which identifiers are appropriate?', options: ['Name and date of birth', 'Room number only', 'Bed number only', 'Diagnosis only'], correct_index: 0, explanation: 'Use two approved identifiers.', difficulty: 'easy', topic: 'Safety' });
    await post('ExamQuestion', { set_id: setId, question: 'What follows identity verification?', options: ['Document and reassess', 'Skip the order', 'Use room number', 'Ignore allergy status'], correct_index: 0, explanation: 'Follow the medication safety checks.', difficulty: 'medium', topic: 'Safety' });
    await post('ExamQuestion', { set_id: setId, question: 'What if an order conflicts with the record?', options: ['Clarify before administering', 'Guess the intended dose', 'Proceed immediately', 'Ask another patient'], correct_index: 0, explanation: 'Resolve discrepancies before administration.', difficulty: 'hard', topic: 'Safety' });
  }, set.id);

  await page.goto(`/study/flashcards?set=${set.id}`);
  await expect(page.getByText('What should be checked first?')).toBeVisible();
  await page.getByRole('button', { name: /What should be checked first/ }).click();
  await page.getByRole('button', { name: /Got it/ }).click();
  await expect.poll(async () => page.evaluate(async () => {
    const response = await fetch('/api/entities/StudyResponse?limit=100');
    const records = await response.json();
    return records.filter((record) => record.mode === 'flashcards').length;
  })).toBe(1);

  await page.goto(`/study/exam?set=${set.id}`);
  await expect(page.getByText('Question 1 of 3')).toBeVisible();
  const examOptions = page.locator('main button').filter({
    hasText: /^(Name and date of birth|Room number only|Bed number only|Diagnosis only|Document and reassess|Skip the order|Use room number|Ignore allergy status|Clarify before administering|Guess the intended dose|Proceed immediately|Ask another patient)$/,
  });
  await examOptions.first().click();
  await page.getByRole('button', { name: 'Next question' }).click();
  await expect(page.getByText('Question 2 of 3')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Unfinished exam saved')).toBeVisible();
  await page.getByRole('button', { name: 'Resume exam' }).click();
  await expect(page.getByText('Question 2 of 3')).toBeVisible();

  for (let i = 0; i < 2; i++) {
    await examOptions.first().click();
    const next = page.getByRole('button', { name: /Next question|Finish exam/ });
    await next.click();
  }
  await expect(page.getByText('Exam score')).toBeVisible();
  await expect(page.getByText('100%')).toBeVisible();
  await expect.poll(async () => page.evaluate(async () => {
    const response = await fetch('/api/entities/StudyAttempt?limit=100');
    const attempts = (await response.json()).filter((attempt) => attempt.mode === 'exam');
    const responses = await fetch('/api/entities/StudyResponse?limit=100');
    const examResponses = (await responses.json()).filter((record) => record.mode === 'exam');
    return {
      attempts: attempts.length,
      score: attempts[0]?.score,
      total: attempts[0]?.total,
      responses: examResponses.length,
      allCorrect: examResponses.every((record) => record.is_correct),
    };
  })).toEqual({ attempts: 1, score: 3, total: 3, responses: 3, allCorrect: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Open all sections' }).click();
  await expect(page.getByRole('dialog', { name: 'All sections' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Course Materials' }).click();
  await expect(page).toHaveURL(/\/study\/materials$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.goto('/settings');
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  const authStatus = await page.evaluate(async () => (await fetch('/api/auth/me')).status);
  expect(authStatus).toBe(401);
  expect(pageErrors).toEqual([]);
});
