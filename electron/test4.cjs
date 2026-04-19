'use strict';
console.log('process.type:', process.type);
console.log('resolve electron:', require.resolve('electron'));
console.log('has _resolveFilename:', typeof require.resolve === 'function');

// Try the module cache to see if electron is pre-loaded
const Module = require('module');
const cached = Object.keys(Module._cache || {}).filter(k => k.includes('electron'));
console.log('cached electron modules:', cached.slice(0,5));

// Try getting electron from global
console.log('global electron:', typeof global.electron);
process.exit(0);
