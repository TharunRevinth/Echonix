const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let nodeServer;
let pythonServer;

const isDev = !app.isPackaged;
const userDataPath = app.getPath('userData');
const browserJsonPath = path.join(userDataPath, 'browser.json');

// Ensure browser.json exists in userData for persistence if not already there
if (!fs.existsSync(browserJsonPath)) {
    try {
        const templatePath = path.join(__dirname, 'browser.json');
        if (fs.existsSync(templatePath)) {
            fs.copyFileSync(templatePath, browserJsonPath);
        }
    } catch (e) {
        console.error("Failed to copy browser.json template", e);
    }
}

function startBackend() {
    console.log("Starting backend services...");

    // Start Node.js server
    const serverPath = path.join(__dirname, 'server.js');
    nodeServer = spawn('node', [serverPath], {
        env: { 
            ...process.env, 
            PORT: '5001', 
            NODE_ENV: 'production',
            USER_DATA_PATH: userDataPath,
            IS_ELECTRON: 'true'
        }
    });

    nodeServer.stdout.on('data', (data) => console.log(`[Node] ${data}`));
    nodeServer.stderr.on('data', (data) => console.error(`[Node Error] ${data}`));

    // Start Python service
    const pythonScriptPath = path.join(__dirname, 'ytmusic_service.py');
    pythonServer = spawn('python3', [pythonScriptPath], {
        env: {
            ...process.env,
            YTMUSIC_SERVICE_PORT: '5002',
            BROWSER_JSON_PATH: browserJsonPath,
            IS_ELECTRON: 'true'
        }
    });

    pythonServer.stdout.on('data', (data) => console.log(`[Python] ${data}`));
    pythonServer.stderr.on('data', (data) => console.error(`[Python Error] ${data}`));
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 850,
        minWidth: 1000,
        minHeight: 700,
        title: "Echonix",
        backgroundColor: '#121212',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js') // We'll create this if needed
        },
        titleBarStyle: 'hiddenInset', // Modern look on macOS
        show: false
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, 'build/index.html'));
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle external links (e.g. YouTube) in the OS browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

app.whenReady().then(() => {
    startBackend();
    
    // Give backend a small headstart
    setTimeout(createWindow, 2500);
});

app.on('window-all-closed', () => {
    if (nodeServer) nodeServer.kill();
    if (pythonServer) pythonServer.kill();
    
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
