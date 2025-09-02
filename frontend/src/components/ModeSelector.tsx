import React from 'react';

interface ModeSelectorProps {
  onModeSelect: (mode: 'spotify' | 'audio-only') => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ onModeSelect }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            TRADFRI Music Sync
          </h1>
          <p className="text-white/70 text-lg">
            Choose how you'd like to sync your lights with audio
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Spotify Mode */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 hover:border-green-400/50 transition-all duration-300 group cursor-pointer"
               onClick={() => onModeSelect('spotify')}>
            <div className="text-center">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.062 14.615c-.157.382-.5.618-.863.618-.127 0-.258-.031-.378-.096-1.692-1.022-3.815-1.259-6.321-.691-.543.123-1.075-.223-1.198-.766-.122-.543.223-1.075.766-1.198 2.913-.661 5.432-.365 7.488.844.465.273.616.876.343 1.341zm1.231-2.74c-.198.479-.662.769-1.138.769-.16 0-.325-.039-.473-.121-2.125-1.282-5.362-1.653-7.878-.906-.679.202-1.395-.186-1.597-.865-.201-.679.187-1.395.866-1.597 2.902-.861 6.517-.454 8.982 1.049.583.356.765 1.107.408 1.69zm.106-2.854c-.252.615-.881.906-1.49.906-.191 0-.388-.048-.568-.15-2.55-1.538-6.728-1.683-9.143-.929-.814.254-1.676-.2-1.929-1.014-.254-.814.199-1.676 1.014-1.929 2.764-.864 7.517-.694 10.653 1.077.614.347.824 1.124.477 1.739z"/>
                </svg>
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-4">
                Spotify Integration
              </h3>
              
              <div className="text-white/80 text-sm mb-6 space-y-3">
                <p>Full Spotify integration with Web Playback SDK</p>
                
                <div className="bg-white/10 rounded-lg p-4 text-left">
                  <div className="font-medium text-green-300 mb-2">✅ Features:</div>
                  <ul className="space-y-1 text-xs">
                    <li>• Spotify Premium account required</li>
                    <li>• Track info and playback controls</li>
                    <li>• Microphone-based audio analysis</li>
                    <li>• Full music metadata display</li>
                    <li>• Seamless Spotify experience</li>
                  </ul>
                </div>
                
                <div className="bg-yellow-500/20 rounded-lg p-3 text-left">
                  <div className="font-medium text-yellow-300 mb-1">⚠️ Requirements:</div>
                  <ul className="space-y-1 text-xs">
                    <li>• Spotify Premium subscription</li>
                    <li>• Microphone permissions</li>
                    <li>• Audio through speakers (not headphones)</li>
                  </ul>
                </div>
              </div>

              <button className="w-full py-3 px-6 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-all duration-200 group-hover:scale-105">
                Choose Spotify Mode
              </button>
            </div>
          </div>

          {/* Audio-Only Mode */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 hover:border-blue-400/50 transition-all duration-300 group cursor-pointer"
               onClick={() => onModeSelect('audio-only')}>
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-4">
                Audio-Only Mode
              </h3>
              
              <div className="text-white/80 text-sm mb-6 space-y-3">
                <p>Universal audio-reactive lighting for any sound source</p>
                
                <div className="bg-white/10 rounded-lg p-4 text-left">
                  <div className="font-medium text-blue-300 mb-2">✅ Features:</div>
                  <ul className="space-y-1 text-xs">
                    <li>• Works with any audio source</li>
                    <li>• No subscriptions required</li>
                    <li>• Real-time frequency visualization</li>
                    <li>• Universal compatibility</li>
                    <li>• Simpler setup process</li>
                  </ul>
                </div>
                
                <div className="bg-blue-500/20 rounded-lg p-3 text-left">
                  <div className="font-medium text-blue-300 mb-1">🎵 Works with:</div>
                  <ul className="space-y-1 text-xs">
                    <li>• Any music streaming service</li>
                    <li>• Games and movies</li>
                    <li>• Live instruments</li>
                    <li>• System audio</li>
                  </ul>
                </div>
              </div>

              <button className="w-full py-3 px-6 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all duration-200 group-hover:scale-105">
                Choose Audio-Only Mode
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-white/50 text-sm">
            You can change modes anytime from the settings menu
          </p>
        </div>
      </div>
    </div>
  );
};