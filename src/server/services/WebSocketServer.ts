import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { SyncEngine } from './SyncEngine';
import { DirigeraService } from './DirigeraService';
import { WSMessage } from '../types';
import { Logger } from 'winston';
import { v4 as uuidv4 } from 'uuid';

interface WebSocketClient {
  id: string;
  ws: WebSocket;
  lastActivity: number;
  isAlive: boolean;
}

export class WebSocketServer {
  private wss: WSServer;
  private syncEngine: SyncEngine;
  private dirigeraService: DirigeraService;
  private clients: Map<string, WebSocketClient> = new Map();
  private logger: Logger;
  private heartbeatInterval!: NodeJS.Timeout;

  constructor(port: number, syncEngine: SyncEngine, dirigeraService: DirigeraService, logger: Logger) {
    this.syncEngine = syncEngine;
    this.dirigeraService = dirigeraService;
    this.logger = logger;
    this.wss = new WSServer({ 
      port,
      perMessageDeflate: false
    });
    this.initialize();
  }

  private initialize(): void {
    this.logger.info(`WebSocket server starting on port ${this.wss.options.port}`);
    
    // Subscribe to device updates from DirigeraService
    this.dirigeraService.on('deviceUpdate', (device) => {
      this.broadcast({
        type: 'DEVICE_UPDATE',
        data: device
      });
    });

    // Subscribe to batch device updates
    this.dirigeraService.on('devicesUpdate', (devices) => {
      this.broadcast({
        type: 'DEVICES_UPDATE',
        data: devices
      });
    });

    this.wss.on('connection', (ws, req) => {
      const clientId = uuidv4();
      const clientIP = req.socket.remoteAddress;
      
      const client: WebSocketClient = {
        id: clientId,
        ws: ws,
        lastActivity: Date.now(),
        isAlive: true
      };
      
      this.clients.set(clientId, client);
      this.logger.info(`Client connected: ${clientId} from ${clientIP}. Total clients: ${this.clients.size}`);
      
      // Set up WebSocket event handlers
      ws.on('message', async (message) => {
        try {
          client.lastActivity = Date.now();
          const data = JSON.parse(message.toString());
          await this.handleMessage(clientId, data);
        } catch (error) {
          this.logger.error(`WebSocket message error from client ${clientId}:`, error);
          this.sendToClient(clientId, {
            type: 'ERROR',
            data: { message: 'Invalid message format' }
          });
        }
      });

      ws.on('close', (code, reason) => {
        this.clients.delete(clientId);
        this.logger.info(`Client disconnected: ${clientId} (code: ${code}, reason: ${reason}). Total clients: ${this.clients.size}`);
      });

      ws.on('error', (error) => {
        this.logger.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });

      ws.on('pong', () => {
        client.isAlive = true;
        client.lastActivity = Date.now();
      });

      // Send initial configuration to client
      this.sendToClient(clientId, {
        type: 'INIT',
        data: {
          clientId: clientId,
          config: {
            analysisSettings: {
              fftSize: 2048,
              smoothingTimeConstant: 0.8,
              beatDetectionThreshold: 0.8
            },
            syncSettings: this.syncEngine.getSettings()
          }
        }
      });
    });

    this.wss.on('error', (error) => {
      this.logger.error('WebSocket server error:', error);
    });

    // Start heartbeat mechanism
    this.startHeartbeat();
    
    this.logger.info(`WebSocket server initialized successfully on port ${this.wss.options.port}`);
  }

