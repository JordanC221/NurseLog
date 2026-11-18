import fs from 'node:fs';
import path from 'node:path';
import { db } from './db.js';

db.exec(`
CREATE TABLE IF NOT EXISTS migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

const migrationsDir = path.resolve(process.cwd(), 'server/migrations');
fs.mkdirSync(migrationsDir, { recursive: true });
const migrationFiles = fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort();

for (const name of migrationFiles) {
  const applied = db.prepare('SELECT 1 FROM migrations WHERE name = ?').get(name);
  if (applied) continue;
  const sql = fs.readFileSync(path.join(migrationsDir, name), 'utf8');
  db.transaction(() => {
    db.exec(sql);
    db.prepare('INSERT INTO migrations(name) VALUES (?)').run(name);
  })();
  console.log(`Applied ${name}`);
}
