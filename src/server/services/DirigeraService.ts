import { createDirigeraClient, DirigeraClient } from 'dirigera';
import { Device, DirigeraConfig, LightUpdate, LightCommand, ScheduledCommand } from '../types';
import { Logger } from 'winston';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

const TOKEN_FILE = path.join(process.cwd(), '.dirigera_token');
const SELECTION_FILE = path.join(process.cwd(), '.dirigera_selection.json');

export class DirigeraService extends EventEmitter {
  private client: DirigeraClient | null = null;
  private devices: Map<string, Device> = new Map();
  private selectedDeviceIds: Set<string> = new Set();
  private commandQueue: CommandQueue;
  private logger: Logger;
  private isConnected = false;
  private config: DirigeraConfig;

  constructor(config: DirigeraConfig, logger: Logger) {
    super();
    this.logger = logger;
    this.config = config;
    this.commandQueue = new CommandQueue(10, logger); // 10 commands/second limit
    this.loadSelection();
    this.initialize(config);
  }

  private loadSelection(): void {
    try {
      if (fs.existsSync(SELECTION_FILE)) {
        const data = fs.readFileSync(SELECTION_FILE, 'utf-8');
        const ids = JSON.parse(data);
        if (Array.isArray(ids)) {
          this.selectedDeviceIds = new Set(ids);
          this.logger.info(`Loaded ${this.selectedDeviceIds.size} selected devices from file`);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to load device selection file:', error);
    }
  }

  private saveSelection(): void {
    try {
      const ids = Array.from(this.selectedDeviceIds);
      fs.writeFileSync(SELECTION_FILE, JSON.stringify(ids), 'utf-8');
      this.logger.info('Saved device selection to file');
    } catch (error) {
      this.logger.error('Failed to save device selection to file:', error);
    }
  }

  async initialize(config: DirigeraConfig): Promise<void> {
    try {
      let token = config.accessToken;

      // If no token in config, try loading from file
      if (!token) {
        try {
          if (fs.existsSync(TOKEN_FILE)) {
            token = fs.readFileSync(TOKEN_FILE, 'utf-8').trim();
            this.logger.info('Loaded DIRIGERA token from file');
          }
        } catch (err) {
          this.logger.warn('Failed to read token file:', err);
        }
      }

      if (token) {
        this.logger.info('Using provided access token');
        this.client = await createDirigeraClient({
          accessToken: token,
          gatewayIP: config.gatewayIP === 'auto' ? undefined : config.gatewayIP
        });
        
        // Discover and cache all TRADFRI lights
        await this.discoverDevices();
        
        // Start listening for device updates
        if (this.client) {
          this.client.startListeningForUpdates(this.handleDeviceUpdate.bind(this));
        }
        
        this.isConnected = true;
        this.startConnectionHealthCheck();
        this.logger.info('DIRIGERA service initialized successfully');
      } else {
        this.logger.warn('No access token found. Please authenticate via the web interface.');
        this.isConnected = false;
      }
    } catch (error) {
      this.logger.error('Failed to initialize DIRIGERA service:', error);
      // Don't throw, just leave service in disconnected state
    }
  }

  private startConnectionHealthCheck(): void {
    // Clear any existing interval
    if ((this as any).healthCheckInterval) {
      clearInterval((this as any).healthCheckInterval);
    }

    // Check connection every 60 seconds
    (this as any).healthCheckInterval = setInterval(async () => {
      if (!this.client) return;

      try {
        // Simple ping by fetching home info
        await this.client.home();
      } catch (error) {
        this.logger.warn('Connection health check failed, attempting reconnection:', error);
        this.isConnected = false;
        await this.initialize(this.config);
      }
    }, 60000);
  }

  public async authenticateWithButton(): Promise<string> {
    this.logger.info('Starting authentication flow...');
    
    try {
      // Create a temporary client for authentication
      const authClient = await createDirigeraClient({
        gatewayIP: this.config.gatewayIP === 'auto' ? undefined : this.config.gatewayIP
      });

      const token = await authClient.authenticate();
      this.logger.info('Authentication successful, token obtained');
      
      // Save token
      await this.saveToken(token);

      // Re-initialize with new token
      this.client = await createDirigeraClient({
        accessToken: token,
        gatewayIP: this.config.gatewayIP === 'auto' ? undefined : this.config.gatewayIP
      });

      // Setup after successful auth
      await this.discoverDevices();
      this.client.startListeningForUpdates(this.handleDeviceUpdate.bind(this));
      this.isConnected = true;

      return token;
    } catch (error) {
      this.logger.error('Authentication failed:', error);
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
      
      devices.forEach(d => {
        const device = d as any;
        
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
                               (device.attributes.lightLevel !== undefined),
            // For TRADFRI lights, assume they support color if they have colorHue
            canChangeColor: device.capabilities?.canChangeColor ?? 
                           ((device.attributes.colorHue !== undefined) || 
                           (device.deviceType === 'light' && isColorLight)),
            colorTemperatureRange: device.capabilities?.colorTemperatureRange
          },
          currentState: {
            isOn: device.attributes.isOn || false,
            brightness: device.attributes.lightLevel || 0,
            color: device.attributes.colorHue !== undefined ? {
              hue: device.attributes.colorHue,
              saturation: device.attributes.colorSaturation || 1
            } : undefined
          },
          // Check if ID is in selected set. If set is empty (first run ever), default to true, 
          // otherwise respect the set (if a device is new/unknown, maybe default to true? 
          // Let's stick to: if in set OR set is empty, true. If set has items but not this one, false.)
          // Actually, simpler: if we have a file, we trust it. If we don't (set empty), we default all to true and save.
          isSelected: this.selectedDeviceIds.size === 0 ? true : this.selectedDeviceIds.has(device.id)
        };
        
        if (deviceInfo.isSelected) {
            this.selectedDeviceIds.add(device.id);
        }

        this.devices.set(device.id, deviceInfo);
        this.logger.info(`Added device: ${deviceInfo.name} (${device.id}) - Brightness: ${deviceInfo.capabilities.canChangeBrightness}, Color: ${deviceInfo.capabilities.canChangeColor}`);
      });
      
      // If we just populated the set for the first time, save it
      if (this.selectedDeviceIds.size > 0 && !fs.existsSync(SELECTION_FILE)) {
        this.saveSelection();
      }

    } catch (error) {
      this.logger.error('Failed to discover devices:', error);
      throw error;
    }
  }

