import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = 'chatcom-theme';

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  } catch {
    return 'dark';
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Theme still works for this session if storage is unavailable.
    }
  }, [theme]);

  const toggleTheme = useCallback((anchorElement) => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const updateTheme = () => {
      root.dataset.theme = nextTheme;
      root.style.colorScheme = nextTheme;
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch {
        // Ignore storage restrictions and apply the theme in memory.
      }
      setTheme(nextTheme);
    };

    const rect = anchorElement?.getBoundingClientRect?.();
    if (rect) {
      root.style.setProperty('--theme-origin-x', `${rect.left + rect.width / 2}px`);
      root.style.setProperty('--theme-origin-y', `${rect.top + rect.height / 2}px`);
    } else {
      root.style.setProperty('--theme-origin-x', '50vw');
      root.style.setProperty('--theme-origin-y', '50vh');
    }

    if (!reducedMotion && typeof document.startViewTransition === 'function') {
      document.startViewTransition(() => flushSync(updateTheme));
    } else {
      updateTheme();
    }
  }, [theme]);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used within ThemeProvider.');
  return value;
};
