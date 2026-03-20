'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

export interface OrderUpdateMessage {
    type: 'ORDER_UPDATE';
    orderId: string;
    update: {
        status: string;
        updatedAt: string;
        message?: string;
    };
    timestamp: string;
}

export interface AlertMessage {
    type: 'ALERT';
    alert: {
        title: string;
        message: string;
        type: 'ORDER_UPDATE' | 'ALERT' | 'WARNING' | 'INFO';
        relatedOrderId?: string;
    };
    timestamp: string;
}

export type WebSocketMessage = OrderUpdateMessage | AlertMessage;

export interface UseWebSocketOptions {
    onOrderUpdate?: (orderId: string, update: any) => void;
    onAlert?: (alert: any) => void;
    onError?: (error: string) => void;
    autoConnect?: boolean;
}

/**
 * Hook for managing WebSocket connections and real-time order updates
 * 
 * Usage:
 * ```tsx
 * const { connect, disconnect, subscribeToOrder, isConnected } = useWebSocket({
 *   onOrderUpdate: (orderId, update) => console.log('Order updated:', update),
 *   onAlert: (alert) => console.log('Alert:', alert)
 * });
 * 
 * useEffect(() => {
 *   const token = localStorage.getItem('authToken');
 *   if (token) {
 *     connect(token);
 *   }
 * }, []);
 * 
 * // Subscribe to order updates
 * subscribeToOrder('order-id-123');
 * ```
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
    const {
        onOrderUpdate,
        onAlert,
        onError,
        autoConnect = false
    } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [reconnecting, setReconnecting] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const reconnectDelay = useRef(1000);

    const connect = useCallback((token: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected');
            return;
        }

        try {
            setReconnecting(true);
            const ws = new WebSocket(
                process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'
            );

            ws.onopen = () => {
                console.log('WebSocket connected');
                setIsConnected(true);
                setReconnecting(false);
                reconnectAttempts.current = 0;
                reconnectDelay.current = 1000;

                // Send authentication
                ws.send(JSON.stringify({
                    type: 'AUTH',
                    token
                }));
            };

            ws.onmessage = (event) => {
                try {
                    const data: WebSocketMessage = JSON.parse(event.data);

                    if (data.type === 'AUTH_SUCCESS') {
                        console.log('WebSocket authenticated');
                    } else if (data.type === 'AUTH_ERROR') {
                        console.error('WebSocket auth failed');
                        onError?.('Authentication failed');
                        ws.close();
                    } else if (data.type === 'ORDER_UPDATE') {
                        onOrderUpdate?.(data.orderId, data.update);
                    } else if (data.type === 'ALERT') {
                        onAlert?.(data.alert);
                    }
                } catch (err) {
                    console.error('Failed to parse WebSocket message:', err);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                onError?.('WebSocket error occurred');
                setIsConnected(false);
            };

            ws.onclose = () => {
                console.log('WebSocket disconnected');
                setIsConnected(false);
                setReconnecting(false);

                // Attempt to reconnect
                if (reconnectAttempts.current < maxReconnectAttempts) {
                    setReconnecting(true);
                    reconnectAttempts.current++;
                    const delay = reconnectDelay.current;
                    reconnectDelay.current = Math.min(
                        reconnectDelay.current * 2,
                        30000
                    );

                    setTimeout(() => {
                        connect(token);
                    }, delay);
                }
            };

            wsRef.current = ws;
        } catch (err) {
            console.error('Failed to create WebSocket:', err);
            onError?.('Failed to connect to WebSocket');
            setReconnecting(false);
        }
    }, [onOrderUpdate, onAlert, onError]);

    const disconnect = useCallback(() => {
        reconnectAttempts.current = maxReconnectAttempts; // Prevent reconnection
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
            setIsConnected(false);
        }
    }, []);

    const subscribeToOrder = useCallback((orderId: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'SUBSCRIBE_ORDER',
                orderId
            }));
        } else {
            console.warn('WebSocket not connected, cannot subscribe to order');
        }
    }, []);

    const unsubscribeFromOrder = useCallback((orderId: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'UNSUBSCRIBE_ORDER',
                orderId
            }));
        }
    }, []);

    // Auto-connect if token is available
    useEffect(() => {
        if (autoConnect) {
            const token = localStorage.getItem('authToken');
            if (token) {
                connect(token);
            }
        }

        return () => {
            // Cleanup on unmount
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.close();
            }
        };
    }, [autoConnect, connect]);

    return {
        isConnected,
        reconnecting,
        connect,
        disconnect,
        subscribeToOrder,
        unsubscribeFromOrder
    };
}
