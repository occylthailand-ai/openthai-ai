import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TikTokFeedPage from './pages/TikTokFeedPage';
import FacebookFeedPage from './pages/FacebookFeedPage';
import AIGeneratorPage from './pages/AIGeneratorPage';
import AIToolsHub from './pages/AIToolsHub';
import AffiliatePage from './pages/AffiliatePage';
import AffiliateDashboard from './pages/AffiliateDashboard';
import LandingPage from './pages/LandingPage';
import PricingPage from './pages/PricingPage';
import ProducerJoinPage from './pages/ProducerJoinPage';
import CatalogPage from './pages/CatalogPage';
import ProducerDirectoryPage from './pages/ProducerDirectoryPage';
import TrackOrderPage from './pages/TrackOrderPage';
import StorePage from './pages/StorePage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import ContactPage from './pages/ContactPage';
import BrandMemoryPage from './pages/BrandMemoryPage';
import AgentPage from './pages/AgentPage';
import AISkillsPage from './pages/AISkillsPage';
import TrendingPage from './pages/TrendingPage';
import ContentCalendarPage from './pages/ContentCalendarPage';
import PDPABanner from './components/PDPABanner';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastContext';
import ScrollToTop from './components/ScrollToTop';
import { apiUrl } from './apiBase';
import VoiceCommander from './components/VoiceCommander';
import VoiceCommandPage from './pages/VoiceCommandPage';
import VideoGeneratorPage from './pages/VideoGeneratorPage';
import PaymentPage from './pages/PaymentPage';
import CorporateDashboard from './pages/corporate/CorporateDashboard';
import InvestorRelationsPage from './pages/corporate/InvestorRelationsPage';
import CompliancePage from './pages/corporate/CompliancePage';
import ESGPage from './pages/corporate/ESGPage';
import HRPage from './pages/corporate/HRPage';
import GlobalOpsPage from './pages/corporate/GlobalOpsPage';
import FinancePage from './pages/corporate/FinancePage';
import BoardPage from './pages/corporate/BoardPage';
import PRCommsPage from './pages/corporate/PRCommsPage';
import CommandCenterPage from './pages/corporate/CommandCenterPage';
import ProgressDashboard from './pages/ProgressDashboard';
import PortalHubPage from './pages/PortalHubPage';
import ProducerPortalPage from './pages/portals/ProducerPortalPage';
import AffiliatePortalPage from './pages/portals/AffiliatePortalPage';
import CreatorPortalPage from './pages/portals/CreatorPortalPage';
import GovThaiPortalPage from './pages/portals/GovThaiPortalPage';
import GovIntlPortalPage from './pages/portals/GovIntlPortalPage';
import IntlOrgPortalPage from './pages/portals/IntlOrgPortalPage';
import FoundationPortalPage from './pages/portals/FoundationPortalPage';
import PromoEnginePage from './pages/PromoEnginePage';
import DailyPRPage from './pages/DailyPRPage';
import UltraPromoPage from './pages/UltraPromoPage';
import GlobalPRPage from './pages/GlobalPRPage';
import ContentBenchmarkPage from './pages/ContentBenchmarkPage';
import SchedulerPage from './pages/SchedulerPage';
import AnalyticsDashboardPage from './pages/AnalyticsDashboardPage';
import ImagePromptPage from './pages/ImagePromptPage';
import CatalogAIPage from './pages/CatalogAIPage';
import KOLBriefPage from './pages/KOLBriefPage';
import StrategyCenterPage from './pages/StrategyCenterPage';
import PitchDeckPage from './pages/PitchDeckPage';
import IntegrationHubPage from './pages/IntegrationHubPage';

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
            <Route path="/skills" element={isAuthenticated ? <AISkillsPage /> : <Navigate to="/login" />} />
            <Route path="/promo-engine" element={isAuthenticated ? <PromoEnginePage /> : <Navigate to="/login" />} />
            <Route path="/daily-pr" element={isAuthenticated ? <DailyPRPage /> : <Navigate to="/login" />} />
            <Route path="/ultra-promo" element={isAuthenticated ? <UltraPromoPage /> : <Navigate to="/login" />} />
            <Route path="/global-pr" element={isAuthenticated ? <GlobalPRPage /> : <Navigate to="/login" />} />
            <Route path="/benchmark" element={isAuthenticated ? <ContentBenchmarkPage /> : <Navigate to="/login" />} />
            <Route path="/scheduler" element={isAuthenticated ? <SchedulerPage /> : <Navigate to="/login" />} />
            <Route path="/analytics-pro" element={isAuthenticated ? <AnalyticsDashboardPage /> : <Navigate to="/login" />} />
            <Route path="/image-prompt" element={isAuthenticated ? <ImagePromptPage /> : <Navigate to="/login" />} />
            <Route path="/catalog-ai" element={isAuthenticated ? <CatalogAIPage /> : <Navigate to="/login" />} />
            <Route path="/kol-brief" element={isAuthenticated ? <KOLBriefPage /> : <Navigate to="/login" />} />
            <Route path="/strategy" element={isAuthenticated ? <StrategyCenterPage /> : <Navigate to="/login" />} />
            <Route path="/pitch" element={isAuthenticated ? <PitchDeckPage /> : <Navigate to="/login" />} />
            <Route path="/integrations" element={isAuthenticated ? <IntegrationHubPage /> : <Navigate to="/login" />} />
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
            <Route path="/voice" element={<VoiceCommandPage />} />
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
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <PDPABanner />
          {/* Voice Commander Widget — ปรากฏทุกหน้าหลัง login */}
          {isAuthenticated && <VoiceCommander mode="widget" />}
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
