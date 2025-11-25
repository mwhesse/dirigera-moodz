import express, { Request, Response } from 'express';
import next from 'next';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { parse } from 'url';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import path from 'path';

// Import existing services
import { logger } from './src/server/config/logger';
import { DirigeraService } from './src/server/services/DirigeraService';
import { SyncEngine } from './src/server/services/SyncEngine';
import { SceneEngine } from './src/server/services/SceneEngine';
import { WebSocketServer as CustomWSServer } from './src/server/services/WebSocketServer'; // Renamed to avoid conflict
import { LightsController } from './src/server/controllers/LightsController';

dotenv.config();

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

  const syncEngine = new SyncEngine(dirigeraService, logger);
  const sceneEngine = new SceneEngine(dirigeraService, logger);
  
  // We need to modify the CustomWSServer to accept an existing http server or port
  // For now, let's keep it on a separate port if the original code demands it, 
  // OR we can instantiate it with the httpServer if we refactor.
  // Looking at the original code, it takes a 'port'. 
  // Let's run it on 8080 as before to minimize friction, or refactor.
  // Refactoring to same port is better for "Single App".
  // But the CustomWSServer implementation creates its own new WebSocket.Server({ port }).
  // Let's run it on the separate port for now to ensure stability.
  const wsPort = parseInt(process.env.WS_PORT || '8080', 10);
  const wsServer = new CustomWSServer(wsPort, syncEngine, logger);

  // Middleware
  server.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false // Let Next.js handle CSP or configure carefully
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
  server.post('/api/lights/selection', lightsController.updateLightSelection);

  // Scene routes
  server.get('/api/scenes', lightsController.getScenes);
  server.put('/api/scenes/:id', lightsController.updateScene);
  server.post('/api/scenes/start', lightsController.startScene);
  server.post('/api/scenes/stop', lightsController.stopScene);

  // WebSocket stats
  server.get('/api/websocket/stats', (req, res) => {
    res.json(wsServer.getStats());
  });

  // Next.js Handler
  server.all('*splat', (req: Request, res: Response) => {
    return handle(req, res);
  });

  httpServer.listen(port, () => {
    logger.info(`> Ready on http://localhost:${port}`);
    logger.info(`> WebSocket Server on port ${wsPort}`);
  });
});