  private async handleMessage(clientId: string, message: WSMessage): Promise<void> {
    this.logger.debug(`Received message from ${clientId}: ${message.type}`);
    
    try {
      switch (message.type) {
        case 'BEAT_DETECTED':
          await this.syncEngine.handleBeatDetection(message.data);
          // Broadcast beat sync to other clients for visualization
          this.broadcast({
            type: 'BEAT_SYNC',
            data: {
              ...message.data,
              sourceClient: clientId
            }
          }, clientId);
          break;
          
        case 'FREQUENCY_UPDATE':
          await this.syncEngine.handleFrequencyUpdate(message.data);
          // Optionally broadcast frequency data for multi-client visualization
          if (this.shouldBroadcastFrequency()) {
            this.broadcast({
              type: 'FREQUENCY_SYNC',
              data: message.data
            }, clientId);
          }
          break;
          
        case 'SONG_SECTION':
          await this.syncEngine.handleSongSection(message.data);
          this.broadcast({
            type: 'SONG_SECTION_SYNC',
            data: message.data
          }, clientId);
          break;

        case 'SETTINGS_UPDATE':
          this.syncEngine.updateSettings(message.data);
          this.broadcast({
            type: 'SETTINGS_SYNC',
            data: message.data
          }, clientId);
          break;

        case 'PING':
          this.sendToClient(clientId, {
            type: 'PONG',
            data: { timestamp: Date.now() }
          });
          break;

        case 'REQUEST_STATUS':
          await this.sendStatusUpdate(clientId);
          break;
          
        default:
          this.logger.warn(`Unknown message type from client ${clientId}: ${message.type}`);
          this.sendToClient(clientId, {
            type: 'ERROR',
            data: { message: `Unknown message type: ${message.type}` }
          });
      }
    } catch (error) {
      this.logger.error(`Error handling message ${message.type} from client ${clientId}:`, error);
      this.sendToClient(clientId, {
        type: 'ERROR',
        data: { 
          message: 'Server error processing message',
          originalType: message.type 
        }
      });
    }
  }

  private async sendStatusUpdate(clientId: string): Promise<void> {
    // Send current system status to the requesting client
    this.sendToClient(clientId, {
      type: 'STATUS_UPDATE',
      data: {
        syncEngine: {
          settings: this.syncEngine.getSettings()
        },
        server: {
          connectedClients: this.clients.size,
          uptime: process.uptime(),
          timestamp: Date.now()
        }
      }
    });
  }

  private shouldBroadcastFrequency(): boolean {
    // Only broadcast frequency data if there are multiple clients
    // and at most every 100ms to avoid overwhelming
    return this.clients.size > 1;
  }

  private sendToClient(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        this.logger.error(`Failed to send message to client ${clientId}:`, error);
        this.clients.delete(clientId);
      }
    }
  }

  private broadcast(message: any, excludeClientId?: string): void {
    const messageStr = JSON.stringify(message);
    let sentCount = 0;
    
    this.clients.forEach((client, id) => {
      if (id !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(messageStr);
          sentCount++;
        } catch (error) {
          this.logger.error(`Failed to broadcast to client ${id}:`, error);
          this.clients.delete(id);
        }
      }
    });
    
    if (sentCount > 0) {
      this.logger.debug(`Broadcast message to ${sentCount} clients`);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeoutThreshold = 30000; // 30 seconds
      
      this.clients.forEach((client, id) => {
        if (!client.isAlive) {
          this.logger.info(`Terminating inactive client: ${id}`);
          client.ws.terminate();
          this.clients.delete(id);
          return;
        }
        
        // Check for inactive clients
        if (now - client.lastActivity > timeoutThreshold) {
          this.logger.warn(`Client ${id} appears inactive, sending ping`);
          client.isAlive = false;
          try {
            client.ws.ping();
          } catch (error) {
            this.logger.error(`Failed to ping client ${id}:`, error);
            this.clients.delete(id);
          }
        }
      });
    }, 10000); // Check every 10 seconds
  }

  // Get statistics about connected clients
  getStats(): any {
    return {
      connectedClients: this.clients.size,
      clients: Array.from(this.clients.entries()).map(([id, client]) => ({
        id,
        lastActivity: new Date(client.lastActivity).toISOString(),
        isAlive: client.isAlive
      }))
    };
  }

  // Broadcast a server announcement to all clients
  broadcastAnnouncement(message: string, type: string = 'INFO'): void {
    this.broadcast({
      type: 'SERVER_ANNOUNCEMENT',
      data: {
        message,
        type,
        timestamp: Date.now()
      }
    });
    this.logger.info(`Broadcast announcement: ${message}`);
  }

  // Gracefully close the server
  async close(): Promise<void> {
    this.logger.info('Shutting down WebSocket server...');
    
    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Notify all clients of server shutdown
    this.broadcast({
      type: 'SERVER_SHUTDOWN',
      data: { message: 'Server is shutting down' }
    });
    
    // Close all client connections
    this.clients.forEach((client) => {
      client.ws.close(1001, 'Server shutdown');
    });
    
    // Close the server
    return new Promise((resolve) => {
      this.wss.close(() => {
        this.logger.info('WebSocket server closed');
        resolve();
      });
    });
  }
}