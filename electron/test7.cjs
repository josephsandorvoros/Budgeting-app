'use strict';
const Module = require('module');
// See what Module._load's toString looks like (is it patched?)
const origLoad = Module._load.toString().slice(0,100);
console.log('Module._load start:', origLoad);

// Try to find if electron APIs exist somewhere global
const keys = Object.keys(global).filter(k => !['process','require','module','__dirname','__filename','exports','Buffer','clearImmediate','clearInterval','clearTimeout','setImmediate','setInterval','setTimeout','URL','URLSearchParams','atob','btoa','performance','crypto','Event','EventTarget','MessageChannel','MessageEvent','MessagePort','queueMicrotask','structuredClone','AbortController','AbortSignal','DOMException','FormData','Headers','Request','Response','fetch','navigator','WebAssembly','TextDecoder','TextEncoder','ReadableStream','WritableStream','TransformStream','CompressionStream','DecompressionStream','console','gc','v8','__coverage__'].includes(k));
console.log('extra globals:', keys.slice(0,20));
process.exit(0);
