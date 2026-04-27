import { useEffect, useMemo, useState } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { loadAppSetting, saveAppSetting } from '../utils/appSettings.js';
import AppIcon from './AppIcon.jsx';

const EXTRA_KEYWORDS = {
  '🐶': ['dog', 'puppy', 'pet'],
  '🐱': ['cat', 'kitty', 'pet'],
  '🏠': ['house', 'home'],
  '🏦': ['bank', 'checking', 'savings'],
  '💳': ['card', 'credit', 'debit'],
  '🚗': ['car', 'auto', 'vehicle'],
  '🍽️': ['food', 'meal', 'dining'],
  '🛒': ['shopping', 'groceries', 'store'],
  '🏥': ['health', 'medical', 'hospital'],
  '✈️': ['travel', 'flight', 'plane'],
  '🎓': ['school', 'education', 'college'],
  '💡': ['electric', 'utility', 'power'],
};

function toKey(value) {
  return String(value || '').trim().toLowerCase();
}

function tokenizeLabel(label) {
  return String(label || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function normalizeIconData(options = [], groups = {}) {
  const map = new Map();

  const upsert = (emoji, keywords = []) => {
    if (!emoji) return;
    if (!map.has(emoji)) map.set(emoji, { emoji, keywords: [] });
    const item = map.get(emoji);
    const merged = new Set([
      ...item.keywords,
      ...keywords.map(toKey),
      ...(EXTRA_KEYWORDS[emoji] || []).map(toKey),
    ]);
    item.keywords = Array.from(merged).filter(Boolean);
  };

  options.forEach((entry) => {
    if (typeof entry === 'string') {
      upsert(entry);
    } else if (entry && typeof entry === 'object') {
      upsert(entry.emoji, Array.isArray(entry.keywords) ? entry.keywords : []);
    }
  });

  Object.entries(groups || {}).forEach(([groupName, entries]) => {
    const groupTokens = tokenizeLabel(groupName);

    (entries || []).forEach((entry) => {
      if (typeof entry === 'string') {
        upsert(entry, groupTokens);
      } else if (entry && typeof entry === 'object') {
        const k = Array.isArray(entry.keywords) ? entry.keywords : [];
        upsert(entry.emoji, [...k, ...groupTokens]);
      }
    });
  });

  return Array.from(map.values());
}

function normalizeCustomIconValue(value) {
  return String(value || '').trim();
}

function customKeywordsForValue(value) {
  const text = normalizeCustomIconValue(value);
  if (!text) return ['custom', 'user', 'personal'];
  if (/^[A-Z][A-Za-z0-9]+$/.test(text)) {
    return ['custom', 'user', 'personal', 'library', 'react-icons', ...tokenizeLabel(text)];
  }
  return ['custom', 'user', 'personal'];
}

export default function IconPicker({
  value,
  onChange,
  options = [],
  groups = {},
  storageKey = 'icon_picker',
}) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('All');
  const [showFullLibrary, setShowFullLibrary] = useState(false);
  const [customDraft, setCustomDraft] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [recent, setRecent] = useState([]);
  const [customIcons, setCustomIcons] = useState([]);
  const [favoritesLoadedKey, setFavoritesLoadedKey] = useState(null);
  const [recentLoadedKey, setRecentLoadedKey] = useState(null);
  const [customLoadedKey, setCustomLoadedKey] = useState(null);

  const customEntries = useMemo(
    () => customIcons.map((emoji) => ({ emoji, keywords: customKeywordsForValue(emoji) })),
    [customIcons],
  );

  const allIcons = useMemo(
    () => normalizeIconData([...options, ...customEntries], groups),
    [options, customEntries, groups],
  );
  const iconByEmoji = useMemo(() => {
    const map = new Map();
    allIcons.forEach((i) => map.set(i.emoji, i));
    return map;
  }, [allIcons]);

  const groupTabs = useMemo(() => Object.keys(groups || {}), [groups]);
  const tabs = ['Recent', 'Favorites', 'All', ...groupTabs];

  useEffect(() => {
    let cancelled = false;
    loadAppSetting(`${storageKey}_favorites`, [], `${storageKey}_favorites`).then((value) => {
      if (!cancelled) {
        setFavorites(Array.isArray(value) ? value : []);
        setFavoritesLoadedKey(storageKey);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  useEffect(() => {
    let cancelled = false;
    loadAppSetting(`${storageKey}_recent`, [], `${storageKey}_recent`).then((value) => {
      if (!cancelled) {
        setRecent(Array.isArray(value) ? value : []);
        setRecentLoadedKey(storageKey);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  useEffect(() => {
    let cancelled = false;
    loadAppSetting(`${storageKey}_custom`, [], `${storageKey}_custom`).then((value) => {
      if (!cancelled) {
        setCustomIcons(Array.isArray(value) ? value : []);
        setCustomLoadedKey(storageKey);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  useEffect(() => {
    if (favoritesLoadedKey !== storageKey) return;
    saveAppSetting(`${storageKey}_favorites`, favorites).catch(() => {
      /* ignore persistence errors */
    });
  }, [favorites, storageKey, favoritesLoadedKey]);

  useEffect(() => {
    if (recentLoadedKey !== storageKey) return;
    saveAppSetting(`${storageKey}_recent`, recent).catch(() => {
      /* ignore persistence errors */
    });
  }, [recent, storageKey, recentLoadedKey]);

  useEffect(() => {
    if (customLoadedKey !== storageKey) return;
    saveAppSetting(`${storageKey}_custom`, customIcons).catch(() => {
      /* ignore persistence errors */
    });
  }, [customIcons, storageKey, customLoadedKey]);

  useEffect(() => {
    if (customLoadedKey !== storageKey) return;

    const seeds = [value, ...favorites, ...recent]
      .map(normalizeCustomIconValue)
      .filter(Boolean);

    if (!seeds.length) return;

    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setCustomIcons((prev) => {
        const next = [...prev];
        let changed = false;
        seeds.forEach((icon) => {
          if (!next.includes(icon) && !options.includes(icon)) {
            next.unshift(icon);
            changed = true;
          }
        });
        if (!changed) return prev;
        return next.slice(0, 150);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [value, favorites, recent, options, storageKey, customLoadedKey]);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  const recentSet = useMemo(() => new Set(recent), [recent]);

  const tabItems = useMemo(() => {
    if (tab === 'Recent') {
      return recent.map((emoji) => iconByEmoji.get(emoji)).filter(Boolean);
    }
    if (tab === 'Favorites') {
      return favorites.map((emoji) => iconByEmoji.get(emoji)).filter(Boolean);
    }
    if (tab === 'All') {
      return allIcons;
    }

    const entries = groups[tab] || [];
    return entries
      .map((entry) => (typeof entry === 'string' ? entry : entry?.emoji))
      .map((emoji) => iconByEmoji.get(emoji))
      .filter(Boolean);
  }, [tab, recent, favorites, iconByEmoji, allIcons, groups]);

  const visible = useMemo(() => {
    const term = toKey(query);
    const source = term ? allIcons : tabItems;
    if (!term) return source;

    return source.filter((item) => {
      if (toKey(item.emoji).includes(term)) return true;
      return item.keywords.some((k) => k.includes(term));
    });
  }, [tabItems, allIcons, query]);

  const selectIcon = (emoji) => {
    onChange(emoji);
    setRecent((prev) => {
      const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, 30);
      return next;
    });
  };

  const addCustomIcon = () => {
    const icon = normalizeCustomIconValue(customDraft);
    if (!icon) return;
    setCustomIcons((prev) => {
      if (prev.includes(icon)) return prev;
      return [icon, ...prev].slice(0, 100);
    });
    setCustomDraft('');
    selectIcon(icon);
    setTab('All');
  };

  const handleCustomFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const contents = await file.text();
    const normalized = file.type === 'image/svg+xml'
      ? contents.trim()
      : await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });

    const icon = normalizeCustomIconValue(normalized);
    if (!icon) return;

    setCustomIcons((prev) => {
      if (prev.includes(icon)) return prev;
      return [icon, ...prev].slice(0, 100);
    });
    selectIcon(icon);
    setTab('All');
  };

  const removeCustomIcon = (icon) => {
    setCustomIcons((prev) => prev.filter((e) => e !== icon));
    setFavorites((prev) => prev.filter((e) => e !== icon));
    setRecent((prev) => prev.filter((e) => e !== icon));
  };

  const toggleFavorite = (emoji) => {
    setFavorites((prev) => {
      if (prev.includes(emoji)) return prev.filter((e) => e !== emoji);
      return [emoji, ...prev].slice(0, 50);
    });
  };

  return (
    <div className="icon-picker-shell">
      <div className="icon-picker-top">
        <input
          type="text"
          className="icon-picker-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search icons (money, food, home, travel...)"
        />
        <button
          type="button"
          className={`icon-picker-library-btn${showFullLibrary ? ' active' : ''}`}
          onClick={() => setShowFullLibrary((v) => !v)}
        >
          {showFullLibrary ? 'Hide Full Emoji Library' : 'Browse Full Emoji Library'}
        </button>
      </div>

      <div className="icon-picker-custom-row">
        <textarea
          className="icon-picker-custom-input"
          value={customDraft}
          onChange={(e) => setCustomDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustomIcon()}
          placeholder="Add your own icon: emoji, symbol, FaWallet, RiBankCardFill, SVG markup, or image/data URL"
        />
        <button type="button" className="icon-picker-custom-btn" onClick={addCustomIcon}>Add Custom</button>
        <label className="icon-picker-upload-btn">
          Upload SVG/Image
          <input type="file" accept=".svg,image/*" onChange={handleCustomFile} hidden />
        </label>
      </div>

      {showFullLibrary && (
        <div className="icon-picker-full-library">
          <EmojiPicker
            onEmojiClick={(emojiData) => selectIcon(emojiData.emoji)}
            lazyLoadEmojis
            theme="dark"
            width="100%"
            height={320}
            searchDisabled={false}
            skinTonesDisabled
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      <div className="icon-picker-tabs">
        {tabs.map((tabName) => {
          const active = tabName === tab;
          return (
            <button
              key={tabName}
              type="button"
              className={`icon-picker-tab${active ? ' active' : ''}`}
              onClick={() => setTab(tabName)}
            >
              {tabName}
            </button>
          );
        })}
      </div>

      <div className="icon-picker-grid" role="listbox" aria-label="Icon picker">
        {visible.map((item) => {
          const active = value === item.emoji;
          const favored = favoriteSet.has(item.emoji);
          const isRecent = recentSet.has(item.emoji);
          return (
            <div key={item.emoji} className={`icon-picker-card${active ? ' active' : ''}`}>
              <button
                type="button"
                className="icon-picker-select"
                onClick={() => selectIcon(item.emoji)}
                title={String(item.emoji || '').length < 80 ? `Pick ${item.emoji}` : 'Pick icon'}
              >
                <AppIcon value={item.emoji} fallback="🏷️" className="icon-picker-glyph" label="picker icon" />
              </button>
              {customIcons.includes(item.emoji) && (
                <button
                  type="button"
                  className="icon-picker-remove-custom"
                  onClick={() => removeCustomIcon(item.emoji)}
                  title="Remove custom icon"
                >
                  x
                </button>
              )}
              <button
                type="button"
                className={`icon-picker-fav${favored ? ' active' : ''}`}
                onClick={() => toggleFavorite(item.emoji)}
                title={favored ? 'Remove from favorites' : 'Add to favorites'}
              >
                {favored ? '★' : '☆'}
              </button>
              {isRecent && <span className="icon-picker-recent">recent</span>}
            </div>
          );
        })}
      </div>

      {visible.length === 0 && <div className="icon-picker-empty">No matching icons for this search.</div>}
    </div>
  );
}
