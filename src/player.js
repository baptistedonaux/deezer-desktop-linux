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

    ipcMain.on('context', function (event, values) {
        for (let prop in values) {
            let value = values[prop];

            if (prop == "currentSong") {
                if (context.song === undefined) {
                    context.song = null;
                    player.metadata = {};
                }

                if (value === null && context.song !== null) {
                    context.song = null;
                    player.metadata = {};
                } else if (value.SNG_ID !== undefined && value.SNG_ID !== context.song) {
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
            } else if (prop == "isShuffle") {
                if (context.shuffle === undefined || context.shuffle !== value) {
                    context.shuffle = value;
                    player.shuffle = value;
                }
            } else if (prop == "repeatMode") {
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
            } else if (prop == "volume") {
                if (context.volume === undefined || context.volume !== value) {
                    context.volume = value;
                    player.volume = value;
                }
            } else if (prop == "nextSong") {
                if (context.nextSong === undefined || context.nextSong !== value) {
                    context.nextSong = value;
                    player.canGoNext = value !== null;
                }
            } else if (prop == "previousSong") {
                if (context.previousSong === undefined || context.previousSong !== value) {
                    context.previousSong = value;
                    player.canGoPrevious = value !== null;
                }
            } else if (prop == "position") {
                player.interfaces.player.emitSignal('Seeked', value  * 1000000);
            } else if (prop == "playbackStatus") {
                // Compare two objects with JSON serialization -- See http://stackoverflow.com/a/1144249/2182996
                if (context.playbackStatus === undefined || JSON.stringify(context.playbackStatus) != JSON.stringify(value)) {
                    context.playbackStatus = value;

                    let status;
                    if (value.isPaused === true) {
                        player.canPause = false;
                        player.canPlay = true;
                        status = "Paused";
                    } else if (value.isPlaying === true) {
                        player.canPause = true;
                        player.canPlay = false;
                        status = "Playing";
                    } else {
                        player.canPause = false;
                        player.canPlay = true;
                        status = 'Stopped';
                    }
                    player.playbackStatus = status;
                }
            }
        }
    });

	setInterval(update, 1000);
};

Player.prototype.update = function(mainWindow) {
    mainWindow.webContents.executeJavaScript(`
        require('electron').ipcRenderer.send("context", {
            currentSong: dzPlayer.getCurrentSong(),
            isShuffle: dzPlayer.isShuffle(),
            nextSong: dzPlayer.getNextSong(),
            playbackStatus: {
                isPlaying: dzPlayer.isPlaying(),
                isPaused: dzPlayer.isPaused(),
            },
            position: dzPlayer.getPosition(),
            previousSong: dzPlayer.getPrevSong(),
            repeatMode: dzPlayer.repeat,
            volume: dzPlayer.volume,
        });
    `);
}

module.exports = Player;
