'use strict';
try {
  const bi = require('electron/js2c/browser_init');
  console.log('browser_init type:', typeof bi);
  console.log('browser_init keys:', bi ? Object.keys(bi).slice(0,10) : 'N/A');
} catch(e) { console.log('browser_init err:', e.message); }

try {
  const ni = require('electron/js2c/node_init');
  console.log('node_init type:', typeof ni);
  console.log('node_init keys:', ni ? Object.keys(ni).slice(0,10) : 'N/A');
} catch(e) { console.log('node_init err:', e.message); }
process.exit(0);
