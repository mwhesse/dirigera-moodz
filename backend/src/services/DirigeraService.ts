import { createDirigeraClient, DirigeraClient } from 'dirigera';
import { Device, DirigeraConfig, LightUpdate, LightCommand, ScheduledCommand } from '../types';
import { Logger } from 'winston';

export class DirigeraService {
  private client: DirigeraClient | null = null;
  private devices: Map<string, Device> = new Map();
  private commandQueue: CommandQueue;
  private logger: Logger;
  private isConnected = false;

  constructor(config: DirigeraConfig, logger: Logger) {
    this.logger = logger;
    this.commandQueue = new CommandQueue(10, logger); // 10 commands/second limit
    this.initialize(config);
  }

  async initialize(config: DirigeraConfig): Promise<void> {
    try {
      if (!config.accessToken) {
        this.logger.info('No access token provided, starting authentication flow...');
        this.client = await createDirigeraClient();
        const token = await this.authenticateWithButton();
        this.logger.info('Authentication successful, token obtained');
        // In a real implementation, you'd save this token securely
        await this.saveToken(token);
      } else {
        this.logger.info('Using provided access token');
        this.client = await createDirigeraClient({
          accessToken: config.accessToken,
          gatewayIP: config.gatewayIP === 'auto' ? undefined : config.gatewayIP
        });
      }

      // Discover and cache all TRADFRI lights
      await this.discoverDevices();
      
      // Start listening for device updates
      if (this.client) {
        this.client.startListeningForUpdates(this.handleDeviceUpdate.bind(this));
      }
      
      this.isConnected = true;
      this.logger.info('DIRIGERA service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize DIRIGERA service:', error);
      throw error;
    }
  }

  async discoverDevices(): Promise<void> {
    if (!this.client) {
      throw new Error('DIRIGERA client not initialized');
    }

    try {
      const devices = await this.client.lights.list();
      this.logger.info(`Discovered ${devices.length} light devices`);
      
      devices.forEach(device => {
        // Log the full device structure to understand the API
        this.logger.info('Raw device data:', JSON.stringify(device, null, 2));
        
        // TRADFRI lights generally support both brightness and color
        // Let's assume they do if they're light devices and override the detection
        const isColorLight = device.attributes.colorHue !== undefined || 
                            device.attributes.colorTemperature !== undefined ||
                            (device.capabilities && Object.keys(device.capabilities).some(key => 
                              key.toLowerCase().includes('color')));
        
        const isBrightnessLight = device.attributes.lightLevel !== undefined ||
                                (device.capabilities && Object.keys(device.capabilities).some(key => 
                                  key.toLowerCase().includes('bright') || key.toLowerCase().includes('dim')));
        
        const deviceInfo: Device = {
          id: device.id,
          name: device.attributes.customName || device.attributes.model || 'Unknown Device',
          capabilities: {
            // For TRADFRI lights, assume they support brightness if they have lightLevel
            canChangeBrightness: device.capabilities?.canChangeBrightness ?? 
                               (device.attributes.lightLevel !== undefined) ?? true,
            // For TRADFRI lights, assume they support color if they have colorHue
            canChangeColor: device.capabilities?.canChangeColor ?? 
                           (device.attributes.colorHue !== undefined) ?? 
                           (device.deviceType === 'light' && isColorLight),
            colorTemperatureRange: device.capabilities?.colorTemperatureRange
          },
          currentState: {
            isOn: device.attributes.isOn || false,
            brightness: device.attributes.lightLevel || 0,
            color: device.attributes.colorHue !== undefined ? {
              hue: device.attributes.colorHue,
              saturation: device.attributes.colorSaturation || 1
            } : undefined
          }
        };
        
        this.devices.set(device.id, deviceInfo);
        this.logger.info(`Added device: ${deviceInfo.name} (${device.id}) - Brightness: ${deviceInfo.capabilities.canChangeBrightness}, Color: ${deviceInfo.capabilities.canChangeColor}`);
      });
    } catch (error) {
      this.logger.error('Failed to discover devices:', error);
      throw error;
    }
  }

