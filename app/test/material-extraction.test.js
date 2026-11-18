import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractMaterialText } from '../server/material-extraction.js';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const read = (name) => fs.readFile(path.join(fixtures, name));

test('extracts PDF body text', async () => {
  const text = await extractMaterialText(await read('fictional-medication.pdf'), 'fictional-medication.pdf');
  assert.match(text, /verify patient identity/i);
  assert.match(text, /dose, route, and time/i);
  assert.ok(text.indexOf('verify patient identity') < text.indexOf('Check medication'));
});

test('extracts DOCX paragraphs and table text', async () => {
  const text = await extractMaterialText(await read('fictional-medication.docx'), 'fictional-medication.docx');
  assert.match(text, /patient identity verification/i);
  assert.match(text, /Document the response/i);
  assert.ok(text.indexOf('patient identity verification') < text.indexOf('Check the right medication'));
  assert.ok(text.indexOf('Check the right medication') < text.indexOf('Document the response'));
});

test('extracts PPTX slides in numeric order and excludes speaker notes', async () => {
  const text = await extractMaterialText(await read('fictional-medication.pptx'), 'fictional-medication.pptx');
  assert.ok(text.indexOf('First slide') < text.indexOf('Second slide'));
  assert.doesNotMatch(text, /Speaker note/);
});

test('reports empty, malformed, unsupported, and excessive source text', async () => {
  await assert.rejects(
    extractMaterialText(Buffer.alloc(0), 'empty.txt'),
    /No readable text/
  );
  await assert.rejects(
    extractMaterialText(Buffer.alloc(0), 'empty.pdf'),
    (error) => error.status === 422
  );
  await assert.rejects(
    extractMaterialText(await read('malformed.docx'), 'malformed.docx'),
    /not a valid supported Office document/
  );
  await assert.rejects(
    extractMaterialText(await read('unsupported.rtf'), 'unsupported.rtf'),
    (error) => error.status === 415 && /Unsupported file type/.test(error.message)
  );
  await assert.rejects(
    extractMaterialText(Buffer.alloc(40001, 'x'), 'large.txt'),
    /Split or shorten/
  );
});
