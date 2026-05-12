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
let splashWindow = null;

function log(msg) {
  console.log('[STRADEX] ' + msg);
}

function showSplash(message) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.executeJavaScript(`
      document.getElementById('status').textContent = ${JSON.stringify(message)};
    `).catch(() => {});
  }
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 350,
    frame: false,
    resizable: false,
    center: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  splashWindow.loadURL(`data:text/html;charset=utf-8,
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: linear-gradient(135deg, #1e1e2e 0%, #0f172a 100%);
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          text-align: center;
        }
        .logo { font-size: 64px; margin-bottom: 20px; }
        h1 {
          font-size: 28px;
          font-weight: 600;
          margin-bottom: 10px;
          background: linear-gradient(90deg, #818cf8, #c084fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .subtitle { color: #94a3b8; font-size: 14px; margin-bottom: 30px; }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #334155;
          border-top-color: #818cf8;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .status { color: #94a3b8; font-size: 13px; min-height: 20px; }
        .progress {
          width: 200px;
          height: 4px;
          background: #334155;
          border-radius: 2px;
          overflow: hidden;
          margin-top: 15px;
        }
        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #818cf8, #c084fc);
          animation: progress 2s ease-in-out infinite;
        }
        @keyframes progress {
          0% { width: 0%; margin-left: 0; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="logo">P</div>
      <h1>STRADEX</h1>
      <div class="subtitle">Автоматизированная парковочная система</div>
      <div class="spinner"></div>
      <div class="status" id="status">Инициализация...</div>
      <div class="progress"><div class="progress-bar"></div></div>
    </body>
    </html>
  `);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'STRADEX - Парковочная система',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // Load from local files - more reliable than HTTP
    const indexPath = path.join(appPath, '..', 'frontend', 'dist', 'index.html');
    log('Loading frontend from: ' + indexPath);
    mainWindow.loadFile(indexPath);
  }

  mainWindow.once('ready-to-show', () => {
    log('Main window ready to show');
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
    mainWindow.maximize();
    log('Main window shown');
  });

  // Fallback: show main window after 10 seconds even if ready-to-show doesn't fire
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      log('Fallback: showing main window after timeout');
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }
      mainWindow.show();
      mainWindow.maximize();
    }
  }, 10000);

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log('Page failed to load: ' + errorCode + ' - ' + errorDescription);
    showError('Ошибка загрузки приложения\n\n' + errorDescription);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showError(message) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }

  const errorWin = new BrowserWindow({
    width: 500,
    height: 400,
    resizable: false,
    center: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  errorWin.loadURL(`data:text/html;charset=utf-8,
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          background: #0f172a;
          color: #e2e8f0;
          font-family: sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          padding: 20px;
        }
        .box { text-align: center; max-width: 400px; }
        h1 { color: #f87171; margin-bottom: 20px; }
        pre {
          background: #1e293b;
          padding: 15px;
          border-radius: 8px;
          text-align: left;
          font-size: 12px;
          white-space: pre-wrap;
          color: #94a3b8;
        }
        button {
          margin-top: 20px;
          padding: 12px 30px;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }
        button:hover { background: #4f46e5; }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>! Ошибка</h1>
        <pre>${message}</pre>
        <button onclick="window.close()">Закрыть</button>
      </div>
    </body>
    </html>
  `);
}

function checkBackendReady(callback) {
  try {
    const req = http.get('http://localhost:3102/api/v1/health', (res) => {
      callback(true, null);
    });
    req.on('error', (err) => {
      if (err.message && err.message.includes('EADDRINUSE')) {
        callback(false, 'EADDRINUSE');
      } else {
        callback(false, null);
      }
    });
    req.setTimeout(1000, () => {
      req.destroy();
      callback(false, null);
    });
  } catch (e) {
    callback(false, null);
  }
}

function initDatabase(callback) {
  log('Checking database...');

  if (fs.existsSync(dbPath)) {
    log('Database exists');
    callback(true);
    return;
  }

  log('Creating database...');
  const prismaDir = path.join(backendPath, 'prisma');
  if (!fs.existsSync(prismaDir)) {
    fs.mkdirSync(prismaDir, { recursive: true });
  }

  const npxCmd = isWindows ? 'npx.cmd' : 'npx';
  const prismaProcess = spawn(npxCmd, ['prisma', 'migrate', 'dev', '--name', 'init'], {
    cwd: backendPath,
    shell: true,
    stdio: 'pipe',
  });

  prismaProcess.on('close', (code) => {
    if (code === 0) {
      log('Database migrated');
      const npmCmd = isWindows ? 'npm.cmd' : 'npm';
      const seedProcess = spawn(npmCmd, ['run', 'seed'], {
        cwd: backendPath,
        shell: true,
        stdio: 'pipe',
      });
      seedProcess.on('close', (seedCode) => {
        log('Seed completed with code: ' + seedCode);
        callback(seedCode === 0);
      });
      seedProcess.stderr.on('data', (d) => log('Seed stderr: ' + d.toString()));
    } else {
      log('Migration failed with code: ' + code);
      callback(false);
    }
  });

  prismaProcess.stderr.on('data', (d) => log('Prisma stderr: ' + d.toString()));
}

function startBackend(callback) {
  log('Starting backend...');

  const mainJsPath = path.join(backendDistPath, 'main.js');

  if (!fs.existsSync(mainJsPath)) {
    log('Backend not found: ' + mainJsPath);
    callback(false, 'Бэкенд не найден: ' + mainJsPath);
    return;
  }

  const nodeCmd = isWindows ? 'node.exe' : 'node';

  const checkNode = spawn(nodeCmd, ['--version'], { shell: true, stdio: 'pipe' });
  checkNode.on('error', () => {
    callback(false, 'Node.js не установлен. Скачайте с https://nodejs.org');
  });
  checkNode.on('close', (code) => {
    if (code !== 0) {
      callback(false, 'Node.js не найден в PATH');
      return;
    }

    const env = {
      NODE_ENV: 'production',
      PORT: '3102',
      DATABASE_URL: 'file:' + dbPath,
      JWT_SECRET: 'stradex-jwt-secret-change-in-production',
    };

    backendProcess = spawn(nodeCmd, [mainJsPath], {
      cwd: backendPath,
      shell: true,
      stdio: 'pipe',
      env,
    });

    backendProcess.stdout.on('data', (d) => {
      process.stdout.write('[Backend] ' + d);
    });
    backendProcess.stderr.on('data', (d) => {
      process.stderr.write('[Backend Error] ' + d);
    });

    backendProcess.on('error', (err) => {
      log('Backend spawn error: ' + err.message);
      callback(false, 'Ошибка запуска: ' + err.message);
    });

    backendProcess.on('close', (code) => {
      log('Backend exited with code: ' + code);
    });

    let attempts = 0;
    const maxAttempts = 30;

    function tryConnect() {
      attempts++;
      showSplash('Запуск сервера (' + attempts + '/' + maxAttempts + ')...');

      checkBackendReady((ready, statusCode) => {
        if (ready) {
          log('Backend is ready');
          callback(true);
        } else if (statusCode === 'EADDRINUSE') {
          callback(false, 'Порт 3102 уже занят!\n\nДругое приложение использует этот порт.\n\nРешение: lsof -i :3102 и kill PID');
        } else if (attempts < maxAttempts) {
          setTimeout(tryConnect, 1000);
        } else {
          callback(false, 'Превышено время ожидания запуска сервера');
        }
      });
    }

    setTimeout(tryConnect, 2000);
  });

  checkNode.stdin.end();
}

ipcMain.handle('get-app-path', () => app.getAppPath());
ipcMain.handle('get-version', () => app.getVersion());

process.on('uncaughtException', (err) => {
  log('Uncaught: ' + err.message);
  showError('Критическая ошибка:\n' + err.message);
});

app.whenReady().then(() => {
  log('Starting STRADEX...');

  createSplashWindow();

  initDatabase((dbOk) => {
    if (!dbOk) {
      showError('Не удалось инициализировать базу данных.\n\nВозможные причины:\n1. Нет прав на запись\n2. Повреждённая установка\n3. Prisma не работает');
      return;
    }

    showSplash('Запуск сервера...');

    startBackend((backendOk, backendErr) => {
      if (!backendOk) {
        showError(backendErr || 'Не удалось запустить сервер');
        return;
      }

      showSplash('Загрузка интерфейса...');
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