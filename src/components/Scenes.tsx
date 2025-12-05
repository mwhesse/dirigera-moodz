"use client"

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Square, Loader2, Sparkles, Maximize2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { useLightStore } from '@/lib/stores/lightStore';
import { Scene } from '@/types'; // Import Scene from shared types

interface ScenesProps {
  onSceneActive: (active: boolean) => void;
  onOpenVisualizer: () => void;
}

const SCENE_GRADIENTS: Record<string, string> = {
  'savanna-sunset': 'from-orange-500 via-red-500 to-purple-900',
  'arctic-aurora': 'from-teal-400 via-blue-500 to-purple-600',
  'tropical-twilight': 'from-pink-500 via-purple-600 to-blue-700',
  'spring-blossom': 'from-pink-300 via-green-200 to-yellow-100',
  'cozy-fireplace': 'from-orange-600 via-red-700 to-orange-900',
  'deep-ocean': 'from-blue-900 via-blue-700 to-teal-800',
  'forest-morning': 'from-green-400 via-yellow-200 to-green-600',
  'bangkok-morning': 'from-orange-400 via-yellow-500 to-amber-600',
  'sukhumvit-nights': 'from-fuchsia-600 via-purple-600 to-blue-600',
  'miami-vice': 'from-cyan-300 via-pink-300 to-purple-300',
  'brooklyn-loft': 'from-orange-900 via-stone-500 to-slate-700',
  'la-sunset': 'from-indigo-900 via-purple-500 to-orange-400',
  'sunset-beach': 'from-orange-400 via-pink-500 to-blue-900',
  'geneva-afternoon': 'from-blue-200 via-slate-300 to-emerald-400',
  'christmas-tree': 'from-red-600 via-green-600 to-yellow-400',
  'deep-space-nebula': 'from-purple-900 via-blue-900 to-pink-500',
  'cyber-city': 'from-green-400 via-purple-600 to-fuchsia-500',
  'late-night-vibes': 'from-violet-900 via-slate-900 to-indigo-950',
  'japanese-whisky': 'from-amber-700 via-orange-900 to-yellow-900',
  'yoga-morning': 'from-stone-100 via-sky-100 to-orange-50',
  'cotton-candy-sunset': 'from-pink-300 via-blue-300 to-purple-300',
};

