'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';

export type AppThemeName = 'neutral';
export type AppThemeMode = 'light';

interface ThemeContextType {
  themeName: 'neutral';
  setThemeName: (name: any) => void;
  themeMode: 'light';
  setThemeMode: (mode: any) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeName: 'neutral',
  setThemeName: () => {},
  themeMode: 'light',
  setThemeMode: () => {},
});

export function useAppTheme() {
  return useContext(ThemeContext);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
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

  // Lock in Neutral Quiet Grays in Light Mode permanently
  const themeName = 'neutral' as const;
  const themeMode = 'light' as const;

  useEffect(() => {
    try {
      localStorage.setItem('acme_theme_name', 'neutral');
      localStorage.setItem('acme_theme_mode', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.setAttribute('data-astryx-theme', 'neutral');
    } catch {}
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider
        value={{
          themeName: 'neutral',
          setThemeName: () => {},
          themeMode: 'light',
          setThemeMode: () => {},
        }}
      >
        <Theme theme={neutralTheme} mode="light">
          {children}
        </Theme>
      </ThemeContext.Provider>
    </QueryClientProvider>
  );
}
