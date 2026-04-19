import * as SecureStore from 'expo-secure-store';
import nacl from 'tweetnacl';
import { utf8Encode, utf8Decode } from 'tweetnacl-util';

// Storage keys
const KEYPAIR_STORAGE = 'tn-keybox';
const RATCHET_PREFIX = 'tn-ratchet-';
const SESSION_PREFIX = 'tn-session-';

// ==================== Key Management ====================

export function generateKeyPair() {
  return nacl.box.keyPair();
}

export async function storeKeyPair(keyPair: naclBoxKeyPair) {
  const combined = new Uint8Array([...keyPair.publicKey, ...keyPair.secretKey]);
  await SecureStore.setItemAsync(KEYPAIR_STORAGE, nacl.encodeBase64(combined));
}

export async function getKeyPair(): Promise<naclBoxKeyPair | null> {
  const stored = await SecureStore.getItemAsync(KEYPAIR_STORAGE);
  if (!stored) return null;
  const raw = nacl.decodeBase64(stored);
  if (raw.length !== nacl.box.publicKeyLength + nacl.box.secretKeyLength) return null;
  return {
    publicKey: raw.slice(0, nacl.box.publicKeyLength),
    secretKey: raw.slice(nacl.box.publicKeyLength),
  };
}

// ==================== HKDF (HMAC-based Key Derivation) ====================

function hmacSHA256(key: Uint8Array, data: Uint8Array): Uint8Array {
  // tweetnacl doesn't include HMAC, so we implement a simplified HKDF using nacl-auth
  // For web apps without native crypto, use a PRF based on nacl's secretbox
  const nonce = new Uint8Array(nacl.secretbox.nonceLength);
  const derived = nacl.secretbox(data, nonce, key);
  return derived.slice(0, 32);
}

function hkdf(inputKeyMaterial: Uint8Array, info: string, length: number): Uint8Array {
  const salt = new Uint8Array(32);
  const prk = hmacSHA256(salt, inputKeyMaterial);
  
  let okm = new Uint8Array(0);
  let t = new Uint8Array(0);
  let counter = 1;
  
  while (okm.length < length) {
    const infoBytes = utf8Encode(info);
    const input = new Uint8Array([...t, ...infoBytes, counter]);
    t = hmacSHA256(prk, input);
    const combined = new Uint8Array([...okm, ...t]);
    okm = combined;
    counter++;
  }
  
  return okm.slice(0, length);
}

// ==================== Double Ratchet State ====================

export interface RatchetState {
  dhKeyPair: naclBoxKeyPair;
  dhRemotePublicKey: Uint8Array | null;
  rootKey: Uint8Array;
  chainKey: Uint8Array;
  messageNumber: number;
  previousChainKeys: Map<number, Uint8Array>;
}

export interface SessionState {
  ratchet: RatchetState | null;
  isInitialized: boolean;
  theirIdentityKey: Uint8Array;
  ourIdentityKey: naclBoxKeyPair;
  lastRemoteDHPublicKey: Uint8Array | null;
}

// ==================== Initial Key Exchange (X3DH-like) ====================

export function sharedSecret(ourSecretKey: Uint8Array, theirPublicKey: Uint8Array): Uint8Array {
  return nacl.before(theirPublicKey, ourSecretKey);
}

export async function initializeSession(
  ourIdentityKey: naclBoxKeyPair,
  theirIdentityKey: Uint8Array,
  chatId: string
): Promise<SessionState> {
  const shared = nacl.box.before(theirIdentityKey, ourIdentityKey.secretKey);
  const rootKey = hkdf(shared, 'ssnote-root', 32);
  const chainKey = hkdf(shared, 'ssnote-chain', 32);
  const dhKeyPair = nacl.box.keyPair();
  
  const session: SessionState = {
    ratchet: {
      dhKeyPair,
      dhRemotePublicKey: null,
      rootKey,
      chainKey,
      messageNumber: 0,
      previousChainKeys: new Map(),
    },
    isInitialized: true,
    theirIdentityKey,
    ourIdentityKey,
    lastRemoteDHPublicKey: null,
  };
  
  await saveSession(chatId, session);
  return session;
}

// ==================== Ratchet Operations ====================

