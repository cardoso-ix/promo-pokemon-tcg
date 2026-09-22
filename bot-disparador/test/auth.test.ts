import test from 'node:test';
import assert from 'node:assert';
import {
  verifyCredentials,
  createSessionToken,
  verifySessionToken,
  buildSessionCookie,
  buildClearCookie
} from '../src/web/auth.js';

test('Autenticação Bot Disparador - Credenciais do usuário', () => {
  assert.strictEqual(verifyCredentials('admin', 'promo2026'), true);
  assert.strictEqual(verifyCredentials('admin', 'senhaerrada'), false);
  assert.strictEqual(verifyCredentials('usuarioerrado', 'promo2026'), false);
  assert.strictEqual(verifyCredentials('', ''), false);
});

test('Autenticação Bot Disparador - Token de Sessão HMAC', () => {
  const token = createSessionToken('eduardo');
  assert.ok(token.includes('.'), 'Token deve ter payload e assinatura');

  const verification = verifySessionToken(token);
  assert.strictEqual(verification.valid, true);
  assert.strictEqual(verification.username, 'eduardo');

  // Token adulterado
  const tampered = token.slice(0, -3) + 'xyz';
  assert.strictEqual(verifySessionToken(tampered).valid, false);

  // Token inválido
  assert.strictEqual(verifySessionToken('invalido').valid, false);
  assert.strictEqual(verifySessionToken('').valid, false);
});

test('Autenticação Bot Disparador - Cookie Builder', () => {
  const token = 'test-token-456';
  const cookie = buildSessionCookie(token);
  assert.ok(cookie.includes('promo_session=test-token-456'));
  assert.ok(cookie.includes('HttpOnly'));
  assert.ok(cookie.includes('SameSite=Lax'));

  const clearCookie = buildClearCookie();
  assert.ok(clearCookie.includes('Max-Age=0'));
});
