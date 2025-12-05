import { Request, Response } from 'express';
import { DirigeraService } from '../services/DirigeraService';
import { SyncEngine } from '../services/SyncEngine';
import { SceneEngine } from '../services/SceneEngine';
import { LayoutService } from '../services/LayoutService';
import { SCENE_PRESETS } from '../config/scenes';
import { Logger } from 'winston';

export class LightsController {
  private dirigeraService: DirigeraService;
  private syncEngine: SyncEngine;
  private sceneEngine: SceneEngine;
  private layoutService: LayoutService;
  private logger: Logger;
  private isTestRunning: boolean = false;

  constructor(dirigeraService: DirigeraService, syncEngine: SyncEngine, sceneEngine: SceneEngine, logger: Logger) {
    this.dirigeraService = dirigeraService;
    this.syncEngine = syncEngine;
    this.sceneEngine = sceneEngine;
    this.layoutService = LayoutService.getInstance();
    this.logger = logger;
  }

  // GET /api/layout
  getLayout = async (req: Request, res: Response): Promise<void> => {
    try {
      const layout = this.layoutService.getLayout();
      res.json(layout);
    } catch (error) {
      this.logger.error('Error getting layout:', error);
      res.status(500).json({ error: 'Failed to get layout' });
    }
  };

  // POST /api/layout
  saveLayout = async (req: Request, res: Response): Promise<void> => {
    try {
      const layout = req.body;
      await this.layoutService.saveLayout(layout);
      res.json({ success: true });
    } catch (error) {
      this.logger.error('Error saving layout:', error);
      res.status(500).json({ error: 'Failed to save layout' });
    }
  };

  // POST /api/lights/auth
  authenticateDirigera = async (req: Request, res: Response): Promise<void> => {
    try {
      this.logger.info('Authentication request received. Waiting for button press...');
      
      // Call the service to start authentication
      // This will block until the button is pressed on the hub
      const token = await this.dirigeraService.authenticateWithButton();
      
      res.json({
        success: true,
        message: 'Authentication successful',
        // We don't necessarily need to send the token back if it's saved on server,
        // but it confirms success.
      });
    } catch (error) {
      this.logger.error('Authentication failed:', error);
      res.status(500).json({ 
        error: 'Authentication failed',
        details: error instanceof Error ? error.message : 'Unknown error. Make sure to press the button on the hub.'
      });
    }
  };

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
          currentState: device.currentState,
          isSelected: (device as any).isSelected ?? true
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
          currentState: device.currentState,
          isSelected: (device as any).isSelected ?? true
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
      // Manual control or external update overrides scenes
      this.sceneEngine.stop();

      const { color, brightness, transitionTime, isOn } = req.body;

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

      if (isOn !== undefined && typeof isOn !== 'boolean') {
        res.status(400).json({ 
          error: 'isOn must be a boolean.' 
        });
        return;
      }

      await this.dirigeraService.updateLights({
        color,
        brightness,
        transitionTime,
        isOn
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
      // Manual command overrides scenes
      this.sceneEngine.stop();

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

      // Update selection for all devices
      const allDevices = this.dirigeraService.getDevices();
      allDevices.forEach(device => {
        const isSelected = selectedLights.includes(device.id);
        this.dirigeraService.toggleDeviceSelection(device.id, isSelected);
      });

      this.logger.info(`Light selection updated: ${selectedLights.length} lights selected`);

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
      this.logger.info(`Starting test: ${req.body.testType}`);
      this.sceneEngine.stop(); // Stop any scenes
      this.isTestRunning = true;
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

      this.logger.info(`Test ${testType} completed naturally.`);
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
    } finally {
      this.isTestRunning = false;
    }
  };

  // POST /api/lights/test/stop
  stopTest = async (req: Request, res: Response): Promise<void> => {
    try {
      this.logger.info('Received stop test request');
      this.isTestRunning = false;
      this.sceneEngine.stop(); // Also ensure scenes are stopped
      
      // Reset lights to neutral state
      await this.dirigeraService.updateLights({
        color: { hue: 60, saturation: 0.1 },
        brightness: 50,
        transitionTime: 500
      });

      this.logger.info('Test stopped successfully');
      res.json({
        success: true,
        message: 'Test stopped'
      });
    } catch (error) {
      this.logger.error('Error stopping test:', error);
      res.status(500).json({ 
        error: 'Failed to stop test',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // --- Scenes API ---

  // GET /api/scenes
  getScenes = async (req: Request, res: Response): Promise<void> => {
    try {
      const currentScene = this.sceneEngine.getCurrentScene();
      res.json({
        success: true,
        scenes: this.sceneEngine.getAllScenes(),
        currentSceneId: currentScene ? currentScene.id : null
      });
    } catch (error) {
      this.logger.error('Error getting scenes:', error);
      res.status(500).json({ error: 'Failed to get scenes' });
    }
  };

  // PUT /api/scenes/:id
  updateScene = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { transitionSpeed, brightness } = req.body;

      if (!id) {
        res.status(400).json({ error: 'Scene ID is required' });
        return;
      }

      const updates: any = {};
      if (transitionSpeed !== undefined) updates.transitionSpeed = transitionSpeed;
      if (brightness !== undefined) updates.brightness = brightness;

      const updatedScene = this.sceneEngine.updateScene(id, updates);

      if (!updatedScene) {
        res.status(404).json({ error: 'Scene not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Scene updated',
        scene: updatedScene
      });
    } catch (error) {
      this.logger.error('Error updating scene:', error);
      res.status(500).json({ error: 'Failed to update scene' });
    }
  };

  // POST /api/scenes/start
  startScene = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sceneId } = req.body;
      if (!sceneId) {
        res.status(400).json({ error: 'sceneId is required' });
        return;
      }

      const success = this.sceneEngine.startScene(sceneId);
      if (!success) {
        res.status(404).json({ error: 'Scene not found' });
        return;
      }

      res.json({
        success: true,
        message: `Scene ${sceneId} started`,
        currentSceneId: sceneId
      });
    } catch (error) {
      this.logger.error('Error starting scene:', error);
      res.status(500).json({ error: 'Failed to start scene' });
    }
  };

  // POST /api/scenes/stop
  stopScene = async (req: Request, res: Response): Promise<void> => {
    try {
      this.sceneEngine.stop();
      res.json({
        success: true,
        message: 'Scene stopped'
      });
    } catch (error) {
      this.logger.error('Error stopping scene:', error);
      res.status(500).json({ error: 'Failed to stop scene' });
    }
  };

  private async runRainbowTest(): Promise<void> {
    this.logger.info('Running rainbow test...');
    
    for (let hue = 0; hue < 360; hue += 30) {
      if (!this.isTestRunning) {
        this.logger.info('Rainbow test interrupted by stop flag.');
        break;
      }
      await this.dirigeraService.updateLights({
        color: { hue, saturation: 1 },
        brightness: 80,
        transitionTime: 200
      });
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Return to neutral
    if (this.isTestRunning) { // Only reset if not stopped (stopTest handles its own reset)
       await this.dirigeraService.updateLights({
        color: { hue: 60, saturation: 0.3 },
        brightness: 50,
        transitionTime: 500
      });
    }
  }

  private async runPulseTest(): Promise<void> {
    this.logger.info('Running pulse test...');
    
    for (let i = 0; i < 5; i++) {
      if (!this.isTestRunning) break;
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