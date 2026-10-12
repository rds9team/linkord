import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { DiscordReauthBanner } from './components/DiscordReauthBanner';
import { Footer } from './components/Footer';
import { PageTransition } from './components/PageTransition';
import { Home } from './pages/Home';
import { Profile } from './pages/Profile';
import { Discover } from './pages/Discover';
import { ServerDetail } from './pages/ServerDetail';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';
import { Admin } from './pages/Admin';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';

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
      <DiscordReauthBanner />

      <PageTransition>
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
      </PageTransition>

      <Footer />
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
