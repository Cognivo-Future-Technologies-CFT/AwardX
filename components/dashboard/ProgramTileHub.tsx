import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Tag,
  FileText, Gavel, Users, Globe, Settings,
  ChevronRight, AlertCircle, CheckCircle2, Trophy, Mail,
} from 'lucide-react';
import { Drawer } from '../Drawer';
import { Program, programStatusLabel } from '../../services/models';
import { db } from '../../services/database';
import { queryKeys } from '../../services/queryKeys';

// Lazy-loaded view components (re-used from existing dashboard views)
import { DashboardOverview } from './DashboardOverview';
import { CategoriesView } from './CategoriesView';
// ScheduleView removed — schedule/rounds temporarily hidden from tile hub
import { JudgingView } from './JudgingView';
import { TeamsView } from './TeamsView';
import { SettingsView } from './SettingsView';
import { LeaderboardView } from './LeaderboardView';
import { MassEmailView } from './MassEmailView';

interface ProgramTileHubProps {
  activeEvent: Program | null;
  onNavigate: (view: string) => void;
}

type TileId =
  | 'overview' | 'categories'
  | 'entries' | 'judging' | 'team' | 'publish' | 'settings'
  | 'leaderboard' | 'mass-email';

interface TileConfig {
  id: TileId;
  label: string;
  icon: React.ReactNode;
  description: string;
  accent: string;
  locked?: boolean;
}

