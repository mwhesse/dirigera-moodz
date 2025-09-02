import React, { useEffect, useState } from 'react';
import { useSpotifyStore } from '../stores/spotifyStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const SpotifyAuth: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setAuthenticated, setConnectionError } = useSpotifyStore();

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      setError(`Spotify authorization failed: ${error}`);
      return;
    }

    if (code && state) {
      handleCallback(code, state);
    }
  }, []);

  const handleCallback = async (code: string, state: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/spotify/callback?code=${code}&state=${state}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authorization failed');
      }

      if (data.success) {
        setAuthenticated(data.token, data.refreshToken, data.expiresIn);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        console.log('Spotify authentication successful');
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to authenticate';
      setError(errorMessage);
      setConnectionError(errorMessage);
      console.error('Spotify authentication error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/spotify/auth`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get authorization URL');
      }

      // Redirect to Spotify authorization
      window.location.href = data.authUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start authentication';
      setError(errorMessage);
      setConnectionError(errorMessage);
      console.error('Error starting Spotify authentication:', err);
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setConnectionError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
          <div className="text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.062 14.615c-.157.382-.5.618-.863.618-.127 0-.258-.031-.378-.096-1.692-1.022-3.815-1.259-6.321-.691-.543.123-1.075-.223-1.198-.766-.122-.543.223-1.075.766-1.198 2.913-.661 5.432-.365 7.488.844.465.273.616.876.343 1.341zm1.231-2.74c-.198.479-.662.769-1.138.769-.16 0-.325-.039-.473-.121-2.125-1.282-5.362-1.653-7.878-.906-.679.202-1.395-.186-1.597-.865-.201-.679.187-1.395.866-1.597 2.902-.861 6.517-.454 8.982 1.049.583.356.765 1.107.408 1.69zm.106-2.854c-.252.615-.881.906-1.49.906-.191 0-.388-.048-.568-.15-2.55-1.538-6.728-1.683-9.143-.929-.814.254-1.676-.2-1.929-1.014-.254-.814.199-1.676 1.014-1.929 2.764-.864 7.517-.694 10.653 1.077.614.347.824 1.124.477 1.739z"/>
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                TRADFRI Music Sync
              </h1>
              <p className="text-white/70 text-lg">
                Sync your IKEA lights with Spotify music
              </p>
            </div>

            {error ? (
              <div className="mb-6">
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
                <button
                  onClick={handleRetry}
                  className="text-blue-300 hover:text-blue-200 text-sm underline"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="mb-6">
                <p className="text-white/80 text-sm mb-4">
                  Connect your Spotify Premium account to start syncing your lights with your music.
                </p>
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-blue-200 text-xs">
                    <strong>Note:</strong> Spotify Premium is required for music playback control.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={isLoading}
              className={`
                w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200
                ${isLoading 
                  ? 'bg-gray-500 cursor-not-allowed text-gray-300' 
                  : 'bg-green-500 hover:bg-green-600 text-white hover:scale-105 active:scale-95'
                }
                shadow-lg hover:shadow-xl
              `}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mr-3"></div>
                  Connecting...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.062 14.615c-.157.382-.5.618-.863.618-.127 0-.258-.031-.378-.096-1.692-1.022-3.815-1.259-6.321-.691-.543.123-1.075-.223-1.198-.766-.122-.543.223-1.075.766-1.198 2.913-.661 5.432-.365 7.488.844.465.273.616.876.343 1.341zm1.231-2.74c-.198.479-.662.769-1.138.769-.16 0-.325-.039-.473-.121-2.125-1.282-5.362-1.653-7.878-.906-.679.202-1.395-.186-1.597-.865-.201-.679.187-1.395.866-1.597 2.902-.861 6.517-.454 8.982 1.049.583.356.765 1.107.408 1.69zm.106-2.854c-.252.615-.881.906-1.49.906-.191 0-.388-.048-.568-.15-2.55-1.538-6.728-1.683-9.143-.929-.814.254-1.676-.2-1.929-1.014-.254-.814.199-1.676 1.014-1.929 2.764-.864 7.517-.694 10.653 1.077.614.347.824 1.124.477 1.739z"/>
                  </svg>
                  Connect with Spotify
                </div>
              )}
            </button>

            <div className="mt-6 text-center">
              <p className="text-white/60 text-xs">
                By connecting, you agree to Spotify's Terms of Service
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="flex items-center justify-center space-x-6 text-white/50 text-sm">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              Spotify Premium Required
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
              DIRIGERA Hub Compatible
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};