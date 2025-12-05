import { DirigeraService } from './DirigeraService';
import { LayoutService } from './LayoutService';
import { Logger } from 'winston';
import { SCENE_PRESETS, Scene } from '../config/scenes';
import { Color } from '../types';
import fs from 'fs';
import path from 'path';

const SCENES_FILE = path.join(process.cwd(), '.dirigera_scenes.json');

export class SceneEngine {
  private dirigeraService: DirigeraService;
  private layoutService: LayoutService;
  private logger: Logger;
  private activeInterval: NodeJS.Timeout | null = null;
  private currentScene: Scene | null = null;
  private isRunning = false;
  private scenes: Scene[];
  private startTime: number = 0;

  constructor(dirigeraService: DirigeraService, layoutService: LayoutService, logger: Logger) {
    this.dirigeraService = dirigeraService;
    this.layoutService = layoutService;
    this.logger = logger;
    // Initialize with presets
    this.scenes = JSON.parse(JSON.stringify(SCENE_PRESETS)); // Deep copy
    this.loadSceneOverrides();
  }

  private loadSceneOverrides(): void {
    try {
      if (fs.existsSync(SCENES_FILE)) {
        const data = fs.readFileSync(SCENES_FILE, 'utf-8');
        const overrides = JSON.parse(data);
        
        if (typeof overrides === 'object') {
          this.scenes = this.scenes.map(scene => {
            if (overrides[scene.id]) {
              return { ...scene, ...overrides[scene.id] };
            }
            return scene;
          });
          this.logger.info('Loaded scene overrides from file');
        }
      }
    } catch (error) {
      this.logger.warn('Failed to load scene overrides:', error);
    }
  }

  private saveSceneOverrides(): void {
    try {
      const overrides: Record<string, Partial<Scene>> = {};
      this.scenes.forEach(scene => {
        const preset = SCENE_PRESETS.find(p => p.id === scene.id);
        if (preset) {
          // Check for diffs (currently only transitionSpeed and brightness are editable)
          if (scene.transitionSpeed !== preset.transitionSpeed || scene.brightness !== preset.brightness) {
            overrides[scene.id] = {
              transitionSpeed: scene.transitionSpeed,
              brightness: scene.brightness
            };
          }
        }
      });
      
      fs.writeFileSync(SCENES_FILE, JSON.stringify(overrides, null, 2), 'utf-8');
      this.logger.info('Saved scene overrides to file');
    } catch (error) {
      this.logger.error('Failed to save scene overrides:', error);
    }
  }

  getAllScenes(): Scene[] {
    return this.scenes;
  }

  updateScene(sceneId: string, updates: Partial<Scene>): Scene | null {
    const index = this.scenes.findIndex(s => s.id === sceneId);
    if (index === -1) return null;

    this.scenes[index] = { ...this.scenes[index], ...updates };
    
    // If this is the active scene, update currentScene reference and restart loop if needed
    if (this.currentScene && this.currentScene.id === sceneId) {
      this.currentScene = this.scenes[index];
      
      // If running, restart the interval to pick up new speed
      if (this.isRunning && this.activeInterval) {
        clearInterval(this.activeInterval);
        if (this.currentScene.type === 'drift') {
          this.activeInterval = setInterval(() => {
            this.driftLoop();
          }, this.currentScene.transitionSpeed / 2);
          
          this.logger.info(`Updated active scene interval for speed: ${this.currentScene.transitionSpeed}ms`);
        }
      }
    }

    this.saveSceneOverrides();
    return this.scenes[index];
  }

  startScene(sceneId: string): boolean {
    const scene = this.scenes.find(s => s.id === sceneId);
    if (!scene) {
      this.logger.warn(`Attempted to start unknown scene: ${sceneId}`);
      return false;
    }

    this.stop(); // Stop any existing scene
    this.currentScene = scene;
    this.isRunning = true;
    this.startTime = Date.now();
    this.logger.info(`Starting scene: ${scene.name}`);

    // Initial setup
    this.applySceneInitialState();

    // Start the loop
    if (scene.type === 'drift') {
      // For spatial scenes, we need a faster loop to animate the wave smoothly
      // The transition time in the spatial calculation will handle the smoothness on the light side,
      // but we need to update the target often enough to move the wave.
      const intervalTime = scene.spatial ? 1000 : scene.transitionSpeed / 2;
      
      this.activeInterval = setInterval(() => {
        if (scene.spatial) {
          this.spatialLoop();
        } else {
          this.driftLoop();
        }
      }, intervalTime);
    }

    return true;
  }

  stop(): void {
    if (this.activeInterval) {
      clearInterval(this.activeInterval);
      this.activeInterval = null;
    }
    this.currentScene = null;
    this.isRunning = false;
    this.logger.info('Scene engine stopped');
  }

  getCurrentScene(): Scene | null {
    return this.currentScene;
  }

