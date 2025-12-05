
import { create } from 'zustand';

export interface LightPosition {
  id: string;
  x: number;
  y: number;
}

export interface Wall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface LayoutData {
  lights: LightPosition[];
  walls: Wall[];
}

interface LayoutState {
  layout: LayoutData;
  isLoading: boolean;
  error: string | null;
  
  fetchLayout: () => Promise<void>;
  saveLayout: () => Promise<void>;
  
  updateLightPosition: (id: string, x: number, y: number) => void;
  addWall: (wall: Wall) => void;
  updateWall: (id: string, updates: Partial<Wall>) => void;
  removeWall: (id: string) => void;
}

const API_URL = typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:3000/api';

export const useLayoutStore = create<LayoutState>((set, get) => ({
  layout: { lights: [], walls: [] },
  isLoading: false,
  error: null,

  fetchLayout: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/layout`);
      if (!response.ok) throw new Error('Failed to fetch layout');
      const data = await response.json();
      set({ layout: data, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
    }
  },

  saveLayout: async () => {
    const { layout } = get();
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/layout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(layout),
      });
      if (!response.ok) throw new Error('Failed to save layout');
      set({ isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
    }
  },

  updateLightPosition: (id, x, y) => {
    const { layout } = get();
    const existingIndex = layout.lights.findIndex(l => l.id === id);
    const newLights = [...layout.lights];
    
    if (existingIndex >= 0) {
      newLights[existingIndex] = { ...newLights[existingIndex], x, y };
    } else {
      newLights.push({ id, x, y });
    }
    
    set({ layout: { ...layout, lights: newLights } });
  },

  addWall: (wall) => {
    const { layout } = get();
    set({ layout: { ...layout, walls: [...layout.walls, wall] } });
  },

  updateWall: (id, updates) => {
    const { layout } = get();
    const newWalls = layout.walls.map(w => w.id === id ? { ...w, ...updates } : w);
    set({ layout: { ...layout, walls: newWalls } });
  },

  removeWall: (id) => {
    const { layout } = get();
    set({ layout: { ...layout, walls: layout.walls.filter(w => w.id !== id) } });
  }
}));
