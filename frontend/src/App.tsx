import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Profile } from './pages/Profile';
import { Discover } from './pages/Discover';
import { ServerDetail } from './pages/ServerDetail';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { AuthProvider } from './context/AuthContext';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
      <div className="min-h-screen bg-[#08090d] text-slate-100 flex flex-col relative overflow-x-hidden">
        {/* Subtle background glow */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none"></div>

        <Navbar />

        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/server/:slug" element={<ServerDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/login" element={<Login />} />
            <Route path="/@:username" element={<Profile />} />
            <Route path="/:username" element={<Profile />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  </AuthProvider>
  );
};
