import { useMemo } from 'react';

function isSvgMarkup(value) {
  return /<svg[\s\S]*<\/svg>/i.test(String(value || '').trim());
}

function isDataOrImageUrl(value) {
  const text = String(value || '').trim();
  return /^(data:image\/|blob:|https?:\/\/|\/)/i.test(text);
}

function svgToDataUrl(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function getIconImageSource(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (isSvgMarkup(text)) return svgToDataUrl(text);
  if (isDataOrImageUrl(text)) return text;
  return null;
}

export function isVisualIcon(value) {
  return !!getIconImageSource(value);
}

export default function AppIcon({ value, fallback = '🏷️', className = '', label = 'icon' }) {
  const source = useMemo(() => getIconImageSource(value), [value]);
  const resolved = String(value || '').trim() || fallback;

  if (source) {
    return (
      <span className={className} aria-label={label} role="img">
        <img
          src={source}
          alt={label}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      </span>
    );
  }

  return (
    <span className={className} aria-label={label} role="img">
      {resolved}
    </span>
  );
}