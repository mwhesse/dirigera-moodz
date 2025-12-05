import { DirigeraService } from './DirigeraService';
import { Logger } from 'winston';
import { SCENE_PRESETS, Scene } from '../config/scenes';
import fs from 'fs';
import path from 'path';

const SCENES_FILE = path.join(process.cwd(), '.dirigera_scenes.json');

export class SceneEngine {
  private dirigeraService: DirigeraService;
  private logger: Logger;
  private activeInterval: NodeJS.Timeout | null = null;
  private currentScene: Scene | null = null;
  private isRunning = false;
  private scenes: Scene[];

  constructor(dirigeraService: DirigeraService, logger: Logger) {
    this.dirigeraService = dirigeraService;
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
    this.logger.info(`Starting scene: ${scene.name}`);

    // Initial setup
    this.applySceneInitialState();

    // Start the loop
    if (scene.type === 'drift') {
      // For drift, we update lights periodically.
      // We want updates to be staggered and organic.
      // Let's set an interval that updates a subset of lights or all lights with random timing.
      this.activeInterval = setInterval(() => {
        this.driftLoop();
      }, scene.transitionSpeed / 2); // Update frequently enough to keep it moving, but relies on long transition times
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
