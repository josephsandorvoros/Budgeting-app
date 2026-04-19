'use strict'; const e = require('electron'); console.log('TYPE:', typeof e); console.log('KEYS:', typeof e === 'object' && e ? Object.keys(e).slice(0,5) : e); process.exit(0);
