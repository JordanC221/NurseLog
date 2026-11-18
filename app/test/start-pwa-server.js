import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import '../server/migrate.js';
import { db } from '../server/db.js';
import { app } from '../server/index.js';

const users = [
  { email: 'pwa-one@example.test', password: 'fictional-pwa-password-one' },
  { email: 'pwa-two@example.test', password: 'fictional-pwa-password-two' },
];

for (const user of users) {
  const hash = await bcrypt.hash(user.password, 4);
  db.prepare('INSERT OR REPLACE INTO users(id,email,password_hash,name,email_verified) VALUES(?,?,?,?,1)')
    .run(`usr_${crypto.randomUUID()}`, user.email, hash, 'Fictional PWA Reviewer');
}

app.listen(Number(process.env.PORT || 3102), '127.0.0.1', () => {
  console.log('Isolated PWA browser test server ready.');
});
