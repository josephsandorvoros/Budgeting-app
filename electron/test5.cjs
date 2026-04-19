'use strict';
console.log('SYNC process.type:', process.type);
setTimeout(() => {
  console.log('ASYNC process.type:', process.type);
  const e = require('electron');
  console.log('ASYNC electron type:', typeof e);
  if (typeof e === 'object' && e) {
    console.log('app:', typeof e.app);
    if (e.app) e.app.quit();
  } else {
    console.log('still a string:', e);
    process.exit(0);
  }
}, 0);
