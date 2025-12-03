export async function generateSecureHash(text: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Generates interger hash from given text.
 */
export function generateSimpleIntegerHash(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    // Bitwise operations are fast and create good distribution
    hash = (hash << 5) - hash + char;
    // Convert to a 32bit integer
    hash |= 0;
  }
  return hash;
}
