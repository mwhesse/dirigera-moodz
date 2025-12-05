// Load environment variables FIRST via side-effect import
import './src/server/config/env';

import express, { Request, Response } from 'express';
import next from 'next';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { parse } from 'url';
import { WebSocketServer } from 'ws';
import path from 'path';

// Import existing services
import { logger } from './src/server/config/logger';
import { DirigeraService } from './src/server/services/DirigeraService';
import { SyncEngine } from './src/server/services/SyncEngine';
import { SceneEngine } from './src/server/services/SceneEngine';
import { LayoutService } from './src/server/services/LayoutService';
import { WebSocketServer as CustomWSServer } from './src/server/services/WebSocketServer'; // Renamed to avoid conflict
import { LightsController } from './src/server/controllers/LightsController';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const server = express();
  const httpServer = createServer(server);

  // Initialize Services
  logger.info('Initializing services...');
  
  const dirigeraService = new DirigeraService({
    accessToken: process.env.DIRIGERA_ACCESS_TOKEN,
    gatewayIP: process.env.DIRIGERA_GATEWAY_IP
  }, logger);

  const layoutService = LayoutService.getInstance();
  const syncEngine = new SyncEngine(dirigeraService, logger);
  const sceneEngine = new SceneEngine(dirigeraService, layoutService, logger);
  
  // We need to modify the CustomWSServer to accept an existing http server or port
  const wsServer = new CustomWSServer({ noServer: true }, syncEngine, dirigeraService, sceneEngine, logger);

  // Middleware
  server.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:"],
          connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"],
          mediaSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "blob:"],
          fontSrc: ["'self'", "data:"],
          upgradeInsecureRequests: null, // Disable auto-upgrade to HTTPS which breaks local LAN
        }
    }
  }));
  
  server.use(cors({
    origin: true, // Allow all for local dev
    credentials: true
  }));
  
  server.use(express.json({ limit: '10mb' }));
  server.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Routes (Legacy Controllers)
  const lightsController = new LightsController(dirigeraService, syncEngine, sceneEngine, logger);

  // Lights routes
  server.post('/api/lights/auth', lightsController.authenticateDirigera);
  server.get('/api/lights/status', lightsController.getStatus);
  server.get('/api/lights/discover', lightsController.discoverDevices);
  server.post('/api/lights/update', lightsController.updateLights);
  server.post('/api/lights/command', lightsController.executeCommand);
  server.get('/api/lights/sync/settings', lightsController.getSyncSettings);
  server.put('/api/lights/sync/settings', lightsController.updateSyncSettings);
  server.post('/api/lights/test', lightsController.testLights);
  server.post('/api/lights/test/stop', lightsController.stopTest);
  server.post('/api/lights/selection', lightsController.updateLightSelection);

  // Scene routes
  server.get('/api/scenes', lightsController.getScenes);
  server.put('/api/scenes/:id', lightsController.updateScene);
  server.post('/api/scenes/start', lightsController.startScene);
  server.post('/api/scenes/stop', lightsController.stopScene);

  // Layout routes
  server.get('/api/layout', lightsController.getLayout);
  server.post('/api/layout', lightsController.saveLayout);

  // WebSocket stats
  server.get('/api/websocket/stats', (req, res) => {
    res.json(wsServer.getStats());
  });

  // Next.js Handler
  server.all('*splat', (req: Request, res: Response) => {
    return handle(req, res);
  });

  httpServer.listen(port, '0.0.0.0', () => {
    logger.info(`> Ready on http://0.0.0.0:${port}`);
    logger.info(`> WebSocket Server attached to HTTP server`);
  });

  httpServer.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url || '', true);
    
    if (pathname === '/api/ws') {
        wsServer.handleUpgrade(request, socket, head);
        return;
    }
    
    // For Next.js HMR, we let it fall through (Next.js attaches its own upgrade handler)
    // If we don't handle it, and Next.js is attached, it should be fine.
  });
});
