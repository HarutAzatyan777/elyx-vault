import CryptoJS from 'crypto-js';

/**
 * Encrypts plaintext data using AES encryption with a master password.
 *
 * @param {string} text - The plaintext payload to encrypt.
 * @param {string} masterPassword - The master password used for key derivation and encryption.
 * @returns {string|null} The encrypted ciphertext string, or null if encryption fails.
 */
export const encryptData = (text, masterPassword) => {
  if (text === undefined || text === null || !masterPassword) {
    console.error(
      '[Crypto Error] Encryption aborted: Missing payload or master password.',
    );
    return null;
  }

  try {
    const payload = typeof text === 'string' ? text : JSON.stringify(text);
    const encrypted = CryptoJS.AES.encrypt(payload, masterPassword);
    return encrypted.toString();
  } catch (error) {
    console.error(
      '[Crypto Error] Encryption failed:',
      error?.message || 'Operation error',
    );
    return null;
  }
};

/**
 * Decrypts AES-encrypted ciphertext using a master password.
 *
 * @param {string} ciphertext - The AES ciphertext string to decrypt.
 * @param {string} masterPassword - The master password used to attempt decryption.
 * @returns {string|null} The decrypted plaintext string, or null if decryption fails (e.g., incorrect password or corrupted data).
 */
export const decryptData = (ciphertext, masterPassword) => {
  if (!ciphertext || !masterPassword) {
    return null;
  }

  try {
    // Validate legacy PKCS#7 padding explicitly. CryptoJS's default unpad silently
    // accepts invalid padding and treats valid empty plaintext as a failed decode.
    const bytes = CryptoJS.AES.decrypt(ciphertext, masterPassword, {
      padding: CryptoJS.pad.NoPadding,
    });
    if (!bytes || bytes.sigBytes <= 0 || bytes.sigBytes % 16 !== 0) return null;
    const byteAt = (index) =>
      (bytes.words[index >>> 2] >>> (24 - (index % 4) * 8)) & 255;
    const padding = byteAt(bytes.sigBytes - 1);
    if (padding < 1 || padding > 16 || padding > bytes.sigBytes) return null;
    for (let index = bytes.sigBytes - padding; index < bytes.sigBytes; index++)
      if (byteAt(index) !== padding) return null;
    bytes.sigBytes -= padding;
    bytes.clamp();
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    return null;
  }
};
