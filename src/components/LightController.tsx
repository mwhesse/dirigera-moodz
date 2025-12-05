"use client"

import React, { useEffect, useState } from 'react';
import { useLightStore } from '@/lib/stores/lightStore';
import { Device } from '@/types';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { RefreshCw, AlertCircle, Lightbulb, Zap, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"

const API_BASE_URL = '/api';

interface LightControllerProps {
  className?: string;
}

export const LightController: React.FC<LightControllerProps> = ({ className }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [testingDevice, setTestingDevice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { 
    isConnected, 
    deviceCount,
    devices,
    setConnection, 
    setConnecting, 
    setDevices,
    toggleDeviceSelection
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
      const response = await fetch(`${API_BASE_URL}/lights/discover`);
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
      const response = await fetch(`${API_BASE_URL}/lights/test`, {
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

  const stopTest = async () => {
    try {
      await fetch(`${API_BASE_URL}/lights/test/stop`, {
        method: 'POST',
      });
      // setTestingDevice(null) will happen via the testLights finally block
      // when the server returns the response after stopping
    } catch (err) {
      console.error('Error stopping test:', err);
    }
  };

  const updateLights = async (updates: { color?: { hue: number; saturation: number }; brightness?: number; isOn?: boolean }) => {
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/lights/update`, {
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
      <Card className="border-destructive bg-destructive/10">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center space-y-4">
          <div className="p-3 bg-destructive/20 rounded-full">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">DIRIGERA Hub Not Connected</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">
              Make sure your DIRIGERA hub is powered on and connected to the same network.
            </p>
          </div>
          {error && (
            <div className="bg-destructive/20 p-3 rounded-md text-sm text-destructive">
              {error}
            </div>
          )}
          <Button onClick={discoverDevices} disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Try Again'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className="bg-card/50">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("w-3 h-3 rounded-full", isConnected ? "bg-green-500" : "bg-destructive")} />
            <div>
              <h3 className="font-semibold">
                DIRIGERA Hub {isConnected ? 'Connected' : 'Disconnected'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {deviceCount} device{deviceCount !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={discoverDevices} disabled={isLoading}>
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </CardContent>
      </Card>

      {/* Device List */}
      {devices.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Connected Lights</CardTitle>
                <CardDescription>Toggle which lights participate in the sync</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => updateLights({ isOn: true })}>
                <Zap className="h-4 w-4 mr-2 fill-yellow-400 text-yellow-400" />
                Turn On
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-background rounded-full">
                    <Lightbulb className={cn("h-5 w-5", device.currentState.isOn ? "text-yellow-400" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <h4 className="font-medium">{device.name}</h4>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{device.currentState.isOn ? 'On' : 'Off'}</span>
                      <span>{device.currentState.brightness}%</span>
                      {device.currentState.color && (
                        <span>Hue: {Math.round(device.currentState.color.hue)}°</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex gap-1 mr-2">
                    {device.capabilities.canChangeColor && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full" title="Color" />
                    )}
                    {device.capabilities.canChangeBrightness && (
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Dimmable" />
                    )}
                  </div>
                  <Switch 
                    checked={device.isSelected}
                    onCheckedChange={(checked) => toggleDeviceSelection(device.id, checked)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Manual Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Color Control */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Color</label>
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
                  className="aspect-square rounded-md ring-offset-background transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  style={{ backgroundColor: `hsl(${color.hue}, ${color.saturation * 100}%, 50%)` }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Brightness Control */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Brightness</label>
            <div className="grid grid-cols-4 gap-2">
              {[25, 50, 75, 100].map((brightness) => (
                <Button
                  key={brightness}
                  variant="outline"
                  onClick={() => updateLights({ brightness })}
                  className="w-full"
                >
                  {brightness}%
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Light Tests</CardTitle>
          <CardDescription>Verify your lights are working correctly</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Button
              onClick={() => testLights('rainbow')}
              disabled={!!testingDevice}
              className="bg-gradient-to-r from-red-500 via-yellow-500 to-purple-500 hover:opacity-90 text-white border-none"
            >
              {testingDevice === 'rainbow' ? 'Running...' : 'Rainbow'}
            </Button>
            
            <Button
              onClick={() => testLights('pulse')}
              disabled={!!testingDevice}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {testingDevice === 'pulse' ? 'Running...' : 'Pulse'}
            </Button>
            
            <Button
              onClick={() => testLights('strobe')}
              disabled={!!testingDevice}
              variant="destructive"
            >
              {testingDevice === 'strobe' ? 'Running...' : 'Strobe'}
            </Button>
          </div>
          
          {testingDevice && (
            <Button 
              variant="outline" 
              className="w-full border-destructive text-destructive hover:bg-destructive/10"
              onClick={stopTest}
            >
              Stop Test
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-destructive hover:bg-destructive/20">
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
