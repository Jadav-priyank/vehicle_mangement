import crypto from 'node:crypto';
import prisma from './prisma.js';
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
} from './session.js';

export { AUTH_COOKIE_NAME, createSessionToken, verifySessionToken };

export const DEFAULT_CREDENTIALS = {
  username: 'Traminsto',
  password: 'Tms#123',
};

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored) return false;
  if (!stored.includes(':')) {
    return password === stored;
  }
  const [salt, hash] = stored.split(':');
  try {
    const verifyHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch {
    return false;
  }
}

export async function getOrCreateAdminUser() {
  try {
    let user = await prisma.adminUser.findFirst();
    if (!user) {
      user = await prisma.adminUser.create({
        data: {
          username: DEFAULT_CREDENTIALS.username,
          password: hashPassword(DEFAULT_CREDENTIALS.password),
        },
      });
    }
    return user;
  } catch (err) {
    console.error('Error fetching/creating admin user:', err);
    return {
      id: 'default',
      username: DEFAULT_CREDENTIALS.username,
      password: hashPassword(DEFAULT_CREDENTIALS.password),
      isFallback: true,
    };
  }
}
