export type ProgramFormSetupStatus =
  | 'no_forms'
  | 'no_selection'
  | 'invalid_selection'
  | 'unpublished'
  | 'ready';

export interface ProgramFormRecord {
  id: string;
  title?: string;
  is_active?: boolean;
}

export interface ProgramFormSetupState {
  status: ProgramFormSetupStatus;
  activeForm: ProgramFormRecord | null;
  message: string;
}

export function getProgramFormSetupState(
  forms: ProgramFormRecord[],
  activeFormId: string | null | undefined,
): ProgramFormSetupState {
  if (forms.length === 0) {
    return {
      status: 'no_forms',
      activeForm: null,
      message: 'Create a submission form before accepting entries.',
    };
  }

  if (!activeFormId) {
    return {
      status: 'no_selection',
      activeForm: null,
      message: 'Select which form entrants should use for submissions.',
    };
  }

  const activeForm = forms.find((form) => form.id === activeFormId) ?? null;
  if (!activeForm) {
    return {
      status: 'invalid_selection',
      activeForm: null,
      message: 'The selected form is missing. Choose another submission form.',
    };
  }

  if (!activeForm.is_active) {
    return {
      status: 'unpublished',
      activeForm,
      message: `"${activeForm.title || 'Selected form'}" must be published before the program can go live.`,
    };
  }

  return {
    status: 'ready',
    activeForm,
    message: `"${activeForm.title || 'Form'}" is ready to collect submissions.`,
  };
}

export function isProgramFormReadyForLive(
  forms: ProgramFormRecord[],
  activeFormId: string | null | undefined,
): boolean {
  return getProgramFormSetupState(forms, activeFormId).status === 'ready';
}
