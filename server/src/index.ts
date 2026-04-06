import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/index.js';
import { getCacheStatus } from './cache/redisCache.js';
import { startRoundScheduler } from './jobs/roundScheduler.js';

// Resolve __dirname in ESM and load .env from the project root (two levels up from server/src/)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');
// Load .env first, then .env.local as override (mirrors Vite's behaviour)
dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(rootDir, '.env.local'), override: true });

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(cors({
	origin: process.env.FRONTEND_URL || 'http://localhost:3000',
	credentials: true,
}));
app.use(express.json());

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
});
