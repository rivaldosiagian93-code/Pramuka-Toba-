import { randomBytes, scrypt as scryptCallback, createHash, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export const token = () => randomBytes(32).toString('base64url');
export const tokenHash = str => createHash('sha256').update(str).digest('hex');
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password,salt,64);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}
export async function verifyPassword(password,encoded) {
  try {
    const [algo,salt,hex] = encoded.split('$');
    if (algo!=='scrypt' || !/^[0-9a-f]{32}$/.test(salt) || !/^[0-9a-f]{128}$/.test(hex)) return false;
    const actual=await scrypt(password,salt,64);
    return timingSafeEqual(actual,Buffer.from(hex,'hex'));
  } catch { return false; }
}
export const validUrl = str => {
  try { const u = new URL(str); return u.protocol==='https:' && Boolean(u.hostname) && !u.username && !u.password; }
  catch { return false; }
};
export function jakartaDate() {
  const f = new Intl.DateTimeFormat('en-US',{ timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'});
  const p=Object.fromEntries(f.formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export function isOpenForRegistration(event,day=jakartaDate()) {
  return Boolean(event.published && event.related_toba && event.registration_open && event.date>=day);
}
