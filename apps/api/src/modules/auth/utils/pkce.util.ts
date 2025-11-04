import { randomBytes, createHash } from 'crypto';

export function randomString(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(input: string): Buffer {
  return createHash('sha256').update(input).digest();
}

export function base64Url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function createPkcePair(): { verifier: string; challenge: string; method: 'S256' } {
  const verifier = randomString(32);
  const challenge = base64Url(sha256(verifier));
  return { verifier, challenge, method: 'S256' };
}
