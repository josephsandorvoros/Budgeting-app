import { useEffect, useSyncExternalStore } from 'react';

const MODULE_LOADERS = {
  Fi: () => import('react-icons/fi'),
  Fa: () => import('react-icons/fa'),
};

const modulePromises = {};
const moduleCache = {};
const moduleListeners = new Set();

function subscribeModules(onChange) {
  moduleListeners.add(onChange);
  return () => {
    moduleListeners.delete(onChange);
  };
}

function getModuleSnapshot(prefix) {
  return moduleCache[prefix] || null;
}

function notifyModules() {
  moduleListeners.forEach((listener) => listener());
}

function loadIconModule(prefix) {
  if (!modulePromises[prefix]) {
    modulePromises[prefix] = MODULE_LOADERS[prefix]()
      .then((mod) => {
        moduleCache[prefix] = mod;
        notifyModules();
        return mod;
      });
  }
  return modulePromises[prefix];
}

export default function UiShellIcon({ name, className = '' }) {
  const iconName = String(name || '');
  const prefix = MODULE_LOADERS[iconName.slice(0, 2)] ? iconName.slice(0, 2) : null;

  const mod = useSyncExternalStore(
    subscribeModules,
    () => getModuleSnapshot(prefix),
    () => null
  );

  useEffect(() => {
    if (prefix && !moduleCache[prefix]) {
      loadIconModule(prefix).catch(() => {});
    }
  }, [prefix]);

  const Icon = prefix && mod ? mod[iconName] : null;

  if (!Icon) {
    return <span className={className} aria-hidden="true" />;
  }

  return <Icon className={className} aria-hidden="true" focusable="false" />;
}
