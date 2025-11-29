
import React, { useState } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { EventSelectionView } from './EventSelectionView';
import { DashboardOverview } from './DashboardOverview';
import { TemplateGallery } from './TemplateGallery';
import { SubmissionTable } from './SubmissionTable';
import { JudgingView } from './JudgingView';
import { AnalyticsView } from './AnalyticsView';
import { CRMView } from './CRMView';
import { MessagesView } from './MessagesView';
import { SettingsView } from './SettingsView';
import { ReachView } from './ReachView';
import { TeamsView } from './TeamsView';
import { AuditLogsView } from './AuditLogsView';
import { CategoriesView } from './CategoriesView';
import { ScheduleView } from './ScheduleView';
import { SubmissionProcessView } from './SubmissionProcessView'; // Import new view
import { motion, AnimatePresence } from 'framer-motion';
import { Program } from '../../services/demoDb';

interface DashboardProps {
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [activeEvent, setActiveEvent] = useState<Program | null>(null);
  const [currentView, setCurrentView] = useState('overview');

  const renderView = () => {
    switch (currentView) {
      case 'overview':
        return <DashboardOverview activeEvent={activeEvent} />;
      case 'schedule':
        return <ScheduleView activeEvent={activeEvent} />;
      case 'submission-setup':
        return <SubmissionProcessView activeEvent={activeEvent} />;
      case 'awards':
        return <CategoriesView activeEvent={activeEvent} />;
      case 'templates':
        return <TemplateGallery />;
      case 'submissions':
        return <SubmissionTable />;
      case 'judging':
        return <JudgingView />;
      case 'reach':
        return <ReachView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'users':
        return <CRMView />;
      case 'teams':
        return <TeamsView />;
      case 'messages':
        return <MessagesView />;
      case 'logs':
        return <AuditLogsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardOverview activeEvent={activeEvent} />;
    }
  };

  if (!activeEvent) {
    return (
      <motion.div
        key="event-hub"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <EventSelectionView onSelectEvent={setActiveEvent} onLogout={onLogout} />
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
    >
      <motion.div
        key={currentView}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {renderView()}
      </motion.div>
    </DashboardLayout>
  );
};
