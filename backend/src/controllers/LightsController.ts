import { Request, Response } from 'express';
import { DirigeraService } from '../services/DirigeraService';
import { SyncEngine } from '../services/SyncEngine';
import { Logger } from 'winston';

export class LightsController {
  private dirigeraService: DirigeraService;
  private syncEngine: SyncEngine;
  private logger: Logger;

  constructor(dirigeraService: DirigeraService, syncEngine: SyncEngine, logger: Logger) {
    this.dirigeraService = dirigeraService;
    this.syncEngine = syncEngine;
    this.logger = logger;
  }

  // GET /api/lights/status
  getStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const isConnected = this.dirigeraService.isServiceConnected();
      const devices = this.dirigeraService.getDevices();
      
      res.json({
        isConnected,
        deviceCount: devices.length,
        devices: devices.map(device => ({
          id: device.id,
          name: device.name,
          capabilities: device.capabilities,
          currentState: device.currentState
        }))
      });
    } catch (error) {
      this.logger.error('Error getting lights status:', error);
      res.status(500).json({ 
        error: 'Failed to get lights status' 
      });
    }
  };

  // GET /api/lights/discover
  discoverDevices = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.dirigeraService.discoverDevices();
      const devices = this.dirigeraService.getDevices();
      
      this.logger.info(`Device discovery completed. Found ${devices.length} devices.`);
      
      res.json({
        success: true,
        deviceCount: devices.length,
        devices: devices.map(device => ({
          id: device.id,
          name: device.name,
          capabilities: device.capabilities,
          currentState: device.currentState
        }))
      });
    } catch (error) {
      this.logger.error('Error discovering devices:', error);
      res.status(500).json({ 
        error: 'Failed to discover devices',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // POST /api/lights/update
  updateLights = async (req: Request, res: Response): Promise<void> => {
    try {
      const { color, brightness, transitionTime } = req.body;

      // Validate input
      if (color) {
        if (typeof color.hue !== 'number' || color.hue < 0 || color.hue >= 360) {
          res.status(400).json({ 
            error: 'Invalid hue value. Must be between 0 and 359.' 
          });
          return;
        }
        
        if (typeof color.saturation !== 'number' || color.saturation < 0 || color.saturation > 1) {
          res.status(400).json({ 
            error: 'Invalid saturation value. Must be between 0 and 1.' 
          });
          return;
        }
      }

      if (brightness !== undefined) {
        if (typeof brightness !== 'number' || brightness < 1 || brightness > 100) {
          res.status(400).json({ 
            error: 'Invalid brightness value. Must be between 1 and 100.' 
          });
          return;
        }
      }

      await this.dirigeraService.updateLights({
        color,
        brightness,
        transitionTime
      });

      res.json({
        success: true,
        message: 'Lights updated successfully'
      });
    } catch (error) {
      this.logger.error('Error updating lights:', error);
      res.status(500).json({ 
        error: 'Failed to update lights',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // POST /api/lights/command
  executeCommand = async (req: Request, res: Response): Promise<void> => {
    try {
      const { command } = req.body;

      if (!command || !command.type) {
        res.status(400).json({ 
          error: 'Command with type is required' 
        });
        return;
      }

      const validCommands = ['PULSE', 'SET_COLOR', 'SET_BRIGHTNESS', 'STROBE'];
      if (!validCommands.includes(command.type)) {
        res.status(400).json({ 
          error: `Invalid command type. Must be one of: ${validCommands.join(', ')}` 
        });
        return;
      }

      await this.dirigeraService.executeCommand(command);

      res.json({
        success: true,
        message: `Command ${command.type} executed successfully`
      });
    } catch (error) {
      this.logger.error('Error executing light command:', error);
      res.status(500).json({ 
        error: 'Failed to execute command',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // GET /api/lights/sync/settings
  getSyncSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const settings = this.syncEngine.getSettings();
      
      res.json({
        success: true,
        settings
      });
    } catch (error) {
      this.logger.error('Error getting sync settings:', error);
      res.status(500).json({ 
        error: 'Failed to get sync settings' 
      });
    }
  };

  // PUT /api/lights/sync/settings
  updateSyncSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const settings = req.body;

      // Validate settings
      if (settings.sensitivity !== undefined) {
        if (typeof settings.sensitivity !== 'number' || settings.sensitivity < 0 || settings.sensitivity > 1) {
          res.status(400).json({ 
            error: 'Sensitivity must be between 0 and 1' 
          });
          return;
        }
      }

      if (settings.colorMode !== undefined) {
        if (!['frequency', 'mood', 'random'].includes(settings.colorMode)) {
          res.status(400).json({ 
            error: 'Color mode must be frequency, mood, or random' 
          });
          return;
        }
      }

      if (settings.effectIntensity !== undefined) {
        if (typeof settings.effectIntensity !== 'number' || settings.effectIntensity < 0 || settings.effectIntensity > 1) {
          res.status(400).json({ 
            error: 'Effect intensity must be between 0 and 1' 
          });
          return;
        }
      }

      if (settings.beatDetectionThreshold !== undefined) {
        if (typeof settings.beatDetectionThreshold !== 'number' || settings.beatDetectionThreshold < 0 || settings.beatDetectionThreshold > 1) {
          res.status(400).json({ 
            error: 'Beat detection threshold must be between 0 and 1' 
          });
          return;
        }
      }

      this.syncEngine.updateSettings(settings);
      const updatedSettings = this.syncEngine.getSettings();

      res.json({
        success: true,
        message: 'Sync settings updated successfully',
        settings: updatedSettings
      });
    } catch (error) {
      this.logger.error('Error updating sync settings:', error);
      res.status(500).json({ 
        error: 'Failed to update sync settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // POST /api/lights/selection
  updateLightSelection = async (req: Request, res: Response): Promise<void> => {
    try {
      const { selectedLights } = req.body;

      if (!Array.isArray(selectedLights)) {
        res.status(400).json({ 
          error: 'selectedLights must be an array of light IDs' 
        });
        return;
      }

      // Store selected lights in sync engine or service
      // For now, we'll add this to SyncEngine
      // this.syncEngine.setSelectedLights(selectedLights);

      this.logger.info(`Light selection updated: ${selectedLights.length} lights selected`);
      selectedLights.forEach(id => {
        const device = this.dirigeraService.getDevices().find(d => d.id === id);
        if (device) {
          this.logger.info(`✅ Selected: ${device.name}`);
        }
      });

      res.json({
        success: true,
        message: `${selectedLights.length} lights selected`,
        selectedLights
      });
    } catch (error) {
      this.logger.error('Error updating light selection:', error);
      res.status(500).json({ 
        error: 'Failed to update light selection',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // POST /api/lights/test
  testLights = async (req: Request, res: Response): Promise<void> => {
    try {
      const { testType } = req.body;

      switch (testType) {
        case 'rainbow':
          await this.runRainbowTest();
          break;
        case 'pulse':
          await this.runPulseTest();
          break;
        case 'strobe':
          await this.runStrobeTest();
          break;
        default:
          res.status(400).json({ 
            error: 'Invalid test type. Options: rainbow, pulse, strobe' 
          });
          return;
      }

      res.json({
        success: true,
        message: `${testType} test completed successfully`
      });
    } catch (error) {
      this.logger.error(`Error running ${req.body.testType} test:`, error);
      res.status(500).json({ 
        error: `Failed to run ${req.body.testType} test`,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  private async runRainbowTest(): Promise<void> {
    this.logger.info('Running rainbow test...');
    
    for (let hue = 0; hue < 360; hue += 30) {
      await this.dirigeraService.updateLights({
        color: { hue, saturation: 1 },
        brightness: 80,
        transitionTime: 200
      });
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Return to neutral
    await this.dirigeraService.updateLights({
      color: { hue: 60, saturation: 0.3 },
      brightness: 50,
      transitionTime: 500
    });
  }

  private async runPulseTest(): Promise<void> {
    this.logger.info('Running pulse test...');
    
    for (let i = 0; i < 5; i++) {
      await this.dirigeraService.executeCommand({
        type: 'PULSE',
        brightness: 100,
        transitionTime: 100,
        returnToPrevious: true,
        returnDelay: 200
      });
      await new Promise(resolve => setTimeout(resolve, 400));
    }
  }

  private async runStrobeTest(): Promise<void> {
    this.logger.info('Running strobe test...');
    
    await this.dirigeraService.executeCommand({
      type: 'STROBE'
    });
  }
}