'use strict';

const electron = require('electron');
const app = electron.app;
const fs = require('fs');
const path = require("path");
const Player = require("./player.js");
const proc = require("process");

const configPath = proc.env.HOME + "/.config/Deezer-desktop-linux";

let mainWindow;

try {
    fs.statSync(configPath);
} catch (error) {
    fs.mkdirSync(configPath, 755);
}

app.commandLine.appendSwitch('ppapi-flash-path', path.resolve(__dirname, 'plugins/libpepflashplayer.so'));
app.commandLine.appendSwitch('ppapi-flash-version', JSON.parse(require("fs").readFileSync(path.resolve(__dirname, "plugins/manifest.json")).toString()).version);

app.on('ready', create);
app.on('ready', function() {
    new Player(mainWindow, configPath);
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
        icon: path.resolve(__dirname, "resources/dz-client-linux-x128.png"),
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