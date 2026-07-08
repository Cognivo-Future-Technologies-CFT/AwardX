/**
 * Round Scheduler Job
 *
 * Runs on an interval to:
 * 1. Auto-activate rounds whose start_date has passed (if prerequisites met)
 * 2. Auto-complete rounds whose end_date has passed
 * 3. Trigger auto-advancement for completed rounds with automatic trigger
 *
 * Non-blocking: failures are logged but don't crash the server.
 */

import { getSupabaseAdmin } from '../supabase.js';
import { activateRound, completeRound } from '../services/roundEngine.js';
import { executeAdvancement } from '../services/advancementEngine.js';
import { deleteCache } from '../cache/redisCache.js';

const SCHEDULER_INTERVAL_MS = 60_000; // 1 minute
let schedulerTimer: ReturnType<typeof setInterval> | null = null;

async function tick() {
  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    // 1. Auto-activate rounds past start_date
    const { data: toActivate } = await supabase
      .from('rounds')
      .select('id, program_id, title')
      .in('status', ['scheduled', 'upcoming'])
      .lte('start_date', now);

    for (const round of (toActivate || [])) {
      const result = await activateRound(round.id, 'scheduler_auto');
      if (result.ok) {
        console.log(`[scheduler] Auto-activated round: ${round.title} (${round.id})`);
        await deleteCache(`program:${round.program_id}:rounds`);
        await deleteCache(`program:${round.program_id}:pipeline-status`);
      }
      // If activation fails (e.g., prerequisites not met), silently skip — will retry next tick
    }

    // 2. Auto-complete rounds past end_date
    const { data: toComplete } = await supabase
      .from('rounds')
      .select('id, program_id, title')
      .eq('status', 'active')
      .lte('end_date', now);

    for (const round of (toComplete || [])) {
      const result = await completeRound(round.id, 'scheduler_auto');
      if (result.ok) {
        console.log(`[scheduler] Auto-completed round: ${round.title} (${round.id})`);
        await deleteCache(`program:${round.program_id}:rounds`);
        await deleteCache(`program:${round.program_id}:pipeline-status`);
      }
    }

    // 3. Auto-advancement for completed rounds with automatic trigger
    const { data: toAdvance } = await supabase
      .from('rounds')
      .select('id, program_id, title, advancement_criteria, advancement_trigger')
      .eq('status', 'completed')
      .eq('is_finalized', false)
      .eq('advancement_trigger', 'automatic');

    for (const round of (toAdvance || [])) {
      const result = await executeAdvancement(round.id, undefined, 'scheduler_auto');
      if (result.ok) {
        console.log(`[scheduler] Auto-advanced round: ${round.title} (${round.id}), event=${result.eventId}`);
        await deleteCache(`program:${round.program_id}:rounds`);
        await deleteCache(`program:${round.program_id}:pipeline-status`);
        await deleteCache(`program:${round.program_id}:advancement-history`);
      } else if (result.paused) {
        console.log(`[scheduler] Auto-advancement paused for ${round.title} (${round.id}): ${result.reason || result.error}`);
      } else {
        console.warn(`[scheduler] Auto-advancement failed for ${round.title} (${round.id}): ${result.error || 'unknown error'}`);
      }
    }
  } catch (error) {
    console.error('[scheduler] Error in round scheduler tick:', error);
  }
}

export function startRoundScheduler() {
  if (schedulerTimer) return; // Already running
  console.log('[scheduler] Starting round scheduler (interval: 60s)');
  // Run immediately on startup, then on interval
  void tick();
  schedulerTimer = setInterval(tick, SCHEDULER_INTERVAL_MS);
}

export function stopRoundScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log('[scheduler] Round scheduler stopped');
  }
}
