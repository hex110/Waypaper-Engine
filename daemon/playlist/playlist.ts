import {
    ACTIONS,
    PLAYLIST_TYPES,
    type rendererImage,
    type ActiveMonitor
} from '../types/daemonTypes';
import { DBOperations } from '../database/dbOperations';
import { notify } from '../utils/notifications';
import {
    setImageAcrossMonitors,
    duplicateImageAcrossMonitors
} from '../utils/imageOperations';
import { type PLAYLIST_TYPES_TYPE } from '../types/playlist';
import { EventEmitter } from 'node:stream';
import { initSwwwDaemon } from '../utils/checkDependencies';

export class Playlist extends EventEmitter {
    images: rendererImage[];
    name: string;
    activeMonitor: ActiveMonitor;
    currentType: PLAYLIST_TYPES_TYPE;
    playlistTimer: {
        timeoutID: NodeJS.Timeout | undefined;
        executionTimeStamp: number | undefined;
    };

    dbOperations: DBOperations;
    eventCheckerTimeout: NodeJS.Timeout | undefined;
    currentImageIndex: number;
    interval: number | null;
    showAnimations: boolean;
    constructor({
        playlistName,
        activeMonitor
    }: {
        playlistName: string;
        activeMonitor: ActiveMonitor;
    }) {
        super();
        this.dbOperations = new DBOperations();
        const currentPlaylist = this.dbOperations.getPlaylistInfo({
            name: playlistName
        });
        if (currentPlaylist === undefined) {
            this.emit(ACTIONS.ERROR, { error: 'Playlist missing in database' });
        }
        this.images = currentPlaylist.images;
        this.name = playlistName;
        this.currentType = currentPlaylist.type;
        this.currentImageIndex = currentPlaylist.alwaysStartOnFirstImage
            ? 0
            : currentPlaylist.currentImageIndex;
        this.interval = currentPlaylist.interval;
        this.showAnimations = currentPlaylist.showAnimations;
        this.playlistTimer = {
            timeoutID: undefined,
            executionTimeStamp: undefined
        };
        this.eventCheckerTimeout = undefined;
        this.activeMonitor = activeMonitor;
        this.dbOperations.insertIntoActivePlaylists({
            playlistID: currentPlaylist.id,
            monitor: activeMonitor
        });
    }

    async setImage(image: rendererImage) {
        let retries = 0;
        let success = false;
        while (retries < 0) {
            try {
                if (this.activeMonitor.extendAcrossMonitors) {
                    await setImageAcrossMonitors(
                        image,
                        this.activeMonitor.monitors,
                        this.showAnimations
                    );
                } else {
                    await duplicateImageAcrossMonitors(
                        image,
                        this.activeMonitor.monitors,
                        this.showAnimations
                    );
                }
                success = true;
                break;
            } catch (error) {
                retries++;
                initSwwwDaemon();
            }
        }
        if (success) {
            this.dbOperations.addImageToHistory({
                image,
                activeMonitor: this.activeMonitor
            });
            this.emit(ACTIONS.SET_IMAGE, image);
        } else {
            throw new Error('Could not set image,check the logs');
        }
    }

    pause() {
        if (this.currentType === PLAYLIST_TYPES.TIMER) {
            clearTimeout(this.playlistTimer.timeoutID);
            this.playlistTimer.timeoutID = undefined;
            return `Paused ${this.name}`;
        } else {
            return `Cannot pause ${this.name} because it's of type ${this.currentType}`;
        }
    }

    resume() {
        if (this.currentType === PLAYLIST_TYPES.TIMER) {
            void this.timedPlaylist(true);
            return `Resuming ${this.name}`;
        } else {
            return `Cannot resume ${this.name} because it is of type ${this.currentType}`;
        }
    }

    stop() {
        this.dbOperations.removeActivePlaylist({
            playlistName: this.name
        });
        const currentPlaylist: { name: string; activeMonitor: ActiveMonitor } =
            {
                name: this.name,
                activeMonitor: this.activeMonitor
            };
        // Make sure we clean the timers to avoid memory leaks
        if (this.eventCheckerTimeout !== undefined) {
            clearInterval(this.eventCheckerTimeout);
        }

        if (this.playlistTimer.timeoutID !== undefined) {
            clearTimeout(this.playlistTimer.timeoutID);
        }

        this.playlistTimer.timeoutID = undefined;
        this.playlistTimer.executionTimeStamp = undefined;
        this.eventCheckerTimeout = undefined;
        this.emit(ACTIONS.STOP_PLAYLIST, currentPlaylist);
    }

    resetInterval() {
        clearTimeout(this.playlistTimer.timeoutID);
        this.playlistTimer.timeoutID = undefined;
        void this.timedPlaylist(true);
    }

