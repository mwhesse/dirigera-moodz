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
}

export interface SyncSettings {
  sensitivity: number;
  colorMode: 'frequency' | 'mood' | 'random';
  effectIntensity: number;
  smoothing: number;
  beatDetectionThreshold: number;
  colorTransitionSpeed: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: string;
  album: string;
  duration: number;
  position: number;
  isPlaying: boolean;
}

export interface WSMessage {
  type: string;
  data: any;
}

export interface PlaybackState {
  trackId: string;
  position: number;
  isPlaying: boolean;
}

// Spotify Web Playbook SDK types
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
  }

  interface SpotifyPlayer {
    addListener(event: string, callback: (data: any) => void): boolean;
    removeListener(event: string, callback?: (data: any) => void): boolean;
    connect(): Promise<boolean>;
    disconnect(): void;
    getCurrentState(): Promise<SpotifyPlaybackState | null>;
    getVolume(): Promise<number>;
    nextTrack(): Promise<void>;
    pause(): Promise<void>;
    previousTrack(): Promise<void>;
    resume(): Promise<void>;
    seek(position_ms: number): Promise<void>;
    setName(name: string): Promise<void>;
    setVolume(volume: number): Promise<void>;
    togglePlay(): Promise<void>;
  }

  interface SpotifyPlaybackState {
    context: {
      uri: string;
      metadata: any;
    };
    disallows: {
      pausing: boolean;
      peeking_next: boolean;
      peeking_prev: boolean;
      resuming: boolean;
      seeking: boolean;
      skipping_next: boolean;
      skipping_prev: boolean;
    };
    paused: boolean;
    position: number;
    repeat_mode: number;
    shuffle: boolean;
    track_window: {
      current_track: SpotifyTrackWindow;
      previous_tracks: SpotifyTrackWindow[];
      next_tracks: SpotifyTrackWindow[];
    };
  }

  interface SpotifyTrackWindow {
    id: string;
    uri: string;
    name: string;
    duration_ms: number;
    album: {
      uri: string;
      name: string;
      images: Array<{ url: string; height: number; width: number }>;
    };
    artists: Array<{ uri: string; name: string }>;
  }
}