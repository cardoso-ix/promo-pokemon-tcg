import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY || process.env.SESSION_SECRET || 'promo-analytics-token-encryption-key-2026';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Criptografa uma string usando AES-256-GCM.
 * Retorna no formato iv:tag:ciphertext em base64.
 */
export function encryptToken(text: string): string {
  if (!text) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Decriptografa uma string criptografada com AES-256-GCM.
 * Se a string não estiver no formato criptografado, retorna o texto original como fallback seguro.
 */
export function decryptToken(cipherString: string): string {
  if (!cipherString) return '';
  const parts = cipherString.split(':');
  if (parts.length !== 3) {
    // String em texto puro (legada ou não criptografada)
    return cipherString;
  }

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[1], 'base64');
    const encrypted = Buffer.from(parts[2], 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    // Se falhar a decriptografia (ex: chave alterada), retorna a string original
    return cipherString;
  }
}
