
import React, { useState, useEffect } from 'react';
import { db, Round, Program } from '../../services/demoDb';
import { 
  CalendarClock, Plus, Edit2, Trash2, Calendar, 
  ArrowRight, CheckCircle2, Circle, MoreHorizontal 
} from 'lucide-react';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { motion } from 'framer-motion';

interface ScheduleViewProps {
  activeEvent: Program | null;
}

interface RoundCardProps {
  round: Round;
  isLast: boolean;
}

const RoundCard: React.FC<RoundCardProps> = ({ round, isLast }) => {
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
    <div className="flex gap-6 relative">
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-[15px] top-10 bottom-[-24px] w-0.5 bg-slate-200"></div>
      )}

      {/* Node */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
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
            <p className="text-sm text-slate-500">{round.description}</p>
          </div>
          <button className="text-slate-400 hover:text-slate-600 p-1">
            <MoreHorizontal className="w-5 h-5" />
          </button>
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

export const ScheduleView: React.FC<ScheduleViewProps> = ({ activeEvent }) => {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRound, setNewRound] = useState<Partial<Round>>({
    title: '',
    type: 'Submission',
    status: 'Upcoming',
    startDate: '',
    endDate: '',
    description: ''
  });

  useEffect(() => {
    if (activeEvent) {
      setRounds(db.getRounds(activeEvent.id));
    }
  }, [activeEvent]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent || !newRound.title || !newRound.startDate) return;

    db.addRound({
      programId: activeEvent.id,
      title: newRound.title!,
      type: newRound.type as any,
      status: newRound.status as any,
      startDate: newRound.startDate!,
      endDate: newRound.endDate!,
      description: newRound.description
    });

    setRounds(db.getRounds(activeEvent.id));
    setIsModalOpen(false);
    setNewRound({ title: '', type: 'Submission', status: 'Upcoming', startDate: '', endDate: '', description: '' });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rounds & Schedule</h1>
          <p className="text-slate-500">Configure the timeline and phases for your event.</p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" /> Add Round
        </Button>
      </div>

      <div className="max-w-4xl">
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8">
          {rounds.map((round, index) => (
            <RoundCard 
              key={round.id} 
              round={round} 
              isLast={index === rounds.length - 1} 
            />
          ))}
          
          {rounds.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-sm">
                <CalendarClock className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No Rounds Configured</h3>
              <p className="text-slate-500 mb-6">Start building your event timeline by adding the first round.</p>
              <Button onClick={() => setIsModalOpen(true)}>Add First Round</Button>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Configure New Round">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Round Title</label>
            <input 
              required
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="e.g. Public Voting Period"
              value={newRound.title}
              onChange={e => setNewRound({...newRound, title: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Type</label>
              <select 
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={newRound.type}
                onChange={e => setNewRound({...newRound, type: e.target.value as any})}
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
                value={newRound.status}
                onChange={e => setNewRound({...newRound, status: e.target.value as any})}
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
                value={newRound.startDate}
                onChange={e => setNewRound({...newRound, startDate: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">End Date</label>
              <input 
                type="date"
                required
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={newRound.endDate}
                onChange={e => setNewRound({...newRound, endDate: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
            <textarea 
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
              placeholder="Internal notes about this round..."
              value={newRound.description}
              onChange={e => setNewRound({...newRound, description: e.target.value})}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Add Round</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
