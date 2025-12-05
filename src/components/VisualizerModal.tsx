
"use client"

import React, { useState } from 'react';
import { LightMap } from '@/components/LightMap';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { X, Maximize2, RotateCw } from "lucide-react"
import { useLightStore } from '@/lib/stores/lightStore';
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Scene } from '@/types';

interface VisualizerModalProps {
  onClose: () => void;
}

export const VisualizerModal: React.FC<VisualizerModalProps> = ({ onClose }) => {
  const { currentScene, updateCurrentScene } = useLightStore();
  const [isFlipped, setIsFlipped] = useState(false);

  const updateSceneSettings = async (sceneId: string, settings: Partial<Scene>) => {
    try {
        // Optimistic update
        updateCurrentScene(settings);

        const response = await fetch(`/api/scenes/${sceneId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        
        if (!response.ok) {
            console.error('Failed to update scene settings');
        }
    } catch (error) {
        console.error('Failed to update scene settings:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
      <Card className="w-full h-full border-border bg-card shadow-2xl flex flex-col rounded-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-4 border-b bg-card/50 backdrop-blur-xl z-10">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2 min-w-[200px]">
                <Maximize2 className="w-5 h-5 text-primary" />
                <div>
                    <CardTitle className="text-xl font-bold">
                        {currentScene ? currentScene.name : 'Scene Visualizer'}
                    </CardTitle>
                    {currentScene && (
                        <CardDescription className="text-sm line-clamp-1">
                            {currentScene.description}
                        </CardDescription>
                    )}
                </div>
            </div>

            {currentScene && (
                <div className="hidden md:flex items-center gap-8 flex-1 justify-center px-8 border-l border-border/50 ml-4">
                    <div className="space-y-1 w-[200px]">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs font-medium">Speed</Label>
                            <span className="text-xs font-mono text-muted-foreground">
                                {(currentScene.transitionSpeed / 1000).toFixed(1)}s
                            </span>
                        </div>
                        <Slider
                            value={[currentScene.transitionSpeed]}
                            min={1000}
                            max={300000}
                            step={1000}
                            onValueChange={(vals) => updateCurrentScene({ transitionSpeed: vals[0] })}
                            onValueCommit={(vals) => updateSceneSettings(currentScene.id, { transitionSpeed: vals[0] })}
                        />
                    </div>

                    <div className="space-y-1 w-[200px]">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs font-medium">Brightness</Label>
                            <span className="text-xs font-mono text-muted-foreground">
                                {currentScene.brightness}%
                            </span>
                        </div>
                        <Slider
                            value={[currentScene.brightness]}
                            min={1}
                            max={100}
                            step={1}
                            onValueChange={(vals) => updateCurrentScene({ brightness: vals[0] })}
                            onValueCommit={(vals) => updateSceneSettings(currentScene.id, { brightness: vals[0] })}
                        />
                    </div>
                </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setIsFlipped(!isFlipped)} title="Flip View 180°">
                <RotateCw className={`h-4 w-4 transition-transform duration-300 ${isFlipped ? 'rotate-180' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-muted">
                <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-0 relative bg-black/90 overflow-hidden">
            <LightMap className="w-full h-full" isFlipped={isFlipped} />
            
            {/* Mobile controls overlay */}
            {currentScene && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md p-4 md:hidden border-t border-white/10">
                     <div className="flex flex-col gap-4">
                        <div className="space-y-1">
                            <div className="flex justify-between text-white/70 text-xs">
                                <span>Speed</span>
                                <span>{(currentScene.transitionSpeed / 1000).toFixed(1)}s</span>
                            </div>
                            <Slider
                                value={[currentScene.transitionSpeed]}
                                min={1000}
                                max={300000}
                                step={1000}
                                onValueChange={(vals) => updateCurrentScene({ transitionSpeed: vals[0] })}
                                onValueCommit={(vals) => updateSceneSettings(currentScene.id, { transitionSpeed: vals[0] })}
                            />
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-white/70 text-xs">
                                <span>Brightness</span>
                                <span>{currentScene.brightness}%</span>
                            </div>
                            <Slider
                                value={[currentScene.brightness]}
                                min={1}
                                max={100}
                                step={1}
                                onValueChange={(vals) => updateCurrentScene({ brightness: vals[0] })}
                                onValueCommit={(vals) => updateSceneSettings(currentScene.id, { brightness: vals[0] })}
                            />
                        </div>
                     </div>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
};
