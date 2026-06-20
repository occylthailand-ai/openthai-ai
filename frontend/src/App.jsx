import React, { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PDPABanner from './components/PDPABanner';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastContext';
import ScrollToTop from './components/ScrollToTop';
import { apiUrl } from './apiBase';
import RouteFallback from './components/RouteFallback';
import { prefetchWhenIdle } from './perf';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TikTokFeedPage = lazy(() => import('./pages/TikTokFeedPage'));
const FacebookFeedPage = lazy(() => import('./pages/FacebookFeedPage'));
const AIGeneratorPage = lazy(() => import('./pages/AIGeneratorPage'));
const AIToolsHub = lazy(() => import('./pages/AIToolsHub'));
const AffiliatePage = lazy(() => import('./pages/AffiliatePage'));
const AffiliateDashboard = lazy(() => import('./pages/AffiliateDashboard'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const ProducerJoinPage = lazy(() => import('./pages/ProducerJoinPage'));
const CatalogPage = lazy(() => import('./pages/CatalogPage'));
const ProducerDirectoryPage = lazy(() => import('./pages/ProducerDirectoryPage'));
const TrackOrderPage = lazy(() => import('./pages/TrackOrderPage'));
const StorePage = lazy(() => import('./pages/StorePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const BrandMemoryPage = lazy(() => import('./pages/BrandMemoryPage'));
const AgentPage = lazy(() => import('./pages/AgentPage'));
const TrendingPage = lazy(() => import('./pages/TrendingPage'));
const ContentCalendarPage = lazy(() => import('./pages/ContentCalendarPage'));
const VoiceCommander = lazy(() => import('./components/VoiceCommander'));
const VoiceCommandPage = lazy(() => import('./pages/VoiceCommandPage'));
const VideoGeneratorPage = lazy(() => import('./pages/VideoGeneratorPage'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const CorporateDashboard = lazy(() => import('./pages/corporate/CorporateDashboard'));
const InvestorRelationsPage = lazy(() => import('./pages/corporate/InvestorRelationsPage'));
const CompliancePage = lazy(() => import('./pages/corporate/CompliancePage'));
const ESGPage = lazy(() => import('./pages/corporate/ESGPage'));
const HRPage = lazy(() => import('./pages/corporate/HRPage'));
const GlobalOpsPage = lazy(() => import('./pages/corporate/GlobalOpsPage'));
const FinancePage = lazy(() => import('./pages/corporate/FinancePage'));
const BoardPage = lazy(() => import('./pages/corporate/BoardPage'));
const PRCommsPage = lazy(() => import('./pages/corporate/PRCommsPage'));
const CommandCenterPage = lazy(() => import('./pages/corporate/CommandCenterPage'));
const ProgressDashboard = lazy(() => import('./pages/ProgressDashboard'));
const PortalHubPage = lazy(() => import('./pages/PortalHubPage'));
const ProducerPortalPage = lazy(() => import('./pages/portals/ProducerPortalPage'));
const AffiliatePortalPage = lazy(() => import('./pages/portals/AffiliatePortalPage'));
const CreatorPortalPage = lazy(() => import('./pages/portals/CreatorPortalPage'));
const GovThaiPortalPage = lazy(() => import('./pages/portals/GovThaiPortalPage'));
const GovIntlPortalPage = lazy(() => import('./pages/portals/GovIntlPortalPage'));
const IntlOrgPortalPage = lazy(() => import('./pages/portals/IntlOrgPortalPage'));
const FoundationPortalPage = lazy(() => import('./pages/portals/FoundationPortalPage'));
const CarrierJoinPage = lazy(() => import('./pages/CarrierJoinPage'));
const DeliveryPage = lazy(() => import('./pages/DeliveryPage'));
const CarrierDirectoryPage = lazy(() => import('./pages/CarrierDirectoryPage'));
const AutoPostPage = lazy(() => import('./pages/AutoPostPage'));
const LinkTrackerPage = lazy(() => import('./pages/LinkTrackerPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const BulkContentPage = lazy(() => import('./pages/BulkContentPage'));
const ContentIdeasPage = lazy(() => import('./pages/ContentIdeasPage'));

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // ตรวจ JWT token ทุกครั้งที่ app โหลด
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) { setAuthChecked(true); return; }

    fetch(apiUrl('/api/auth/verify'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setIsAuthenticated(data.valid === true); })
      .catch(() => { setIsAuthenticated(false); })
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    prefetchWhenIdle(isAuthenticated
      ? [() => import('./pages/AIGeneratorPage'), () => import('./pages/DashboardPage'), () => import('./pages/ContentIdeasPage')]
      : [() => import('./pages/LoginPage'), () => import('./pages/PricingPage'), () => import('./pages/StorePage')]);
  }, [isAuthenticated]);

  const handleLogin = () => setIsAuthenticated(true);

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('auth_token');
  };

  // รอตรวจ token ก่อน render เพื่อป้องกัน flash
  if (!authChecked) return null;

  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router>
          <ScrollToTop />
          <Suspense fallback={<RouteFallback />}>
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
              <Route path="/join" element={<ProducerJoinPage />} />
              <Route path="/producers" element={<ProducerJoinPage />} />
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/shop" element={<CatalogPage />} />
              <Route path="/find-producers" element={<ProducerDirectoryPage />} />
              <Route path="/find" element={<ProducerDirectoryPage />} />
              <Route path="/track" element={<TrackOrderPage />} />
              <Route path="/store" element={<StorePage />} />
              <Route path="/admin" element={isAuthenticated ? <AdminPage /> : <Navigate to="/login" />} />
              <Route path="/affiliate" element={<AffiliatePage />} />
              <Route path="/affiliate/dashboard" element={<AffiliateDashboard />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/contact" element={<ContactPage />} />
              {/* New feature pages — public */}
              <Route path="/trending" element={<TrendingPage />} />
              <Route path="/calendar" element={<ContentCalendarPage />} />
              <Route path="/brand" element={<BrandMemoryPage />} />
              <Route path="/voice" element={isAuthenticated ? <VoiceCommandPage /> : <Navigate to="/login" />} />
              <Route path="/video" element={isAuthenticated ? <VideoGeneratorPage /> : <Navigate to="/login" />} />
              <Route path="/payment" element={<PaymentPage />} />
              {/* Corporate System — Public Company */}
              <Route path="/corporate"             element={isAuthenticated ? <CorporateDashboard />    : <Navigate to="/login" />} />
              <Route path="/corporate/board"       element={isAuthenticated ? <BoardPage />             : <Navigate to="/login" />} />
              <Route path="/corporate/ir"          element={isAuthenticated ? <InvestorRelationsPage /> : <Navigate to="/login" />} />
              <Route path="/corporate/compliance"  element={isAuthenticated ? <CompliancePage />        : <Navigate to="/login" />} />
              <Route path="/corporate/esg"         element={isAuthenticated ? <ESGPage />               : <Navigate to="/login" />} />
              <Route path="/corporate/hr"          element={isAuthenticated ? <HRPage />                : <Navigate to="/login" />} />
              <Route path="/corporate/finance"     element={isAuthenticated ? <FinancePage />           : <Navigate to="/login" />} />
              <Route path="/corporate/global"      element={isAuthenticated ? <GlobalOpsPage />         : <Navigate to="/login" />} />
              <Route path="/corporate/pr"          element={isAuthenticated ? <PRCommsPage />           : <Navigate to="/login" />} />
              <Route path="/corporate/command"     element={isAuthenticated ? <CommandCenterPage />     : <Navigate to="/login" />} />
              <Route path="/progress" element={<ProgressDashboard />} />
              {/* Portal Hub & Individual Portals */}
              <Route path="/portals" element={<PortalHubPage />} />
              <Route path="/portals/producer" element={<ProducerPortalPage />} />
              <Route path="/portals/affiliate" element={<AffiliatePortalPage />} />
              <Route path="/portals/creator" element={<CreatorPortalPage />} />
              <Route path="/portals/gov-thai" element={<GovThaiPortalPage />} />
              <Route path="/portals/gov-intl" element={<GovIntlPortalPage />} />
              <Route path="/portals/intl-org" element={<IntlOrgPortalPage />} />
              <Route path="/portals/foundation" element={<FoundationPortalPage />} />
              {/* Carrier & Delivery pages — public */}
              <Route path="/carrier" element={<CarrierJoinPage />} />
              <Route path="/drivers" element={<CarrierJoinPage />} />
              <Route path="/delivery" element={<DeliveryPage />} />
              <Route path="/ship" element={<DeliveryPage />} />
              <Route path="/carriers" element={<CarrierDirectoryPage />} />
              <Route path="/autopost" element={isAuthenticated ? <AutoPostPage /> : <Navigate to="/login" />} />
              <Route path="/link-tracker" element={isAuthenticated ? <LinkTrackerPage /> : <Navigate to="/login" />} />
              <Route path="/analytics" element={isAuthenticated ? <AnalyticsPage /> : <Navigate to="/login" />} />
              <Route path="/bulk-post" element={isAuthenticated ? <BulkContentPage /> : <Navigate to="/login" />} />
              <Route path="/ideas" element={isAuthenticated ? <ContentIdeasPage /> : <Navigate to="/login" />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          <PDPABanner />
          {/* Voice Commander Widget — ปรากฏทุกหน้าหลัง login */}
          {isAuthenticated && <Suspense fallback={null}><VoiceCommander mode="widget" /></Suspense>}
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
