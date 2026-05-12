const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Determine if we're in development or production
const isDev = !app.isPackaged;
const isWindows = process.platform === 'win32';

// Paths - handle both Linux and Windows paths
const appPath = app.getAppPath();
const resourcesPath = isDev
  ? path.join(__dirname, '..', 'backend')
  : path.join(appPath, '..', 'backend');
const backendPath = resourcesPath;
const frontendPath = isDev
  ? path.join(__dirname, '..', 'frontend', 'dist')
  : path.join(appPath, '..', 'frontend', 'dist');
const dbPath = path.join(backendPath, 'prisma', 'stradex.db');
const backendDistPath = path.join(backendPath, 'dist');

// Store processes
let backendProcess = null;
let mainWindow = null;

function log(msg) {
  const timestamp = new Date().toISOString();
  console.log(`[STRADEX ${timestamp}] ${msg}`);
}

function createWindow() {
  log('Creating window...');

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

  // Load the app
  if (isDev) {
    log('Loading dev server at http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load from bundled frontend via localhost (so backend serves it)
    // This ensures API calls work correctly
    log('Loading production frontend via localhost:3102');
    mainWindow.loadURL('http://localhost:3102');

    // Open devtools for debugging on Windows
    mainWindow.webContents.openDevTools();

    // Show error if page fails to load
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      log('Page failed to load: ' + errorCode + ' - ' + errorDescription);
      createErrorWindow('Не удалось загрузить приложение.\nКод ошибки: ' + errorCode + '\n' + errorDescription +
        '\n\nПроверьте, что бэкенд запущен на порту 3102.');
    });

    // Log when page loads (for debugging)
    mainWindow.webContents.on('did-finish-load', () => {
      log('Page finished loading');
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Catch any unhandled errors in the renderer
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    log('Renderer process gone: ' + details.reason);
    createErrorWindow('Приложение неожиданно завершилось.\nПричина: ' + details.reason);
  });
}

function initDatabase(callback) {
  log('Checking database at: ' + dbPath);

  // Check if database exists
  if (fs.existsSync(dbPath)) {
    log('Database already exists');
    callback(true);
    return;
  }

  log('Database not found, running migrations...');

  // Ensure prisma directory exists
  const prismaDir = path.join(backendPath, 'prisma');
  if (!fs.existsSync(prismaDir)) {
    fs.mkdirSync(prismaDir, { recursive: true });
  }

  // Set environment variables
  const env = {
    ...process.env,
    DATABASE_URL: `file:${dbPath}`,
  };

  // Run prisma migrate
  const npxCmd = isWindows ? 'npx.cmd' : 'npx';
  const migrate = spawn(npxCmd, ['prisma', 'migrate', 'dev', '--name', 'init'], {
    cwd: backendPath,
    shell: true,
    stdio: 'pipe',
    env,
  });

  migrate.stdout.on('data', (data) => {
    process.stdout.write('[Migrate] ' + data.toString());
  });
  migrate.stderr.on('data', (data) => {
    process.stderr.write('[Migrate] ' + data.toString());
  });

  migrate.on('close', (code) => {
    log('Migration process exited with code: ' + code);

    if (code === 0) {
      log('Running seed...');

      const npmCmd = isWindows ? 'npm.cmd' : 'npm';
      const seed = spawn(npmCmd, ['run', 'prisma:seed'], {
        cwd: backendPath,
        shell: true,
        stdio: 'pipe',
        env,
      });

      seed.stdout.on('data', (data) => {
        process.stdout.write('[Seed] ' + data.toString());
      });
      seed.stderr.on('data', (data) => {
        process.stderr.write('[Seed] ' + data.toString());
      });

      seed.on('close', (seedCode) => {
        log('Seed process exited with code: ' + seedCode);
        callback(seedCode === 0);
      });
    } else {
      log('Migration failed!');
      callback(false);
    }
  });
}

