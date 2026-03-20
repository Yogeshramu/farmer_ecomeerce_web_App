'use client';

import { useEffect, useState } from 'react';
import { useWebSocket } from '@/app/hooks/useWebSocket';

interface OrderNotification {
  id: string;
  type: 'NEW_ORDER' | 'STATUS_UPDATE';
  title: string;
  message: string;
  orderId: string;
  timestamp: Date;
}

/**
 * Example: Real-time Order Notifications for Farmer Dashboard
 * 
 * This component demonstrates how to integrate WebSocket functionality
 * to display live notifications when:
 * - New orders are placed
 * - Order statuses change
 */
export function OrderNotificationsWidget() {
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const { connect, disconnect, isConnected } = useWebSocket({
    autoConnect: true,
    onAlert: (alert) => {
      // Handle incoming alerts
      const notification: OrderNotification = {
        id: `${Date.now()}`,
        type: alert.type === 'ORDER_UPDATE' ? 'NEW_ORDER' : 'STATUS_UPDATE',
        title: alert.title,
        message: alert.message,
        orderId: alert.relatedOrderId || '',
        timestamp: new Date()
      };

      setNotifications((prev) => [notification, ...prev].slice(0, 10));

      // Auto-remove notification after 10 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      }, 10000);
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    }
  });

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Notification Bell Badge */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {notifications.length}
          </span>
        )}
        <span className={`absolute top-3 right-3 w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
      </button>

      {/* Notification Panel */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 w-96 bg-white rounded-lg shadow-2xl border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">Order Notifications</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No notifications yet</p>
                <p className="text-sm">
                  {isConnected ? 'Waiting for orders...' : 'Connecting...'}
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 border-b border-gray-100 hover:bg-gray-50 transition"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        notification.type === 'NEW_ORDER'
                          ? 'bg-green-500'
                          : 'bg-blue-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">
                        {notification.title}
                      </p>
                      <p className="text-gray-600 text-sm mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {notification.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
            Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Example: Order Status Tracker Component
 * 
 * Shows real-time updates for a specific order
 */
export function OrderStatusTracker({ orderId }: { orderId: string }) {
  const [orderStatus, setOrderStatus] = useState<string>('PLACED');
  const [isLoading, setIsLoading] = useState(true);

  const { subscribeToOrder, isConnected } = useWebSocket({
    onOrderUpdate: (updatedOrderId, update) => {
      if (updatedOrderId === orderId) {
        setOrderStatus(update.status);
      }
    }
  });

  useEffect(() => {
    setIsLoading(false);
    subscribeToOrder(orderId);
  }, [orderId, subscribeToOrder]);

  const statusSteps = ['PLACED', 'ACCEPTED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
  const currentStep = statusSteps.indexOf(orderStatus);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        {statusSteps.map((status, index) => (
          <div key={status} className="text-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto font-bold text-sm transition-all ${
                index <= currentStep
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}
            >
              {index + 1}
            </div>
            <p className="text-xs mt-2 text-gray-600">{status}</p>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-green-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentStep + 1) / statusSteps.length) * 100}%` }}
        />
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          Current Status: <strong>{orderStatus}</strong>
        </p>
        <p className="text-xs text-blue-600 mt-1">
          {isConnected ? '🟢 Real-time updates enabled' : '🔴 Offline mode'}
        </p>
      </div>
    </div>
  );
}

/**
 * Example: Integrate into Farmer Dashboard
 * 
 * Add this to your farmer dashboard page:
 * 
 * import { OrderNotificationsWidget, OrderStatusTracker } from '@/app/components/OrderRealtimeExample';
 * 
 * export default function FarmerDashboard() {
 *   return (
 *     <div>
 *       <OrderNotificationsWidget />
 *       
 *       // Show status for specific order
 *       <OrderStatusTracker orderId="order-id-123" />
 *     </div>
 *   );
 * }
 */
