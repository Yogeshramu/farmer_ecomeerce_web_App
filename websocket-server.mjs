import { WebSocketServer } from 'ws';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';
import fs from 'fs';
import path from 'path';
import http from 'http';

// Load .env manually
try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const envFile = fs.readFileSync(envPath, 'utf8');
        envFile.split('\n').forEach(line => {
            const [key, ...values] = line.split('=');
            if (key && values.length > 0) {
                const val = values.join('=').trim();
                // Remove quotes if present
                process.env[key.trim()] = val.replace(/^["'](.*)["']$/, '$1');
            }
        });
    }
} catch (e) {
    console.log("Could not load .env file, relying on system env");
}

const prisma = new PrismaClient();
const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-key');

// Track connected users and their subscriptions
const userConnections = new Map(); // userId -> Set of ws connections
const orderSubscriptions = new Map(); // orderId -> Set of userId subscriptions

// Create HTTP server
const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    // Handle broadcast requests from API routes
    if (req.method === 'POST' && req.url === '/broadcast') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { orderId, update } = data;
                broadcastOrderUpdate(orderId, update);
                res.writeHead(200);
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid request' }));
            }
        });
        return;
    }

    // Handle alert requests from API routes
    if (req.method === 'POST' && req.url === '/alert') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { userId, alert } = data;
                sendAlert(userId, alert);
                res.writeHead(200);
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid request' }));
            }
        });
        return;
    }

    // Health check endpoint
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({ 
            status: 'ok',
            connectedUsers: userConnections.size,
            activeSubscriptions: orderSubscriptions.size
        }));
        return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

console.log("WebSocket Server running on ws://localhost:8080");
console.log("HTTP Broadcast API available on http://localhost:8080");

// Function to broadcast order updates to relevant users
function broadcastOrderUpdate(orderId, update) {
    const subscribers = orderSubscriptions.get(orderId) || new Set();
    
    for (const userId of subscribers) {
        const connections = userConnections.get(userId) || new Set();
        const message = JSON.stringify({
            type: 'ORDER_UPDATE',
            orderId,
            update,
            timestamp: new Date().toISOString()
        });
        
        for (const ws of connections) {
            if (ws.readyState === 1) { // OPEN
                ws.send(message);
            }
        }
    }
    
    console.log(`Order update broadcast for ${orderId} to ${subscribers.size} subscribers`);
}

// Function to broadcast alerts to a specific user
function sendAlert(userId, alert) {
    const connections = userConnections.get(userId) || new Set();
    const message = JSON.stringify({
        type: 'ALERT',
        alert,
        timestamp: new Date().toISOString()
    });
    
    for (const ws of connections) {
        if (ws.readyState === 1) { // OPEN
            ws.send(message);
        }
    }
    
    console.log(`Alert sent to user ${userId}: ${alert.title}`);
}

wss.on('connection', (ws) => {
    let authenticatedUser = null;

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message.toString());

            if (data.type === 'AUTH') {
                try {
                    const { payload } = await jwtVerify(data.token, secretKey);
                    authenticatedUser = payload;
                    
                    // Track this connection
                    if (!userConnections.has(authenticatedUser.id)) {
                        userConnections.set(authenticatedUser.id, new Set());
                    }
                    userConnections.get(authenticatedUser.id).add(ws);
                    
                    ws.send(JSON.stringify({ type: 'AUTH_SUCCESS', user: payload }));
                    console.log(`User authenticated: ${payload.name} (${payload.id})`);
                } catch (err) {
                    console.error("Auth failed:", err.message);
                    ws.send(JSON.stringify({ type: 'AUTH_ERROR', error: 'Invalid token' }));
                }
                return;
            }

            if (!authenticatedUser) {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'Not authenticated' }));
                return;
            }

            // Subscribe to order updates
            if (data.type === 'SUBSCRIBE_ORDER') {
                const { orderId } = data;
                
                // Verify user has access to this order
                const order = await prisma.order.findUnique({
                    where: { id: orderId }
                });
                
                if (!order) {
                    ws.send(JSON.stringify({ 
                        type: 'ERROR', 
                        message: 'Order not found' 
                    }));
                    return;
                }
                
                // Check authorization - user must be consumer or farmer of this order
                if (order.consumerId !== authenticatedUser.id && order.farmerId !== authenticatedUser.id) {
                    ws.send(JSON.stringify({ 
                        type: 'ERROR', 
                        message: 'Not authorized to subscribe to this order' 
                    }));
                    return;
                }
                
                // Add subscription
                if (!orderSubscriptions.has(orderId)) {
                    orderSubscriptions.set(orderId, new Set());
                }
                orderSubscriptions.get(orderId).add(authenticatedUser.id);
                
                // Send current order status
                const orderData = await prisma.order.findUnique({
                    where: { id: orderId },
                    include: { 
                        items: { include: { crop: true } },
                        consumer: true,
                        farmer: true
                    }
                });
                
                ws.send(JSON.stringify({
                    type: 'ORDER_SUBSCRIBED',
                    orderId,
                    order: orderData
                }));
                
                console.log(`User ${authenticatedUser.id} subscribed to order ${orderId}`);
                return;
            }

            // Unsubscribe from order
            if (data.type === 'UNSUBSCRIBE_ORDER') {
                const { orderId } = data;
                const subscribers = orderSubscriptions.get(orderId);
                if (subscribers) {
                    subscribers.delete(authenticatedUser.id);
                    if (subscribers.size === 0) {
                        orderSubscriptions.delete(orderId);
                    }
                }
                console.log(`User ${authenticatedUser.id} unsubscribed from order ${orderId}`);
                return;
            }

            if (data.type === 'ADD_CROP') {
                const { name, quantityKg, basePrice, farmerPincode } = data.crop;

                // Create crop in DB
                const newCrop = await prisma.crop.create({
                    data: {
                        name,
                        quantityKg: parseFloat(quantityKg),
                        basePrice: parseFloat(basePrice),
                        farmerId: authenticatedUser.id,
                        farmerPincode: farmerPincode || "600001"
                    }
                });

                ws.send(JSON.stringify({ type: 'CROP_ADDED', crop: newCrop }));
                console.log(`Crop added via Voice/WS: ${newCrop.name}`);
            }

        } catch (error) {
            console.error("WS Error:", error);
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Internal Server Error' }));
        }
    });

    // Cleanup on disconnect
    ws.on('close', () => {
        if (authenticatedUser) {
            const connections = userConnections.get(authenticatedUser.id);
            if (connections) {
                connections.delete(ws);
                if (connections.size === 0) {
                    userConnections.delete(authenticatedUser.id);
                }
            }
            console.log(`User ${authenticatedUser.id} disconnected`);
        }
    });

    ws.on('error', (error) => {
        console.error("WebSocket error:", error);
    });
});

// Start the server
server.listen(8080, () => {
    console.log("Server listening on port 8080 for both WebSocket and HTTP");
});
