import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/index.js';
import { getCacheStatus } from './cache/redisCache.js';
import { startRoundScheduler } from './jobs/roundScheduler.js';
import { rateLimit } from './middleware/rateLimit.js';
import { resolveHandler } from '../api/_handlers/registry.js';

// Resolve __dirname in ESM and load .env from the railway package root.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../');
dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(rootDir, '.env.local'), override: true });

const app = express();
// Port 5000 can be occupied by AirPlay/AirTunes on macOS.
// Use 5001 as a safer default for local dev while still honoring PORT.
const port = Number(process.env.PORT || 5001);

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
	.split(',')
	.map(s => s.trim());

app.use(cors({
	origin: (origin, callback) => {
		if (!origin || allowedOrigins.includes(origin)) {
			callback(null, true);
		} else {
			callback(null, false);
		}
	},
	credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

// Global rate limiting: 100 requests per minute per IP
app.use('/api', rateLimit({ windowMs: 60_000, max: 100 }));

app.use((_req, res, next) => {
	res.setHeader('X-Content-Type-Options', 'nosniff');
	res.setHeader('X-Frame-Options', 'DENY');
	res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
	res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	next();
});

app.get('/', (_req, res) => {
	res.json({ ok: true, service: 'awardx-api' });
});

app.get('/api/health', (_req, res) => {
	res.json({ ok: true });
});

app.use('/api', apiRoutes);

// Catch-all: delegate unmatched /api/* routes to the serverless-style handler registry.
// This covers payments, webhooks, submissions/my, notifications, etc. that live in api/_handlers/.
app.all('/api/:path(*)', async (req, res, next) => {
	const pathKey = req.params.path || 'health';
	const method = (req.method || 'GET').toUpperCase();
	const handler = resolveHandler(pathKey, method);
	if (!handler) {
		return next();
	}
	try {
		await handler(req, res);
	} catch (error: any) {
		console.error('[serverless-compat] Handler error:', error?.message || error);
		if (!res.headersSent) {
			res.status(500).json({ error: error?.message || 'Internal server error' });
		}
	}
});

app.listen(port, () => {
	const cacheStatus = getCacheStatus();
	console.log(`AwardX API listening on port ${port}`);
	if (process.env.NODE_ENV !== 'production') {
		console.log(
			`[cache] enabled=${cacheStatus.enabled} configured=${cacheStatus.configured} available=${cacheStatus.available} namespace=${cacheStatus.namespace}`,
		);
	}
	const hasServerSupabaseEnv = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
	if (hasServerSupabaseEnv) {
		// Start the round scheduler for auto-activation/completion when server DB credentials exist.
		startRoundScheduler();
	} else {
		console.log('[scheduler] Skipped: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not configured.');
	}
});
