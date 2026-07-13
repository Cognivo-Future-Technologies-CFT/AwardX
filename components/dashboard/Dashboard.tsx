
import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { DashboardLayout } from './DashboardLayout';
import { EventSelectionView } from './EventSelectionView';
import { OrganizationSelectionView } from './OrganizationSelectionView';
import { DashboardOverview } from './DashboardOverview';
import { FormBuilderView } from './FormBuilderView';
import { SubmissionTable } from './SubmissionTable';
import { JudgingView } from './JudgingView';
import { JudgeCategoryMappingView } from './JudgeCategoryMappingView';
import { SettingsView } from './SettingsView';
import { TeamsView } from './TeamsView';
import { AuditLogsView } from './AuditLogsView';
import { CategoriesView } from './CategoriesView';
import { ScheduleView } from './ScheduleView';
import { SubmissionProcessView } from './SubmissionProcessView';
import { ProgramDetailsView } from './ProgramDetailsView';

import { motion } from 'framer-motion';
import { Program, Organization } from '../../services/models';
import { db as databaseService, workspaceState } from '../../services/database';
import { resolveAllowedDashboardView } from '../../lib/dashboardViews';
import {
  buildDashboardPath,
  legacyDashboardQueryToPath,
  parseDashboardPath,
} from '../../lib/dashboardRoutes';
import { ErrorBoundary } from '../ErrorBoundary';
import { PublishedLockBanner } from './PublishedLockBanner';
import { ProgramTileHub } from './ProgramTileHub';
import { readAwardsViewMode, writeAwardsViewMode, type AwardsViewMode } from '../../lib/awardsViewMode';
import {
  readScheduleRepresentation,
  writeStoredRepresentation,
  type ScheduleRepresentation,
} from '../../lib/roundRepresentationConversion';

const ScheduleRoundsView = lazy(() =>
  import('./scheduleRounds/ScheduleRoundsView').then((m) => ({ default: m.ScheduleRoundsView })),
);
const AnalyticsView = lazy(() => import('./AnalyticsView').then((m) => ({ default: m.AnalyticsView })));
const BroadcastsView = lazy(() => import('./BroadcastsView').then((m) => ({ default: m.BroadcastsView })));
const CertificatesView = lazy(() => import('./CertificatesView').then((m) => ({ default: m.CertificatesView })));
const AttendanceView = lazy(() => import('./AttendanceView').then((m) => ({ default: m.AttendanceView })));
const SubscriptionView = lazy(() => import('../../features/subscription/pages/SubscriptionPage').then((m) => ({ default: m.SubscriptionPage })));

const ViewLoader: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
  </div>
);