  async updateLights(update: LightUpdate): Promise<void> {
    if (!this.client) {
      // If not connected, just return silently or log debug
      this.logger.debug('Cannot update lights: DIRIGERA client not initialized');
      return;
    }

    // Optimistic update: Update local state and emit event immediately
    const updatedDevices: Device[] = [];
    this.devices.forEach(device => {
      if (!device.isSelected) return;
      if (!device.currentState.isOn && update.isOn !== true) return;

      let hasChanges = false;
      if (update.isOn !== undefined) {
        device.currentState.isOn = update.isOn;
        hasChanges = true;
      }
      if (update.color && device.capabilities.canChangeColor) {
        device.currentState.color = {
          hue: update.color.hue,
          saturation: update.color.saturation
        };
        hasChanges = true;
      }
      if (update.brightness !== undefined && device.capabilities.canChangeBrightness) {
        device.currentState.brightness = update.brightness;
        hasChanges = true;
      }

      if (hasChanges) {
        updatedDevices.push(device);
      }
    });

    if (updatedDevices.length > 0) {
      this.emit('devicesUpdate', updatedDevices);
    }

    // Silent - only show actual lamp commands

    // Queue commands to respect rate limits
    return this.commandQueue.add(async () => {
      const promises: Promise<any>[] = [];
      let commandCount = 0;
      
      for (const device of this.devices.values()) {
        try {
          // Only control selected devices
          if (!device.isSelected) {
            continue;
          }

          // Skip offline/off devices unless we are explicitly turning them on
          if (!device.currentState.isOn && update.isOn !== true) {
            this.logger.debug(`Skipping offline device: ${device.name} (${device.id})`);
            continue;
          }

          // Handle isOn updates
          if (update.isOn !== undefined) {
            this.logger.debug(`🚨 LAMP COMMAND: ${device.name} - setIsOn(${update.isOn})`);
            promises.push(
              this.client!.lights.setIsOn({
                id: device.id,
                isOn: update.isOn
              })
            );
            commandCount++;
          }
          
          // Handle color updates - only for color-capable lights that are on (or being turned on)
          if (update.color && device.capabilities.canChangeColor) {
            this.logger.debug(`🚨 LAMP COMMAND: ${device.name} - setLightColor(hue=${update.color.hue}, sat=${update.color.saturation})`);
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
            this.logger.debug(`🚨 LAMP COMMAND: ${device.name} - setLightLevel(${brightness}%)`);
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
          this.logger.error(`Light command ${index} failed:`, (result.reason as any)?.message || String(result.reason));
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

  private async saveToken(token: string): Promise<void> {
    try {
      fs.writeFileSync(TOKEN_FILE, token, 'utf-8');
      this.logger.info(`Token saved to ${TOKEN_FILE}`);
    } catch (error) {
      this.logger.error('Failed to save token to file:', error);
    }
  }

  private handleDeviceUpdate(update: any): void {
    // this.logger.debug('Device update received:', update);
    // Update local device cache
    if (update.id && this.devices.has(update.id)) {
      const device = this.devices.get(update.id)!;
      let hasChanges = false;

      if (update.attributes) {
        if (update.attributes.isOn !== undefined && update.attributes.isOn !== device.currentState.isOn) {
           device.currentState.isOn = update.attributes.isOn;
           hasChanges = true;
        }
        if (update.attributes.lightLevel !== undefined && update.attributes.lightLevel !== device.currentState.brightness) {
           device.currentState.brightness = update.attributes.lightLevel;
           hasChanges = true;
        }
        if (update.attributes.colorHue !== undefined) {
           device.currentState.color = {
            hue: update.attributes.colorHue,
            saturation: update.attributes.colorSaturation || 1
          };
          hasChanges = true;
        }
      }

      if (hasChanges) {
        this.emit('deviceUpdate', device);
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
      // Not connected
      return;
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
          // isSelected is not overwritten as it's not in the API response
        } else {
          // New device found during refresh
          // (Similar logic to discoverDevices but for single device)
          // For simplicity, we can re-discover or ignore. 
          // Since discoverDevices initializes the map, we're good for now.
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

  async updateLightsBatch(updates: { deviceId: string, color?: any, brightness?: number, transitionTime?: number }[]): Promise<void> {
    if (!this.client) {
      // Not connected
      return;
    }

    // Optimistic update
    const updatedDevices: Device[] = [];
    updates.forEach(update => {
      const device = this.devices.get(update.deviceId);
      if (!device || !device.isSelected || !device.currentState.isOn) return;

      let hasChanges = false;
      if (update.color && device.capabilities.canChangeColor) {
         device.currentState.color = {
            hue: update.color.hue,
            saturation: update.color.saturation
         };
         hasChanges = true;
      }
      if (update.brightness !== undefined && device.capabilities.canChangeBrightness) {
        device.currentState.brightness = update.brightness;
        hasChanges = true;
      }
      
      if (hasChanges) {
        updatedDevices.push(device);
      }
    });

    if (updatedDevices.length > 0) {
      this.emit('devicesUpdate', updatedDevices);
    }

    return this.commandQueue.add(async () => {
      const promises: Promise<any>[] = [];
      
      for (const update of updates) {
        const device = this.devices.get(update.deviceId);
        // Skip if device not found or not selected
        if (!device || !device.isSelected || !device.currentState.isOn) continue;

        try {
          if (update.color && device.capabilities.canChangeColor) {
            promises.push(this.client!.lights.setLightColor({
              id: update.deviceId,
              colorHue: Math.round(update.color.hue),
              colorSaturation: update.color.saturation,
              transitionTime: update.transitionTime
            }));
          }
          
          if (update.brightness !== undefined && device.capabilities.canChangeBrightness) {
            const brightness = Math.round(Math.max(1, Math.min(100, update.brightness)));
            promises.push(this.client!.lights.setLightLevel({
              id: update.deviceId,
              lightLevel: brightness,
              transitionTime: update.transitionTime
            }));
          }
        } catch (error) {
          this.logger.error(`Failed to prepare batch update for device ${update.deviceId}:`, error);
        }
      }
      
      if (promises.length > 0) {
        await Promise.allSettled(promises);
      }
    });
  }

  async updateSingleLight(update: { deviceId: string, color: any, brightness: number, transitionTime: number }): Promise<void> {
    if (!this.client) {
      throw new Error('DIRIGERA client not initialized');
    }

    const device = this.devices.get(update.deviceId);
    if (!device || !device.currentState.isOn) {
      return; // Skip offline devices
    }

    // Optimistic update
    let hasChanges = false;
    if (update.color && device.capabilities.canChangeColor) {
        device.currentState.color = {
          hue: update.color.hue,
          saturation: update.color.saturation
        };
        hasChanges = true;
    }
    if (update.brightness && device.capabilities.canChangeBrightness) {
        device.currentState.brightness = update.brightness;
        hasChanges = true;
    }
    if (hasChanges) {
      this.emit('deviceUpdate', device);
    }

    return this.commandQueue.add(async () => {
      try {
        const promises: Promise<any>[] = [];
        
        // Set color if device supports it
        if (update.color && device.capabilities.canChangeColor) {
          this.logger.debug(`🚨 LAMP COMMAND: ${device.name} - setLightColor(hue=${update.color.hue}, sat=${update.color.saturation})`);
          promises.push(
            this.client!.lights.setLightColor({
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
          this.logger.debug(`🚨 LAMP COMMAND: ${device.name} - setLightLevel(${brightness}%)`);
          promises.push(
            this.client!.lights.setLightLevel({
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
    });
  }

  toggleDeviceSelection(deviceId: string, isSelected: boolean): void {
    const device = this.devices.get(deviceId);
    if (device) {
      device.isSelected = isSelected;
      
      if (isSelected) {
        this.selectedDeviceIds.add(deviceId);
      } else {
        this.selectedDeviceIds.delete(deviceId);
      }
      
      this.saveSelection();
      this.logger.info(`Device ${device.name} selection updated to: ${isSelected}`);
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