export interface Image {
  imageID: number
  imageName: string
  isChecked: boolean
}

export interface imagesObject {
  imagePaths: string[]
  fileNames: string[]
}

export enum ORDER_TYPES {
  ORDERED = 'ordered',
  RANDOM = 'random'
}

export enum STORE_ACTIONS {
  SET_IMAGES_ARRAY = 'SET_IMAGES_ARRAY',
  SET_SKELETONS_TO_SHOW = 'SET_SKELETONS_TO_SHOW',
  SET_SEARCH_FILTER = 'SET_SEARCH_FILTER',
  RESET_IMAGES_ARRAY = 'RESET_IMAGES_ARRAY'
}

export enum PLAYLIST_TYPES {
  TIMER = 'timer',
  NEVER = 'never',
  TIME_OF_DAY = 'timeofday',
  DAY_OF_WEEK = 'dayofweek'
}

export type configuration = {
  playlistType: PLAYLIST_TYPES
  interval: number | null
  order: ORDER_TYPES
  showTransition: boolean
}


export type playlist = {
  images: Image[]
  configuration: configuration
  name: string
}