    async nextImage() {
        if (
            this.currentType === PLAYLIST_TYPES.DAY_OF_WEEK ||
            this.currentType === PLAYLIST_TYPES.TIME_OF_DAY
        ) {
            notify('Cannot change image in this type of playlist');
            return 'Cannot change image in this type of playlist';
        }
        this.currentImageIndex++;
        if (this.currentImageIndex === this.images.length) {
            this.currentImageIndex = 0;
        }
        if (this.currentType === PLAYLIST_TYPES.TIMER) {
            this.resetInterval();
        }
        await this.setImage(this.images[this.currentImageIndex]);
        try {
            this.updateInDB();
        } catch (error) {
            const errorString = error as string;
            notify(
                `Could not connect to the database\n Error:\n${errorString}`
            );
            throw error;
        }
        return `Setting:${this.images[this.currentImageIndex].name}`;
    }

    async previousImage() {
        if (
            this.currentType === PLAYLIST_TYPES.DAY_OF_WEEK ||
            this.currentType === PLAYLIST_TYPES.TIME_OF_DAY
        ) {
            notify('Cannot change image in this type of playlist');
            return 'Cannot change image in this type of playlist';
        }
        this.currentImageIndex--;
        if (this.currentImageIndex < 0) {
            this.currentImageIndex = this.images.length - 1;
        }
        if (this.currentType === PLAYLIST_TYPES.TIMER) {
            this.resetInterval();
        }
        await this.setImage(this.images[this.currentImageIndex]);
        try {
            this.updateInDB();
        } catch (error) {
            const errorString = error as string;
            notify(
                `Could not connect to the database\n Error:\n${errorString}`
            );
            throw error;
        }
        return `Setting:${this.images[this.currentImageIndex].name}`;
    }

    start() {
        try {
            switch (this.currentType) {
                case PLAYLIST_TYPES.TIMER:
                    void this.timedPlaylist();
                    break;
                case PLAYLIST_TYPES.NEVER:
                    void this.neverPlaylist();
                    break;
                case PLAYLIST_TYPES.TIME_OF_DAY:
                    void this.timeOfDayPlaylist().then(() => {
                        void this.checkMissedEvents();
                    });
                    break;
                case PLAYLIST_TYPES.DAY_OF_WEEK:
                    void this.dayOfWeekPlaylist().then(() => {
                        void this.checkMissedEvents();
                    });
                    break;
                default:
                    this.emit('Error', this.activeMonitor.name);
                    break;
            }
            this.emit(ACTIONS.START_PLAYLIST, { name: this.name });
        } catch (error) {
            const errorString = error as string;
            notify(
                `Could not connect to the database\n Error:\n${errorString}`
            );
            throw error;
        }
    }

    updatePlaylist() {
        const newPlaylistInfo = this.dbOperations.getActivePlaylistInfo(
            this.activeMonitor
        );
        if (newPlaylistInfo === undefined) {
            this.emit('Error', this.activeMonitor.name);
            return;
        }
        this.stop();
        const {
            name,
            interval,
            images,
            showAnimations,
            type,
            currentImageIndex,
            id,
            alwaysStartOnFirstImage
        } = newPlaylistInfo;
        this.images = images;
        this.name = name;
        this.currentType = type;
        this.currentImageIndex = alwaysStartOnFirstImage
            ? 0
            : currentImageIndex;
        this.interval = interval;
        this.showAnimations = showAnimations;
        this.dbOperations.insertIntoActivePlaylists({
            playlistID: id,
            monitor: this.activeMonitor
        });
        this.start();
    }

    updateInDB() {
        try {
            this.dbOperations.updatePlaylistCurrentIndex({
                newIndex: this.currentImageIndex,
                name: this.name
            });
        } catch (error) {
            const errorString = error as string;
            notify(
                `Could not connect to the database\n Error:\n${errorString}`
            );
            throw error;
        }
    }

    async timedPlaylist(resume?: boolean) {
        if (this.interval !== null) {
            if (!(resume ?? false)) {
                await this.setImage(this.images[this.currentImageIndex]);
            }
            this.playlistTimer.timeoutID = setInterval(() => {
                this.currentImageIndex++;
                if (this.currentImageIndex === this.images.length) {
                    this.currentImageIndex = 0;
                }
                void this.setImage(this.images[this.currentImageIndex]);
                this.updateInDB();
            }, this.interval);
        } else {
            console.error('Interval is null');
            notify(
                'Interval is null, something went wrong setting the playlist'
            );
        }
    }

    async neverPlaylist() {
        await this.setImage(this.images[this.currentImageIndex]);
    }

