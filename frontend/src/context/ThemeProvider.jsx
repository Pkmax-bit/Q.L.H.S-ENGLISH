import {
  createContext, useContext, useState, useEffect, useLayoutEffect, useRef,
} from 'react';
import { useAuth } from '../hooks/useAuth';
import { findPreset, TEXT_PALETTES } from '../lib/backgroundPresets';

const ThemeContext = createContext();

const PRESET_THEMES = [
  {
    id: 'default',
    name: 'Academic ink',
    sidebar: '#0c1f33',
    sidebarHover: '#132f4c',
    sidebarActive: '#1a4568',
    sidebarText: '#e8eef4',
    pageBg: '#f3f5f7',
    accent: '#1a6b8a',
    textHeading: '#0c1f33',
    textBody: '#334155',
    textMuted: '#64748b',
    textCard: '#1e293b',
    bgImage: null,
    bgOverlay: 'rgba(0,0,0,0)',
    sidebarStyle: 'frosted',
  },
  {
    id: 'warm',
    name: 'Ấm áp',
    sidebar: '#7c2d12',
    sidebarHover: '#9a3412',
    sidebarActive: '#c2410c',
    sidebarText: '#ffffff',
    pageBg: '#fff7ed',
    accent: '#ea580c',
    textHeading: '#431407',
    textBody: '#7c2d12',
    textMuted: '#a16207',
    textCard: '#431407',
    bgImage: null,
    bgOverlay: 'rgba(0,0,0,0)',
    sidebarStyle: 'frosted',
  },
  {
    id: 'gold',
    name: 'Trung tâm Anh ngữ',
    sidebar: '#624923',
    sidebarHover: '#785b29',
    sidebarActive: '#947031',
    sidebarText: '#ffffff',
    pageBg: '#fcf8eb',
    accent: '#d0a331',
    textHeading: '#292524',
    textBody: '#44403c',
    textMuted: '#78716c',
    textCard: '#1c1917',
    bgImage: null,
    bgOverlay: 'rgba(0,0,0,0)',
    sidebarStyle: 'frosted',
  },
  {
    id: 'ocean',
    name: 'Đại dương',
    sidebar: '#0c2d48',
    sidebarHover: '#14394f',
    sidebarActive: '#1a4a6e',
    sidebarText: '#ffffff',
    pageBg: '#e8f4f8',
    accent: '#0ea5e9',
    textHeading: '#0c2d48',
    textBody: '#1e4b6e',
    textMuted: '#5a8faa',
    textCard: '#0f3652',
    bgImage: null,
    bgOverlay: 'rgba(0,0,0,0)',
    sidebarStyle: 'frosted',
  },
  {
    id: 'forest',
    name: 'Rừng xanh',
    sidebar: '#1a2e1a',
    sidebarHover: '#243824',
    sidebarActive: '#2d4a2d',
    sidebarText: '#ffffff',
    pageBg: '#f0f5f0',
    accent: '#16a34a',
    textHeading: '#1a2e1a',
    textBody: '#2d4a2d',
    textMuted: '#5a7a5a',
    textCard: '#1f3a1f',
    bgImage: null,
    bgOverlay: 'rgba(0,0,0,0)',
    sidebarStyle: 'frosted',
  },
  {
    id: 'dark',
    name: 'Tối',
    sidebar: '#111111',
    sidebarHover: '#1a1a1a',
    sidebarActive: '#2a2a2a',
    sidebarText: '#ffffff',
    pageBg: '#1e1e1e',
    accent: '#4a95ad',
    textHeading: '#f0f0f0',
    textBody: '#d0d0d0',
    textMuted: '#888888',
    textCard: '#e0e0e0',
    bgImage: null,
    bgOverlay: 'rgba(0,0,0,0)',
    sidebarStyle: 'frosted',
  },
];

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  if (!Number.isFinite(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgba(hex, alpha) {
  const c = hexToRgb(hex);
  if (!c) return hex;
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
}

function resolveBgPreset(theme) {
  return findPreset(theme?.bgPreset);
}

function applyTheme(theme) {
  const root = document.documentElement;
  const preset = resolveBgPreset(theme);

  const sidebarStyle = theme.sidebarStyle || 'frosted';
  const sidebarBase = preset?.sidebar || theme.sidebar;
  let sidebarBg = sidebarBase;
  let sidebarHover = theme.sidebarHover;
  let sidebarActive = theme.sidebarActive;
  let backdropFilter = 'none';

  if (sidebarStyle === 'frosted') {
    sidebarBg = rgba(sidebarBase, 0.58);
    sidebarHover = rgba(sidebarBase, 0.78);
    sidebarActive = rgba(theme.sidebarActive, 0.88);
    backdropFilter = 'blur(22px) saturate(180%)';
  } else if (sidebarStyle === 'transparent') {
    sidebarBg = rgba(sidebarBase, 0.28);
    sidebarHover = rgba(sidebarBase, 0.5);
    sidebarActive = rgba(theme.sidebarActive, 0.7);
    backdropFilter = 'blur(8px) saturate(130%)';
  }

  root.style.setProperty('--color-sidebar', sidebarBg);
  root.style.setProperty('--color-sidebar-hover', sidebarHover);
  root.style.setProperty('--color-sidebar-active', sidebarActive);
  root.style.setProperty('--sidebar-backdrop', backdropFilter);
  root.style.setProperty('--color-sidebar-text', theme.sidebarText || '#ffffff');
  root.style.setProperty('--color-sidebar-text-active', '#ffffff');
  root.style.setProperty('--color-page-bg', theme.pageBg);
  const accent = preset?.accent || theme.accent;
  root.style.setProperty('--color-primary-600', accent);
  root.style.setProperty('--color-primary-500', accent);
  root.style.setProperty('--color-primary-700', accent);

  const hasBg = !!(preset || theme.bgImage);
  const headerBg = hasBg ? 'rgba(255, 255, 255, 0.55)' : '#ffffff';
  const headerBackdrop = hasBg ? 'blur(16px) saturate(160%)' : 'blur(12px)';
  root.style.setProperty('--color-topbar', headerBg);
  root.style.setProperty('--header-backdrop', headerBackdrop);

  const palette = preset ? TEXT_PALETTES[preset.textTheme] || TEXT_PALETTES.dark : null;
  root.style.setProperty('--color-text-heading', theme.textHeading || palette?.textHeading || '#292524');
  root.style.setProperty('--color-text-body', theme.textBody || palette?.textBody || '#44403c');
  root.style.setProperty('--color-text-muted', theme.textMuted || palette?.textMuted || '#78716c');
  root.style.setProperty('--color-text-card', theme.textCard || palette?.textCard || '#1c1917');

  if (preset?.type === 'gradient' && preset.gradient) {
    root.style.setProperty('--bg-image', preset.gradient);
    root.style.setProperty('--bg-image-mode', 'gradient');
    root.style.setProperty('--bg-overlay', 'rgba(0,0,0,0)');
  } else if (preset?.type === 'image' && preset.image) {
    root.style.setProperty('--bg-image', `url(${preset.image})`);
    root.style.setProperty('--bg-image-mode', 'image');
    root.style.setProperty('--bg-overlay', preset.overlay || 'rgba(0,0,0,0.15)');
  } else if (theme.bgImage) {
    root.style.setProperty('--bg-image', `url(${theme.bgImage})`);
    root.style.setProperty('--bg-image-mode', 'image');
    root.style.setProperty('--bg-overlay', theme.bgOverlay || 'rgba(0,0,0,0.03)');
  } else {
    root.style.setProperty('--bg-image', 'none');
    root.style.setProperty('--bg-image-mode', 'none');
    root.style.setProperty('--bg-overlay', 'rgba(0,0,0,0)');
  }

  root.style.setProperty('--scrollbar-thumb', theme.id === 'dark' ? '#444' : '#c1c9d6');
  root.style.setProperty('--scrollbar-hover', theme.id === 'dark' ? '#666' : '#a0aec0');

  const hasCustomBg = !!(preset || theme.bgImage);
  root.classList.toggle('has-custom-bg', hasCustomBg);
}

const STORAGE_KEY = 'qlhs_theme_v2';

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const skipNextThemePersist = useRef(false);
  const [theme, setTheme] = useState(() => {
    try {
      const userKey = `${STORAGE_KEY}_${user?.id || 'guest'}`;
      const saved = localStorage.getItem(userKey) || localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return PRESET_THEMES[0];
  });

  useLayoutEffect(() => {
    const uid = user?.id || 'guest';
    const userKey = `${STORAGE_KEY}_${uid}`;
    try {
      const saved = localStorage.getItem(userKey) || localStorage.getItem(STORAGE_KEY);
      skipNextThemePersist.current = true;
      if (saved) setTheme(JSON.parse(saved));
      else setTheme(PRESET_THEMES[0]);
    } catch {
      skipNextThemePersist.current = true;
      setTheme(PRESET_THEMES[0]);
    }
  }, [user?.id]);

  useEffect(() => {
    applyTheme(theme);
    if (skipNextThemePersist.current) {
      skipNextThemePersist.current = false;
      return;
    }
    try {
      const userKey = `${STORAGE_KEY}_${user?.id || 'guest'}`;
      localStorage.setItem(userKey, JSON.stringify(theme));
    } catch { /* ignore */ }
  }, [theme, user?.id]);

  const changeTheme = (themeOrId) => {
    let newTheme;
    if (typeof themeOrId === 'string') {
      newTheme = PRESET_THEMES.find((t) => t.id === themeOrId);
    } else {
      newTheme = themeOrId;
    }
    if (newTheme) setTheme(newTheme);
  };

  const setBackgroundImage = (imageUrl) => {
    setTheme({ ...theme, id: 'custom', bgImage: imageUrl, bgOverlay: 'rgba(0,0,0,0.03)' });
  };

  const setOverlayOpacity = (opacity) => {
    setTheme({ ...theme, bgOverlay: `rgba(0,0,0,${opacity})` });
  };

  const setTextColors = (colors) => {
    setTheme((prev) => {
      const next = { ...prev };
      Object.keys(colors || {}).forEach((k) => {
        if (colors[k] === null || colors[k] === undefined) delete next[k];
        else next[k] = colors[k];
      });
      return next;
    });
  };

  const setSidebarStyle = (style) => {
    if (!['solid', 'transparent', 'frosted'].includes(style)) return;
    setTheme({ ...theme, sidebarStyle: style });
  };

  const setBgPreset = (presetId) => {
    setTheme((prev) => ({ ...prev, bgPreset: presetId, bgImage: null }));
  };

  const clearBackground = () => {
    setTheme((prev) => ({ ...prev, bgPreset: null, bgImage: null, bgOverlay: 'rgba(0,0,0,0)' }));
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        changeTheme,
        setBackgroundImage,
        setOverlayOpacity,
        setTextColors,
        setSidebarStyle,
        setBgPreset,
        clearBackground,
        presets: PRESET_THEMES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export { PRESET_THEMES };
