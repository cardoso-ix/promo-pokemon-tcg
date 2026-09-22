import crypto from 'node:crypto';
import type { FastifyRequest } from 'fastify';

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'promo2026';
const SESSION_SECRET = process.env.SESSION_SECRET || 'promo-pokemon-tcg-secret-key-2026-secure';
const COOKIE_NAME = 'promo_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

export function verifyCredentials(user?: string, pass?: string): boolean {
  if (!user || !pass) return false;

  try {
    const userBuf = Buffer.from(user);
    const adminUserBuf = Buffer.from(ADMIN_USER);
    if (userBuf.length !== adminUserBuf.length) return false;
    if (!crypto.timingSafeEqual(userBuf, adminUserBuf)) return false;

    const passBuf = Buffer.from(pass);
    const adminPassBuf = Buffer.from(ADMIN_PASS);
    if (passBuf.length !== adminPassBuf.length) return false;
    if (!crypto.timingSafeEqual(passBuf, adminPassBuf)) return false;

    return true;
  } catch {
    return false;
  }
}

export function createSessionToken(username: string): string {
  const payload = {
    u: username,
    exp: Date.now() + SESSION_DURATION_MS,
    rnd: crypto.randomBytes(8).toString('hex')
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

export function verifySessionToken(token?: string | null): { valid: boolean; username?: string } {
  if (!token || typeof token !== 'string') return { valid: false };
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };
  const [data, signature] = parts;

  try {
    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(data)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length) return { valid: false };
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return { valid: false };

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) {
      return { valid: false };
    }
    return { valid: true, username: payload.u };
  } catch {
    return { valid: false };
  }
}

export function extractSessionToken(req: FastifyRequest): string | null {
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith(`${COOKIE_NAME}=`)) {
        return decodeURIComponent(cookie.substring(COOKIE_NAME.length + 1));
      }
    }
  }

  // Suporte a Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

export function buildSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${Math.floor(
    SESSION_DURATION_MS / 1000
  )}; HttpOnly; SameSite=Lax`;
}

export function buildClearCookie(): string {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}
