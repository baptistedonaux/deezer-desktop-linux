"use strict";

const fs = require("fs");
const http = require("http");
const ipcMain = require('electron').ipcMain;
const mpris = require("mpris-service");

let player;
let config;
let context = {};

const Player = function(mainWindow, configPath) {
    config = {
        path: configPath,
    };
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

    var update = this.update.bind(player, mainWindow);

    // Events
    player.on('play', function () {
        mainWindow.webContents.executeJavaScript('dzPlayer.control.play();');
        update();
    });

    player.on('pause', function () {
        mainWindow.webContents.executeJavaScript('dzPlayer.control.pause();');
        update();
    });

    player.on('playpause', function () {
        mainWindow.webContents.executeJavaScript('dzPlayer.control.togglePause();');
        update();
    });

    player.on('previous', function () {
        mainWindow.webContents.executeJavaScript('dzPlayer.playTrackAtIndex(dzPlayer.getIndexSong() - 1);');
        update();
    });

    player.on('next', function () {
        mainWindow.webContents.executeJavaScript('dzPlayer.playTrackAtIndex(dzPlayer.getIndexSong() + 1);');
        update();
    });

    // player.on('seek', function (event, value) {
    //   // missing coef
    //   console.log(value);
    //   mainWindow.webContents.executeJavaScript('dzPlayer.control.seek(0..1);');
    //   update();
    // });

    // player.on('position', function (event, value) {
    //   // missing coef
    //   console.log(value);
    //   mainWindow.webContents.executeJavaScript('dzPlayer.position;');
    //   update();
    // });

    // player.on('shuffle', function () {
	   //  // missing value
	   //  mainWindow.webContents.executeJavaScript('dzPlayer.control.shuffle(true|false);');
	   //  update();
    // });

    // player.on('volume', function () {
    //     // missing value
    //     mainWindow.webContents.executeJavaScript('dzPlayer.control.setVolume(0..1);');
    //     update();
    // });

    ipcMain.on('currentSong', function (event, value) {
        if (value === null && player.metadata == {}) {
            player.metadata = {};
        } else if (context.song === undefined || value.SNG_ID !== context.song) {
            context.song = value.SNG_ID;

            let artists = [];

            if (value.ART_NAME !== undefined) {
                artists[artists.length] = value.ART_NAME;
            } else if (value.ARTISTS !== undefined) {
                for (var i = 0; i < value.ARTISTS.length; i++) {
                    artists[artists.length] = value.ARTISTS[i].ART_NAME;
                }
            }

            let coverPath = config.path + "/" + value.ALB_PICTURE + '.jpg';

            try {
                fs.statSync(coverPath);
            } catch (error) {
                http.get('http://cdn-images.deezer.com/images/cover/' + value.ALB_PICTURE + '/125x125.jpg', function (response) {
                    response.on('data', function (chunk) {
                        fs.writeFile(coverPath, chunk, function (err) {
                            if (err) {
                                throw err;
                            }
                        });
                    });
                });
            }

            player.metadata = {
                'mpris:trackid': value.SNG_ID,
                'mpris:artUrl': coverPath,
                'mpris:length': value.DURATION * 1000000, // In microseconds 
                'xesam:album': value.ALB_TITLE,
                'xesam:albumArtist': value.ART_NAME,
                'xesam:artist': artists.join(", "),
                'xesam:title': value.SNG_TITLE
            };
        }
    });

    ipcMain.on('isShuffle', function (event, value) {
        if (context.shuffle === undefined || context.shuffle !== value) {
            context.shuffle = value;
            player.shuffle = value;
        }
    });

    ipcMain.on('playbackStatus', function (event, value) {
        if (context.playbackStatus === undefined || context.playbackStatus !== value) {
            context.playbackStatus = value;
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
        }
    });

    ipcMain.on('repeatMode', function (event, value) {
        if (context.repeatMode === undefined || context.repeatMode !== value) {
            context.repeatMode = value;
            if (value === 0) {
                player.loopStatus = "None";
            } else if (value === 1) {
                player.loopStatus = "Playlist";
            } else if (value === 2) {
                player.loopStatus = "Track";
            }
        }
    });

    ipcMain.on('volume', function (event, value) {
        if (context.volume === undefined || context.volume !== value) {
            context.volume = value;
            player.volume = value;
        }
    });

    ipcMain.on('nextSong', function (event, value) {
        if (context.nextSong === undefined || context.nextSong !== value) {
            context.nextSong = value;
            player.canGoNext = value !== null;
        }
    });

    ipcMain.on('previousSong', function (event, value) {
        if (context.previousSong === undefined || context.previousSong !== value) {
            context.previousSong = value;
            player.canGoPrevious = value !== null;
        }
    });

    ipcMain.on('position', function (event, value) {
        player.interfaces.player.emitSignal('Seeked', value  * 1000000);
    });

	setInterval(update, 1000);
};

Player.prototype.update = function(mainWindow) {
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
