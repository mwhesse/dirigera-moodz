import { create } from 'zustand';
import { SpotifyTrack } from '../types';

interface SpotifyState {
  // Authentication
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number | null;
  
  // User info
  userProfile: any | null;
  
  // Playback state
  currentTrack: SpotifyTrack | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  
  // Player instance
  player: SpotifyPlayer | null;
  deviceId: string | null;
  
  // Connection status
  isPlayerReady: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // Actions
  setAuthenticated: (token: string, refreshToken?: string, expiresIn?: number) => void;
  setUserProfile: (profile: any) => void;
  setCurrentTrack: (track: SpotifyTrack) => void;
  setPlaybackState: (isPlaying: boolean, position: number) => void;
  setPlayer: (player: SpotifyPlayer | null, deviceId?: string) => void;
  setPlayerReady: (ready: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setConnectionError: (error: string | null) => void;
  updatePosition: (position: number) => void;
  clearAuth: () => void;
  reset: () => void;
}

export const useSpotifyStore = create<SpotifyState>((set, get) => ({
  // Initial state
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  tokenExpiresAt: null,
  
  userProfile: null,
  
  currentTrack: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  
  player: null,
  deviceId: null,
  
  isPlayerReady: false,
  isConnecting: false,
  connectionError: null,

  // Actions
  setAuthenticated: (token: string, refreshToken?: string, expiresIn?: number) => {
    const expiresAt = expiresIn ? Date.now() + (expiresIn * 1000) : null;
    set({
      isAuthenticated: true,
      accessToken: token,
      refreshToken: refreshToken || null,
      tokenExpiresAt: expiresAt,
      connectionError: null
    });
  },

  setUserProfile: (profile: any) => {
    set({ userProfile: profile });
  },

  setCurrentTrack: (track: SpotifyTrack) => {
    set({ 
      currentTrack: track,
      duration: track.duration,
      position: track.position,
      isPlaying: track.isPlaying
    });
  },

  setPlaybackState: (isPlaying: boolean, position: number) => {
    set({ isPlaying, position });
  },

  setPlayer: (player: SpotifyPlayer | null, deviceId?: string) => {
    set({ 
      player,
      deviceId: deviceId || null,
      isPlayerReady: player !== null
    });
  },

  setPlayerReady: (ready: boolean) => {
    set({ 
      isPlayerReady: ready,
      isConnecting: ready ? false : get().isConnecting
    });
  },

  setConnecting: (connecting: boolean) => {
    set({ 
      isConnecting: connecting,
      connectionError: connecting ? null : get().connectionError
    });
  },

  setConnectionError: (error: string | null) => {
    set({ 
      connectionError: error,
      isConnecting: false
    });
  },

  updatePosition: (position: number) => {
    set({ position });
  },

  clearAuth: () => {
    set({
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      userProfile: null
    });
  },

  reset: () => {
    set({
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      
      userProfile: null,
      
      currentTrack: null,
      isPlaying: false,
      position: 0,
      duration: 0,
      
      player: null,
      deviceId: null,
      
      isPlayerReady: false,
      isConnecting: false,
      connectionError: null
    });
  }
}));