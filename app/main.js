'use strict';

const electron = require('electron'),
    app = electron.app,
    fs = require('fs'),
    path = require("path"),
    Player = require("./player.js"),
    proc = require("process"),
    configPath = proc.env.HOME + "/.config/Deezer-desktop-linux";

let mainWindow;

try {
    fs.statSync(configPath);
} catch (error) {
    fs.mkdirSync(configPath, 755);
}

app.commandLine.appendSwitch('ppapi-flash-path', "/usr/lib/pepperflashplugin-nonfree/libpepflashplayer.so");

// app.commandLine.appendSwitch('ppapi-flash-path', path.resolve(__dirname, 'plugins/libpepflashplayer.so'));
// app.commandLine.appendSwitch('ppapi-flash-version', JSON.parse(require("fs").readFileSync(path.resolve(__dirname, "plugins/manifest.json")).toString()).version);

app.on('ready', function() {
    create();

    new Player(mainWindow, configPath);
});

app.on('window-all-closed', function () {
    app.quit();
});

function create() {
    mainWindow = new electron.BrowserWindow({
        "icon": path.resolve(__dirname, "resources/dz-client-linux-x128.png"),
        "webPreferences": {
            'plugins': true
        }
    });

    mainWindow.loadURL('https://www.deezer.com');
    mainWindow.maximize();

    mainWindow.on('closed', function() {
        mainWindow = null;
    });
};