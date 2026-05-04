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
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import ContactPage from './pages/ContactPage';
import BrandMemoryPage from './pages/BrandMemoryPage';
import AgentPage from './pages/AgentPage';
import TrendingPage from './pages/TrendingPage';
import ContentCalendarPage from './pages/ContentCalendarPage';
import PDPABanner from './components/PDPABanner';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastContext';
import ScrollToTop from './components/ScrollToTop';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // ตรวจ JWT token ทุกครั้งที่ app โหลด
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) { setAuthChecked(true); return; }

    fetch('/api/auth/verify', { headers: { Authorization: `Bearer ${token}` } })
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
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <PDPABanner />
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
