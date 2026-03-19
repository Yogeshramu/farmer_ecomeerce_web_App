'use client';

import React, { useState, useEffect, useCallback } from 'react';
import VoiceQAFlow from '@/app/components/VoiceQAFlow';
import PriceInsightsChart from '@/app/components/PriceInsightsChart';
import { Button } from '@/app/components/ui/Button';
import { Package, Truck, CheckCircle, Clock, Volume2, Trash2, Pencil, Sparkles, MessageSquare, MapPin, TrendingUp, Leaf, Star } from 'lucide-react';
import { fetchWithAuth } from '@/lib/clientAuth';

interface Crop {
    id: string;
    name: string;
    quantityKg: number;
    basePrice: number;
    farmerId: string;
    farmer?: {
        name: string;
    }
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
    contactNumber?: string;
    review?: {
        rating: number;
        comment?: string;
    };
}

interface Review {
    id: string;
    rating: number;
    comment?: string;
    createdAt: string;
    crop: {
        name: string;
    };
    consumer: {
        name: string;
    };
}

interface Inquiry {
    id: string;
    message: string;
    quantity?: number;
    proposedPrice?: number;
    deliveryAddress?: string;
    contactNumber?: string;
    createdAt: string;
    crop?: {
        name: string;
    };
    consumer?: {
        name: string;
        mobile: string;
        email: string;
    }
}

