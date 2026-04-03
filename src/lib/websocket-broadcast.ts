/**
 * WebSocket broadcast utilities for real-time order updates.
 * These functions communicate with the WebSocket server running on port 8080.
 */

export interface OrderUpdate {
    status: string;
    updatedAt: Date;
    message?: string;
}

export interface Alert {
    title: string;
    message: string;
    type: 'ORDER_UPDATE' | 'ALERT' | 'WARNING' | 'INFO';
    relatedOrderId?: string;
}

/**
 * Broadcast an order status update to all subscribers.
 */
export async function broadcastOrderUpdate(orderId: string, update: OrderUpdate) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 500);
        const response = await fetch('http://localhost:8080/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'ORDER_UPDATE', orderId, update }),
            signal: controller.signal
        });
        clearTimeout(timeout);
        if (!response.ok) console.warn(`Failed to broadcast order update: ${response.statusText}`);
    } catch {
        // WebSocket server not running - this is okay in development.
    }
}

export async function sendAlertToUser(userId: string, alert: Alert) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 500);
        const response = await fetch('http://localhost:8080/alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, alert }),
            signal: controller.signal
        });
        clearTimeout(timeout);
        if (!response.ok) console.warn(`Failed to send alert: ${response.statusText}`);
    } catch {
        // silent
    }
}

export async function sendRefreshToUser(userId: string, scope: 'orders' | 'handoffs' | 'all' = 'all') {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 500);
        await fetch('http://localhost:8080/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, scope }),
            signal: controller.signal
        });
        clearTimeout(timeout);
    } catch { /* silent */ }
}

/**
 * Notify farmer of a new order.
 */
export async function notifyFarmerOfNewOrder(farmerId: string, orderId: string, consumerName: string) {
    return sendAlertToUser(farmerId, {
        title: 'New Order Received',
        message: `${consumerName} has placed a new order`,
        type: 'ORDER_UPDATE',
        relatedOrderId: orderId
    });
}

/**
 * Notify consumer of order status change.
 */
export async function notifyConsumerOfStatusChange(consumerId: string, orderId: string, newStatus: string) {
    const statusMessages: Record<string, string> = {
        PLACED: 'Your order has been placed',
        ACCEPTED: 'Your order has been accepted by the farmer',
        OUT_FOR_DELIVERY: 'Your order is out for delivery',
        DELIVERED: 'Your order has been delivered'
    };

    return sendAlertToUser(consumerId, {
        title: 'Order Status Updated',
        message: statusMessages[newStatus] || `Your order status changed to ${newStatus}`,
        type: 'ORDER_UPDATE',
        relatedOrderId: orderId
    });
}
