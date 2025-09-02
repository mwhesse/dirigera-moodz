import { DirigeraService } from './DirigeraService';
import { BeatData, FrequencyData, SongSection, Color, SyncSettings, LightCommand, ScheduledCommand } from '../types';
import { Logger } from 'winston';

export class SyncEngine {
  private dirigeraService: DirigeraService;
  private analysisState: AnalysisState;
  private syncSettings: SyncSettings;
  private latencyCompensator: LatencyCompensator;
  private logger: Logger;
  private lastLightUpdate: number = 0;
  private readonly lightUpdateInterval: number = 3000; // 3 seconds between color updates - much more responsive
  private lastBeatUpdate: number = 0;
  private readonly beatUpdateInterval: number = 800; // 0.8 seconds between beat updates

  constructor(dirigeraService: DirigeraService, logger: Logger) {
    this.dirigeraService = dirigeraService;
    this.analysisState = new AnalysisState();
    this.syncSettings = this.getDefaultSettings();
    this.latencyCompensator = new LatencyCompensator(150, logger); // 150ms average latency
    this.logger = logger;
  }

  // Process beat detection from frontend
  async handleBeatDetection(data: BeatData): Promise<void> {
    try {
      const { timestamp, intensity, confidence } = data;
      
      // Only process beats above the threshold
      if (confidence < this.syncSettings.beatDetectionThreshold) {
        return;
      }

      // Rate limit beat updates - only allow beat effects every 0.8 seconds
      const now = Date.now();
      if (now - this.lastBeatUpdate < this.beatUpdateInterval) {
        return;
      }

      // Calculate brightness based on intensity and settings
      const baseBrightness = 30;
      const maxBrightness = 100;
      const brightnessDelta = (maxBrightness - baseBrightness) * intensity * this.syncSettings.effectIntensity;
      const targetBrightness = Math.min(maxBrightness, Math.max(baseBrightness, baseBrightness + brightnessDelta));
      
      this.logger.info(`Beat pulse: intensity=${intensity.toFixed(2)}, confidence=${confidence.toFixed(2)}, brightness=${targetBrightness.toFixed(0)}`);

      // Execute beat command directly (simplified - no latency compensation for now)
      await this.dirigeraService.executeCommand({
        type: 'PULSE',
        brightness: targetBrightness,
        transitionTime: 50, // Quick flash
        returnToPrevious: true,
        returnDelay: 150
      });

      this.lastBeatUpdate = now;
    } catch (error) {
      this.logger.error('Error handling beat detection:', error);
    }
  }

  // Process frequency analysis from frontend
  async handleFrequencyUpdate(data: FrequencyData): Promise<void> {
    try {
      const { bass, mids, treble, dominantFrequency } = data;
      
      // Rate limit light updates - EXTREMELY STRICT CHECKING
      const now = Date.now();
      const timeSinceLastUpdate = now - this.lastLightUpdate;
      
      if (timeSinceLastUpdate < this.lightUpdateInterval) {
        // Still process for smoothing but don't send to lights
        const color = this.mapFrequencyToColor(bass, mids, treble);
        this.analysisState.smoothColor(color);
        return;
      }
      
      // Update the timestamp immediately to prevent race conditions
      this.lastLightUpdate = now;
      
      // Map frequency bands to colors
      const color = this.mapFrequencyToColor(bass, mids, treble);
      
      // Apply smoothing to prevent jarring transitions
      const smoothedColor = this.analysisState.smoothColor(color);
      
      // Calculate dynamic brightness based on total audio energy
      const totalEnergy = bass + mids + treble;
      
      // Create colorful patterns instead of all same color
      await this.createLightPattern(totalEnergy, bass, mids, treble);
    } catch (error) {
      this.logger.error('Error handling frequency update:', error);
    }
  }

  // Map frequency analysis to color
  private mapFrequencyToColor(bass: number, mids: number, treble: number): Color {
    switch (this.syncSettings.colorMode) {
      case 'frequency':
        return this.mapFrequencyBandsToColor(bass, mids, treble);
      case 'mood':
        return this.mapMoodToColor(bass, mids, treble);
      case 'random':
        return this.generateRandomColor(bass + mids + treble);
      default:
        return this.mapFrequencyBandsToColor(bass, mids, treble);
    }
  }

