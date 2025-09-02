import { create } from 'zustand';
import { Device, SyncSettings } from '../types';

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
  removeDevice: (deviceId: string) => void;
  setSyncSettings: (settings: Partial<SyncSettings>) => void;
  setBeatData: (timestamp: number) => void;
  setFrequencyData: (data: any) => void;
  setServerStats: (stats: any) => void;
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

export const useLightStore = create<LightState>((set, get) => ({
  // Initial state
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  
  devices: [],
  deviceCount: 0,
  
  syncSettings: defaultSyncSettings,
  
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