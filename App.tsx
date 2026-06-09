import React, { Suspense, lazy, useEffect, useMemo } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { auth } from './services/supabase';
import { ProtectedRoute } from './components/ProtectedRoute';
import { isLandingOnly } from './lib/landingOnly';

const HomePage = lazy(() => import('./components/pages/HomePage').then((m) => ({ default: m.HomePage })));
const FeaturesPage = lazy(() => import('./components/pages/FeaturesPage').then((m) => ({ default: m.FeaturesPage })));
const HowItWorksPage = lazy(() => import('./components/pages/HowItWorksPage').then((m) => ({ default: m.HowItWorksPage })));
const StoriesPage = lazy(() => import('./components/pages/StoriesPage').then((m) => ({ default: m.StoriesPage })));
const PricingPage = lazy(() => import('./components/pages/PricingPage').then((m) => ({ default: m.PricingPage })));
const DocsPage = lazy(() => import('./components/pages/DocsPage').then((m) => ({ default: m.DocsPage })));
const SignupPage = lazy(() => import('./components/pages/SignupPage').then((m) => ({ default: m.SignupPage })));
const LoginPage = lazy(() => import('./components/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const Dashboard = lazy(() => import('./components/dashboard/Dashboard').then((m) => ({ default: m.Dashboard })));
const DemoDashboard = lazy(() => import('./components/demo/DemoDashboard').then((m) => ({ default: m.DemoDashboard })));
const AuthCallback = lazy(() => import('./components/AuthCallback').then((m) => ({ default: m.AuthCallback })));
const WorkflowPage = lazy(() => import('./components/pages/WorkflowPage').then((m) => ({ default: m.WorkflowPage })));
const FormSubmissionPage = lazy(() => import('./components/pages/FormSubmissionPage').then((m) => ({ default: m.FormSubmissionPage })));
const PublicProgramPage = lazy(() => import('./components/pages/PublicProgramPage').then((m) => ({ default: m.PublicProgramPage })));
const JudgePortalPage = lazy(() => import('./components/pages/JudgePortalPage').then((m) => ({ default: m.JudgePortalPage })));
const TeamInvitePage = lazy(() => import('./components/pages/TeamInvitePage').then((m) => ({ default: m.TeamInvitePage })));
const MySubmissionsPage = lazy(() => import('./components/pages/MySubmissionsPage').then((m) => ({ default: m.MySubmissionsPage })));
const PublicVotingPage = lazy(() => import('./components/pages/PublicVotingPage').then((m) => ({ default: m.PublicVotingPage })));

const RouteLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-slate-600">Loading...</p>
    </div>
  </div>
);

const preloadLikelyNextRoutes = () => {
  if (isLandingOnly) return;
  void Promise.all([
    import('./components/pages/LoginPage'),
    import('./components/pages/SignupPage'),
    import('./components/dashboard/Dashboard'),
  ]);
};

const pageToPath = (page: string): string => {
  if (!page) return '/';

  if (page.startsWith('/')) {
    return page;
  }

  if (page.startsWith('?') || page.startsWith('/?')) {
    const qs = page.startsWith('/?') ? page.slice(2) : page.slice(1);
    const params = new URLSearchParams(qs);
    const queryPage = params.get('page');
    if (queryPage === 'form' && params.get('formId')) {
      return `/form/${params.get('formId')}`;
    }
    if (queryPage === 'judge-portal' && params.get('token')) {
      return `/judge/${params.get('token')}`;
    }
    if (queryPage === 'program' && params.get('id')) {
      return `/program?id=${params.get('id')}`;
    }
    if (queryPage === 'workflow' && (params.get('programId') || params.get('id'))) {
      return `/workflow/${params.get('programId') || params.get('id')}`;
    }
    return '/';
  }

  const map: Record<string, string> = {
    home: '/',
    features: '/features',
    'how-it-works': '/how-it-works',
    stories: '/stories',
    pricing: '/pricing',
    docs: '/docs',
    workflow: '/workflow',
    demo: '/demo?autoplay=1',
    dashboard: '/dashboard',
    login: '/login',
    signup: '/signup',
    'form-submission': '/form',
    'judge-portal': '/judge',
    'public-program': '/program',
  };

  return map[page] || '/';
};

const pathToPage = (pathname: string): string => {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/features')) return 'features';
  if (pathname.startsWith('/how-it-works')) return 'how-it-works';
  if (pathname.startsWith('/stories')) return 'stories';
  if (pathname.startsWith('/pricing')) return 'pricing';
  if (pathname.startsWith('/docs')) return 'docs';
  if (pathname.startsWith('/workflow')) return 'workflow';
  if (pathname.startsWith('/login')) return 'login';
  if (pathname.startsWith('/signup')) return 'signup';
  return 'home';
};

const MarketingLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentPage = useMemo(() => pathToPage(location.pathname), [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 selection:text-foreground">
      <Header
        currentPage={currentPage}
        onNavigate={(page) => navigate(pageToPath(page))}
        onLogout={async () => {
          await auth.signOut();
          navigate('/');
        }}
      />
      <main>{children}</main>
      <Footer />
    </div>
  );
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let timeoutId: number | null = null;
    const idleHandle =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? (window as any).requestIdleCallback(preloadLikelyNextRoutes, { timeout: 1200 })
        : null;

    if (idleHandle == null) {
      timeoutId = window.setTimeout(preloadLikelyNextRoutes, 1200);
    }

    return () => {
      if (idleHandle != null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleHandle);
      }
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const page = params.get('page');
    if (!page || location.pathname !== '/') {
      return;
    }

    if (page === 'workflow') {
      const programId = params.get('programId') || params.get('id');
      navigate(programId ? `/workflow/${programId}` : '/workflow', { replace: true });
      return;
    }

    if (page === 'form' && params.get('formId')) {
      navigate(`/form/${params.get('formId')}`, { replace: true });
      return;
    }

    if (page === 'judge-portal' && params.get('token')) {
      navigate(`/judge/${params.get('token')}`, { replace: true });
      return;
    }

    if (page === 'program') {
      const id = params.get('id');
      if (id) {
        navigate(`/program?id=${id}`, { replace: true });
      } else {
        navigate('/program', { replace: true });
      }
    }
  }, [location.pathname, location.search, navigate]);

  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route
          path="/"
          element={
            <MarketingLayout>
              <HomePage />
            </MarketingLayout>
          }
        />
        <Route
          path="/features"
          element={
            <MarketingLayout>
              <FeaturesPage />
            </MarketingLayout>
          }
        />
        <Route
          path="/how-it-works"
          element={
            <MarketingLayout>
              <HowItWorksPage />
            </MarketingLayout>
          }
        />
        <Route
          path="/stories"
          element={
            <MarketingLayout>
              <StoriesPage />
            </MarketingLayout>
          }
        />
        <Route
          path="/pricing"
          element={
            <MarketingLayout>
              <PricingPage />
            </MarketingLayout>
          }
        />
        <Route
          path="/docs"
          element={
            <MarketingLayout>
              <DocsPage />
            </MarketingLayout>
          }
        />
        <Route
          path="/docs/:section"
          element={
            <MarketingLayout>
              <DocsPage />
            </MarketingLayout>
          }
        />
        {isLandingOnly ? (
          <>
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/signup" element={<Navigate to="/" replace />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/demo" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/workflow" element={<WorkflowPage />} />
            <Route path="/workflow/:programId" element={<WorkflowPage />} />
            <Route path="/form" element={<FormSubmissionPage />} />
            <Route path="/form/:formId" element={<FormSubmissionPage />} />
            <Route path="/judge" element={<JudgePortalPage />} />
            <Route path="/judge/:token" element={<JudgePortalPage />} />
            <Route path="/team-invite" element={<TeamInvitePage />} />
            <Route path="/team-invite/:token" element={<TeamInvitePage />} />
            <Route path="/program" element={<PublicProgramPage />} />
            <Route path="/program/:slug" element={<PublicProgramPage />} />
            <Route path="/vote/:slug" element={<PublicVotingPage />} />
            <Route path="/voting/:roundId" element={<PublicVotingPage />} />
            <Route
              path="/my-submissions"
              element={
                <ProtectedRoute>
                  <MySubmissionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard
                    onLogout={async () => {
                      await auth.signOut();
                      navigate('/');
                    }}
                  />
                </ProtectedRoute>
              }
            />
            <Route path="/demo" element={<DemoDashboard />} />
          </>
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;
