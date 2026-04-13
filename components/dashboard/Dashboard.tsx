
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from './DashboardLayout';
import { EventSelectionView } from './EventSelectionView';
import { DashboardOverview } from './DashboardOverview';
import { FormBuilderView } from './FormBuilderView';
import { SubmissionTable } from './SubmissionTable';
import { JudgingView } from './JudgingView';
import { SettingsView } from './SettingsView';
import { ReachView } from './ReachView';
import { TeamsView } from './TeamsView';
import { AuditLogsView } from './AuditLogsView';
import { CategoriesView } from './CategoriesView';
import { ScheduleView } from './ScheduleView';
import { SubmissionProcessView } from './SubmissionProcessView';
import { ProgramDetailsView } from './ProgramDetailsView';
import { PageBuilder } from './builder/PageBuilder';
import { CustomGridView } from './CustomGridView';
import { motion } from 'framer-motion';
import { Program } from '../../services/models';
import { db as databaseService, workspaceState } from '../../services/database';
import { auth } from '../../services/supabase';
import { ErrorBoundary } from '../ErrorBoundary';
import { PublishedLockBanner } from './PublishedLockBanner';
import { ProgramTileHub } from './ProgramTileHub';
import { VotingConfigView } from './VotingConfigView';

const ScheduleRoundsView = lazy(() =>
  import('./scheduleRounds/ScheduleRoundsView').then((m) => ({ default: m.ScheduleRoundsView })),
);
const AnalyticsView = lazy(() => import('./AnalyticsView').then((m) => ({ default: m.AnalyticsView })));

const ViewLoader: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
  </div>
);

interface DashboardProps {
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [activeEvent, setActiveEvent] = useState<Program | null>(null);
  const [currentView, setCurrentView] = useState('overview');
  const [isInitializing, setIsInitializing] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Sync URL → state on mount
  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        const initializeDashboard = async () => {
          await databaseService.initialize();

          const urlView = searchParams.get('view');
          const urlTab = searchParams.get('tab');
          const urlProgram = searchParams.get('program');

          if (!cancelled && (urlView === 'settings' || urlTab === 'billing')) {
            setCurrentView('settings');
          } else if (!cancelled && urlView) {
            setCurrentView(urlView);
          }

          const { user } = await auth.getUser();
          if (user) {
            const programs = await databaseService.getPrograms();

            // URL program param takes priority over persisted workspace
            if (urlProgram) {
              const fromUrl = programs.find(p => p.id === urlProgram);
              if (!cancelled && fromUrl) setActiveEvent(fromUrl);
            } else {
              const { data: ws } = await workspaceState.get(user.id);
              if (ws) {
                if (!cancelled && ws.current_view && !urlView) setCurrentView(ws.current_view);
                if (ws.active_program_id) {
                  const restored = programs.find(p => p.id === ws.active_program_id);
                  if (!cancelled && restored) setActiveEvent(restored);
                }
              }
            }
          }
        };

        await Promise.race([
          initializeDashboard(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Dashboard initialization timed out')), 10000),
          ),
        ]);
      } catch (error) {
        console.error('Failed to initialize dashboard:', error);
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
        }
      }
    };
    initialize();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync state → URL + persist
  useEffect(() => {
    databaseService.setActiveProgram(activeEvent?.id || null);

    // Update URL to reflect current state
    const params = new URLSearchParams();
    if (activeEvent?.id) params.set('program', activeEvent.id);
    if (currentView && currentView !== 'overview') params.set('view', currentView);
    const newSearch = params.toString();
    const currentSearch = window.location.search.replace(/^\?/, '');
    if (newSearch !== currentSearch) {
      navigate({ search: newSearch ? `?${newSearch}` : '' }, { replace: true });
    }

    const persistState = async () => {
      try {
        const { user } = await auth.getUser();
        if (user) {
          await workspaceState.save(user.id, {
            active_program_id: activeEvent?.id || null,
            current_view: currentView,
          });
        }
      } catch {
        // Non-critical
      }
    };
    persistState();
  }, [activeEvent, currentView]);

  const renderView = () => {
    switch (currentView) {
      case 'tile-hub':
        return <ProgramTileHub activeEvent={activeEvent} onNavigate={setCurrentView} />;
      case 'overview':
        return <DashboardOverview activeEvent={activeEvent} onNavigate={setCurrentView} />;
      case 'custom-grid':
        return <CustomGridView />;
      case 'builder':
        return activeEvent ? <PageBuilder programId={activeEvent.id} /> : null;

      case 'schedule':
        return <ScheduleView activeEvent={activeEvent} />;
      case 'schedule-rounds':
        return (
          <Suspense fallback={<ViewLoader />}>
            <ScheduleRoundsView activeEvent={activeEvent} />
          </Suspense>
        );

      case 'awards':
        return <CategoriesView activeEvent={activeEvent} />;
      case 'templates':
        return activeEvent?.status === 'Active'
          ? <PublishedLockBanner program={activeEvent} sectionName="Form Builder" />
          : <FormBuilderView activeEvent={activeEvent} />;
      case 'submissions':
        return <SubmissionTable activeEvent={activeEvent} />;

      case 'judging':
        return <JudgingView activeEvent={activeEvent} />;
      case 'voting':
        return <VotingConfigView activeEvent={activeEvent} />;
      case 'reach':
        return <ReachView />;
      case 'analytics':
        return (
          <Suspense fallback={<ViewLoader />}>
            <AnalyticsView activeEvent={activeEvent} />
          </Suspense>
        );
      case 'teams':
        return <TeamsView activeEvent={activeEvent} />;
      case 'logs':
        return <AuditLogsView />;
      case 'settings':
        return <SettingsView activeEvent={activeEvent} />;
      case 'program-details':
        return <ProgramDetailsView activeEvent={activeEvent} />;
      default:
        return activeEvent
          ? <ProgramTileHub activeEvent={activeEvent} onNavigate={setCurrentView} />
          : <DashboardOverview activeEvent={activeEvent} onNavigate={setCurrentView} />;
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!activeEvent) {
    return (
      <motion.div
        key="event-hub"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <EventSelectionView
          onSelectEvent={setActiveEvent}
          onLogout={onLogout}
        />
      </motion.div>
    );
  }

  return (
    <DashboardLayout
      currentView={currentView}
      activeEvent={activeEvent}
      onChangeView={setCurrentView}
      onSelectProgram={setActiveEvent}
      onLogout={onLogout}
      onSwitchEvent={() => setActiveEvent(null)}
      noPadding={currentView === 'awards' || currentView === 'templates' || currentView === 'schedule-rounds' || currentView === 'builder' || currentView === 'program-details'}
      hideHeader={currentView === 'builder'}
    >
      <motion.div
        key={currentView}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        <ErrorBoundary resetKey={`${currentView}:${activeEvent?.id || 'none'}`}>
          {renderView()}
        </ErrorBoundary>
      </motion.div>
    </DashboardLayout>
  );
};
