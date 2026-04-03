import { Program } from '../services/models';

export function useProgramGate(program: Program | null | undefined) {
  return {
    isPublished: program?.status === 'Active',
    isDraft: program?.status === 'Draft',
    isCompleted: program?.status === 'Completed',
  };
}
