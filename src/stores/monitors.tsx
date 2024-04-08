import { create } from 'zustand';
import { type Monitor, type ActiveMonitor } from '../../shared/types/monitor';
import { playlistStore } from './playlist';
const { getMonitors, querySelectedMonitor } = window.API_RENDERER;

export interface StoreMonitor extends Monitor {
    isSelected: boolean;
}

interface MonitorStore {
    activeMonitor: ActiveMonitor;
    monitorsList: StoreMonitor[];
    setActiveMonitor: (value: ActiveMonitor) => void;
    setMonitorsList: (monitorsList: StoreMonitor[]) => void;
    reQueryMonitors: () => Promise<void>;
    reQuerySelectedMonitor: () => void;
}

const initialState = {
    activeMonitor: {
        name: '',
        monitors: [] as Monitor[],
        extendAcrossMonitors: false
    },
    monitorsList: [] as StoreMonitor[]
};

export const useMonitorStore = create<MonitorStore>()((set, get) => ({
    activeMonitor: initialState.activeMonitor,
    monitorsList: initialState.monitorsList,
    setActiveMonitor(value) {
        playlistStore.getState().setActiveMonitorPlaylist(value);
        set(state => {
            return {
                ...state,
                activeMonitor: value
            };
        });
    },
    setMonitorsList(monitorsList) {
        set(state => {
            return {
                ...state,
                monitorsList
            };
        });
    },
    async reQueryMonitors() {
        const monitors = await getMonitors();
        const activeMonitor = get().activeMonitor;
        const storeMonitors = monitors.map(monitor => {
            const match = activeMonitor.monitors.find(activeMonitor => {
                return activeMonitor.name === monitor.name;
            });
            const isSelected = match !== undefined;
            return {
                ...monitor,
                isSelected
            };
        });
        set(state => {
            return {
                ...state,
                monitorsList: storeMonitors
            };
        });
    },
    reQuerySelectedMonitor() {
        void querySelectedMonitor().then(selectedMonitor => {
            if (selectedMonitor === undefined) {
                set(() => ({ activeMonitor: initialState.activeMonitor }));
                return;
            }
            set(() => ({ activeMonitor: selectedMonitor }));
        });
    }
}));