  private mapFrequencyBandsToColor(bass: number, mids: number, treble: number): Color {
    // Use API-compliant saturation values and better cycling
    const VIBRANT_COLORS = [
      { hue: 0, saturation: 0.9 },    // Red
      { hue: 30, saturation: 0.9 },   // Orange  
      { hue: 60, saturation: 0.8 },   // Yellow
      { hue: 120, saturation: 0.9 },  // Green
      { hue: 180, saturation: 0.8 },  // Cyan
      { hue: 240, saturation: 0.9 },  // Blue
      { hue: 270, saturation: 0.9 },  // Purple
      { hue: 300, saturation: 0.8 }   // Magenta
    ];
    
    // Better cycling that changes more frequently
    const total = bass + mids + treble;
    const timeComponent = Math.floor(Date.now() / 3000); // Change every 3 seconds
    const audioComponent = Math.floor(total * 50); // Audio influence
    const colorIndex = (timeComponent + audioComponent) % VIBRANT_COLORS.length;
    
    this.logger.debug(`🎨 COLOR INDEX: ${colorIndex}, TIME: ${timeComponent}, AUDIO: ${audioComponent}, COLOR: ${JSON.stringify(VIBRANT_COLORS[colorIndex])}`);
    
    return VIBRANT_COLORS[colorIndex];
  }

  private mapMoodToColor(bass: number, mids: number, treble: number): Color {
    // Map energy levels to mood-based colors
    const totalEnergy = bass + mids + treble;
    
    if (totalEnergy < 0.3) {
      // Low energy - cool blues/purples
      return { hue: 240 + (Math.random() * 60), saturation: 0.6 };
    } else if (totalEnergy < 0.6) {
      // Medium energy - greens/teals
      return { hue: 120 + (Math.random() * 60), saturation: 0.7 };
    } else {
      // High energy - warm reds/oranges/yellows
      return { hue: Math.random() * 60, saturation: 0.8 };
    }
  }

  private generateRandomColor(energy: number): Color {
    return {
      hue: Math.random() * 360,
      saturation: Math.min(1.0, 0.4 + (energy * 0.6))
    };
  }

  // Apply effects based on song section
  async handleSongSection(section: SongSection): Promise<void> {
    try {
      this.logger.info(`Song section detected: ${section.type} (confidence: ${section.confidence.toFixed(2)})`);
      
      switch (section.type) {
        case 'DROP':
          await this.applyDropEffect();
          break;
        case 'BUILD':
          await this.applyBuildEffect();
          break;
        case 'BREAKDOWN':
          await this.applyBreakdownEffect();
          break;
        case 'CHORUS':
          await this.applyChorusEffect();
          break;
        default:
          // Normal sync mode continues
          break;
      }
    } catch (error) {
      this.logger.error('Error handling song section:', error);
    }
  }

  private async applyDropEffect(): Promise<void> {
    this.logger.info('Applying drop effect');
    
    // Strobe effect for drops
    for (let i = 0; i < 12; i++) {
      await this.dirigeraService.updateLights({
        brightness: i % 2 === 0 ? 100 : 20,
        color: { hue: (i * 30) % 360, saturation: 1.0 },
        transitionTime: 0
      });
      await this.sleep(80);
    }
  }

