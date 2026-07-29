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
    console.error('[Crypto Error] Encryption aborted: Missing payload or master password.');
    return null;
  }

  try {
    const payload = typeof text === 'string' ? text : JSON.stringify(text);
    const encrypted = CryptoJS.AES.encrypt(payload, masterPassword);
    return encrypted.toString();
  } catch (error) {
    console.error('[Crypto Error] Encryption failed:', error?.message || 'Operation error');
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
    console.error('[Crypto Error] Decryption aborted: Missing ciphertext or master password.');
    return null;
  }

  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, masterPassword);
    
    // CryptoJS may return empty or non-positive sigBytes for wrong keys without throwing
    if (!bytes || bytes.sigBytes <= 0) {
      console.error('[Crypto Error] Decryption failed: Incorrect master password or malformed data.');
      return null;
    }

    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedText) {
      console.error('[Crypto Error] Decryption failed: Unable to parse UTF-8 string output.');
      return null;
    }

    return decryptedText;
  } catch (error) {
    // Sanitized error logging without exposing sensitive inputs or raw key material
    console.error('[Crypto Error] Decryption failed safely:', error?.message || 'Invalid ciphertext or passphrase');
    return null;
  }
};
