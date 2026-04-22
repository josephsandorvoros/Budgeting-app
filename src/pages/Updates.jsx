import { useEffect, useMemo, useState } from 'react';

const RELEASES_API = 'https://api.github.com/repos/josephsandorvoros/Budgeting-app/releases?per_page=10';

function detectPlatform() {
  if (typeof window !== 'undefined' && window.electronAPI?.getPlatform) {
    return window.electronAPI.getPlatform();
  }
  if (typeof navigator !== 'undefined') {
    const p = navigator.platform.toLowerCase();
    if (p.includes('mac')) return Promise.resolve('darwin');
    if (p.includes('linux')) return Promise.resolve('linux');
  }
  return Promise.resolve('win32');
}

function pickInstallerAsset(release, platform) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  if (platform === 'darwin') {
    return assets.find((a) => String(a.name || '').toLowerCase().endsWith('.dmg')) || null;
  }
  if (platform === 'linux') {
    return assets.find((a) => String(a.name || '').toLowerCase().endsWith('.appimage')) || null;
  }
  return assets.find((a) => String(a.name || '').toLowerCase().endsWith('.exe')) || null;
}

function parseSemver(version) {
  const match = String(version || '').match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareSemver(a, b) {
  const av = parseSemver(a);
  const bv = parseSemver(b);
  if (!av || !bv) return null;
  if (av[0] !== bv[0]) return av[0] > bv[0] ? 1 : -1;
  if (av[1] !== bv[1]) return av[1] > bv[1] ? 1 : -1;
  if (av[2] !== bv[2]) return av[2] > bv[2] ? 1 : -1;
  return 0;
}

function parseTagParts(tag) {
  const text = String(tag || '').trim();
  if (!text) return null;

  const stable = text.match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/i);
  if (stable) {
    return { kind: 'stable', parts: [Number(stable[1]), Number(stable[2]), Number(stable[3])] };
  }

  const beta = text.match(/^beta(\d+(?:\.\d+)*)$/i);
  if (beta) {
    return {
      kind: 'beta',
      parts: String(beta[1]).split('.').map((n) => Number(n)).filter((n) => Number.isFinite(n)),
    };
  }

  return null;
}

function compareNumericParts(a = [], b = []) {
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i += 1) {
    const av = Number.isFinite(a[i]) ? a[i] : 0;
    const bv = Number.isFinite(b[i]) ? b[i] : 0;
    if (av !== bv) return av > bv ? 1 : -1;
  }
  return 0;
}

function compareReleaseTags(aTag, bTag) {
  const a = parseTagParts(aTag);
  const b = parseTagParts(bTag);

  if (!a && !b) return String(aTag || '').localeCompare(String(bTag || ''));
  if (!a) return -1;
  if (!b) return 1;

  if (a.kind !== b.kind) {
    if (a.kind === 'stable') return 1;
    if (b.kind === 'stable') return -1;
  }

  return compareNumericParts(a.parts, b.parts);
}

function pickLatestRelease(releases) {
  const list = (Array.isArray(releases) ? releases : []).filter((r) => !r?.draft);
  if (!list.length) return null;

  return [...list].sort((a, b) => {
    const byTag = compareReleaseTags(a?.tag_name, b?.tag_name);
    if (byTag !== 0) return byTag > 0 ? -1 : 1;

    const aPublished = new Date(a?.published_at || a?.created_at || 0).getTime();
    const bPublished = new Date(b?.published_at || b?.created_at || 0).getTime();
    return bPublished - aPublished;
  })[0];
}

