const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

const isDev = !app.isPackaged;
const isWindows = process.platform === 'win32';

const appPath = app.getAppPath();
const resourcesPath = isDev
  ? path.join(__dirname, '..', 'backend')
  : path.join(appPath, '..', 'backend');
const backendPath = resourcesPath;
const dbPath = path.join(backendPath, 'prisma', 'stradex.db');
const backendDistPath = path.join(backendPath, 'dist');

let backendProcess = null;
let mainWindow = null;

function log(msg) {
  console.log('[STRADEX] ' + msg);
}

function waitForBackend(callback, maxWait = 30000) {
  const startTime = Date.now();

  function tryConnect() {
    const req = http.get('http://localhost:3102/api/v1/health', (res) => {
      if (res.statusCode === 200) {
        log('Backend ready!');
        callback(true);
      } else {
        retry();
      }
    });
    req.on('error', () => retry());
    req.setTimeout(2000, () => {
      req.destroy();
      retry();
    });
  }

  function retry() {
    if (Date.now() - startTime > maxWait) {
      log('Backend wait timeout');
      callback(false);
    } else {
      setTimeout(tryConnect, 1000);
    }
  }

  tryConnect();
}

function startBackend(callback) {
  log('Starting backend...');

  const mainJsPath = path.join(backendDistPath, 'main.js');

  if (!fs.existsSync(mainJsPath)) {
    callback(false, 'Backend not found: ' + mainJsPath);
    return;
  }

  const nodeCmd = isWindows ? 'node.exe' : 'node';

  const env = {
    NODE_ENV: 'production',
    PORT: '3102',
    DATABASE_URL: 'file:' + dbPath,
    JWT_SECRET: 'stradex-jwt-secret-change-in-production',
  };

  backendProcess = spawn(nodeCmd, [mainJsPath], {
    cwd: backendPath,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env,
  });

  let startupLog = '';
  backendProcess.stdout.on('data', (d) => {
    const text = d.toString();
    startupLog += text;
    process.stdout.write('[B] ' + text);
  });
  backendProcess.stderr.on('data', (d) => {
    process.stderr.write('[BE] ' + d.toString());
  });

  backendProcess.on('error', (err) => {
    log('Backend error: ' + err.message);
    callback(false, 'Failed to start: ' + err.message);
  });

  backendProcess.on('close', (code) => {
    log('Backend exited: ' + code);
  });

  // Wait for backend to be ready
  waitForBackend((ready) => {
    if (ready) {
      callback(true);
    } else {
      // Try to extract error from logs
      let errMsg = 'Backend did not respond';
      if (startupLog.includes('EADDRINUSE')) {
        errMsg = 'Port 3102 already in use. Close other apps and try again.';
      } else if (startupLog.includes('Error')) {
        const match = startupLog.match(/Error[:\s]+([^\n]+)/);
        if (match) errMsg = match[1];
      }
      callback(false, errMsg);
    }
  });
}

function createMainWindow() {
  log('Creating main window...');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'STRADEX - Парковочная система',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadURL('http://localhost:3102');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Debug: log page events
  mainWindow.webContents.on('did-finish-load', () => {
    log('Page loaded successfully');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDesc) => {
    log('Page failed: ' + errorCode + ' - ' + errorDesc);
  });

  mainWindow.webContents.on('crashed', () => {
    log('Renderer crashed!');
  });

  mainWindow.webContents.on('console-message', (event, level, message) => {
    if (level >= 2) { // Error level
      log('Console error: ' + message);
    }
  });
}

function showError(message) {
  if (mainWindow) {
    mainWindow.close();
  }

  const errorWin = new BrowserWindow({
    width: 500,
    height: 400,
    resizable: false,
    center: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  errorWin.loadURL(`data:text/html,
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          background: #1a1a2e;
          color: #eee;
          font-family: system-ui, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          padding: 20px;
          box-sizing: border-box;
        }
        .box {
          text-align: center;
          max-width: 400px;
        }
        h1 { color: #e74; margin-bottom: 20px; }
        pre {
          background: #16213e;
          padding: 15px;
          border-radius: 8px;
          text-align: left;
          font-size: 12px;
          white-space: pre-wrap;
          max-height: 200px;
          overflow-y: auto;
        }
        button {
          margin-top: 20px;
          padding: 12px 30px;
          background: #4a4a8a;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>STRADEX - Error</h1>
        <pre>${message}</pre>
        <button onclick="window.close()">Close</button>
      </div>
    </body>
    </html>
  `);
}

function initDatabase(callback) {
  log('Checking database...');

  if (fs.existsSync(dbPath)) {
    log('Database OK');
    callback(true);
    return;
  }

  log('Database not found');
  callback(false);
}

ipcMain.handle('get-app-path', () => app.getAppPath());
ipcMain.handle('get-version', () => app.getVersion());

process.on('uncaughtException', (err) => {
  log('Uncaught: ' + err.message);
});

app.whenReady().then(() => {
  log('STRADEX starting...');

  // Initialize database
  initDatabase((dbOk) => {
    if (!dbOk) {
      showError('Database initialization failed.\n\nPlease reinstall the application.');
      return;
    }

    // Start backend and wait for it
    startBackend((backendOk, backendErr) => {
      if (!backendOk) {
        showError(backendErr || 'Backend failed to start');
        return;
      }

      // Backend ready, create window
      log('All systems ready, creating window...');
      createMainWindow();
    });
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (!isWindows) {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});