interface DashboardProps {
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);
  const [activeEvent, setActiveEvent] = useState<Program | null>(null);
  const [currentView, setCurrentView] = useState('overview');
  const [awardsViewMode, setAwardsViewMode] = useState<AwardsViewMode>('workflow');
  const [scheduleRepresentation, setScheduleRepresentation] = useState<ScheduleRepresentation>('tiles');
  const [isInitializing, setIsInitializing] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const persistTimerRef = useRef<number | null>(null);
  const lastPersistKeyRef = useRef<string>('');

  const handleChangeView = useCallback((view: string, options?: { settingsTab?: string }) => {
    const allowed = resolveAllowedDashboardView(view, (p) => databaseService.hasPermission(p));
    setCurrentView(allowed);
    if (activeEvent?.id) {
      navigate(
        buildDashboardPath({
          eventId: activeEvent.id,
          view: allowed,
          settingsTab: allowed === 'settings' ? options?.settingsTab : null,
        }),
      );
    }
  }, [activeEvent?.id, navigate]);

  const handleSelectEvent = useCallback((event: Program) => {
    setActiveEvent(event);
    navigate(buildDashboardPath({ eventId: event.id, view: 'overview' }));
  }, [navigate]);

  const handleSwitchEvent = useCallback(() => {
    setActiveEvent(null);
    navigate('/dashboard');
  }, [navigate]);

  const handleDeleteEvent = useCallback(() => {
    setActiveEvent(null);
    navigate('/dashboard');
  }, [navigate]);

  const handleSwitchOrganization = useCallback(async () => {
    setActiveEvent(null);
    setActiveOrganization(null);
    await databaseService.setActiveOrganization(null);
    navigate('/dashboard');
  }, [navigate]);

  // Sync URL → state once auth is ready
  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    let cancelled = false;

    const initialize = async () => {
      try {
        const initializeDashboard = async () => {
          await databaseService.initialize();

          const legacyPath = legacyDashboardQueryToPath(location.search);
          const parsedRoute = parseDashboardPath(legacyPath || location.pathname);

          if (!cancelled && parsedRoute.view) {
            setCurrentView(
              resolveAllowedDashboardView(parsedRoute.view, (p) => databaseService.hasPermission(p)),
            );
          }

          const currentUser = user;
          if (!currentUser) return;

          const organizations = await databaseService.getUserOrganizations();
          const { data: ws } = await workspaceState.get(currentUser.id);
          const savedOrgId = (ws?.preferences as Record<string, unknown> | undefined)?.active_organization_id;
          const savedOrg =
            typeof savedOrgId === 'string'
              ? organizations.find((org) => org.id === savedOrgId)
              : undefined;

          let selectedOrg = savedOrg || (organizations.length === 1 ? organizations[0] : undefined);
          if (selectedOrg) {
            await databaseService.setActiveOrganization(selectedOrg.id);
            if (!cancelled) setActiveOrganization(selectedOrg);
          }

          const programs = selectedOrg ? await databaseService.getPrograms() : [];

          if (parsedRoute.eventId) {
            const fromUrl = programs.find((p) => p.id === parsedRoute.eventId);
            if (!cancelled && fromUrl) {
              setActiveEvent(fromUrl);
            } else if (!cancelled) {
              navigate('/dashboard', { replace: true });
            }
          } else if (ws) {
            if (!cancelled && ws.current_view && !parsedRoute.view) {
              setCurrentView(
                resolveAllowedDashboardView(ws.current_view, (p) => databaseService.hasPermission(p)),
              );
            }
            if (ws.active_program_id) {
              const restored = programs.find((p) => p.id === ws.active_program_id);
              if (!cancelled && restored) {
                setActiveEvent(restored);
                if (!parsedRoute.eventId && !legacyPath) {
                  navigate(
                    buildDashboardPath({
                      eventId: restored.id,
                      view: ws.current_view || 'overview',
                    }),
                    { replace: true },
                  );
                }
              }
            }
          }

          if (!cancelled && legacyPath && legacyPath !== location.pathname) {
            navigate(legacyPath, { replace: true });
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
  }, [isAuthLoading, navigate, user]);

  // Keep view/event in sync when the URL changes (browser controls, deep links, legacy query URLs).
  useEffect(() => {
    if (isInitializing || isAuthLoading) return;

    const legacyPath = legacyDashboardQueryToPath(location.search);
    if (legacyPath) {
      navigate(legacyPath, { replace: true });
      return;
    }

    const parsed = parseDashboardPath(location.pathname);

    if (parsed.view) {
      const allowed = resolveAllowedDashboardView(parsed.view, (p) => databaseService.hasPermission(p));
      setCurrentView((prev) => (prev === allowed ? prev : allowed));
    } else if (location.pathname === '/dashboard') {
      setCurrentView((prev) => (prev === 'overview' ? prev : 'overview'));
    }

    if (!parsed.eventId) {
      if (location.pathname === '/dashboard') {
        setActiveEvent((prev) => (prev ? null : prev));
      }
      return;
    }

    let cancelled = false;
    void (async () => {
      const programs = await databaseService.getPrograms();
      if (cancelled) return;

      const match = programs.find((program) => program.id === parsed.eventId);
      if (match) {
        setActiveEvent((prev) => (prev?.id === match.id ? prev : match));
      } else if (location.pathname !== '/dashboard') {
        navigate('/dashboard', { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isInitializing, isAuthLoading, location.pathname, location.search, navigate]);

  // Sync active program + persist (view changes should not reload permissions)
  useEffect(() => {
    databaseService.setActiveProgram(activeEvent?.id || null);
  }, [activeEvent?.id]);

  useEffect(() => {
    if (persistTimerRef.current != null) {
      window.clearTimeout(persistTimerRef.current);
    }

    persistTimerRef.current = window.setTimeout(async () => {
      try {
        if (!user) {
          return;
        }

        const nextPersistKey = `${user.id}:${activeEvent?.id || 'none'}:${currentView}`;
        if (lastPersistKeyRef.current === nextPersistKey) {
          return;
        }

        await workspaceState.save(user.id, {
          active_program_id: activeEvent?.id || null,
          current_view: currentView,
        });
        lastPersistKeyRef.current = nextPersistKey;
      } catch {
        // Non-critical
      }
    }, 250);

    return () => {
      if (persistTimerRef.current != null) {
        window.clearTimeout(persistTimerRef.current);
      }
    };
  }, [activeEvent?.id, currentView, user]);

  useEffect(() => {
    if (activeEvent?.id) {
      setAwardsViewMode(readAwardsViewMode(activeEvent.id));
      setScheduleRepresentation(readScheduleRepresentation(activeEvent.id));
    }
  }, [activeEvent?.id]);

  useEffect(() => {
    if (activeEvent?.id) {
      writeAwardsViewMode(activeEvent.id, awardsViewMode);
    }
  }, [activeEvent?.id, awardsViewMode]);

  useEffect(() => {
    if (activeEvent?.id) {
      writeStoredRepresentation(activeEvent.id, scheduleRepresentation);
    }
  }, [activeEvent?.id, scheduleRepresentation]);

  const renderView = () => {
    switch (currentView) {
      case 'tile-hub':
        return (
          <ProgramTileHub
            activeEvent={activeEvent}
            onNavigate={handleChangeView}
            onDeleteEvent={handleDeleteEvent}
          />
        );
      case 'overview':
        return <DashboardOverview activeEvent={activeEvent} onNavigate={handleChangeView} />;

      case 'builder':
      case 'program-details':
        return <ProgramDetailsView activeEvent={activeEvent} />;

      case 'schedule':
        return <ScheduleView activeEvent={activeEvent} />;
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
      case 'broadcasts':
        return (
          <Suspense fallback={<ViewLoader />}>
            <BroadcastsView activeEvent={activeEvent} />
          </Suspense>
        );
      case 'attendance':
        return (
          <Suspense fallback={<ViewLoader />}>
            <AttendanceView activeEvent={activeEvent} />
          </Suspense>
        );
      case 'certificates':
        return (
          <Suspense fallback={<ViewLoader />}>
            <CertificatesView activeEvent={activeEvent} />
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
        return activeEvent?.status === 'Active'
          ? <PublishedLockBanner program={activeEvent} sectionName="Form Builder" />
          : <FormBuilderView activeEvent={activeEvent} />;
      case 'submissions':
        return <SubmissionTable activeEvent={activeEvent} onNavigate={handleChangeView} />;

      case 'judging':
        return <JudgingView activeEvent={activeEvent} />;
      case 'judge-category-mapping':
        return <JudgeCategoryMappingView activeEvent={activeEvent} />;
      case 'voting':
        return (
          <ScheduleRoundsView
            activeEvent={activeEvent}
            representation={scheduleRepresentation}
            onRepresentationChange={setScheduleRepresentation}
          />
        );
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
      case 'subscription':
        return (
          <Suspense fallback={<ViewLoader />}>
            <SubscriptionView />
          </Suspense>
        );
      case 'settings':
        return (
          <SettingsView
            activeEvent={activeEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        );
      default:
        return activeEvent
          ? <ProgramTileHub activeEvent={activeEvent} onNavigate={handleChangeView} />
          : <DashboardOverview activeEvent={activeEvent} onNavigate={handleChangeView} />;
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

  if (!activeOrganization) {
    return (
      <motion.div
        key="organization-hub"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <OrganizationSelectionView
          onSelectOrganization={setActiveOrganization}
          onLogout={onLogout}
        />
      </motion.div>
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
          activeOrganization={activeOrganization}
          onSelectEvent={handleSelectEvent}
          onSwitchOrganization={handleSwitchOrganization}
          onLogout={onLogout}
        />
      </motion.div>
    );
  }

  return (
    <DashboardLayout
      currentView={currentView}
      activeEvent={activeEvent}
      onChangeView={handleChangeView}
      onSelectProgram={handleSelectEvent}
      onLogout={onLogout}
      onSwitchEvent={handleSwitchEvent}
      noPadding={currentView === 'awards' || currentView === 'templates' || currentView === 'schedule-rounds' || currentView === 'submissions' || currentView === 'voting' || currentView === 'program-details' || currentView === 'builder'}
      awardsViewMode={awardsViewMode}
      onAwardsViewModeChange={setAwardsViewMode}
      scheduleRepresentation={scheduleRepresentation}
      onScheduleRepresentationChange={setScheduleRepresentation}
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
