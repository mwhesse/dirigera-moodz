
'use client';

import { useEffect, useRef } from 'react';
import { useLightStore } from '@/lib/stores/lightStore';
import { WebSocketClient } from '@/lib/services/WebSocketClient';

const API_BASE_URL = '/api';

const getWebSocketUrl = () => {
  if (typeof window === 'undefined') return 'ws://localhost:8080';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = '8080'; 
  return `${protocol}//${host}:${port}`;
};

export function RealtimeManager() {
  const { updateDevice, updateDevices, setDevices, setConnection } = useLightStore();
  const wsClient = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    // 1. Fetch initial state
    const fetchInitialDevices = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/lights/discover`);
            if (!response.ok) throw new Error('Failed to fetch initial state');
            const data = await response.json();
            setDevices(data.devices);
            setConnection(true);
        } catch (error) {
            console.error('Failed to initialize devices:', error);
            setConnection(false, 'Failed to load devices');
        }
    };

    fetchInitialDevices();

    // 2. Create WebSocket connection
    const wsUrl = getWebSocketUrl();
    wsClient.current = new WebSocketClient(wsUrl);

    // Listen for single device update
    wsClient.current.on('DEVICE_UPDATE', (device) => {
      updateDevice(device.id, device);
    });

    // Listen for batch device updates
    wsClient.current.on('DEVICES_UPDATE', (devices) => {
      updateDevices(devices);
    });

    // Cleanup
    return () => {
      if (wsClient.current) {
        wsClient.current.destroy();
        wsClient.current = null;
      }
    };
  }, [updateDevice, updateDevices, setDevices, setConnection]);

  return null; // This component renders nothing
}
