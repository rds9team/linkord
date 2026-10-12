import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

const SCROLL_POSITIONS_KEY = 'linkord_scroll_positions';

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();
  const navType = useNavigationType(); // 'POP' | 'PUSH' | 'REPLACE'
  const [displayLocation, setDisplayLocation] = useState(location);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevPathRef = useRef<string>(location.pathname + location.search);

  // Track app navigation history for smart back button
  useEffect(() => {
    const currentFull = location.pathname + location.search;
    if (prevPathRef.current !== currentFull) {
      sessionStorage.setItem('linkord_prev_internal_path', prevPathRef.current);
      prevPathRef.current = currentFull;
    }
  }, [location]);

  // Handle smooth page exit & enter animation with scroll restoration
  useEffect(() => {
    // Only animate if pathname changes (ignore query search parameter changes like typing in search box)
    if (location.pathname !== displayLocation.pathname) {
      // Save current scroll position before leaving
      try {
        const stored = sessionStorage.getItem(SCROLL_POSITIONS_KEY);
        const positions = stored ? JSON.parse(stored) : {};
        positions[displayLocation.pathname + displayLocation.search] = window.scrollY;
        sessionStorage.setItem(SCROLL_POSITIONS_KEY, JSON.stringify(positions));
      } catch {
        // ignore
      }

      setIsAnimating(true);
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setIsAnimating(false);

        // Restore scroll position on back/POP or reset on new PUSH
        if (navType === 'POP') {
          try {
            const stored = sessionStorage.getItem(SCROLL_POSITIONS_KEY);
            const positions = stored ? JSON.parse(stored) : {};
            const savedY = positions[location.pathname + location.search] || 0;
            requestAnimationFrame(() => {
              window.scrollTo({ top: savedY, behavior: 'instant' });
            });
          } catch {
            window.scrollTo({ top: 0, behavior: 'instant' });
          }
        } else {
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
      }, 100);

      return () => clearTimeout(timer);
    } else if (location.search !== displayLocation.search) {
      // For search query changes, update displayLocation immediately without animating or fading out
      setDisplayLocation(location);
    }
  }, [location, displayLocation, navType]);

  return (
    <div
      className={`w-full flex-1 transition-all duration-200 ease-out ${
        isAnimating
          ? 'opacity-0 -translate-y-1.5 blur-[1px]'
          : 'opacity-100 translate-y-0 blur-0'
      }`}
    >
      {children}
    </div>
  );
};
