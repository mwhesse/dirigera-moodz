import { WSMessage } from '@/types';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private messageQueue: WSMessage[] = [];
  private isConnected = false;
  private listeners: Map<string, Array<(data: any) => void>> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastPingTime = 0;
  private latency = 0;

  constructor(url: string) {
    this.url = url;
    this.connect();
  }

  private connect(): void {
    try {
      console.log(`Connecting to WebSocket: ${this.url}`);
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  private handleOpen(): void {
    console.log('WebSocket connected successfully');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    
    // Clear any pending reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Send any queued messages
    this.flushMessageQueue();

    // Start heartbeat
    this.startHeartbeat();

    // Emit connection event
    this.emit('connected', {});
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WSMessage = JSON.parse(event.data);
      
      // Handle special message types
      switch (message.type) {
        case 'INIT':
          console.log('WebSocket initialized:', message.data);
          this.emit('init', message.data);
          break;
        case 'PONG':
          this.handlePong(message.data);
          break;
        case 'ERROR':
          console.error('Server error:', message.data);
          this.emit('error', message.data);
          break;
        default:
          // Emit the message to registered listeners
          this.emit(message.type, message.data);
          break;
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
    this.isConnected = false;
    this.stopHeartbeat();
    
    // Emit disconnection event
    this.emit('disconnected', {
      code: event.code,
      reason: event.reason
    });

    // Attempt to reconnect unless it was a clean close
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    this.emit('error', { message: 'WebSocket connection error' });
  }

  private handlePong(data: any): void {
    if (data.timestamp) {
      this.latency = Date.now() - this.lastPingTime;
      console.log(`WebSocket latency: ${this.latency}ms`);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('error', { message: 'Maximum reconnection attempts exceeded' });
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.lastPingTime = Date.now();
        this.send({
          type: 'PING',
          data: { timestamp: this.lastPingTime }
        });
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message, false); // Don't queue again
      }
    }
  }

  public send(message: WSMessage, queue = true): void {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        if (queue) {
          this.queueMessage(message);
        }
      }
    } else if (queue) {
      this.queueMessage(message);
    }
  }

  private queueMessage(message: WSMessage): void {
    // Limit queue size to prevent memory issues
    if (this.messageQueue.length < 100) {
      this.messageQueue.push(message);
    } else {
      console.warn('WebSocket message queue is full, dropping oldest message');
      this.messageQueue.shift();
      this.messageQueue.push(message);
    }
  }

  public on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback?: (data: any) => void): void {
    if (!this.listeners.has(event)) return;

    const callbacks = this.listeners.get(event)!;
    if (callback) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    } else {
      // Remove all listeners for this event
      this.listeners.set(event, []);
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in WebSocket event callback for ${event}:`, error);
      }
    });
  }

  // Convenience methods for common message types
  public sendBeatDetection(data: { timestamp: number; intensity: number; confidence: number }): void {
    this.send({
      type: 'BEAT_DETECTED',
      data
    });
  }

  public sendFrequencyUpdate(data: { bass: number; mids: number; treble: number; dominantFrequency: number; spectrum: number[] }): void {
    this.send({
      type: 'FREQUENCY_UPDATE',
      data
    });
  }

  public sendSongSection(data: { type: string; timestamp: number; confidence: number }): void {
    this.send({
      type: 'SONG_SECTION',
      data
    });
  }

  public sendPlaybackState(data: { trackId: string; position: number; isPlaying: boolean; accessToken?: string }): void {
    this.send({
      type: 'PLAYBACK_STATE',
      data
    });
  }

  public sendSettingsUpdate(data: any): void {
    this.send({
      type: 'SETTINGS_UPDATE',
      data
    });
  }

  public requestStatus(): void {
    this.send({
      type: 'REQUEST_STATUS',
      data: {}
    });
  }

  public getConnectionStatus(): { connected: boolean; latency: number; attempts: number } {
    return {
      connected: this.isConnected,
      latency: this.latency,
      attempts: this.reconnectAttempts
    };
  }

  public disconnect(): void {
    console.log('Disconnecting WebSocket...');
    
    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();

    // Close connection
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.isConnected = false;
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  public destroy(): void {
    this.disconnect();
    this.listeners.clear();
    this.messageQueue = [];
  }
}