'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { VoiceInput } from '@/app/components/VoiceInput';
import { Button } from '@/app/components/ui/Button';
import { Package, Truck, CheckCircle, Clock, Volume2, Trash2, Pencil, Check, X } from 'lucide-react';

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
    const [basePrice] = useState('40'); // Default price logic
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [myCrops, setMyCrops] = useState<Crop[]>([]);
    const [editingCropId, setEditingCropId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: '', quantityKg: '', basePrice: '' });

    const fetchData = useCallback(async () => {
        try {
            const [ordersRes, cropsRes] = await Promise.all([
                fetch('/api/orders'),
                fetch('/api/crops?mine=true')
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
        // Wrap the async call to avoid set-state-in-effect sync warning
        init();
        // Simple geolocation simulation
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                console.log("Farmer loc:", pos.coords);
            });
        }
    }, [fetchData]);

    const deleteCrop = async (id: string) => {
        if (!confirm("Are you sure you want to delete this crop?")) return;
        await fetch(`/api/crops/${id}`, { method: 'DELETE' });
        fetchData();
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

    const handleVoiceResult = (text: string) => {
        console.log("Voice Captured:", text);
        // Logic: "Potato 50" -> Name: Potato, Qty: 50
        const match = text.match(/([a-zA-Z\s]+)(\d+)/);
        if (match) {
            setCropName(match[1].trim());
            setQuantity(match[2]);
        } else {
            setCropName(text);
        }
    };

    const submitCrop = async () => {
        if (!cropName || !quantity) return;
        setIsSubmitting(true);
        try {
            await fetch('/api/crops', {
                method: 'POST',
                body: JSON.stringify({ name: cropName, quantityKg: quantity, basePrice, farmerPincode: pincode }),
                headers: { 'Content-Type': 'application/json' }
            });
            setCropName('');
            setQuantity('');
            alert('Crop Uploaded Successfully!');
            fetchData();
        } catch {
            alert('Failed to upload');
        }
        setIsSubmitting(false);
    };

    const updateStatus = async (id: string, status: string) => {
        await fetch(`/api/orders/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
            headers: { 'Content-Type': 'application/json' }
        });
        fetchData();
    };

    const speakOrder = (order: Order) => {
        const text = `New Order. ${order.items?.length || 0} items. Total ${order.totalAmount} Rupees.`;
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    };

    // Calculate Sales Stats
    const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);

    return (
        <div className="min-h-screen bg-emerald-50/50 p-4 md:p-8 space-y-8 pb-20">
            <header className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-emerald-900">Farmer Dashboard</h1>
                    <p className="text-sm text-slate-500">Welcome, Farmer</p>
                </div>
                <div className="flex gap-2 items-center">
                    <Button size="sm" onClick={() => window.location.href = '/interview'} variant="outline">
                        Take Survey
                    </Button>
                    <span className="text-xs font-mono bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">{pincode}</span>
                </div>
            </header>

            {/* Voice Upload Section */}
            <section className="bg-white p-6 rounded-3xl shadow-lg shadow-emerald-100/50 border border-emerald-100 flex flex-col items-center gap-8 text-center">
                <div className="space-y-2">
                    <h2 className="text-xl font-bold text-slate-800">Add New Crop</h2>
                    <p className="text-slate-500">Tap the mic and say &quot;Tomato 50&quot;</p>
                </div>

                <VoiceInput onResult={handleVoiceResult} />

                <div className="w-full max-w-xs space-y-4 animate-in fade-in">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <div className="grid grid-cols-2 gap-4 divide-x divide-slate-200">
                            <div>
                                <span className="text-xs text-slate-400 uppercase tracking-wider">Crop</span>
                                <p className="text-lg font-bold text-slate-800 break-words">{cropName || "-"}</p>
                            </div>
                            <div>
                                <span className="text-xs text-slate-400 uppercase tracking-wider">Qty (Kg)</span>
                                <p className="text-lg font-bold text-emerald-600">{quantity || "-"}</p>
                            </div>
                        </div>
                    </div>

                    {cropName && quantity && (
                        <Button onClick={submitCrop} isLoading={isSubmitting} className="w-full text-lg h-12 shadow-emerald-500/30 shadow-lg">
                            Confirm Upload
                        </Button>
                    )}
                </div>
            </section>

            {/* Orders */}
            <section className="space-y-6">
                <h2 className="text-xl font-bold text-slate-800 px-2">Active Orders</h2>
                {orders.length === 0 ? (
                    <p className="text-center text-slate-400 py-10">No active orders yet.</p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {orders.map(order => (
                            <div key={order.id} className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-50 flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-slate-900 text-lg">Order #{order.id.slice(0, 8)}</h3>
                                        <p className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => speakOrder(order)}>
                                        <Volume2 size={20} className="text-slate-400" />
                                    </Button>
                                </div>

                                {/* Customer Details */}
                                <div className="bg-blue-50 p-3 rounded-lg space-y-2">
                                    <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">Customer Details</p>
                                    <div className="space-y-1 text-sm">
                                        <p className="font-medium text-slate-900">{order.consumer?.name || 'N/A'}</p>
                                        <p className="text-slate-600">📱 {order.consumer?.mobile || 'N/A'}</p>
                                        <p className="text-slate-600">📧 {order.consumer?.email || 'N/A'}</p>
                                    </div>
                                </div>

                                {/* Delivery Details */}
                                <div className="bg-emerald-50 p-3 rounded-lg space-y-2">
                                    <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Delivery Details</p>
                                    <div className="space-y-1 text-sm">
                                        <p className="text-slate-700 font-medium">📍 {order.deliveryAddress}</p>
                                        <p className="text-slate-600">📮 Pincode: {order.deliveryPincode}</p>
                                        <p className="text-slate-600">🕐 Time: {order.deliveryTime}</p>
                                    </div>
                                </div>

                                {/* Order Items */}
                                <div className="border-t border-slate-100 pt-3 space-y-2">
                                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Items</p>
                                    {order.items?.map((item) => (
                                        <div key={item.id} className="flex justify-between text-sm">
                                            <span className="text-slate-700">{item.crop?.name} <span className="text-slate-400">(x{item.quantity} kg)</span></span>
                                            <span className="font-bold text-slate-900">₹{item.price * item.quantity}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Total & Status */}
                                <div className="border-t border-slate-100 pt-3 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-600">Subtotal</span>
                                        <span className="font-bold">₹{order.totalAmount}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-600">Delivery Charge</span>
                                        <span className="font-bold text-emerald-600">₹{order.deliveryCharge}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-lg pt-2 border-t border-slate-100">
                                        <span className="font-bold">Grand Total</span>
                                        <span className="font-bold text-emerald-700">₹{order.totalAmount + order.deliveryCharge}</span>
                                    </div>
                                </div>

                                {/* Status & Actions */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <StatusIcon status={order.status} />
                                        <span className="text-xs font-semibold text-slate-600 tracking-wide">{order.status.replace(/_/g, " ")}</span>
                                    </div>

                                    <div className="flex gap-2">
                                        {order.status === 'PLACED' && (
                                            <Button size="sm" onClick={() => updateStatus(order.id, 'ACCEPTED')} className="bg-blue-600 hover:bg-blue-700">
                                                Accept
                                            </Button>
                                        )}
                                        {order.status === 'ACCEPTED' && (
                                            <Button size="sm" onClick={() => updateStatus(order.id, 'OUT_FOR_DELIVERY')} className="bg-purple-600 hover:bg-purple-700">
                                                Dispatch
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* My Crops & Stats */}
            <section className="space-y-6 pt-6 border-t border-emerald-100">
                <div className="flex justify-between items-end px-2">
                    <h2 className="text-xl font-bold text-slate-800">My Crops</h2>
                    <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase tracking-wider">Total Sales</p>
                        <p className="text-xl font-bold text-emerald-600">₹{totalSales}</p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {myCrops.map(crop => (
                        <div key={crop.id} className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-50">
                            {editingCropId === crop.id ? (
                                // Edit Mode
                                <div className="space-y-3">
                                    <input
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full p-2 border border-slate-200 rounded-lg font-bold text-slate-900"
                                        placeholder="Crop Name"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            value={editForm.quantityKg}
                                            onChange={(e) => setEditForm({ ...editForm, quantityKg: e.target.value })}
                                            className="w-full p-2 border border-slate-200 rounded-lg text-emerald-600"
                                            placeholder="Quantity (Kg)"
                                        />
                                        <input
                                            value={editForm.basePrice}
                                            onChange={(e) => setEditForm({ ...editForm, basePrice: e.target.value })}
                                            className="w-full p-2 border border-slate-200 rounded-lg text-emerald-600"
                                            placeholder="Price (₹/kg)"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={() => saveEdit(crop.id)} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                                            <Check size={16} className="mr-1" /> Save
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={cancelEdit} className="flex-1">
                                            <X size={16} className="mr-1" /> Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                // View Mode
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-lg">{crop.name}</h3>
                                        <p className="text-emerald-600 font-medium">{crop.quantityKg} Kg <span className="text-slate-400 text-xs">@ ₹{crop.basePrice}/kg</span></p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="sm" className="text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => startEdit(crop)}>
                                            <Pencil size={18} />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => deleteCrop(crop.id)}>
                                            <Trash2 size={18} />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {myCrops.length === 0 && <p className="text-slate-400 italic px-4 text-center col-span-2">You haven&apos;t added any crops yet. Use the voice input above!</p>}
                </div>
            </section>
        </div>
    );
}

function StatusIcon({ status }: { status: string }) {
    if (status === 'PLACED') return <Clock className="text-amber-500" size={24} />;
    if (status === 'ACCEPTED') return <Package className="text-blue-500" size={24} />;
    if (status === 'OUT_FOR_DELIVERY') return <Truck className="text-purple-500" size={24} />;
    return <CheckCircle className="text-emerald-500" size={24} />;
}