export default function FarmerDashboard() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [user, setUser] = useState<{ id: string, name: string } | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };
    const [pincode] = useState('600001');

    // Crop form
    const [cropName, setCropName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [basePrice, setBasePrice] = useState('40'); // Default price, now editable
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [allCrops, setAllCrops] = useState<Crop[]>([]);
    const [editingCropId, setEditingCropId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: '', quantityKg: '', basePrice: '' });

    // WebSocket State
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [wsConnected, setWsConnected] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [ordersRes, cropsRes, inquiriesRes, reviewsRes, authRes] = await Promise.all([
                fetchWithAuth('/api/orders'),
                fetchWithAuth('/api/crops'),
                fetchWithAuth('/api/inquiries'),
                fetchWithAuth('/api/reviews'),
                fetchWithAuth('/api/auth/check')
            ]);

            const ordersData = await ordersRes.json();
            const cropsData = await cropsRes.json();
            const inquiriesData = await inquiriesRes.json();
            const reviewsData = await reviewsRes.json();
            const authData = await authRes.json();

            if (ordersData.orders) setOrders(ordersData.orders);
            if (cropsData.crops) setAllCrops(cropsData.crops);
            if (inquiriesData.inquiries) setInquiries(inquiriesData.inquiries);
            if (reviewsData.reviews) setReviews(reviewsData.reviews);
            if (authData.user) setUser(authData.user);
        } catch (error: unknown) {
            showToast('Failed to connect to server', 'error');
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
                        showToast(`Successfully added ${data.crop.name}`, 'success');
                        fetchData();
                    }
                    if (data.type === 'ERROR') {
                        setIsSubmitting(false);
                        showToast(`Server Error: ${data.message}`, 'error');
                    }
                };

                ws.onerror = () => {
                    // WebSocket failed, HTTP fallback will be used
                };
            } catch (err) {
                // Setup failed
            }
        };

        setupSocket();

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(() => {
                // Background location captured
            });
        }

        return () => {
            if (ws) ws.close();
        };
    }, [fetchData]);

    const deleteCrop = async (id: string) => {
        // Optimistic UI update
        const previousCrops = [...allCrops];
        setAllCrops(prev => prev.filter(c => c.id !== id));

        try {
            const res = await fetch(`/api/crops/${id}`, { method: 'DELETE' });

            if (res.ok) {
                showToast('Crop deleted | பயிர் நீக்கப்பட்டது', 'success');
                await fetchData(); // Sync truth
            } else {
                // Revert if failed
                setAllCrops(previousCrops);
                const error = await res.json();
                showToast(`Failed to delete: ${error.error || error.message || 'Unknown'}`, 'error');
            }
        } catch (err) {
            setAllCrops(previousCrops);
            showToast('Failed to delete: Network error', 'error');
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
                showToast('Crop updated successfully', 'success');
                setEditingCropId(null);
                fetchData();
            } else {
                const error = await res.json();
                showToast(`Failed to update: ${error.error || 'Unknown error'}`, 'error');
            }
        } catch (error: unknown) { // Changed 'any' to 'unknown'
            showToast('Failed to update crop: Network error', 'error');
        }
    };

    const cancelEdit = () => {
        setEditingCropId(null);
        setEditForm({ name: '', quantityKg: '', basePrice: '' });
    };

    const onCropDataComplete = (data: { name: string; quantityKg: string; basePrice: string }) => {
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
            showToast('Crop Uploaded Successfully!', 'success');
            fetchData();
        } catch {
            showToast('Failed to upload crop', 'error');
        }
        setIsSubmitting(false);
    };

    const submitCrop = async () => {
        if (!cropName || !quantity) return;
        setIsSubmitting(true);

        // PRIORITIZE WEBSOCKET IF CONNECTED
        if (wsConnected && socket && socket.readyState === WebSocket.OPEN) {
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
            showToast('Crop Uploaded Successfully!', 'success');
            fetchData();
        } catch {
            showToast('Failed to upload crop', 'error');
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
                    showToast('Session expired. Please login again.', 'error');
                    setTimeout(() => window.location.href = '/farmer/login', 2000);
                    return;
                }
                showToast(`Failed to update status: ${error.error || 'Unknown error'}`, 'error');
                return;
            }

            fetchData();
        } catch (error) {
            showToast('Failed to update order status', 'error');
        }
    };

    const speakOrder = (order: Order) => {
        const text = `New Order. ${order.items?.length || 0} items. Total ${order.totalAmount} Rupees.`;
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    };

    // Tab State
    const [activeTab, setActiveTab] = useState<'orders' | 'add' | 'listings' | 'inquiries' | 'prices' | 'reviews'>('orders');
    const [addMode, setAddMode] = useState<'voice' | 'manual'>('voice');

    // ... (rest of existing state and logic remains, I will just re-render the return)

    // Calculate Sales Stats
    const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);

    return (
        <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900 pb-20 selection:bg-emerald-100 selection:text-emerald-900">
            {toast && (
                <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-[28px] shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300 flex items-center gap-3 border ${toast.type === 'success' ? 'bg-white/90 border-emerald-100 text-emerald-900' : 'bg-red-50/90 border-red-100 text-red-900'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                        {toast.type === 'success' ? <CheckCircle size={18} /> : <Trash2 size={18} />}
                    </div>
                    <p className="font-black text-sm uppercase tracking-widest">{toast.message}</p>
                </div>
            )}
            {/* HEADER */}
            <header className="sticky top-4 z-50 px-4 md:px-8">
                <nav className="max-w-7xl mx-auto bg-white/80 backdrop-blur-xl border border-emerald-50 rounded-[40px] p-4 flex items-center justify-between shadow-2xl shadow-emerald-900/5">
                    <div className="flex items-center gap-6 px-4">
                        <div className="flex items-center gap-4 group">
                            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200 ring-2 ring-white group-hover:scale-110 transition-transform duration-500">
                                <Leaf className="text-white" size={24} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-950 tracking-tighter leading-none">FarmDirect</h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] opacity-80">Dashboard</span>
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">|</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">விவசாயி தளம்</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex flex-col items-end mr-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Pincode | அஞ்சல் குறியீடு</p>
                            <div className="flex items-center gap-2 mt-1 bg-emerald-50/50 px-3 py-1 rounded-full border border-emerald-100/50">
                                <MapPin size={12} className="text-emerald-600" />
                                <span className="text-sm font-black text-slate-900 tracking-tight">{pincode}</span>
                            </div>
                        </div>
                        <Button variant="ghost" className="h-14 w-14 rounded-full bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-100 transition-all group" onClick={async () => {
                            await fetch('/api/auth/logout', { method: 'POST' });
                            window.location.href = '/';
                        }}>
                            <Trash2 size={24} className="group-hover:rotate-12 transition-transform" />
                        </Button>
                    </div>
                </nav>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-12 mt-4">
                {/* Stats Summary */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                        { label: 'Crops Listed', tamil: 'பட்டியல் பயிர்கள்', val: allCrops.length, icon: Leaf, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Active Orders', tamil: 'செயலில் உள்ள ஆர்டர்கள்', val: orders.filter(o => o.status !== 'DELIVERED').length, icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'New Inquiries', tamil: 'புதிய விசாரணைகள்', val: inquiries.length, icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
                        { label: 'Total Earnings', tamil: 'மொத்த வருமானம்', val: `₹${totalSales.toLocaleString()}`, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-6 rounded-[32px] border border-emerald-50 shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 transition-all group relative overflow-hidden">
                            <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} rounded-full -mr-12 -mt-12 opacity-50 group-hover:scale-110 transition-transform duration-500`} />
                            <div className="relative z-10">
                                <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4 shadow-sm`}>
                                    <stat.icon size={24} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{stat.tamil}</p>
                                    <p className="text-2xl font-black text-slate-900 mt-2">{stat.val}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </section>

                {/* Navigation Tabs - Modern & Premium */}
                <div className="bg-white p-2 rounded-3xl border border-emerald-50 shadow-sm grid grid-cols-6 gap-2 max-w-4xl mx-auto overflow-x-auto no-scrollbar">
                    {[
                        { id: 'orders', icon: Truck, label: 'Orders', ml: 'ஆர்டர்கள்' },
                        { id: 'add', icon: Volume2, label: 'Add Crop', ml: 'பயிர்' },
                        { id: 'listings', icon: Package, label: 'Listings', ml: 'பட்டியல்' },
                        { id: 'inquiries', icon: MessageSquare, label: 'Inquiries', ml: 'விசாரணை', badge: inquiries.length },
                        { id: 'reviews', icon: Star, label: 'Reviews', ml: 'மதிப்பீடு', badge: reviews.length },
                        { id: 'prices', icon: TrendingUp, label: 'Prices', ml: 'விலைகள்' }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`py-3 rounded-2xl text-xs font-black transition-all flex flex-col items-center justify-center gap-1.5 relative group ${isActive ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 ring-4 ring-emerald-50' : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
                            >
                                <div className="relative">
                                    <Icon size={20} className={isActive ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'} />
                                    {tab.badge && tab.badge > 0 && !isActive && (
                                        <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[8px] min-w-[14px] h-[14px] px-1 rounded-full flex items-center justify-center border-2 border-white">{tab.badge}</span>
                                    )}
                                </div>
                                <div className="flex flex-col items-center leading-none">
                                    <span className="hidden md:inline text-[10px] uppercase tracking-tighter">{tab.label}</span>
                                    <span className="text-[9px] font-bold">{tab.ml}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* TAB 1: ORDERS */}
                {activeTab === 'orders' && (
                    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-end">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Recent Orders</h2>
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-0.5 ml-0.5">சமீபத்திய ஆர்டர்கள்</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={fetchData} className="text-emerald-600 font-black text-[11px] uppercase tracking-widest bg-emerald-50 px-4 rounded-xl border border-emerald-100 shadow-sm">
                                <Clock size={14} className="mr-2" /> Refresh
                            </Button>
                        </div>

                        {orders.length === 0 ? (
                            <div className="text-center py-32 bg-white rounded-[40px] border-2 border-dashed border-emerald-100/50 flex flex-col items-center">
                                <div className="bg-emerald-50/50 w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-inner ring-8 ring-emerald-50/20">
                                    <Truck className="text-emerald-200" size={48} />
                                </div>
                                <h3 className="text-slate-900 text-lg font-black">No active orders yet</h3>
                                <p className="text-emerald-600 font-bold text-xs uppercase tracking-widest mt-1">ஆர்டர்கள் எதுவும் இல்லை</p>
                                <p className="text-slate-400 text-sm mt-4 max-w-xs mx-auto text-balance">Orders from consumers will appear here automatically when they buy your crops.</p>
                            </div>
                        ) : (
                            <div className="grid gap-6 md:grid-cols-2">
                                {orders.map(order => (
                                    <div key={order.id} className="bg-white p-7 rounded-[32px] shadow-sm border border-emerald-50 hover:shadow-xl hover:shadow-emerald-900/5 transition-all group relative overflow-hidden">
                                        {/* Status Accent Bar */}
                                        <div className={`absolute top-0 left-0 w-2 h-full ${order.status === 'PLACED' ? 'bg-orange-400' : order.status === 'ACCEPTED' ? 'bg-blue-400' : order.status === 'OUT_FOR_DELIVERY' ? 'bg-purple-400' : 'bg-emerald-400'}`} />
                                        
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="font-black text-[10px] bg-slate-100 px-2.5 py-1 rounded-lg text-slate-500 tracking-tighter">ID: #{order.id.slice(0, 8)}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(order.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <StatusIcon status={order.status} />
                                                    <span className="font-black text-slate-900 uppercase tracking-tighter text-sm">{order.status.replace(/_/g, " ")}</span>
                                                </div>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black">
                                                        {order.consumer?.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-xs font-black text-slate-700">Buyer: {order.consumer?.name}</span>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => speakOrder(order)} className="p-2.5 rounded-2xl bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all border border-slate-100">
                                                <Volume2 size={24} />
                                            </Button>
                                        </div>

                                        <div className="space-y-4 mb-8">
                                            {order.items?.map((item) => (
                                                <div key={item.id} className="flex justify-between items-center py-3 border-b border-dashed border-slate-100 last:border-0 hover:bg-slate-50/50 px-2 rounded-xl transition-colors">
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-900 font-black text-sm capitalize">{item.crop?.name}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quantity: {item.quantity} kg</span>
                                                    </div>
                                                    <span className="font-black text-slate-900 text-lg">₹{item.price * item.quantity}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex items-end justify-between pt-6 border-t border-slate-100">
                                            <div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Items ₹{order.totalAmount} + Del ₹{order.deliveryCharge}</p>
                                                <div className="flex items-baseline gap-1">
                                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total</p>
                                                    <p className="text-3xl font-black text-slate-900 tracking-tighter">₹{order.totalAmount + order.deliveryCharge}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {order.status === 'PLACED' && <Button size="sm" onClick={() => updateStatus(order.id, 'ACCEPTED')} className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-5 flex flex-col h-12"><span>Accept</span><span className="text-[9px] font-bold opacity-80">ஏற்றுக்கொள்</span></Button>}
                                                {order.status === 'ACCEPTED' && <Button size="sm" onClick={() => updateStatus(order.id, 'OUT_FOR_DELIVERY')} className="bg-purple-600 hover:bg-purple-700 text-white rounded-2xl px-5 flex flex-col h-12"><span>Dispatch</span><span className="text-[9px] font-bold opacity-80">அனுப்பு</span></Button>}
                                                {order.status === 'OUT_FOR_DELIVERY' && <Button size="sm" onClick={() => updateStatus(order.id, 'DELIVERED')} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-5 flex flex-col h-12"><span>Delivered</span><span className="text-[9px] font-bold opacity-80">வழங்கப்பட்டது</span></Button>}
                                            </div>
                                        </div>

                                        <div className="mt-6 bg-emerald-50/30 p-5 rounded-[24px] border border-emerald-50/50">
                                            <div className="flex items-start gap-3 text-xs text-slate-600 mb-4">
                                                <MapPin size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                                                <span className="font-bold leading-relaxed">{order.deliveryAddress || 'No Address Provided'}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-white px-4 py-3 rounded-2xl shadow-sm border border-emerald-50">
                                                <a href={`tel:${order.contactNumber || order.consumer?.mobile}`} className="flex items-center gap-2 font-black text-emerald-700 hover:text-emerald-950 transition-colors">
                                                    <span className="p-1.5 bg-emerald-600 text-white rounded-lg"><Truck size={12} className="rotate-0 group-hover:rotate-12 transition-transform" /></span>
                                                    {order.contactNumber || order.consumer?.mobile || 'No Phone'}
                                                </a>
                                                {order.deliveryTime && (
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                                                        <Clock size={12} /> {order.deliveryTime}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {order.review && (
                                            <div className="mt-4 pt-4 border-t border-emerald-50 bg-amber-50/20 p-4 rounded-2xl">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="flex text-amber-400">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star key={i} size={14} fill={i < order.review!.rating ? "currentColor" : "none"} />
                                                        ))}
                                                    </div>
                                                    <span className="text-xs font-black text-slate-900 uppercase tracking-tighter text-amber-900/60">Review from {order.consumer?.name}</span>
                                                </div>
                                                {order.review.comment && <p className="text-xs text-slate-600 font-medium italic">"{order.review.comment}"</p>}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* TAB 2: ADD CROP */}
                {activeTab === 'add' && (
                    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Mode Toggle */}
                        <div className="bg-white p-2 rounded-3xl border border-emerald-50 shadow-sm grid grid-cols-2 gap-2 max-w-sm mx-auto">
                            <button onClick={() => setAddMode('voice')} className={`py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${addMode === 'voice' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-slate-400 hover:bg-emerald-50'}`}>
                                <Volume2 size={16} /> Voice AI | குரல்
                            </button>
                            <button onClick={() => setAddMode('manual')} className={`py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${addMode === 'manual' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-slate-400 hover:bg-emerald-50'}`}>
                                <Pencil size={16} /> Manual | நேரடி
                            </button>
                        </div>

                        {addMode === 'voice' ? (
                            <div className="relative w-full max-w-2xl mx-auto rounded-[40px] flex flex-col justify-center bg-emerald-50/20 p-8 border border-emerald-50">
                                <div className="text-center mb-10">
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI Voice Assistant</h2>
                                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">பேசத் தொடங்க மைக் பட்டனை அழுத்தவும்</p>
                                </div>
                                <div className="relative z-10 w-full mb-8">
                                    <VoiceQAFlow onComplete={(data) => {
                                        onCropDataComplete(data);
                                        setTimeout(() => setActiveTab('listings'), 2000);
                                    }} />
                                </div>
                                <div className="bg-white p-6 rounded-[32px] border border-emerald-50 shadow-sm text-center">
                                    <p className="text-slate-500 font-medium italic text-sm">"பயிர் பெயர், அளவு, விலை கூறுங்கள். நான் பார்த்துக்கொள்கிறேன்!"</p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-[40px] p-10 border border-emerald-50 shadow-sm max-w-md mx-auto relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-50" />
                                <div className="relative z-10">
                                    <h2 className="text-2xl font-black text-slate-900 mb-1">Add Crop</h2>
                                    <p className="text-emerald-600 text-[10px] font-bold uppercase tracking-widest mb-8">கைமுறையாக பயிர் சேர்க்கவும்</p>
                                    <div className="space-y-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Crop Name / பயிர் பெயர்</label>
                                            <input type="text" value={cropName} onChange={(e) => setCropName(e.target.value)} placeholder="e.g., Tomato" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-[20px] focus:ring-4 focus:ring-emerald-100 focus:bg-white focus:border-emerald-600 transition-all font-bold" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity (kg) / அளவு</label>
                                            <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g., 50" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-[20px] focus:ring-4 focus:ring-emerald-100 focus:bg-white focus:border-emerald-600 transition-all font-bold" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Price per kg (₹) / விலை</label>
                                            <input type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="e.g., 40" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-[20px] focus:ring-4 focus:ring-emerald-100 focus:bg-white focus:border-emerald-600 transition-all font-bold" />
                                        </div>
                                        <Button onClick={submitCrop} isLoading={isSubmitting} disabled={!cropName || !quantity} className="w-full bg-emerald-600 hover:bg-emerald-700 h-16 rounded-[24px] font-black text-sm uppercase tracking-widest flex flex-col gap-0.5 shadow-xl shadow-emerald-600/20 active:scale-[0.98]">
                                            <span>Add Crop</span>
                                            <span className="text-[9px] font-bold opacity-70">பயிர் சேர்க்க</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* TAB 3: MARKETPLACE LISTINGS */}
                {activeTab === 'listings' && (
                    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-end">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Marketplace Listings</h2>
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">அனைத்து பயிர் பட்டியல்கள்</p>
                            </div>
                            <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
                                <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">{allCrops.length} Active Crops</span>
                            </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {allCrops.map(crop => {
                                const isOwner = user?.id && String(user.id) === String(crop.farmerId);
                                return (
                                    <div key={crop.id} className={`bg-white p-7 rounded-[40px] border ${isOwner ? 'border-emerald-200 bg-emerald-50/20 shadow-xl shadow-emerald-900/5' : 'border-slate-100 shadow-sm'} transition-all hover:shadow-xl group relative overflow-hidden`}>
                                        <div className="flex justify-between items-start mb-6">
                                            <div className={`p-4 rounded-3xl ${isOwner ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'} shadow-lg transition-transform duration-500`}>
                                                <Leaf size={24} />
                                            </div>
                                            <div className="flex gap-2">
                                                {isOwner ? (
                                                    <>
                                                        <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-2xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 bg-slate-50 border border-slate-100 shadow-sm" onClick={() => startEdit(crop)}>
                                                            <Pencil size={18} />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-2xl text-slate-400 hover:text-red-600 hover:bg-red-50 bg-slate-50 border border-slate-100 shadow-sm" onClick={() => deleteCrop(crop.id)}>
                                                            <Trash2 size={18} />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <div className="bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 flex items-center gap-1.5">
                                                        <div className="w-1 h-1 rounded-full bg-slate-400" />
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Community Listing</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {editingCropId === crop.id ? (
                                            <div className="space-y-4">
                                                <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full p-4 bg-white border border-emerald-200 rounded-2xl font-black text-lg text-slate-900" placeholder="Crop Name" />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <input value={editForm.quantityKg} onChange={(e) => setEditForm({ ...editForm, quantityKg: e.target.value })} className="w-full p-4 bg-white border border-emerald-200 rounded-2xl text-emerald-700 font-black" placeholder="Qty" />
                                                    <input value={editForm.basePrice} onChange={(e) => setEditForm({ ...editForm, basePrice: e.target.value })} className="w-full p-4 bg-white border border-emerald-200 rounded-2xl text-emerald-700 font-black" placeholder="Price" />
                                                </div>
                                                <div className="flex gap-3 pt-2">
                                                    <Button size="sm" onClick={() => saveEdit(crop.id)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 rounded-2xl h-12 font-black uppercase text-[10px] tracking-widest">Save Changes</Button>
                                                    <Button size="sm" variant="ghost" onClick={cancelEdit} className="flex-1 rounded-2xl h-12 bg-slate-50 font-black uppercase text-[10px] tracking-widest">Cancel</Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-black text-slate-900 text-xl capitalize tracking-tight">{crop.name}</h3>
                                                        {isOwner && <span className="bg-emerald-500 w-1.5 h-1.5 rounded-full animate-pulse shadow-sm shadow-emerald-500/50" />}
                                                    </div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                        {isOwner ? 'Your Listing | உங்களது' : `By ${crop.farmer?.name || 'Farmer'} | மற்றவர்`}
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-slate-50/50 p-4 rounded-[28px] border border-slate-50">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Available | அளவு</p>
                                                        <p className="text-2xl font-black text-slate-950 tracking-tight">{crop.quantityKg}<span className="text-xs ml-1 opacity-50">kg</span></p>
                                                    </div>
                                                    <div className="bg-emerald-50/50 p-4 rounded-[28px] border border-emerald-50">
                                                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Price | விலை</p>
                                                        <p className="text-2xl font-black text-emerald-950 tracking-tight">₹{crop.basePrice}<span className="text-[10px] ml-1 opacity-50">/kg</span></p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {allCrops.length === 0 && (
                                <div className="text-center py-32 px-6 col-span-2 bg-white rounded-[40px] border-2 border-dashed border-emerald-100/50 flex flex-col items-center">
                                    <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-inner ring-8 ring-emerald-50/20">
                                        <Package className="text-emerald-200" size={48} />
                                    </div>
                                    <p className="text-slate-900 font-black text-lg">No marketplace listings</p>
                                    <p className="text-emerald-600 font-bold text-xs uppercase tracking-widest mt-1">பட்டியல்கள் எதுவும் இல்லை</p>
                                    <Button onClick={() => setActiveTab('add')} className="mt-8 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-[20px] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-200">
                                        Add Your First Crop
                                    </Button>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* TAB 4: BULK INQUIRIES */}
                {activeTab === 'inquiries' && (
                    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-end">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Bulk Inquiries</h2>
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-0.5 ml-0.5">சமீபத்திய விசாரணை</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={fetchData} className="text-emerald-600 font-black text-[11px] uppercase tracking-widest bg-emerald-50 px-4 rounded-xl border border-emerald-100 shadow-sm">
                                <Clock size={14} className="mr-2" /> Refresh
                            </Button>
                        </div>

                        {inquiries.length === 0 ? (
                            <div className="text-center py-32 bg-white rounded-[40px] border-2 border-dashed border-emerald-100/50 flex flex-col items-center">
                                <div className="bg-emerald-50/50 w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-inner ring-8 ring-emerald-50/20">
                                    <MessageSquare className="text-emerald-200" size={48} />
                                </div>
                                <h3 className="text-slate-900 text-lg font-black">No inquiries yet</h3>
                                <p className="text-emerald-600 font-bold text-xs uppercase tracking-widest mt-1">விசாரணைகள் எதுவும் இல்லை</p>
                                <p className="text-slate-400 text-sm mt-4 max-w-xs mx-auto text-balance">Bulk order request messages from consumers will appear here.</p>
                            </div>
                        ) : (
                            <div className="grid gap-6 md:grid-cols-2">
                                {inquiries.map(inquiry => (
                                    <div key={inquiry.id} className="bg-white p-8 rounded-[40px] shadow-sm border border-emerald-50 hover:shadow-xl hover:shadow-emerald-900/5 transition-all relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-12 -mt-12 opacity-50" />
                                        <div className="flex justify-between items-start mb-6 relative z-10">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-lg ring-4 ring-slate-50">
                                                    {inquiry.consumer?.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-slate-900 text-lg tracking-tight">{inquiry.consumer?.name}</h3>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(inquiry.createdAt).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="bg-amber-100 text-amber-900 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-200 shadow-sm">
                                                New Inquiry
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 p-6 rounded-[28px] border border-slate-100 mb-6 text-sm text-slate-700 italic font-medium leading-relaxed">
                                            "{inquiry.message}"
                                        </div>

                                        <div className="flex flex-col gap-4 pt-6 border-t border-slate-100">
                                            <div className="grid grid-cols-2 gap-3 text-[11px] font-bold text-slate-500 bg-emerald-50/30 p-4 rounded-[24px] border border-emerald-50/50">
                                                {inquiry.crop?.name && <p className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> <span className="text-slate-400 uppercase text-[9px]">Crop:</span> {inquiry.crop.name}</p>}
                                                {inquiry.quantity && <p className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> <span className="text-slate-400 uppercase text-[9px]">Need:</span> {inquiry.quantity}kg</p>}
                                                {inquiry.proposedPrice && <p className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> <span className="text-slate-400 uppercase text-[9px]">Offer:</span> ₹{inquiry.proposedPrice}/kg</p>}
                                                {inquiry.deliveryAddress && <p className="col-span-2 mt-2 flex items-start gap-2"><MapPin size={12} className="text-emerald-600 shrink-0 mt-0.5" /> <span>{inquiry.deliveryAddress}</span></p>}
                                            </div>
                                            <div className="flex justify-between items-center mt-2">
                                                <div>
                                                    <p className="text-lg font-black text-slate-900 tracking-tight leading-none">📞 {inquiry.contactNumber || inquiry.consumer?.mobile || 'No Phone'}</p>
                                                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-1">Direct Contact</p>
                                                </div>
                                                <Button size="sm" onClick={() => window.open(`tel:${inquiry.contactNumber || inquiry.consumer?.mobile}`, '_self')} className="bg-slate-900 hover:bg-black text-white px-8 rounded-2xl h-12 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-slate-900/20">
                                                    Call Buyer
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}
                {/* TAB 5: PRICE INSIGHTS */}
                {activeTab === 'prices' && (
                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <PriceInsightsChart crops={allCrops} />
                    </section>
                )}

                {/* TAB 6: REVIEWS */}
                {activeTab === 'reviews' && (
                    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-end">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Customer Reviews</h2>
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-0.5 ml-0.5">வாடிக்கையாளர் மதிப்பீடுகள்</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={fetchData} className="text-emerald-600 font-black text-[11px] uppercase tracking-widest bg-emerald-50 px-4 rounded-xl border border-emerald-100 shadow-sm">
                                <Clock size={14} className="mr-2" /> Refresh
                            </Button>
                        </div>

                        {reviews.length === 0 ? (
                            <div className="text-center py-32 bg-white rounded-[40px] border-2 border-dashed border-emerald-100/50 flex flex-col items-center">
                                <div className="bg-emerald-50/50 w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-inner ring-8 ring-emerald-50/20">
                                    <Star className="text-emerald-200" size={48} />
                                </div>
                                <h3 className="text-slate-900 text-lg font-black">No reviews yet</h3>
                                <p className="text-emerald-600 font-bold text-xs uppercase tracking-widest mt-1">மதிப்பீடுகள் எதுவும் இல்லை</p>
                                <p className="text-slate-400 text-sm mt-4 max-w-xs mx-auto text-balance">Once consumers rate your delivered crops, their feedback will appear here to help you improve.</p>
                            </div>
                        ) : (
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {reviews.map(review => (
                                    <div key={review.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-emerald-50 hover:shadow-xl hover:shadow-emerald-900/5 transition-all group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                                                    {review.consumer.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-slate-900 text-sm leading-tight">{review.consumer.name}</h4>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(review.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex text-amber-400">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="mb-4">
                                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-lg">Product: {review.crop.name}</span>
                                        </div>
                                        {review.comment && (
                                            <p className="text-sm text-slate-600 font-medium italic leading-relaxed">
                                                "{review.comment}"
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </main>

            {/* Footer */}
            <footer className="py-24 px-8 border-t border-emerald-50 bg-slate-50 relative z-10 mt-32">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
                    <div className="col-span-1 md:col-span-2 space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-600 rounded-xl shadow-lg">
                                <Leaf className="text-white" size={24} />
                            </div>
                            <span className="text-2xl font-black tracking-tighter text-slate-900">FarmDirect</span>
                        </div>
                        <p className="text-slate-600 font-bold max-w-sm leading-relaxed text-lg italic">"விவசாயிகளின் முன்னேற்றமே நாட்டின் முதுகெலும்பு. நாங்கள் உங்களுடன் எப்போதும்!"</p>
                        <p className="text-slate-400 font-medium max-w-sm leading-relaxed text-sm">நேரடி நுகர்வோர் தளம் மூலம் விவசாயிகளை வலுப்படுத்துகிறோம். விவசாயிகளுக்காக பெருமையுடன் உருவாக்கப்பட்டது.</p>
                        <div className="flex gap-4">
                            {['Twitter', 'Instagram', 'Facebook', 'LinkedIn'].map(social => (
                                <span key={social} className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-emerald-600 cursor-pointer transition-all hover:-translate-y-1">{social.charAt(0)}</span>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-6">
                        <h4 className="font-black uppercase tracking-widest text-[10px] text-emerald-600">Platform | தளம்</h4>
                        <ul className="text-slate-500 space-y-4 font-bold text-sm">
                            <li className="hover:text-emerald-600 cursor-pointer transition-colors">Farmer Portal | விவசாயி</li>
                            <li className="hover:text-emerald-600 cursor-pointer transition-colors">Consumer App | நுகர்வோர்</li>
                            <li className="hover:text-emerald-600 cursor-pointer transition-colors">Wholesale | மொத்த விற்பனை</li>
                        </ul>
                    </div>
                    <div className="space-y-6">
                        <h4 className="font-black uppercase tracking-widest text-[10px] text-emerald-600">Resources | வளம்</h4>
                        <ul className="text-slate-500 space-y-4 font-bold text-sm">
                            <li className="hover:text-emerald-600 cursor-pointer transition-colors">Pricing Guide | விலை வழிகாட்டி</li>
                            <li className="hover:text-emerald-600 cursor-pointer transition-colors">Support Center | உதவி மையம்</li>
                            <li className="hover:text-emerald-600 cursor-pointer transition-colors">Privacy Policy | பாதுகாப்பு</li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-6xl mx-auto pt-16 border-t border-slate-200 mt-16 flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] gap-6">
                    <span>© 2026 FarmDirect Project. விவசாயிகளின் உழைப்பு, உங்கள் வீட்டில்.</span>
                    <div className="flex gap-8">
                        <span className="hover:text-emerald-600 cursor-pointer transition-colors">Terms</span>
                        <span className="hover:text-emerald-600 cursor-pointer transition-colors">Privacy</span>
                        <span className="hover:text-emerald-600 cursor-pointer transition-colors">Contact</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function StatusIcon({ status }: { status: string }) {
    if (status === 'PLACED') return <div className="p-2.5 bg-orange-50 text-orange-500 rounded-2xl ring-2 ring-orange-100 animate-pulse shadow-sm shadow-orange-200/50"><Clock size={22} /></div>;
    if (status === 'ACCEPTED') return <div className="p-2.5 bg-blue-50 text-blue-500 rounded-2xl ring-2 ring-blue-100 shadow-sm shadow-blue-200/50"><Package size={22} /></div>;
    if (status === 'OUT_FOR_DELIVERY') return <div className="p-2.5 bg-purple-50 text-purple-500 rounded-2xl ring-2 ring-purple-100 shadow-sm shadow-purple-200/50"><Truck size={22} /></div>;
    return <div className="p-2.5 bg-emerald-50 text-emerald-500 rounded-2xl ring-2 ring-emerald-100 shadow-sm shadow-emerald-200/50"><CheckCircle size={22} /></div>;
}
