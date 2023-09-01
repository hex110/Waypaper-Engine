import { ORDER_TYPES, PLAYLIST_TYPES } from '../../src/types/rendererTypes'
export type fileList = string[] | undefined
export interface imagesObject {
  imagePaths: string[]
  fileNames: string[]
}

export type Image = {
  id: number
  imageName: string
  isChecked: boolean | 1 | 0
}

export type Playlist = {
  id: number
  name: string
  type: PLAYLIST_TYPES
  interval: number | null
  order: ORDER_TYPES | null
  showTransition: boolean | 1 | 0
  currentImageIndex: number
}

export enum ACTIONS {
  NEXT_IMAGE = 'next-image',
  PREVIOUS_IMAGE = 'previous-image',
  START_PLAYLIST = 'start-playlist',
  STOP_DAEMON = 'stop-daemon',
  PAUSE_PLAYLIST = 'pause-playlist',
  RESUME_PLAYLIST = 'resume-playlist',
  STOP_PLAYLIST = 'stop-playlist'
}

export interface message {
  action: ACTIONS
  payload?: {
    playlistName: string
    swwwOptions: string[]
  }
}

export type PlaylistControllerType = {
  startPlaylist: (
    playlistName: string,
    swwwUserOverrides?: string[] | undefined
  ) => void
  isPlaying: boolean
  pausePlaylist: () => void
  resumePlaylist: () => void
  stopPlaylist: () => void
  nextImage: () => void
  previousImage: () => void
  killDaemon: () => void
}

export enum dbTables {
  Images = 'Images',
  Playlists = 'Playlists',
  imagesInPlaylist = 'imagesInPlaylist',
  swwwConfig = 'swwwConfig',
  appConfig = 'appConfig'
}

export type imageInPlaylist = {
  imageID: number
  playlistID: number
  indexInPlaylist: number
  beginTime: number | null
  endTime: number | null
}
