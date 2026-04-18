import * as SecureStore from 'expo-secure-store';
import nacl from 'tweetnacl';
import { utf8Encode, utf8Decode } from 'tweetnacl-util';

// Key storage keys
const KEYPAIR_STORAGE = 'tn-keybox';

// Generate a new random key pair
export function generateKeyPair() {
  return nacl.box.keyPair();
}

// Store key pair securely
export async function storeKeyPair(keyPair: naclBoxKeyPair) {
  const combined = new Uint8Array([
    ...keyPair.publicKey,
    ...keyPair.secretKey,
  ]);
  await SecureStore.setItemAsync(KEYPAIR_STORAGE, nacl.encodeBase64(combined));
}

// Retrieve key pair from secure storage
export async function getKeyPair(): Promise<naclBoxKeyPair | null> {
  const stored = await SecureStore.getItemAsync(KEYPAIR_STORAGE);
  if (!stored) return null;
  const raw = nacl.decodeBase64(stored);
  if (raw.length !== nacl.box.publicKeyLength + nacl.box.secretKeyLength) {
    return null;
  }
  return {
    publicKey: raw.slice(0, nacl.box.publicKeyLength),
    secretKey: raw.slice(nacl.box.publicKeyLength),
  };
}

// Encrypt a message with a nonce and a shared key
export function encryptMessage(
  message: string,
  nonce: Uint8Array,
  sharedKey: Uint8Array
): { ciphertext: string; nonce: string } {
  const msgBytes = utf8Encode(message);
  const encrypted = nacl.secretbox(msgBytes, nonce, sharedKey);
  return {
    ciphertext: nacl.encodeBase64(encrypted),
    nonce: nacl.encodeBase64(nonce),
  };
}

// Decrypt a message with a nonce and a shared key
export function decryptMessage(
  ciphertext: string,
  nonce: string,
  sharedKey: Uint8Array
): string | null {
  try {
    const encrypted = nacl.decodeBase64(ciphertext);
    const n = nacl.decodeBase64(nonce);
    const decrypted = nacl.secretbox.open(encrypted, n, sharedKey);
    if (decrypted === null) return null;
    return utf8Decode(decrypted);
  } catch {
    return null;
  }
}

// Derive a shared secret from our secret key and their public key
export function sharedSecret(
  ourSecretKey: Uint8Array,
  theirPublicKey: Uint8Array
): Uint8Array {
  return nacl.before(theirPublicKey, ourSecretKey);
}

// Helper naclBoxKeyPair type
interface naclBoxKeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}