function startBackend(callback) {
  log('Starting backend server...');

  const mainJsPath = path.join(backendDistPath, 'main.js');
  log('Backend main: ' + mainJsPath);

  if (!fs.existsSync(mainJsPath)) {
    log('ERROR: Backend not built! ' + mainJsPath);
    if (callback) callback(false, 'Бэкенд не собран. Запустите сборку.');
    return;
  }

  // Check if node is available
  const nodeCmd = isWindows ? 'node.exe' : 'node';
  const checkNode = spawn(nodeCmd, ['--version'], { shell: true, stdio: 'pipe' });
  
  checkNode.on('error', () => {
    log('ERROR: Node.js not found! Please install Node.js to run the backend.');
    if (callback) callback(false, 'Node.js не найден. Установите Node.js с https://nodejs.org');
    return;
  });

  checkNode.on('close', (code) => {
    if (code !== 0) {
      if (callback) callback(false, 'Node.js не найден. Установите Node.js с https://nodejs.org');
      return;
    }

    // Environment for backend
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '3102',
      DATABASE_URL: `file:${dbPath}`,
      JWT_SECRET: 'stradex-jwt-secret-change-in-production',
      CORS_ORIGIN: '*',
    };

    backendProcess = spawn(nodeCmd, [mainJsPath], {
      cwd: backendPath,
      shell: true,
      stdio: 'pipe',
      env,
    });

    let startupComplete = false;

    backendProcess.stdout.on('data', (data) => {
      const text = data.toString();
      process.stdout.write('[Backend] ' + text);

      if (!startupComplete && text.includes('running on http://localhost')) {
        startupComplete = true;
        log('Backend started successfully!');
        if (callback) callback(true, null);
      }
    });

    backendProcess.stderr.on('data', (data) => {
      process.stderr.write('[Backend Error] ' + data.toString());
    });

    backendProcess.on('close', (code) => {
      log('Backend process exited with code: ' + code);
      if (!startupComplete && callback) callback(false, `Бэкенд завершился с кодом ${code}`);
    });

    backendProcess.on('error', (err) => {
      log('Backend error: ' + err.message);
      if (!startupComplete && callback) callback(false, `Ошибка запуска бэкенда: ${err.message}`);
    });
  });

  checkNode.stdin.end();
}

// IPC handlers
ipcMain.handle('get-app-path', () => app.getAppPath());
ipcMain.handle('get-version', () => app.getVersion());
ipcMain.handle('get-db-path', () => dbPath);

