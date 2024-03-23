import { useEffect } from 'react';
import { imagesStore } from '../stores/images';
import AddImagesCard from './AddImagesCard';
import PaginatedGallery from './PaginatedGallery';
import playlistStore from '../stores/playlist';
import { type rendererImage } from '../types/rendererTypes';
import Filters from './Filters';
import { PLAYLIST_TYPES } from '../../shared/types/playlist';
import { useMonitorStore } from '../stores/monitors';
const { readActivePlaylist } = window.API_RENDERER;
function Gallery() {
    const { isEmpty, imagesArray, isQueried } = imagesStore();
    const { activeMonitor } = useMonitorStore();
    const { setPlaylist } = playlistStore();
    function setLastActivePlaylist() {
        void readActivePlaylist(activeMonitor.name).then(playlist => {
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
            setPlaylist(currentPlaylist);
        });
    }
    useEffect(() => {
        if (isEmpty) return;
        setLastActivePlaylist();
    }, [isEmpty]);
    if (!isQueried) return <></>;
    if (isEmpty)
        return (
            <div className="flex flex-col justify-center items-center h-[90dvh] m-auto overflow-hidden">
                <AddImagesCard />
            </div>
        );
    return (
        <>
            <Filters />
            <PaginatedGallery />
        </>
    );
}

export default Gallery;
