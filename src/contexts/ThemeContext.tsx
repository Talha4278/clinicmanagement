import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppTheme = 'blue' | 'olive';

export interface ThemeConfig {
  id: AppTheme;
  name: string;
  shortName: string;
  tagline: string;
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  sidebarBg: string;
  sidebarActiveBg: string;
  appBg: string;
  appBgDark: string;
  bannerBg: string;
  badgeBg: string;
  badgeText: string;
  accentGradient: string;
  avatarBg: string;
  dossierGradient: string;
  icon: string;
}

export const THEMES: Record<AppTheme, ThemeConfig> = {
  blue: {
    id: 'blue',
    name: 'Modern Dental Blue & White',
    shortName: 'Dental Blue',
    tagline: 'Matches Landing Page & Cloud Portal',
    primary: '#0284c7', // Brand Sky Blue (from landing page #0284c7)
    primaryHover: '#0369a1',
    primaryLight: '#f0f9ff',
    primaryDark: '#0c4a6e', // Dental Navy (from landing page #0c4a6e)
    sidebarBg: '#0c4a6e', // Deep Dental Navy
    sidebarActiveBg: 'rgba(255, 255, 255, 0.18)',
    appBg: '#f8fafc', // Slate 50 Clinical Canvas
    appBgDark: '#f1f5f9',
    bannerBg: 'linear-gradient(135deg, #082f49 0%, #0c4a6e 40%, #0284c7 100%)',
    badgeBg: '#e0f2fe',
    badgeText: '#0369a1',
    accentGradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    avatarBg: '#0284c7',
    dossierGradient: 'linear-gradient(135deg, #082f49 0%, #0c4a6e 45%, #0284c7 100%)',
    icon: '🌊',
  },
  olive: {
    id: 'olive',
    name: 'Warm Organic Olive & Cream',
    shortName: 'Warm Olive',
    tagline: 'Warm Earthy Clinical Atmosphere',
    primary: '#3c5e27', // Forest Olive
    primaryHover: '#324e21',
    primaryLight: '#f2f7ef',
    primaryDark: '#2a401d',
    sidebarBg: '#3c5e27',
    sidebarActiveBg: 'rgba(255, 255, 255, 0.20)',
    appBg: '#f7f4ed', // Warm Antique Cream
    appBgDark: '#ede9de',
    bannerBg: 'linear-gradient(135deg, #2a401d 0%, #3c5e27 60%, #4a7530 100%)',
    badgeBg: '#e1edd9',
    badgeText: '#2a401d',
    accentGradient: 'linear-gradient(135deg, #3c5e27 0%, #4a7530 100%)',
    avatarBg: '#4a7530',
    dossierGradient: 'linear-gradient(135deg, #1b2e13 0%, #2a401d 45%, #3c5e27 100%)',
    icon: '🌿',
  },
};

export const THEME_STORAGE_KEY = 'clinsyst_app_theme';

interface ThemeContextType {
  theme: AppTheme;
  themeConfig: ThemeConfig;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'blue' || saved === 'olive') return saved;
      }
    } catch {}
    return 'blue'; // Default to Modern Dental Blue & White matching landing page
  });

  const themeConfig = THEMES[theme];

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {}
  };

  const toggleTheme = () => {
    setTheme(theme === 'blue' ? 'olive' : 'blue');
  };

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);

    // Dynamic CSS variables injection across the application
    root.style.setProperty('--primary-color', themeConfig.primary);
    root.style.setProperty('--primary-hover', themeConfig.primaryHover);
    root.style.setProperty('--primary-light', themeConfig.primaryLight);
    root.style.setProperty('--primary-dark', themeConfig.primaryDark);
    root.style.setProperty('--sidebar-bg', themeConfig.sidebarBg);
    root.style.setProperty('--sidebar-active-bg', themeConfig.sidebarActiveBg);
    root.style.setProperty('--app-bg', themeConfig.appBg);
    root.style.setProperty('--app-bg-dark', themeConfig.appBgDark);
    root.style.setProperty('--banner-bg', themeConfig.bannerBg);
    root.style.setProperty('--cream', themeConfig.appBg);
    root.style.setProperty('--cream-dark', themeConfig.appBgDark);
    root.style.setProperty('--primary-700', themeConfig.primary);
    root.style.setProperty('--primary-600', themeConfig.primaryHover);
    root.style.setProperty('--primary-900', themeConfig.primaryDark);
    root.style.setProperty('--primary-50', themeConfig.primaryLight);
    root.style.setProperty('--avatar-bg', themeConfig.avatarBg);
    root.style.setProperty('--badge-bg', themeConfig.badgeBg);
    root.style.setProperty('--badge-text', themeConfig.badgeText);
    root.style.setProperty('--dossier-gradient', themeConfig.dossierGradient);
    root.style.setProperty('--accent-gradient', themeConfig.accentGradient);
  }, [theme, themeConfig]);

  return (
    <ThemeContext.Provider value={{ theme, themeConfig, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
