"use client"

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Square, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface Scene {
  id: string;
  name: string;
  description: string;
  type: 'drift' | 'static';
}

interface ScenesProps {
  onSceneActive: (active: boolean) => void;
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
};

export const Scenes: React.FC<ScenesProps> = ({ onSceneActive }) => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchScenes();
  }, []);

  const fetchScenes = async () => {
    try {
      const response = await fetch('/api/scenes');
      const data = await response.json();
      if (data.success) {
        setScenes(data.scenes);
        setCurrentSceneId(data.currentSceneId);
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
        onSceneActive(true);
      }
    } catch (error) {
      console.error('Failed to start scene:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stopScene = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/scenes/stop', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        setCurrentSceneId(null);
        onSceneActive(false);
      }
    } catch (error) {
      console.error('Failed to stop scene:', error);
    } finally {
      setIsLoading(false);
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
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={stopScene}
            disabled={isLoading}
          >
            <Square className="w-4 h-4 mr-2" />
            Stop Scene
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenes.map((scene) => (
          <Card 
            key={scene.id}
            className={cn(
              "overflow-hidden cursor-pointer transition-all hover:scale-[1.02] border-2",
              currentSceneId === scene.id ? 'border-primary ring-2 ring-primary/20' : 'border-transparent'
            )}
            onClick={() => startScene(scene.id)}
          >
            <div className={cn(
              "h-24 w-full bg-gradient-to-r opacity-80",
              SCENE_GRADIENTS[scene.id] || "from-gray-500 to-gray-700"
            )} />
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-base">{scene.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{scene.description}</p>
                </div>
                {currentSceneId === scene.id && (
                  <div className="bg-primary/10 p-2 rounded-full">
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : (
                      <Play className="w-4 h-4 text-primary fill-primary" />
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
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
  'from-indigo-900 via-purple-500 to-orange-400'
];
