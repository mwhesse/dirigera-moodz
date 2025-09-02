import React, { useState } from 'react';

interface MicrophonePermissionProps {
  onPermissionGranted: () => void;
  onSkip: () => void;
}

export const MicrophonePermission: React.FC<MicrophonePermissionProps> = ({
  onPermissionGranted,
  onSkip
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermission = async () => {
    setIsRequesting(true);
    setError(null);

    try {
      await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      onPermissionGranted();
    } catch (err) {
      console.error('Microphone permission denied:', err);
      setError('Microphone access was denied. Light sync will not work without microphone permissions.');
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-6 mb-6">
      <div className="flex items-start">
        <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2">
            Enable Light Sync
          </h3>
          
          <div className="text-white/80 text-sm mb-4 space-y-2">
            <p>
              <strong>Why microphone access?</strong> The Spotify Web Player doesn't allow direct audio analysis, 
              so we need to use your microphone to "listen" to the music playing through your speakers.
            </p>
            
            <div className="bg-white/10 rounded-lg p-3">
              <p className="font-medium mb-2">📋 Setup Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Make sure your music is playing through your <strong>speakers</strong> (not headphones)</li>
                <li>Click "Enable Light Sync" below</li>
                <li>Allow microphone access when prompted</li>
                <li>Your lights will start syncing to the music!</li>
              </ol>
            </div>
            
            <div className="text-xs text-white/60">
              <p>🔒 <strong>Privacy:</strong> Audio is processed locally in your browser and never sent to any servers.</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={requestPermission}
              disabled={isRequesting}
              className={`
                px-4 py-2 rounded-lg font-medium transition-colors
                ${isRequesting 
                  ? 'bg-gray-500 cursor-not-allowed text-gray-300' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                }
              `}
            >
              {isRequesting ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Requesting...
                </div>
              ) : (
                'Enable Light Sync'
              )}
            </button>
            
            <button
              onClick={onSkip}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white/80 rounded-lg font-medium transition-colors"
            >
              Skip (Music Only)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};