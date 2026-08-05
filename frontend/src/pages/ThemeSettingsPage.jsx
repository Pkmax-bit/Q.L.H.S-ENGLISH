import { useState, useRef, useMemo, useEffect } from 'react';
import { useTheme } from '../context/ThemeProvider';
import {
  Upload, Check, Palette, Image as ImageIcon, SlidersHorizontal, Trash2, Eye,
  Layers, ChevronDown, ChevronUp, Type, RotateCcw,
} from 'lucide-react';
import {
  BACKGROUND_PRESETS, CATEGORY_LABELS, TEXT_PALETTES, findPreset,
} from '../lib/backgroundPresets';

const SIDEBAR_STYLE_OPTIONS = [
  { id: 'solid', label: 'Đặc', desc: 'Sidebar tô màu đầy đủ — rõ ràng, tương phản cao.', emoji: '🧱' },
  { id: 'transparent', label: 'Trong suốt', desc: 'Xuyên thấu hình nền phía sau, blur nhẹ giữ chữ dễ đọc.', emoji: '🌫️' },
  { id: 'frosted', label: 'Bóng mờ kính', desc: 'Hiệu ứng kính mờ (frosted glass) — đẹp nhất khi có hình nền.', emoji: '✨' },
];

const CATEGORIES = ['education', 'pastel', 'minimal', 'landscape'];

