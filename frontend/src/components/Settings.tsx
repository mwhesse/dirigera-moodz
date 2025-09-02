import React, { useState } from 'react';
import { useLightStore } from '../stores/lightStore';
import { SyncSettings } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface SettingsProps {
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const { syncSettings, setSyncSettings } = useLightStore();
  const [localSettings, setLocalSettings] = useState<SyncSettings>(syncSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const updateLocalSetting = <K extends keyof SyncSettings>(
    key: K,
    value: SyncSettings[K]
  ) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`${API_BASE_URL}/api/lights/sync/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(localSettings)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setSyncSettings(localSettings);
      setSuccess(true);
      
      setTimeout(() => {
        setSuccess(false);
      }, 2000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings';
      setError(errorMessage);
      console.error('Error saving settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLocalSettings(syncSettings);
    setError(null);
    setSuccess(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Sync Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Sensitivity */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Sensitivity: {(localSettings.sensitivity * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={localSettings.sensitivity}
              onChange={(e) => updateLocalSetting('sensitivity', parseFloat(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none slider"
            />
            <p className="text-white/60 text-xs mt-1">
              How responsive lights are to music changes
            </p>
          </div>

          {/* Color Mode */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Color Mode
            </label>
            <select
              value={localSettings.colorMode}
              onChange={(e) => updateLocalSetting('colorMode', e.target.value as SyncSettings['colorMode'])}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
            >
              <option value="frequency">Frequency Mapping</option>
              <option value="mood">Mood Based</option>
              <option value="random">Random Colors</option>
            </select>
            <p className="text-white/60 text-xs mt-1">
              {localSettings.colorMode === 'frequency' && 'Colors based on bass, mid, and treble frequencies'}
              {localSettings.colorMode === 'mood' && 'Colors based on energy levels and mood detection'}
              {localSettings.colorMode === 'random' && 'Random colors synchronized to the music'}
            </p>
          </div>

          {/* Effect Intensity */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Effect Intensity: {(localSettings.effectIntensity * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={localSettings.effectIntensity}
              onChange={(e) => updateLocalSetting('effectIntensity', parseFloat(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none slider"
            />
            <p className="text-white/60 text-xs mt-1">
              Intensity of flashes and color changes
            </p>
          </div>

          {/* Smoothing */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Smoothing: {(localSettings.smoothing * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={localSettings.smoothing}
              onChange={(e) => updateLocalSetting('smoothing', parseFloat(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none slider"
            />
            <p className="text-white/60 text-xs mt-1">
              How smooth color transitions are (higher = smoother)
            </p>
          </div>

          {/* Beat Detection Threshold */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Beat Detection: {(localSettings.beatDetectionThreshold * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={localSettings.beatDetectionThreshold}
              onChange={(e) => updateLocalSetting('beatDetectionThreshold', parseFloat(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none slider"
            />
            <p className="text-white/60 text-xs mt-1">
              Minimum confidence required for beat detection
            </p>
          </div>

          {/* Color Transition Speed */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Transition Speed: {localSettings.colorTransitionSpeed}ms
            </label>
            <input
              type="range"
              min="50"
              max="1000"
              step="50"
              value={localSettings.colorTransitionSpeed}
              onChange={(e) => updateLocalSetting('colorTransitionSpeed', parseInt(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none slider"
            />
            <p className="text-white/60 text-xs mt-1">
              Speed of color changes (lower = faster)
            </p>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mt-6">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 mt-6">
            <p className="text-green-200 text-sm">Settings saved successfully!</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-8">
          <button
            onClick={handleReset}
            className="flex-1 py-2 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-2 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-lg transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Presets */}
        <div className="mt-6 pt-6 border-t border-white/20">
          <h3 className="text-white font-medium mb-3">Quick Presets</h3>
          <div className="space-y-2">
            <button
              onClick={() => setLocalSettings({
                sensitivity: 0.8,
                colorMode: 'frequency',
                effectIntensity: 0.9,
                smoothing: 0.3,
                beatDetectionThreshold: 0.7,
                colorTransitionSpeed: 150
              })}
              className="w-full p-2 text-left bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <div className="text-white text-sm font-medium">Party Mode</div>
              <div className="text-white/60 text-xs">High intensity, fast transitions</div>
            </button>
            
            <button
              onClick={() => setLocalSettings({
                sensitivity: 0.6,
                colorMode: 'mood',
                effectIntensity: 0.5,
                smoothing: 0.8,
                beatDetectionThreshold: 0.5,
                colorTransitionSpeed: 500
              })}
              className="w-full p-2 text-left bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <div className="text-white text-sm font-medium">Ambient</div>
              <div className="text-white/60 text-xs">Subtle, smooth lighting</div>
            </button>
            
            <button
              onClick={() => setLocalSettings({
                sensitivity: 0.7,
                colorMode: 'frequency',
                effectIntensity: 0.7,
                smoothing: 0.6,
                beatDetectionThreshold: 0.6,
                colorTransitionSpeed: 250
              })}
              className="w-full p-2 text-left bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <div className="text-white text-sm font-medium">Balanced</div>
              <div className="text-white/60 text-xs">Default balanced settings</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};