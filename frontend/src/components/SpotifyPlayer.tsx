import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSpotifyStore } from '../stores/spotifyStore';
import { AudioAnalyzer } from '../services/AudioAnalyzer';
import { WebSocketClient } from '../services/WebSocketClient';
import { MicrophonePermission } from './MicrophonePermission';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';

export const SpotifyPlayer: React.FC = () => {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [microphonePermissionGranted, setMicrophonePermissionGranted] = useState(false);
  const [showMicrophonePermission, setShowMicrophonePermission] = useState(false);
  
  const audioAnalyzer = useRef<AudioAnalyzer | null>(null);
  const wsClient = useRef<WebSocketClient | null>(null);
  const positionUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  
  const {
    accessToken,
    currentTrack,
    isPlaying,
    position,
    player,
    deviceId,
    isPlayerReady,
    isConnecting,
    setCurrentTrack,
    setPlaybackState,
    setPlayer,
    setPlayerReady,
    setConnecting,
    setConnectionError,
    updatePosition
  } = useSpotifyStore();

  // Initialize WebSocket connection
  useEffect(() => {
    if (!accessToken) return;

    wsClient.current = new WebSocketClient(WS_URL);
    
    wsClient.current.on('connected', () => {
      console.log('WebSocket connected');
    });
    
    wsClient.current.on('error', (data) => {
      console.error('WebSocket error:', data);
      setError('WebSocket connection failed');
    });

    return () => {
      if (wsClient.current) {
        wsClient.current.destroy();
      }
    };
  }, [accessToken]);

  // Initialize Audio Analyzer
  useEffect(() => {
    if (!wsClient.current) return;

    audioAnalyzer.current = new AudioAnalyzer(
      // Beat detection callback
      (beatData) => {
        wsClient.current?.sendBeatDetection(beatData);
      },
      // Frequency update callback
      (frequencyData) => {
        wsClient.current?.sendFrequencyUpdate(frequencyData);
      },
      // Song section callback
      (sectionData) => {
        wsClient.current?.sendSongSection(sectionData);
      }
    );

    audioAnalyzer.current.initialize().catch(console.error);

    return () => {
      if (audioAnalyzer.current) {
        audioAnalyzer.current.destroy();
      }
    };
  }, [wsClient.current]);

  // Load Spotify Web Playback SDK
  useEffect(() => {
    if (!accessToken || isSDKLoaded) return;

    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    
    script.onload = () => {
      setIsSDKLoaded(true);
    };

    script.onerror = () => {
      setError('Failed to load Spotify Web Playback SDK');
      setConnectionError('Failed to load Spotify SDK');
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [accessToken]);

  // Initialize Spotify Player when SDK is loaded
  useEffect(() => {
    if (!isSDKLoaded || !accessToken || player) return;

    window.onSpotifyWebPlaybackSDKReady = () => {
      initializePlayer();
    };

    // If the callback has already been called
    if (window.Spotify) {
      initializePlayer();
    }
  }, [isSDKLoaded, accessToken, player]);

  const initializePlayer = useCallback(() => {
    if (!window.Spotify || !accessToken) return;

    setConnecting(true);
    setError(null);

    const spotifyPlayer = new window.Spotify.Player({
      name: 'TRADFRI Music Sync Player',
      getOAuthToken: (cb) => {
        cb(accessToken);
      },
      volume: 0.8
    });

    // Player event handlers
    spotifyPlayer.addListener('ready', ({ device_id }) => {
      console.log('Spotify Player ready with Device ID:', device_id);
      setPlayer(spotifyPlayer, device_id);
      setPlayerReady(true);
      setConnecting(false);
      
      // Transfer playback to this device
      transferPlayback(device_id);
    });

    spotifyPlayer.addListener('not_ready', ({ device_id }) => {
      console.log('Device ID has gone offline:', device_id);
      setPlayerReady(false);
    });

    spotifyPlayer.addListener('player_state_changed', (state) => {
      if (!state) return;

      const track = state.track_window.current_track;
      const newTrack = {
        id: track.id,
        name: track.name,
        artists: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        duration: track.duration_ms,
        position: state.position,
        isPlaying: !state.paused
      };

      setCurrentTrack(newTrack);
      setPlaybackState(!state.paused, state.position);

      // Send playback state to backend
      if (wsClient.current) {
        wsClient.current.sendPlaybackState({
          trackId: track.id,
          position: state.position,
          isPlaying: !state.paused
        });
      }

      // Show microphone permission prompt when music starts playing
      if (!state.paused && !microphonePermissionGranted && !showMicrophonePermission) {
        setShowMicrophonePermission(true);
      } else if (!state.paused && microphonePermissionGranted && audioAnalyzer.current) {
        connectAudioAnalyzer();
      } else if (state.paused && audioAnalyzer.current) {
        audioAnalyzer.current.stop();
      }
    });

    spotifyPlayer.addListener('initialization_error', ({ message }) => {
      console.error('Spotify Player initialization error:', message);
      setError(`Player initialization failed: ${message}`);
      setConnectionError(`Player initialization failed: ${message}`);
      setConnecting(false);
    });

    spotifyPlayer.addListener('authentication_error', ({ message }) => {
      console.error('Spotify Player authentication error:', message);
      setError(`Authentication failed: ${message}`);
      setConnectionError(`Authentication failed: ${message}`);
      setConnecting(false);
    });

    spotifyPlayer.addListener('account_error', ({ message }) => {
      console.error('Spotify Player account error:', message);
      setError(`Account error: ${message}`);
      setConnectionError(`Account error: ${message}`);
      setConnecting(false);
    });

    // Connect the player
    spotifyPlayer.connect().catch((error) => {
      console.error('Failed to connect Spotify Player:', error);
      setError('Failed to connect to Spotify');
      setConnectionError('Failed to connect to Spotify');
      setConnecting(false);
    });

    setPlayer(spotifyPlayer);
  }, [accessToken, setPlayer, setPlayerReady, setConnecting, setConnectionError]);

  const connectAudioAnalyzer = useCallback(async () => {
    if (!audioAnalyzer.current) return;

    try {
      // Initialize microphone input for audio analysis
      await audioAnalyzer.current.initializeMicrophoneInput();
      audioAnalyzer.current.start();
      console.log('Audio analyzer connected via microphone');
    } catch (error) {
      console.error('Failed to connect audio analyzer:', error);
      setError('Microphone access required for light sync. Please allow microphone permissions.');
    }
  }, []);

  const transferPlayback = async (deviceId: string) => {
    if (!accessToken) return;

    setIsTransferring(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/spotify/transfer`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deviceId: deviceId,
          play: true
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to transfer playback');
      }

      console.log('Playback transferred successfully');
    } catch (error) {
      console.error('Error transferring playback:', error);
      setError(error instanceof Error ? error.message : 'Failed to transfer playback');
    } finally {
      setIsTransferring(false);
    }
  };

  // Position update timer
  useEffect(() => {
    if (isPlaying && currentTrack) {
      positionUpdateInterval.current = setInterval(() => {
        updatePosition(position + 1000);
      }, 1000);
    } else if (positionUpdateInterval.current) {
      clearInterval(positionUpdateInterval.current);
      positionUpdateInterval.current = null;
    }

    return () => {
      if (positionUpdateInterval.current) {
        clearInterval(positionUpdateInterval.current);
      }
    };
  }, [isPlaying, currentTrack, position, updatePosition]);

  // Player controls
  const togglePlay = async () => {
    if (!player) return;
    
    try {
      await player.togglePlay();
    } catch (error) {
      console.error('Error toggling play:', error);
    }
  };

  const nextTrack = async () => {
    if (!player) return;
    
    try {
      await player.nextTrack();
    } catch (error) {
      console.error('Error skipping to next track:', error);
    }
  };

  const previousTrack = async () => {
    if (!player) return;
    
    try {
      await player.previousTrack();
    } catch (error) {
      console.error('Error skipping to previous track:', error);
    }
  };

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleMicrophonePermissionGranted = async () => {
    setMicrophonePermissionGranted(true);
    setShowMicrophonePermission(false);
    
    // Start audio analysis if music is currently playing
    if (isPlaying && audioAnalyzer.current) {
      await connectAudioAnalyzer();
    }
  };

  const handleSkipMicrophonePermission = () => {
    setShowMicrophonePermission(false);
    // User can still use the app without light sync
  };

  if (error) {
    return (
      <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
        <p className="text-red-200 text-sm mb-2">{error}</p>
        <button
          onClick={() => setError(null)}
          className="text-red-300 hover:text-red-200 text-xs underline"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (isConnecting || !isPlayerReady) {
    return (
      <div className="bg-white/5 rounded-lg p-6">
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin mr-3"></div>
          <span className="text-white/70">
            {isTransferring ? 'Transferring playback...' : 'Connecting to Spotify...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Microphone permission prompt */}
      {showMicrophonePermission && (
        <MicrophonePermission
          onPermissionGranted={handleMicrophonePermissionGranted}
          onSkip={handleSkipMicrophonePermission}
        />
      )}

      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6">
        {currentTrack ? (
        <div className="space-y-4">
          {/* Track info */}
          <div className="text-center">
            <h3 className="text-xl font-semibold text-white mb-1">
              {currentTrack.name}
            </h3>
            <p className="text-white/60 mb-2">{currentTrack.artists}</p>
            <p className="text-white/40 text-sm">{currentTrack.album}</p>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="w-full bg-white/10 rounded-full h-1">
              <div
                className="bg-green-400 h-1 rounded-full transition-all duration-1000"
                style={{
                  width: `${currentTrack.duration > 0 ? (position / currentTrack.duration) * 100 : 0}%`
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-white/50">
              <span>{formatTime(position)}</span>
              <span>{formatTime(currentTrack.duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={previousTrack}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>
            
            <button
              onClick={togglePlay}
              className="p-3 bg-green-500 hover:bg-green-600 rounded-full transition-colors"
            >
              {isPlaying ? (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="m7 4 10 6L7 16V4z"/>
                </svg>
              )}
            </button>
            
            <button
              onClick={nextTrack}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>
          </div>

          {/* Status indicators */}
          <div className="flex items-center justify-center space-x-4 text-xs">
            <div className={`flex items-center ${wsClient.current?.getConnectionStatus().connected ? 'text-green-400' : 'text-red-400'}`}>
              <div className={`w-2 h-2 rounded-full mr-1 ${wsClient.current?.getConnectionStatus().connected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              Sync {wsClient.current?.getConnectionStatus().connected ? 'Connected' : 'Disconnected'}
            </div>
            <div className={`flex items-center ${microphonePermissionGranted ? 'text-green-400' : 'text-yellow-400'}`}>
              <div className={`w-2 h-2 rounded-full mr-1 ${microphonePermissionGranted ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
              Mic {microphonePermissionGranted ? 'Active' : 'Needed'}
            </div>
            <div className="text-white/40">
              Device: {deviceId?.slice(-8)}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-white/60 mb-4">No track playing</p>
          <p className="text-white/40 text-sm">
            Start playing music on Spotify to begin light sync
          </p>
        </div>
      )}
      </div>
    </div>
  );
};