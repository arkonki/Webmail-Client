import WebSocket from 'ws';
import { logger } from './logger';
// Change to handle multiple connections per user (e.g., multiple tabs)
const connections = new Map();
export function add(userId, ws) {
    if (!connections.has(userId)) {
        connections.set(userId, new Set());
    }
    connections.get(userId).add(ws);
    logger.debug(`[WS Manager] User ${userId} connected. Total connections for user: ${connections.get(userId).size}`);
}
// Update remove to take the specific WebSocket instance to remove
export function remove(userId, ws) {
    const userConnections = connections.get(userId);
    if (userConnections) {
        userConnections.delete(ws);
        if (userConnections.size === 0) {
            connections.delete(userId);
            logger.debug(`[WS Manager] All connections for user ${userId} are closed.`);
        }
        else {
            logger.debug(`[WS Manager] User ${userId} ws disconnected. Remaining connections: ${userConnections.size}`);
        }
    }
}
// Add this function
export function getConnectionCount(userId) {
    return connections.get(userId)?.size || 0;
}
// Update send to broadcast to all of a user's connections
export function send(userId, type, payload) {
    const userConnections = connections.get(userId);
    if (userConnections && userConnections.size > 0) {
        const message = JSON.stringify({ type, payload });
        userConnections.forEach(wsClient => {
            if (wsClient.readyState === WebSocket.OPEN) {
                wsClient.send(message);
            }
        });
    }
}
// New function to broadcast to all clients
export function broadcast(type, payload) {
    if (connections.size === 0)
        return;
    const message = JSON.stringify({ type, payload });
    connections.forEach(userSockets => {
        userSockets.forEach(wsClient => {
            if (wsClient.readyState === WebSocket.OPEN) {
                wsClient.send(message);
            }
        });
    });
}
