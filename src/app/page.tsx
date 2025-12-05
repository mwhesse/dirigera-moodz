"use client"

import React, { useState } from 'react';

import { AudioSync } from '@/components/AudioSync';

import { Scenes } from '@/components/Scenes';

import { Settings } from '@/components/Settings';

import { VisualizerModal } from '@/components/VisualizerModal';

import { Button } from "@/components/ui/button"

import { Settings as SettingsIcon, Lightbulb, Music, Sparkles, LayoutGrid } from "lucide-react"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

import { ModeToggle } from "@/components/mode-toggle";

import Link from 'next/link';



export default function Home() {

  const [showSettings, setShowSettings] = useState(false);

  const [showVisualizer, setShowVisualizer] = useState(false);

  const [mode, setMode] = useState<'audio' | 'scenes'>('audio');



  return (

    <main className="min-h-screen bg-background text-foreground transition-colors duration-300">

      {/* Header */}

      <header className="fixed top-0 left-0 right-0 p-4 flex justify-between items-center z-40 bg-background/80 backdrop-blur-sm border-b border-border">

        <div className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">

          Moodz

        </div>

        

        <div className="flex items-center gap-2">

          <ModeToggle />

          <Link href="/manage">

            <Button 

              variant="ghost"

              size="icon"

              title="Manage Lights & Layout"

            >

              <LayoutGrid className="h-5 w-5" />

            </Button>

          </Link>

          

          <Button 

            variant="ghost"

            size="icon"

            onClick={() => setShowSettings(true)}

          >

            <SettingsIcon className="h-5 w-5" />

          </Button>

        </div>

      </header>



      {/* Main Content */}

      <div className="pt-20 pb-8 px-4 max-w-4xl mx-auto">

        <div className="flex flex-col gap-8">

          

          {/* Controls */}

          <div className="w-full">

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

              

              {/* Mode Switcher */}

              <div className="flex justify-center">

                <Tabs value={mode} onValueChange={(val) => setMode(val as 'audio' | 'scenes')} className="w-[400px]">

                  <TabsList className="grid w-full grid-cols-2">

                    <TabsTrigger value="audio" className="flex items-center gap-2">

                      <Music className="w-4 h-4" />

                      Audio Sync

                    </TabsTrigger>

                    <TabsTrigger value="scenes" className="flex items-center gap-2">

                      <Sparkles className="w-4 h-4" />

                      Scenes

                    </TabsTrigger>

                  </TabsList>

                </Tabs>

              </div>



              {/* Content Area */}

              <div className="min-h-[400px]">

                <div style={{ display: mode === 'audio' ? 'block' : 'none' }}>

                  <AudioSync isActive={mode === 'audio'} />

                </div>

                                <div style={{ display: mode === 'scenes' ? 'block' : 'none' }}>

                                  <Scenes 

                                    onSceneActive={(active) => {

                                        if (active) {

                                            setMode('scenes');

                                            setShowVisualizer(true);

                                        }

                                    }}

                                    onOpenVisualizer={() => setShowVisualizer(true)}

                                  />

                                </div>

              </div>



            </div>

          </div>

        </div>

      </div>



      {/* Visualizer Modal */}

      {showVisualizer && (

        <VisualizerModal onClose={() => setShowVisualizer(false)} />

      )}



      {/* Settings Modal */}

      {showSettings && (

        <Settings onClose={() => setShowSettings(false)} />

      )}

    </main>

  );

}
