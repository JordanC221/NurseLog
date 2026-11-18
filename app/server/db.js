import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
fs.mkdirSync(dataDir, { recursive: true });
const databasePath = process.env.DATABASE_URL?.replace(/^sqlite:/, '') || path.join(dataDir, 'nurselog.sqlite');

export const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
