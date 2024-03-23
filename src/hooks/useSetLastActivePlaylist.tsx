import playlistStore from '../stores/playlist';
import { useMonitorStore } from '../stores/monitors';
import { type rendererImage } from '../types/rendererTypes';
import { imagesStore } from '../stores/images';
import { PLAYLIST_TYPES } from '../../shared/types/playlist';
import { useEffect, useState } from 'react';
const { readActivePlaylist } = window.API_RENDERER;

export function setLastActivePlaylist() {
    const { setPlaylist } = playlistStore();
    const [firstCall, setFirstCall] = useState(true);
    const { activeMonitor } = useMonitorStore();
    const { imagesArray } = imagesStore();
    useEffect(() => {
        if (activeMonitor.name === '') return;
        if (!firstCall) return;
        setFirstCall(false);
        void readActivePlaylist(activeMonitor).then(playlist => {
            if (playlist === undefined) {
                return;
            }
            const imagesToStorePlaylist: rendererImage[] = [];

            playlist.images.forEach(imageInActivePlaylist => {
                const imageToCheck = imagesArray.find(imageInGallery => {
                    return imageInGallery.name === imageInActivePlaylist.name;
                });
                if (imageToCheck === undefined) {
                    return;
                }
                if (
                    playlist.type === PLAYLIST_TYPES.timeofday &&
                    imageInActivePlaylist.time !== null
                ) {
                    imageToCheck.time = imageInActivePlaylist.time;
                }
                imageToCheck.isChecked = true;
                imagesToStorePlaylist.push(imageToCheck);
            });
            const currentPlaylist = {
                name: playlist.name,
                configuration: {
                    playlistType: playlist.type,
                    order: playlist.order,
                    interval: playlist.interval,
                    showAnimations: playlist.showAnimations
                },
                images: imagesToStorePlaylist,
                monitor: activeMonitor
            };
            console.log(currentPlaylist);
            setPlaylist(currentPlaylist);
        });
    }, [activeMonitor]);
}
