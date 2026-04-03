import Redis from 'ioredis';

const REDIS_ENABLED = (process.env.REDIS_ENABLED || 'false').toLowerCase() === 'true';
const REDIS_URL = process.env.REDIS_URL || '';
const REDIS_TOKEN = process.env.REDIS_TOKEN || '';
const REDIS_USERNAME = process.env.REDIS_USERNAME || 'default';
const CACHE_NAMESPACE = process.env.REDIS_NAMESPACE || 'awardx';
const IS_DEV = process.env.NODE_ENV !== 'production';

let redisClient: Redis | null = null;
let redisAvailable = false;

const log = (message: string) => {
  if (IS_DEV) {
    console.log(`[cache] ${message}`);
  }
};

const logError = (message: string, error?: unknown) => {
  if (IS_DEV) {
    console.warn(`[cache] ${message}`, error || '');
  }
};

const isConfigured = REDIS_ENABLED && Boolean(REDIS_URL);

function namespacedKey(key: string): string {
  return `${CACHE_NAMESPACE}:${key}`;
}

function ensureClient(): Redis | null {
  if (!isConfigured) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  const client = new Redis(REDIS_URL, {
    username: REDIS_TOKEN ? REDIS_USERNAME : undefined,
    password: REDIS_TOKEN || undefined,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
  });

  client.on('ready', () => {
    redisAvailable = true;
    log('connected');
  });

  client.on('error', (error) => {
    redisAvailable = false;
    logError('connection error (continuing without cache)', error);
  });

  client.on('close', () => {
    redisAvailable = false;
    log('connection closed');
  });

  void client.connect().catch((error) => {
    redisAvailable = false;
    logError('failed to connect (continuing without cache)', error);
  });

  redisClient = client;
  return redisClient;
}

async function withClient<T>(operation: (client: Redis) => Promise<T>, fallback: T): Promise<T> {
  const client = ensureClient();
  if (!client) {
    return fallback;
  }

  try {
    if (client.status !== 'ready' && client.status !== 'connect') {
      await client.connect();
    }
    return await operation(client);
  } catch (error) {
    redisAvailable = false;
    logError('operation failed (continuing without cache)', error);
    return fallback;
  }
}

export const cacheTtls = {
  short: 60,
  medium: 300,
  long: 900,
} as const;

export const cacheKeys = {
  org: (id: string) => `org:${id}`,
  program: (id: string) => `program:${id}`,
  programStats: (id: string) => `program:${id}:stats`,
  programsByOrg: (organizationId: string) => `programs:org:${organizationId}`,
  programsAll: () => 'programs:all',
};

export async function getCache<T>(key: string): Promise<T | null> {
  return withClient(async (client) => {
    const fullKey = namespacedKey(key);
    const value = await client.get(fullKey);
    if (!value) {
      log(`MISS ${fullKey}`);
      return null;
    }

    log(`HIT ${fullKey}`);
    return JSON.parse(value) as T;
  }, null);
}

export async function setCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  await withClient(async (client) => {
    const fullKey = namespacedKey(key);
    await client.set(fullKey, JSON.stringify(value), 'EX', ttlSeconds);
    log(`SET ${fullKey} ttl=${ttlSeconds}s`);
  }, undefined);
}

export async function deleteCache(key: string): Promise<void> {
  await withClient(async (client) => {
    const fullKey = namespacedKey(key);
    await client.del(fullKey);
    log(`DEL ${fullKey}`);
  }, undefined);
}

export async function deleteCacheByPrefix(prefix: string): Promise<void> {
  await withClient(async (client) => {
    const pattern = namespacedKey(`${prefix}*`);
    let cursor = '0';
    const keysToDelete: string[] = [];

    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
      cursor = nextCursor;
      keysToDelete.push(...keys);
    } while (cursor !== '0');

    if (keysToDelete.length > 0) {
      await client.del(...keysToDelete);
      log(`DEL_PREFIX ${pattern} count=${keysToDelete.length}`);
    }
  }, undefined);
}

export async function wrapWithCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = await getCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  const fresh = await fetcher();
  if (fresh !== null && fresh !== undefined) {
    await setCache(key, fresh, ttlSeconds);
  }
  return fresh;
}

export function getCacheStatus() {
  return {
    enabled: REDIS_ENABLED,
    configured: isConfigured,
    available: redisAvailable,
    namespace: CACHE_NAMESPACE,
  };
}