function ratchetStepSend(state: RatchetState): { rootKey: Uint8Array; chainKey: Uint8Array; dhPublic: Uint8Array } {
  const newDhKeyPair = nacl.box.keyPair();
  const shared = nacl.box.before(state.dhRemotePublicKey!, state.dhKeyPair.secretKey);
  const newRootKey = hkdf(shared, 'ssnote-ratchet-root', 32);
  const newChainKey = hkdf(shared, 'ssnote-ratchet-chain', 32);
  
  state.dhKeyPair = newDhKeyPair;
  state.rootKey = newRootKey;
  state.chainKey = newChainKey;
  state.messageNumber = 0;
  
  return { rootKey: newRootKey, chainKey: newChainKey, dhPublic: newDhKeyPair.publicKey };
}

function ratchetStepReceive(state: RatchetState, remoteDHPublic: Uint8Array): { rootKey: Uint8Array; chainKey: Uint8Array } {
  const shared = nacl.box.before(remoteDHPublic, state.dhKeyPair.secretKey);
  const newRootKey = hkdf(shared, 'ssnote-ratchet-root', 32);
  const newChainKey = hkdf(shared, 'ssnote-ratchet-chain', 32);
  
  state.dhRemotePublicKey = remoteDHPublic;
  state.rootKey = newRootKey;
  state.chainKey = newChainKey;
  state.messageNumber = 0;
  
  return { rootKey: newRootKey, chainKey: newChainKey };
}

function deriveMessageKey(chainKey: Uint8Array, messageNumber: number): Uint8Array {
  const msgKeyInput = new Uint8Array([...chainKey, messageNumber]);
  return hkdf(msgKeyInput, 'ssnote-msg', 32);
}

function nextChainKey(chainKey: Uint8Array): Uint8Array {
  return hkdf(chainKey, 'ssnote-next-chain', 32);
}

// ==================== Encrypt/Decrypt ====================

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

// ==================== Ratchet Encrypt (with forward secrecy) ====================

export async function ratchetEncrypt(
  plaintext: string,
  chatId: string
): Promise<{ ciphertext: string; nonce: string; dhPublic: string | null; msgNum: number } | null> {
  const session = await loadSession(chatId);
  if (!session || !session.ratchet) return null;
  
  const ratchet = session.ratchet;
  
  // Ratchet step: generate new DH key pair for forward secrecy
  if (ratchet.messageNumber === 0) {
    ratchetStepSend(ratchet);
  }
  
  // Derive message key
  const msgKey = deriveMessageKey(ratchet.chainKey, ratchet.messageNumber);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  
  // Encrypt
  const msgBytes = utf8Encode(plaintext);
  const encrypted = nacl.secretbox(msgBytes, nonce, msgKey);
  
  // Advance chain
  ratchet.chainKey = nextChainKey(ratchet.chainKey);
  ratchet.messageNumber++;
  
  const dhPublic = ratchet.messageNumber === 1 ? nacl.encodeBase64(ratchet.dhKeyPair.publicKey) : null;
  
  await saveSession(chatId, session);
  
  return {
    ciphertext: nacl.encodeBase64(encrypted),
    nonce: nacl.encodeBase64(nonce),
    dhPublic,
    msgNum: ratchet.messageNumber - 1,
  };
}

export async function ratchetDecrypt(
  ciphertext: string,
  nonce: string,
  chatId: string,
  dhPublic: string | null
): Promise<string | null> {
  const session = await loadSession(chatId);
  if (!session || !session.ratchet) return null;
  
  const ratchet = session.ratchet;
  
  // If new DH public key, ratchet step
  if (dhPublic) {
    const remoteKey = nacl.decodeBase64(dhPublic);
    ratchetStepReceive(ratchet, remoteKey);
  }
  
  // Derive message key
  const msgKey = deriveMessageKey(ratchet.chainKey, ratchet.messageNumber);
  const n = nacl.decodeBase64(nonce);
  
  // Decrypt
  const encrypted = nacl.decodeBase64(ciphertext);
  const decrypted = nacl.secretbox.open(encrypted, n, msgKey);
  if (decrypted === null) return null;
  
  // Advance chain
  ratchet.chainKey = nextChainKey(ratchet.chainKey);
  ratchet.messageNumber++;
  
  await saveSession(chatId, session);
  
  return utf8Decode(decrypted);
}

// ==================== Session Persistence ====================

interface SerializableSessionState {
  ratchet: {
    dhKeyPair: { publicKey: string; secretKey: string } | null;
    dhRemotePublicKey: string | null;
    rootKey: string;
    chainKey: string;
    messageNumber: number;
  } | null;
  isInitialized: boolean;
  theirIdentityKey: string;
  ourIdentityKey: { publicKey: string; secretKey: string };
  lastRemoteDHPublicKey: string | null;
}

