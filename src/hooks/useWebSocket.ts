import { useEffect, useState, useCallback, useRef } from 'react';
import { WS_URL } from '@/lib/api';

interface WebSocketHookProps {
  onBirdDetected: (bird: any) => void;
  onAlertTriggered?: (alert: any) => void;
}

export const useWebSocket = ({ onBirdDetected, onAlertTriggered }: WebSocketHookProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(1000);
  const isCleanedUpRef = useRef(false);

  // Use refs for callbacks to avoid recreating `connect` on every render
  const onBirdDetectedRef = useRef(onBirdDetected);
  onBirdDetectedRef.current = onBirdDetected;
  const onAlertTriggeredRef = useRef(onAlertTriggered);
  onAlertTriggeredRef.current = onAlertTriggered;

  const connect = useCallback(() => {
    // Don't reconnect if component is unmounted
    if (isCleanedUpRef.current) return;

    // Close existing connection if any
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }

    // Clear any pending reconnect
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectDelayRef.current = 1000; // Reset backoff on success
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'heartbeat') {
            return;
          }

          if (!data || typeof data !== 'object') return;

          const species = {
            common: data.species?.common || 'Unknown Bird',
            scientific: data.species?.scientific || 'Unknown Species'
          };

          const getRealisticLocation = () => {
            const context = data.behavioral_prediction?.primary_intent || data.communication_analysis?.behavioral_context || 'foraging';
            if (species.common.toLowerCase().includes('eagle') || 
                species.common.toLowerCase().includes('egret') || 
                species.common.toLowerCase().includes('heron') ||
                context === 'hunting') {
              return { x: 20 + Math.random() * 40, y: 200 + Math.random() * 40 };
            }
            if (species.common.toLowerCase().includes('crow') || 
                species.common.toLowerCase().includes('myna') ||
                context === 'foraging' || context === 'feeding') {
              return { x: 20 + Math.random() * 40, y: 20 + Math.random() * 40 };
            }
            if (data.alert_level === 'HIGH' || data.alert_level === 'CRITICAL') {
              return { x: 80 + Math.random() * 140, y: 100 + Math.random() * 50 };
            }
            return { x: Math.floor(Math.random() * 200) + 50, y: Math.floor(Math.random() * 120) + 50 };
          };

          const newBird = {
            species: species.common,
            scientific: species.scientific,
            confidence: Math.round((data.confidence ?? 0) * 100),
            location: getRealisticLocation(),
            callType: data.communication_analysis?.call_type || 'Detected',
            emotion: data.alert_level === 'HIGH' ? 'Agitated' : 'Alert',
            timestamp: data.timestamp || new Date().toISOString(),
            riskScore: data.risk_score || 0,
            alertLevel: data.alert_level || 'LOW',
            recommendedAction: data.recommended_action || 'CONTINUE_NORMAL',
            image_data: data.image_data || null,
            context: data.behavioral_prediction?.primary_intent || 'Unknown',
            originalCall: data.communication_analysis?.call_type || 'Unknown',
            behavioralPrediction: data.behavioral_prediction || {
              primary_intent: 'Unknown',
              confidence: 0.5
            }
          };

          if (newBird.confidence >= 20) {
            onBirdDetectedRef.current(newBird);

            if ((data.alert_level === 'HIGH' || data.alert_level === 'CRITICAL') && onAlertTriggeredRef.current) {
              onAlertTriggeredRef.current({
                id: Date.now(),
                species: species,
                timestamp: new Date(data.timestamp || Date.now()).toLocaleTimeString(),
                alert_level: data.alert_level,
                recommended_action: data.recommended_action || 'CONTINUE_NORMAL'
              });
            }
          }
        } catch (err) {
          console.error('Error processing WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        console.log('❌ WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Reconnect with exponential backoff (only if not cleaned up)
        if (!isCleanedUpRef.current) {
          const delay = reconnectDelayRef.current;
          console.log(`🔄 Reconnecting in ${delay / 1000}s...`);
          reconnectTimerRef.current = setTimeout(connect, delay);
          reconnectDelayRef.current = Math.min(delay * 2, 30000); // Max 30s
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Failed to connect to backend server');
        setIsConnected(false);
      };

    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setConnectionError('Cannot connect to backend server');
    }
  }, []); // No dependencies — uses refs for callbacks

  useEffect(() => {
    isCleanedUpRef.current = false;
    connect();
    return () => {
      isCleanedUpRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { isConnected, connectionError, reconnect: connect };
};
