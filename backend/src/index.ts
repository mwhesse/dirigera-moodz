import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { logger } from './config/logger';
import { DirigeraService } from './services/DirigeraService';
import { SpotifyService } from './services/SpotifyService';
import { SyncEngine } from './services/SyncEngine';
import { WebSocketServer } from './services/WebSocketServer';
import { SpotifyController } from './controllers/SpotifyController';
import { LightsController } from './controllers/LightsController';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'SPOTIFY_CLIENT_ID',
  'SPOTIFY_CLIENT_SECRET', 
  'SPOTIFY_REDIRECT_URI'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

class Server {
  private app: express.Application;
  private dirigeraService: DirigeraService;
  private spotifyService: SpotifyService;
  private syncEngine: SyncEngine;
  private wsServer: WebSocketServer;
  private port: number;
  private wsPort: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3001', 10);
    this.wsPort = parseInt(process.env.WS_PORT || '8080', 10);
    
    this.setupMiddleware();
    this.initializeServices();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "https://sdk.scdn.co"],
          connectSrc: ["'self'", "ws://localhost:8080", "wss://localhost:8080", "https://api.spotify.com"],
          mediaSrc: ["'self'", "https://p.scdn.co"],
          imgSrc: ["'self'", "data:", "https://i.scdn.co"]
        }
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://127.0.0.1:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use('/api/', limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      next();
    });

    // Add request ID for tracking
    this.app.use((req, res, next) => {
      req.id = Math.random().toString(36).substring(7);
      next();
    });
  }

  private async initializeServices(): Promise<void> {
    try {
      logger.info('Initializing services...');

      // Initialize DIRIGERA service
      this.dirigeraService = new DirigeraService({
        accessToken: process.env.DIRIGERA_ACCESS_TOKEN,
        gatewayIP: process.env.DIRIGERA_GATEWAY_IP
      }, logger);

      // Initialize Spotify service
      this.spotifyService = new SpotifyService({
        clientId: process.env.SPOTIFY_CLIENT_ID!,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
        redirectUri: process.env.SPOTIFY_REDIRECT_URI!
      }, logger);

      // Initialize sync engine
      this.syncEngine = new SyncEngine(this.dirigeraService, logger);

      // Initialize WebSocket server
      this.wsServer = new WebSocketServer(this.wsPort, this.syncEngine, logger);

      logger.info('All services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // Initialize controllers
    const spotifyController = new SpotifyController(this.spotifyService, logger);
    const lightsController = new LightsController(this.dirigeraService, this.syncEngine, logger);

    // Spotify routes
    this.app.get('/api/spotify/auth', spotifyController.getAuthUrl);
    this.app.get('/api/spotify/callback', spotifyController.handleCallback);
    this.app.post('/api/spotify/refresh', spotifyController.refreshToken);
    this.app.get('/api/spotify/playback', spotifyController.getPlaybackState);
    this.app.get('/api/spotify/profile', spotifyController.getUserProfile);
    this.app.put('/api/spotify/transfer', spotifyController.transferPlayback);
    this.app.post('/api/spotify/control', spotifyController.controlPlayback);

    // Lights routes
    this.app.get('/api/lights/status', lightsController.getStatus);
    this.app.get('/api/lights/discover', lightsController.discoverDevices);
    this.app.post('/api/lights/update', lightsController.updateLights);
    this.app.post('/api/lights/command', lightsController.executeCommand);
    this.app.get('/api/lights/sync/settings', lightsController.getSyncSettings);
    this.app.put('/api/lights/sync/settings', lightsController.updateSyncSettings);
    this.app.post('/api/lights/test', lightsController.testLights);
    this.app.post('/api/lights/selection', lightsController.updateLightSelection);

    // WebSocket status endpoint
    this.app.get('/api/websocket/stats', (req, res) => {
      res.json(this.wsServer.getStats());
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
      });
    });

    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        ip: req.ip
      });

      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
      });
    });
  }

  public async start(): Promise<void> {
    try {
      // Create logs directory if it doesn't exist
      const fs = require('fs');
      const path = require('path');
      const logsDir = path.join(__dirname, '../logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      // Start HTTP server
      this.app.listen(this.port, () => {
        logger.info(`HTTP server running on port ${this.port}`);
        logger.info(`WebSocket server running on port ${this.wsPort}`);
        logger.info('TRADFRI Music Sync Server started successfully');
        
        // Log important URLs
        logger.info(`API Documentation: http://localhost:${this.port}/health`);
        logger.info(`Spotify Auth: http://localhost:${this.port}/api/spotify/auth`);
        logger.info(`Lights Status: http://localhost:${this.port}/api/lights/status`);
      });

      // Graceful shutdown handling
      process.on('SIGTERM', this.shutdown.bind(this));
      process.on('SIGINT', this.shutdown.bind(this));
      process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      });

      process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception:', error);
        this.shutdown();
      });

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    logger.info('Shutting down server...');
    
    try {
      // Close WebSocket server
      if (this.wsServer) {
        await this.wsServer.close();
      }
      
      logger.info('Server shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new Server();
server.start().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});

// Extend Express Request type to include request ID
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}