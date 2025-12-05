import { create } from 'zustand';
import { Device, SyncSettings, Scene } from '@/types';

interface LightState {
  // Connection status
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  
  // Devices
  devices: Device[];
  deviceCount: number;
  
  // Sync settings
  syncSettings: SyncSettings;
  
  // Current active scene
  currentScene: Scene | null;
  
  // Real-time data
  lastBeatTime: number | null;
  currentFrequencyData: any | null;
  
  // System status
  serverStats: any | null;
  
  // Actions
  setConnection: (connected: boolean, error?: string) => void;
  setConnecting: (connecting: boolean) => void;
  setDevices: (devices: Device[]) => void;
  addDevice: (device: Device) => void;
  updateDevice: (deviceId: string, updates: Partial<Device>) => void;
  updateDevices: (updates: Partial<Device>[]) => void;
  removeDevice: (deviceId: string) => void;
  setSyncSettings: (settings: Partial<SyncSettings>) => void;
  setBeatData: (timestamp: number) => void;
  setFrequencyData: (data: any) => void;
  setServerStats: (stats: any) => void;
  setCurrentScene: (scene: Scene | null) => void;
  updateCurrentScene: (updates: Partial<Scene>) => void;
  toggleDeviceSelection: (deviceId: string, isSelected: boolean) => Promise<void>;
  reset: () => void;
}

const defaultSyncSettings: SyncSettings = {
  sensitivity: 0.7,
  colorMode: 'frequency',
  effectIntensity: 0.8,
  smoothing: 0.6,
  beatDetectionThreshold: 0.6,
  colorTransitionSpeed: 200
};

const API_BASE_URL = '/api'; // Assuming API is relative to the client host

export const useLightStore = create<LightState>((set, get) => ({
  // Initial state
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  
  devices: [],
  deviceCount: 0,
  
  syncSettings: defaultSyncSettings,
  
  currentScene: null,
  
  lastBeatTime: null,
  currentFrequencyData: null,
  
  serverStats: null,

  // Actions
  setConnection: (connected: boolean, error?: string) => {
    set({
      isConnected: connected,
      isConnecting: false,
      connectionError: error || null
    });
  },

  setConnecting: (connecting: boolean) => {
    set({ 
      isConnecting: connecting,
      connectionError: connecting ? null : get().connectionError
    });
  },

  setDevices: (devices: Device[]) => {
    set({
      devices,
      deviceCount: devices.length,
      isConnected: true,
      connectionError: null
    });
  },

  addDevice: (device: Device) => {
    const currentDevices = get().devices;
    const existingIndex = currentDevices.findIndex(d => d.id === device.id);
    
    if (existingIndex >= 0) {
      // Update existing device
      const updatedDevices = [...currentDevices];
      updatedDevices[existingIndex] = device;
      set({
        devices: updatedDevices,
        deviceCount: updatedDevices.length
      });
    } else {
      // Add new device
      const updatedDevices = [...currentDevices, device];
      set({
        devices: updatedDevices,
        deviceCount: updatedDevices.length
      });
    }
  },

  updateDevice: (deviceId: string, updates: Partial<Device>) => {
    const devices = get().devices;
    const deviceIndex = devices.findIndex(d => d.id === deviceId);
    
    if (deviceIndex >= 0) {
      const updatedDevices = [...devices];
      updatedDevices[deviceIndex] = {
        ...updatedDevices[deviceIndex],
        ...updates,
        currentState: {
          ...updatedDevices[deviceIndex].currentState,
          ...(updates.currentState || {})
        },
        capabilities: {
          ...updatedDevices[deviceIndex].capabilities,
          ...(updates.capabilities || {})
        }
      };
      
      set({ devices: updatedDevices });
    }
  },

  updateDevices: (updates: Partial<Device>[]) => {
    const devices = get().devices;
    const deviceMap = new Map(devices.map(d => [d.id, d]));
    let hasChanges = false;

    updates.forEach(update => {
      const device = deviceMap.get(update.id!);
      if (device) {
        deviceMap.set(update.id!, {
          ...device,
          ...update,
          currentState: {
            ...device.currentState,
            ...(update.currentState || {})
          },
          capabilities: {
            ...device.capabilities,
            ...(update.capabilities || {})
          }
        });
        hasChanges = true;
      }
    });

    if (hasChanges) {
      set({ devices: Array.from(deviceMap.values()) });
    }
  },

  removeDevice: (deviceId: string) => {
    const devices = get().devices;
    const filteredDevices = devices.filter(d => d.id !== deviceId);
    set({
      devices: filteredDevices,
      deviceCount: filteredDevices.length
    });
  },

  setSyncSettings: (settings: Partial<SyncSettings>) => {
    set({
      syncSettings: {
        ...get().syncSettings,
        ...settings
      }
    });
  },

  setBeatData: (timestamp: number) => {
    set({ lastBeatTime: timestamp });
  },

  setFrequencyData: (data: any) => {
    set({ currentFrequencyData: data });
  },

  setServerStats: (stats: any) => {
    set({ serverStats: stats });
  },

  setCurrentScene: (scene: Scene | null) => {
    set({ currentScene: scene });
  },

  updateCurrentScene: (updates: Partial<Scene>) => {
    const { currentScene } = get();
    if (currentScene) {
      set({ currentScene: { ...currentScene, ...updates } });
    }
  },

  toggleDeviceSelection: async (deviceId: string, isSelected: boolean) => {
    const state = get();
    const updatedDevices = state.devices.map(d => 
      d.id === deviceId ? { ...d, isSelected } : d
    );
    set({ devices: updatedDevices });

    const selectedIds = updatedDevices.filter(d => d.isSelected).map(d => d.id);

    try {
      await fetch(`${API_BASE_URL}/lights/selection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedLights: selectedIds })
      });
    } catch (err) {
      console.error('Error updating selection:', err);
      // Revert local state if API call fails
      set({ devices: state.devices });
    }
  },

  reset: () => {
    set({
      isConnected: false,
      isConnecting: false,
      connectionError: null,
      
      devices: [],
      deviceCount: 0,
      
      syncSettings: defaultSyncSettings,
      
      lastBeatTime: null,
      currentFrequencyData: null,
      
      serverStats: null
    });
  }
}));

// Added a comment to trigger re-compilation