import React, { useState, useEffect } from 'react';
import { useLightStore } from '../stores/lightStore';

interface Light {
  id: string;
  name: string;
  isOn: boolean;
  canChangeColor: boolean;
}

export const LightSelector: React.FC = () => {
  const { devices } = useLightStore();
  const [selectedLights, setSelectedLights] = useState<Set<string>>(new Set());
  const [availableLights, setAvailableLights] = useState<Light[]>([]);

  useEffect(() => {
    // Convert devices to light format
    const lights: Light[] = devices.map(device => ({
      id: device.id,
      name: device.name,
      isOn: device.currentState.isOn,
      canChangeColor: device.capabilities.canChangeColor
    }));
    
    setAvailableLights(lights);
    
    // Auto-select lights that are ON and support color
    const autoSelected = new Set(
      lights
        .filter(light => light.isOn && light.canChangeColor)
        .map(light => light.id)
    );
    setSelectedLights(autoSelected);
  }, [devices]);

  const handleLightToggle = (lightId: string) => {
    const newSelected = new Set(selectedLights);
    if (newSelected.has(lightId)) {
      newSelected.delete(lightId);
    } else {
      newSelected.add(lightId);
    }
    setSelectedLights(newSelected);
    
    // Send selection to backend
    updateLightSelection(Array.from(newSelected));
  };

  const handleSelectAll = () => {
    const allColorLights = availableLights
      .filter(light => light.canChangeColor)
      .map(light => light.id);
    setSelectedLights(new Set(allColorLights));
    updateLightSelection(allColorLights);
  };

  const handleSelectOnlyOn = () => {
    const onColorLights = availableLights
      .filter(light => light.isOn && light.canChangeColor)
      .map(light => light.id);
    setSelectedLights(new Set(onColorLights));
    updateLightSelection(onColorLights);
  };

  const handleClearAll = () => {
    setSelectedLights(new Set());
    updateLightSelection([]);
  };

  const updateLightSelection = async (lightIds: string[]) => {
    try {
      await fetch('/api/lights/selection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ selectedLights: lightIds })
      });
    } catch (error) {
      console.error('Failed to update light selection:', error);
    }
  };

  const onLights = availableLights.filter(light => light.isOn);
  const colorLights = availableLights.filter(light => light.canChangeColor);
  const selectedCount = selectedLights.size;

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Light Selection</h3>
        <div className="text-sm text-white/60">
          {selectedCount} selected • {onLights.length} on • {colorLights.length} color-capable
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={handleSelectOnlyOn}
          className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 text-sm rounded transition-colors"
        >
          Only ON Lights
        </button>
        <button
          onClick={handleSelectAll}
          className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-sm rounded transition-colors"
        >
          All Color Lights
        </button>
        <button
          onClick={handleClearAll}
          className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm rounded transition-colors"
        >
          Clear All
        </button>
      </div>

      {/* Light List */}
      <div className="max-h-64 overflow-y-auto">
        <div className="space-y-2">
          {availableLights.map(light => (
            <div
              key={light.id}
              className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                selectedLights.has(light.id)
                  ? 'bg-white/10 border border-white/20'
                  : 'bg-white/5 hover:bg-white/8'
              }`}
            >
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedLights.has(light.id)}
                  onChange={() => handleLightToggle(light.id)}
                  disabled={!light.canChangeColor}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className={`font-medium ${
                  !light.canChangeColor ? 'text-white/40' : 'text-white'
                }`}>
                  {light.name}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* ON/OFF Status */}
                <div className={`flex items-center ${
                  light.isOn ? 'text-green-400' : 'text-red-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-1 ${
                    light.isOn ? 'bg-green-400' : 'bg-red-400'
                  }`}></div>
                  <span className="text-xs">{light.isOn ? 'ON' : 'OFF'}</span>
                </div>
                
                {/* Color Capability */}
                {light.canChangeColor ? (
                  <div className="flex items-center text-blue-400">
                    <div className="w-2 h-2 rounded-full mr-1 bg-blue-400"></div>
                    <span className="text-xs">COLOR</span>
                  </div>
                ) : (
                  <div className="flex items-center text-white/40">
                    <div className="w-2 h-2 rounded-full mr-1 bg-white/40"></div>
                    <span className="text-xs">BRIGHT</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {availableLights.length === 0 && (
        <div className="text-center py-8 text-white/60">
          <div className="w-12 h-12 border-2 border-white/20 border-t-white/40 rounded-full animate-spin mx-auto mb-3"></div>
          <p>Loading lights...</p>
        </div>
      )}
    </div>
  );
};