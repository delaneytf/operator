const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('__ELECTRON__', true);
contextBridge.exposeInMainWorld('__PLATFORM__', process.platform);
