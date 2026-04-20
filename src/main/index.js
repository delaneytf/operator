// Electron main process — starts Express server, creates BrowserWindow

const { app, BrowserWindow, Menu, dialog, shell, nativeTheme, Notification } = require('electron');
const path = require('path');
const os = require('os');
const https = require('https');
const fs = require('fs');
const { fork, spawn } = require('child_process');
const { promisify } = require('util');
const execFile = require('child_process').execFile;
const execFileAsync = promisify(execFile);

const PORT = process.env.PORT || 3000;
const SERVER_URL = `http://localhost:${PORT}`;

let mainWindow = null;
let serverProcess = null;

function startServer() {
  // If something is already listening on PORT (e.g. dev server), skip forking
  return fetch(SERVER_URL, { signal: AbortSignal.timeout(500) })
    .then(() => { console.log('[server] existing server found on', SERVER_URL); })
    .catch(() => {
      const serverPath = path.join(__dirname, '../../server.js');
      serverProcess = fork(serverPath, [], {
        env: { ...process.env, PORT },
        silent: false,
      });
      serverProcess.on('error', (err) => console.error('[server] fork error:', err));
      serverProcess.on('exit', (code, signal) => {
        if (code !== 0 && signal !== 'SIGTERM') {
          console.error(`[server] exited unexpectedly: code=${code} signal=${signal}`);
        }
      });
    });
}

function waitForServer(url, retries = 30, delay = 300) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      fetch(url, { signal: AbortSignal.timeout(1000) })
        .then(() => resolve())
        .catch(() => {
          if (n <= 0) reject(new Error('Server did not start in time'));
          else setTimeout(() => attempt(n - 1), delay);
        });
    };
    attempt(retries);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 14, y: 14 },
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0f0f0f' : '#f5f4f2',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  waitForServer(SERVER_URL)
    .then(() => mainWindow.loadURL(SERVER_URL))
    .catch(() => mainWindow.loadURL(SERVER_URL)) // try anyway if timeout
    .finally(() => {
      mainWindow.show();
      mainWindow.focus();
    });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Open anchor links with target="_blank" in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation away from the app
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(SERVER_URL)) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });
}

function buildMenu() {
  const template = [
    ...(process.platform === 'darwin' ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { label: 'Check for Updates…', click: () => checkForUpdates(false) },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin' ? [{ type: 'separator' }, { role: 'front' }] : []),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  buildMenu();
  process.env.OPERATOR_DATA_DIR = app.getPath('userData');
  await startServer();
  createWindow();
  // Check for updates silently after the window is shown
  setTimeout(() => checkForUpdates(true), 5000);

  app.on('activate', () => {
    if (!mainWindow) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
});

// ── Update helpers ────────────────────────────────────────────────────────────

function getAppBundlePath() {
  const m = process.execPath.match(/^(.+\.app)\//);
  return m ? m[1] : null;
}

function canAutoInstall() {
  if (process.platform !== 'darwin') return false;
  const bundle = getAppBundlePath();
  return !!(bundle && bundle.startsWith(os.homedir()));
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const request = (u) => {
      https.get(u, { headers: { 'User-Agent': 'Operator-App' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return request(res.headers.location);
        }
        if (res.statusCode !== 200) {
          file.close(() => fs.unlink(destPath, () => {}));
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
        file.on('error', (err) => { fs.unlink(destPath, () => {}); reject(err); });
      }).on('error', reject);
    };
    request(url);
  });
}

async function installUpdate(downloadUrl) {
  const dmgPath = path.join(os.tmpdir(), 'OperatorUpdate.dmg');
  try {
    if (Notification.isSupported()) {
      new Notification({ title: 'Operator Update', body: 'Downloading update in background…' }).show();
    }

    await downloadFile(downloadUrl, dmgPath);

    // Mount DMG and parse plist output for mount point
    const { stdout: plist } = await execFileAsync('hdiutil', ['attach', dmgPath, '-nobrowse', '-plist']);
    const mountMatch = plist.match(/<key>mount-point<\/key>\s*<string>([^<]+)<\/string>/);
    if (!mountMatch) throw new Error('Could not determine DMG mount point');
    const mountPoint = mountMatch[1].trim();

    // Find .app bundle inside the DMG
    const entries = fs.readdirSync(mountPoint);
    const appName = entries.find((f) => f.endsWith('.app'));
    if (!appName) throw new Error('No .app bundle found in DMG');

    // Install into ~/Applications (creating it if needed)
    const appsDir = path.join(os.homedir(), 'Applications');
    if (!fs.existsSync(appsDir)) fs.mkdirSync(appsDir, { recursive: true });

    const destApp = path.join(appsDir, appName);
    if (fs.existsSync(destApp)) await execFileAsync('rm', ['-rf', destApp]);
    await execFileAsync('cp', ['-R', path.join(mountPoint, appName), appsDir + '/']);

    await execFileAsync('hdiutil', ['detach', mountPoint, '-quiet']).catch(() => {});
    fs.unlink(dmgPath, () => {});

    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Installed',
      message: 'Operator has been updated.',
      detail: 'Restart now to use the new version.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });

    if (response === 0) {
      spawn('open', [destApp], { detached: true, stdio: 'ignore' }).unref();
      app.quit();
    }
  } catch (err) {
    fs.unlink(dmgPath, () => {});
    dialog.showErrorBox('Update Failed', err.message);
  }
}

// ── Update checker ────────────────────────────────────────────────────────────

async function checkForUpdates(silent = false) {
  try {
    const res = await fetch('https://api.github.com/repos/delaneytf/operator/releases/latest', {
      headers: { 'User-Agent': 'Operator-App' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const release = await res.json();
    const latest = release.tag_name?.replace(/^v/, '');
    const current = app.getVersion();

    if (latest && latest !== current) {
      const isArm = process.arch === 'arm64';
      const asset = (release.assets || []).find((a) =>
        process.platform === 'darwin'
          ? isArm ? a.name.includes('arm64') && a.name.endsWith('.dmg')
                  : a.name.endsWith('.dmg') && !a.name.includes('arm64')
          : a.name.endsWith('.exe') || a.name.endsWith('.AppImage')
      );
      const downloadUrl = asset?.browser_download_url || release.html_url;
      const autoInstall = canAutoInstall() && asset?.browser_download_url;

      const buttons = autoInstall
        ? ['Download & Install', 'Download Manually', 'Later']
        : ['Download', 'Later'];

      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `Operator ${release.tag_name} is available`,
        detail: autoInstall
          ? `You're on v${current}. Click "Download & Install" — Operator will restart automatically when ready.`
          : `You're on v${current}. Download the latest version to update.`,
        buttons,
        defaultId: 0,
        cancelId: buttons.length - 1,
      });

      if (autoInstall) {
        if (response === 0) installUpdate(downloadUrl);
        else if (response === 1) shell.openExternal(downloadUrl);
      } else {
        if (response === 0) shell.openExternal(downloadUrl);
      }
    } else if (!silent) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Up to Date',
        message: `Operator v${current} is the latest version.`,
        buttons: ['OK'],
      });
    }
  } catch (e) {
    if (!silent) {
      dialog.showErrorBox('Update Check Failed', `Could not reach GitHub: ${e.message}`);
    }
  }
}
