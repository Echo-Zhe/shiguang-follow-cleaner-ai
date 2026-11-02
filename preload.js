'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('shAPI', {
  call: function (method) {
    const args = Array.prototype.slice.call(arguments, 1);
    return ipcRenderer.invoke('app:call', method, args);
  },
  onEvent: function (callback) {
    if (typeof callback !== 'function') return function () {};
    const handler = function (event, payload) { callback(payload); };
    ipcRenderer.on('app:event', handler);
    return function () { ipcRenderer.removeListener('app:event', handler); };
  },
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }
});
