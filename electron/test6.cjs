'use strict';
// Try node: prefix
try { const e = require('node:electron'); console.log('node:electron:', typeof e, typeof e === 'object' ? Object.keys(e).slice(0,3) : e); }
catch(ex) { console.log('node:electron err:', ex.message); }

// Check if electron exposes via process
console.log('process._linkedBinding exists:', typeof process._linkedBinding);
try { const b = process._linkedBinding('atom_common_v8'); console.log('v8 binding:', typeof b); }
catch(ex) { console.log('binding err:', ex.message); }

// check what's in require cache after startup
const Module = require('module');
const cached = Object.keys(Module._cache || {});
console.log('cached count:', cached.length);
process.exit(0);
