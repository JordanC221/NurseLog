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
