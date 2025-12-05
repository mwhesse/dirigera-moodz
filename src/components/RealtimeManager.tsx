
'use client';

import { useEffect, useRef } from 'react';
import { useLightStore } from '@/lib/stores/lightStore';
import { WebSocketClient } from '@/lib/services/WebSocketClient';
import { getWebSocketUrl } from '@/lib/utils/websocket';

const API_BASE_URL = '/api';

export function RealtimeManager() {
  const isConnected = useRef(false);
  const { updateDevice, updateDevices, setDevices, setConnection, updateCurrentScene } = useLightStore();
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
    if (!isConnected.current) {
      const wsUrl = getWebSocketUrl();
      console.log('Connecting to WebSocket:', wsUrl);
      
      wsClient.current = new WebSocketClient(wsUrl);
      isConnected.current = true;

      // Listen for single device update
      wsClient.current.on('DEVICE_UPDATE', (device) => {
        updateDevice(device.id, device);
      });

              // Listen for batch device updates
              wsClient.current.on('DEVICES_UPDATE', (devices) => {
                  updateDevices(devices);
              });
      
        // Listen for scene updates
        wsClient.current.on('SCENE_UPDATE', (scene) => {
            updateCurrentScene(scene);
        });
    }

    // Cleanup
    return () => {
      if (wsClient.current) {
        console.log('Cleaning up WebSocket connection');
        wsClient.current.destroy();
        wsClient.current = null;
        isConnected.current = false;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run once

  return null; // This component renders nothing
}