  async updateLights(update: LightUpdate): Promise<void> {
    if (!this.client) {
      throw new Error('DIRIGERA client not initialized');
    }

    // Silent - only show actual lamp commands

    // Queue commands to respect rate limits
    return this.commandQueue.add(async () => {
      const promises: Promise<any>[] = [];
      let commandCount = 0;
      
      for (const device of this.devices.values()) {
        try {
          // Skip offline/off devices
          if (!device.currentState.isOn) {
            this.logger.debug(`Skipping offline device: ${device.name} (${device.id})`);
            continue;
          }
          
          // Handle color updates - only for color-capable lights that are on
          if (update.color && device.capabilities.canChangeColor) {
            this.logger.error(`🚨 LAMP COMMAND: ${device.name} - setLightColor(hue=${update.color.hue}, sat=${update.color.saturation})`);
            promises.push(
              this.client!.lights.setLightColor({
                id: device.id,
                colorHue: Math.round(update.color.hue),
                colorSaturation: update.color.saturation,
                transitionTime: update.transitionTime || 100
              })
            );
            commandCount++;
          }
          
          // Handle brightness updates - for all lights that support brightness and are on
          if (update.brightness !== undefined && device.capabilities.canChangeBrightness) {
            const brightness = Math.round(Math.max(1, Math.min(100, update.brightness)));
            this.logger.error(`🚨 LAMP COMMAND: ${device.name} - setLightLevel(${brightness}%)`);
            promises.push(
              this.client!.lights.setLightLevel({
                id: device.id,
                lightLevel: brightness,
                transitionTime: update.transitionTime || 100
              })
            );
            commandCount++;
          }
        } catch (error) {
          this.logger.error(`Failed to prepare update for device ${device.id}:`, error);
        }
      }
      
      this.logger.info(`Sending ${commandCount} light commands to ${this.devices.size} devices`);
      const results = await Promise.allSettled(promises);
      
      let successCount = 0;
      let errorCount = 0;
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          errorCount++;
          this.logger.error(`Light command ${index} failed:`, result.reason);
        }
      });
      
