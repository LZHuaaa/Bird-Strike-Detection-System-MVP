from fastapi import WebSocket
from typing import List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class EnhancedConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connection_stats = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.connection_stats[websocket] = {
            'connected_at': datetime.now(),
            'messages_sent': 0
        }
        logger.info(f"New WebSocket connection. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            self.connection_stats.pop(websocket, None)
            logger.info(f"WebSocket disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
                self.connection_stats[connection]['messages_sent'] += 1
            except Exception as e:
                logger.error(f"Error sending message to WebSocket: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected connections
        for conn in disconnected:
            self.disconnect(conn)

    async def send_to_connection(self, websocket: WebSocket, message: str):
        try:
            await websocket.send_text(message)
            self.connection_stats[websocket]['messages_sent'] += 1
        except Exception as e:
            logger.error(f"Error sending message to specific WebSocket: {e}")
            self.disconnect(websocket)

manager = EnhancedConnectionManager()
