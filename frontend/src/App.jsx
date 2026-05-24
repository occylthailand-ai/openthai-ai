import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PDPABanner from './components/PDPABanner';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastContext';
import ScrollToTop from './components/ScrollToTop';
import { apiUrl, fetchWithTimeout } from './apiBase';

const LoginPage          = lazy(() => import('./pages/LoginPage'));
const DashboardPage      = lazy(() => import('./pages/DashboardPage'));
const TikTokFeedPage     = lazy(() => import('./pages/TikTokFeedPage'));
const FacebookFeedPage   = lazy(() => import('./pages/FacebookFeedPage'));
const AIGeneratorPage    = lazy(() => import('./pages/AIGeneratorPage'));
const AIToolsHub         = lazy(() => import('./pages/AIToolsHub'));
const AffiliatePage      = lazy(() => import('./pages/AffiliatePage'));
const AffiliateDashboard = lazy(() => import('./pages/AffiliateDashboard'));
const LandingPage        = lazy(() => import('./pages/LandingPage'));
const PricingPage        = lazy(() => import('./pages/PricingPage'));
const AdminPage          = lazy(() => import('./pages/AdminPage'));
const NotFoundPage       = lazy(() => import('./pages/NotFoundPage'));
const PrivacyPage        = lazy(() => import('./pages/PrivacyPage'));
const TermsPage          = lazy(() => import('./pages/TermsPage'));
const ContactPage        = lazy(() => import('./pages/ContactPage'));
const BrandMemoryPage    = lazy(() => import('./pages/BrandMemoryPage'));
const AgentPage          = lazy(() => import('./pages/AgentPage'));
const TrendingPage       = lazy(() => import('./pages/TrendingPage'));
const ContentCalendarPage= lazy(() => import('./pages/ContentCalendarPage'));
const PaymentMethodsPage = lazy(() => import('./pages/PaymentMethodsPage'));
const TeamPage           = lazy(() => import('./pages/TeamPage'));
const CommandBoardPage   = lazy(() => import('./pages/CommandBoardPage'));
const FoundationPage     = lazy(() => import('./pages/FoundationPage'));
const SetupGuidePage     = lazy(() => import('./pages/SetupGuidePage'));

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f1a', color: '#6366f1', fontSize: '14px' }}>
    กำลังโหลด...
  </div>
);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // ตรวจ JWT token ทุกครั้งที่ app โหลด
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) { setAuthChecked(true); return; }

    fetchWithTimeout(apiUrl('/api/auth/verify'), { headers: { Authorization: `Bearer ${token}` } }, 10000)
      .then(r => r.json())
      .then(data => { setIsAuthenticated(data.valid === true); })
      .catch(() => { setIsAuthenticated(false); })
      .finally(() => setAuthChecked(true));
  }, []);

  const handleLogin = () => setIsAuthenticated(true);

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('auth_token');
  };

  // รอตรวจ token ก่อน render เพื่อป้องกัน flash
  if (!authChecked) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f1a', color: '#94a3b8', fontSize: '14px' }}>
      กำลังโหลด...
    </div>
  );

  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router>
          <ScrollToTop />
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route
              path="/login"
              element={!isAuthenticated ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/dashboard" />}
            />
            <Route
              path="/dashboard"
              element={isAuthenticated ? <DashboardPage onLogout={handleLogout} /> : <Navigate to="/login" />}
            />
            <Route
              path="/tiktok"
              element={isAuthenticated ? <TikTokFeedPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/facebook"
              element={isAuthenticated ? <FacebookFeedPage /> : <Navigate to="/login" />}
            />
            <Route path="/ai-generator" element={isAuthenticated ? <AIGeneratorPage /> : <Navigate to="/login" />} />
            <Route path="/ai-tools" element={isAuthenticated ? <AIToolsHub /> : <Navigate to="/login" />} />
            <Route path="/agent" element={isAuthenticated ? <AgentPage /> : <Navigate to="/login" />} />
            {/* Public pages — ไม่ต้อง login */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/affiliate" element={<AffiliatePage />} />
            <Route path="/affiliate/dashboard" element={<AffiliateDashboard />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            {/* New feature pages — public */}
            <Route path="/trending" element={<TrendingPage />} />
            <Route path="/calendar" element={<ContentCalendarPage />} />
            <Route path="/brand" element={<BrandMemoryPage />} />
            <Route path="/payment-methods" element={<PaymentMethodsPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/board" element={<CommandBoardPage />} />
            <Route path="/foundation" element={<FoundationPage />} />
            <Route path="/setup" element={<SetupGuidePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
          <PDPABanner />
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