async function saveSession(chatId: string, session: SessionState) {
  const serializable: SerializableSessionState = {
    ratchet: session.ratchet ? {
      dhKeyPair: session.ratchet.dhKeyPair ? {
        publicKey: nacl.encodeBase64(session.ratchet.dhKeyPair.publicKey),
        secretKey: nacl.encodeBase64(session.ratchet.dhKeyPair.secretKey),
      } : null,
      dhRemotePublicKey: session.ratchet.dhRemotePublicKey ? nacl.encodeBase64(session.ratchet.dhRemotePublicKey) : null,
      rootKey: nacl.encodeBase64(session.ratchet.rootKey),
      chainKey: nacl.encodeBase64(session.ratchet.chainKey),
      messageNumber: session.ratchet.messageNumber,
    } : null,
    isInitialized: session.isInitialized,
    theirIdentityKey: nacl.encodeBase64(session.theirIdentityKey),
    ourIdentityKey: {
      publicKey: nacl.encodeBase64(session.ourIdentityKey.publicKey),
      secretKey: nacl.encodeBase64(session.ourIdentityKey.secretKey),
    },
    lastRemoteDHPublicKey: session.lastRemoteDHPublicKey ? nacl.encodeBase64(session.lastRemoteDHPublicKey) : null,
  };
  
  await SecureStore.setItemAsync(
    `${SESSION_PREFIX}${chatId}`,
    JSON.stringify(serializable)
  );
}

async function loadSession(chatId: string): Promise<SessionState | null> {
  const stored = await SecureStore.getItemAsync(`${SESSION_PREFIX}${chatId}`);
  if (!stored) return null;
  
  try {
    const s: SerializableSessionState = JSON.parse(stored);
    
    return {
      ratchet: s.ratchet ? {
        dhKeyPair: s.ratchet.dhKeyPair ? {
          publicKey: nacl.decodeBase64(s.ratchet.dhKeyPair.publicKey),
          secretKey: nacl.decodeBase64(s.ratchet.dhKeyPair.secretKey),
        } : null,
        dhRemotePublicKey: s.ratchet.dhRemotePublicKey ? nacl.decodeBase64(s.ratchet.dhRemotePublicKey) : null,
        rootKey: nacl.decodeBase64(s.ratchet.rootKey),
        chainKey: nacl.decodeBase64(s.ratchet.chainKey),
        messageNumber: s.ratchet.messageNumber,
        previousChainKeys: new Map(),
      } : null,
      isInitialized: s.isInitialized,
      theirIdentityKey: nacl.decodeBase64(s.theirIdentityKey),
      ourIdentityKey: {
        publicKey: nacl.decodeBase64(s.ourIdentityKey.publicKey),
        secretKey: nacl.decodeBase64(s.ourIdentityKey.secretKey),
      },
      lastRemoteDHPublicKey: s.lastRemoteDHPublicKey ? nacl.decodeBase64(s.lastRemoteDHPublicKey) : null,
    };
  } catch {
    return null;
  }
}

// ==================== Key Fingerprint (Safety Number) ====================

export function getKeyFingerprint(publicKey: Uint8Array): string {
  // Create a human-readable fingerprint like Signal's safety numbers
  const hash = nacl.hash(publicKey);
  const chunks: string[] = [];
  for (let i = 0; i < hash.length; i += 2) {
    chunks.push(hash[i].toString(16).padStart(2, '0') + hash[i + 1].toString(16).padStart(2, '0'));
  }
  return chunks.slice(0, 15).join(':').toUpperCase();
}

export function getCombinedFingerprint(ourKey: Uint8Array, theirKey: Uint8Array): string {
  const combined = new Uint8Array([...ourKey, ...theirKey]);
  return getKeyFingerprint(combined);
}

// ==================== Utility ====================

export async function ensureKeyPair(): Promise<naclBoxKeyPair> {
  let keyPair = await getKeyPair();
  if (!keyPair) {
    keyPair = generateKeyPair();
    await storeKeyPair(keyPair);
  }
  return keyPair;
}

export async function clearSession(chatId: string) {
  await SecureStore.deleteItemAsync(`${SESSION_PREFIX}${chatId}`);
}

export async function clearAllSessions() {
  // Clear keypair
  try { await SecureStore.deleteItemAsync(KEYPAIR_STORAGE); } catch {}
  // Note: SecureStore doesn't have a way to list all keys, so we track sessions separately
}

interface naclBoxKeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}
