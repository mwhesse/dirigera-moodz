import { DirigeraService } from './DirigeraService';
import { Logger } from 'winston';
import { SCENE_PRESETS, Scene } from '../config/scenes';

export class SceneEngine {
  private dirigeraService: DirigeraService;
  private logger: Logger;
  private activeInterval: NodeJS.Timeout | null = null;
  private currentScene: Scene | null = null;
  private isRunning = false;

  constructor(dirigeraService: DirigeraService, logger: Logger) {
    this.dirigeraService = dirigeraService;
    this.logger = logger;
  }

  startScene(sceneId: string): boolean {
    const scene = SCENE_PRESETS.find(s => s.id === sceneId);
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

    const promises = devices.map(device => {
      const color = this.getRandomColorFromPalette();
      return this.dirigeraService.updateSingleLight({
        deviceId: device.id,
        color: color,
        brightness: this.currentScene!.brightness,
        transitionTime: 2000 // 2s initial fade in
      });
    });

    await Promise.allSettled(promises);
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