// Global error handlers
process.on('uncaughtException', (error) => {
  log('UNCAUGHT EXCEPTION: ' + error.message);
  log(error.stack);
  try {
    createErrorWindow('Критическая ошибка Node.js:\n' + error.message + '\n\n' + (error.stack || '').split('\n').slice(0, 5).join('\n'));
  } catch (e) {
    console.error('Failed to create error window:', e);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  log('UNHANDLED REJECTION: ' + reason);
});

// App lifecycle
app.whenReady().then(async () => {
  log('App ready, initializing...');

  // Safety timeout - if app doesn't start in 30 seconds, show error
  const safetyTimeout = setTimeout(() => {
    log('Safety timeout triggered - app failed to start');
    if (!mainWindow || mainWindow.isDestroyed()) {
      createErrorWindow('Приложение не запустилось за отведённое время.\nВозможные причины:\n1. Node.js не установлен или не найден в PATH\n2. Порт 3102 занят другой программой\n3. Ошибка инициализации базы данных\n\nПопробуйте:\n- Установить Node.js с https://nodejs.org\n- Перезапустить от имени администратора\n- Проверить антивирус');
    }
  }, 30000);

  initDatabase((success) => {
    clearTimeout(safetyTimeout);
    if (success) {
      log('Database initialized');

      setTimeout(() => {
        startBackend((backendOk, backendErr) => {
          if (backendOk) {
            setTimeout(() => {
              try {
                createWindow();
                log('Window created');
              } catch (e) {
                log('Failed to create window: ' + e.message);
                createErrorWindow('Не удалось создать окно приложения:\n' + e.message);
              }
            }, 2000);
          } else {
            // Show error in window
            createErrorWindow('Ошибка запуска бэкенда:\n' + (backendErr || 'Неизвестная ошибка') + '\n\nДля работы приложения требуется Node.js.\nСкачайте с https://nodejs.org', true);
          }
        });
      }, 2000);
    } else {
      log('Failed to initialize database');
      createErrorWindow('Не удалось инициализировать базу данных.\nПроверьте права доступа к папке приложения.');
    }
  });
});

function createErrorWindow(message, showRetry = false) {
  const retryBtn = showRetry ? '<button class="btn" onclick="location.reload()">Повторить</button>' : '';
  mainWindow = new BrowserWindow({
    width: 700,
    height: 500,
    title: 'STRADEX - Ошибка запуска',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const encodedMsg = encodeURI(message).replace(/%20/g, ' ').replace(/%3A/g, ':').replace(/%2E/g, '.').replace(/%2C/g, ',').replace(/%28/g, '(').replace(/%29/g, ')').replace(/%27/g, "'").replace(/%0A/g, '<br>');

  mainWindow.loadURL(`data:text/html;charset=utf-8,
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { box-sizing: border-box; }
        body {
          background: #0f172a;
          color: #e2e8f0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          padding: 20px;
        }
        .container {
          text-align: center;
          max-width: 550px;
          background: #1e293b;
          border-radius: 16px;
          padding: 40px;
          border: 1px solid #334155;
        }
        .icon { font-size: 48px; margin-bottom: 20px; }
        h1 {
          color: #f87171;
          font-size: 24px;
          margin: 0 0 16px 0;
        }
        .message {
          color: #94a3b8;
          line-height: 1.7;
          font-size: 14px;
          text-align: left;
          white-space: pre-wrap;
          background: #0f172a;
          padding: 16px;
          border-radius: 8px;
          margin: 16px 0;
        }
        .btn {
          display: inline-block;
          margin: 8px 4px;
          padding: 12px 24px;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          text-decoration: none;
        }
        .btn:hover { background: #4f46e5; }
        .btn-secondary { background: #475569; }
        .btn-secondary:hover { background: #64748b; }
        .diag {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #334155;
          text-align: left;
        }
        .diag h3 {
          color: #94a3b8;
          font-size: 12px;
          text-transform: uppercase;
          margin: 0 0 12px 0;
        }
        .diag-item {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 13px;
        }
        .diag-item span:first-child { color: #64748b; }
        .diag-item span:last-child { color: #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">⚠️</div>
        <h1>Ошибка запуска STRADEX</h1>
        <div class="message">${encodedMsg}</div>
        <div>
          <button class="btn" onclick="location.reload()">Повторить</button>
          <button class="btn btn-secondary" onclick="window.close()">Закрыть</button>
        </div>
        <div class="diag">
          <h3>Диагностика</h3>
          <div class="diag-item"><span>Версия Node.js</span><span id="node-version">проверка...</span></div>
          <div class="diag-item"><span>Порт 3102</span><span id="port-check">проверка...</span></div>
          <div class="diag-item"><span>Путь к бэкенду</span><span id="backend-path">-</span></div>
        </div>
      </div>
      <script>
        document.getElementById('backend-path').textContent = decodeURIComponent('${encodeURIComponent(backendDistPath)}');
        fetch('http://localhost:3102/api/v1/health')
          .then(r => r.json())
          .then(d => document.getElementById('port-check').textContent = '✓ Работает')
          .catch(() => document.getElementById('port-check').textContent = '✗ Не отвечает');
        document.getElementById('node-version').textContent = process.versions.node;
      </script>
    </body>
    </html>
  `);
}

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  log('All windows closed');
  if (backendProcess) {
    backendProcess.kill();
  }
  if (!isWindows && process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  log('App quitting...');
  if (backendProcess) {
    backendProcess.kill();
  }
});