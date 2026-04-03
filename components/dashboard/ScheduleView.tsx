import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { db } from '../../services/database';
import { Round, Program } from '../../services/models';
import {
  CalendarClock, Plus, Trash2, Calendar,
  ArrowRight, CheckCircle2, Circle, MoreHorizontal, GripVertical, Edit2,
} from 'lucide-react';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { useConfirm } from '../ConfirmDialog';
import { queryKeys } from '../../services/queryKeys';

interface ScheduleViewProps {
  activeEvent: Program | null;
}

// ── Round form (shared by Create and Edit) ───────────────────────────────────
interface RoundFormProps {
  value: Partial<Round>;
  onChange: (v: Partial<Round>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
  isPending?: boolean;
}

const RoundForm: React.FC<RoundFormProps> = ({ value, onChange, onSubmit, onCancel, submitLabel, isPending }) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">Round Title</label>
      <input
        required
        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
        placeholder="e.g. Public Voting Period"
        value={value.title ?? ''}
        onChange={e => onChange({ ...value, title: e.target.value })}
      />
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Type</label>
        <select
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          value={value.type ?? 'Submission'}
          onChange={e => onChange({ ...value, type: e.target.value as Round['type'] })}
        >
          <option value="Submission">Submission</option>
          <option value="Judging">Judging</option>
          <option value="Voting">Voting</option>
          <option value="Announcement">Announcement</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
        <select
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          value={value.status ?? 'Upcoming'}
          onChange={e => onChange({ ...value, status: e.target.value as Round['status'] })}
        >
          <option value="Upcoming">Upcoming</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
        </select>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Start Date</label>
        <input
          type="date"
          required
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          value={value.startDate ?? ''}
          onChange={e => onChange({ ...value, startDate: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">End Date</label>
        <input
          type="date"
          required
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          value={value.endDate ?? ''}
          onChange={e => onChange({ ...value, endDate: e.target.value })}
        />
      </div>
    </div>

    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
      <textarea
        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
        placeholder="Internal notes about this round…"
        value={value.description ?? ''}
        onChange={e => onChange({ ...value, description: e.target.value })}
      />
    </div>

    <div className="flex justify-end gap-3 pt-4">
      <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : submitLabel}
      </Button>
    </div>
  </form>
);

// ── Sortable Round Card ───────────────────────────────────────────────────────
interface SortableRoundCardProps {
  round: Round;
  isLast: boolean;
  onEdit: (round: Round) => void;
  onDelete: (roundId: string) => void;
}

const SortableRoundCard: React.FC<SortableRoundCardProps> = ({ round, isLast, onEdit, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: round.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-700 border-green-200';
      case 'Completed': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-indigo-50 text-indigo-700 border-indigo-100';
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'Submission': return 'border-l-4 border-l-blue-500';
      case 'Judging': return 'border-l-4 border-l-purple-500';
      case 'Voting': return 'border-l-4 border-l-pink-500';
      case 'Announcement': return 'border-l-4 border-l-yellow-500';
      default: return 'border-l-4 border-l-slate-300';
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="flex gap-4 relative">
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-[27px] top-10 bottom-[-24px] w-0.5 bg-slate-200" />
      )}

      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 mt-3 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Status node */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 mt-1 ${
        round.status === 'Completed' ? 'bg-slate-200 text-slate-500' :
        round.status === 'Active' ? 'bg-green-500 text-white shadow-lg shadow-green-200' :
        'bg-white border-2 border-slate-300 text-slate-400'
      }`}>
        {round.status === 'Completed' ? <CheckCircle2 className="w-5 h-5" /> :
         round.status === 'Active' ? <div className="w-3 h-3 bg-white rounded-full animate-pulse" /> :
         <Circle className="w-5 h-5" />}
      </div>

      {/* Card */}
      <div className={`flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6 hover:shadow-md transition-all ${getTypeStyle(round.type)}`}>
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-bold text-slate-900 text-lg">{round.title}</h3>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getStatusColor(round.status)}`}>
                {round.status}
              </span>
            </div>
            {round.description && <p className="text-sm text-slate-500">{round.description}</p>}
          </div>

