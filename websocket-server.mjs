import { WebSocketServer } from 'ws';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';
import fs from 'fs';
import path from 'path';

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
const wss = new WebSocketServer({ port: 8080 });
const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-key');

console.log("WebSocket Server running on ws://localhost:8080");

wss.on('connection', (ws) => {
    let authenticatedUser = null;

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message.toString());

            if (data.type === 'AUTH') {
                try {
                    const { payload } = await jwtVerify(data.token, secretKey);
                    authenticatedUser = payload;
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
});
