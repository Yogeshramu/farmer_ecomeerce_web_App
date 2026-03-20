# Real-Time Order Updates - WebSocket Implementation

## Overview

This implementation provides real-time order updates and alerts using WebSocket technology. Farmers and consumers receive instant notifications when:
- New orders are placed
- Order status changes (PLACED → ACCEPTED → OUT_FOR_DELIVERY → DELIVERED)

## Architecture

### Components

1. **WebSocket Server** (`websocket-server.mjs`)
   - Runs on port 8080 (ws://localhost:8080)
   - Handles client connections and authentication
   - Manages order subscriptions
   - Exposes HTTP endpoints for API route integration

2. **Broadcast Utilities** (`lib/websocket-broadcast.ts`)
   - Helper functions for triggering updates from API routes
   - `broadcastOrderUpdate()` - Broadcast to order subscribers
   - `sendAlertToUser()` - Send alert to specific user
   - `notifyFarmerOfNewOrder()` - Notify farmer when order placed
   - `notifyConsumerOfStatusChange()` - Notify consumer of status updates

3. **Client Hook** (`app/hooks/useWebSocket.ts`)
   - React hook for WebSocket connections in components
   - Handles authentication, subscriptions, reconnection
   - Provides callbacks for order updates and alerts

4. **API Integration**
   - Orders POST endpoint broadcasts new order notifications
   - Orders status PATCH endpoint broadcasts status changes

## Server Setup

### Starting the WebSocket Server

```bash
# In your project root
node websocket-server.mjs
```

The server will:
- Listen on ws://localhost:8080 for WebSocket connections
- Listen on http://localhost:8080 for HTTP broadcast requests
- Provide /health endpoint for monitoring

### Health Check

```bash
curl http://localhost:8080/health
```

## Client Usage

### Basic Setup in React Component

```tsx
'use client';

import { useWebSocket } from '@/app/hooks/useWebSocket';
import { useEffect } from 'react';

export function OrderDashboard() {
  const { 
    isConnected, 
    connect, 
    subscribeToOrder, 
    disconnect 
  } = useWebSocket({
    onOrderUpdate: (orderId, update) => {
      console.log(`Order ${orderId} updated to ${update.status}`);
      // Update UI with new status
    },
    onAlert: (alert) => {
      console.log(alert.title, alert.message);
      // Show toast/notification
    }
  });

  useEffect(() => {
    // Connect when component mounts
    const token = localStorage.getItem('authToken');
    if (token) {
      connect(token);
    }

    // Subscribe to specific order
    subscribeToOrder('order-id-123');

    return () => {
      disconnect();
    };
  }, []);

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      {/* Rest of component */}
    </div>
  );
}
```

### Auto-Connect Setup

```tsx
const { isConnected } = useWebSocket({
  autoConnect: true, // Automatically connects using stored token
  onOrderUpdate: handleOrderUpdate,
  onAlert: handleAlert
});
```

## WebSocket Message Protocol

### Client → Server Messages

#### Authentication
```json
{
  "type": "AUTH",
  "token": "jwt-token-here"
}
```

#### Subscribe to Order
```json
{
  "type": "SUBSCRIBE_ORDER",
  "orderId": "order-id-123"
}
```

#### Unsubscribe from Order
```json
{
  "type": "UNSUBSCRIBE_ORDER",
  "orderId": "order-id-123"
}
```

#### Add Crop (existing functionality)
```json
{
  "type": "ADD_CROP",
  "crop": {
    "name": "Tomato",
    "quantityKg": 100,
    "basePrice": 50,
    "farmerPincode": "600001"
  }
}
```

### Server → Client Messages

#### Authentication Success
```json
{
  "type": "AUTH_SUCCESS",
  "user": {
    "id": "user-id",
    "name": "User Name",
    "role": "FARMER",
    "email": "user@example.com"
  }
}
```

#### Order Update
```json
{
  "type": "ORDER_UPDATE",
  "orderId": "order-id-123",
  "update": {
    "status": "ACCEPTED",
    "updatedAt": "2026-03-20T10:30:00Z",
    "message": "Order status updated to ACCEPTED"
  },
  "timestamp": "2026-03-20T10:30:00Z"
}
```

#### Alert Notification
```json
{
  "type": "ALERT",
  "alert": {
    "title": "New Order Received",
    "message": "John Doe has placed a new order",
    "type": "ORDER_UPDATE",
    "relatedOrderId": "order-id-123"
  },
  "timestamp": "2026-03-20T10:30:00Z"
}
```

#### Order Subscription Confirmed
```json
{
  "type": "ORDER_SUBSCRIBED",
  "orderId": "order-id-123",
  "order": {
    "id": "order-id-123",
    "status": "PLACED",
    "totalAmount": 5000,
    "deliveryCharge": 100,
    "items": [
      {
        "cropId": "crop-id",
        "quantity": 10,
        "price": 50,
        "crop": { /* crop data */ }
      }
    ],
    "consumer": { /* consumer data */ },
    "farmer": { /* farmer data */ }
  }
}
```

## HTTP API Endpoints (for server-side triggering)

### POST /broadcast - Broadcast Order Update

```bash
curl -X POST http://localhost:8080/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order-123",
    "update": {
      "status": "SHIPPED",
      "updatedAt": "2026-03-20T10:30:00Z",
      "message": "Order shipped"
    }
  }'
```

### POST /alert - Send Alert to User

```bash
curl -X POST http://localhost:8080/alert \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "alert": {
      "title": "Payment Received",
      "message": "Payment of ₹5000 has been received",
      "type": "INFO",
      "relatedOrderId": "order-123"
    }
  }'
```

### GET /health - Server Health

```bash
curl http://localhost:8080/health
```

Returns:
```json
{
  "status": "ok",
  "connectedUsers": 5,
  "activeSubscriptions": 12
}
```

## Integration Points

### Adding Notifications to New Endpoints

To add WebSocket notifications to other API endpoints:

```tsx
import { broadcastOrderUpdate, sendAlertToUser } from '@/lib/websocket-broadcast';

export async function POST(request: Request) {
  // ... your logic ...

  // Notify participants
  await broadcastOrderUpdate(orderId, {
    status: 'NEW_STATUS',
    updatedAt: new Date(),
    message: 'Custom message'
  });

  await sendAlertToUser(userId, {
    title: 'Alert Title',
    message: 'Alert message',
    type: 'ORDER_UPDATE',
    relatedOrderId: orderId
  });
}
```

## Production Considerations

1. **Authentication**: Uses JWT validation - ensure JWT_SECRET is set in .env
2. **Scalability**: For production with multiple server instances, consider:
   - Redis pub/sub for cross-instance messaging
   - Load balancer with sticky sessions
   - Dedicated WebSocket server infrastructure

3. **Error Handling**: The client automatically reconnects up to 5 times with exponential backoff
4. **Security**: Orders can only be accessed by their consumer or farmer
5. **Environment Variables**:
   - `NEXT_PUBLIC_WS_URL` - Set to your WebSocket server URL (default: ws://localhost:8080)
   - `JWT_SECRET` - Used for token verification

## Testing

### Manual Testing with wscat

```bash
# Install wscat
npm install -g wscat

# Connect to server
wscat -c ws://localhost:8080

# Send authentication
{"type":"AUTH","token":"your-jwt-token"}

# Subscribe to order
{"type":"SUBSCRIBE_ORDER","orderId":"order-id-123"}
```

## Troubleshooting

1. **WebSocket not connecting**
   - Ensure websocket-server.mjs is running
   - Check NEXT_PUBLIC_WS_URL environment variable
   - Verify firewall allows port 8080

2. **No updates received**
   - Confirm user is authenticated
   - Check order subscription with correct orderId
   - Verify user has access to the order (is consumer or farmer)

3. **Slow reconnections**
   - Client uses exponential backoff (1s → 2s → 4s → 8s → 16s → 30s max)
   - Check network connectivity

## Files Summary

- `websocket-server.mjs` - WebSocket and HTTP server
- `lib/websocket-broadcast.ts` - Broadcast utility functions
- `src/app/hooks/useWebSocket.ts` - React hook for client integration
- `src/app/api/orders/route.ts` - Updated to notify on new orders
- `src/app/api/orders/[id]/status/route.ts` - Updated to broadcast status changes
