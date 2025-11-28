
import React, { useState } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { DashboardOverview } from './DashboardOverview';
import { TemplateGallery } from './TemplateGallery';
import { SubmissionTable } from './SubmissionTable';
import { ProgramsList } from './ProgramsList';
import { JudgingView } from './JudgingView';
import { AnalyticsView } from './AnalyticsView';
import { CRMView } from './CRMView';
import { MessagesView } from './MessagesView';
import { SettingsView } from './SettingsView';
import { ReachView } from './ReachView';
import { TeamsView } from './TeamsView';
import { AuditLogsView } from './AuditLogsView';
import { motion } from 'framer-motion';

interface DashboardProps {
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [currentView, setCurrentView] = useState('overview');

  const renderView = () => {
    switch (currentView) {
      case 'overview':
        return <DashboardOverview />;
      case 'programs':
        return <ProgramsList />;
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
        return <DashboardOverview />;
    }
  };

  return (
    <DashboardLayout 
      currentView={currentView} 
      onChangeView={setCurrentView}
      onLogout={onLogout}
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
