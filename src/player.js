"use strict";

const ipcMain = require('electron').ipcMain;
const mpris = require("mpris-service");

let player;

const Player = function(mainWindow) {
	player = mpris({
        name: 'deezerdesktopforlinux',
        identity: 'Deezer desktop for Linux',
        supportedInterfaces: ['player'],
        rate: 1,
		minimumRate: 1,
		maximumRate: 1,
		canSeek: false,
		canControl: false,
    });

    var updateCallback = this.updateMetadata.bind(player, mainWindow);

    // Events
    player.on('play', function () {
        mainWindow.webContents.executeJavaScript('dzPlayer.control.play();');
        updateCallback();
    });

    player.on('pause', function () {
        mainWindow.webContents.executeJavaScript('dzPlayer.control.pause();');
        updateCallback();
    });

    player.on('playpause', function () {
        mainWindow.webContents.executeJavaScript('dzPlayer.control.togglePause();');
        updateCallback();
    });

    player.on('previous', function () {
        mainWindow.webContents.executeJavaScript('dzPlayer.playTrackAtIndex(dzPlayer.getIndexSong() - 1);');
        updateCallback();
    });

    player.on('next', function () {
        mainWindow.webContents.executeJavaScript('dzPlayer.playTrackAtIndex(dzPlayer.getIndexSong() + 1);');
        updateCallback();
    });

    // player.on('seek', function (event, value) {
    //   // missing coef
    //   console.log(value);
    //   mainWindow.webContents.executeJavaScript('dzPlayer.control.seek(0..1);');
    //   updateCallback();
    // });

    // player.on('position', function (event, value) {
    //   // missing coef
    //   console.log(value);
    //   mainWindow.webContents.executeJavaScript('dzPlayer.position;');
    //   updateCallback();
    // });

    player.on('shuffle', function () {
	    // missing value
	    mainWindow.webContents.executeJavaScript('dzPlayer.control.shuffle(true|false);');
	    updateCallback();
    });

    player.on('volume', function () {
        // missing value
        mainWindow.webContents.executeJavaScript('dzPlayer.control.setVolume(0..1);');
        updateCallback();
    });

    ipcMain.on('currentSong', function (event, value) {
        let artists = [];

        if (value.ART_NAME !== undefined) {
            artists[artists.length] = value.ART_NAME;
        } else if (value.ARTISTS !== undefined) {
            for (var i = 0; i < value.ARTISTS.length; i++) {
                artists[artists.length] = value.ARTISTS[i].ART_NAME;
            }
        }

        player.metadata = {
            'mpris:trackid': value.SNG_ID,
            'mpris:artUrl': 'http://cdn-images.deezer.com/images/cover/' + value.ALB_PICTURE + '/125x125.jpg',
            'mpris:length': value.DURATION * 1000000, // In microseconds 
            'xesam:album': value.ALB_TITLE,
            'xesam:albumArtist': value.ART_NAME,
            'xesam:artist': artists.join(", "),
            'xesam:title': value.SNG_TITLE
        };
    });

    ipcMain.on('isShuffle', function (event, value) {
        player.shuffle = value;
    });

    ipcMain.on('playbackStatus', function (event, value) {
        player.playbackStatus = value;

        if (value == "Stopped") {
            player.canPlay = true;
            player.canPause = false;
        } else if (value == "Paused") {
            player.canPlay = true;
            player.canPause = false;
        } else if (value == "Playing") {
            player.canPlay = false;
            player.canPause = true;
        }
    });

    ipcMain.on('repeatMode', function (event, value) {
        if (value === 0) {
            player.loopStatus = "None";
        } else if (value === 1) {
            player.loopStatus = "Playlist";
        } else if (value === 2) {
            player.loopStatus = "Track";
        }
    });

    ipcMain.on('volume', function (event, value) {
        player.volume = value;
    });

    ipcMain.on('nextSong', function (event, value) {
        player.canGoNext = value !== null;
    });

    ipcMain.on('previousSong', function (event, value) {
        player.canGoPrevious = value !== null;
    });

    ipcMain.on('position', function (event, value) {
        player.interfaces.player.emitSignal('Seeked', value  * 1000000);
    });

	setInterval(updateCallback, 3000);
};

Player.prototype.updateMetadata = function(mainWindow) {
    mainWindow.webContents.executeJavaScript(`
        var ipcRenderer = require('electron').ipcRenderer;

        ipcRenderer.send('currentSong', dzPlayer.getCurrentSong());
        ipcRenderer.send('isShuffle', dzPlayer.isShuffle());

        var isPlaying = dzPlayer.isPlaying();
        var isPaused = dzPlayer.isPaused();

        var status = 'Stopped';
        if (isPaused === true) {
            status = "Paused";
        } else if (isPlaying === true) {
            status = "Playing";
        }
        ipcRenderer.send('playbackStatus', status);

        ipcRenderer.send('repeatMode', dzPlayer.repeat);
        ipcRenderer.send('volume', dzPlayer.volume);
        ipcRenderer.send('nextSong', dzPlayer.getNextSong());
        ipcRenderer.send('previousSong', dzPlayer.getPrevSong());
        ipcRenderer.send('position', dzPlayer.getPosition());
        `);
}

module.exports = Player;
