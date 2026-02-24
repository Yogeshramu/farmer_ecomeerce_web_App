'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/app/components/ui/Button';
import { ShoppingCart, MapPin, Clock, Package, Truck, CheckCircle } from 'lucide-react';
import { fetchWithAuth } from '@/lib/clientAuth';

interface Crop {
    id: string;
    name: string;
    quantityKg: number;
    basePrice: number;
    farmer: {
        name: string;
    };
}

interface CartItem extends Crop {
    cartQty: number;
}

interface OrderItem {
    id: string;
    crop: {
        name: string;
    };
    quantity: number;
    price: number;
}

interface Order {
    id: string;
    status: string;
    totalAmount: number;
    deliveryCharge: number;
    createdAt: string;
    farmer: {
        name: string;
    };
    items: OrderItem[];
}

export default function ConsumerDashboard() {
    const [crops, setCrops] = useState<Crop[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [view, setView] = useState<'market' | 'cart' | 'orders'>('market');
    const [orders, setOrders] = useState<Order[]>([]);

    // Checkout form
    const [pincode, setPincode] = useState('');
    const [address, setAddress] = useState('');
    const [time, setTime] = useState('Morning');
    const [loading, setLoading] = useState(false);

    const fetchCrops = useCallback(async () => {
        try {
            const res = await fetch('/api/crops');
            const data = await res.json();
            if (data.crops) setCrops(data.crops);
        } catch (error) {
            console.error(error);
        }
    }, []);

    const fetchOrders = useCallback(async () => {
        try {
            const res = await fetchWithAuth('/api/orders');
            const data = await res.json();
            if (data.orders) setOrders(data.orders);
        } catch (error) {
            console.error(error);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            await fetchCrops();
            await fetchOrders();
        };
        init();
    }, [fetchCrops, fetchOrders]);

    const addToCart = (crop: Crop, qty: number = 1) => {
        const existing = cart.find(c => c.id === crop.id);
        if (existing) {
            setCart(cart.map(c => c.id === crop.id ? { ...c, cartQty: c.cartQty + qty } : c));
        } else {
            setCart([...cart, { ...crop, cartQty: qty }]);
        }
    };

    const removeFromCart = (id: string) => {
        setCart(cart.filter(c => c.id !== id));
    };

    const placeOrder = async () => {
        if (!pincode || !address) {
            alert("Please enter delivery details");
            return;
        }
        setLoading(true);
        const items = cart.map(c => ({ cropId: c.id, quantity: c.cartQty }));
        try {
            const res = await fetchWithAuth('/api/orders', {
                method: 'POST',
                body: JSON.stringify({
                    items,
                    deliveryPincode: pincode,
                    deliveryAddress: address,
                    deliveryTime: time
                }),
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!res.ok) {
                const error = await res.json();
                if (res.status === 401) {
                    alert('Session expired. Please login again.');
                    window.location.href = '/consumer/login';
                    return;
                }
                alert(`Failed to place order: ${error.error || 'Unknown error'}`);
                setLoading(false);
                return;
            }
            
            alert('Order Place Successfully!');
            setCart([]);
            setView('orders');
            fetchOrders();
        } catch (error) {
            console.error(error);
            alert('Error placing order');
        }
        setLoading(false);
    };

    const totalCartPrice = cart.reduce((acc, item) => acc + (item.basePrice * item.cartQty), 0);

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
                <h1 className="text-xl font-bold text-blue-900">FarmDirect Market</h1>

                <div className="flex gap-4">
                    <Button variant="ghost" onClick={() => setView('market')} className={view === 'market' ? 'bg-blue-50 text-blue-700' : ''}>Market</Button>
                    <Button variant="ghost" onClick={() => setView('orders')} className={view === 'orders' ? 'bg-blue-50 text-blue-700' : ''}>Orders</Button>
                    <Button variant="secondary" onClick={() => setView('cart')} className="relative bg-blue-600 hover:bg-blue-700">
                        <ShoppingCart size={20} />
                        {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">{cart.length}</span>}
                    </Button>
                    <Button variant="outline" onClick={async () => {
                        await fetch('/api/auth/logout', { method: 'POST' });
                        window.location.href = '/';
                    }} className="text-red-600 hover:text-red-700">
                        Logout
                    </Button>
                </div>
            </header>

            <main className="p-6 max-w-5xl mx-auto">
                {view === 'market' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {crops.filter(crop => crop.quantityKg > 0).map(crop => (
                                <div key={crop.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center text-xl">🥗</div>
                                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md">From {crop.farmer.name}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800">{crop.name}</h3>
                                    <p className="text-slate-500 text-sm mb-4">Available: {crop.quantityKg} Kg</p>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-2xl font-bold text-blue-700">₹{crop.basePrice}<span className="text-sm font-normal text-slate-400">/kg</span></span>
                                        </div>

                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                max={crop.quantityKg}
                                                defaultValue="1"
                                                id={`qty-${crop.id}`}
                                                className="w-20 p-2 border border-slate-200 rounded-lg text-center font-bold"
                                                placeholder="Kg"
                                            />
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    const input = document.getElementById(`qty-${crop.id}`) as HTMLInputElement;
                                                    const qty = parseInt(input?.value || '1');
                                                    if (qty > 0 && qty <= crop.quantityKg) {
                                                        addToCart(crop, qty);
                                                        if (input) input.value = '1'; // Reset
                                                    } else {
                                                        alert(`Please enter a valid quantity (1-${crop.quantityKg} kg)`);
                                                    }
                                                }}
                                                className="flex-1 rounded-full bg-blue-600 hover:bg-blue-700"
                                            >
                                                Add to Cart
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {crops.filter(crop => crop.quantityKg > 0).length === 0 && <p className="text-slate-400 col-span-3 text-center py-20">No crops available right now.</p>}
                        </div>
                    </div>
                )}

                {view === 'cart' && (
                    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in">
                        {cart.length === 0 ? (
                            <div className="text-center py-20 space-y-4">
                                <ShoppingCart size={48} className="mx-auto text-slate-300" />
                                <p className="text-slate-500">Your cart is empty</p>
                                <Button onClick={() => setView('market')} variant="outline">Go to Market</Button>
                            </div>
                        ) : (
                            <>
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                    {cart.map(item => (
                                        <div key={item.id} className="p-4 flex justify-between items-center border-b border-slate-50 last:border-0">
                                            <div>
                                                <h4 className="font-bold text-slate-800">{item.name}</h4>
                                                <p className="text-sm text-slate-500">₹{item.basePrice} x {item.cartQty} kg</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="font-bold text-slate-900">₹{item.basePrice * item.cartQty}</span>
                                                <Button size="sm" variant="ghost" onClick={() => removeFromCart(item.id)} className="text-red-500 hover:bg-red-50">Remove</Button>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="p-4 bg-slate-50 flex justify-between items-center">
                                        <span className="font-medium text-slate-500">Subtotal</span>
                                        <span className="text-xl font-bold text-slate-900">₹{totalCartPrice}</span>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
                                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><MapPin size={20} className="text-blue-600" /> Delivery Details</h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Full Delivery Address *</label>
                                            <textarea
                                                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                                                placeholder="House No., Street, Landmark, Area"
                                                rows={3}
                                                value={address}
                                                onChange={e => setAddress(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Pincode *</label>
                                                <input
                                                    type="text"
                                                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                    placeholder="e.g. 600001"
                                                    value={pincode}
                                                    onChange={e => setPincode(e.target.value)}
                                                    maxLength={6}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Delivery Time *</label>
                                                <select
                                                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
                                                    value={time}
                                                    onChange={e => setTime(e.target.value)}
                                                >
                                                    <option value="Morning">Morning (8 AM - 12 PM)</option>
                                                    <option value="Afternoon">Afternoon (12 PM - 4 PM)</option>
                                                    <option value="Evening">Evening (4 PM - 8 PM)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-slate-600">Subtotal</span>
                                            <span className="font-bold text-slate-900">₹{totalCartPrice}</span>
                                        </div>
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-slate-600">Delivery Charge</span>
                                            <span className="font-bold text-emerald-600">FREE</span>
                                        </div>
                                        <div className="flex justify-between items-center text-lg pt-3 border-t border-slate-100">
                                            <span className="font-bold text-slate-900">Total Amount</span>
                                            <span className="font-bold text-blue-700 text-2xl">₹{totalCartPrice}</span>
                                        </div>
                                    </div>

                                    <Button onClick={placeOrder} isLoading={loading} className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">
                                        Place Order
                                    </Button>
                                    <p className="text-xs text-center text-slate-400">💰 Cash on Delivery • 🚜 Direct from Farmer</p>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {view === 'orders' && (
                    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6">Your Order History</h2>
                        {orders.length === 0 ? <p className="text-slate-500">No orders placed yet.</p> : orders.map(order => (
                            <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <div className="flex justify-between mb-6">
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-lg">Order #{order.id.slice(0, 8)}</h3>
                                        <p className="text-sm text-slate-500">From: {order.farmer?.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-slate-900">₹{order.totalAmount}</p>
                                        <p className="text-xs text-slate-400">+ ₹{order.deliveryCharge} Delivery</p>
                                    </div>
                                </div>

                                {/* Order Tracker */}
                                <OrderTracker status={order.status} />

                                <div className="border-t border-slate-100 pt-4 space-y-2 mt-6">
                                    {order.items.map((item: OrderItem) => (
                                        <div key={item.id} className="flex justify-between text-sm">
                                            <span className="text-slate-600 font-medium">{item.crop.name} <span className="text-slate-400">(x{item.quantity} kg)</span></span>
                                            <span className="font-bold text-slate-800">₹{item.price * item.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

function OrderTracker({ status }: { status: string }) {
    const steps = [
        { key: 'PLACED', label: 'Placed', icon: Clock },
        { key: 'ACCEPTED', label: 'Accepted', icon: Package },
        { key: 'OUT_FOR_DELIVERY', label: 'On Way', icon: Truck },
        { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
    ];

    // Calculate current step index
    const currentStepIndex = steps.findIndex(s => s.key === status);

    return (
        <div className="relative flex justify-between items-center w-full my-6 px-2">
            {/* Progress Bar Background */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -z-0"></div>
            {/* Active Progress Bar */}
            <div
                className="absolute top-1/2 left-0 h-1 bg-emerald-500 -z-0 transition-all duration-500"
                style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
            ></div>

            {steps.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isActive = index === currentStepIndex;
                const Icon = step.icon;

                return (
                    <div key={step.key} className="flex flex-col items-center gap-2 z-10 bg-white px-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                            ${isCompleted ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-white border-slate-200 text-slate-300'}
                            ${isActive ? 'ring-4 ring-emerald-100 scale-110' : ''}
                        `}>
                            <Icon size={18} />
                        </div>
                        <span className={`text-[10px] uppercase font-bold tracking-wider transition-colors duration-300
                             ${isCompleted ? 'text-emerald-700' : 'text-slate-300'}
                        `}>{step.label}</span>
                    </div>
                );
            })}
        </div>
    );
}