      this.logger.info(`Light update complete: ${successCount} succeeded, ${errorCount} failed`);
    });
  }

  async executeCommand(command: LightCommand): Promise<void> {
    this.logger.info(`Executing command: ${command.type}`, command);
    
    try {
      switch (command.type) {
        case 'PULSE':
          await this.executePulseCommand(command);
          break;
        case 'SET_COLOR':
          if (command.color) {
            await this.updateLights({ color: command.color, transitionTime: command.transitionTime });
          }
          break;
        case 'SET_BRIGHTNESS':
          if (command.brightness !== undefined) {
            await this.updateLights({ brightness: command.brightness, transitionTime: command.transitionTime });
          }
          break;
        case 'STROBE':
          await this.executeStrobeCommand(command);
          break;
      }
      this.logger.info(`Command ${command.type} executed successfully`);
    } catch (error) {
      this.logger.error(`Failed to execute command ${command.type}:`, error);
      throw error;
    }
  }

  private async executePulseCommand(command: LightCommand): Promise<void> {
    if (command.brightness === undefined) {
      this.logger.warn('Pulse command missing brightness parameter');
      return;
    }
    
    const deviceCount = this.devices.size;
    this.logger.info(`Executing pulse command on ${deviceCount} devices with brightness ${command.brightness}`);
    
    if (deviceCount === 0) {
      this.logger.warn('No devices available for pulse command');
      return;
    }
    
    // Store current brightness
    const originalBrightness = Array.from(this.devices.values())[0]?.currentState.brightness || 50;
    this.logger.info(`Storing original brightness: ${originalBrightness}`);
    
    // Flash to new brightness
    this.logger.info(`Flashing lights to brightness: ${command.brightness}`);
    await this.updateLights({ 
      brightness: command.brightness, 
      transitionTime: command.transitionTime || 50 
    });
    
    // Return to previous brightness if specified
    if (command.returnToPrevious) {
      this.logger.info(`Will return to original brightness after ${command.returnDelay || 100}ms`);
      setTimeout(async () => {
        this.logger.info(`Returning lights to brightness: ${originalBrightness}`);
        await this.updateLights({ 
          brightness: originalBrightness, 
          transitionTime: command.transitionTime || 50 
        });
      }, command.returnDelay || 100);
    }
  }

  private async executeStrobeCommand(command: LightCommand): Promise<void> {
    const strobeCount = 10;
    const strobeDelay = 100;
    
    for (let i = 0; i < strobeCount; i++) {
      await this.updateLights({
        brightness: i % 2 === 0 ? 100 : 10,
        transitionTime: 0
      });
      await this.sleep(strobeDelay);
    }
  }

  private async authenticateWithButton(): Promise<string> {
    if (!this.client) {
      throw new Error('DIRIGERA client not initialized');
    }
    
    console.log('Press the action button on your DIRIGERA hub within 60 seconds...');
    try {
      const token = await this.client.authenticate();
      return token;
    } catch (error) {
      this.logger.error('Authentication failed:', error);
      throw error;
    }
  }

  private async saveToken(token: string): Promise<void> {
    // In a real implementation, save this token securely to a database or encrypted file
    this.logger.info('Token should be saved securely for future use');
    // For now, just log it (remove this in production!)
    this.logger.debug('Token:', token);
  }

  private handleDeviceUpdate(update: any): void {
    this.logger.debug('Device update received:', update);
    // Update local device cache
    if (update.id && this.devices.has(update.id)) {
      const device = this.devices.get(update.id)!;
      if (update.attributes) {
        device.currentState.isOn = update.attributes.isOn ?? device.currentState.isOn;
        device.currentState.brightness = update.attributes.lightLevel ?? device.currentState.brightness;
        if (update.attributes.colorHue !== undefined) {
          device.currentState.color = {
            hue: update.attributes.colorHue,
            saturation: update.attributes.colorSaturation || 1
          };
        }
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  async refreshDeviceStates(): Promise<void> {
    if (!this.client) {
      throw new Error('DIRIGERA client not initialized');
    }

    try {
      const currentDevices = await this.client.lights.list();
      
      // Update the state of each cached device
      currentDevices.forEach(currentDevice => {
        const cachedDevice = this.devices.get(currentDevice.id);
        if (cachedDevice) {
          // Update current state with fresh data from API
          cachedDevice.currentState.isOn = currentDevice.attributes.isOn || false;
          cachedDevice.currentState.brightness = currentDevice.attributes.lightLevel || 0;
          
          if (currentDevice.attributes.colorHue !== undefined) {
            cachedDevice.currentState.color = {
              hue: currentDevice.attributes.colorHue,
              saturation: currentDevice.attributes.colorSaturation || 1
            };
          }
        }
      });
      
      this.logger.info('Device states refreshed from DIRIGERA API');
    } catch (error) {
      this.logger.error('Failed to refresh device states:', error);
    }
  }

  isServiceConnected(): boolean {
    return this.isConnected && this.client !== null;
  }

  async updateSingleLight(update: { deviceId: string, color: any, brightness: number, transitionTime: number }): Promise<void> {
    if (!this.client) {
      throw new Error('DIRIGERA client not initialized');
    }

    const device = this.devices.get(update.deviceId);
    if (!device || !device.currentState.isOn) {
      return; // Skip offline devices
    }

    try {
      const promises: Promise<any>[] = [];
      
      // Set color if device supports it
      if (update.color && device.capabilities.canChangeColor) {
        this.logger.error(`🚨 LAMP COMMAND: ${device.name} - setLightColor(hue=${update.color.hue}, sat=${update.color.saturation})`);
        promises.push(
          this.client.lights.setLightColor({
            id: update.deviceId,
            colorHue: Math.round(update.color.hue),
            colorSaturation: update.color.saturation,
            transitionTime: update.transitionTime
          })
        );
      }
      
      // Set brightness if device supports it
      if (update.brightness && device.capabilities.canChangeBrightness) {
        const brightness = Math.round(Math.max(1, Math.min(100, update.brightness)));
        this.logger.error(`🚨 LAMP COMMAND: ${device.name} - setLightLevel(${brightness}%)`);
        promises.push(
          this.client.lights.setLightLevel({
            id: update.deviceId,
            lightLevel: brightness,
            transitionTime: update.transitionTime
          })
        );
      }

      await Promise.all(promises);
    } catch (error) {
      this.logger.error(`Failed to update single light ${device.name}:`, error);
    }
  }
}

// Command queue to handle rate limiting
class CommandQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private lastExecutionTime = 0;
  private minInterval: number;
  private logger: Logger;

  constructor(commandsPerSecond: number, logger: Logger) {
    this.minInterval = 1000 / commandsPerSecond;
    this.logger = logger;
  }

  async add(command: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          await command();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      
      if (!this.processing) {
        this.process();
      }
    });
  }

  private async process(): Promise<void> {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastExecution = now - this.lastExecutionTime;
      
      if (timeSinceLastExecution < this.minInterval) {
        await this.sleep(this.minInterval - timeSinceLastExecution);
      }
      
      const command = this.queue.shift();
      if (command) {
        try {
          await command();
          this.lastExecutionTime = Date.now();
        } catch (error) {
          this.logger.error('Command execution failed:', error);
        }
      }
    }
    
    this.processing = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}