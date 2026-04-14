type RateLimitResult = {
  ok: boolean;
  retryAfterSeconds: number;
};

type HitMap = Map<string, number[]>;

const rateLimitStore: HitMap = new Map();

// Cleanup stale rate limit entries every 60 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entries] of rateLimitStore.entries()) {
      const valid = entries.filter((ts: number) => now - ts < 15 * 60 * 1000);
      if (valid.length === 0) rateLimitStore.delete(key);
      else rateLimitStore.set(key, valid);
    }
  }, 60_000);
}

export const getClientIp = (req: any): string => {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
};

export const enforceRateLimit = (key: string, maxRequests: number, windowMs: number): RateLimitResult => {
  const now = Date.now();
  const windowStart = now - windowMs;

  const existingHits = rateLimitStore.get(key) || [];
  const freshHits = existingHits.filter((timestamp) => timestamp > windowStart);

  if (freshHits.length >= maxRequests) {
    const oldestHit = freshHits[0] || now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldestHit + windowMs - now) / 1000));
    rateLimitStore.set(key, freshHits);
    return { ok: false, retryAfterSeconds };
  }

  freshHits.push(now);
  rateLimitStore.set(key, freshHits);
  return { ok: true, retryAfterSeconds: 0 };
};
