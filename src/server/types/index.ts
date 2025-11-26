// Common types for the application

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
  isSelected?: boolean;
}

export interface LightUpdate {
  color?: Color;
  brightness?: number;
  transitionTime?: number;
  isOn?: boolean;
}

export interface LightCommand {
  type: 'PULSE' | 'SET_COLOR' | 'SET_BRIGHTNESS' | 'STROBE';
  brightness?: number;
  color?: Color;
  transitionTime?: number;
  returnToPrevious?: boolean;
  returnDelay?: number;
}

export interface ScheduledCommand {
  command: LightCommand;
  sendTime: number;
}

export interface DirigeraConfig {
  accessToken?: string;
  gatewayIP?: string;
}

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

export interface AnalysisState {
  previousColor?: Color;
  colorHistory: Color[];
  smoothColor(newColor: Color): Color;
}