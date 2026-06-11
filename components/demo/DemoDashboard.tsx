import React, { Suspense, lazy, useLayoutEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardLayout } from '../dashboard/DashboardLayout';
import { DashboardOverview } from '../dashboard/DashboardOverview';
import { FormBuilderView } from '../dashboard/FormBuilderView';
import { SubmissionTable } from '../dashboard/SubmissionTable';
import { JudgingView } from '../dashboard/JudgingView';
import { CategoriesView } from '../dashboard/CategoriesView';
import { ProgramDetailsView } from '../dashboard/ProgramDetailsView';
import { PublishedLockBanner } from '../dashboard/PublishedLockBanner';
import { ErrorBoundary } from '../ErrorBoundary';
import { DemoProvider } from '../../contexts/DemoContext';
import { AutomatedDemoOrchestrator } from './AutomatedDemoOrchestrator';
import { DemoCursor } from './DemoCursor';
import { DemoOverlay } from './DemoOverlay';
import { enableDemoMode, disableDemoMode } from '../../services/demoMode';
import { resetDemoState, getDemoProgram } from '../../services/demoDatabase';
import type { Program } from '../../services/models';
import { readAwardsViewMode, writeAwardsViewMode, type AwardsViewMode } from '../../lib/awardsViewMode';
import {
  readScheduleRepresentation,
  writeStoredRepresentation,
  type ScheduleRepresentation,
} from '../../lib/roundRepresentationConversion';

const ScheduleRoundsView = lazy(() =>
  import('../dashboard/scheduleRounds/ScheduleRoundsView').then((m) => ({ default: m.ScheduleRoundsView })),
);

const ViewLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
  </div>
);

export const DemoDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoplay = searchParams.get('autoplay') !== '0';

  const [ready, setReady] = useState(false);
  const [activeEvent, setActiveEvent] = useState<Program | null>(null);
  const [currentView, setCurrentView] = useState('overview');
  const [awardsViewMode, setAwardsViewMode] = useState<AwardsViewMode>('workflow');
  const [scheduleRepresentation, setScheduleRepresentation] = useState<ScheduleRepresentation>('tiles');

  useLayoutEffect(() => {
    resetDemoState();
    enableDemoMode();
    const program = getDemoProgram();
    setActiveEvent(program);
    setAwardsViewMode(readAwardsViewMode(program.id));
    setScheduleRepresentation(readScheduleRepresentation(program.id));
    setReady(true);

    return () => {
      disableDemoMode();
    };
  }, []);

  useLayoutEffect(() => {
    if (!activeEvent) return;
    writeAwardsViewMode(activeEvent.id, awardsViewMode);
  }, [activeEvent?.id, awardsViewMode]);

  useLayoutEffect(() => {
    if (!activeEvent) return;
    writeStoredRepresentation(activeEvent.id, scheduleRepresentation);
  }, [activeEvent?.id, scheduleRepresentation]);

  useLayoutEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'schedule-tiles-view') {
        setScheduleRepresentation('tiles');
      } else if (detail === 'schedule-workflow-view') {
        setScheduleRepresentation('workflow');
      } else if (detail === 'awards-list-view') {
        setAwardsViewMode('list');
      } else if (detail === 'awards-workflow-view') {
        setAwardsViewMode('workflow');
      }
    };
    window.addEventListener('demo-action', handler);
    return () => window.removeEventListener('demo-action', handler);
  }, []);

  if (!ready || !activeEvent) {
    return <ViewLoader />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'overview':
        return <DashboardOverview activeEvent={activeEvent} onNavigate={setCurrentView} />;
      case 'builder':
      case 'program-details':
        return <ProgramDetailsView activeEvent={activeEvent} />;
      case 'schedule-rounds':
        return (
          <Suspense fallback={<ViewLoader />}>
            <ScheduleRoundsView
              activeEvent={activeEvent}
              representation={scheduleRepresentation}
              onRepresentationChange={setScheduleRepresentation}
            />
          </Suspense>
        );
      case 'awards':
        return (
          <CategoriesView
            activeEvent={activeEvent}
            viewMode={awardsViewMode}
            onViewModeChange={setAwardsViewMode}
          />
        );
      case 'templates':
        return activeEvent.status === 'Active'
          ? <PublishedLockBanner program={activeEvent} sectionName="Form Builder" />
          : <FormBuilderView activeEvent={activeEvent} />;
      case 'submissions':
        return <SubmissionTable activeEvent={activeEvent} onNavigate={setCurrentView} />;
      case 'judging':
        return <JudgingView activeEvent={activeEvent} />;
      default:
        return <DashboardOverview activeEvent={activeEvent} onNavigate={setCurrentView} />;
    }
  };

  const noPadding =
    currentView === 'awards' ||
    currentView === 'templates' ||
    currentView === 'schedule-rounds' ||
    currentView === 'submissions';

  return (
    <DemoProvider>
      <DashboardLayout
        currentView={currentView}
        activeEvent={activeEvent}
        onChangeView={setCurrentView}
        onSelectProgram={setActiveEvent}
        onLogout={() => navigate('/')}
        onSwitchEvent={() => navigate('/')}
        noPadding={noPadding}
        awardsViewMode={awardsViewMode}
        onAwardsViewModeChange={setAwardsViewMode}
        scheduleRepresentation={scheduleRepresentation}
        onScheduleRepresentationChange={setScheduleRepresentation}
        isDemoMode
      >
        <motion.div
          key={currentView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          <ErrorBoundary resetKey={`${currentView}:${activeEvent.id}`}>
            {renderView()}
          </ErrorBoundary>
        </motion.div>
      </DashboardLayout>

      <AutomatedDemoOrchestrator onChangeView={setCurrentView} autoplay={autoplay} />
      <DemoCursor />
      <DemoOverlay />
    </DemoProvider>
  );
};
