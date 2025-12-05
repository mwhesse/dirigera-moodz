"use client"

import React, { useEffect, useState, useRef } from 'react';
import { AudioAnalyzer } from '@/lib/services/AudioAnalyzer';
import { WebSocketClient } from '@/lib/services/WebSocketClient';
import { useLightStore } from '@/lib/stores/lightStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mic, Laptop, AlertCircle, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { getWebSocketUrl } from '@/lib/utils/websocket';

interface AudioSyncProps {
  isActive: boolean;
}

export const AudioSync: React.FC<AudioSyncProps> = ({ isActive }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [mode, setMode] = useState<'tab' | 'mic'>('tab');
  const [audioLevels, setAudioLevels] = useState({ bass: 0, mids: 0, treble: 0 });
  const [wsConnected, setWsConnected] = useState(false);
  
  const audioAnalyzer = useRef<AudioAnalyzer | null>(null);
  const wsClient = useRef<WebSocketClient | null>(null);
  const { setFrequencyData, setBeatData, lastBeatTime } = useLightStore();

  useEffect(() => {
    if (!isActive && isAnalyzing) {
      stopAnalysis();
    }
  }, [isActive, isAnalyzing]);

  useEffect(() => {
    const wsUrl = getWebSocketUrl();
    wsClient.current = new WebSocketClient(wsUrl);
    
    wsClient.current.on('connected', () => {
      console.log('WebSocket connected for audio-only mode');
      setWsConnected(true);
    });
    
    wsClient.current.on('disconnected', () => {
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

  useEffect(() => {
    if (!wsClient.current) return;

    audioAnalyzer.current = new AudioAnalyzer(
      (beatData) => {
        wsClient.current?.sendBeatDetection(beatData);
        setBeatData(beatData.timestamp);
      },
      (frequencyData) => {
        wsClient.current?.sendFrequencyUpdate(frequencyData);
        setFrequencyData(frequencyData);
        setAudioLevels({
          bass: frequencyData.bass,
          mids: frequencyData.mids,
          treble: frequencyData.treble
        });
      },
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

  const startAnalysis = async (selectedMode: 'tab' | 'mic') => {
    if (!audioAnalyzer.current) return;

    try {
      setError(null);
      setMode(selectedMode);

      if (selectedMode === 'tab') {
        await audioAnalyzer.current.initializeSystemAudio();
      } else {
        await audioAnalyzer.current.initializeMicrophoneInput();
      }

      audioAnalyzer.current.start();
      setPermissionGranted(true);
      setIsAnalyzing(true);
    } catch (error) {
      console.error('Failed to start audio analysis:', error);
      setError(selectedMode === 'tab' 
        ? 'Tab audio access failed. Please ensure you select a tab and share audio.'
        : 'Microphone access required. Please allow permissions.');
    }
  };

  const stopAnalysis = () => {
    if (audioAnalyzer.current) {
      audioAnalyzer.current.stop();
      setIsAnalyzing(false);
    }
  };

  if (!isActive) {
    return null; // Or some placeholder, but null is fine if controlled by parent tabs
  }

  if (error) {
    return (
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
    );
  }

  if (!permissionGranted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4 w-16 h-16 flex items-center justify-center">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Audio Sync Setup</CardTitle>
          <CardDescription>
            Connect an audio source to synchronize your lights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid md:grid-cols-2 gap-4">
            <Card 
              className="cursor-pointer hover:border-primary transition-colors group"
              onClick={() => startAnalysis('tab')}
            >
              <CardContent className="pt-6 text-center space-y-4">
                <div className="mx-auto bg-blue-500/10 p-3 rounded-full w-12 h-12 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <Laptop className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Tab Audio (Best)</h3>
                  <p className="text-xs text-muted-foreground mt-1">Sync with browser tab audio. Perfect for YouTube, Spotify Web, etc.</p>
                </div>
                <Button variant="secondary" className="w-full">Use Tab Audio</Button>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:border-primary transition-colors group"
              onClick={() => startAnalysis('mic')}
            >
              <CardContent className="pt-6 text-center space-y-4">
                <div className="mx-auto bg-orange-500/10 p-3 rounded-full w-12 h-12 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                  <Mic className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Microphone</h3>
                  <p className="text-xs text-muted-foreground mt-1">Sync with ambient sound. Good for speakers or external sources.</p>
                </div>
                <Button variant="secondary" className="w-full">Use Mic</Button>
              </CardContent>
            </Card>
          </div>
          
          <div className="bg-muted/50 p-4 rounded-lg text-xs text-muted-foreground space-y-2">
            <p className="font-medium">💡 Tips:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Tab Audio</strong> provides the cleanest signal and works with headphones.</li>
              <li><strong>Microphone</strong> requires loud music playing through speakers.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader className="text-center pb-2">
        <CardTitle>Audio Sync Active</CardTitle>
        <CardDescription>
          {mode === 'tab' ? 'Syncing with Tab Audio' : 'Syncing with Microphone'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-8">
        {/* Visualizer */}
        <div className="grid grid-cols-3 gap-4 h-32 items-end">
          {/* Bass */}
          <div className="space-y-2 text-center">
            <div className="relative w-full bg-muted rounded-lg overflow-hidden h-24">
              <div 
                className="absolute bottom-0 left-0 right-0 bg-red-500 transition-all duration-75 ease-out"
                style={{ height: `${audioLevels.bass * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-red-500">BASS</span>
          </div>
          
          {/* Mids */}
          <div className="space-y-2 text-center">
            <div className="relative w-full bg-muted rounded-lg overflow-hidden h-24">
              <div 
                className="absolute bottom-0 left-0 right-0 bg-green-500 transition-all duration-75 ease-out"
                style={{ height: `${audioLevels.mids * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-green-500">MIDS</span>
          </div>

          {/* Treble */}
          <div className="space-y-2 text-center">
            <div className="relative w-full bg-muted rounded-lg overflow-hidden h-24">
              <div 
                className="absolute bottom-0 left-0 right-0 bg-blue-500 transition-all duration-75 ease-out"
                style={{ height: `${audioLevels.treble * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-blue-500">TREBLE</span>
          </div>
        </div>

        <div className="flex justify-center gap-4">
           <Button 
            onClick={isAnalyzing ? stopAnalysis : () => startAnalysis(mode)} 
            variant={isAnalyzing ? "destructive" : "default"}
            className="w-40"
          >
            {isAnalyzing ? 'Stop' : 'Resume'}
          </Button>
          
          <Button variant="outline" onClick={() => {
            stopAnalysis();
            setPermissionGranted(false);
          }}>
            Change Source
          </Button>
        </div>

        <div className="flex justify-center gap-6 text-xs text-muted-foreground">
          <div className={cn("flex items-center gap-2", wsConnected ? "text-green-500" : "text-destructive")}>
            <div className={cn("w-2 h-2 rounded-full", wsConnected ? "bg-green-500" : "bg-destructive")} />
            Server {wsConnected ? 'Connected' : 'Disconnected'}
          </div>
          <div className={cn("flex items-center gap-2", isAnalyzing ? "text-green-500" : "text-yellow-500")}>
            <div className={cn("w-2 h-2 rounded-full", isAnalyzing ? "bg-green-500" : "bg-yellow-500")} />
            Audio {isAnalyzing ? 'Active' : 'Paused'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
