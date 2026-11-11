import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowDemoBanner } from '../../src/components/UiShellDemoMode.js';

test('demo banner only shows when VITE_DEMO_MODE is exactly "true"', () => {
  assert.equal(shouldShowDemoBanner({ demoMode: 'true' }), true);
  assert.equal(shouldShowDemoBanner({ demoMode: 'false' }), false);
  assert.equal(shouldShowDemoBanner({ demoMode: undefined }), false);
  assert.equal(shouldShowDemoBanner({ demoMode: 'TRUE' }), false);
  assert.equal(shouldShowDemoBanner({ demoMode: '1' }), false);
  assert.equal(shouldShowDemoBanner({}), false);
});

test('demo banner is hidden in Electron shells (window.electronAPI present)', () => {
  assert.equal(shouldShowDemoBanner({ demoMode: 'true', isElectron: true }), false);
  assert.equal(shouldShowDemoBanner({ demoMode: 'true', isElectron: true, protocol: 'http:' }), false);
});

test('demo banner is hidden for packaged file: protocol', () => {
  assert.equal(shouldShowDemoBanner({ demoMode: 'true', protocol: 'file:' }), false);
  assert.equal(shouldShowDemoBanner({ demoMode: 'true', isElectron: false, protocol: 'file:' }), false);
});

test('demo banner shows for browser sessions with demo mode enabled', () => {
  assert.equal(shouldShowDemoBanner({ demoMode: 'true', isElectron: false, protocol: 'http:' }), true);
  assert.equal(shouldShowDemoBanner({ demoMode: 'true', isElectron: false, protocol: 'https:' }), true);
  assert.equal(shouldShowDemoBanner({ demoMode: 'true', protocol: 'http:' }), true);
});
