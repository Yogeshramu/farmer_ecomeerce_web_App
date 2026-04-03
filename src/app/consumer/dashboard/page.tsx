'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/app/components/ui/Button';
import { ShoppingCart, MapPin, Clock, Package, Truck, CheckCircle, Leaf, Star, Route } from 'lucide-react';
import { fetchWithAuth } from '@/lib/clientAuth';

interface Crop {
    id: string;
    name: string;
    quantityKg: number;
    basePrice: number;
    createdAt?: string;
    farmer: {
        id: string;
        name: string;
        pincode?: string;
    };
}

interface CartItem extends Crop {
    cartQty: number;
}

interface OrderItem {
    id: string;
    crop: {
        id: string;
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
    deliveryAddress?: string;
    deliveryPincode?: string;
    deliveryTime?: string;
    contactNumber?: string;
    farmer: {
        name: string;
        mobile?: string;
    };
    items: OrderItem[];
    review?: {
        rating: number;
        comment?: string;
    };
}

const cropArtwork = {
    tomato: { emoji: '🍅', from: '#ef4444', to: '#fb7185' },
    potato: { emoji: '🥔', from: '#a16207', to: '#d97706' },
    onion: { emoji: '🧅', from: '#8b5cf6', to: '#c084fc' },
    carrot: { emoji: '🥕', from: '#f97316', to: '#fb923c' },
    cabbage: { emoji: '🥬', from: '#10b981', to: '#34d399' },
    cauliflower: { emoji: '🥦', from: '#6366f1', to: '#818cf8' },
    brinjal: { emoji: '🍆', from: '#7c3aed', to: '#a78bfa' },
    eggplant: { emoji: '🍆', from: '#7c3aed', to: '#a78bfa' },
    'ladies finger': { emoji: '🌿', from: '#16a34a', to: '#4ade80' },
    okra: { emoji: '🌿', from: '#16a34a', to: '#4ade80' },
    chilli: { emoji: '🌶️', from: '#dc2626', to: '#f97316' },
    pepper: { emoji: '🫑', from: '#0f766e', to: '#14b8a6' },
    garlic: { emoji: '🧄', from: '#eab308', to: '#fde047' },
    ginger: { emoji: '🫚', from: '#b45309', to: '#f59e0b' },
    pumpkin: { emoji: '🎃', from: '#f97316', to: '#facc15' },
    spinach: { emoji: '🥬', from: '#15803d', to: '#22c55e' },
    paddy: { emoji: '🌾', from: '#0f766e', to: '#22c55e' },
    rice: { emoji: '🌾', from: '#0f766e', to: '#22c55e' },
    apple: { emoji: '🍎', from: '#dc2626', to: '#f87171' },
    banana: { emoji: '🍌', from: '#facc15', to: '#fde047' },
    mango: { emoji: '🥭', from: '#f59e0b', to: '#fb923c' },
    watermelon: { emoji: '🍉', from: '#10b981', to: '#ef4444' },
    'sweet corn': { emoji: '🌽', from: '#eab308', to: '#f59e0b' },
    default: { emoji: '🥦', from: '#0ea5e9', to: '#22c55e' },
} as const;

const normalizeCropName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

const getCropImage = (name: string) => {
    const normalizedName = normalizeCropName(name);
    const artwork = cropArtwork[normalizedName as keyof typeof cropArtwork] || cropArtwork.default;
    const safeLabel = name.replace(/[<&>]/g, '').slice(0, 28);

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="${safeLabel}">
            <defs>
                <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="${artwork.from}"/>
                    <stop offset="100%" stop-color="${artwork.to}"/>
                </linearGradient>
            </defs>
            <rect width="800" height="600" rx="40" fill="url(#g)"/>
            <circle cx="640" cy="120" r="150" fill="rgba(255,255,255,0.16)"/>
            <circle cx="140" cy="500" r="190" fill="rgba(255,255,255,0.12)"/>
            <circle cx="130" cy="120" r="70" fill="rgba(255,255,255,0.10)"/>
            <text x="60" y="115" fill="rgba(255,255,255,0.92)" font-size="34" font-weight="700" font-family="Arial, Helvetica, sans-serif">FarmDirect</text>
            <text x="400" y="360" text-anchor="middle" font-size="180">${artwork.emoji}</text>
            <rect x="70" y="400" width="660" height="120" rx="28" fill="rgba(255,255,255,0.16)"/>
            <text x="400" y="452" text-anchor="middle" fill="white" font-size="48" font-weight="800" font-family="Arial, Helvetica, sans-serif">${safeLabel}</text>
            <text x="400" y="494" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-size="22" font-weight="600" font-family="Arial, Helvetica, sans-serif">Fresh crop image</text>
        </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export default function ConsumerDashboard() {
    const [crops, setCrops] = useState<Crop[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [view, setView] = useState<'market' | 'cart' | 'orders'>('market');
    const [orders, setOrders] = useState<Order[]>([]);
    const [toast, setToast] = useState<{ message: string, type: 'error' | 'success' } | null>(null);

    const showToast = (message: string, type: 'error' | 'success' = 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Checkout form
    const [pincode, setPincode] = useState('');
    const [address, setAddress] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [time, setTime] = useState('Morning');
    const [loading, setLoading] = useState(false);
    const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
    const [calculatingCharge, setCalculatingCharge] = useState(false);
    const [distanceKm, setDistanceKm] = useState<number>(0);

    // Inquiry Modal State
    const [inquiryModal, setInquiryModal] = useState<{
        isOpen: boolean,
        crop?: Crop,
        message: string,
        quantity: string,
        proposedPrice: string,
        deliveryAddress: string,
        contactNumber: string
    }>({
        isOpen: false,
        message: '',
        quantity: '',
        proposedPrice: '',
        deliveryAddress: '',
        contactNumber: ''
    });
    const [inquiryLoading, setInquiryLoading] = useState(false);
    
    // Review Modal State
    const [reviewModal, setReviewModal] = useState<{
        isOpen: boolean,
        order?: Order,
        rating: number,
        comment: string
    }>({
        isOpen: false,
        rating: 5,
        comment: ''
    });
    const [reviewLoading, setReviewLoading] = useState(false);

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
        fetchCrops();
        fetchOrders();

        // Listen for WS REFRESH events so orders update without polling
        let ws: WebSocket | null = null;
        const setup = async () => {
            try {
                const healthRes = await fetch('http://localhost:8080/health');
                if (!healthRes.ok) return;
                const tokenRes = await fetch('/api/auth/socket-token');
                if (!tokenRes.ok) return;
                const { token } = await tokenRes.json();
                ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080');
                ws.onopen = () => ws?.send(JSON.stringify({ type: 'AUTH', token }));
                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    if (data.type === 'REFRESH' && (data.scope === 'orders' || data.scope === 'all')) {
                        fetchOrders();
                    }
                };
            } catch { /* WS not available, no-op */ }
        };
        setup();
        return () => { if (ws) ws.close(); };
    }, [fetchCrops, fetchOrders]);

    const addToCart = (crop: Crop, qty: number = 1): boolean => {
        const existing = cart.find(c => c.id === crop.id);
        const newTotal = (existing?.cartQty || 0) + qty;

        if (newTotal > crop.quantityKg) {
            showToast(`Cannot add ${qty} kg. Only ${crop.quantityKg} kg is available.`, 'error');
            return false;
        }

        if (existing) {
            setCart(cart.map(c => c.id === crop.id ? { ...c, cartQty: newTotal } : c));
        } else {
            setCart([...cart, { ...crop, cartQty: qty }]);
        }
        return true;
    };

    const removeFromCart = (id: string) => {
        setCart(cart.filter(c => c.id !== id));
    };

    const placeOrder = async () => {
        if (!pincode || !address) {
            showToast("Please enter delivery details", 'error');
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
                    deliveryTime: time,
                    contactNumber: contactNumber
                }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) {
                const error = await res.json();
                if (res.status === 401) {
                    showToast('Session expired. Please login again.', 'error');
                    window.location.href = '/consumer/login';
                    return;
                }
                showToast(`Failed to place order: ${error.error || 'Unknown error'}`, 'error');
                setLoading(false);
                return;
            }

            showToast('Order Placed Successfully!', 'success');
            setCart([]);
            setAddress('');
            setPincode('');
            setContactNumber('');
            setView('orders');
            fetchOrders();
        } catch (error) {
            console.error(error);
            showToast('Error placing order', 'error');
        }
        setLoading(false);
    };

    const submitInquiry = async () => {
        if (!inquiryModal.crop || !inquiryModal.message.trim() || !inquiryModal.quantity) {
            showToast("Please enter a message and quantity", "error");
            return;
        }

        const formData = {
            farmerId: inquiryModal.crop.farmer.id,
            cropId: inquiryModal.crop.id,
            message: inquiryModal.message,
            quantity: inquiryModal.quantity,
            proposedPrice: inquiryModal.proposedPrice,
            deliveryAddress: inquiryModal.deliveryAddress,
            contactNumber: inquiryModal.contactNumber
        };

        console.log("Submitting bulk order inquiry with details:", formData);

        setInquiryLoading(true);
        try {
            const res = await fetchWithAuth('/api/inquiries', {
                method: 'POST',
                body: JSON.stringify(formData),
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                showToast("Inquiry submitted successfully", "success");
                setInquiryModal({ isOpen: false, message: '', quantity: '', proposedPrice: '', deliveryAddress: '', contactNumber: '' });
            } else {
                const errData = await res.json();
                showToast(errData.details || errData.error || "Failed to submit inquiry", "error");
            }
        } catch (err: any) {
            showToast(err.message || "Failed to submit inquiry", "error");
        }
        setInquiryLoading(false);
    };
    
    const submitReview = async () => {
        if (!reviewModal.order || !reviewModal.order.items[0]?.crop.id) return;
        
        setReviewLoading(true);
        try {
            const res = await fetchWithAuth('/api/reviews', {
                method: 'POST',
                body: JSON.stringify({
                    cropId: reviewModal.order.items[0].crop.id,
                    orderId: reviewModal.order.id,
                    rating: reviewModal.rating,
                    comment: reviewModal.comment
                }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                showToast("நேரம் ஒதுக்கியமைக்கு நன்றி! - Thank you for your feedback!", "success");
                setReviewModal({ isOpen: false, rating: 5, comment: '' });
                fetchOrders();
            } else {
                const err = await res.json();
                showToast(err.error || "Failed to submit review", "error");
            }
        } catch (err) {
            showToast("Connection error", "error");
        }
        setReviewLoading(false);
    };

    const totalCartPrice = cart.reduce((acc, item) => acc + (item.basePrice * item.cartQty), 0);

    // Calculate delivery charge when pincode changes
    useEffect(() => {
        const calculateCharge = async () => {
            if (pincode.length === 6 && cart.length > 0) {
                setCalculatingCharge(true);
                try {
                    // Get farmer pincode from first cart item
                    const firstCropId = cart[0].id;
                    const crop = crops.find(c => c.id === firstCropId);
                    if (crop) {
                        const farmerPincode = crop.farmer.pincode || '600001';
                        // console.log(`Calculating distance: Farmer(${farmerPincode}) to Consumer(${pincode})`);
                        const res = await fetch('/api/distance', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                farmerPincode: farmerPincode,
                                consumerPincode: pincode
                            })
                        });
                        const data = await res.json();
                        if (data.deliveryCharge) {
                            setDeliveryCharge(data.deliveryCharge);
                            setDistanceKm(data.distanceKm || 0);
                        }
                    }
                } catch (error) {
                    console.error('Failed to calculate delivery charge:', error);
                    setDeliveryCharge(100); // Default
                }
                setCalculatingCharge(false);
            } else {
                setDeliveryCharge(0);
                setDistanceKm(0);
            }
        };
        calculateCharge();
    }, [pincode, cart, crops]);

    return (
        <div className="min-h-screen bg-slate-50 pb-20 relative">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg font-bold text-white transition-all animate-in slide-in-from-top-5 fade-in duration-300 ${toast.type === 'error' ? 'bg-red-600 shadow-red-500/20' : 'bg-emerald-600 shadow-emerald-500/20'}`}>
                    {toast.message}
                </div>
            )}

            <header className="sticky top-0 w-full z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
                        <ShoppingCart className="text-white" size={24} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-2xl font-black tracking-tighter text-blue-950 leading-none">FarmDirect</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Consumer</span>
                    </div>
                </div>

                <div className="flex gap-2 sm:gap-4 items-center">
                    <button onClick={() => setView('market')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${view === 'market' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'}`}>
                        Market
                    </button>
                    <button onClick={() => setView('orders')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${view === 'orders' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'}`}>
                        Orders
                    </button>
                    <button onClick={() => setView('cart')} className="relative flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-105 transition-all font-semibold text-sm">
                        <ShoppingCart size={16} />
                        Cart
                        {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce">{cart.length}</span>}
                    </button>
                    <button onClick={async () => {
                        await fetch('/api/auth/logout', { method: 'POST' });
                        window.location.href = '/';
                    }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 hover:text-red-700 transition-all border border-transparent hover:border-red-100 ml-2 hidden sm:flex">
                        Logout
                    </button>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {view === 'market' && (
                    <div className="space-y-8 animate-in fade-in">
                        <section className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
                            <div className="relative z-10 max-w-lg">
                                <h2 className="text-4xl font-black mb-4 leading-tight">Fresh from the Farm to your Doorstep.</h2>
                                <p className="text-blue-100 text-lg mb-6">Support local farmers and get the highest quality produce at the best prices.</p>
                            </div>
                            <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 bg-[url('https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?auto=format&fit=crop&q=80')] bg-cover"></div>
                        </section>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {crops.filter(crop => crop.quantityKg > 0).map(crop => {
                                const listedDate = crop.createdAt ? new Date(crop.createdAt) : null;
                                const isNew = listedDate && (Date.now() - listedDate.getTime()) < 48 * 60 * 60 * 1000;
                                return (
                                <div key={crop.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                                    <div className="w-full h-48 bg-slate-100 rounded-xl mb-4 overflow-hidden relative group-hover:shadow-inner">
                                        <img 
                                            src={getCropImage(crop.name)}
                                            alt={crop.name}
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
                                        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-800 shadow-sm flex items-center gap-1.5 z-10">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> {crop.farmer.name}
                                        </div>
                                        {isNew && (
                                            <div className="absolute top-3 right-3 bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1 z-10">
                                                <Leaf size={10} /> New
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800">{crop.name}</h3>
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-slate-500 text-sm">Available: {crop.quantityKg} Kg</p>
                                        {listedDate && (
                                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                                <Clock size={10} />
                                                Listed {listedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-3 mt-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-2xl font-bold text-blue-700">₹{crop.basePrice}<span className="text-sm font-normal text-slate-400">/kg</span></span>
                                            {crop.quantityKg >= 10 && (
                                                <Button size="sm" variant="ghost" className="text-blue-600 bg-blue-50 hover:bg-blue-100 text-xs py-1 h-auto" onClick={() => setInquiryModal({ isOpen: true, crop, message: '', quantity: '', proposedPrice: '', deliveryAddress: '', contactNumber: '' })}>
                                                    Contact Bulk
                                                </Button>
                                            )}
                                        </div>

                                        <p className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded inline-block">
                                            🛒 Buy {Math.ceil(crop.quantityKg * 0.25)} kg+ for FREE Delivery!
                                        </p>

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
                                                    if (qty > 0) {
                                                        const success = addToCart(crop, qty);
                                                        if (success && input) input.value = '1'; // Reset
                                                    } else {
                                                        showToast(`Please enter a valid quantity.`, 'error');
                                                    }
                                                }}
                                                className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700"
                                            >
                                                Add to Cart
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                );
                            })}

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

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Contact Phone Number *</label>
                                            <input
                                                type="tel"
                                                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                                                placeholder="e.g. 9876543210"
                                                value={contactNumber}
                                                onChange={e => setContactNumber(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-slate-600">Subtotal</span>
                                            <span className="font-bold text-slate-900">₹{totalCartPrice}</span>
                                        </div>
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-slate-600">Delivery Charge</span>
                                            {(() => {
                                                if (calculatingCharge) return <span className="text-sm text-slate-400">Calculating...</span>;
                                                if (!pincode || pincode.length !== 6) return <span className="text-sm text-slate-400">Enter pincode</span>;
                                                
                                                const hasFreeDelivery = cart.some(cartItem => {
                                                    const originalCrop = crops.find(c => c.id === cartItem.id);
                                                    if (!originalCrop) return false;
                                                    return cartItem.cartQty >= (originalCrop.quantityKg * 0.25);
                                                });

                                                if (hasFreeDelivery) {
                                                    return (
                                                        <div className="text-right">
                                                            <span className="font-bold text-emerald-600 flex items-center gap-1">
                                                                <CheckCircle size={14} /> ₹0 (FREE)
                                                            </span>
                                                            <p className="text-[10px] text-emerald-500 font-medium bg-emerald-50 px-2 py-0.5 rounded mt-1">
                                                                🎉 25%+ Stock Discount Applied!
                                                            </p>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div className="text-right">
                                                        <span className="font-bold text-blue-600">₹{deliveryCharge}</span>
                                                        <div className="flex items-center gap-1.5 mt-1 justify-end">
                                                            <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-700 font-bold text-xs px-2 py-0.5 rounded-full">
                                                                <Route size={10} /> {distanceKm} km
                                                            </span>
                                                            <span className="inline-flex items-center bg-slate-100 text-slate-800 font-bold text-xs px-2 py-0.5 rounded-full">
                                                                ₹{deliveryCharge} delivery
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <div className="flex justify-between items-center text-lg pt-3 border-t border-slate-100">
                                            <span className="font-bold text-slate-900">Total Amount</span>
                                            {(() => {
                                                const hasFreeDelivery = cart.some(cartItem => {
                                                    const originalCrop = crops.find(c => c.id === cartItem.id);
                                                    return originalCrop && cartItem.cartQty >= (originalCrop.quantityKg * 0.25);
                                                });
                                                const finalDeliveryCharge = hasFreeDelivery ? 0 : deliveryCharge;
                                                return <span className="font-bold text-blue-700 text-2xl">₹{totalCartPrice + finalDeliveryCharge}</span>;
                                            })()}
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
                        {orders.length === 0 ? <p className="text-slate-500">No orders placed yet.</p> : orders.map(order => {
                            const distanceKm = Math.round(order.deliveryCharge / 10);
                            return (
                                <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
                                    <div className="flex justify-between mb-6">
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-lg">Order #{order.id.slice(0, 8)}</h3>
                                            <p className="text-sm text-slate-500">From: {order.farmer?.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-slate-900">₹{order.totalAmount}</p>
                                            <p className="text-xs text-slate-400">+ ₹{order.deliveryCharge} Delivery</p>
                                            <p className="text-xs text-blue-500">{distanceKm} km away</p>
                                        </div>
                                    </div>

                                    <OrderTracker status={order.status} />

                                    <div className="bg-slate-50 rounded-xl p-4 mb-4">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                            <MapPin size={14} /> Delivery Details
                                        </h4>
                                        <p className="text-sm text-slate-700">{order.deliveryAddress}</p>
                                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                                            <span>📍 {order.deliveryPincode}</span>
                                            {order.deliveryTime && <span>🕐 {order.deliveryTime}</span>}
                                            {order.contactNumber && <span>📞 {order.contactNumber}</span>}
                                            <span>📏 {distanceKm} km</span>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-100 pt-4 space-y-2">
                                        {order.items.map((item: any) => (
                                            <div key={item.id} className="flex justify-between text-sm">
                                                <span className="text-slate-600 font-medium">{item.crop.name} <span className="text-slate-400">(x{item.quantity} kg)</span></span>
                                                <span className="font-bold text-slate-800">₹{item.price * item.quantity}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {order.status === 'DELIVERED' && (
                                        <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                                            {order.review ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="flex text-amber-400">
                                                        {[1, 2, 3, 4, 5].map((s) => (
                                                            <Star key={s} size={14} fill={s <= order.review!.rating ? "currentColor" : "none"} />
                                                        ))}
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-400">Rating Provided</span>
                                                </div>
                                            ) : (
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    onClick={() => setReviewModal({ isOpen: true, order, rating: 5, comment: '' })}
                                                    className="w-full bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 font-bold"
                                                >
                                                    Add Review
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Inquiry Modal */}
            {inquiryModal.isOpen && inquiryModal.crop && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50">
                            <div>
                                <h3 className="font-bold text-blue-900 text-lg">Contact {inquiryModal.crop.farmer.name}</h3>
                                <p className="text-blue-600 text-xs mt-1">Regarding Bulk Order for {inquiryModal.crop.name}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setInquiryModal({ ...inquiryModal, isOpen: false })} className="hover:bg-blue-100 rounded-full h-8 w-8 p-0">×</Button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Required Qty (kg) *</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-bold"
                                        placeholder="e.g. 100"
                                        value={inquiryModal.quantity}
                                        onChange={(e) => setInquiryModal({ ...inquiryModal, quantity: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Proposed Price/kg</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        placeholder="Optional"
                                        value={inquiryModal.proposedPrice}
                                        onChange={(e) => setInquiryModal({ ...inquiryModal, proposedPrice: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Delivery Location</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="Optional delivery address"
                                    value={inquiryModal.deliveryAddress}
                                    onChange={(e) => setInquiryModal({ ...inquiryModal, deliveryAddress: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Contact Phone Number *</label>
                                <input
                                    type="tel"
                                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                                    placeholder="e.g. 9876543210"
                                    value={inquiryModal.contactNumber}
                                    onChange={(e) => setInquiryModal({ ...inquiryModal, contactNumber: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Message *</label>
                                <textarea
                                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                                    placeholder={`Hi , I would like to order a large quantity of. Can we discuss pricing?`}
                                    rows={3}
                                    value={inquiryModal.message}
                                    onChange={(e) => setInquiryModal({ ...inquiryModal, message: e.target.value })}
                                />
                            </div>
                            <Button onClick={submitInquiry} isLoading={inquiryLoading} className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">
                                Send Inquiry
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            {reviewModal.isOpen && reviewModal.order && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 border border-slate-100">
                        <div className="p-8 pb-4 text-center">
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-blue-100">
                                <Star size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">How was the crop?</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Share your feedback</p>
                            <p className="text-sm text-slate-500 mt-2">Rate your purchase from {reviewModal.order.farmer.name}</p>
                        </div>
                        
                        <div className="p-8 pt-4 space-y-8">
                            <div className="flex justify-center gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setReviewModal({ ...reviewModal, rating: star })}
                                        className={`p-2 transition-all duration-300 hover:scale-125 ${reviewModal.rating >= star ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-slate-200'}`}
                                    >
                                        <Star size={36} fill={reviewModal.rating >= star ? "currentColor" : "none"} />
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Comments</label>
                                <textarea
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-blue-500 transition-all resize-none text-slate-700 font-medium"
                                    placeholder="Tell us about the quality and freshness..."
                                    rows={4}
                                    value={reviewModal.comment}
                                    onChange={(e) => setReviewModal({ ...reviewModal, comment: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3">
                                <Button 
                                    onClick={() => setReviewModal({ ...reviewModal, isOpen: false })} 
                                    variant="ghost" 
                                    className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-slate-50"
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={submitReview} 
                                    isLoading={reviewLoading} 
                                    className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20"
                                >
                                    Submit Review
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="py-20 px-6 border-t border-slate-100 bg-slate-50 relative z-10 mt-20">
                <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 text-sm">
                    <div className="col-span-2 space-y-6">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-600 rounded-lg">
                                <ShoppingCart className="text-white" size={18} />
                            </div>
                            <span className="text-xl font-black tracking-tighter text-blue-950">FarmDirect</span>
                        </div>
                        <p className="text-slate-800 font-bold max-w-xs leading-relaxed">Empowering the farming community through a direct consumer digital platform. Proudly built for farmers.</p>
                        <p className="text-slate-400 italic">"Empowering farmers through direct digital infrastructure."</p>
                    </div>
                    <div className="space-y-4">
                        <h4 className="font-bold uppercase tracking-widest text-xs text-slate-900">Platform</h4>
                        <ul className="text-slate-500 space-y-3 font-medium">
                            <li className="hover:text-blue-600 cursor-pointer transition-colors">Farmer Portal</li>
                            <li className="hover:text-blue-600 cursor-pointer transition-colors">Consumer App</li>
                            <li className="hover:text-blue-600 cursor-pointer transition-colors">Wholesale Inquiries</li>
                        </ul>
                    </div>
                    <div className="space-y-4">
                        <h4 className="font-bold uppercase tracking-widest text-xs text-slate-900">Legal</h4>
                        <ul className="text-slate-500 space-y-3 font-medium">
                            <li className="hover:text-blue-600 cursor-pointer transition-colors">Terms of Service</li>
                            <li className="hover:text-blue-600 cursor-pointer transition-colors">Privacy Policy</li>
                            <li className="hover:text-blue-600 cursor-pointer transition-colors">Cookie Policy</li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-6xl mx-auto pt-20 border-t border-slate-200 mt-10 flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest gap-4">
                    <span>© 2026 FarmDirect Project. Farmer's effort, at your doorstep.</span>
                    <div className="flex gap-6">
                        <span className="hover:text-blue-600 cursor-pointer transition-colors">Instagram</span>
                        <span className="hover:text-blue-600 cursor-pointer transition-colors">Twitter</span>
                        <span className="hover:text-blue-600 cursor-pointer transition-colors">Facebook</span>
                    </div>
                </div>
            </footer>
        </div >
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
