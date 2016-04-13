'use strict';

const electron = require('electron');
const app = electron.app;
const Player = require("./player.js");
const proc = require("process");

let mainWindow;

app.commandLine.appendSwitch('ppapi-flash-path', proc.cwd() + '/plugins/libpepflashplayer.so');
app.commandLine.appendSwitch('ppapi-flash-version', JSON.parse(require("fs").readFileSync(proc.cwd() + "/plugins/manifest.json").toString()).version);

app.on('ready', create);
app.on('ready', function() {
    new Player(mainWindow);
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        create();
    }
});

function create() {
    mainWindow = new electron.BrowserWindow({
        icon: proc.cwd() + "/resources/dz-client-linux-x128.png",
        "web-preferences": {
            'plugins': true
        }
    });

    mainWindow.loadURL('https://www.deezer.com');
    mainWindow.maximize();

    mainWindow.on('closed', function() {
        mainWindow = null;
    });
};