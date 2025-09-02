import React, { useEffect, useState } from 'react';
import { useLightStore } from '../stores/lightStore';
import { Device } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface LightControllerProps {
  devices: Device[];
}

export const LightController: React.FC<LightControllerProps> = ({ devices }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [testingDevice, setTestingDevice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { 
    isConnected, 
    deviceCount,
    setConnection, 
    setConnecting, 
    setDevices 
  } = useLightStore();

  // Discover devices on component mount
  useEffect(() => {
    discoverDevices();
  }, []);

  const discoverDevices = async () => {
    setIsLoading(true);
    setConnecting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/lights/discover`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to discover devices');
      }

      setDevices(data.devices);
      setConnection(true);
      console.log(`Discovered ${data.deviceCount} light devices`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to discover devices';
      setError(errorMessage);
      setConnection(false, errorMessage);
      console.error('Error discovering devices:', err);
    } finally {
      setIsLoading(false);
      setConnecting(false);
    }
  };

  const testLights = async (testType: 'rainbow' | 'pulse' | 'strobe') => {
    setTestingDevice(testType);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/lights/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ testType })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to run ${testType} test`);
      }

      console.log(`${testType} test completed successfully`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to run ${testType} test`;
      setError(errorMessage);
      console.error(`Error running ${testType} test:`, err);
    } finally {
      setTestingDevice(null);
    }
  };

  const updateLights = async (updates: { color?: { hue: number; saturation: number }; brightness?: number }) => {
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/lights/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...updates,
          transitionTime: 300
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update lights');
      }

      console.log('Lights updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update lights';
      setError(errorMessage);
      console.error('Error updating lights:', err);
    }
  };

  if (!isConnected && !isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            DIRIGERA Hub Not Connected
          </h3>
          <p className="text-white/60 text-sm mb-4">
            Make sure your DIRIGERA hub is powered on and connected to the same network.
          </p>
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}
          <button
            onClick={discoverDevices}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white rounded-lg transition-colors"
          >
            {isLoading ? 'Searching...' : 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                DIRIGERA Hub {isConnected ? 'Connected' : 'Disconnected'}
              </h3>
              <p className="text-white/60 text-sm">
                {deviceCount} device{deviceCount !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>
          <button
            onClick={discoverDevices}
            disabled={isLoading}
            className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 disabled:bg-white/5 text-white rounded transition-colors"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Device List */}
      {devices.length > 0 && (
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Connected Lights</h3>
          <div className="space-y-3">
            {devices.map((device) => (
              <div key={device.id} className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-white">{device.name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-white/60">
                      <span>
                        {device.currentState.isOn ? 'On' : 'Off'}
                      </span>
                      <span>
                        Brightness: {device.currentState.brightness}%
                      </span>
                      {device.currentState.color && (
                        <span>
                          Hue: {Math.round(device.currentState.color.hue)}°
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {device.capabilities.canChangeColor && (
                      <div className="w-4 h-4 bg-blue-400 rounded-full" title="Color changing"></div>
                    )}
                    {device.capabilities.canChangeBrightness && (
                      <div className="w-4 h-4 bg-yellow-400 rounded-full" title="Dimmable"></div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Controls */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Manual Control</h3>
        <div className="space-y-4">
          {/* Color Control */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Color
            </label>
            <div className="grid grid-cols-6 gap-2">
              {[
                { name: 'Red', hue: 0, saturation: 1 },
                { name: 'Orange', hue: 30, saturation: 1 },
                { name: 'Yellow', hue: 60, saturation: 1 },
                { name: 'Green', hue: 120, saturation: 1 },
                { name: 'Blue', hue: 240, saturation: 1 },
                { name: 'Purple', hue: 270, saturation: 1 },
              ].map((color) => (
                <button
                  key={color.name}
                  onClick={() => updateLights({ color: { hue: color.hue, saturation: color.saturation } })}
                  className="aspect-square rounded-lg border-2 border-white/20 hover:border-white/40 transition-colors"
                  style={{ backgroundColor: `hsl(${color.hue}, ${color.saturation * 100}%, 50%)` }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Brightness Control */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Brightness
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[25, 50, 75, 100].map((brightness) => (
                <button
                  key={brightness}
                  onClick={() => updateLights({ brightness })}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded transition-colors"
                >
                  {brightness}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Test Controls */}
      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Light Tests</h3>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => testLights('rainbow')}
            disabled={testingDevice === 'rainbow'}
            className="px-4 py-3 bg-gradient-to-r from-red-500 via-yellow-500 to-purple-500 hover:from-red-600 hover:via-yellow-600 hover:to-purple-600 disabled:opacity-50 text-white font-medium rounded-lg transition-all"
          >
            {testingDevice === 'rainbow' ? 'Running...' : 'Rainbow'}
          </button>
          
          <button
            onClick={() => testLights('pulse')}
            disabled={testingDevice === 'pulse'}
            className="px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {testingDevice === 'pulse' ? 'Running...' : 'Pulse'}
          </button>
          
          <button
            onClick={() => testLights('strobe')}
            disabled={testingDevice === 'strobe'}
            className="px-4 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {testingDevice === 'strobe' ? 'Running...' : 'Strobe'}
          </button>
        </div>
        <p className="text-white/50 text-xs mt-3 text-center">
          Test patterns to verify your lights are working correctly
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-red-200 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-300 hover:text-red-200 text-xs underline mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};