  private async applyBuildEffect(): Promise<void> {
    this.logger.info('Applying build-up effect');
    
    // Gradually increase brightness and color intensity
    const steps = 20;
    const stepDelay = 150;
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const brightness = 30 + (70 * progress); // 30% to 100%
      const saturation = 0.4 + (0.6 * progress); // 40% to 100%
      const hue = 200 + (160 * progress); // Blue to red transition
      
      await this.dirigeraService.updateLights({
        brightness: brightness,
        color: { hue: hue, saturation: saturation },
        transitionTime: stepDelay
      });
      
      await this.sleep(stepDelay);
    }
  }

  private async applyBreakdownEffect(): Promise<void> {
    this.logger.info('Applying breakdown effect');
    
    // Fade to minimal, cool lighting
    await this.dirigeraService.updateLights({
      brightness: 15,
      color: { hue: 220, saturation: 0.3 }, // Soft blue
      transitionTime: 1000 // Slow fade
    });
  }

  private async applyChorusEffect(): Promise<void> {
    this.logger.info('Applying chorus effect');
    
    // Bright, energetic colors
    await this.dirigeraService.updateLights({
      brightness: 85,
      color: { hue: 60, saturation: 0.9 }, // Bright yellow
      transitionTime: 300
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Update sync settings
  updateSettings(settings: Partial<SyncSettings>): void {
    this.syncSettings = { ...this.syncSettings, ...settings };
    this.logger.info('Sync settings updated:', settings);
  }

  // Get current settings
  getSettings(): SyncSettings {
    return { ...this.syncSettings };
  }

  // Create dynamic light patterns
  private async createLightPattern(totalEnergy: number, bass: number, mids: number, treble: number): Promise<void> {
    // Refresh device states to get current ON/OFF status
    await this.dirigeraService.refreshDeviceStates();
    
    const devices = this.dirigeraService.getDevices().filter(d => d.currentState.isOn && d.capabilities.canChangeColor);
    
    this.logger.error(`🔍 PATTERN CHECK: Found ${devices.length} lights that are ON and support color`);
    devices.forEach(d => this.logger.error(`✅ ACTIVE: ${d.name} (ON: ${d.currentState.isOn})`));
    
    if (devices.length === 0) return;

    // Define color palette based on frequency bands
    const bassColor = { hue: 0, saturation: 0.9 };      // Red for bass
    const midsColor = { hue: 120, saturation: 0.8 };    // Green for mids  
    const trebleColor = { hue: 240, saturation: 0.9 };  // Blue for treble
    const accentColor = { hue: 60, saturation: 0.8 };   // Yellow accent

    // Calculate brightness based on energy
    const minBrightness = 40;
    const maxBrightness = 85;
    const bassBrightness = Math.round(minBrightness + (bass * (maxBrightness - minBrightness)));
    const midsBrightness = Math.round(minBrightness + (mids * (maxBrightness - minBrightness)));
    const trebleBrightness = Math.round(minBrightness + (treble * (maxBrightness - minBrightness)));

    // Choose pattern based on time
    const patternIndex = Math.floor(Date.now() / 15000) % 4; // Change pattern every 15 seconds
    
    switch (patternIndex) {
      case 0:
        await this.createAlternatingPattern(devices, bassColor, trebleColor, bassBrightness, trebleBrightness);
        break;
      case 1:
        await this.createTrioPattern(devices, bassColor, midsColor, trebleColor, bassBrightness, midsBrightness, trebleBrightness);
        break;
      case 2:
        await this.createWavePattern(devices, bassColor, accentColor, bassBrightness, midsBrightness);
        break;
      case 3:
        await this.createQuadrantPattern(devices, bassColor, midsColor, trebleColor, accentColor, bassBrightness, midsBrightness, trebleBrightness);
        break;
    }
  }

  // Pattern 1: Alternating pairs
  private async createAlternatingPattern(devices: any[], color1: any, color2: any, brightness1: number, brightness2: number): Promise<void> {
    const updates = devices.map((device, index) => ({
      deviceId: device.id,
      deviceName: device.name,
      color: index % 2 === 0 ? color1 : color2,
      brightness: index % 2 === 0 ? brightness1 : brightness2
    }));
    
    await this.executePatternUpdates(updates);
  }

  // Pattern 2: Groups of three colors
  private async createTrioPattern(devices: any[], color1: any, color2: any, color3: any, brightness1: number, brightness2: number, brightness3: number): Promise<void> {
    const updates = devices.map((device, index) => {
      const groupIndex = index % 3;
      return {
        deviceId: device.id,
        deviceName: device.name,
        color: groupIndex === 0 ? color1 : groupIndex === 1 ? color2 : color3,
        brightness: groupIndex === 0 ? brightness1 : groupIndex === 1 ? brightness2 : brightness3
      };
    });
    
    await this.executePatternUpdates(updates);
  }

  // Pattern 3: Wave effect
  private async createWavePattern(devices: any[], color1: any, color2: any, brightness1: number, brightness2: number): Promise<void> {
    const wavePhase = (Date.now() / 2000) % (Math.PI * 2); // 2 second wave cycle
    
    const updates = devices.map((device, index) => {
      const devicePhase = (index / devices.length) * Math.PI * 2;
      const waveValue = (Math.sin(wavePhase + devicePhase) + 1) / 2; // 0-1
      
      return {
        deviceId: device.id,
        deviceName: device.name,
        color: waveValue > 0.5 ? color1 : color2,
        brightness: Math.round(brightness1 + (waveValue * (brightness2 - brightness1)))
      };
    });
    
    await this.executePatternUpdates(updates);
  }

  // Pattern 4: Quadrant-based
  private async createQuadrantPattern(devices: any[], color1: any, color2: any, color3: any, color4: any, brightness1: number, brightness2: number, brightness3: number): Promise<void> {
    const updates = devices.map((device, index) => {
      const quadrant = index % 4;
      let color, brightness;
      
      switch (quadrant) {
        case 0: color = color1; brightness = brightness1; break;
        case 1: color = color2; brightness = brightness2; break;
        case 2: color = color3; brightness = brightness3; break;
        case 3: color = color4; brightness = Math.round((brightness1 + brightness2) / 2); break;
      }
      
      return {
        deviceId: device.id,
        deviceName: device.name,
        color: color,
        brightness: brightness
      };
    });
    
    await this.executePatternUpdates(updates);
  }

  // Execute pattern updates
  private async executePatternUpdates(updates: any[]): Promise<void> {
    for (const update of updates) {
      await this.dirigeraService.updateSingleLight({
        deviceId: update.deviceId,
        color: update.color,
        brightness: update.brightness,
        transitionTime: 300
      });
    }
  }

  private getDefaultSettings(): SyncSettings {
    return {
      sensitivity: 0.7,
      colorMode: 'frequency',
      effectIntensity: 0.8,
      smoothing: 0.6,
      beatDetectionThreshold: 0.6,
      colorTransitionSpeed: 200
    };
  }
}

// Analysis state management for color smoothing
class AnalysisState {
  private colorHistory: Color[] = [];
  private readonly historySize = 5;

  smoothColor(newColor: Color): Color {
    this.colorHistory.push(newColor);
    
    if (this.colorHistory.length > this.historySize) {
      this.colorHistory.shift();
    }
    
    if (this.colorHistory.length === 1) {
      return newColor;
    }
    
    // Weighted average with more weight on recent colors
    let totalHue = 0;
    let totalSaturation = 0;
    let totalWeight = 0;
    
    this.colorHistory.forEach((color, index) => {
      const weight = (index + 1) / this.colorHistory.length; // More recent = higher weight
      
      // Handle hue wrapping (circular nature of hue values)
      const hueRadians = (color.hue * Math.PI) / 180;
      totalHue += Math.cos(hueRadians) * weight;
      totalSaturation += color.saturation * weight;
      totalWeight += weight;
    });
    
    // Convert back to hue
    const smoothedHue = (Math.atan2(0, totalHue / totalWeight) * 180) / Math.PI;
    const normalizedHue = smoothedHue < 0 ? smoothedHue + 360 : smoothedHue;
    
    return {
      hue: normalizedHue,
      saturation: Math.max(0, Math.min(1, totalSaturation / totalWeight))
    };
  }
}

// Latency compensation for network delays
class LatencyCompensator {
  private commandBuffer: ScheduledCommand[] = [];
  private averageLatency: number;
  private processingInterval: NodeJS.Timer;
  private logger: Logger;

  constructor(averageLatency: number, logger: Logger) {
    this.averageLatency = averageLatency;
    this.logger = logger;
    this.startProcessing();
  }

  scheduleCommand(command: LightCommand, targetTime: number): void {
    const sendTime = targetTime - this.averageLatency;
    const scheduledCommand: ScheduledCommand = { command, sendTime };
    
    this.commandBuffer.push(scheduledCommand);
    this.commandBuffer.sort((a, b) => a.sendTime - b.sendTime);
    
    this.logger.debug(`Scheduled command for ${new Date(sendTime).toISOString()}`);
  }

  private startProcessing(): void {
    this.processingInterval = setInterval(() => {
      const now = Date.now();
      
      while (this.commandBuffer.length > 0 && 
             this.commandBuffer[0].sendTime <= now) {
        const { command } = this.commandBuffer.shift()!;
        this.executeCommand(command);
      }
      
      // Clean up very old commands (older than 5 seconds)
      const cutoffTime = now - 5000;
      this.commandBuffer = this.commandBuffer.filter(cmd => cmd.sendTime > cutoffTime);
    }, 10); // Check every 10ms for precision
  }

  private async executeCommand(command: LightCommand): Promise<void> {
    try {
      // Note: In a real implementation, you'd need access to DirigeraService here
      // This is a simplified version
      this.logger.debug(`Executing scheduled command: ${command.type}`);
      // await this.dirigeraService.executeCommand(command);
    } catch (error) {
      this.logger.error('Failed to execute scheduled command:', error);
    }
  }

  updateLatency(newLatency: number): void {
    this.averageLatency = newLatency;
    this.logger.info(`Latency compensation updated to ${newLatency}ms`);
  }

  destroy(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }
}