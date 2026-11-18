import { openDatabase } from '../db.js';
import { resolve } from 'node:path';
const email=process.argv[2]?.trim().toLowerCase();
if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
  console.error('Cara penggunaan: npm run make-admin -- email@contoh.com');
  process.exit(1);
}
const db = openDatabase(process.env.DATABASE_PATH || resolve('data/pramuka-toba.sqlite'));
const user = db.prepare('SELECT name,email FROM users WHERE email=?').get(email);
if (!user) {
  console.error('Akun belum ditemukan. Daftarkan akun melalui website terlebih dahulu.');
  process.exit(1);
}
db.prepare("UPDATE users SET role='admin' WHERE email=?").run(email);
console.log(`Berhasil: ${user.name} (${email}) sekarang admin. Silakan refresh website.`);
db.close();
