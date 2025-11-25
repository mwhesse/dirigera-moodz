// Frontend types for the React application

export interface BeatData {
  timestamp: number;
  intensity: number;
  confidence: number;
}

export interface FrequencyData {
  bass: number;
  mids: number;
  treble: number;
  dominantFrequency: number;
  spectrum: number[];
}

export interface BeatResult {
  intensity: number;
  confidence: number;
}

export interface SongSection {
  type: 'DROP' | 'BUILD' | 'BREAKDOWN' | 'VERSE' | 'CHORUS';
  timestamp: number;
  confidence: number;
}

export interface Color {
  hue: number;
  saturation: number;
}

export interface Device {
  id: string;
  name: string;
  capabilities: {
    canChangeColor: boolean;
    canChangeBrightness: boolean;
    colorTemperatureRange?: {
      min: number;
      max: number;
    };
  };
  currentState: {
    isOn: boolean;
    brightness: number;
    color?: Color;
  };
  isSelected: boolean;
}

export interface SyncSettings {
  sensitivity: number;
  colorMode: 'frequency' | 'mood' | 'random';
  effectIntensity: number;
  smoothing: number;
  beatDetectionThreshold: number;
  colorTransitionSpeed: number;
}

export interface WSMessage {
  type: string;
  data: any;
}