
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../config/logger';

interface LightPosition {
  id: string;
  x: number;
  y: number;
}

interface Wall {
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

const DATA_FILE = path.join(process.cwd(), 'data', 'layout.json');

export class LayoutService {
  private layout: LayoutData = { lights: [], walls: [] };
  private static instance: LayoutService;

  private constructor() {
    this.loadLayout();
  }

  public static getInstance(): LayoutService {
    if (!LayoutService.instance) {
      LayoutService.instance = new LayoutService();
    }
    return LayoutService.instance;
  }

  private async loadLayout() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(DATA_FILE);
      try {
        await fs.access(dataDir);
      } catch {
        await fs.mkdir(dataDir, { recursive: true });
      }

      try {
        const data = await fs.readFile(DATA_FILE, 'utf-8');
        this.layout = JSON.parse(data);
      } catch (error) {
        // File doesn't exist or is invalid, start with empty
        logger.info('No layout file found or invalid, starting with empty layout.');
        this.layout = { lights: [], walls: [] };
      }
    } catch (error) {
      logger.error('Failed to load layout:', error);
    }
  }

  public async saveLayout(layout: LayoutData): Promise<void> {
    this.layout = layout;
    try {
      await fs.writeFile(DATA_FILE, JSON.stringify(layout, null, 2));
      logger.info('Layout saved successfully');
    } catch (error) {
      logger.error('Failed to save layout:', error);
      throw error;
    }
  }

  public getLayout(): LayoutData {
    return this.layout;
  }
}
