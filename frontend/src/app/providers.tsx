'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@astryxdesign/core/theme';
import { stoneTheme } from '@astryxdesign/theme-stone/built';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import { chocolateTheme } from '@astryxdesign/theme-chocolate/built';
import { matchaTheme } from '@astryxdesign/theme-matcha/built';

export type AppThemeName = 'stone' | 'neutral' | 'chocolate' | 'matcha';
export type AppThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeName: AppThemeName;
  setThemeName: (name: AppThemeName) => void;
  themeMode: AppThemeMode;
  setThemeMode: (mode: AppThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeName: 'stone',
  setThemeName: () => {},
  themeMode: 'light',
  setThemeMode: () => {},
});

export function useAppTheme() {
  return useContext(ThemeContext);
}

const THEME_MAP: Record<AppThemeName, any> = {
  stone: stoneTheme,
  neutral: neutralTheme,
  chocolate: chocolateTheme,
  matcha: matchaTheme,
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30, // 30 seconds
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [themeName, setThemeName] = useState<AppThemeName>('stone');
  const [themeMode, setThemeMode] = useState<AppThemeMode>('light');

  // Load persisted theme preference from localStorage if available
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('acme_theme_name') as AppThemeName;
      const savedMode = localStorage.getItem('acme_theme_mode') as AppThemeMode;
      if (savedTheme && THEME_MAP[savedTheme]) setThemeName(savedTheme);
      if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) setThemeMode(savedMode);
    } catch {
      // LocalStorage unavailable (SSR or incognito)
    }
  }, []);

  const handleSetThemeName = (name: AppThemeName) => {
    setThemeName(name);
    try {
      localStorage.setItem('acme_theme_name', name);
    } catch {}
  };

  const handleSetThemeMode = (mode: AppThemeMode) => {
    setThemeMode(mode);
    try {
      localStorage.setItem('acme_theme_mode', mode);
    } catch {}
  };

  const activeTheme = THEME_MAP[themeName] || stoneTheme;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider
        value={{
          themeName,
          setThemeName: handleSetThemeName,
          themeMode,
          setThemeMode: handleSetThemeMode,
        }}
      >
        <Theme theme={activeTheme} mode={themeMode}>
          {children}
        </Theme>
      </ThemeContext.Provider>
    </QueryClientProvider>
  );
}
