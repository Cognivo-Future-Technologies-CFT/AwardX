
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
import { db as databaseService } from '../../services/database';

interface DashboardProps {
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [activeEvent, setActiveEvent] = useState<Program | null>(null);
  const [currentView, setCurrentView] = useState('overview');
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      try {
        await databaseService.initialize();
      } catch (error) {
        console.error('Failed to initialize database:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    initialize();
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'overview':
        return <DashboardOverview activeEvent={activeEvent} />;
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
        return <JudgingView />;
      case 'reach':
        return <ReachView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'teams':
        return <TeamsView />;
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
