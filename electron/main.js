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
    // Production: load from bundled frontend
    const indexPath = path.join(frontendPath, 'index.html');
    log('Loading production frontend: ' + indexPath);
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
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

// App lifecycle
app.whenReady().then(async () => {
  log('App ready, initializing...');

  initDatabase((success) => {
    if (success) {
      log('Database initialized');

      setTimeout(() => {
        startBackend((backendOk, backendErr) => {
          if (backendOk) {
            setTimeout(() => {
              createWindow();
              log('Window created');
            }, 2000);
          } else {
            // Show error in window
            createErrorWindow(backendErr || 'Неизвестная ошибка запуска бэкенда');
          }
        });
      }, 2000);
    } else {
      log('Failed to initialize database');
      createErrorWindow('Не удалось инициализировать базу данных. Проверьте права доступа.');
    }
  });
});

function createErrorWindow(message) {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 400,
    title: 'STRADEX - Ошибка',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL(`data:text/html;charset=utf-8,
    <html>
    <head><meta charset="utf-8"><style>
      body { background:#0f172a; color:#e2e8f0; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
      .box { text-align:center; max-width:450px; }
      h1 { color:#f87171; font-size:24px; margin-bottom:16px; }
      p { color:#94a3b8; line-height:1.6; font-size:14px; }
      .btn { display:inline-block; margin-top:20px; padding:10px 24px; background:#6366f1; color:white; border:none; border-radius:6px; cursor:pointer; font-size:14px; text-decoration:none; }
      .btn:hover { background:#4f46e5; }
    </style></head>
    <body>
      <div class="box">
        <h1>⚠ Ошибка запуска</h1>
        <p>${encodeURI(message).replace(/%20/g, ' ').replace(/%3A/g, ':').replace(/%2E/g, '.').replace(/%2C/g, ',').replace(/%28/g, '(').replace(/%29/g, ')').replace(/%27/g, "'")}</p>
        <a class="btn" href="#" onclick="window.close()">Закрыть</a>
      </div>
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