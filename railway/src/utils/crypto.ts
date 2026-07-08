import crypto from 'crypto';

// The key should be exactly 32 bytes (256 bits) for aes-256-gcm
// We use a fallback for development if not provided, but in production this MUST be set securely!
const ENCRYPTION_KEY = process.env.API_ENCRYPTION_KEY || 'default_dev_key_must_be_32_bytes_';
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts a plain text string securely using AES-256-GCM.
 * Returns a combined string of IV + Auth Tag + Encrypted Text.
 */
export function encryptValue(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '_').slice(0, 32));
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a previously encrypted string.
 */
export function decryptValue(encryptedString: string): string {
  try {
    const parts = encryptedString.split(':');
    if (parts.length !== 3) throw new Error('Invalid encrypted format');
    
    const [ivHex, authTagHex, encryptedHex] = parts;
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '_').slice(0, 32));
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return '';
  }
}
