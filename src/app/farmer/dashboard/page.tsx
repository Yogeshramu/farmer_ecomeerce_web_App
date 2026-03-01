'use client';

import React, { useState, useEffect, useCallback } from 'react';
import VoiceQAFlow from '@/app/components/VoiceQAFlow';
import { Button } from '@/app/components/ui/Button';
import { Package, Truck, CheckCircle, Clock, Volume2, Trash2, Pencil, Check, X, Sparkles } from 'lucide-react';
import { fetchWithAuth } from '@/lib/clientAuth';

interface Crop {
    id: string;
    name: string;
    quantityKg: number;
    basePrice: number;
}

interface OrderItem {
    id: string;
    crop?: {
        name: string;
    };
    quantity: number;
    price: number;
}

interface Order {
    id: string;
    createdAt: string;
    status: string;
    totalAmount: number;
    deliveryCharge: number;
    deliveryTime?: string;
    deliveryAddress?: string;
    deliveryPincode?: string;
    consumer?: {
        name: string;
        mobile: string;
        email: string;
    };
    items?: OrderItem[];
}

export default function FarmerDashboard() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [pincode] = useState('600001');

    // Crop form
    const [cropName, setCropName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [basePrice, setBasePrice] = useState('40'); // Default price, now editable
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [myCrops, setMyCrops] = useState<Crop[]>([]);
    const [editingCropId, setEditingCropId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: '', quantityKg: '', basePrice: '' });

    // WebSocket State
    const [socket, setSocket] = useState<WebSocket | null>(null); // Use native WebSocket type by not importing 'ws' or using 'any' if needed
    const [wsConnected, setWsConnected] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [ordersRes, cropsRes] = await Promise.all([
                fetchWithAuth('/api/orders'),
                fetchWithAuth('/api/crops?mine=true')
            ]);

            const ordersData = await ordersRes.json();
            const cropsData = await cropsRes.json();

            if (ordersData.orders) setOrders(ordersData.orders);
            if (cropsData.crops) setMyCrops(cropsData.crops);
        } catch (error: unknown) { // Changed 'any' to 'unknown'
            console.error(error);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            await fetchData();
        };
        init();

        // Internal WebSocket setup
        let ws: WebSocket | null = null;

        const setupSocket = async () => {
            try {
                // Get auth token for WS
                const tokenRes = await fetch('/api/auth/socket-token');
                if (!tokenRes.ok) return;
                const { token } = await tokenRes.json();

                ws = new WebSocket('ws://localhost:8080');

                ws.onopen = () => {
                    console.log('WS Connected');
                    ws?.send(JSON.stringify({ type: 'AUTH', token }));
                };

                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    if (data.type === 'AUTH_SUCCESS') {
                        setSocket(ws);
                        setWsConnected(true);
                    }
                    if (data.type === 'CROP_ADDED') {
                        setIsSubmitting(false);
                        setCropName('');
                        setQuantity('');
                        setBasePrice('40'); // Reset to default
                        alert(`Successfully added ${data.crop.name} (via WebSocket)`);
                        fetchData();
                    }
                    if (data.type === 'ERROR') {
                        setIsSubmitting(false);
                        alert(`WebSocket Error: ${data.message}`);
                    }
                };

                ws.onerror = () => {
                    console.log("WebSocket connection failed (server likely not running). Using HTTP fallback.");
                };
            } catch (err) {
                console.log("WS Setup error", err);
            }
        };

        setupSocket();

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                console.log("Farmer loc:", pos.coords);
            });
        }

        return () => {
            if (ws) ws.close();
        };
    }, [fetchData]);

    const deleteCrop = async (id: string) => {
        console.log("Attempting to delete crop:", id);

        // Optimistic UI update - remove it immediately to see if it feels "stuck"
        const previousCrops = [...myCrops];
        setMyCrops(prev => prev.filter(c => c.id !== id));

        try {
            const res = await fetch(`/api/crops/${id}`, { method: 'DELETE' });
            console.log("Delete response status:", res.status);

            if (res.ok) {
                // alert('Crop deleted successfully');
                await fetchData(); // Sync truth
            } else {
                // Revert if failed
                setMyCrops(previousCrops);
                const error = await res.json();
                console.error("Delete failed server-side:", error);
                alert(`Failed to delete (Server Error ${res.status}): ${error.error || error.message || 'Unknown'}`);
            }
        } catch (err) {
            setMyCrops(previousCrops);
            console.error('Delete network error:', err);
            alert('Failed to delete: Network error or server unreachable');
        }
    };

    const startEdit = (crop: Crop) => {
        setEditingCropId(crop.id);
        setEditForm({ name: crop.name, quantityKg: crop.quantityKg.toString(), basePrice: crop.basePrice.toString() });
    };

    const saveEdit = async (id: string) => {
        try {
            // Update the crop - only update fields that are provided
            const updateData: Record<string, unknown> = {}; // Moved this declaration here
            if (editForm.name) updateData.name = editForm.name;
            if (editForm.quantityKg) updateData.quantityKg = parseFloat(editForm.quantityKg);
            if (editForm.basePrice) updateData.basePrice = parseFloat(editForm.basePrice);

            const res = await fetch(`/api/crops/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(updateData), // Use updateData for partial update
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                alert('Crop updated successfully!');
                setEditingCropId(null);
                fetchData();
            } else {
                const error = await res.json();
                alert(`Failed to update: ${error.error || 'Unknown error'}`);
            }
        } catch (error: unknown) { // Changed 'any' to 'unknown'
            console.error('Update error:', error);
            alert('Failed to update crop. Please try again.');
        }
    };

    const cancelEdit = () => {
        setEditingCropId(null);
        setEditForm({ name: '', quantityKg: '', basePrice: '' });
    };

    const onCropDataComplete = (data: { name: string; quantityKg: string; basePrice: string }) => {
        console.log("Voice Q&A Complete:", data);

        // Set the crop data
        setCropName(data.name);
        setQuantity(data.quantityKg);
        setBasePrice(data.basePrice);

        // Auto-submit the crop
        submitCropWithData(data);
    };

    const submitCropWithData = async (data: { name: string; quantityKg: string; basePrice: string }) => {
        if (!data.name || !data.quantityKg) return;
        setIsSubmitting(true);

        // PRIORITIZE WEBSOCKET IF CONNECTED
        if (wsConnected && socket && socket.readyState === WebSocket.OPEN) {
            console.log("Submitting via WebSocket...");
            socket.send(JSON.stringify({
                type: 'ADD_CROP',
                crop: { name: data.name, quantityKg: data.quantityKg, basePrice: data.basePrice, farmerPincode: pincode }
            }));
            // Rest of logic handled in onmessage
            return;
        }

        try {
            await fetch('/api/crops', {
                method: 'POST',
                body: JSON.stringify({ name: data.name, quantityKg: data.quantityKg, basePrice: data.basePrice, farmerPincode: pincode }),
                headers: { 'Content-Type': 'application/json' }
            });
            setCropName('');
            setQuantity('');
            setBasePrice('40'); // Reset to default
            alert('Crop Uploaded Successfully!');
            fetchData();
        } catch {
            alert('Failed to upload');
        }
        setIsSubmitting(false);
    };

    const submitCrop = async () => {
        if (!cropName || !quantity) return;
        setIsSubmitting(true);

        // PRIORITIZE WEBSOCKET IF CONNECTED
        if (wsConnected && socket && socket.readyState === WebSocket.OPEN) {
            console.log("Submitting via WebSocket...");
            socket.send(JSON.stringify({
                type: 'ADD_CROP',
                crop: { name: cropName, quantityKg: quantity, basePrice: basePrice, farmerPincode: pincode }
            }));
            // Rest of logic handled in onmessage
            return;
        }

        try {
            await fetch('/api/crops', {
                method: 'POST',
                body: JSON.stringify({ name: cropName, quantityKg: quantity, basePrice, farmerPincode: pincode }),
                headers: { 'Content-Type': 'application/json' }
            });
            setCropName('');
            setQuantity('');
            setBasePrice('40'); // Reset to default
            alert('Crop Uploaded Successfully!');
            fetchData();
        } catch {
            alert('Failed to upload');
        }
        setIsSubmitting(false);
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            const res = await fetchWithAuth(`/api/orders/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) {
                const error = await res.json();
                if (res.status === 401) {
                    alert('Session expired. Please login again.');
                    window.location.href = '/farmer/login';
                    return;
                }
                alert(`Failed to update status: ${error.error || 'Unknown error'}`);
                return;
            }

            fetchData();
        } catch (error) {
            console.error('Update status error:', error);
            alert('Failed to update order status');
        }
    };

    const speakOrder = (order: Order) => {
        const text = `New Order. ${order.items?.length || 0} items. Total ${order.totalAmount} Rupees.`;
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    };

    // Tab State
    const [activeTab, setActiveTab] = useState<'orders' | 'add' | 'listings'>('orders');
    const [addMode, setAddMode] = useState<'voice' | 'manual'>('voice');

    // ... (rest of existing state and logic remains, I will just re-render the return)

    // Calculate Sales Stats
    const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white sticky top-0 z-10 border-b border-slate-100 px-4 py-3 md:px-8 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="bg-emerald-100 p-2 rounded-lg">
                        <Package className="text-emerald-700" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">FarmDirect</h1>
                        <p className="text-xs text-slate-500">Farmer Dashboard</p>
                    </div>
                </div>

                <div className="flex gap-2 items-center">
                    <span className="hidden md:block text-xs font-mono bg-slate-100 text-slate-600 px-3 py-1 rounded-full">{pincode}</span>
                    <Button size="sm" onClick={async () => {
                        await fetch('/api/auth/logout', { method: 'POST' });
                        window.location.href = '/';
                    }} variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 size={18} />
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">

                {/* Stats Summary - Compact */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Earnings</p>
                            <h2 className="text-2xl font-bold text-emerald-600">₹{totalSales.toLocaleString()}</h2>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded-full text-emerald-600">
                            <Clock size={20} />
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Listings</p>
                            <h2 className="text-2xl font-bold text-slate-800">{myCrops.length}</h2>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-full text-blue-600">
                            <Package size={20} />
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs - 3 Way Split */}
                <div className="bg-white p-1 rounded-xl border border-slate-200 grid grid-cols-3 gap-1">
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`py-2.5 rounded-lg text-sm font-bold transition-all flex flex-col md:flex-row items-center justify-center gap-2 ${activeTab === 'orders' ? 'bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                        <Truck size={20} />
                        <span>Orders</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('add')}
                        className={`py-2.5 rounded-lg text-sm font-bold transition-all flex flex-col md:flex-row items-center justify-center gap-2 ${activeTab === 'add' ? 'bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                        <Volume2 size={20} />
                        <span>Add Crop</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('listings')}
                        className={`py-2.5 rounded-lg text-sm font-bold transition-all flex flex-col md:flex-row items-center justify-center gap-2 ${activeTab === 'listings' ? 'bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                        <Package size={20} />
                        <span>My Listings</span>
                    </button>
                </div>

                {/* TAB 1: ORDERS */}
                {activeTab === 'orders' && (
                    <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800">Recent Orders</h2>
                            <Button variant="ghost" size="sm" onClick={fetchData} className="text-emerald-600">
                                <Clock size={16} className="mr-1" /> Refresh
                            </Button>
                        </div>
                        {orders.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Truck className="text-slate-300" size={32} />
                                </div>
                                <h3 className="text-slate-900 font-medium">No active orders</h3>
                                <p className="text-slate-400 text-sm mt-1">Orders from consumers will appear here.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                                {orders.map(order => (
                                    <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                                        {/* ... Existing Order Card UI ... */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">#{order.id.slice(0, 8)}</span>
                                                    <span className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <StatusIcon status={order.status} />
                                                    <span className="font-bold text-slate-700">{order.status.replace(/_/g, " ")}</span>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => speakOrder(order)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Volume2 size={20} className="text-slate-400 hover:text-emerald-600" />
                                            </Button>
                                        </div>

                                        <div className="space-y-3 mb-6">
                                            {order.items?.map((item) => (
                                                <div key={item.id} className="flex justify-between text-sm py-2 border-b border-dashed border-slate-100 last:border-0">
                                                    <span className="text-slate-700 font-medium">{item.crop?.name} <span className="text-slate-400 font-normal">x {item.quantity} kg</span></span>
                                                    <span className="font-bold text-slate-900">₹{item.price * item.quantity}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Items: ₹{order.totalAmount} + Delivery: ₹{order.deliveryCharge}</p>
                                                <p className="text-xs text-slate-400 uppercase font-bold">Total</p>
                                                <p className="text-xl font-bold text-emerald-700">₹{order.totalAmount + order.deliveryCharge}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {order.status === 'PLACED' && <Button size="sm" onClick={() => updateStatus(order.id, 'ACCEPTED')} className="bg-blue-600 hover:bg-blue-700 rounded-lg">Accept</Button>}
                                                {order.status === 'ACCEPTED' && <Button size="sm" onClick={() => updateStatus(order.id, 'OUT_FOR_DELIVERY')} className="bg-purple-600 hover:bg-purple-700 rounded-lg">Dispatch</Button>}
                                                {order.status === 'OUT_FOR_DELIVERY' && <Button size="sm" onClick={() => updateStatus(order.id, 'DELIVERED')} className="bg-emerald-600 hover:bg-emerald-700 rounded-lg">Delivered</Button>}
                                            </div>
                                        </div>

                                        {/* Expandable Details (could be added) */}
                                        <div className="mt-4 bg-slate-50 p-3 rounded-xl text-xs text-slate-500">
                                            <p>📍 {order.deliveryAddress || 'No Address'}</p>
                                            <p className="mt-1">📞 {order.consumer?.mobile || 'No Phone'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* TAB 2: ADD CROP (VOICE AI OR MANUAL) */}
                {activeTab === 'add' && (
                    <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Mode Toggle */}
                        <div className="bg-white p-1 rounded-xl border border-slate-200 grid grid-cols-2 gap-1 max-w-md mx-auto">
                            <button onClick={() => setAddMode('voice')} className={`py-2 rounded-lg text-sm font-bold transition-all ${addMode === 'voice' ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-slate-400'}`}>
                                <Volume2 size={16} className="inline mr-1" /> Voice AI
                            </button>
                            <button onClick={() => setAddMode('manual')} className={`py-2 rounded-lg text-sm font-bold transition-all ${addMode === 'manual' ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-slate-400'}`}>
                                <Pencil size={16} className="inline mr-1" /> Manual
                            </button>
                        </div>

                        {addMode === 'voice' ? (
                            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-3xl p-6 md:p-12 border border-emerald-100 shadow-lg shadow-emerald-50 relative overflow-hidden min-h-[500px] flex flex-col justify-center">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <Sparkles size={200} />
                                </div>
                                <div className="relative z-10 w-full max-w-lg mx-auto">
                                    <div className="text-center mb-8">
                                        <h2 className="text-3xl font-bold text-slate-800 mb-2">AI Voice Assistant</h2>
                                        <p className="text-slate-500 text-lg">Speak naturally to describe your crop:</p>
                                        <p className="text-emerald-600 font-medium mt-2 text-lg italic">"Tell me the crop name, quantity, and price. I can even suggest prices!"</p>
                                        {wsConnected && <span className="inline-block mt-4 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">⚡ Intelligent AI Active</span>}
                                    </div>
                                    <VoiceQAFlow onComplete={(data) => {
                                        onCropDataComplete(data);
                                        setTimeout(() => setActiveTab('listings'), 2000);
                                    }} />
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm max-w-md mx-auto">
                                <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Add Crop Manually</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Crop Name</label>
                                        <input type="text" value={cropName} onChange={(e) => setCropName(e.target.value)} placeholder="e.g., Tomato" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Quantity (kg)</label>
                                        <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g., 50" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Price per kg (₹)</label>
                                        <input type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="e.g., 40" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                                    </div>
                                    <Button onClick={submitCrop} isLoading={isSubmitting} disabled={!cropName || !quantity} className="w-full bg-emerald-600 hover:bg-emerald-700 py-3 rounded-xl font-bold">
                                        Add Crop
                                    </Button>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* TAB 3: MY LISTINGS */}
                {activeTab === 'listings' && (
                    <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-slate-800">Your Listings</h2>
                            <div className="text-xs text-slate-400">
                                {myCrops.length} crops listed
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            {myCrops.map(crop => (
                                <div key={crop.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 transition-all hover:border-emerald-200 group">
                                    {editingCropId === crop.id ? (
                                        // Edit Mode (Simplified for brevity)
                                        <div className="space-y-3">
                                            <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full p-3 bg-slate-50 border-0 rounded-xl font-bold text-slate-900" placeholder="Crop Name" />
                                            <div className="grid grid-cols-2 gap-3">
                                                <input value={editForm.quantityKg} onChange={(e) => setEditForm({ ...editForm, quantityKg: e.target.value })} className="w-full p-3 bg-slate-50 border-0 rounded-xl text-emerald-600 font-bold" placeholder="Qty" />
                                                <input value={editForm.basePrice} onChange={(e) => setEditForm({ ...editForm, basePrice: e.target.value })} className="w-full p-3 bg-slate-50 border-0 rounded-xl text-emerald-600 font-bold" placeholder="Price" />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={() => saveEdit(crop.id)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 rounded-xl">Save</Button>
                                                <Button size="sm" variant="ghost" onClick={cancelEdit} className="flex-1 rounded-xl">Cancel</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        // View Mode
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-2xl shadow-inner">
                                                    {crop.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 text-lg capitalize">{crop.name}</h3>
                                                    <div className="flex gap-3 text-sm mt-1">
                                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium text-xs uppercase tracking-wide">{crop.quantityKg} kg</span>
                                                        <span className="text-emerald-700 font-bold">₹{crop.basePrice}/kg</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 bg-slate-50" onClick={() => startEdit(crop)}>
                                                    <Pencil size={18} />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 bg-slate-50" onClick={() => deleteCrop(crop.id)}>
                                                    <Trash2 size={18} />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {myCrops.length === 0 && (
                                <div className="text-center py-20 px-4 col-span-2 bg-white rounded-3xl border border-dashed border-slate-200">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                        <Package size={32} />
                                    </div>
                                    <p className="text-slate-500 font-medium">You have no active listings.</p>
                                    <Button variant="ghost" onClick={() => setActiveTab('add')} className="text-emerald-600 mt-2 hover:bg-emerald-50">
                                        Go to Add Crop
                                    </Button>
                                </div>
                            )}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}

function StatusIcon({ status }: { status: string }) {
    if (status === 'PLACED') return <Clock className="text-amber-500" size={24} />;
    if (status === 'ACCEPTED') return <Package className="text-blue-500" size={24} />;
    if (status === 'OUT_FOR_DELIVERY') return <Truck className="text-purple-500" size={24} />;
    return <CheckCircle className="text-emerald-500" size={24} />;
}
