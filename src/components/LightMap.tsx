
import React, { useEffect, useRef, useState } from 'react';
import { useLayoutStore, Wall } from '@/lib/stores/layoutStore';
import { useLightStore } from '@/lib/stores/lightStore';
import { Button } from '@/components/ui/button';
import { Plus, Save, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface LightMapProps {
  editable?: boolean;
  className?: string;
  isFlipped?: boolean;
}

export function LightMap({ editable = false, className = '', isFlipped = false }: LightMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { layout, fetchLayout, saveLayout, updateLightPosition, addWall, updateWall, removeWall } = useLayoutStore();
  const { devices, toggleDeviceSelection } = useLightStore();
  
  // Local state for dragging
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingType, setDraggingType] = useState<'light' | 'wall-start' | 'wall-end' | 'wall-center' | null>(null);
  const [showLabels, setShowLabels] = useState(editable); // Initialize based on editable prop
  
  // Initialize
  useEffect(() => {
    fetchLayout();
  }, []);

  // Helper to convert relative percentage (stored) to absolute pixels
  const toPx = (val: number, max: number) => (val / 100) * max;
  // Helper to convert absolute pixels to relative percentage
  const toPct = (val: number, max: number) => Math.max(0, Math.min(100, (val / max) * 100));

  const handlePointerDown = (e: React.PointerEvent, id: string, type: 'light' | 'wall-start' | 'wall-end' | 'wall-center') => {
    if (!editable) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingId(id);
    setDraggingType(type);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !containerRef.current || !editable) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const xPct = toPct(x, rect.width);
    const yPct = toPct(y, rect.height);

    if (draggingType === 'light') {
      updateLightPosition(draggingId, xPct, yPct);
    } else if (draggingType === 'wall-start') {
      updateWall(draggingId, { x1: xPct, y1: yPct });
    } else if (draggingType === 'wall-end') {
      updateWall(draggingId, { x2: xPct, y2: yPct });
    } else if (draggingType === 'wall-center') {
        // Calculate delta would be better, but for now simple move is ok or skip.
        // Moving the whole wall is complex without delta, let's stick to endpoints for now.
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!draggingId) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDraggingId(null);
    setDraggingType(null);
  };

  const handleAddWall = () => {
    addWall({
      id: uuidv4(),
      x1: 20, y1: 20,
      x2: 80, y2: 20
    });
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {editable && (
        <div className="flex gap-2 justify-end items-center">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-labels"
              checked={showLabels}
              onCheckedChange={setShowLabels}
            />
            <Label htmlFor="show-labels">Show Labels</Label>
          </div>
          <Button size="sm" variant="outline" onClick={handleAddWall}>
            <Plus className="w-4 h-4 mr-2" /> Add Wall
          </Button>
          <Button size="sm" onClick={() => saveLayout()}>
            <Save className="w-4 h-4 mr-2" /> Save Layout
          </Button>
        </div>
      )}
      
      <div 
        ref={containerRef}
        className={`relative w-full aspect-video bg-slate-900 rounded-lg overflow-hidden border border-slate-800 touch-none transition-transform duration-500 ${isFlipped ? 'rotate-180' : ''}`}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Walls */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {layout.walls.map(wall => (
            <line
              key={wall.id}
              x1={`${wall.x1}%`}
              y1={`${wall.y1}%`}
              x2={`${wall.x2}%`}
              y2={`${wall.y2}%`}
              stroke="gray"
              strokeWidth="4"
              strokeLinecap="round"
            />
          ))}
        </svg>

        {/* Wall Handles (Edit Mode) */}
        {editable && layout.walls.map(wall => (
          <React.Fragment key={`handles-${wall.id}`}>
            {/* Start Handle */}
            <div
              className="absolute w-4 h-4 bg-blue-500 rounded-full -ml-2 -mt-2 cursor-move z-10 hover:scale-125 transition-transform"
              style={{ left: `${wall.x1}%`, top: `${wall.y1}%` }}
              onPointerDown={(e) => handlePointerDown(e, wall.id, 'wall-start')}
            />
            {/* End Handle */}
             <div
              className="absolute w-4 h-4 bg-blue-500 rounded-full -ml-2 -mt-2 cursor-move z-10 hover:scale-125 transition-transform"
              style={{ left: `${wall.x2}%`, top: `${wall.y2}%` }}
              onPointerDown={(e) => handlePointerDown(e, wall.id, 'wall-end')}
            />
            {/* Remove Button (Center) */}
             <div
              className="absolute w-6 h-6 bg-red-500/50 rounded-full -ml-3 -mt-3 flex items-center justify-center cursor-pointer z-20 hover:bg-red-600"
              style={{ left: `${(wall.x1 + wall.x2) / 2}%`, top: `${(wall.y1 + wall.y2) / 2}%` }}
              onClick={() => removeWall(wall.id)}
            >
               <Trash2 className="w-3 h-3 text-white" />
            </div>
          </React.Fragment>
        ))}

        {/* Lights */}
        {devices.map(device => {
          const pos = layout.lights.find(l => l.id === device.id);
          const x = pos?.x ?? 50; // Default to center if not placed
          const y = pos?.y ?? 50;
          
          // Calculate color
          const hue = device.currentState.color?.hue ?? 0;
          const sat = device.currentState.color?.saturation ?? 0;
          const bri = device.currentState.brightness ?? 0;
          const isOn = device.currentState.isOn;
          
          const colorStyle = isOn 
            ? `hsl(${hue}, ${sat * 100}%, 50%)` 
            : '#333';
            
          const glowStyle = isOn
            ? `0 0 ${bri * 0.2}px ${colorStyle}, 0 0 ${bri * 0.6}px ${colorStyle}` 
            : 'none';

          return (
            <div key={device.id}>
              <div
                className={`absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 border-white transition-all duration-200 z-30 ${editable ? 'cursor-grab active:cursor-grabbing' : ''}`}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  backgroundColor: colorStyle,
                  boxShadow: glowStyle
                }}
                onPointerDown={(e) => handlePointerDown(e, device.id, 'light')}
                title={device.name}
              >
                 {editable && (
                    <div 
                        className={`absolute w-3 h-3 rounded-full -top-1 -left-1 border border-white cursor-pointer ${device.isSelected ? 'bg-green-500' : 'bg-red-500'}`}
                        onPointerDown={(e) => e.stopPropagation()} 
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleDeviceSelection(device.id, !device.isSelected);
                        }}
                        title={device.isSelected ? "Participating (Click to exclude)" : "Excluded (Click to participate)"}
                    />
                 )}
              </div>
              {showLabels && (
                <div
                  className={`absolute text-xs text-white text-center font-medium pointer-events-none select-none text-shadow-sm transition-transform duration-500 ${isFlipped ? 'rotate-180' : ''}`}
                  style={{ 
                    left: `${x}%`, 
                    top: `${y + 3}%`, // Position below light
                    transform: 'translateX(-50%)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.6)'
                  }}
                >
                  {device.name}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
