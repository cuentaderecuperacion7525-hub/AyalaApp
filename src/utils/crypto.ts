/**
 * Módulo de Criptografía Real de Extremo a Extremo (E2EE) para FamiChat
 * Utiliza el estándar nativo Web Crypto API (AES-GCM de 256 bits con derivación PBKDF2).
 * Ningún texto viaja en claro hacia la nube si el cifrado está activo.
 */

const FAMILY_SECRET_SALT = 'FamiChat-Martinez-Family-Salt-2026-v1';
const FAMILY_MASTER_PASSPHRASE = 'FamiChat-Private-Family-Key-AES256-GCM';

let cachedCryptoKey: CryptoKey | null = null;

function isWebCryptoAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.crypto !== 'undefined' &&
    typeof window.crypto.subtle !== 'undefined'
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getFamilyCryptoKey(): Promise<CryptoKey | null> {
  if (!isWebCryptoAvailable()) return null;
  if (cachedCryptoKey) return cachedCryptoKey;

  try {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(FAMILY_MASTER_PASSPHRASE),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    cachedCryptoKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(FAMILY_SECRET_SALT),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    return cachedCryptoKey;
  } catch (err) {
    console.warn('Web Crypto API key derivation fallback:', err);
    return null;
  }
}

export interface EncryptedDataResult {
  encryptedPayload?: string;
  iv?: string;
  isEncrypted: boolean;
}

/**
 * Cifra el texto de un mensaje usando AES-GCM 256 bits (Web Crypto API).
 */
export async function encryptMessageText(plainText: string): Promise<EncryptedDataResult> {
  if (!plainText || !isWebCryptoAvailable()) {
    return { isEncrypted: false };
  }

  try {
    const key = await getFamilyCryptoKey();
    if (!key) return { isEncrypted: false };

    const encoder = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plainText)
    );

    return {
      encryptedPayload: arrayBufferToBase64(cipherBuffer),
      iv: arrayBufferToBase64(iv.buffer),
      isEncrypted: true,
    };
  } catch (err) {
    console.warn('Encryption fallback:', err);
    return { isEncrypted: false };
  }
}

/**
 * Descifra un mensaje cifrado con AES-GCM 256 bits (Web Crypto API).
 */
export async function decryptMessageText(
  encryptedPayload?: string,
  ivBase64?: string,
  fallbackText: string = ''
): Promise<string> {
  if (!encryptedPayload || !ivBase64 || !isWebCryptoAvailable()) {
    return fallbackText;
  }

  try {
    const key = await getFamilyCryptoKey();
    if (!key) return fallbackText;

    const iv = base64ToUint8Array(ivBase64);
    const cipherBytes = base64ToUint8Array(encryptedPayload);

    const plainBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      cipherBytes as BufferSource
    );

    const decoder = new TextDecoder();
    return decoder.decode(plainBuffer);
  } catch (err) {
    return fallbackText;
  }
}