export const Scenes: React.FC<ScenesProps> = ({ onSceneActive, onOpenVisualizer }) => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lightStore = useLightStore() as any; // Workaround for persistent type error
  const currentScene = lightStore.currentScene;

  useEffect(() => {
    fetchScenes();
  }, []);

  // Sync local scenes state with global currentScene changes
  useEffect(() => {
    if (currentScene) {
        setScenes(prevScenes => 
            prevScenes.map(s => 
                s.id === currentScene.id ? { ...s, ...currentScene } : s
            )
        );
        // Also ensure currentSceneId is in sync
        if (currentScene.id !== currentSceneId) {
            setCurrentSceneId(currentScene.id);
            onSceneActive(true);
        }
    } else if (currentSceneId !== null && currentScene === null) {
        // If global state says no scene, but local thinks there is one, clear local
        setCurrentSceneId(null);
        onSceneActive(false);
    }
  }, [currentScene, currentSceneId, onSceneActive]);

  const fetchScenes = async () => {
    try {
      const response = await fetch('/api/scenes');
      const data = await response.json();
      if (data.success) {
        setScenes(data.scenes);
        setCurrentSceneId(data.currentSceneId);
        const activeScene = data.scenes.find((s: Scene) => s.id === data.currentSceneId);
        lightStore.setCurrentScene(activeScene || null);
        if (data.currentSceneId) {
          onSceneActive(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch scenes:', error);
    }
  };

  const startScene = async (sceneId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/scenes/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId })
      });
      const data = await response.json();
      if (data.success) {
        setCurrentSceneId(sceneId);
        const activeScene = scenes.find(s => s.id === sceneId);
        lightStore.setCurrentScene(activeScene || null);
        onSceneActive(true);
      }
    } catch (error) {
      console.error('Failed to start scene:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stopScene = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setIsLoading(true);
    try {
      const response = await fetch('/api/scenes/stop', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        setCurrentSceneId(null);
        lightStore.setCurrentScene(null);
        onSceneActive(false);
      }
    } catch (error) {
      console.error('Failed to stop scene:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSceneSettings = async (sceneId: string, settings: Partial<Scene>) => {
    try {
        // Optimistic update
        setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, ...settings } : s));

        const response = await fetch(`/api/scenes/${sceneId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        
        if (!response.ok) {
            console.error('Failed to update scene settings');
            // Revert on failure? For now, rely on next fetch.
        }
    } catch (error) {
        console.error('Failed to update scene settings:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center">
          <Sparkles className="w-5 h-5 mr-2 text-yellow-500" />
          Dynamic Scenes
        </h2>
        {currentSceneId && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenVisualizer}
              title="Open Visualizer"
            >
              <Maximize2 className="w-4 h-4 mr-2" />
              Visualizer
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={stopScene}
              disabled={isLoading}
            >
              <Square className="w-4 h-4 mr-2" />
              Stop Scene
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenes.map((scene) => {
          const isSelected = currentSceneId === scene.id;
          return (
            <Card 
                key={scene.id}
                className={cn(
                "overflow-hidden cursor-pointer transition-all border-2 group",
                isSelected ? 'border-primary ring-2 ring-primary/20 scale-[1.02]' : 'border-transparent hover:scale-[1.02]'
                )}
                onClick={() => isSelected ? onOpenVisualizer() : startScene(scene.id)}
            >
                <div className={cn(
                "h-24 w-full bg-gradient-to-r opacity-80 transition-opacity",
                SCENE_GRADIENTS[scene.id] || "from-gray-500 to-gray-700"
                )} />
                <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                    <div>
                    <h3 className="font-bold text-base">{scene.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{scene.description}</p>
                    </div>
                    
                    <div className={cn(
                        "p-2 rounded-full transition-all duration-300",
                        isSelected 
                            ? "bg-primary/10 opacity-100" 
                            : "bg-muted/50 opacity-0 group-hover:opacity-100"
                    )}>
                        {isSelected && isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        ) : (
                            <Play className={cn(
                                "w-4 h-4 transition-colors",
                                isSelected ? "text-primary fill-primary" : "text-muted-foreground group-hover:text-primary"
                            )} />
                        )}
                    </div>
                </div>

                {isSelected && (
                    <div className="pt-4 border-t border-border/50 animate-in slide-in-from-top-2 fade-in duration-300" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label className="text-xs font-semibold text-muted-foreground">
                                    Transition Speed
                                </Label>
                                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                                    {(scene.transitionSpeed / 1000).toFixed(1)}s
                                </span>
                            </div>
                            <Slider
                                defaultValue={[scene.transitionSpeed]}
                                value={[scene.transitionSpeed]}
                                min={1000}
                                max={300000} // Increased max to 5 minutes
                                step={1000} // Changed step to 1 second
                                onValueChange={(vals) => {
                                    // Just update local state for smoothness
                                    setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, transitionSpeed: vals[0] } : s));
                                }}
                                onValueCommit={(vals) => {
                                    updateSceneSettings(scene.id, { transitionSpeed: vals[0] });
                                }}
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label className="text-xs font-semibold text-muted-foreground">
                                    Max Brightness
                                </Label>
                                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                                    {scene.brightness}%
                                </span>
                            </div>
                            <Slider
                                defaultValue={[scene.brightness]}
                                value={[scene.brightness]}
                                min={1}
                                max={100}
                                step={1}
                                onValueChange={(vals) => {
                                    setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, brightness: vals[0] } : s));
                                }}
                                onValueCommit={(vals) => {
                                    updateSceneSettings(scene.id, { brightness: vals[0] });
                                }}
                            />
                        </div>
                    </div>
                )}
                </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// Force Tailwind to detect these classes by including them in the source
const _SAFELIST = [
  'from-orange-500 via-red-500 to-purple-900',
  'from-teal-400 via-blue-500 to-purple-600',
  'from-pink-500 via-purple-600 to-blue-700',
  'from-pink-300 via-green-200 to-yellow-100',
  'from-orange-600 via-red-700 to-orange-900',
  'from-blue-900 via-blue-700 to-teal-800',
  'from-green-400 via-yellow-200 to-green-600',
  'from-gray-500 to-gray-700',
  'from-orange-400 via-yellow-500 to-amber-600',
  'from-fuchsia-600 via-purple-600 to-blue-600',
  'from-cyan-300 via-pink-300 to-purple-300',
  'from-orange-900 via-stone-500 to-slate-700',
  'from-indigo-900 via-purple-500 to-orange-400',
  'from-orange-400 via-pink-500 to-blue-900',
  'from-blue-200 via-slate-300 to-emerald-400',
  'from-red-600 via-green-600 to-yellow-400',
  'from-purple-900 via-blue-900 to-pink-500',
  'from-green-400 via-purple-600 to-fuchsia-500',
  'from-violet-900 via-slate-900 to-indigo-950',
  'from-amber-700 via-orange-900 to-yellow-900',
  'from-stone-100 via-sky-100 to-orange-50',
  'from-pink-300 via-blue-300 to-purple-300'
];
