/**
 * Base64 Utility for React Native
 * Provides base64 decode functionality (atob replacement)
 */

/**
 * Decode base64 string to regular string
 * React Native compatible replacement for atob()
 */
export function base64Decode(str: string): string {
  if (!str) {
    throw new Error('Base64 string is required');
  }

  // Handle URL-safe base64 (replace - with + and _ with /)
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  
  // Add padding if needed
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }

  // Convert base64 to binary string
  const binaryString = atobPolyfill(base64);
  return binaryString;
}

/**
 * Polyfill for atob() that works in React Native
 */
function atobPolyfill(base64: string): string {
  // Try to use native atob if available (some React Native environments have it)
  if (typeof atob !== 'undefined' && typeof atob === 'function') {
    try {
      return atob(base64);
    } catch (e) {
      // Fall through to manual implementation
    }
  }

  // Use Buffer if available (Node.js environment or polyfill)
  if (typeof Buffer !== 'undefined' && Buffer.from) {
    try {
      return Buffer.from(base64, 'base64').toString('binary');
    } catch (e) {
      // Fall through to manual implementation
    }
  }

  // Manual base64 decoding implementation
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';

  // Remove invalid characters
  base64 = base64.replace(/[^A-Za-z0-9\+\/\=]/g, '');

  for (let i = 0; i < base64.length; i += 4) {
    const enc1 = chars.indexOf(base64.charAt(i));
    const enc2 = chars.indexOf(base64.charAt(i + 1));
    const enc3 = chars.indexOf(base64.charAt(i + 2));
    const enc4 = chars.indexOf(base64.charAt(i + 3));

    if (enc1 === -1 || enc2 === -1) {
      throw new Error('Invalid base64 string');
    }

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    output += String.fromCharCode(chr1);

    if (enc3 !== 64) {
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      output += String.fromCharCode(chr2);
    }

    if (enc4 !== 64) {
      const chr3 = ((enc3 & 3) << 6) | enc4;
      output += String.fromCharCode(chr3);
    }
  }

  return output;
}

/**
 * Decode base64 and parse as JSON
 * Useful for JWT token payloads
 */
export function base64DecodeJSON<T = any>(str: string): T {
  try {
    const decoded = base64Decode(str);
    return JSON.parse(decoded) as T;
  } catch (error) {
    throw new Error(`Failed to decode base64 JSON: ${error}`);
  }
}
