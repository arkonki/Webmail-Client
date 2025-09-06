import { logger } from './logger';
// Map of userId to a set of active long polling response objects
const connections = new Map();
export function add(userId, res) {
    if (!connections.has(userId)) {
        connections.set(userId, new Set());
    }
    connections.get(userId).add(res);
    logger.debug(`[Polling Manager] User ${userId} connected. Total connections for user: ${connections.get(userId).size}`);
}
export function remove(userId, res) {
    const userConnections = connections.get(userId);
    if (userConnections) {
        userConnections.delete(res);
        if (userConnections.size === 0) {
            connections.delete(userId);
        }
    }
    logger.debug(`[Polling Manager] User ${userId} disconnected. Remaining connections: ${getConnectionCount(userId)}`);
}
export function getConnectionCount(userId) {
    return connections.get(userId)?.size || 0;
}
export function send(userId, type, payload) {
    const userConnections = connections.get(userId);
    if (userConnections && userConnections.size > 0) {
        const message = JSON.stringify({ type, payload });
        // Iterate over a copy because sending the response will trigger 'remove' and modify the set
        [...userConnections].forEach(res => {
            if (!res.headersSent) {
                res.setHeader('Content-Type', 'application/json');
                res.status(200).send(message);
                // remove is called in the 'close' event handler of the request in server/index.ts
            }
        });
    }
}
// Send a message to ALL connected clients of ALL users
export function broadcast(type, payload) {
    if (connections.size === 0)
        return;
    const message = JSON.stringify({ type, payload });
    connections.forEach((userSockets, userId) => {
        [...userSockets].forEach(res => {
            if (!res.headersSent) {
                res.setHeader('Content-Type', 'application/json');
                res.status(200).send(message);
            }
        });
    });
}