          {/* Edit / Delete menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-10 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1">
                <button
                  onClick={() => { onEdit(round); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => { onDelete(round.id); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-50">
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-medium">{round.startDate}</span>
            <ArrowRight className="w-3 h-3 text-slate-300" />
            <span className="font-medium">{round.endDate}</span>
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded">
            {round.type} Round
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Main ScheduleView ─────────────────────────────────────────────────────────
export const ScheduleView: React.FC<ScheduleViewProps> = ({ activeEvent }) => {
  const { confirm, ConfirmDialogNode } = useConfirm();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [newRound, setNewRound] = useState<Partial<Round>>({
    title: '', type: 'Submission', status: 'Upcoming', startDate: '', endDate: '', description: '',
  });
  const [editDraft, setEditDraft] = useState<Partial<Round>>({});

  const sensors = useSensors(useSensor(PointerSensor));

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data: rounds = [], isLoading } = useQuery({
    queryKey: queryKeys.rounds.all(activeEvent?.id ?? ''),
    queryFn: () => db.getRounds(activeEvent!.id),
    enabled: !!activeEvent?.id,
    staleTime: 5 * 60_000,
  });

  // ── Mutations ───────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (r: Omit<Round, 'id'>) => db.addRound(r),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rounds.all(activeEvent!.id) });
      toast.success('Round added');
      setIsCreateOpen(false);
      setNewRound({ title: '', type: 'Submission', status: 'Upcoming', startDate: '', endDate: '', description: '' });
    },
    onError: () => toast.error('Failed to add round'),
  });

  const updateMutation = useMutation({
    mutationFn: (r: Partial<Round> & { id: string }) => db.updateRound(r),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rounds.all(activeEvent!.id) });
      toast.success('Round updated');
      setEditingRound(null);
    },
    onError: () => toast.error('Failed to update round'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => db.deleteRound(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.rounds.all(activeEvent!.id) });
      const previous = queryClient.getQueryData<Round[]>(queryKeys.rounds.all(activeEvent!.id));
      queryClient.setQueryData<Round[]>(queryKeys.rounds.all(activeEvent!.id), old => (old ?? []).filter(r => r.id !== id));
      return { previous };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(queryKeys.rounds.all(activeEvent!.id), context?.previous);
      toast.error('Failed to delete round');
    },
    onSuccess: () => toast.success('Round deleted'),
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => db.reorderRounds(activeEvent!.id, orderedIds),
    onError: () => toast.error('Failed to save order'),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent || !newRound.title || !newRound.startDate || !newRound.endDate) return;
    createMutation.mutate({
      programId: activeEvent.id,
      title: newRound.title!,
      type: newRound.type as Round['type'],
      status: newRound.status as Round['status'],
      startDate: newRound.startDate!,
      endDate: newRound.endDate!,
      description: newRound.description,
    });
  };

  const handleEdit = (round: Round) => {
    setEditingRound(round);
    setEditDraft({ ...round });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRound) return;
    updateMutation.mutate({ id: editingRound.id, ...editDraft });
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: 'Delete round?', description: 'This cannot be undone.', confirmLabel: 'Delete' });
    if (ok) deleteMutation.mutate(id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rounds.findIndex(r => r.id === active.id);
    const newIndex = rounds.findIndex(r => r.id === over.id);
    const reordered = arrayMove(rounds, oldIndex, newIndex);
    // Optimistic local update
    queryClient.setQueryData<Round[]>(queryKeys.rounds.all(activeEvent!.id), reordered);
    reorderMutation.mutate(reordered.map(r => r.id));
  };

  if (!activeEvent) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Select a program to manage rounds.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {ConfirmDialogNode}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rounds & Schedule</h1>
          <p className="text-slate-500">Configure the timeline and phases for your event. Drag to reorder.</p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4" /> Add Round
        </Button>
      </div>

      <div className="max-w-4xl">
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : rounds.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-sm">
                <CalendarClock className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No Rounds Configured</h3>
              <p className="text-slate-500 mb-6">Start building your event timeline by adding the first round.</p>
              <Button onClick={() => setIsCreateOpen(true)}>Add First Round</Button>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={rounds.map(r => r.id)} strategy={verticalListSortingStrategy}>
                {rounds.map((round, index) => (
                  <SortableRoundCard
                    key={round.id}
                    round={round}
                    isLast={index === rounds.length - 1}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Configure New Round">
        <RoundForm
          value={newRound}
          onChange={setNewRound}
          onSubmit={handleCreate}
          onCancel={() => setIsCreateOpen(false)}
          submitLabel="Add Round"
          isPending={createMutation.isPending}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingRound} onClose={() => setEditingRound(null)} title="Edit Round">
        <RoundForm
          value={editDraft}
          onChange={setEditDraft}
          onSubmit={handleEditSubmit}
          onCancel={() => setEditingRound(null)}
          submitLabel="Save Changes"
          isPending={updateMutation.isPending}
        />
      </Modal>
    </div>
  );
};
