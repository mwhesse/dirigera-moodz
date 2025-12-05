
'use client';

import React from 'react';
import { LightController } from '@/components/LightController';
import { LightMap } from '@/components/LightMap';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LayoutGrid, Settings as SettingsIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Link from 'next/link';

export default function ManagePage() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <div>
             <h1 className="text-3xl font-bold">Light Management</h1>
             <p className="text-muted-foreground">Configure your devices and room layout</p>
          </div>
        </div>

        <Tabs defaultValue="layout" className="w-full space-y-6">
          <div className="flex justify-center">
            <TabsList className="grid w-[400px] grid-cols-2">
              <TabsTrigger value="layout" className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                Room Layout
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <SettingsIcon className="w-4 h-4" />
                Device Settings
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="layout" className="space-y-4 animate-in fade-in-50 duration-300">
             <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                   <div>
                      <h2 className="text-xl font-semibold">Room Layout Editor</h2>
                      <p className="text-sm text-muted-foreground">
                        Drag lights to their physical positions. Add walls to define boundaries.
                      </p>
                   </div>
                </div>
                {/* Full width map container */}
                <div className="w-full">
                   <LightMap editable={true} className="w-full shadow-xl border rounded-xl" />
                </div>
             </div>
          </TabsContent>

          <TabsContent value="settings" className="animate-in fade-in-50 duration-300">
            <div className="max-w-4xl mx-auto space-y-4">
                <h2 className="text-xl font-semibold">Connected Devices</h2>
                <div className="bg-card rounded-lg border p-6">
                    <LightController />
                </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
