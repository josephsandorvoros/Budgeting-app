'use strict';
const Module = require('module');
const builtins = Module.builtinModules;
console.log('electron builtins:', builtins.filter(m => m.includes('electron')));
console.log('process.type:', process.type);
console.log('process.versions.electron:', process.versions ? process.versions.electron : 'N/A');
process.exit(0);