export default function Updates() {
  const [version, setVersion] = useState('unknown');
  const [installedReleaseTag, setInstalledReleaseTag] = useState('unknown');
  const [platform, setPlatform] = useState('win32');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [latest, setLatest] = useState(null);

  const installerAsset = useMemo(() => pickInstallerAsset(latest, platform), [latest, platform]);

  const latestInstallerVersion = useMemo(() => {
    if (!installerAsset?.name) return null;
    const match = String(installerAsset.name).match(/Budget\.Ledger-(\d+\.\d+\.\d+)/i);
    return match ? match[1] : null;
  }, [installerAsset]);

  const statusText = useMemo(() => {
    const latestTag = String(latest?.tag_name || '').trim();
    const localTag = String(installedReleaseTag || '').trim();

    if (latestTag && localTag && localTag !== 'unknown') {
      const byTag = compareReleaseTags(localTag, latestTag);
      if (byTag === 0) return 'Up to date';
      if (byTag < 0) return 'Update available';
      return 'Running newer local build';
    }

    const cmp = compareSemver(version, latestInstallerVersion);
    if (cmp === null) return 'Unknown';
    if (cmp === 0) return 'Up to date';
    if (cmp < 0) return 'Update available';
    return 'Running newer local build';
  }, [installedReleaseTag, latest, version, latestInstallerVersion]);

  useEffect(() => {
    let cancelled = false;

    const loadEnv = async () => {
      try {
        if (window.electronAPI?.getAppVersion) {
          const v = await window.electronAPI.getAppVersion();
          if (!cancelled && v) setVersion(String(v));
        }
      } catch {
        // keep fallback
      }

      try {
        if (window.electronAPI?.getReleaseTag) {
          const tag = await window.electronAPI.getReleaseTag();
          if (!cancelled && tag) setInstalledReleaseTag(String(tag));
        }
      } catch {
        // keep fallback
      }

      try {
        const p = await detectPlatform();
        if (!cancelled && p) setPlatform(p);
      } catch {
        // keep fallback
      }

      try {
        const res = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } });
        if (res.ok) {
          const releases = await res.json();
          const release = pickLatestRelease(releases);
          if (!cancelled && release) setLatest(release);
        }
      } catch {
        // initial release lookup is optional
      }
    };

    loadEnv();
    return () => {
      cancelled = true;
    };
  }, []);

  const checkForUpdates = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } });
      if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
      const releases = await res.json();
      const release = pickLatestRelease(releases);
      if (!release) throw new Error('No published releases found yet.');
      setLatest(release);
    } catch (e) {
      setError(e.message || 'Failed to check for updates.');
    } finally {
      setBusy(false);
    }
  };

  const handleInstall = () => {
    if (!installerAsset?.browser_download_url) return;
    window.open(installerAsset.browser_download_url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Updates</h1>
          <div className="subtitle">Check for the latest release and update in place without uninstalling.</div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 760, display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', rowGap: 8, columnGap: 12 }}>
          <div style={{ color: 'var(--muted)' }}>Installed version</div>
          <div style={{ color: 'var(--text)', fontWeight: 700 }}>{version}</div>
          <div style={{ color: 'var(--muted)' }}>Installed release</div>
          <div style={{ color: 'var(--text)', fontWeight: 700 }}>{installedReleaseTag}</div>
          <div style={{ color: 'var(--muted)' }}>Platform</div>
          <div style={{ color: 'var(--text)' }}>{platform}</div>
          <div style={{ color: 'var(--muted)' }}>Latest release</div>
          <div style={{ color: 'var(--text)' }}>{latest?.tag_name || 'Not checked yet'}</div>
          <div style={{ color: 'var(--muted)' }}>Latest installer version</div>
          <div style={{ color: 'var(--text)' }}>{latestInstallerVersion || 'Unknown'}</div>
          <div style={{ color: 'var(--muted)' }}>Status</div>
          <div style={{ color: 'var(--text)' }}>{statusText}</div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={checkForUpdates} disabled={busy}>
            {busy ? 'Checking...' : 'Check for Updates'}
          </button>
          <button className="btn-ghost" onClick={handleInstall} disabled={!installerAsset?.browser_download_url || busy}>
            Download Latest Installer
          </button>
          {latest?.html_url && (
            <button className="btn-ghost" onClick={() => window.open(latest.html_url, '_blank', 'noopener,noreferrer')}>
              View Release Notes
            </button>
          )}
        </div>

        {latest && (
          <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            {installerAsset
              ? `Installer found: ${installerAsset.name}`
              : 'No installer asset found for this platform in the latest release.'}
          </div>
        )}

        <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          Tip: running the latest installer updates Budget Ledger in place. You do not need to manually uninstall first, and your local data should remain intact because it is stored outside the install folder. A backup is still recommended before major updates, but normal upgrades should not require backup and restore.
        </div>

        {error && <div className="danger">{error}</div>}
      </div>
    </div>
  );
}
