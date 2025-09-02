import React, { useEffect, useState, useRef } from 'react';
import { AudioAnalyzer } from '../services/AudioAnalyzer';
import { WebSocketClient } from '../services/WebSocketClient';
import { useLightStore } from '../stores/lightStore';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';

export const AudioOnlyPlayer: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [microphonePermissionGranted, setMicrophonePermissionGranted] = useState(false);
  const [audioLevels, setAudioLevels] = useState({ bass: 0, mids: 0, treble: 0 });
  const [wsConnected, setWsConnected] = useState(false);
  
  const audioAnalyzer = useRef<AudioAnalyzer | null>(null);
  const wsClient = useRef<WebSocketClient | null>(null);
  const { setFrequencyData, setBeatData, lastBeatTime } = useLightStore();

  // Initialize WebSocket connection
  useEffect(() => {
    wsClient.current = new WebSocketClient(WS_URL);
    
    wsClient.current.on('connected', () => {
      console.log('WebSocket connected for audio-only mode');
      setWsConnected(true);
    });
    
    wsClient.current.on('disconnected', () => {
      console.log('WebSocket disconnected');
      setWsConnected(false);
    });
    
    wsClient.current.on('error', (data) => {
      console.error('WebSocket error:', data);
      setError('WebSocket connection failed');
      setWsConnected(false);
    });

    return () => {
      if (wsClient.current) {
        wsClient.current.destroy();
      }
    };
  }, []);

  // Initialize Audio Analyzer
  useEffect(() => {
    if (!wsClient.current) return;

    audioAnalyzer.current = new AudioAnalyzer(
      // Beat detection callback
      (beatData) => {
        console.log('Beat detected:', beatData);
        wsClient.current?.sendBeatDetection(beatData);
        setBeatData(beatData.timestamp);
      },
      // Frequency update callback
      (frequencyData) => {
        console.log('Frequency update:', { bass: frequencyData.bass.toFixed(2), mids: frequencyData.mids.toFixed(2), treble: frequencyData.treble.toFixed(2) });
        wsClient.current?.sendFrequencyUpdate(frequencyData);
        setFrequencyData(frequencyData);
        setAudioLevels({
          bass: frequencyData.bass,
          mids: frequencyData.mids,
          treble: frequencyData.treble
        });
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
  }, [setFrequencyData, setBeatData]);

  const startAudioAnalysis = async () => {
    if (!audioAnalyzer.current) return;

    try {
      setError(null);
      await audioAnalyzer.current.initializeMicrophoneInput();
      audioAnalyzer.current.start();
      setMicrophonePermissionGranted(true);
      setIsAnalyzing(true);
      console.log('Audio analysis started in microphone mode');
    } catch (error) {
      console.error('Failed to start audio analysis:', error);
      setError('Microphone access required for light sync. Please allow microphone permissions.');
    }
  };

  const stopAudioAnalysis = () => {
    if (audioAnalyzer.current) {
      audioAnalyzer.current.stop();
      setIsAnalyzing(false);
      console.log('Audio analysis stopped');
    }
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

  if (!microphonePermissionGranted) {
    return (
      <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-4">
            Audio-Reactive Light Controller
          </h3>
          <div className="text-white/80 text-sm mb-6 space-y-3">
            <p>
              Transform any audio into a synchronized light show! This mode works with:
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="font-medium mb-1">🎵 Music</div>
                <div>Spotify, Apple Music, YouTube, etc.</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="font-medium mb-1">🎮 Games</div>
                <div>Sound effects and game audio</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="font-medium mb-1">🎬 Movies</div>
                <div>Dialogue and sound effects</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="font-medium mb-1">🎤 Live Audio</div>
                <div>Instruments, voice, ambient sound</div>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="font-medium mb-2">📋 Setup Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs text-left">
                <li>Make sure your audio is playing through <strong>speakers</strong></li>
                <li>Click "Start Light Sync" below</li>
                <li>Allow microphone access when prompted</li>
                <li>Play any audio and watch your lights dance!</li>
              </ol>
            </div>
            <div className="text-xs text-white/60">
              <p>🔒 <strong>Privacy:</strong> Audio is processed locally and never sent to servers.</p>
            </div>
          </div>

          <button
            onClick={startAudioAnalysis}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Start Light Sync
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h3 className="text-xl font-semibold text-white mb-2">
            Audio-Reactive Light Controller
          </h3>
          <p className="text-white/60">
            Listening for audio to sync with your lights
          </p>
        </div>

        {/* Audio Level Meters */}
        <div className="space-y-4">
          <h4 className="text-white font-medium text-center">Live Audio Analysis</h4>
          
          <div className="grid grid-cols-3 gap-4">
            {/* Bass */}
            <div className="text-center">
              <div className="text-red-300 font-medium text-sm mb-2">BASS</div>
              <div className="w-full bg-white/10 rounded-full h-24 relative overflow-hidden">
                <div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-red-500 to-red-300 rounded-full transition-all duration-150"
                  style={{ height: `${audioLevels.bass * 100}%` }}
                />
              </div>
              <div className="text-red-300 text-xs mt-1">
                {(audioLevels.bass * 100).toFixed(0)}%
              </div>
            </div>

            {/* Mids */}
            <div className="text-center">
              <div className="text-green-300 font-medium text-sm mb-2">MIDS</div>
              <div className="w-full bg-white/10 rounded-full h-24 relative overflow-hidden">
                <div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500 to-green-300 rounded-full transition-all duration-150"
                  style={{ height: `${audioLevels.mids * 100}%` }}
                />
              </div>
              <div className="text-green-300 text-xs mt-1">
                {(audioLevels.mids * 100).toFixed(0)}%
              </div>
            </div>

            {/* Treble */}
            <div className="text-center">
              <div className="text-blue-300 font-medium text-sm mb-2">TREBLE</div>
              <div className="w-full bg-white/10 rounded-full h-24 relative overflow-hidden">
                <div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500 to-blue-300 rounded-full transition-all duration-150"
                  style={{ height: `${audioLevels.treble * 100}%` }}
                />
              </div>
              <div className="text-blue-300 text-xs mt-1">
                {(audioLevels.treble * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center space-x-4">
          {isAnalyzing ? (
            <button
              onClick={stopAudioAnalysis}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              <div className="flex items-center">
                <div className="w-3 h-3 bg-white rounded-full mr-2"></div>
                Stop Analysis
              </div>
            </button>
          ) : (
            <button
              onClick={startAudioAnalysis}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              <div className="flex items-center">
                <div className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse"></div>
                Resume Analysis
              </div>
            </button>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center justify-center space-x-4 text-xs">
          <div className={`flex items-center ${wsConnected ? 'text-green-400' : 'text-red-400'}`}>
            <div className={`w-2 h-2 rounded-full mr-1 ${wsConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            Sync {wsConnected ? 'Connected' : 'Disconnected'}
          </div>
          <div className={`flex items-center ${isAnalyzing ? 'text-green-400' : 'text-yellow-400'}`}>
            <div className={`w-2 h-2 rounded-full mr-1 ${isAnalyzing ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
            Mic {isAnalyzing ? 'Active' : 'Paused'}
          </div>
          <div className="text-white/40">
            Beat Data: {lastBeatTime ? 'Yes' : 'No'}
          </div>
        </div>

        {/* Debug Info */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4">
            <p className="text-red-200 text-xs">{error}</p>
          </div>
        )}

        {/* Tips */}
        <div className="bg-white/5 rounded-lg p-4">
          <h4 className="text-white font-medium text-sm mb-2">💡 Tips for best results:</h4>
          <ul className="text-white/60 text-xs space-y-1">
            <li>• Use speakers instead of headphones</li>
            <li>• Turn up your volume for better detection</li>
            <li>• Minimize background noise</li>
            <li>• Try different music genres for different effects</li>
            <li>• Make sure your backend server is running on port 3001</li>
            <li>• Ensure DIRIGERA lights are discovered and connected</li>
          </ul>
        </div>
      </div>
    </div>
  );
};