"use client"

import React, { useState } from 'react';
import { useLightStore } from '@/lib/stores/lightStore';
import { SyncSettings } from '@/types';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { X, Wifi, WifiOff, Loader2 } from "lucide-react"

const API_BASE_URL = '/api';

interface SettingsProps {
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const { syncSettings, setSyncSettings, isConnected } = useLightStore();
  const [localSettings, setLocalSettings] = useState<SyncSettings>(syncSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isWaitingForAuth, setIsWaitingForAuth] = useState(false);
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
      const response = await fetch(`${API_BASE_URL}/lights/sync/settings`, {
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

  const handleConnect = async () => {
    setIsWaitingForAuth(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/lights/auth`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed. Did you press the button?');
      }
      
      setSuccess(true);
      // Connection status will update via the regular polling or status check
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to hub';
      setError(errorMessage);
    } finally {
      setIsWaitingForAuth(false);
    }
  };

  const handleReset = () => {
    setLocalSettings(syncSettings);
    setError(null);
    setSuccess(false);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold">Settings</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-4">
          {/* Hub Connection Section */}
          <div className="p-4 border border-border rounded-lg bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Hub Connection</h3>
              <div className={`flex items-center text-sm ${isConnected ? 'text-green-500' : 'text-yellow-500'}`}>
                {isConnected ? (
                  <><Wifi className="w-4 h-4 mr-1" /> Connected</>
                ) : (
                  <><WifiOff className="w-4 h-4 mr-1" /> Not Connected</>
                )}
              </div>
            </div>
            
            {!isConnected && (
              <div className="space-y-2">
                {isWaitingForAuth ? (
                  <div className="flex flex-col items-center p-4 bg-background rounded border border-dashed border-primary/50 animate-pulse">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    <p className="font-medium text-center">Press the action button on your Dirigera Hub now!</p>
                    <p className="text-xs text-muted-foreground text-center mt-1">Waiting for confirmation...</p>
                  </div>
                ) : (
                  <Button 
                    onClick={handleConnect} 
                    className="w-full" 
                    variant="secondary"
                  >
                    Connect Hub
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="h-px bg-border" />

          <h3 className="font-medium">Sync Settings</h3>

          {/* Sensitivity */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Sensitivity</Label>
              <span className="text-sm text-muted-foreground">{(localSettings.sensitivity * 100).toFixed(0)}%</span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.1}
              value={[localSettings.sensitivity]}
              onValueChange={([val]) => updateLocalSetting('sensitivity', val)}
            />
            <p className="text-xs text-muted-foreground">
              How responsive lights are to music changes
            </p>
          </div>

          {/* Color Mode */}
          <div className="space-y-2">
            <Label>Color Mode</Label>
            <Select
              value={localSettings.colorMode}
              onValueChange={(val) => updateLocalSetting('colorMode', val as SyncSettings['colorMode'])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="frequency">Frequency Mapping</SelectItem>
                <SelectItem value="mood">Mood Based</SelectItem>
                <SelectItem value="random">Random Colors</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {localSettings.colorMode === 'frequency' && 'Colors based on bass, mid, and treble frequencies'}
              {localSettings.colorMode === 'mood' && 'Colors based on energy levels and mood detection'}
              {localSettings.colorMode === 'random' && 'Random colors synchronized to the music'}
            </p>
          </div>

          {/* Effect Intensity */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Effect Intensity</Label>
              <span className="text-sm text-muted-foreground">{(localSettings.effectIntensity * 100).toFixed(0)}%</span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.1}
              value={[localSettings.effectIntensity]}
              onValueChange={([val]) => updateLocalSetting('effectIntensity', val)}
            />
            <p className="text-xs text-muted-foreground">
              Intensity of flashes and color changes
            </p>
          </div>

          {/* Smoothing */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Smoothing</Label>
              <span className="text-sm text-muted-foreground">{(localSettings.smoothing * 100).toFixed(0)}%</span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.1}
              value={[localSettings.smoothing]}
              onValueChange={([val]) => updateLocalSetting('smoothing', val)}
            />
            <p className="text-xs text-muted-foreground">
              How smooth color transitions are (higher = smoother)
            </p>
          </div>

          {/* Beat Detection Threshold */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Beat Detection Threshold</Label>
              <span className="text-sm text-muted-foreground">{(localSettings.beatDetectionThreshold * 100).toFixed(0)}%</span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={[localSettings.beatDetectionThreshold]}
              onValueChange={([val]) => updateLocalSetting('beatDetectionThreshold', val)}
            />
            <p className="text-xs text-muted-foreground">
              Minimum confidence required for beat detection
            </p>
          </div>

          {/* Color Transition Speed */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Transition Speed</Label>
              <span className="text-sm text-muted-foreground">{localSettings.colorTransitionSpeed}ms</span>
            </div>
            <Slider
              min={50}
              max={1000}
              step={50}
              value={[localSettings.colorTransitionSpeed]}
              onValueChange={([val]) => updateLocalSetting('colorTransitionSpeed', val)}
            />
            <p className="text-xs text-muted-foreground">
              Speed of color changes (lower = faster)
            </p>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="bg-destructive/20 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 text-green-400 text-sm p-3 rounded-md">
              Settings saved successfully!
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={handleReset}>
              Reset
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>

          {/* Presets */}
          <div className="pt-6 border-t border-border">
            <h3 className="font-medium mb-3">Quick Presets</h3>
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start h-auto py-3 px-4 bg-muted/50 hover:bg-muted"
                onClick={() => setLocalSettings({
                  sensitivity: 0.8,
                  colorMode: 'frequency',
                  effectIntensity: 0.9,
                  smoothing: 0.3,
                  beatDetectionThreshold: 0.7,
                  colorTransitionSpeed: 150
                })}
              >
                <div className="text-left">
                  <div className="font-medium">Party Mode</div>
                  <div className="text-xs text-muted-foreground">High intensity, fast transitions</div>
                </div>
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start h-auto py-3 px-4 bg-muted/50 hover:bg-muted"
                onClick={() => setLocalSettings({
                  sensitivity: 0.6,
                  colorMode: 'mood',
                  effectIntensity: 0.5,
                  smoothing: 0.8,
                  beatDetectionThreshold: 0.5,
                  colorTransitionSpeed: 500
                })}
              >
                <div className="text-left">
                  <div className="font-medium">Ambient</div>
                  <div className="text-xs text-muted-foreground">Subtle, smooth lighting</div>
                </div>
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start h-auto py-3 px-4 bg-muted/50 hover:bg-muted"
                onClick={() => setLocalSettings({
                  sensitivity: 0.7,
                  colorMode: 'frequency',
                  effectIntensity: 0.7,
                  smoothing: 0.6,
                  beatDetectionThreshold: 0.6,
                  colorTransitionSpeed: 250
                })}
              >
                <div className="text-left">
                  <div className="font-medium">Balanced</div>
                  <div className="text-xs text-muted-foreground">Default balanced settings</div>
                </div>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
