/**
 * @deprecated Use emailIntelligence/EmailIntelligenceService instead.
 * Kept as a thin compatibility shim for any legacy imports.
 */
export {
  collectEmailIntelligence as lookupEmail,
} from '../emailIntelligence/EmailIntelligenceService.js';

export type {
  EmailIntelligenceResult as EmailLookupBundle,
  FootprintCandidate as EmailLookupResult,
} from '../emailIntelligence/types.js';
