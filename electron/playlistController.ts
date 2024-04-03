import { EventEmitter } from 'events';
import { type Socket, createConnection } from 'net';
import { WAYPAPER_ENGINE_SOCKET_PATH } from './globals/appPaths';
import { ACTIONS, type message } from './types/types';
import { type ActiveMonitor } from '../shared/types/monitor';
export class PlaylistController extends EventEmitter {
    connection: Socket;
    retries: number;
    constructor() {
        super();
        this.connection = createConnection(WAYPAPER_ENGINE_SOCKET_PATH);
        this.retries = 0;
        this.connection.on('data', data => {
            console.log('Received data:', data);
        });
        this.connection.on('error', error => {
            console.error('Connection error:', error);
            this.emit('error', error);
        });
        this.connection.on('close', () => {
            console.log('Connection closed');
            this.emit('close');
        });
    }

    #sendData(data: message) {
        this.connection.write(JSON.stringify(data).concat('\n'));
    }

    startPlaylist(playlist: { name: string; monitor: ActiveMonitor }) {
        this.#sendData({
            action: ACTIONS.START_PLAYLIST,
            playlist
        });
    }

    pausePlaylist(playlist: message['playlist']) {
        this.#sendData({
            action: ACTIONS.PAUSE_PLAYLIST,
            playlist
        });
    }

    resumePlaylist(playlist: message['playlist']) {
        this.#sendData({
            action: ACTIONS.RESUME_PLAYLIST,
            playlist
        });
    }

    stopPlaylist(playlist: message['playlist']) {
        this.#sendData({
            action: ACTIONS.STOP_PLAYLIST,
            playlist
        });
    }

    nextImage(playlist: message['playlist']) {
        this.#sendData({
            action: ACTIONS.NEXT_IMAGE,
            playlist
        });
    }

    previousImage(playlist: message['playlist']) {
        this.#sendData({
            action: ACTIONS.PREVIOUS_IMAGE,
            playlist
        });
    }

    randomImage() {
        this.#sendData({
            action: ACTIONS.RANDOM_IMAGE
        });
    }

    killDaemon() {
        this.#sendData({
            action: ACTIONS.STOP_DAEMON
        });
    }

    updateConfig() {
        this.#sendData({
            action: ACTIONS.UPDATE_CONFIG
        });
    }
}
