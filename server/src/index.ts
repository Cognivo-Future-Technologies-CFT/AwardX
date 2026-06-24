import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/index.js';
import { getCacheStatus } from './cache/redisCache.js';
import { startRoundScheduler } from './jobs/roundScheduler.js';
import { rateLimit } from './middleware/rateLimit.js';

// Resolve __dirname in ESM and load .env from the project root (two levels up from server/src/)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');
// Load .env first, then .env.local as override (mirrors Vite's behaviour)
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
app.use(express.json());

// Global rate limiting: 100 requests per minute per IP
app.use('/api', rateLimit({ windowMs: 60_000, max: 100 }));

app.use((_req, res, next) => {
	res.setHeader('X-Content-Type-Options', 'nosniff');
	res.setHeader('X-Frame-Options', 'DENY');
	res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
	res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	next();
});

app.get('/api/health', (_req, res) => {
	res.json({ ok: true });
});

app.use('/api', apiRoutes);

app.listen(port, () => {
	const cacheStatus = getCacheStatus();
	console.log(`Invite server listening on port ${port}`);
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

	// Pre-warm embedding model in background
	if (hasServerSupabaseEnv) {
		import('./services/submissionEmbedder.js').then(() => {}).catch(() => {});
		import('./services/aiDetector.js').then((m) => m.prewarmAIDetector()).catch(() => {});
	}
});
