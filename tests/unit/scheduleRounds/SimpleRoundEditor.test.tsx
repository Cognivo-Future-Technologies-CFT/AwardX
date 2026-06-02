import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SimpleRoundEditor } from '../../../components/dashboard/scheduleRounds/SimpleRoundEditor';
import type { Round } from '../../../types/scheduleRounds';

vi.mock('../../../components/ui/AppDateFields', () => ({
  AppDateTimePicker: ({ label, value, onChange }: any) => (
    <div>
      <label>{label}</label>
      <input
        type="text"
        data-testid={`mock-datetime-${label.toLowerCase().replace(/\s+/g, '-')}`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
}));

function buildRound(id: string, name: string, order: number, type: Round['type']): Round {
  return {
    id,
    programId: 'program-1',
    name,
    type,
    evaluationLogic: type === 'Nomination' || type === 'Announce' ? 'none' : 'scoring',
    evaluatorStrategy: 'all_judges',
    blindEvaluation: false,
    startCondition: { type: 'manual_trigger' as const },
    endCondition: { type: 'manual_close' as const },
    shortlistConfig: {
      enabled: order > 0,
      method: 'percentage' as const,
      value: 50,
      visibility: ['admin' as const],
    },
    order,
    status: 'draft' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  };
}

describe('SimpleRoundEditor', () => {
  it('locks Nomination type for the first round (order === 0)', () => {
    const round = buildRound('r1', 'Nominations', 0, 'Nomination');
    render(
      <SimpleRoundEditor
        round={round}
        onSave={vi.fn()}
        onClose={vi.fn()}
        allRounds={[round]}
      />
    );

    const typeSelect = screen.getByRole('combobox');
    expect(typeSelect).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Nomination' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Shortlisting' })).not.toBeInTheDocument();
  });

  it('hides Nomination type and allows other types for non-first rounds (order > 0)', () => {
    const round = buildRound('r2', 'Jury Judging', 1, 'Shortlisting');
    render(
      <SimpleRoundEditor
        round={round}
        onSave={vi.fn()}
        onClose={vi.fn()}
        allRounds={[round]}
      />
    );

    const typeSelect = screen.getByRole('combobox');
    expect(typeSelect).not.toBeDisabled();
    expect(screen.queryByRole('option', { name: 'Nomination' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Shortlisting' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Announce' })).toBeInTheDocument();
  });

  it('shows error if saving a duplicate round name', async () => {
    const round = buildRound('r2', 'Jury Judging', 1, 'Shortlisting');
    const existingRounds = [
      buildRound('r1', 'Nominations', 0, 'Nomination'),
      round,
    ];
    const onSave = vi.fn();

    render(
      <SimpleRoundEditor
        round={round}
        onSave={onSave}
        onClose={vi.fn()}
        allRounds={existingRounds}
      />
    );

    const nameInput = screen.getByDisplayValue(round.name);
    fireEvent.change(nameInput, { target: { value: 'nominations' } }); // Match case-insensitively

    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Another round already uses this name. Choose a unique name.')).toBeInTheDocument();
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('successfully saves if a unique name is entered', async () => {
    const round = buildRound('r2', 'Jury Judging', 1, 'Shortlisting');
    const existingRounds = [
      buildRound('r1', 'Nominations', 0, 'Nomination'),
      round,
    ];
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <SimpleRoundEditor
        round={round}
        onSave={onSave}
        onClose={onClose}
        allRounds={existingRounds}
      />
    );

    const nameInput = screen.getByDisplayValue(round.name);
    fireEvent.change(nameInput, { target: { value: 'Semi Finals' } });

    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
    expect(screen.queryByText('Another round already uses this name. Choose a unique name.')).not.toBeInTheDocument();
  });
});
