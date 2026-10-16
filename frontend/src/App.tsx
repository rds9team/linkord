import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { DiscordReauthBanner } from './components/DiscordReauthBanner';
import { Footer } from './components/Footer';
import { PageTransition } from './components/PageTransition';
import { Loader2 } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';

const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Discover = lazy(() => import('./pages/Discover').then(m => ({ default: m.Discover })));
const ServerDetail = lazy(() => import('./pages/ServerDetail').then(m => ({ default: m.ServerDetail })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Terms = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));
const Privacy = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const Admin = lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));

const PageFallback: React.FC = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
  </div>
);

const AppContent: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div
      className={`min-h-screen flex flex-col relative overflow-x-hidden transition-colors duration-300 ${
        isLight ? 'bg-[#f6f7f9] text-slate-900' : 'bg-[#0b0c10] text-slate-100'
      }`}
    >

      <Navbar />
      <div className="pt-16" />
      <DiscordReauthBanner />

      <PageTransition>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/server/:slug" element={<ServerDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/login" element={<Login />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/@:username" element={<Profile />} />
            <Route path="/:username" element={<Profile />} />
          </Routes>
        </Suspense>
      </PageTransition>

      <Footer />
      {/* Spacer for mobile BottomNav */}
      <div className="h-16 sm:hidden" />
      <BottomNav />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};
