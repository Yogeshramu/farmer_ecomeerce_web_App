'use client';

import React, { useState, useEffect, useCallback } from 'react';
import VoiceQAFlow from '@/app/components/VoiceQAFlow';
import PriceInsightsChart from '@/app/components/PriceInsightsChart';
import { Button } from '@/app/components/ui/Button';
import { Language } from '@/app/hooks/useVoiceInput';
import { Package, Truck, CheckCircle, Clock, Volume2, Trash2, Pencil, Sparkles, MessageSquare, MapPin, TrendingUp, Leaf, Star, LogOut, Mic } from 'lucide-react';
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
    const [voiceLanguage, setVoiceLanguage] = useState<Language>('ta-IN');

    // ... (rest of existing state and logic remains, I will just re-render the return)

    // Calculate Sales Stats
    const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const deliveredOrders = orders.filter((order) => order.status === 'DELIVERED').length;
    const averageRating = reviews.length > 0
        ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
        : '0.0';

    const getStatusTamil = (status: string) => {
        if (status === 'PLACED') return 'புதிய ஆர்டர்';
        if (status === 'ACCEPTED') return 'ஏற்றுக்கொள்ளப்பட்டது';
        if (status === 'OUT_FOR_DELIVERY') return 'விநியோகத்தில்';
        if (status === 'DELIVERED') return 'வழங்கப்பட்டது';
        return status;
    };

    const tabs: Array<{
        id: 'orders' | 'add' | 'listings' | 'inquiries' | 'prices' | 'reviews';
        label: string;
        subtitle: string;
        icon: typeof Truck;
        badge?: number;
    }> = [
        { id: 'orders', label: 'ஆர்டர் மையம்', subtitle: 'நிலை & செயல்கள்', icon: Truck, badge: orders.filter((o) => o.status !== 'DELIVERED').length },
        { id: 'add', label: 'பயிர் சேர்க்க', subtitle: 'குரல் அல்லது படிவம்', icon: Sparkles },
        { id: 'listings', label: 'நேரடி பட்டியல்', subtitle: 'சரக்கு பலகை', icon: Package, badge: allCrops.length },
        { id: 'inquiries', label: 'வாங்குபவர் பேசு', subtitle: 'விசாரணைகள்', icon: MessageSquare, badge: inquiries.length },
        { id: 'prices', label: 'விலை ரேடார்', subtitle: 'சந்தை போக்கு', icon: TrendingUp },
        { id: 'reviews', label: 'நம்பிக்கை மதிப்பு', subtitle: 'மதிப்புரைகள்', icon: Star, badge: reviews.length },
    ];

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 pb-20">
            {toast && (
                <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-4 duration-300 flex items-center gap-3 border ${
                    toast.type === 'success' ? 'bg-emerald-600 border-emerald-700 text-white' : 'bg-red-500 border-red-600 text-white'
                }`}>
                    {toast.type === 'success' ? <CheckCircle size={16} /> : <Trash2 size={16} />}
                    <p className="font-bold text-sm">{toast.message}</p>
                </div>
            )}

            {/* HEADER */}
            <header className="bg-white border-b border-emerald-100 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
                            <Leaf className="text-white" size={18} />
                        </div>
                        <div>
                            <span className="font-black text-lg text-slate-900 tracking-tight">FarmDirect</span>
                            <span className="ml-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Farmer</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
                            <MapPin size={12} className="text-emerald-600" />
                            <span className="text-xs font-bold text-emerald-700">{pincode}</span>
                        </div>
                        {user && <span className="hidden md:block text-sm font-semibold text-slate-600">{user.name}</span>}
                        <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/'; }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition-colors text-sm font-bold">
                            <LogOut size={15} />
                            <span className="hidden md:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
                {/* Stats */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Crops Listed', sub: 'பட்டியல்', val: allCrops.length, icon: Leaf, accent: 'bg-emerald-600' },
                        { label: 'Active Orders', sub: 'ஆர்டர்கள்', val: orders.filter(o => o.status !== 'DELIVERED').length, icon: Truck, accent: 'bg-emerald-500' },
                        { label: 'Inquiries', sub: 'விசாரணை', val: inquiries.length, icon: MessageSquare, accent: 'bg-emerald-700' },
                        { label: 'Total Earnings', sub: 'வருமானம்', val: `₹${totalSales.toLocaleString()}`, icon: TrendingUp, accent: 'bg-emerald-800' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white border border-emerald-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className={`w-11 h-11 ${s.accent} rounded-xl flex items-center justify-center shrink-0`}>
                                <s.icon size={20} className="text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-medium">{s.label}</p>
                                <p className="text-xs text-emerald-600 font-medium">{s.sub}</p>
                                <p className="text-xl font-black text-slate-900 mt-0.5">{s.val}</p>
                            </div>
                        </div>
                    ))}
                </section>

                {/* Dashboard Workspace */}
                <section className="grid gap-5 lg:grid-cols-[260px_1fr]">
                    <aside className="bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-700 rounded-[28px] p-4 text-white shadow-xl shadow-emerald-900/20 sticky top-16 h-fit max-h-[calc(100vh-80px)] overflow-y-auto">
                        <div className="px-2 pt-2 pb-5 border-b border-emerald-500/40">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-100/80 font-black">விவசாயி கட்டுப்பாட்டு மையம்</p>
                            <h3 className="text-lg font-black tracking-tight mt-2">வேலைப்பகுதி</h3>
                            <p className="text-[10px] text-emerald-100/80 mt-1">பிரிவுகளை மாற்றவும்</p>
                        </div>
                        <nav className="mt-4 space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full text-left rounded-2xl px-3 py-2.5 transition-all border text-sm ${
                                            isActive
                                                ? 'bg-white text-emerald-900 border-white shadow-lg'
                                                : 'bg-transparent text-white/90 border-white/10 hover:bg-white/10'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <Icon size={14} />
                                                <div>
                                                    <p className="font-black text-xs uppercase tracking-wider">{tab.label}</p>
                                                    <p className={`text-[10px] leading-none ${isActive ? 'text-emerald-700' : 'text-emerald-100/70'}`}>{tab.subtitle}</p>
                                                </div>
                                            </div>
                                            {tab.badge !== undefined && (
                                                <span className={`h-5 w-5 px-0.5 text-[9px] font-black rounded-full flex items-center justify-center shrink-0 ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-white/20 text-white'}`}>
                                                    {tab.badge}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </nav>
                    </aside>

                    <div className="bg-white border border-emerald-100 rounded-[28px] p-5 md:p-7 shadow-sm">
                        {activeTab === 'orders' && (
                            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex flex-wrap justify-between items-start gap-4">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.2em] font-black text-emerald-600">ஆர்டர் மையம்</p>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">அனுப்பும் நடைபாதை</h2>
                                        <p className="text-sm text-slate-500 mt-1">வாங்குபவரின் ஒவ்வொரு ஆர்டரையும் தொடக்கம் முதல் விநியோகம் வரை கண்காணிக்கவும்.</p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={fetchData} className="text-emerald-700 font-black text-[11px] uppercase tracking-widest bg-emerald-50 px-4 rounded-xl border border-emerald-100">
                                        <Clock size={14} className="mr-2" /> புதுப்பிக்க
                                    </Button>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-orange-700">புதியவை</p>
                                        <p className="text-2xl font-black text-orange-900 mt-1">{orders.filter((o) => o.status === 'PLACED').length}</p>
                                    </div>
                                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-blue-700">நடைமுறையில்</p>
                                        <p className="text-2xl font-black text-blue-900 mt-1">{orders.filter((o) => o.status === 'ACCEPTED' || o.status === 'OUT_FOR_DELIVERY').length}</p>
                                    </div>
                                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700">வழங்கப்பட்டது</p>
                                        <p className="text-2xl font-black text-emerald-900 mt-1">{deliveredOrders}</p>
                                    </div>
                                </div>

                                {orders.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                        <Truck className="mx-auto text-slate-300 mb-4" size={42} />
                                        <h3 className="text-lg font-black text-slate-900">இப்போது ஆர்டர்கள் இல்லை</h3>
                                        <p className="text-sm text-slate-500 mt-2">புதிய ஆர்டர்கள் இங்கே விரைவான நிலை பொத்தான்களுடன் தோன்றும்.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {orders.map((order) => (
                                            <div key={order.id} className="rounded-3xl border border-slate-200 p-5 bg-gradient-to-r from-white to-slate-50/70">
                                                <div className="flex flex-wrap items-start justify-between gap-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <StatusIcon status={order.status} />
                                                            <div>
                                                                <p className="text-sm font-black text-slate-900 uppercase tracking-wider">{getStatusTamil(order.status)}</p>
                                                                <p className="text-[11px] text-slate-500">#{order.id.slice(0, 8)} • {new Date(order.createdAt).toLocaleString('ta-IN')}</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm font-bold text-slate-700">வாங்குபவர்: {order.consumer?.name || 'தெரியாதவர்'}</p>
                                                        <p className="text-[12px] text-slate-500">{order.items?.length || 0} பொருட்கள் • டெலிவரி ₹{order.deliveryCharge}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">மொத்த தொகை</p>
                                                        <p className="text-2xl font-black text-slate-900">₹{order.totalAmount + order.deliveryCharge}</p>
                                                        <Button variant="ghost" size="sm" onClick={() => speakOrder(order)} className="mt-2 border border-slate-200 rounded-xl">
                                                            <Volume2 size={14} className="mr-1" /> ஒலி படிக்க
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                                    {order.items?.map((item) => (
                                                        <div key={item.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2 flex justify-between">
                                                            <span className="font-semibold text-slate-700 capitalize">{item.crop?.name}</span>
                                                            <span className="text-sm font-black text-slate-900">{item.quantity}kg</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                                    <a href={`tel:${order.contactNumber || order.consumer?.mobile}`} className="text-sm font-bold text-emerald-700">
                                                        அழைக்க: {order.contactNumber || order.consumer?.mobile || 'எண் இல்லை'}
                                                    </a>
                                                    <div className="flex gap-2">
                                                        {order.status === 'PLACED' && <Button size="sm" onClick={() => updateStatus(order.id, 'ACCEPTED')} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">ஏற்க</Button>}
                                                        {order.status === 'ACCEPTED' && <Button size="sm" onClick={() => updateStatus(order.id, 'OUT_FOR_DELIVERY')} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl">அனுப்பு</Button>}
                                                        {order.status === 'OUT_FOR_DELIVERY' && <Button size="sm" onClick={() => updateStatus(order.id, 'DELIVERED')} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">வழங்கியது</Button>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}

                        {activeTab === 'add' && (
                            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Header Section */}
                                <div className="space-y-4">
                                    {/* Mode Toggle */}
                                    <div className="flex gap-3 w-fit">
                                        <button 
                                            onClick={() => setAddMode('voice')} 
                                            className={`flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-bold uppercase tracking-wider transition-all border-2 ${
                                                addMode === 'voice' 
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/30' 
                                                    : 'bg-white text-emerald-600 border-emerald-200 hover:border-emerald-300'
                                            }`}
                                        >
                                            <Mic size={18} />
                                            By Voice
                                        </button>
                                        <button 
                                            onClick={() => setAddMode('manual')} 
                                            className={`flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-bold uppercase tracking-wider transition-all border-2 ${
                                                addMode === 'manual' 
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/30' 
                                                    : 'bg-white text-emerald-600 border-emerald-200 hover:border-emerald-300'
                                            }`}
                                        >
                                            <Pencil size={18} />
                                            Manually
                                        </button>
                                    </div>
                                </div>

                                {/* Voice Mode */}
                                {addMode === 'voice' && (
                                    <div className="animate-in fade-in duration-300">
                                        <VoiceQAFlow language={voiceLanguage} onLanguageChange={setVoiceLanguage} onComplete={(data) => {
                                            onCropDataComplete(data);
                                            setTimeout(() => setActiveTab('listings'), 2000);
                                        }} />
                                    </div>
                                )}

                                {/* Manual Mode */}
                                {addMode === 'manual' && (
                                    <div className="space-y-6 animate-in fade-in duration-300">
                                        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                                                    <Pencil size={20} className="text-emerald-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-gray-900">Manual Entry</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">Fill in every detail to list your crop</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Form Section */}
                                        <div className="space-y-5 max-w-2xl">
                                            {/* Crop Name */}
                                            <div className="space-y-2.5">
                                                <label className="block text-xs font-black text-gray-900 uppercase tracking-wider">Crop Name</label>
                                                <input 
                                                    type="text" 
                                                    value={cropName} 
                                                    onChange={(e) => setCropName(e.target.value)} 
                                                    placeholder="e.g. Tomato, Onion, Rice" 
                                                    className="w-full px-4 py-3.5 rounded-xl border-2 border-emerald-200 bg-white text-gray-900 font-semibold placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all hover:border-emerald-300"
                                                />
                                            </div>

                                            {/* Quantity & Price Grid */}
                                            <div className="grid grid-cols-2 gap-5">
                                                <div className="space-y-2.5">
                                                    <label className="block text-xs font-black text-gray-900 uppercase tracking-wider">Quantity (kg)</label>
                                                    <input 
                                                        type="number" 
                                                        value={quantity} 
                                                        onChange={(e) => setQuantity(e.target.value)} 
                                                        placeholder="50" 
                                                        className="w-full px-4 py-3.5 rounded-xl border-2 border-emerald-200 bg-white text-gray-900 font-semibold placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all hover:border-emerald-300"
                                                    />
                                                </div>

                                                <div className="space-y-2.5">
                                                    <label className="block text-xs font-black text-gray-900 uppercase tracking-wider">Price (/kg)</label>
                                                    <input 
                                                        type="number" 
                                                        value={basePrice} 
                                                        onChange={(e) => setBasePrice(e.target.value)} 
                                                        placeholder="40" 
                                                        className="w-full px-4 py-3.5 rounded-xl border-2 border-emerald-200 bg-white text-gray-900 font-semibold placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all hover:border-emerald-300"
                                                    />
                                                </div>
                                            </div>

                                            {/* Info Box */}
                                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                                                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Summary</p>
                                                <div className="text-sm text-gray-700 space-y-1">
                                                    <p>{cropName || 'Crop'} • <span className="font-bold">{quantity || '0'} kg</span></p>
                                                    <p className="font-bold text-emerald-600">
                                                        Total: ₹{((parseFloat(quantity) || 0) * (parseFloat(basePrice) || 0)).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Submit Button */}
                                            <Button 
                                                onClick={submitCrop} 
                                                isLoading={isSubmitting} 
                                                disabled={!cropName || !quantity || !basePrice}
                                                className="w-full px-6 py-4 rounded-xl font-black uppercase tracking-wider text-base bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-300 disabled:text-gray-400 transition-all active:scale-95 shadow-lg hover:shadow-xl"
                                            >
                                                {isSubmitting ? 'Publishing...' : 'Publish Crop'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}

                        {activeTab === 'listings' && (
                            <section className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.2em] font-black text-emerald-600">நேரடி பட்டியல்</p>
                                        <h2 className="text-2xl font-black text-slate-900">சரக்கு பலகை</h2>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={fetchData} className="border border-emerald-100">புதுப்பிக்க</Button>
                                </div>

                                {allCrops.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                        <Package className="mx-auto text-slate-300 mb-4" size={40} />
                                        <h3 className="text-lg font-black text-slate-900">செயலில் பட்டியல் இல்லை</h3>
                                        <Button onClick={() => setActiveTab('add')} className="mt-5 rounded-xl">முதல் பட்டியல் உருவாக்கு</Button>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                        {allCrops.map((crop) => {
                                            const isOwner = user?.id && String(user.id) === String(crop.farmerId);
                                            return (
                                                <div key={crop.id} className={`rounded-2xl border p-4 h-full ${isOwner ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
                                                    {editingCropId === crop.id ? (
                                                        <div className="grid gap-3">
                                                            <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="h-11 rounded-xl border border-slate-200 px-3" placeholder="பயிர் பெயர்" />
                                                            <input value={editForm.quantityKg} onChange={(e) => setEditForm({ ...editForm, quantityKg: e.target.value })} className="h-11 rounded-xl border border-slate-200 px-3" placeholder="அளவு" />
                                                            <input value={editForm.basePrice} onChange={(e) => setEditForm({ ...editForm, basePrice: e.target.value })} className="h-11 rounded-xl border border-slate-200 px-3" placeholder="விலை" />
                                                            <Button size="sm" onClick={() => saveEdit(crop.id)} className="rounded-xl">சேமிக்க</Button>
                                                            <Button size="sm" variant="ghost" onClick={cancelEdit} className="rounded-xl border border-slate-200">ரத்து</Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex h-full flex-col justify-between gap-4">
                                                            <div>
                                                                <p className="text-lg font-black text-slate-900 capitalize">{crop.name}</p>
                                                                <p className="text-sm text-slate-500">{crop.quantityKg} kg கிடைக்கும் • ₹{crop.basePrice}/kg</p>
                                                                <p className="text-[11px] text-slate-400 mt-1">{isOwner ? 'உங்கள் பட்டியல்' : `${crop.farmer?.name || 'விவசாயி'} வெளியீடு`}</p>
                                                            </div>
                                                            {isOwner && (
                                                                <div className="flex gap-2 pt-2">
                                                                    <Button variant="ghost" size="sm" className="rounded-xl border border-slate-200" onClick={() => startEdit(crop)}>
                                                                        <Pencil size={14} />
                                                                    </Button>
                                                                    <Button variant="ghost" size="sm" className="rounded-xl border border-red-200 text-red-600" onClick={() => deleteCrop(crop.id)}>
                                                                        <Trash2 size={14} />
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        )}

                        {activeTab === 'inquiries' && (
                            <section className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex flex-wrap justify-between gap-3 items-start">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.2em] font-black text-amber-700">விற்பனை பேச்சு</p>
                                        <h2 className="text-2xl font-black text-slate-900">வாங்குபவர் விசாரணைகள்</h2>
                                        <p className="text-sm text-slate-500">நுகர்வோரின் மொத்த கோரிக்கைகள் மற்றும் விலை பேச்சுவார்த்தைகள்.</p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={fetchData} className="border border-amber-200 bg-amber-50 text-amber-800">புதுப்பிக்க</Button>
                                </div>

                                {inquiries.length === 0 ? (
                                    <div className="text-center py-20 rounded-3xl border border-dashed border-amber-200 bg-amber-50/40">
                                        <MessageSquare className="mx-auto text-amber-300 mb-4" size={40} />
                                        <h3 className="text-lg font-black text-slate-900">இன்னும் விசாரணைகள் இல்லை</h3>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {inquiries.map((inquiry) => (
                                            <div key={inquiry.id} className="rounded-2xl border border-amber-200 bg-white p-5">
                                                <div className="flex justify-between items-start gap-2">
                                                    <div>
                                                        <p className="text-lg font-black text-slate-900">{inquiry.consumer?.name || 'வாங்குபவர்'}</p>
                                                        <p className="text-[11px] text-slate-500">{new Date(inquiry.createdAt).toLocaleString('ta-IN')}</p>
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">திறந்த பேச்சு</span>
                                                </div>
                                                <p className="mt-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3">{inquiry.message}</p>
                                                <div className="mt-3 space-y-1 text-sm text-slate-600">
                                                    {inquiry.crop?.name && <p>பயிர்: <span className="font-semibold">{inquiry.crop.name}</span></p>}
                                                    {inquiry.quantity && <p>அளவு: <span className="font-semibold">{inquiry.quantity} kg</span></p>}
                                                    {inquiry.proposedPrice && <p>சலுகை விலை: <span className="font-semibold">₹{inquiry.proposedPrice}/kg</span></p>}
                                                </div>
                                                <div className="mt-4 flex justify-between items-center">
                                                    <span className="text-sm font-bold text-amber-800">{inquiry.contactNumber || inquiry.consumer?.mobile || 'எண் இல்லை'}</span>
                                                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl" onClick={() => window.open(`tel:${inquiry.contactNumber || inquiry.consumer?.mobile}`, '_self')}>
                                                        வாங்குபவரை அழைக்க
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}

                        {activeTab === 'prices' && (
                            <section className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5">
                                    <p className="text-[10px] uppercase tracking-[0.2em] font-black text-sky-700">விலை ரேடார்</p>
                                    <h2 className="text-2xl font-black text-slate-900 mt-1">சந்தை போக்கு குறியீடுகள்</h2>
                                    <p className="text-sm text-slate-600 mt-1">பயிர் விலை மாற்றங்களை கவனித்து, சிறந்த லாபத்திற்கு உங்கள் விலையை மாற்றுங்கள்.</p>
                                </div>
                                <PriceInsightsChart crops={allCrops} />
                            </section>
                        )}

                        {activeTab === 'reviews' && (
                            <section className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-violet-700">சராசரி மதிப்பீடு</p>
                                        <p className="text-3xl font-black text-violet-900 mt-1">{averageRating}</p>
                                    </div>
                                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700">மொத்த மதிப்புரைகள்</p>
                                        <p className="text-3xl font-black text-emerald-900 mt-1">{reviews.length}</p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-700">முடிக்கப்பட்ட ஆர்டர்கள்</p>
                                        <p className="text-3xl font-black text-slate-900 mt-1">{deliveredOrders}</p>
                                    </div>
                                </div>

                                {reviews.length === 0 ? (
                                    <div className="text-center py-20 rounded-3xl border border-dashed border-slate-200 bg-slate-50">
                                        <Star className="mx-auto text-slate-300 mb-4" size={40} />
                                        <h3 className="text-lg font-black text-slate-900">இன்னும் மதிப்பீடுகள் இல்லை</h3>
                                        <p className="text-sm text-slate-500 mt-2">மேலும் ஆர்டர்கள் வழங்கி நம்பிக்கை மதிப்பை உயர்த்துங்கள்.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {reviews.map((review) => (
                                            <div key={review.id} className="rounded-2xl border border-slate-200 p-5 bg-white">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-black text-slate-900">{review.consumer.name}</p>
                                                        <p className="text-[11px] text-slate-500">{new Date(review.createdAt).toLocaleDateString('ta-IN')} • {review.crop.name}</p>
                                                    </div>
                                                    <div className="flex text-amber-400">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star key={i} size={14} fill={i < review.rating ? 'currentColor' : 'none'} />
                                                        ))}
                                                    </div>
                                                </div>
                                                {review.comment && <p className="mt-3 text-sm text-slate-600">"{review.comment}"</p>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}
                    </div>
                </section>
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
