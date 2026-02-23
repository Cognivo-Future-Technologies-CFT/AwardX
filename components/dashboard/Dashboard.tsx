
import React, { useState, useEffect } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { EventSelectionView } from './EventSelectionView';
import { DashboardOverview } from './DashboardOverview';
import { FormBuilderView } from './FormBuilderView';
import { SubmissionTable } from './SubmissionTable';
import { JudgingView } from './JudgingView';
import { AnalyticsView } from './AnalyticsView';
import { SettingsView } from './SettingsView';
import { ReachView } from './ReachView';
import { TeamsView } from './TeamsView';
import { AuditLogsView } from './AuditLogsView';
import { CategoriesView } from './CategoriesView';
import { ScheduleView } from './ScheduleView';
import { SubmissionProcessView } from './SubmissionProcessView'; // Import new view
import { ProgramDetailsView } from './ProgramDetailsView';
import { PageBuilder } from './builder/PageBuilder';
import { ScheduleRoundsView } from './scheduleRounds/ScheduleRoundsView';
import { CustomGridView } from './CustomGridView';
import { motion, AnimatePresence } from 'framer-motion';
import { Program } from '../../services/models';
import { db as databaseService, workspaceState } from '../../services/database';
import { auth } from '../../services/supabase';

interface DashboardProps {
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [activeEvent, setActiveEvent] = useState<Program | null>(null);
  const [currentView, setCurrentView] = useState('overview');
  const [isInitializing, setIsInitializing] = useState(true);

  // Restore workspace state on init
  useEffect(() => {
    const initialize = async () => {
      try {
        await databaseService.initialize();

        // Restore persisted workspace state
        const { user } = await auth.getUser();
        if (user) {
          const { data: ws } = await workspaceState.get(user.id);
          if (ws) {
            if (ws.current_view) setCurrentView(ws.current_view);
            if (ws.active_program_id) {
              // Load the program
              const programs = await databaseService.getPrograms();
              const restored = programs.find(p => p.id === ws.active_program_id);
              if (restored) setActiveEvent(restored);
            }
          }
        }
      } catch (error) {
        console.error('Failed to initialize dashboard:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    initialize();
  }, []);

  // Persist workspace state on change
  useEffect(() => {
    databaseService.setActiveProgram(activeEvent?.id || null);

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
        // Non-critical — don't block UI
      }
    };
    persistState();
  }, [activeEvent, currentView]);

  const renderView = () => {
    switch (currentView) {
      case 'overview':
        return <DashboardOverview activeEvent={activeEvent} onNavigate={setCurrentView} />;
      case 'custom-grid':
        return <CustomGridView />;
      case 'builder':
        return activeEvent ? <PageBuilder programId={activeEvent.id} /> : null;

      case 'schedule':
        return <ScheduleView activeEvent={activeEvent} />;
      case 'schedule-rounds':
        return <ScheduleRoundsView activeEvent={activeEvent} />;
      case 'submission-setup':
        return <SubmissionProcessView activeEvent={activeEvent} />;
      case 'awards':
        return <CategoriesView activeEvent={activeEvent} />;
      case 'templates':
        return <FormBuilderView activeEvent={activeEvent} />;
      case 'submissions':
        return <SubmissionTable activeEvent={activeEvent} />;

      case 'judging':
        return <JudgingView activeEvent={activeEvent} />;
      case 'reach':
        return <ReachView />;
      case 'analytics':
        return <AnalyticsView activeEvent={activeEvent} />;
      case 'teams':
        return <TeamsView activeEvent={activeEvent} />;
      case 'logs':
        return <AuditLogsView />;
      case 'settings':
        return <SettingsView />;
      case 'program-details':
        return <ProgramDetailsView activeEvent={activeEvent} />;
      default:
        return activeEvent?.type === 'Other' ? <CustomGridView /> : <DashboardOverview activeEvent={activeEvent} />;
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
      onLogout={onLogout}
      onSwitchEvent={() => setActiveEvent(null)}
      noPadding={currentView === 'awards' || currentView === 'templates' || currentView === 'submission-setup' || currentView === 'schedule-rounds' || currentView === 'builder'}
      hideHeader={currentView === 'builder'}
    >
      <motion.div
        key={currentView}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        {renderView()}
      </motion.div>
    </DashboardLayout>
  );
};
