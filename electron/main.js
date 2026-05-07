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

function startBackend() {
  log('Starting backend server...');

  const mainJsPath = path.join(backendDistPath, 'main.js');
  log('Backend main: ' + mainJsPath);

  if (!fs.existsSync(mainJsPath)) {
    log('ERROR: Backend not built! ' + mainJsPath);
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

  const nodeCmd = isWindows ? 'node.exe' : 'node';

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
    }
  });

  backendProcess.stderr.on('data', (data) => {
    process.stderr.write('[Backend Error] ' + data.toString());
  });

  backendProcess.on('close', (code) => {
    log('Backend process exited with code: ' + code);
  });

  backendProcess.on('error', (err) => {
    log('Backend error: ' + err.message);
  });
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
        startBackend();

        setTimeout(() => {
          createWindow();
          log('Window created');
        }, 5000);
      }, 2000);
    } else {
      log('Failed to initialize database');
    }
  });
});

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