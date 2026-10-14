import { encryptData, decryptData } from './crypto.js';
export function encryptRequired(plaintext, password) {
  const ciphertext = encryptData(plaintext, password);
  if (!ciphertext) throw new Error('Encryption failed. Nothing was saved.');
  return ciphertext;
}
export const isLegacyCiphertext = (value) =>
  typeof value === 'string' && value.startsWith('U2FsdGVkX1');
export function decryptRequired(ciphertext, password) {
  if (!password) throw new Error('Unlock the vault first.');
  const plaintext = decryptData(ciphertext, password);
  if (plaintext === null)
    throw new Error('Unable to decrypt. Check your vault password.');
  return plaintext;
}
// Existing plaintext binary caches for encrypted records are deliberately not used.
export async function resolveAudioSource(track, password, loadBlob) {
  if (track.isEncrypted) {
    if (!password) throw new Error('Unlock the vault first.');
    const cached = track._encryptedLocalPayload
      ? await loadBlob(track.id)
      : null;
    return decryptRequired(
      isLegacyCiphertext(cached) ? cached : track.url,
      password,
    );
  }
  return (await loadBlob(track.id)) || track.url;
}
