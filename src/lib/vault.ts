// Local Encrypted Vault using Web Cryptography API (SubtleCrypto AES-GCM & PBKDF2)

const VAULT_SALT = 'NexusTerm_Vault_Salt_v1';
const ITERATIONS = 100000;

let masterKeyCache: CryptoKey | null = null;
let clipboardTimeoutId: any = null;

async function deriveKey(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(VAULT_SALT),
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function hashPasswordForVerification(password: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`VERIFY:${password}:${VAULT_SALT}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function unlockVaultWithPassword(password: string, expectedHash?: string): Promise<boolean> {
  if (expectedHash) {
    const computedHash = await hashPasswordForVerification(password);
    if (computedHash !== expectedHash) {
      return false;
    }
  }

  try {
    masterKeyCache = await deriveKey(password);
    return true;
  } catch (err) {
    console.error('Failed to unlock vault:', err);
    return false;
  }
}

export const unlockVault = unlockVaultWithPassword;

export function lockVault(): void {
  masterKeyCache = null;
}

export function isVaultUnlocked(): boolean {
  return masterKeyCache !== null;
}

export async function encryptSecret(plaintext: string): Promise<string> {
  if (!masterKeyCache) {
    throw new Error('Vault is locked. Unlock before encrypting secrets.');
  }

  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    masterKeyCache,
    enc.encode(plaintext)
  );

  const ivBase64 = btoa(String.fromCharCode(...iv));
  const dataBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  return `${ivBase64}:${dataBase64}`;
}

export async function decryptSecret(encryptedPayload: string): Promise<string> {
  if (!masterKeyCache) {
    throw new Error('Vault is locked. Please unlock the vault with your master password.');
  }

  const parts = encryptedPayload.split(':');
  if (parts.length !== 2) {
    throw new Error('Malformed encrypted payload format.');
  }

  const [ivBase64, dataBase64] = parts;
  const iv = new Uint8Array(
    atob(ivBase64)
      .split('')
      .map((c) => c.charCodeAt(0))
  );
  const data = new Uint8Array(
    atob(dataBase64)
      .split('')
      .map((c) => c.charCodeAt(0))
  );

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    masterKeyCache,
    data
  );

  return new TextDecoder().decode(decrypted);
}

// Secure clipboard copy with automatic wipe after timeout
export function copyToClipboardWithTimeout(text: string, timeoutSeconds: number = 20): Promise<void> {
  if (clipboardTimeoutId) {
    clearTimeout(clipboardTimeoutId);
  }

  return navigator.clipboard.writeText(text).then(() => {
    if (timeoutSeconds > 0) {
      clipboardTimeoutId = setTimeout(() => {
        navigator.clipboard.writeText('').catch(() => {});
      }, timeoutSeconds * 1000);
    }
  });
}

// Generate realistic SHA256 Key Fingerprint
export function generateFingerprint(): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/';
  let rand = '';
  for (let i = 0; i < 43; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SHA256:${rand}`;
}
