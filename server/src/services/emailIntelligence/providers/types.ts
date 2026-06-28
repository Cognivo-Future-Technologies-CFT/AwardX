import type { EmailIntelligenceResult } from '../types.js';

export interface EmailIntelligenceProvider {
  readonly id: string;
  isAvailable(): Promise<boolean>;
  enrich(email: string): Promise<EmailIntelligenceResult>;
}
