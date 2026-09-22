import crypto from 'crypto';
import bcrypt from 'bcryptjs';
export const hashPassword = (password) => bcrypt.hash(password, 12);
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');
export const hashToken = (value) => crypto.createHash('sha256').update(value).digest('hex');
export const generateTemporaryPassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%';
  const pick = (chars) => chars[crypto.randomInt(chars.length)];
  const raw = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  const all = upper + lower + digits + symbols;
  while (raw.length < 16) raw.push(pick(all));
  for (let i = raw.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [raw[i], raw[j]] = [raw[j], raw[i]];
  }
  return raw.join('');
};
export const passwordMeetsPolicy = (value) => typeof value === 'string' && value.length >= 12 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
