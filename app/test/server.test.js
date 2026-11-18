import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nurselog-test-'));
process.env.DATA_DIR = tempDir;
process.env.STORAGE_DIR = path.join(tempDir, 'files');
process.env.NODE_ENV = 'test';

const { app } = await import('../server/index.js');

test('health and registration work', async () => {
  const health = await request(app).get('/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.independent, true);

  const registered = await request(app).post('/api/auth/register').send({
    email: 'nurse.one@example.test',
    password: 'a-secure-test-password',
  });
  assert.equal(registered.status, 201);
});

test('accounts cannot access each other records', async () => {
  await request(app).post('/api/auth/register').send({
    email: 'nurse.two@example.test',
    password: 'another-secure-password',
  });
  const agentOne = request.agent(app);
  const agentTwo = request.agent(app);

  assert.equal((await agentOne.post('/api/auth/login').send({
    email: 'nurse.one@example.test',
    password: 'a-secure-test-password',
  })).status, 200);
  assert.equal((await agentTwo.post('/api/auth/login').send({
    email: 'nurse.two@example.test',
    password: 'another-secure-password',
  })).status, 200);

  const created = await agentOne.post('/api/entities/SkillLog').send({
    skill_name: 'Fictional wound assessment',
    date: '2026-11-18',
  });
  assert.equal(created.status, 201);
  const denied = await agentTwo.get(`/api/entities/SkillLog/${created.body.id}`);
  assert.equal(denied.status, 404);
});

test('signed skill records cannot be changed or deleted', async () => {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({
    email: 'nurse.one@example.test',
    password: 'a-secure-test-password',
  });
  const created = await agent.post('/api/entities/SkillLog').send({
    skill_name: 'Fictional vital signs',
    date: '2026-11-18',
    is_signed: true,
  });
  assert.equal(created.status, 201);
  assert.equal((await agent.put(`/api/entities/SkillLog/${created.body.id}`).send({ notes: 'changed' })).status, 409);
  assert.equal((await agent.delete(`/api/entities/SkillLog/${created.body.id}`)).status, 409);
});

test('only one active timer is allowed per account', async () => {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({
    email: 'nurse.one@example.test',
    password: 'a-secure-test-password',
  });
  const first = await agent.post('/api/entities/HoursSession').send({
    start_time: '2026-11-18T09:00:00Z',
    end_time: null,
    is_active: true,
    rotation_type: 'Fictional Med-Surg',
  });
  assert.equal(first.status, 201);
  const second = await agent.post('/api/entities/HoursSession').send({
    start_time: '2026-11-18T10:00:00Z',
    end_time: null,
    is_active: true,
    rotation_type: 'Fictional Pediatrics',
  });
  assert.equal(second.status, 400);
});

test('logout invalidates subsequent authenticated requests', async () => {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({
    email: 'nurse.one@example.test',
    password: 'a-secure-test-password',
  });
  assert.equal((await agent.post('/api/auth/logout')).status, 200);
  assert.equal((await agent.get('/api/auth/me')).status, 401);
});

test('overlapping completed timer sessions are rejected', async () => {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({
    email: 'nurse.one@example.test',
    password: 'a-secure-test-password',
  });
  const first = await agent.post('/api/entities/HoursSession').send({
    start_time: '2026-11-18T09:00:00Z',
    end_time: '2026-11-18T11:00:00Z',
    rotation_type: 'Fictional Med-Surg',
  });
  assert.equal(first.status, 201);
  const overlap = await agent.post('/api/entities/HoursSession').send({
    start_time: '2026-11-18T10:00:00Z',
    end_time: '2026-11-18T12:00:00Z',
    rotation_type: 'Fictional Pediatrics',
  });
  assert.equal(overlap.status, 400);
});

test('private files cannot be accessed across accounts', async () => {
  const agentOne = request.agent(app);
  const agentTwo = request.agent(app);
  await agentOne.post('/api/auth/login').send({
    email: 'nurse.one@example.test',
    password: 'a-secure-test-password',
  });
  await agentTwo.post('/api/auth/login').send({
    email: 'nurse.two@example.test',
    password: 'another-secure-password',
  });
  const upload = await agentOne.post('/api/files/upload')
    .attach('file', Buffer.from('fictional study notes'), {
      filename: 'notes.txt',
      contentType: 'text/plain',
    });
  assert.equal(upload.status, 201);
  assert.equal((await agentTwo.get(upload.body.file_uri)).status, 404);
  assert.equal((await agentOne.get(upload.body.file_uri)).status, 200);
});

test('AI and Stripe unavailable states are honest', async () => {
  delete process.env.OPENAI_API_KEY;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_PAID_STUDY_PRICE_ID;
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({
    email: 'nurse.one@example.test',
    password: 'a-secure-test-password',
  });
  assert.equal((await agent.post('/api/functions/generateStudySet').send({ topic: 'Medication safety' })).status, 503);
  assert.equal((await agent.post('/api/functions/generateCaseStudy').send({ topic: 'Medication safety' })).status, 503);
  assert.equal((await agent.post('/api/billing/checkout').send({})).status, 503);
});

test('material generation uses extracted text and rejects empty text', async () => {
  delete process.env.OPENAI_API_KEY;
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({
    email: 'nurse.one@example.test',
    password: 'a-secure-test-password',
  });
  const upload = await agent.post('/api/files/upload')
    .attach('file', Buffer.from('Medication safety requires verifying the right patient, drug, dose, route, and time before administration.'), {
      filename: 'med-safety.txt',
      contentType: 'text/plain',
    });
  assert.equal(upload.status, 201);
  const generated = await agent.post('/api/functions/generateStudySet').send({
    mode: 'material',
    material: {
      title: 'Medication Safety',
      file_name: 'med-safety.txt',
      file_uri: upload.body.file_uri,
    },
  });
  assert.equal(generated.status, 503);

  const empty = await agent.post('/api/files/upload')
    .attach('file', Buffer.from('   '), {
      filename: 'empty.txt',
      contentType: 'text/plain',
    });
  assert.equal(empty.status, 201);
  const rejected = await agent.post('/api/functions/generateStudySet').send({
    mode: 'material',
    material: {
      title: 'Empty',
      file_name: 'empty.txt',
      file_uri: empty.body.file_uri,
    },
  });
  assert.equal(rejected.status, 422);
});
