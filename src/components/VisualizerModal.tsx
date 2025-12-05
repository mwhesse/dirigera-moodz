
"use client"

import React from 'react';
import { LightMap } from '@/components/LightMap';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Maximize2, Minimize2 } from "lucide-react"

interface VisualizerModalProps {
  onClose: () => void;
}

export const VisualizerModal: React.FC<VisualizerModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <Card className="w-full max-w-5xl h-[80vh] border-border bg-card shadow-2xl flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Maximize2 className="w-5 h-5 text-primary" />
            Scene Visualizer
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-muted">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="flex-1 p-0 relative bg-black/90 overflow-hidden">
            <LightMap className="w-full h-full" />
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
                <p className="text-white/50 text-sm bg-black/50 px-3 py-1 rounded-full backdrop-blur-md">
                    Live Visualization
                </p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
};
