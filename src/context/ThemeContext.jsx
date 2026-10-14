import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  loadOSSettings,
  saveOSSettings,
  normalizeSettings,
} from '../os/settings/settingsConfig.js';
const ThemeContext = createContext();
export const ThemeProvider = ({ children }) => {
  const [preference, setTheme] = useState(() => loadOSSettings().theme);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  const theme =
    preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const change = () => setSystemDark(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    const sync = (event) =>
      setTheme(
        event.detail
          ? normalizeSettings(event.detail).theme
          : loadOSSettings().theme,
      );
    window.addEventListener('elyx:settings-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('elyx:settings-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  const changeTheme = (next) => {
    if (!['light', 'dark', 'system'].includes(next)) return;
    const settings = { ...loadOSSettings(), theme: next };
    saveOSSettings(settings);
    window.dispatchEvent(
      new CustomEvent('elyx:settings-changed', { detail: settings }),
    );
    setTheme(next);
  };
  return (
    <ThemeContext.Provider
      value={{
        theme,
        preference,
        setTheme: changeTheme,
        toggleTheme: () => changeTheme(theme === 'dark' ? 'light' : 'dark'),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
