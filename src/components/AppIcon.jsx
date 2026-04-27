import { useEffect, useMemo, useState } from 'react';

const REACT_ICON_LOADERS = [
  { prefix: 'Fa6', load: () => import('react-icons/fa6') },
  { prefix: 'Hi2', load: () => import('react-icons/hi2') },
  { prefix: 'Io5', load: () => import('react-icons/io5') },
  { prefix: 'Tb', load: () => import('react-icons/tb') },
  { prefix: 'Pi', load: () => import('react-icons/pi') },
  { prefix: 'Ri', load: () => import('react-icons/ri') },
  { prefix: 'Md', load: () => import('react-icons/md') },
  { prefix: 'Hi', load: () => import('react-icons/hi') },
  { prefix: 'Io', load: () => import('react-icons/io') },
  { prefix: 'Bs', load: () => import('react-icons/bs') },
  { prefix: 'Bi', load: () => import('react-icons/bi') },
  { prefix: 'Ai', load: () => import('react-icons/ai') },
  { prefix: 'Ci', load: () => import('react-icons/ci') },
  { prefix: 'Cg', load: () => import('react-icons/cg') },
  { prefix: 'Di', load: () => import('react-icons/di') },
  { prefix: 'Fi', load: () => import('react-icons/fi') },
  { prefix: 'Gi', load: () => import('react-icons/gi') },
  { prefix: 'Go', load: () => import('react-icons/go') },
  { prefix: 'Gr', load: () => import('react-icons/gr') },
  { prefix: 'Im', load: () => import('react-icons/im') },
  { prefix: 'Lia', load: () => import('react-icons/lia') },
  { prefix: 'Lu', load: () => import('react-icons/lu') },
  { prefix: 'Rx', load: () => import('react-icons/rx') },
  { prefix: 'Si', load: () => import('react-icons/si') },
  { prefix: 'Sl', load: () => import('react-icons/sl') },
  { prefix: 'Tfi', load: () => import('react-icons/tfi') },
  { prefix: 'Vsc', load: () => import('react-icons/vsc') },
  { prefix: 'Wi', load: () => import('react-icons/wi') },
  { prefix: 'Fa', load: () => import('react-icons/fa') },
];

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

function getReactIconSpec(value) {
  const text = String(value || '').trim();
  if (!/^[A-Z][A-Za-z0-9]+$/.test(text)) return null;
  const entry = REACT_ICON_LOADERS.find((item) => text.startsWith(item.prefix));
  return entry ? { exportName: text, loader: entry.load } : null;
}

function getIconImageSource(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (isSvgMarkup(text)) return svgToDataUrl(text);
  if (isDataOrImageUrl(text)) return text;
  return null;
}

export default function AppIcon({ value, fallback = '🏷️', className = '', label = 'icon' }) {
  const resolved = useMemo(() => String(value || '').trim() || fallback, [value, fallback]);
  const source = useMemo(() => getIconImageSource(resolved), [resolved]);
  const iconSpec = useMemo(() => getReactIconSpec(resolved), [resolved]);
  const [loadedIcon, setLoadedIcon] = useState({ exportName: '', component: null });

  useEffect(() => {
    let cancelled = false;

    if (!iconSpec) {
      return () => {
        cancelled = true;
      };
    }

    iconSpec.loader()
      .then((mod) => {
        const component = mod?.[iconSpec.exportName] || null;
        if (!cancelled) {
          setLoadedIcon({ exportName: iconSpec.exportName, component });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadedIcon({ exportName: iconSpec.exportName, component: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [iconSpec]);

  const IconComponent = iconSpec && loadedIcon.exportName === iconSpec.exportName
    ? loadedIcon.component
    : null;

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

  if (IconComponent) {
    return (
      <span className={className} aria-label={label} role="img">
        <IconComponent style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden="true" focusable="false" />
      </span>
    );
  }

  return (
    <span className={className} aria-label={label} role="img">
      {resolved}
    </span>
  );
}