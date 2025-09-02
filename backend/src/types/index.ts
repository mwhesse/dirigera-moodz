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
}

export interface LightUpdate {
  color?: Color;
  brightness?: number;
  transitionTime?: number;
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

export interface SpotifyConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface TokenData {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  expires_at: number;
}

export interface PlaybackState {
  device: {
    id: string;
    name: string;
    is_active: boolean;
  };
  track: {
    id: string;
    name: string;
    artists: Array<{ name: string }>;
    album: {
      name: string;
    };
    duration_ms: number;
  };
  progress_ms: number;
  is_playing: boolean;
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