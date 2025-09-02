import React, { useState, useEffect } from 'react';
import { SpotifyAuth } from './components/SpotifyAuth';
import { SpotifyPlayer } from './components/SpotifyPlayer';
import { AudioOnlyPlayer } from './components/AudioOnlyPlayer';
import { ModeSelector } from './components/ModeSelector';
import { LightController } from './components/LightController';
import { VisualizationCanvas } from './components/VisualizationCanvas';
import { LightSelector } from './components/LightSelector';
import { Settings } from './components/Settings';
import { useSpotifyStore } from './stores/spotifyStore';
import { useLightStore } from './stores/lightStore';

function App() {
  const { isAuthenticated } = useSpotifyStore();
  const { devices, isConnected: lightsConnected } = useLightStore();
  const [showSettings, setShowSettings] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [appMode, setAppMode] = useState<'select' | 'spotify' | 'audio-only'>('select');

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Handle mode selection
  const handleModeSelect = (mode: 'spotify' | 'audio-only') => {
    setAppMode(mode);
  };

  // Show mode selector first
  if (appMode === 'select') {
    return <ModeSelector onModeSelect={handleModeSelect} />;
  }

  // Show Spotify auth if in Spotify mode and not authenticated
  if (appMode === 'spotify' && !isAuthenticated) {
    return <SpotifyAuth />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Dirigera Moodz
            </h1>
            <p className="text-white/70">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • 
              {appMode === 'spotify' ? 'Spotify Mode' : 'Audio-Only Mode'} • 
              {devices.length} light{devices.length !== 1 ? 's' : ''} connected
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Status indicators */}
            <div className="flex items-center space-x-3">
              {appMode === 'spotify' && (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-white/70 text-sm">Spotify</span>
                </div>
              )}
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${lightsConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-white/70 text-sm">Lights</span>
              </div>
            </div>
            
            <button
              onClick={() => setAppMode('select')}
              className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
              title="Change Mode"
            >
              Change Mode
            </button>
            
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Settings"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </header>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left column - Player and visualization */}
          <div className="space-y-6">
            {appMode === 'spotify' ? <SpotifyPlayer /> : <AudioOnlyPlayer />}
            <VisualizationCanvas />
          </div>

          {/* Right column - Light controller and selector */}
          <div className="space-y-6">
            <LightSelector />
            <LightController devices={devices} />
          </div>
        </div>

        {/* Connection warnings */}
        {!lightsConnected && (
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-yellow-200 font-medium">DIRIGERA Hub Not Connected</p>
                <p className="text-yellow-200/80 text-sm">
                  Make sure your DIRIGERA hub is powered on and on the same network. Music will still play without lights.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-white/40 text-sm mt-12">
          <p>
            Dirigera Moodz • {appMode === 'spotify' ? 'Spotify Integration' : 'Universal Audio'} Mode • 
            Compatible with IKEA DIRIGERA Hub
          </p>
          <div className="flex items-center justify-center space-x-6 mt-2">
            <span>Real-time Audio Analysis</span>
            <span>•</span>
            <span>WebSocket Synchronization</span>
            <span>•</span>
            <span>Smart Light Control</span>
            {appMode === 'audio-only' && (
              <>
                <span>•</span>
                <span>Universal Compatibility</span>
              </>
            )}
          </div>
        </footer>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

export default App;