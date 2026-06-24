import type { NextFunction, Request, Response } from 'express';
import { getSupabaseAdmin } from '../supabase.js';

export interface AuthenticatedRequest extends Request {
	userId?: string;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
	const authHeader = req.header('authorization') || '';
	const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

	if (!token) {
		return res.status(401).json({ error: 'Missing bearer token' });
	}

	try {
		const supabase = getSupabaseAdmin();
		const { data, error } = await supabase.auth.getUser(token);
		if (error || !data.user) {
			return res.status(401).json({ error: 'Invalid or expired token' });
		}

		req.userId = data.user.id;
		return next();
	} catch (error: any) {
		return res.status(500).json({ error: error?.message || 'Authentication failed' });
	}
}

/** Sets req.userId when a valid bearer token is present; does not reject otherwise. */
export async function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
	const authHeader = req.header('authorization') || '';
	const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

	if (token) {
		try {
			const supabase = getSupabaseAdmin();
			const { data } = await supabase.auth.getUser(token);
			if (data.user) {
				req.userId = data.user.id;
			}
		} catch {
			// Ignore — judge token or other auth may be used instead
		}
	}

	return next();
}