    async timeOfDayPlaylist() {
        try {
            const startingIndex = this.findClosestImageIndex();
            if (startingIndex === undefined) {
                notify('Images have no time, something went wrong');
                this.emit('Error', this.activeMonitor.name);
                return;
            }
            this.currentImageIndex =
                startingIndex < 0 ? this.images.length - 1 : startingIndex;
            await this.setImage(this.images[this.currentImageIndex]);
            this.timeOfDayPlayer();
        } catch (error) {
            const errorString = error as string;
            notify(
                `Could not connect to the database\n Error:\n${errorString}`
            );
            throw error;
        }
    }

    async dayOfWeekPlaylist() {
        const now = new Date();
        const endOfDay = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1,
            0,
            0,
            0
        );
        const millisecondsUntilEndOfDay = endOfDay.getTime() - now.getTime();
        let imageIndexToSet = now.getDay();
        if (imageIndexToSet > this.images.length) {
            imageIndexToSet = this.images.length - 1;
        }
        await this.setImage(this.images[imageIndexToSet]);
        clearTimeout(this.playlistTimer.timeoutID);
        this.playlistTimer.timeoutID = setTimeout(() => {
            void this.dayOfWeekPlaylist();
        }, millisecondsUntilEndOfDay);
        this.playlistTimer.executionTimeStamp =
            millisecondsUntilEndOfDay + Date.now();
    }

    timeOfDayPlayer() {
        const timeOut = this.calculateMillisecondsUntilNextImage();
        if (timeOut === undefined) {
            notify('Playlist internal error');
            this.emit('Error', this.activeMonitor.name);
            return;
        }
        clearTimeout(this.playlistTimer.timeoutID);
        this.playlistTimer.timeoutID = setTimeout(() => {
            let newIndex = this.currentImageIndex + 1;
            if (newIndex === this.images.length) {
                newIndex = 0;
            }
            this.currentImageIndex = newIndex;
            void this.setImage(this.images[this.currentImageIndex]);
            this.timeOfDayPlayer();
        }, timeOut);
        this.playlistTimer.executionTimeStamp = timeOut + Date.now();
    }

    calculateMillisecondsUntilNextImage() {
        const nextIndex =
            this.currentImageIndex + 1 === this.images.length
                ? 0
                : this.currentImageIndex + 1;
        const nextTime = this.images[nextIndex].time;
        if (nextTime === null) return undefined;
        const date = new Date();
        const nowInMinutes = date.getHours() * 60 + date.getMinutes();
        let time = nextTime - nowInMinutes;
        if (time < 0) {
            time += 1440;
        }
        time = 60 * time;
        time = time - date.getSeconds();
        time = time * 1000;
        return time;
    }

    findClosestImageIndex() {
        const date = new Date();
        const currentTime = date.getHours() * 60 + date.getMinutes();
        let low = 0;
        let high = this.images.length - 1;
        let closestIndex = -1;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const midTime = this.images[mid].time;
            if (midTime === null) return undefined;
            if (midTime === currentTime) {
                return mid;
            } else if (midTime < currentTime) {
                closestIndex = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return closestIndex;
    }

    async checkMissedEvents() {
        clearTimeout(this.eventCheckerTimeout);
        this.eventCheckerTimeout = setInterval(() => {
            const now = Date.now();
            if (
                this.playlistTimer.executionTimeStamp === undefined ||
                now < this.playlistTimer.executionTimeStamp ||
                this.playlistTimer.timeoutID === undefined ||
                this.currentType === undefined
            ) {
                return;
            }
            clearTimeout(this.playlistTimer.timeoutID);
            switch (this.currentType) {
                case PLAYLIST_TYPES.TIME_OF_DAY:
                    void this.timeOfDayPlaylist();
                    break;
                case PLAYLIST_TYPES.DAY_OF_WEEK:
                    void this.dayOfWeekPlaylist();
                    break;
            }
        }, 10_000);
    }

    async getPlaylistDiagnostics() {
        const diagostics = {
            playlistName: this.name,
            type: this.currentType,
            playlistCurrentIndex: this.currentImageIndex,
            playlistEventCheckerTimeout: {
                id: String(this.eventCheckerTimeout)
            },
            playlistTimerObject: {
                timeoutID: String(this.playlistTimer.timeoutID),
                executionTimeStamp: new Date(
                    this.playlistTimer.executionTimeStamp ?? 0
                )
            },
            playlistImages: this.images.map(image => {
                return JSON.stringify(image);
            }),
            playlistInterval: this.interval,
            daemonPID: process.pid
        };
        return diagostics;
    }
}

export type PlaylistClass = InstanceType<typeof Playlist>;
