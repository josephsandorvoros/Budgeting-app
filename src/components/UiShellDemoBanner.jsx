import UiShellIcon from './UiShellIcon.jsx';
import { shouldShowDemoBanner } from './UiShellDemoMode.js';

export default function UiShellDemoBanner() {
  const visible = shouldShowDemoBanner({
    demoMode: import.meta.env.VITE_DEMO_MODE,
    isElectron: typeof window !== 'undefined' && !!window.electronAPI,
    protocol: typeof window !== 'undefined' ? window.location?.protocol : undefined,
  });

  if (!visible) return null;

  return (
    <div className="demo-banner" role="status">
      <UiShellIcon name="FiZap" />
      <p className="demo-banner-text">
        <strong>Demo mode.</strong> You are viewing isolated demo data stored in this browser. Changes save only to that demo data, never to your real budgets.
      </p>
    </div>
  );
}
