const fallbackRandomUUID = (): string => {
  const bytes = new Uint8Array(16);
  const browserCrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;

  if (browserCrypto?.getRandomValues) {
    browserCrypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  // RFC 4122 version 4 and variant bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/**
 * Adds randomUUID support for browsers that expose crypto but not crypto.randomUUID.
 * Existing code can continue to use crypto.randomUUID() without branching.
 */
export const ensureRandomUUID = (): void => {
  if (typeof globalThis === 'undefined') return;
  const browserCrypto = globalThis.crypto;
  if (!browserCrypto || typeof browserCrypto.randomUUID === 'function') return;

  try {
    Object.defineProperty(browserCrypto, 'randomUUID', {
      configurable: true,
      value: fallbackRandomUUID,
    });
  } catch {
    // Some legacy browsers expose a non-extensible crypto object. Generator code
    // still receives the fallback by way of the optional global binding below.
    try {
      (browserCrypto as Crypto & { randomUUID?: () => string }).randomUUID = fallbackRandomUUID;
    } catch {
      // The explicit helper remains available to code migrated in future releases.
    }
  }
};

export const generateUUID = (): string => {
  const browserCrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  return typeof browserCrypto?.randomUUID === 'function' ? browserCrypto.randomUUID() : fallbackRandomUUID();
};

ensureRandomUUID();