export default function ThemeSettingsPage() {
  const {
    theme, changeTheme, setBackgroundImage, setOverlayOpacity, setSidebarStyle,
    setBgPreset, clearBackground, setTextColors, presets,
  } = useTheme();
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [expanded, setExpanded] = useState(false);

  const activePreset = useMemo(() => findPreset(theme.bgPreset), [theme.bgPreset]);
  const filteredPresets = useMemo(
    () => (activeTab === 'all' ? BACKGROUND_PRESETS : BACKGROUND_PRESETS.filter((p) => p.category === activeTab)),
    [activeTab],
  );

  useEffect(() => { setExpanded(false); }, [activeTab]);

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => { setBackgroundImage(ev.target.result); setUploading(false); };
    reader.readAsDataURL(file);
  };

  const overlayVal = parseFloat((theme.bgOverlay || '').match(/[\d.]+(?=\))/)?.[0] || 0);

  const restoreFactoryDefault = () => {
    const def = presets.find((p) => p.id === 'default') ?? presets[0];
    changeTheme({ ...def, bgPreset: null, bgImage: null });
  };

  const currentTextPalette = useMemo(() => {
    if (activePreset?.textTheme) return TEXT_PALETTES[activePreset.textTheme] || TEXT_PALETTES.dark;
    return {
      textHeading: theme.textHeading || '#292524',
      textBody: theme.textBody || '#44403c',
      textMuted: theme.textMuted || '#78716c',
      textCard: theme.textCard || '#1c1917',
    };
  }, [activePreset, theme]);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="app-page-title flex items-center gap-2">
          <Palette className="h-6 w-6 text-amber-600" /> Giao diện & Hình nền
        </h1>
        <p className="app-page-subtitle">
          Chọn hình nền, điều chỉnh độ mờ và hiệu ứng menu — lưu tự động trên trình duyệt.
        </p>
        {(theme.bgPreset || theme.bgImage) && (
          <button
            type="button"
            onClick={restoreFactoryDefault}
            className="mt-4 h-9 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium flex items-center gap-2 cursor-pointer border border-stone-300"
          >
            🔄 Khôi phục mặc định
          </button>
        )}
      </div>

      {/* Bảng màu chủ đề */}
      <div className="app-card p-5">
        <h2 className="text-base font-bold text-[var(--color-text-heading)] mb-3">Bảng màu chủ đề</h2>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => changeTheme({ ...p, bgPreset: theme.bgPreset, bgImage: theme.bgImage, bgOverlay: theme.bgOverlay, sidebarStyle: theme.sidebarStyle })}
              className={`h-9 px-4 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
                theme.id === p.id && !theme.bgPreset && !theme.bgImage
                  ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-200'
                  : 'border-stone-200 bg-white/70 text-stone-700 hover:border-amber-300'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Hình nền */}
      <div className="app-card p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base font-bold text-[var(--color-text-heading)] flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Chọn hình nền
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Giáo dục, Pastel, Tối giản hoặc Phong cảnh 4K. Màu chữ tự điều chỉnh để dễ đọc.
            </p>
          </div>
          {(activePreset || theme.bgImage) && (
            <button
              type="button"
              onClick={clearBackground}
              className="shrink-0 h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" /> Xoá nền
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-0 mb-4 border-b border-amber-200/50">
          {[
            { id: 'all', label: `🗂️ Tất cả (${BACKGROUND_PRESETS.length})` },
            ...CATEGORIES.map((c) => ({
              id: c,
              label: `${CATEGORY_LABELS[c]} (${BACKGROUND_PRESETS.filter((p) => p.category === c).length})`,
            })),
            { id: 'upload', label: '⬆️ Tải ảnh riêng' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors cursor-pointer -mb-px border-b-2 ${
                activeTab === t.id
                  ? 'text-amber-800 border-amber-500 bg-amber-50/50'
                  : 'text-stone-500 border-transparent hover:text-stone-700 hover:bg-stone-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'upload' ? (
          <div className="flex flex-wrap gap-4 items-start">
            <div
              className="w-64 h-40 rounded-xl border-2 border-dashed border-amber-200 overflow-hidden relative flex items-center justify-center bg-amber-50/50"
              style={theme.bgImage ? { backgroundImage: `url(${theme.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
            >
              {!theme.bgImage && (
                <div className="text-center">
                  <ImageIcon className="h-8 w-8 text-amber-300 mx-auto mb-2" />
                  <p className="text-xs text-stone-400">Chưa có hình nền tự tải</p>
                </div>
              )}
              {theme.bgImage && <div className="absolute inset-0" style={{ backgroundColor: theme.bgOverlay }} />}
            </div>
            <div className="flex-1 space-y-3 min-w-[200px]">
              <input type="file" ref={fileRef} accept="image/*" onChange={handleUpload} className="hidden" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="h-10 px-5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer"
              >
                <Upload className="h-4 w-4" /> {uploading ? 'Đang tải…' : 'Chọn hình từ máy'}
              </button>
              {theme.bgImage && (
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    <SlidersHorizontal className="h-3 w-3 inline mr-1" />
                    Độ phủ tối (giúp chữ rõ hơn): {Math.round(overlayVal * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.8"
                    step="0.02"
                    value={overlayVal}
                    onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                    className="w-full accent-amber-600"
                  />
                </div>
              )}
              <p className="text-[11px] text-stone-400">Hỗ trợ JPG / PNG / WebP. Khuyến nghị ≥ 1920×1080.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {expanded ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredPresets.map((preset) => (
                  <PresetTile key={preset.id} preset={preset} active={activePreset?.id === preset.id} onClick={() => setBgPreset(preset.id)} />
                ))}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] snap-x snap-mandatory">
                {filteredPresets.map((preset) => (
                  <div key={preset.id} className="shrink-0 w-44 snap-start">
                    <PresetTile preset={preset} active={activePreset?.id === preset.id} onClick={() => setBgPreset(preset.id)} />
                  </div>
                ))}
              </div>
            )}
            {filteredPresets.length > 4 && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="inline-flex items-center gap-1.5 h-8 px-4 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full cursor-pointer transition-colors"
                >
                  {expanded ? <><ChevronUp className="h-3.5 w-3.5" /> Thu gọn</> : <><ChevronDown className="h-3.5 w-3.5" /> Xem thêm ({filteredPresets.length} hình)</>}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <TextColorSection theme={theme} activePreset={activePreset} onApply={setTextColors} />

      {/* Sidebar style */}
      <div className="app-card p-5">
        <div className="mb-4">
          <h2 className="text-base font-bold text-[var(--color-text-heading)] flex items-center gap-2">
            <Layers className="h-4 w-4" /> Hiệu ứng menu (sidebar)
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Chọn cách hiển thị thanh điều hướng bên trái. Bóng mờ kính đẹp nhất khi có hình nền.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SIDEBAR_STYLE_OPTIONS.map((opt) => {
            const active = (theme.sidebarStyle || 'frosted') === opt.id;
            const bgPreview =
              activePreset?.thumb || activePreset?.gradient
              || (theme.bgImage ? `url(${theme.bgImage})` : 'linear-gradient(135deg, #fcf8eb 0%, #f5ecc7 50%, #f1d475 100%)');
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSidebarStyle(opt.id)}
                className={`relative p-3 rounded-xl border-2 transition-all cursor-pointer text-left ${
                  active ? 'border-amber-500 ring-2 ring-amber-200 shadow-md' : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <div
                  className="relative h-20 rounded-lg overflow-hidden mb-2 border border-stone-200"
                  style={
                    bgPreview.startsWith('url') || bgPreview.startsWith('http')
                      ? { backgroundImage: bgPreview.startsWith('url') ? bgPreview : `url(${bgPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : { background: bgPreview }
                  }
                >
                  <div
                    className="absolute inset-y-0 left-0 w-1/3 flex flex-col gap-1 p-1.5"
                    style={{
                      backgroundColor:
                        opt.id === 'solid'
                          ? (activePreset?.sidebar || theme.sidebar)
                          : opt.id === 'transparent'
                            ? `${activePreset?.sidebar || theme.sidebar}48`
                            : `${activePreset?.sidebar || theme.sidebar}80`,
                      backdropFilter:
                        opt.id === 'frosted' ? 'blur(8px) saturate(180%)'
                          : opt.id === 'transparent' ? 'blur(3px) saturate(130%)' : 'none',
                      WebkitBackdropFilter:
                        opt.id === 'frosted' ? 'blur(8px) saturate(180%)'
                          : opt.id === 'transparent' ? 'blur(3px) saturate(130%)' : 'none',
                    }}
                  >
                    <div className="h-1.5 rounded bg-white/85" />
                    <div className="h-1.5 rounded bg-white/55" />
                    <div className="h-1.5 rounded bg-white/35" />
                    <div className="h-1.5 rounded bg-white/55" />
                  </div>
                </div>
                <p className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                  <span aria-hidden>{opt.emoji}</span>
                  <span>{opt.label}</span>
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">{opt.desc}</p>
                {active && (
                  <span className="absolute top-2 right-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-500 text-white shadow-sm">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live preview */}
      <div className="app-card p-5">
        <h2 className="text-base font-bold text-[var(--color-text-heading)] mb-2 flex items-center gap-2">
          <Eye className="h-4 w-4" /> Xem trước
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          {activePreset
            ? `Đang dùng: ${activePreset.name} · màu chữ ${activePreset.textTheme === 'light' ? 'sáng' : 'tối'}.`
            : 'Chưa chọn hình nền — đang dùng nền mặc định.'}
        </p>
        <div className="rounded-xl overflow-hidden border border-amber-200/50" style={{ minHeight: 240 }}>
          <div className="flex h-full">
            <div className="w-14 flex-shrink-0" style={{ backgroundColor: activePreset?.sidebar || theme.sidebar }}>
              <div className="p-2 space-y-2 mt-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-2 rounded-full"
                    style={{
                      backgroundColor: i === 1 ? (activePreset?.accent || theme.sidebarActive) : '#ffffff',
                      opacity: i === 1 ? 0.9 : 0.35,
                    }}
                  />
                ))}
              </div>
            </div>
            <div
              className="flex-1 relative"
              style={
                activePreset?.type === 'image'
                  ? { backgroundImage: `url(${activePreset.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : activePreset?.type === 'gradient'
                    ? { background: activePreset.gradient }
                    : theme.bgImage
                      ? { backgroundImage: `url(${theme.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: theme.pageBg }
                      : { backgroundColor: theme.pageBg }
              }
            >
              {activePreset?.type === 'image' && (
                <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }} />
              )}
              {theme.bgImage && !activePreset && (
                <div className="absolute inset-0" style={{ backgroundColor: theme.bgOverlay }} />
              )}
              <div className="relative p-5 space-y-4">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: currentTextPalette.textHeading }}>Mẫu tiêu đề</h2>
                  <p className="text-sm mt-1" style={{ color: currentTextPalette.textMuted }}>Chữ phụ mẫu — Q.L.H.S English</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { title: 'Lớp học', value: '12' },
                    { title: 'Học sinh', value: '248' },
                    { title: 'Bài tập', value: '36' },
                  ].map((card) => (
                    <div key={card.title} className="bg-white/75 backdrop-blur-sm rounded-lg border border-white/40 p-3">
                      <p className="text-xs font-medium text-stone-600">{card.title}</p>
                      <p className="text-2xl font-bold mt-1 text-stone-900">{card.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TextColorSection({ theme, activePreset, onApply }) {
  const autoPalette = useMemo(() => {
    if (activePreset?.textTheme) return TEXT_PALETTES[activePreset.textTheme] || TEXT_PALETTES.dark;
    return { textHeading: '#292524', textBody: '#44403c', textMuted: '#78716c', textCard: '#1c1917' };
  }, [activePreset]);

  const [colors, setColors] = useState(() => ({
    textHeading: theme.textHeading || autoPalette.textHeading,
    textBody: theme.textBody || autoPalette.textBody,
    textMuted: theme.textMuted || autoPalette.textMuted,
    textCard: theme.textCard || autoPalette.textCard,
  }));

  useEffect(() => {
    const hasOverride = theme.textHeading || theme.textBody || theme.textMuted || theme.textCard;
    if (!hasOverride) {
      setColors({
        textHeading: autoPalette.textHeading,
        textBody: autoPalette.textBody,
        textMuted: autoPalette.textMuted,
        textCard: autoPalette.textCard,
      });
    }
  }, [autoPalette, theme.textHeading, theme.textBody, theme.textMuted, theme.textCard]);

  const isOverridden = !!(theme.textHeading || theme.textBody || theme.textMuted || theme.textCard);

  const fields = [
    { k: 'textHeading', label: 'Tiêu đề', sample: 'Mẫu tiêu đề', cls: 'text-sm font-bold' },
    { k: 'textBody', label: 'Nội dung chính', sample: 'Mẫu nội dung', cls: 'text-sm' },
    { k: 'textMuted', label: 'Chữ phụ', sample: 'Mẫu chữ phụ', cls: 'text-xs' },
    { k: 'textCard', label: 'Chữ trong card', sample: 'Mẫu card', cls: 'text-sm' },
  ];

  return (
    <div className="app-card p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base font-bold text-[var(--color-text-heading)] flex items-center gap-2">
            <Type className="h-4 w-4" /> Màu chữ
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {isOverridden ? 'Đang dùng màu tùy chỉnh.' : 'Tự động theo nền — có thể chỉnh thủ công.'}
          </p>
        </div>
        {isOverridden && (
          <button
            type="button"
            onClick={() => onApply({ textHeading: null, textBody: null, textMuted: null, textCard: null })}
            className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Khôi phục auto
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {fields.map(({ k, label, sample, cls }) => (
          <div key={k} className="rounded-lg border border-stone-200 p-2.5">
            <label className="block text-[11px] font-medium text-stone-600 mb-1.5">{label}</label>
            <div className="flex items-center gap-2">
              <input type="color" value={colors[k]} onChange={(e) => setColors((p) => ({ ...p, [k]: e.target.value }))} className="w-9 h-9 rounded-md cursor-pointer border-0 p-0" />
              <input type="text" value={colors[k]} onChange={(e) => setColors((p) => ({ ...p, [k]: e.target.value }))} className="flex-1 min-w-0 h-9 px-2 border border-stone-200 rounded-md text-xs font-mono" />
            </div>
            <p className={`mt-2 truncate ${cls}`} style={{ color: colors[k] }}>{sample}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => onApply(colors)} className="h-10 px-5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer">
          <Check className="h-4 w-4" /> Áp dụng màu chữ
        </button>
        <button
          type="button"
          onClick={() => setColors({ textHeading: autoPalette.textHeading, textBody: autoPalette.textBody, textMuted: autoPalette.textMuted, textCard: autoPalette.textCard })}
          className="h-10 px-4 bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 rounded-lg text-sm font-medium cursor-pointer"
        >
          ↺ Dùng màu gợi ý
        </button>
      </div>
    </div>
  );
}

function PresetTile({ preset, active, onClick }) {
  const isImage = preset.type === 'image';
  const bg = preset.thumb || preset.gradient || preset.image;
  const isUrl = typeof bg === 'string' && (bg.startsWith('http') || bg.startsWith('data:'));

  return (
    <button
      type="button"
      onClick={onClick}
      title={preset.name}
      className={`group relative rounded-xl border-2 overflow-hidden transition-all cursor-pointer text-left bg-white ${
        active ? 'border-amber-500 ring-2 ring-amber-200 shadow-md' : 'border-stone-200 hover:border-amber-300 hover:shadow'
      }`}
    >
      <div
        className="h-28 w-full relative"
        style={isUrl ? { backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: bg }}
      >
        {isImage && (
          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-black/65 text-white text-[9px] font-bold rounded-full backdrop-blur-sm">4K</span>
        )}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      </div>
      <div className="px-2.5 py-2">
        <p className="text-xs font-semibold text-stone-800 truncate">{preset.name}</p>
        <p className="text-[10px] text-stone-400 mt-0.5">{CATEGORY_LABELS[preset.category]}</p>
      </div>
      {active && (
        <span className="absolute top-1.5 left-1.5 inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-500 text-white shadow-md">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}