  private async applySceneInitialState(): Promise<void> {
    if (!this.currentScene) return;

    const devices = this.getEligibleDevices();
    if (devices.length === 0) return;

    const updates = devices.map(device => ({
      deviceId: device.id,
      color: this.getRandomColorFromPalette(),
      brightness: this.currentScene!.brightness,
      transitionTime: 500 // 0.5s initial snap
    }));

    await this.dirigeraService.updateLightsBatch(updates);
  }

  private async driftLoop(): Promise<void> {
    if (!this.currentScene || !this.isRunning) return;

    const devices = this.getEligibleDevices();
    
    // To make it organic, we don't update every light every time.
    // We pick a few lights to change direction.
    const devicesToUpdate = devices.filter(() => Math.random() > 0.3); // Update ~70% of lights

    const promises = devicesToUpdate.map(device => {
      const color = this.getRandomColorFromPalette();
      
      // Randomize transition time slightly around the scene average
      const variation = this.currentScene!.transitionSpeed * 0.4; // +/- 40%
      const transitionTime = this.currentScene!.transitionSpeed + (Math.random() * variation - (variation / 2));

      return this.dirigeraService.updateSingleLight({
        deviceId: device.id,
        color: color,
        brightness: this.currentScene!.brightness,
        transitionTime: Math.round(transitionTime)
      });
    });

    await Promise.allSettled(promises);
  }

  private async spatialLoop(): Promise<void> {
    if (!this.currentScene || !this.isRunning || !this.currentScene.spatial) return;

    const devices = this.getEligibleDevices();
    const layout = this.layoutService.getLayout();
    const currentTime = Date.now();
    const elapsedTime = (currentTime - this.startTime) / 1000; // Seconds

    const promises = devices.map(device => {
      // Get position or default to random static position if not placed (using hash of ID for stability)
      const pos = layout.lights.find(l => l.id === device.id) || {
        x: (device.id.charCodeAt(0) % 100),
        y: (device.id.charCodeAt(device.id.length - 1) % 100)
      };

      const color = this.getSpatialColor(pos.x, pos.y, elapsedTime, this.currentScene!);
      
      // For spatial effects, we want relatively quick transitions to follow the wave,
      // but smooth enough to not be jerky. 
      // 1s - 2s is usually good for "drift", but if the wave is fast, we need faster updates.
      // Let's use a fixed transition time of 1.5s for now, updated every 1s.
      return this.dirigeraService.updateSingleLight({
        deviceId: device.id,
        color: color,
        brightness: this.currentScene!.brightness,
        transitionTime: 1500
      });
    });

    await Promise.allSettled(promises);
  }

  private getSpatialColor(x: number, y: number, time: number, scene: Scene): Color {
    if (!scene.spatial) return this.getRandomColorFromPalette();

    const { mode, scale, speed, angle = 0 } = scene.spatial;
    const palette = scene.palette;
    
    // Normalize coordinates to 0-1
    const nx = x / 100;
    const ny = y / 100;

    let phase = 0;

    switch (mode) {
      case 'linear':
        // Convert angle to radians
        const rad = (angle * Math.PI) / 180;
        // Project point onto the vector defined by angle
        // p = x*cos(theta) + y*sin(theta)
        phase = (nx * Math.cos(rad) + ny * Math.sin(rad));
        break;
      
      case 'radial':
        // Distance from center (0.5, 0.5)
        const dx = nx - 0.5;
        const dy = ny - 0.5;
        phase = Math.sqrt(dx*dx + dy*dy);
        break;
        
      case 'random':
      default:
        return this.getRandomColorFromPalette();
    }

    // Apply scale and time
    // Phase determines where we are in the palette
    // phase + time * speed
    const t = time * speed;
    const patternValue = (phase * scale) - t;
    
    // Map to palette index
    // We use modulo to loop through palette
    // Handle negative values correctly for modulo
    const len = palette.length;
    let normalizedIndex = patternValue % len;
    if (normalizedIndex < 0) normalizedIndex += len;
    
    const index1 = Math.floor(normalizedIndex);
    const index2 = (index1 + 1) % len;
    const fraction = normalizedIndex - index1;

    return this.interpolateColors(palette[index1], palette[index2], fraction);
  }

  private interpolateColors(c1: Color, c2: Color, factor: number): Color {
    // Shortest path interpolation for Hue
    let h1 = c1.hue;
    let h2 = c2.hue;
    const diff = h2 - h1;

    if (diff > 180) h2 -= 360;
    else if (diff < -180) h2 += 360;

    let h = h1 + (h2 - h1) * factor;
    if (h < 0) h += 360;
    if (h >= 360) h -= 360;

    // Simple linear interpolation for saturation
    const s = c1.saturation + (c2.saturation - c1.saturation) * factor;

    return { hue: h, saturation: s };
  }

  private getEligibleDevices() {
    // Filter for lights that are ON, Selected, and Color Capable
    return this.dirigeraService.getDevices().filter(d => 
      d.currentState.isOn && 
      d.isSelected && 
      d.capabilities.canChangeColor
    );
  }

  private getRandomColorFromPalette() {
    if (!this.currentScene) return { hue: 0, saturation: 0 };
    const palette = this.currentScene.palette;
    return palette[Math.floor(Math.random() * palette.length)];
  }
}
