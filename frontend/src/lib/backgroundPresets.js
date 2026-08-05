/**
 * Preset hình nền cho Q.L.H.S English — gradient, pastel, phong cảnh 4K.
 */

export const TEXT_PALETTES = {
  light: {
    textHeading: '#ffffff',
    textBody: '#fef3c7',
    textMuted: '#d6c48a',
    textCard: '#ffffff',
  },
  dark: {
    textHeading: '#292524',
    textBody: '#44403c',
    textMuted: '#78716c',
    textCard: '#1c1917',
  },
};

function unsplash(id, w = 3840) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;
}

export const BACKGROUND_PRESETS = [
  {
    id: 'edu-ink',
    name: 'Mực học thuật',
    category: 'education',
    type: 'gradient',
    gradient: 'linear-gradient(145deg, #f3f5f7 0%, #e8eef4 45%, #d5ebf1 100%)',
    textTheme: 'dark',
    accent: '#1a6b8a',
    sidebar: '#0c1f33',
    thumb: 'linear-gradient(135deg, #f3f5f7, #d5ebf1, #1a6b8a)',
  },
  {
    id: 'edu-amber',
    name: 'Vàng học thuật',
    category: 'education',
    type: 'gradient',
    gradient: 'linear-gradient(135deg, #fcf8eb 0%, #f5ecc7 40%, #f1d475 100%)',
    textTheme: 'dark',
    accent: '#d0a331',
    sidebar: '#624923',
    thumb: 'linear-gradient(135deg, #fcf8eb, #f5ecc7, #f1d475)',
  },
  {
    id: 'edu-library',
    name: 'Thư viện cổ điển',
    category: 'education',
    type: 'gradient',
    gradient: 'linear-gradient(135deg, #3d2b1f 0%, #5c4520 50%, #947031 100%)',
    textTheme: 'light',
    accent: '#deb23d',
    sidebar: '#3d2b1f',
    thumb: 'linear-gradient(135deg, #3d2b1f, #5c4520, #947031)',
  },
  {
    id: 'edu-sky',
    name: 'Trời trong xanh',
    category: 'education',
    type: 'gradient',
    gradient: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #7dd3fc 100%)',
    textTheme: 'dark',
    accent: '#0284c7',
    sidebar: '#0c4a6e',
    thumb: 'linear-gradient(135deg, #e0f2fe, #bae6fd, #7dd3fc)',
  },
  {
    id: 'pastel-peach',
    name: 'Pastel đào',
    category: 'pastel',
    type: 'gradient',
    gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    textTheme: 'dark',
    accent: '#f97316',
    sidebar: '#7c2d12',
    thumb: 'linear-gradient(135deg, #ffecd2, #fcb69f)',
  },
  {
    id: 'pastel-mint',
    name: '🌿 Pastel bạc hà',
    category: 'pastel',
    type: 'gradient',
    gradient: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)',
    textTheme: 'dark',
    accent: '#16a34a',
    sidebar: '#14532d',
    thumb: 'linear-gradient(135deg, #d4fc79, #96e6a1)',
  },
  {
    id: 'pastel-lavender',
    name: '💜 Pastel oải hương',
    category: 'pastel',
    type: 'gradient',
    gradient: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
    textTheme: 'dark',
    accent: '#7c3aed',
    sidebar: '#4c1d95',
    thumb: 'linear-gradient(135deg, #e0c3fc, #8ec5fc)',
  },
  {
    id: 'min-midnight',
    name: '🌃 Nửa đêm',
    category: 'minimal',
    type: 'gradient',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    textTheme: 'light',
    accent: '#60a5fa',
    sidebar: '#0a0f1c',
    thumb: 'linear-gradient(135deg, #0f172a, #1e293b)',
  },
  {
    id: 'min-ocean',
    name: '🌊 Đại dương',
    category: 'minimal',
    type: 'gradient',
    gradient: 'linear-gradient(135deg, #001e3c 0%, #003366 100%)',
    textTheme: 'light',
    accent: '#3b82f6',
    sidebar: '#001528',
    thumb: 'linear-gradient(135deg, #001e3c, #003366)',
  },
  {
    id: 'land-library',
    name: '📖 Thư viện 4K',
    category: 'landscape',
    type: 'image',
    image: unsplash('photo-1481627834876-b7833e8f5570'),
    thumb: unsplash('photo-1481627834876-b7833e8f5570', 320),
    textTheme: 'light',
    accent: '#d0a331',
    sidebar: '#3d2b1f',
    overlay: 'rgba(0,0,0,0.2)',
  },
  {
    id: 'land-classroom',
    name: '🎓 Lớp học',
    category: 'landscape',
    type: 'image',
    image: unsplash('photo-1523050854058-8df90110c9f1'),
    thumb: unsplash('photo-1523050854058-8df90110c9f1', 320),
    textTheme: 'light',
    accent: '#2563eb',
    sidebar: '#1e3a8a',
    overlay: 'rgba(0,0,0,0.15)',
  },
  {
    id: 'land-mountain',
    name: '🏔️ Núi & hồ',
    category: 'landscape',
    type: 'image',
    image: unsplash('photo-1464822759023-fed622ff2c3b'),
    thumb: unsplash('photo-1464822759023-fed622ff2c3b', 320),
    textTheme: 'light',
    accent: '#06b6d4',
    sidebar: '#0c1b29',
    overlay: 'rgba(0,0,0,0.15)',
  },
  {
    id: 'land-forest',
    name: '🌲 Rừng tia nắng',
    category: 'landscape',
    type: 'image',
    image: unsplash('photo-1448375240586-882707db888b'),
    thumb: unsplash('photo-1448375240586-882707db888b', 320),
    textTheme: 'light',
    accent: '#10b981',
    sidebar: '#102218',
    overlay: 'rgba(0,0,0,0.15)',
  },
];

export function findPreset(id) {
  if (!id) return null;
  return BACKGROUND_PRESETS.find((p) => p.id === id) || null;
}

export const CATEGORY_LABELS = {
  education: '📚 Giáo dục',
  pastel: '🎨 Pastel nhẹ',
  minimal: '🪟 Tối giản',
  landscape: '🏞️ Phong cảnh 4K',
};
