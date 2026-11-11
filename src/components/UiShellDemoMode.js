export function shouldShowDemoBanner({ demoMode, isElectron = false, protocol } = {}) {
  if (demoMode !== 'true') return false;
  if (isElectron) return false;
  if (protocol === 'file:') return false;
  return true;
}