// 'rounds' and 'schedule' are temporarily hidden — tile view is the primary focus
const TILES: TileConfig[] = [
  { id: 'overview',     label: 'Overview',     icon: <LayoutDashboard />, description: 'Stats, activity, and highlights',          accent: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
  { id: 'categories',   label: 'Categories',   icon: <Tag />,             description: 'Award categories and eligibility',         accent: 'bg-blue-50 text-blue-600 border-blue-100' },
  { id: 'entries',      label: 'Entries',      icon: <FileText />,        description: 'All submitted entries',                     accent: 'bg-violet-50 text-violet-600 border-violet-100' },
  { id: 'judging',      label: 'Judging',      icon: <Gavel />,           description: 'Judge panel, scoring and assignments',      accent: 'bg-purple-50 text-purple-600 border-purple-100' },
  { id: 'leaderboard',  label: 'Leaderboard',  icon: <Trophy />,          description: 'Live scores and public vote rankings',      accent: 'bg-yellow-50 text-yellow-600 border-yellow-100' },
  { id: 'team',         label: 'Team',         icon: <Users />,           description: 'Members, roles and permissions',            accent: 'bg-pink-50 text-pink-600 border-pink-100' },
  { id: 'mass-email',   label: 'Mass Email',   icon: <Mail />,            description: 'Send personalized emails to segments',      accent: 'bg-teal-50 text-teal-600 border-teal-100' },
  { id: 'publish',      label: 'Publish',      icon: <Globe />,           description: 'Control program visibility',                accent: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  { id: 'settings',     label: 'Settings',     icon: <Settings />,        description: 'Program configuration',                     accent: 'bg-slate-50 text-slate-500 border-slate-200' },
];

// ── Publish Tile Drawer Content ───────────────────────────────────────────────
type ReadinessLevel = 'ok' | 'warning' | 'error';

interface ReadinessCheck {
  id: string;
  label: string;
  level: ReadinessLevel;
  detail: string;
}

const PublishPanel: React.FC<{ program: Program; checks: ReadinessCheck[]; onClose: () => void }> = ({ program, checks, onClose }) => {
  const [saving, setSaving] = useState(false);

  const handleToggle = async (newStatus: 'Active' | 'Draft') => {
    setSaving(true);
    try {
      await db.updateProgram({ ...program, status: newStatus });
      onClose();
      // Page will refresh via React Query invalidation at the Dashboard level
    } finally {
      setSaving(false);
    }
  };

  const isPublished = program.status === 'Active';
  const blockingChecks = checks.filter(c => c.level === 'error');

  const readinessBadge = (level: ReadinessLevel) => {
    if (level === 'ok') {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" /> Ready
        </span>
      );
    }

    return (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${level === 'error' ? 'text-red-700' : 'text-amber-700'}`}>
        <AlertCircle className="w-3.5 h-3.5" /> {level === 'error' ? 'Blocking' : 'Review'}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className={`rounded-2xl p-6 border ${isPublished ? 'bg-green-50 border-green-100' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-3 h-3 rounded-full ${isPublished ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
          <span className="font-bold text-slate-900 text-lg">
            {programStatusLabel(program.status)}
          </span>
        </div>
        <p className="text-sm text-slate-500">
          {isPublished
            ? 'This program is live. Entrants can discover and submit entries.'
            : program.status === 'Completed'
              ? 'This program is closed. No new submissions are accepted.'
              : 'This program is in draft mode. Only admins can see it.'}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Publish Readiness</h3>
        <div className="space-y-2.5">
          {checks.map(check => (
            <div key={check.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">{check.label}</p>
                {readinessBadge(check.level)}
              </div>
              <p className="text-xs text-slate-500 mt-1">{check.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {isPublished ? (
          <button
            onClick={() => handleToggle('Draft')}
            disabled={saving}
            className="w-full py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Unpublish (move to Draft)'}
          </button>
        ) : program.status === 'Draft' ? (
          <button
            onClick={() => handleToggle('Active')}
            disabled={saving || blockingChecks.length > 0}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Publishing…' : blockingChecks.length > 0 ? 'Resolve blockers to publish' : 'Publish Program'}
          </button>
        ) : null}
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
        Publishing makes the entry form visible to entrants. Make sure your categories, rounds, and form are ready before going live.
      </div>
    </div>
  );
};

// ── Stat badges per tile ─────────────────────────────────────────────────────
const useTileStats = (program: Program | null) => {
  const enabled = !!program?.id;

  const { data: submissions = [] } = useQuery({
    queryKey: queryKeys.submissions.all(program?.id ?? ''),
    queryFn: () => db.getSubmissions(program!.id),
    enabled,
    staleTime: 30_000,
  });

  const { data: judges = [] } = useQuery({
    queryKey: queryKeys.judges.all(program?.id ?? ''),
    queryFn: () => db.getJudges(program!.id),
    enabled,
    staleTime: 30_000,
  });

  const { data: rounds = [] } = useQuery({
    queryKey: queryKeys.rounds.all(program?.id ?? ''),
    queryFn: () => db.getRounds(program!.id),
    enabled,
    staleTime: 5 * 60_000,
  });

  const { data: members = [] } = useQuery({
    queryKey: queryKeys.teams.members(program?.id ?? ''),
    queryFn: () => db.getTeamMembers(program!.id),
    enabled,
    staleTime: 30_000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.categories.all(program?.id ?? ''),
    queryFn: () => db.getCategories(program!.id),
    enabled,
    staleTime: 30_000,
  });

  const { data: forms = [] } = useQuery({
    queryKey: queryKeys.forms.byProgram(program?.id ?? ''),
    queryFn: () => db.getForms(program!.id),
    enabled,
    staleTime: 30_000,
  });

  return {
    entries: submissions.length,
    judges: judges.length,
    rounds: rounds.length,
    members: members.length,
    categories: categories.length,
    forms,
  };
};

// ── Main Component ────────────────────────────────────────────────────────────
export const ProgramTileHub: React.FC<ProgramTileHubProps> = ({ activeEvent, onNavigate }) => {
  const [activeTile, setActiveTile] = useState<TileId | null>(null);
  const stats = useTileStats(activeEvent);

  const readinessChecks: ReadinessCheck[] = [
    {
      id: 'categories',
      label: 'Categories configured',
      level: stats.categories > 0 ? 'ok' : 'error',
      detail: stats.categories > 0 ? `${stats.categories} categories configured.` : 'Add at least one category before publishing.',
    },
    {
      id: 'forms',
      label: 'Submission form is published',
      level: stats.forms.some((form: any) => !!form.is_active) ? 'ok' : 'error',
      detail: stats.forms.some((form: any) => !!form.is_active)
        ? 'At least one form is published and ready for entrants.'
        : 'Publish at least one form so entrants can submit.',
    },
    {
      id: 'rounds',
      label: 'Rounds and schedule',
      level: stats.rounds > 0 ? 'ok' : 'warning',
      detail: stats.rounds > 0 ? `${stats.rounds} rounds configured.` : 'No rounds found. Add at least one timeline round for clarity.',
    },
    {
      id: 'judges',
      label: 'Judges invited',
      level: stats.judges > 0 ? 'ok' : 'warning',
      detail: stats.judges > 0 ? `${stats.judges} judges invited.` : 'No judges invited yet. You can still publish and invite later.',
    },
  ];

  const statBadge = (tile: TileId): string | number | null => {
    switch (tile) {
      case 'entries':  return stats.entries || null;
      case 'judging':  return stats.judges > 0  ? `${stats.judges} judges`  : null;
      case 'team':     return stats.members > 0 ? `${stats.members} members`: null;
      case 'publish':  return activeEvent ? programStatusLabel(activeEvent.status) : null;
      default:         return null;
    }
  };

  const drawerContent = (tile: TileId) => {
    if (!activeEvent) return null;
    switch (tile) {
      case 'overview':    return <DashboardOverview activeEvent={activeEvent} onNavigate={onNavigate} />;
      case 'categories':  return <CategoriesView activeEvent={activeEvent} />;
      // 'entries' now navigates to full-page — handled in handleTileClick
      case 'judging':     return <JudgingView activeEvent={activeEvent} />;
      case 'leaderboard': return <LeaderboardView activeEvent={activeEvent} />;
      case 'team':        return <TeamsView activeEvent={activeEvent} />;
      case 'mass-email':  return <MassEmailView activeEvent={activeEvent} />;
      case 'publish':     return <PublishPanel program={activeEvent} checks={readinessChecks} onClose={() => setActiveTile(null)} />;
      case 'settings':    return <SettingsView activeEvent={activeEvent} />;
      default:            return null;
    }
  };

  const handleTileClick = (tile: TileConfig) => {
    // Full-page navigations — skip the drawer
    if (tile.id === 'entries') {
      onNavigate('submissions');
      return;
    }
    setActiveTile(tile.id);
  };

  if (!activeEvent) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Select a program from the sidebar to get started.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{activeEvent.title}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{activeEvent.description || 'Manage your award program'}</p>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
          activeEvent.status === 'Active'     ? 'bg-green-50 text-green-700 border-green-200' :
          activeEvent.status === 'Completed'  ? 'bg-slate-100 text-slate-600 border-slate-200' :
          'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          {programStatusLabel(activeEvent.status)}
        </span>
      </div>

      {/* Tile grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TILES.map(tile => {
          const badge = statBadge(tile.id);
          return (
            <button
              key={tile.id}
              onClick={() => handleTileClick(tile)}
              className="group text-left bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${tile.accent} [&>svg]:w-5 [&>svg]:h-5`}>
                  {tile.icon}
                </div>
                {badge !== null && (
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {badge}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1 group-hover:text-indigo-700 transition-colors">
                {tile.label}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">{tile.description}</p>
              <div className="mt-4 flex items-center text-xs text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Open <ChevronRight className="w-3 h-3 ml-0.5" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Drawers — entries tile navigates full-page, so it's excluded here */}
      {TILES.filter(t => t.id !== 'entries').map(tile => (
        <Drawer
          key={tile.id}
          isOpen={activeTile === tile.id}
          onClose={() => setActiveTile(null)}
          title={tile.label}
          width="max-w-[900px]"
        >
          {activeTile === tile.id ? drawerContent(tile.id) : null}
        </Drawer>
      ))}
    </div>
  );
};
