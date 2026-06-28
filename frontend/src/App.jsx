import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// Shell components + หน้าแรกสุด — eager (ต้อง paint ทันที)
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import PDPABanner from './components/PDPABanner';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastContext';
import ScrollToTop from './components/ScrollToTop';
import { apiUrl } from './apiBase';
import { hydrateSync } from './cloudSync';
import VoiceCommander from './components/VoiceCommander';

// หน้าอื่นๆ — lazy load (code-split ต่อ route · โหลดเฉพาะตอนเปิด ลดขนาด bundle แรก)
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TikTokFeedPage = lazy(() => import('./pages/TikTokFeedPage'));
const FacebookFeedPage = lazy(() => import('./pages/FacebookFeedPage'));
const AIGeneratorPage = lazy(() => import('./pages/AIGeneratorPage'));
const AIToolsHub = lazy(() => import('./pages/AIToolsHub'));
const AffiliatePage = lazy(() => import('./pages/AffiliatePage'));
const AffiliateDashboard = lazy(() => import('./pages/AffiliateDashboard'));
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
const AISkillsPage = lazy(() => import('./pages/AISkillsPage'));
const TrendingPage = lazy(() => import('./pages/TrendingPage'));
const ContentCalendarPage = lazy(() => import('./pages/ContentCalendarPage'));
const VoiceCommandPage = lazy(() => import('./pages/VoiceCommandPage'));
const VideoGeneratorPage = lazy(() => import('./pages/VideoGeneratorPage'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const QuickPayPage = lazy(() => import('./pages/QuickPayPage'));
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
const PromoEnginePage = lazy(() => import('./pages/PromoEnginePage'));
const DailyPRPage = lazy(() => import('./pages/DailyPRPage'));
const UltraPromoPage = lazy(() => import('./pages/UltraPromoPage'));
const GlobalPRPage = lazy(() => import('./pages/GlobalPRPage'));
const ContentBenchmarkPage = lazy(() => import('./pages/ContentBenchmarkPage'));
const SchedulerPage = lazy(() => import('./pages/SchedulerPage'));
const AnalyticsDashboardPage = lazy(() => import('./pages/AnalyticsDashboardPage'));
const ImagePromptPage = lazy(() => import('./pages/ImagePromptPage'));
const CatalogAIPage = lazy(() => import('./pages/CatalogAIPage'));
const KOLBriefPage = lazy(() => import('./pages/KOLBriefPage'));
const StrategyCenterPage = lazy(() => import('./pages/StrategyCenterPage'));
const PitchDeckPage = lazy(() => import('./pages/PitchDeckPage'));
const IntegrationHubPage = lazy(() => import('./pages/IntegrationHubPage'));
const SupplyChainPage = lazy(() => import('./pages/SupplyChainPage'));
const SkillsCatalogPage = lazy(() => import('./pages/SkillsCatalogPage'));
const StarterKitPage = lazy(() => import('./pages/StarterKitPage'));
const AssistantPage = lazy(() => import('./pages/AssistantPage'));

// Fallback ระหว่างโหลดหน้า (lazy chunk)
function PageLoader() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#94a3b8', fontFamily: "'Inter','Sarabun',sans-serif" }}>
      <div style={{ width: 36, height: 36, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'otaSpin 0.8s linear infinite' }} />
      <div style={{ fontSize: 13 }}>กำลังโหลด…</div>
      <style>{'@keyframes otaSpin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // ตรวจ JWT token ทุกครั้งที่ app โหลด
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) { setAuthChecked(true); return; }

    fetch(apiUrl('/api/auth/verify'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setIsAuthenticated(data.valid === true);
        // ซิงค์ข้อมูลข้ามอุปกรณ์ (มือถือ/คอม/memory/cloud) เมื่อ token ใช้ได้
        if (data.valid === true) hydrateSync();
      })
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
            <Route path="/skills" element={isAuthenticated ? <AISkillsPage /> : <Navigate to="/login" />} />
            <Route path="/skills-catalog" element={isAuthenticated ? <SkillsCatalogPage /> : <Navigate to="/login" />} />
            <Route path="/starter" element={isAuthenticated ? <StarterKitPage /> : <Navigate to="/login" />} />
            <Route path="/assistant" element={isAuthenticated ? <AssistantPage /> : <Navigate to="/login" />} />
            <Route path="/supply-chain" element={isAuthenticated ? <SupplyChainPage /> : <Navigate to="/login" />} />
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
            <Route path="/pay" element={<QuickPayPage />} />
            <Route path="/quickpay" element={<QuickPayPage />} />
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
          </Suspense>
          <PDPABanner />
          {/* Voice Commander Widget — ปรากฏทุกหน้าหลัง login */}
          {isAuthenticated && <VoiceCommander mode="widget" />}
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
